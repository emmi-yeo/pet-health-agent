"""
PawLog FastAPI Backend

Orchestrates the multi-agent pipeline:
  POST /api/pets/{pet_id}/logs    → Intake Agent → Analysis Agent → save log (async job)
  POST /api/pets/{pet_id}/summary → Report Agent → save summary
  POST /api/pets/{pet_id}/share   → Send invite to vet
  GET  /api/vet/accept-invite     → Accept pet share
  POST /api/vet/notes             → Add vet clinical note
  POST /api/pets/{pet_id}/summary/email → Email summary to vet
  DELETE /api/account             → Delete authenticated user account
  GET  /api/jobs/{job_id}         → Poll async job status
"""

import asyncio
import logging
import os
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types as genai_types

from scheduler import start_scheduler
from email_service import send_email
from email_templates import high_severity_alert, vet_note_added, pet_share_invite, vet_summary_email
from job_store import create_job, get_job, Job

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("pawlog")

# Pillar 4 (App & Runtime): hard limits on user-controlled text flowing into agents
_MAX_INPUT_CHARS = 2000   # prevents prompt-padding and context stuffing
_MAX_OUTPUT_CHARS = 8000  # caps runaway model output (Denial of Wallet defence)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="PawLog API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [o.strip() for o in os.getenv("FRONTEND_URL", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://pet-health-agent[^.]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MCP server path — runs as subprocess
MCP_SERVER_PATH = Path(__file__).parent / "mcp_server" / "pet_data_server.py"

MCP_PARAMS = StdioServerParameters(
    command=sys.executable,
    args=[str(MCP_SERVER_PATH)],
    env={**os.environ},
)


def get_supabase():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


async def get_user_from_token(authorization: Optional[str]) -> dict:
    """Verify the Supabase JWT and return the user. Always raises 401, never 500."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        db = get_supabase()
        result = db.auth.get_user(token)
        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return result.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def run_agent(agent: LlmAgent, prompt: str) -> str:
    """Run a single ADK agent and return its text output.

    Pillar 6 (Observability & SecOps): every invocation is timed and logged so
    the full agent trajectory is auditable (input → tool calls → output).
    Pillar 4 (App & Runtime): output is capped at _MAX_OUTPUT_CHARS to guard
    against Denial-of-Wallet attacks from runaway model responses.
    """
    t0 = time.monotonic()
    logger.info("[AGENT:START] name=%s", agent.name)
    session_service = InMemorySessionService()
    await session_service.create_session(
        app_name="pawlog", user_id="system", session_id="run"
    )
    runner = Runner(
        agent=agent,
        app_name="pawlog",
        session_service=session_service,
    )
    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)],
    )
    result_text = ""
    async for event in runner.run_async(
        user_id="system",
        session_id="run",
        new_message=content,
    ):
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if part.text:
                    result_text += part.text

    elapsed = time.monotonic() - t0
    if len(result_text) > _MAX_OUTPUT_CHARS:
        logger.warning(
            "[AGENT:TRUNCATE] name=%s original_chars=%d", agent.name, len(result_text)
        )
        result_text = result_text[:_MAX_OUTPUT_CHARS]
    logger.info("[AGENT:DONE] name=%s elapsed=%.2fs chars=%d", agent.name, elapsed, len(result_text))
    return result_text


def parse_json_response(raw: str) -> dict:
    """Extract JSON from agent response, stripping markdown fences if present.

    Pillar 4 (App & Runtime): agent output is never trusted directly. All
    responses pass through this gate — malformed or empty output returns {}
    rather than raising, so a misbehaving agent can't crash the pipeline.
    """
    if not raw:
        return {}
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        logger.warning("[PARSE] JSON decode failed; raw starts with: %.80r", raw)
        return {}


def sanitize_agent_input(raw: str) -> str:
    """Trim and hard-cap user-provided text before it reaches an LLM agent.

    Pillar 4 (App & Runtime) — input boundary enforcement: user text is
    untrusted at the API surface. Capping to _MAX_INPUT_CHARS prevents
    prompt-padding, context-stuffing, and Denial-of-Wallet via oversized inputs.
    This implements the Zero Ambient Authority principle — agents receive only
    the minimum context they need, not the raw request body verbatim.
    """
    if not raw:
        return ""
    return raw.strip()[:_MAX_INPUT_CHARS]


# ── Request / Response models ────────────────────────────────────────────────

class LogRequest(BaseModel):
    raw_input: str
    weight_kg: Optional[float] = None


class LogResponse(BaseModel):
    log: dict
    analysis: dict


class SummaryResponse(BaseModel):
    summary: dict


class ShareRequest(BaseModel):
    vet_email: str


class VetNoteRequest(BaseModel):
    pet_id: str
    log_id: Optional[str] = None
    content: str
    note_type: str  # observation | diagnosis | treatment | followup


class SummaryEmailRequest(BaseModel):
    to_email: str


# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    # Pillar 1 (Infrastructure): fail fast if required secrets are absent.
    # An agent that starts without credentials could expose data or silently
    # fall back to unauthenticated access — we hard-crash instead.
    required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GOOGLE_API_KEY"]
    missing = [k for k in required_vars if not os.environ.get(k)]
    if missing:
        raise RuntimeError(
            f"[STARTUP] Missing required environment variables: {', '.join(missing)}"
        )
    logger.info("[STARTUP] Environment validated. Starting scheduler.")
    start_scheduler()


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "pawlog-api"}


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": job.status, "result": job.result, "error": job.error}


async def run_log_pipeline(pet_id: str, raw_input: str, user, job: Job, weight_kg: Optional[float] = None):
    """Background task: run intake + analysis agents, save log, send alert email."""
    try:
        # ── Step 1: Intake Agent ─────────────────────────────────────────
        from agents.intake_agent import create_intake_agent
        intake_agent = create_intake_agent(MCP_PARAMS)

        # Pillar 4: sanitize at the trust boundary before embedding in the prompt
        safe_input = sanitize_agent_input(raw_input)
        intake_prompt = f"""
