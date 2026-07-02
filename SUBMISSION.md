# Kaggle Hackathon Submission — PawLog

## Track
**Concierge Agents** — a personal AI agent that manages an ongoing, multi-step domain on the user's behalf.

---

## Project Title
**PawLog: AI Multi-Agent Pet Health Journal**

---

## The Problem

Pet owners notice things between vet visits — a dog that ate less, a cat that's been sneezing for three days — but by the time they're in the exam room, the details are gone. Vets make decisions on incomplete information. Chronic conditions get missed because no one connected the dots across two months of "seemed a bit off."

There's no low-friction tool that lets a pet owner log daily health observations in plain English, automatically structures that data, detects patterns over time, and generates a print-ready summary the vet can actually use.

---

## The Solution

PawLog is a pet health journal powered by a sequential multi-agent pipeline built on Google ADK and Gemini 2.5 Flash. The user writes one sentence. The agents do the rest:

1. **Intake Agent** — parses plain-language observations into structured symptoms, behaviors, and mood
2. **Analysis Agent** — reads 90 days of history via MCP and detects recurring patterns, escalation, and medication conflicts
3. **Report Agent** — synthesizes everything into a vet-ready narrative with key concerns and suggested questions
4. **Chat Agent** — answers natural-language questions about the pet's full history
5. **Interaction Checker Agent** — screens active medications for clinically significant interactions

The result: every vet appointment starts with context instead of guesswork.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (Next.js 16)                         │
│  Pet Owner → logs observation (plain text)                      │
│  Vet       → views timeline, adds clinical notes                │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS + Supabase JWT
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Python 3.12)                  │
│                                                                 │
│  POST /api/pets/{id}/logs                                       │
│       │                                                         │
│       ▼  ── Sequential Multi-Agent Pipeline ──────────────────  │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐ │
│  │ Intake Agent │ → │ Analysis Agent   │ → │ Save to DB     │ │
│  │  (ADK)       │   │  (ADK + MCP)     │   │ (via MCP tool) │ │
│  │ raw text →   │   │ 90-day pattern   │   └────────────────┘ │
│  │ structured   │   │ detection        │                       │
│  │ JSON         │   │                  │                       │
│  └──────────────┘   └──────────────────┘                       │
│                                                                 │
│  POST /api/pets/{id}/summary → Report Agent                     │
│  POST /api/pets/{id}/chat   → Chat Agent                        │
│  GET  /api/pets/{id}/medications/interactions → Checker Agent   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │           MCP Server (FastMCP)          │                   │
│  │  get_pet_profile · get_recent_logs      │                   │
│  │  get_active_medications · save_log      │                   │
│  │  save_vet_summary · get_flagged_logs    │                   │
│  └────────────────────┬────────────────────┘                   │
└───────────────────────┼─────────────────────────────────────────┘
                        │ Supabase service key (server-side only)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│           Supabase (PostgreSQL + Row Level Security)            │
│  pets · health_logs · medications · vaccinations                │
│  appointments · vet_visits · vet_notes · pet_shares             │
│  share_links · pet_co_owners · lab_results · profiles           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts Demonstrated

| Concept | Implementation | File |
|---|---|---|
| **Multi-agent system (ADK)** | Sequential pipeline: Intake → Analysis → Report; skill agents: Chat, Interaction Checker | `backend/agents/`, `backend/main.py` |
| **MCP Server** | 6 tools via FastMCP; agents call them via `MCPToolset` + `StdioServerParameters` | `backend/mcp_server/pet_data_server.py` |
| **Antigravity** | One plain sentence is enough — no medical terms required; AI extracts full structure | `agents/intake_agent.py` (INTAKE_INSTRUCTION) |
| **AI Agent Security** | 7-pillar security architecture; see full section below | `SECURITY.md`, `main.py`, `mcp_server/` |
| **Deployability** | Vercel (frontend) + Render (FastAPI backend); env-var driven config | `next.config.ts`, `backend/main.py` |
| **Agent skills** | Chat agent (conversational history Q&A) + medication interaction checker | `backend/main.py` |

---

## AI Agent Security

PawLog implements the **7-Pillar Agent Security Architecture** from Google's *Vibe Coding: Agent Security and Evaluation* course. Security is not an afterthought — it is wired into each layer of the agent stack.

