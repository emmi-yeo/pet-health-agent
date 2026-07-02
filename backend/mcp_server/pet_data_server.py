"""
MCP Server — Pet Data Tools

Exposes Supabase pet health data as MCP tools so ADK agents can
read and write health logs, pets, and medications through a
standardized tool interface.
"""

import os
import re
from mcp.server.fastmcp import FastMCP
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

mcp = FastMCP("pet-health-data")

_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)


def _require_uuid(value: str, field: str) -> None:
    """Reject non-UUID inputs at the MCP tool boundary.

    Pillar 2 (Data): LLM agents can hallucinate or be manipulated into
    supplying malformed IDs. Validating UUIDs here ensures agents cannot
    accidentally (or maliciously) query arbitrary rows via crafted IDs.
    This is the data-layer equivalent of the Confused Deputy defence.
    """
    if not _UUID_RE.match(str(value)):
        raise ValueError(f"Invalid {field}: must be a valid UUID")


def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


@mcp.tool()
def get_pet_profile(pet_id: str) -> dict:
    """Fetch a pet's profile including species, breed, age, and weight."""
    _require_uuid(pet_id, "pet_id")
    db = get_supabase()
    result = db.table("pets").select("*").eq("id", pet_id).single().execute()
    return result.data or {}


@mcp.tool()
def get_recent_health_logs(pet_id: str, limit: int = 30) -> list[dict]:
    """Fetch recent health log entries for a pet, newest first."""
    _require_uuid(pet_id, "pet_id")
    db = get_supabase()
    result = (
        db.table("health_logs")
        .select("*")
        .eq("pet_id", pet_id)
        .order("logged_at", desc=True)
        .limit(min(limit, 90))  # hard cap — agents cannot request unbounded history
        .execute()
    )
    return result.data or []


@mcp.tool()
def get_active_medications(pet_id: str) -> list[dict]:
    """Fetch a pet's currently active medications."""
    _require_uuid(pet_id, "pet_id")
    db = get_supabase()
    result = (
        db.table("medications")
        .select("*")
        .eq("pet_id", pet_id)
        .eq("active", True)
        .execute()
    )
    return result.data or []


@mcp.tool()
def save_health_log(
    pet_id: str,
    user_id: str,
    raw_input: str,
    extracted_symptoms: list[str],
    extracted_behaviors: list[str],
    extracted_mood: str,
    flagged: bool,
    flag_reason: str,
    severity: str,
) -> dict:
    """
    Persist a processed health log entry to the database.
    severity must be one of: low, medium, high, or empty string.
    """
    _require_uuid(pet_id, "pet_id")
    _require_uuid(user_id, "user_id")
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "user_id": user_id,
        "raw_input": raw_input,
        "extracted_symptoms": extracted_symptoms,
        "extracted_behaviors": extracted_behaviors,
        "extracted_mood": extracted_mood or None,
        "flagged": flagged,
        "flag_reason": flag_reason or None,
        "severity": severity or None,
    }
    result = db.table("health_logs").insert(payload).execute()
    return result.data[0] if result.data else {}


@mcp.tool()
def save_vet_summary(
    pet_id: str,
    user_id: str,
    content: str,
    key_concerns: list[str],
    recommended_questions: list[str],
    date_range_start: str = "",
    date_range_end: str = "",
) -> dict:
    """Persist an AI-generated vet visit summary to the database."""
    _require_uuid(pet_id, "pet_id")
    _require_uuid(user_id, "user_id")
    db = get_supabase()
    payload = {
        "pet_id": pet_id,
        "user_id": user_id,
        "content": content,
        "key_concerns": key_concerns,
        "recommended_questions": recommended_questions,
        "date_range_start": date_range_start or None,
        "date_range_end": date_range_end or None,
    }
    result = db.table("vet_summaries").insert(payload).execute()
    return result.data[0] if result.data else {}


@mcp.tool()
def get_flagged_logs(pet_id: str) -> list[dict]:
    """Fetch all flagged health logs for a pet — used to detect patterns."""
    _require_uuid(pet_id, "pet_id")
    db = get_supabase()
    result = (
        db.table("health_logs")
        .select("*")
        .eq("pet_id", pet_id)
        .eq("flagged", True)
        .order("logged_at", desc=True)
        .execute()
    )
    return result.data or []


if __name__ == "__main__":
    mcp.run()