Parse this pet health observation and return structured JSON.

Observation: "{safe_input}"
"""
        raw_intake = await run_agent(intake_agent, intake_prompt)
        intake_data = parse_json_response(raw_intake)

        # ── Step 2: Analysis Agent ───────────────────────────────────────
        from agents.analysis_agent import create_analysis_agent
        analysis_agent = create_analysis_agent(MCP_PARAMS)

        db = get_supabase()
        recent = db.table("health_logs").select("*").eq("pet_id", pet_id) \
            .order("logged_at", desc=True).limit(90).execute()
        meds = db.table("medications").select("*").eq("pet_id", pet_id) \
            .eq("active", True).execute()

        analysis_prompt = f"""
Analyze this health observation in context of recent logs.

Today's intake data:
{json.dumps(intake_data, indent=2)}

Recent health logs (last 90 — detect patterns over 30, 60, and 90 day windows):
{json.dumps(recent.data or [], indent=2)}

Active medications:
{json.dumps(meds.data or [], indent=2)}

Return the pattern analysis as JSON.
"""
        raw_analysis = await run_agent(analysis_agent, analysis_prompt)
        analysis_data = parse_json_response(raw_analysis)

        # ── Step 3: Save to Supabase ─────────────────────────────────────
        log_payload = {
            "pet_id": pet_id,
            "user_id": user.id,
            "raw_input": raw_input,
            "extracted_symptoms": intake_data.get("extracted_symptoms", []),
            "extracted_behaviors": intake_data.get("extracted_behaviors", []),
            "extracted_mood": intake_data.get("extracted_mood"),
            "flagged": analysis_data.get("flagged", False),
            "flag_reason": analysis_data.get("flag_reason"),
            "severity": analysis_data.get("severity") or None,
            "weight_kg": weight_kg,
        }
        result = db.table("health_logs").insert(log_payload).execute()
        saved_log = result.data[0] if result.data else log_payload

        # ── Step 4: High-severity email ──────────────────────────────────
        if analysis_data.get("severity") == "high":
            try:
                user_result = db.auth.admin.get_user_by_id(user.id)
                owner_email = user_result.user.email if user_result.user else None
                if owner_email:
                    pet_result = db.table("pets").select("name").eq("id", pet_id).execute()
                    pet_name = (pet_result.data[0].get("name", "your pet") if pet_result.data else "your pet")
                    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
                    send_email(
                        owner_email,
                        f"High severity health alert for {pet_name}",
                        high_severity_alert(
                            pet_name,
                            analysis_data.get("flag_reason", "Unusual pattern detected"),
                            "high",
                            f"{frontend_url}/pets/{pet_id}"
                        )
                    )
            except Exception as email_err:
                print(f"[EMAIL] Failed to send high severity alert: {email_err}")

        job.status = "done"
        job.result = {"log": saved_log, "analysis": analysis_data}

    except Exception as e:
        job.status = "error"
        job.error = str(e)


@app.post("/api/pets/{pet_id}/logs")
@limiter.limit("20/minute")
async def create_health_log(
    request: Request,
    pet_id: str,
    body: LogRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Multi-agent pipeline (async):
    Returns a job_id immediately; client polls GET /api/jobs/{job_id}.
    """
    user = await get_user_from_token(authorization)
    job = create_job()
    asyncio.create_task(run_log_pipeline(pet_id, body.raw_input, user, job, body.weight_kg))
    return {"job_id": job.id, "status": "processing"}