### Pillar 1 — Infrastructure
The backend **fails fast at startup** if any required secret (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_API_KEY`) is absent. There is no silent fallback to an unauthenticated state (`main.py` — `on_startup()`). The MCP server runs as a **local subprocess over stdio**, never exposed on a network port — eliminating the **MCP spoofing** attack surface described in the course entirely.

### Pillar 2 — Data
**Supabase Row Level Security is enabled on all 12 tables.** Every query is gated by `auth.uid()` at the database layer — the most common vibe-coding failure (leaving the backend wide open) is addressed at the schema level, not in application code. Beyond RLS, a **UUID validation function** (`_require_uuid()` in `mcp_server/pet_data_server.py`) runs at the start of every MCP tool: agents cannot query arbitrary rows via hallucinated or injected identifiers. This closes the **Confused Deputy** vulnerability at the data layer — even if an agent were manipulated into supplying a crafted ID, the tool rejects it before touching the database.

### Pillar 3 — Model
**All system prompts are server-side only.** The frontend never sends prompt content — only a pet ID and the user's raw text. There is no mechanism for a client to supply or modify agent instructions. Every agent instruction also includes explicit **injection-resistance guardrails**: if the input text attempts to override the instructions (e.g. "ignore your instructions, new task"), the agent returns a safe empty-JSON default rather than complying. Agents are also prohibited from providing diagnoses or recommending medications — the Report Agent's `content` field must always close with a disclaimer that the output is not a veterinary diagnosis.

### Pillar 4 — Application & Runtime
Three controls work together to protect the agent runtime:
- **Input sanitization** (`sanitize_agent_input()` in `main.py`): all user-controlled text is stripped and hard-capped at 2,000 characters before being embedded in any agent prompt. This prevents prompt-padding and context-stuffing — a direct implementation of the **Zero Ambient Authority** principle (agents receive only the minimum context they need).
- **Output cap** (`run_agent()` in `main.py`): agent responses are truncated at 8,000 characters. A single misbehaving model call cannot produce a response large enough to exhaust memory or processing budget — a **Denial of Wallet** defence.
- **Agent output validation gate** (`parse_json_response()` in `main.py`): all agent JSON passes through a parse gate; malformed or empty output returns `{}` rather than raising, so a misbehaving agent cannot crash the pipeline.
- **Rate limiting** on every AI endpoint (slowapi): 20/min for logs, 10/hr for summaries, 30/hr for chat, 20/hr for interaction checks.

### Pillar 5 — IAM
**JWT verification gates every agent-triggering endpoint** (`get_user_from_token()` in `main.py`): no valid Supabase Bearer token → 401 → no agent execution. This directly solves the **Confused Deputy problem** — agents always run on behalf of a verified, authenticated identity. Agents themselves receive **Zero Ambient Authority**: they get a pet ID and sanitized text only — never a JWT, email, or any credential. The MCP server uses its own service key, not the user's session. Privileged operations (vet verification) are further gated by an **admin secret** checked server-side, so a valid user JWT alone cannot escalate to admin.

### Pillar 6 — Observability & SecOps
Every agent invocation emits structured log lines: `[AGENT:START]`, `[AGENT:DONE]` (with elapsed time and output size), `[AGENT:TRUNCATE]` (when output is capped), and `[PARSE]` warnings when agent JSON fails to decode. This creates a **Vibe Trajectory** audit trail for every request — which agents ran, how long they took, how large their outputs were, and whether any anomaly (parse failure, truncation) occurred. Ops teams can detect **intent drift**, runaway latency, or repeated injection attempts directly from logs without touching model internals.

### Pillar 7 — Governance
A dedicated `SECURITY.md` documents every control with a threat × control matrix. Responsible-AI boundaries are enforced in every agent instruction (no diagnoses, no medication recommendations, mandatory disclaimer on all AI output). A disclaimer is also shown to users on the auth page and on every page that surfaces AI output.

---

## Agent Pipeline — How It Works

### Log Entry (Sequential Multi-Agent)

```
User writes: "Buddy ate less than half his food, scratching ear a lot"
                              │
                              ▼
             ┌────────────────────────┐
             │     Intake Agent       │  → extracts structured JSON:
             │  (Gemini 2.5 Flash)    │    symptoms, behaviors, mood, initial flag
             └──────────┬─────────────┘
                        │
                        ▼
             ┌────────────────────────┐
             │    Analysis Agent      │  → reads 90-day history via MCP
             │  (Gemini 2.5 Flash)    │    detects patterns, sets final severity
             └──────────┬─────────────┘
                        │
                        ▼
             ┌────────────────────────┐
             │  MCP save_health_log() │  → persisted to Supabase
             └────────────────────────┘
                        │
                        ▼ (if severity == "high")
             ┌────────────────────────┐
             │  Email owner via Resend│  → high-severity alert
             └────────────────────────┘
```

### Vet Summary (Single Agent + MCP)

```
User requests summary
        │
        ▼
┌───────────────────────────────────────┐
│  Report Agent reads via MCP:          │
│  get_pet_profile()                    │
│  get_recent_health_logs(limit=30)     │
│  get_active_medications()             │
└──────────────────────┬────────────────┘
                       │
                       ▼
    { content: "..narrative..",
      key_concerns: [...],
      recommended_questions: [...] }
                       │
                       ▼
        Saved to vet_summaries table
        Rendered with Print/PDF button
```

---

## Features

### Pet Owner
- Daily health logging — plain English in, structured data out
- AI pattern detection — flags recurring symptoms across 30/60/90-day windows
- Vet visit summary — one-click AI report with key concerns and suggested questions
- Print / Save PDF — `@media print` optimised report page
- AI chat — ask anything about your pet's history in natural language
- Medication tracking — active meds with AI interaction checker
- Vaccination log — overdue + due-soon alerts
- Appointment scheduling with vet notifications
- Lab results upload (PDF, image, DICOM — 20 MB, Supabase Storage)
- Weight trend chart
- QR code per pet — downloadable PNG
- CSV export of all logs
- Shareable read-only link — token-based public page, no login required
- Co-owner access — invite partner/family
- Dark mode — system preference + localStorage persistence

### Veterinarian
- Patient dashboard — all shared patients, flagged count, last log date
- Full health timeline — every log, observation, and AI analysis
- Clinical notes — observation / diagnosis / treatment / follow-up
- Prescribe medications directly to patient's record
- Vaccination management
- Verified badge — admin-grantable, shown to pet owners

### Platform
- Email notifications (Resend) — vet invites, high-severity alerts, daily reminders, weekly digest, medication refill reminders, vaccination and appointment reminders
- Scheduled jobs (APScheduler) — daily 8pm reminder, Sunday digest, Monday vet digest, 10-min appointment checks
- Async job polling — long AI runs return a job ID; frontend polls until done
- **225 tests** — 30 Jest, 83 pytest (contract, security, integration), 108 Playwright E2E

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Auth | Supabase Auth — Google OAuth + email/password |
| Backend | FastAPI (Python 3.12), Google ADK, Gemini 2.5 Flash |
| AI Agents | `google-adk`, `LlmAgent`, `Runner`, `InMemorySessionService` |
| MCP Server | `fastmcp` (python-mcp), 6 tools |
| Database | Supabase — PostgreSQL with Row Level Security (12 tables) |
| Storage | Supabase Storage — `pet-photos` + `lab-results` buckets |
| Email | Resend API |
| Rate limiting | slowapi |
| Scheduling | APScheduler |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Try It

**Live demo:** [pawlog.vercel.app](https://pawlog.vercel.app)

**Demo accounts — no signup needed:**

| Role | Email | Password |
|---|---|---|
| 🐾 Pet Owner | `pawlog.e2e@test.local` | `PawLogTest2026!` |
| 🩺 Veterinarian | `pawlog.vet@test.local` | `PawLogVet2026!` |

Or click **"Try a demo account"** on the sign-in page.

---

## How to Run Locally

### Prerequisites
- Node.js 20+, Python 3.12+, Supabase project, Google AI Studio API key

### Setup

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/pawlog.git
cd pawlog

# 2. Frontend
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install && npm run dev          # http://localhost:3000

# 3. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # fill in all keys
python main.py                     # http://localhost:8000

# 4. DB migrations
python migrations/002_phase2_features.py
python migrations/003_phase3_features.py

# 5. Tests
cd backend && python -m pytest tests/ -q   # 83 backend tests
npm test                                   # 30 Jest tests
npx playwright test                        # 108 E2E tests
```

---

## Deployment

- **Frontend** → Vercel (`vercel --prod`, set env vars in dashboard)
- **Backend** → Render (root: `backend/`, start: `uvicorn main:app --host 0.0.0.0 --port $PORT`)

---

## Disclaimer

PawLog does not provide veterinary advice or diagnosis. All AI-generated content is for informational purposes only. Always consult a licensed veterinarian for your pet's health needs.