@app.post("/api/pets/{pet_id}/summary", response_model=SummaryResponse)
@limiter.limit("10/hour")
async def generate_vet_summary(
    request: Request,
    pet_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Report Agent pipeline:
    1. Fetch pet profile + 30-day logs + medications from Supabase
    2. Report Agent generates structured vet visit summary
    3. Save summary to Supabase
    """
    user = await get_user_from_token(authorization)

    db = get_supabase()
    pet = db.table("pets").select("*").eq("id", pet_id).execute()
    logs = db.table("health_logs").select("*").eq("pet_id", pet_id) \
        .order("logged_at", desc=True).limit(90).execute()
    meds = db.table("medications").select("*").eq("pet_id", pet_id) \
        .eq("active", True).execute()
    vet_notes = db.table("vet_notes").select("content, note_type, created_at").eq("pet_id", pet_id) \
        .order("created_at", desc=True).limit(20).execute()

    if not pet.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    pet_data = pet.data[0] if isinstance(pet.data, list) else pet.data

    from agents.report_agent import create_report_agent
    report_agent = create_report_agent(MCP_PARAMS)

    report_prompt = f"""
Generate a comprehensive vet visit summary for this pet.

Pet profile:
{json.dumps(pet_data, indent=2)}

Health logs (last 90 entries — look for patterns over 30, 60, and 90 day windows):
{json.dumps(logs.data or [], indent=2)}

Active medications:
{json.dumps(meds.data or [], indent=2)}

Previous veterinarian clinical notes:
{json.dumps(vet_notes.data or [], indent=2)}

Breed-specific considerations: If the breed is known, mention any breed-specific health risks relevant to the observed symptoms.

Return the structured summary as JSON.
"""
    raw_report = await run_agent(report_agent, report_prompt)
    report_data = parse_json_response(raw_report)

    # Save summary
    summary_payload = {
        "pet_id": pet_id,
        "user_id": user.id,
        "content": report_data.get("content", ""),
        "key_concerns": report_data.get("key_concerns", []),
        "recommended_questions": report_data.get("recommended_questions", []),
        "date_range_start": report_data.get("date_range_start"),
        "date_range_end": report_data.get("date_range_end"),
    }
    result = db.table("vet_summaries").insert(summary_payload).execute()
    saved = result.data[0] if result.data else summary_payload

    return SummaryResponse(summary=saved)


@app.post("/api/pets/{pet_id}/summary/email")
async def email_vet_summary(
    pet_id: str,
    body: SummaryEmailRequest,
    authorization: Optional[str] = Header(None),
):
    """Email the latest vet summary to a specified address."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    # Verify ownership
    pet_result = db.table("pets").select("*").eq("id", pet_id).eq("user_id", user.id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found or access denied")

    pet = pet_result.data[0]
    summary_result = db.table("vet_summaries").select("*").eq("pet_id", pet_id) \
        .order("generated_at", desc=True).limit(1).execute()

    if not summary_result.data:
        raise HTTPException(status_code=404, detail="No summary found for this pet")

    summary = summary_result.data[0]
    html = vet_summary_email(
        pet["name"],
        summary["content"],
        summary.get("key_concerns", []),
        summary.get("recommended_questions", [])
    )
    send_email(body.to_email, f"Vet summary for {pet['name']}", html)
    return {"sent": True}


@app.post("/api/pets/{pet_id}/share")
async def share_pet_with_vet(
    pet_id: str,
    body: ShareRequest,
    authorization: Optional[str] = Header(None),
):
    """Create a pending pet share and email the invite to the vet."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    # Verify ownership
    pet_result = db.table("pets").select("*").eq("id", pet_id).eq("user_id", user.id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found or access denied")

    pet = pet_result.data[0]

    # Insert pending share
    share_result = db.table("pet_shares").insert({
        "pet_id": pet_id,
        "owner_id": user.id,
        "vet_email": body.vet_email,
        "status": "pending",
    }).select().execute()

    if not share_result.data:
        raise HTTPException(status_code=500, detail="Failed to create share")

    share = share_result.data[0]
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    accept_url = f"{frontend_url}/vet/accept-invite?token={share['invite_token']}"

    # Get owner name (safe — profile may not exist for older accounts)
    owner_name_result = db.table("profiles").select("full_name").eq("id", user.id).execute()
    owner_name = ((owner_name_result.data or [{}])[0]).get("full_name") or user.email or "A pet owner"

    try:
        send_email(
            body.vet_email,
            f"{owner_name} invited you to view {pet['name']}'s health records",
            pet_share_invite(owner_name, pet["name"], accept_url)
        )
    except Exception as e:
        print(f"[SHARE] Email failed: {e}")

    return {"invite_sent": True, "share_id": share["id"]}


@app.get("/api/vet/accept-invite")
async def accept_vet_invite(
    token: str,
    authorization: Optional[str] = Header(None),
):
    """Accept a pet share invite — vet must be authenticated."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    share_result = db.table("pet_shares").select("*, pets(name)").eq("invite_token", token).eq("status", "pending").execute()

    if not share_result.data:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")

    share = share_result.data[0]

    # Accept the share
    db.table("pet_shares").update({
        "vet_id": user.id,
        "status": "accepted",
    }).eq("id", share["id"]).execute()

    pet_name = (share.get("pets") or {}).get("name", "the pet")

    # Notify pet owner that vet first accessed the profile
    try:
        vet_profile = db.table("profiles").select("full_name").eq("id", user.id).execute()
        vet_name = (vet_profile.data or [{}])[0].get("full_name") or "Your vet"
        owner_result = db.auth.admin.get_user_by_id(str(share["owner_id"]))
        owner_email = owner_result.user.email if owner_result.user else None
        if owner_email:
            frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
            from email_templates import vet_first_access
            send_email(
                owner_email,
                f"{vet_name} has accessed {pet_name}'s records",
                vet_first_access(vet_name, pet_name, vet_name, f"{frontend_url}/pets/{share['pet_id']}")
            )
    except Exception as notify_err:
        print(f"[INVITE] First access notification failed: {notify_err}")

    return {"accepted": True, "pet_id": share["pet_id"], "pet_name": pet_name}


@app.post("/api/vet/notes")
async def create_vet_note(
    body: VetNoteRequest,
    authorization: Optional[str] = Header(None),
):
    """Create a clinical vet note. Notifies the pet owner via email."""
    user = await get_user_from_token(authorization)

    db = get_supabase()

    # Verify vet role
    profile_result = db.table("profiles").select("role, full_name").eq("id", user.id).execute()
    profile = (profile_result.data or [{}])[0]
    if profile.get("role") != "vet":
        raise HTTPException(status_code=403, detail="Only veterinarians can add vet notes")

    vet_name = profile.get("full_name") or "Your vet"

    # Verify vet has access to this pet
    share_result = db.table("pet_shares").select("id").eq("pet_id", body.pet_id).eq("vet_id", user.id).eq("status", "accepted").execute()
    if not share_result.data:
        raise HTTPException(status_code=403, detail="You do not have access to this pet")

    note_payload = {
        "pet_id": body.pet_id,
        "vet_id": user.id,
        "log_id": body.log_id,
        "content": body.content,
        "note_type": body.note_type,
    }
    note_result = db.table("vet_notes").insert(note_payload).select().execute()
    if not note_result.data:
        raise HTTPException(status_code=500, detail="Failed to save note")

    note = note_result.data[0]

    # Notify pet owner
    try:
        pet_result = db.table("pets").select("name, user_id").eq("id", body.pet_id).execute()
        if pet_result.data:
            pet = pet_result.data[0]
            owner_result = db.auth.admin.get_user_by_id(str(pet["user_id"]))
            owner_email = owner_result.user.email if owner_result.user else None
            if owner_email:
                frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
                send_email(
                    owner_email,
                    f"New vet note for {pet['name']}",
                    vet_note_added(
                        pet["name"],
                        body.content,
                        vet_name,
                        body.note_type,
                        f"{frontend_url}/pets/{body.pet_id}"
                    )
                )
    except Exception as email_err:
        print(f"[EMAIL] Failed to send vet note notification: {email_err}")

    return note


@app.delete("/api/account")
async def delete_account(
    authorization: Optional[str] = Header(None),
):
    """Delete the authenticated user's account."""
    user = await get_user_from_token(authorization)

    try:
        db = get_supabase()
        db.auth.admin.delete_user(user.id)
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {e}")


# ── Appointments ─────────────────────────────────────────────────────────────

class AppointmentRequest(BaseModel):
    scheduled_at: str
    notes: Optional[str] = None
    status: str = "upcoming"


@app.get("/api/pets/{pet_id}/appointments")
async def list_appointments(pet_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("appointments").select("*").eq("pet_id", pet_id).order("scheduled_at").execute()
    return result.data or []


@app.post("/api/pets/{pet_id}/appointments")
async def create_appointment(pet_id: str, body: AppointmentRequest, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "owner_id": user.id,
        "scheduled_at": body.scheduled_at,
        "notes": body.notes,
        "status": body.status,
    }
    result = db.table("appointments").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create appointment")
    return result.data[0]


@app.delete("/api/pets/{pet_id}/appointments/{appt_id}")
async def delete_appointment(pet_id: str, appt_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("appointments").delete().eq("id", appt_id).eq("pet_id", pet_id).execute()
    return {"deleted": True}


# ── Vet Visits ────────────────────────────────────────────────────────────────

class VetVisitRequest(BaseModel):
    visit_date: str
    vet_name: Optional[str] = None
    clinic_name: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


@app.get("/api/pets/{pet_id}/visits")
async def list_vet_visits(pet_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("vet_visits").select("*").eq("pet_id", pet_id).order("visit_date", desc=True).execute()
    return result.data or []


@app.post("/api/pets/{pet_id}/visits")
async def create_vet_visit(pet_id: str, body: VetVisitRequest, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "user_id": user.id,
        "visit_date": body.visit_date,
        "vet_name": body.vet_name,
        "clinic_name": body.clinic_name,
        "reason": body.reason,
        "notes": body.notes,
    }
    result = db.table("vet_visits").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save visit")
    return result.data[0]


@app.delete("/api/pets/{pet_id}/visits/{visit_id}")
async def delete_vet_visit(pet_id: str, visit_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("vet_visits").delete().eq("id", visit_id).eq("pet_id", pet_id).execute()
    return {"deleted": True}


# ── Vaccinations ─────────────────────────────────────────────────────────────

class VaccinationRequest(BaseModel):
    vaccine_name: str
    administered_date: str
    next_due_date: Optional[str] = None
    lot_number: Optional[str] = None
    notes: Optional[str] = None


@app.get("/api/pets/{pet_id}/vaccinations")
async def list_vaccinations(pet_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("vaccinations").select("*").eq("pet_id", pet_id).order("administered_date", desc=True).execute()
    return result.data or []


@app.post("/api/pets/{pet_id}/vaccinations")
async def create_vaccination(pet_id: str, body: VaccinationRequest, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "vet_id": user.id,
        "vaccine_name": body.vaccine_name,
        "administered_date": body.administered_date,
        "next_due_date": body.next_due_date,
        "lot_number": body.lot_number,
        "notes": body.notes,
    }
    result = db.table("vaccinations").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save vaccination")
    return result.data[0]


@app.delete("/api/pets/{pet_id}/vaccinations/{vacc_id}")
async def delete_vaccination(pet_id: str, vacc_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("vaccinations").delete().eq("id", vacc_id).execute()
    return {"deleted": True}


# ── AI Chat ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


@app.post("/api/pets/{pet_id}/chat")
@limiter.limit("30/hour")
async def chat_about_pet(request: Request, pet_id: str, body: ChatRequest, authorization: Optional[str] = Header(None)):
    """Ask the AI questions about a pet's health history."""
    user = await get_user_from_token(authorization)

    db = get_supabase()

    # Allow owner or vet with access
    pet_result = db.table("pets").select("*").eq("id", pet_id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    pet = pet_result.data[0]
    logs = db.table("health_logs").select("*").eq("pet_id", pet_id).order("logged_at", desc=True).limit(90).execute()
    meds = db.table("medications").select("*").eq("pet_id", pet_id).eq("active", True).execute()
    vet_notes = db.table("vet_notes").select("content, note_type, created_at").eq("pet_id", pet_id).order("created_at", desc=True).limit(20).execute()

    from google.adk.agents import LlmAgent

    chat_agent = LlmAgent(
        name="chat_agent",
        model="gemini-2.5-flash",
        instruction="""You are PawLog's pet health assistant. You have access to a pet's complete health history.
Answer questions about the pet's health clearly and concisely. Always remind the user that you are not a replacement for veterinary advice.
When patterns or concerns are detected, mention them. Keep answers focused and practical.""",
    )

    # Pillar 4: sanitize the user-controlled message before embedding in agent prompt
    safe_message = sanitize_agent_input(body.message)

    context_prompt = f"""Pet profile: {json.dumps(pet, indent=2)}

Recent health logs (last 90 entries):
{json.dumps(logs.data or [], indent=2)}

Active medications:
{json.dumps(meds.data or [], indent=2)}

Vet clinical notes:
{json.dumps(vet_notes.data or [], indent=2)}

User question: {safe_message}"""

    response = await run_agent(chat_agent, context_prompt)
    return {"answer": response}


# ── Export ────────────────────────────────────────────────────────────────────

from fastapi.responses import StreamingResponse
import csv
import io


@app.get("/api/pets/{pet_id}/export")
async def export_logs_csv(pet_id: str, authorization: Optional[str] = Header(None)):
    """Export all health logs for a pet as CSV."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    pet_result = db.table("pets").select("name").eq("id", pet_id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    pet_name = pet_result.data[0]["name"]
    logs = db.table("health_logs").select("*").eq("pet_id", pet_id).order("logged_at", desc=True).execute()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "date", "observation", "symptoms", "behaviors", "mood",
        "flagged", "severity", "flag_reason", "weight_kg"
    ])
    writer.writeheader()

    for log in (logs.data or []):
        writer.writerow({
            "date": log.get("logged_at", "")[:10],
            "observation": log.get("raw_input", ""),
            "symptoms": ", ".join(log.get("extracted_symptoms") or []),
            "behaviors": ", ".join(log.get("extracted_behaviors") or []),
            "mood": log.get("extracted_mood", ""),
            "flagged": log.get("flagged", False),
            "severity": log.get("severity", ""),
            "flag_reason": log.get("flag_reason", ""),
            "weight_kg": log.get("weight_kg", ""),
        })

    output.seek(0)
    filename = f"{pet_name.lower().replace(' ', '-')}-health-logs.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Medication interaction checker ───────────────────────────────────────────

@app.get("/api/pets/{pet_id}/medications/interactions")
@limiter.limit("20/hour")
async def check_medication_interactions(request: Request, pet_id: str, authorization: Optional[str] = Header(None)):
    """Use AI to check for potential medication interactions."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    meds = db.table("medications").select("*").eq("pet_id", pet_id).eq("active", True).execute()
    if not meds.data or len(meds.data) < 2:
        return {"interactions": [], "summary": "Need at least 2 active medications to check interactions."}

    pet_result = db.table("pets").select("name, species, breed").eq("id", pet_id).execute()
    pet = (pet_result.data or [{}])[0]

    from google.adk.agents import LlmAgent
    checker_agent = LlmAgent(
        name="interaction_checker",
        model="gemini-2.5-flash",
        instruction="""You are a veterinary pharmacology expert. Check the provided medications for potential interactions.
Be concise and practical. Flag only clinically significant interactions. Always recommend consulting a vet.""",
    )

    prompt = f"""Check these active medications for a {pet.get('species', 'pet')} ({pet.get('breed', '')}):

{json.dumps([{"name": m["name"], "dose": m.get("dose"), "frequency": m.get("frequency")} for m in meds.data], indent=2)}

List any significant drug interactions, contraindications, or monitoring requirements.
Return JSON: {{"interactions": [{{"drugs": ["...", "..."], "severity": "high|medium|low", "description": "..."}}], "summary": "..."}}"""

    raw = await run_agent(checker_agent, prompt)
    try:
        return parse_json_response(raw)
    except Exception:
        return {"interactions": [], "summary": raw}


# ── Vet prescribe medication from patient page ────────────────────────────────

class VetMedRequest(BaseModel):
    pet_id: str
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None


@app.post("/api/vet/prescribe")
async def vet_prescribe_medication(body: VetMedRequest, authorization: Optional[str] = Header(None)):
    """Vet prescribes a medication from a patient profile."""
    user = await get_user_from_token(authorization)

    db = get_supabase()
    profile_result = db.table("profiles").select("role").eq("id", user.id).execute()
    profile = (profile_result.data or [{}])[0]
    if profile.get("role") != "vet":
        raise HTTPException(status_code=403, detail="Only veterinarians can prescribe medications")

    share_result = db.table("pet_shares").select("id").eq("pet_id", body.pet_id).eq("vet_id", user.id).eq("status", "accepted").execute()
    if not share_result.data:
        raise HTTPException(status_code=403, detail="You do not have access to this pet")

    # Find pet owner
    pet_result = db.table("pets").select("user_id").eq("id", body.pet_id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    owner_id = pet_result.data[0]["user_id"]

    payload = {
        "pet_id": body.pet_id,
        "user_id": owner_id,
        "name": body.name,
        "dose": body.dose,
        "frequency": body.frequency,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "notes": body.notes,
        "active": True,
    }
    result = db.table("medications").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save medication")
    return result.data[0]


# ── Shareable read-only links ─────────────────────────────────────────────────

class ShareLinkRequest(BaseModel):
    label: Optional[str] = None
    expires_days: Optional[int] = None  # days until expiry; None = never


@app.post("/api/pets/{pet_id}/share-link")
async def create_share_link(pet_id: str, body: ShareLinkRequest, authorization: Optional[str] = Header(None)):
    """Create a public read-only share link for a pet."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    pet_result = db.table("pets").select("id").eq("id", pet_id).eq("user_id", user.id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    import secrets
    token = secrets.token_urlsafe(32)
    expires_at = None
    if body.expires_days:
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(days=body.expires_days)).isoformat()

    payload = {
        "pet_id": pet_id,
        "owner_id": user.id,
        "token": token,
        "label": body.label,
        "expires_at": expires_at,
    }
    result = db.table("share_links").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create share link")
    return result.data[0]


@app.get("/api/pets/{pet_id}/share-link")
async def list_share_links(pet_id: str, authorization: Optional[str] = Header(None)):
    """List all share links for a pet."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("share_links").select("*").eq("pet_id", pet_id).eq("owner_id", user.id).order("created_at", desc=True).execute()
    return result.data or []


@app.delete("/api/pets/{pet_id}/share-link/{link_id}")
async def delete_share_link(pet_id: str, link_id: str, authorization: Optional[str] = Header(None)):
    """Delete a share link."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("share_links").delete().eq("id", link_id).eq("owner_id", user.id).execute()
    return {"deleted": True}


@app.get("/api/public/pets/{token}")
async def get_public_pet(token: str):
    """Public read-only pet view — no auth required."""
    db = get_supabase()
    try:
        link_result = db.table("share_links").select("*").eq("token", token).execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Share link not found")
    if not link_result.data:
        raise HTTPException(status_code=404, detail="Share link not found")

    link = link_result.data[0]
    if link.get("expires_at"):
        from datetime import datetime
        if datetime.utcnow().isoformat() > link["expires_at"]:
            raise HTTPException(status_code=410, detail="This share link has expired")

    pet_id = link["pet_id"]
    pet_result = db.table("pets").select("*").eq("id", pet_id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    logs_result = db.table("health_logs").select("*").eq("pet_id", pet_id).order("logged_at", desc=True).limit(10).execute()
    meds_result = db.table("medications").select("*").eq("pet_id", pet_id).execute()
    vacc_result = db.table("vaccinations").select("*").eq("pet_id", pet_id).order("administered_date", desc=True).execute()

    return {
        "pet": pet_result.data[0],
        "logs": logs_result.data or [],
        "medications": meds_result.data or [],
        "vaccinations": vacc_result.data or [],
    }


# ── Co-owner access ───────────────────────────────────────────────────────────

class CoOwnerRequest(BaseModel):
    email: str


@app.post("/api/pets/{pet_id}/co-owners")
async def invite_co_owner(pet_id: str, body: CoOwnerRequest, authorization: Optional[str] = Header(None)):
    """Invite a co-owner (partner) to this pet."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    pet_result = db.table("pets").select("id, name").eq("id", pet_id).eq("user_id", user.id).execute()
    if not pet_result.data:
        raise HTTPException(status_code=404, detail="Pet not found")

    import secrets
    invite_token = secrets.token_urlsafe(24)
    payload = {
        "pet_id": pet_id,
        "owner_id": user.id,
        "invited_email": body.email,
        "invite_token": invite_token,
        "status": "pending",
    }
    result = db.table("pet_co_owners").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to invite co-owner")

    # Send invite email if Resend configured
    owner_result = db.table("profiles").select("full_name").eq("id", user.id).execute()
    owner_name = (owner_result.data or [{}])[0].get("full_name") or "A PawLog user"
    pet_name = pet_result.data[0]["name"]
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    accept_url = f"{frontend_url}/accept-co-owner?token={invite_token}"

    from email_templates import co_owner_invite
    await send_email(
        to=body.email,
        subject=f"{owner_name} invited you to co-manage {pet_name} on PawLog",
        html=co_owner_invite(owner_name, pet_name, accept_url),
    )
    return result.data[0]


@app.get("/api/pets/{pet_id}/co-owners")
async def list_co_owners(pet_id: str, authorization: Optional[str] = Header(None)):
    """List co-owners for a pet."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("pet_co_owners").select("*").eq("pet_id", pet_id).eq("owner_id", user.id).order("created_at", desc=True).execute()
    return result.data or []


@app.delete("/api/pets/{pet_id}/co-owners/{co_owner_id}")
async def revoke_co_owner(pet_id: str, co_owner_id: str, authorization: Optional[str] = Header(None)):
    """Revoke a co-owner's access."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("pet_co_owners").update({"status": "revoked"}).eq("id", co_owner_id).eq("owner_id", user.id).execute()
    return {"revoked": True}


@app.get("/api/accept-co-owner")
async def accept_co_owner(token: str):
    """Accept a co-owner invite (redirects to auth if not signed in)."""
    db = get_supabase()
    try:
        result = db.table("pet_co_owners").select("*").eq("invite_token", token).eq("status", "pending").execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Invite not found or already accepted")
    if not result.data:
        raise HTTPException(status_code=404, detail="Invite not found or already accepted")
    db.table("pet_co_owners").update({"status": "accepted"}).eq("invite_token", token).execute()
    return {"accepted": True}


# ── Lab results / X-rays ──────────────────────────────────────────────────────

class LabResultRequest(BaseModel):
    file_url: str
    file_name: str
    file_type: str
    notes: Optional[str] = None
    test_date: Optional[str] = None


@app.post("/api/pets/{pet_id}/lab-results")
async def create_lab_result(pet_id: str, body: LabResultRequest, authorization: Optional[str] = Header(None)):
    """Save lab result metadata after Supabase Storage upload."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "user_id": user.id,
        "file_url": body.file_url,
        "file_name": body.file_name,
        "file_type": body.file_type,
        "notes": body.notes,
        "test_date": body.test_date,
    }
    result = db.table("lab_results").insert(payload).select().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save lab result")
    return result.data[0]


@app.get("/api/pets/{pet_id}/lab-results")
async def list_lab_results(pet_id: str, authorization: Optional[str] = Header(None)):
    """List all lab results for a pet."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("lab_results").select("*").eq("pet_id", pet_id).order("created_at", desc=True).execute()
    return result.data or []


@app.delete("/api/pets/{pet_id}/lab-results/{result_id}")
async def delete_lab_result(pet_id: str, result_id: str, authorization: Optional[str] = Header(None)):
    """Delete a lab result record."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    db.table("lab_results").delete().eq("id", result_id).eq("user_id", user.id).execute()
    return {"deleted": True}


# ── Vet verified badge (admin-only) ──────────────────────────────────────────

class VerifyVetRequest(BaseModel):
    vet_id: str
    verified: bool = True


@app.post("/api/admin/verify-vet")
async def verify_vet(body: VerifyVetRequest, x_admin_secret: Optional[str] = Header(None)):
    """Admin endpoint to grant/revoke vet verified status. Requires X-Admin-Secret header."""
    admin_secret = os.getenv("ADMIN_SECRET")
    if not admin_secret or x_admin_secret != admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    db = get_supabase()
    result = db.table("profiles").update({"verified": body.verified}).eq("id", body.vet_id).select().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Vet profile not found")
    return {"vet_id": body.vet_id, "verified": body.verified}


@app.get("/api/vet/verify-status")
async def get_verify_status(authorization: Optional[str] = Header(None)):
    """Returns the calling vet's verified status."""
    user = await get_user_from_token(authorization)
    db = get_supabase()
    result = db.table("profiles").select("verified, role").eq("id", user.id).execute()
    profile = (result.data or [{}])[0]
    if profile.get("role") != "vet":
        raise HTTPException(status_code=403, detail="Not a vet account")
    return {"verified": bool(profile.get("verified"))}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
