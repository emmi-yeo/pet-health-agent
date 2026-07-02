# PawLog — AI Multi-Agent Pet Health Journal

> **Track: Concierge Agents** — Google ADK Hackathon Submission

PawLog is an AI-powered pet health journal built on Google ADK and Gemini 2.5 Flash. It uses a **sequential multi-agent pipeline** to turn plain-language daily observations into structured health data, detect symptom patterns automatically, and generate vet-ready summaries — so every appointment starts with context instead of guesswork.

**Live demo:** [pawlog.vercel.app](https://pawlog.vercel.app) · **Demo login:** see [Try It](#try-it)

---

## The Problem

Pet owners notice things between vet visits — a dog that ate less, a cat that's been sneezing for three days — but by the time they're in the exam room, the details are gone. Vets make decisions on incomplete information. Chronic conditions get missed because no one connected the dots across two months of "seemed a bit off."

## The Solution

PawLog gives owners a zero-friction daily health journal (one sentence is enough) and uses AI agents to do the rest:

- **Structure** the observation into symptoms, behaviors, and mood  
- **Detect patterns** across 30-, 60-, and 90-day history  
- **Flag** entries that warrant veterinary attention  
- **Generate** a print-ready summary the vet can read in 30 seconds  

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
│                   FastAPI Backend                               │
│                                                                 │
│  POST /api/pets/{id}/logs                                       │
│       │                                                         │
│       ▼  ── Sequential Multi-Agent Pipeline ──────────────────  │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐ │
│  │ Intake Agent │ → │ Analysis Agent   │ → │ Save to DB     │ │
│  │              │   │                  │   │ (via MCP tool) │ │
│  │ Raw text →   │   │ Pattern detection│   └────────────────┘ │
│  │ symptoms,    │   │ across 90-day    │                       │
│  │ mood, flag   │   │ history + meds   │                       │
│  └──────────────┘   └──────────────────┘                       │
│                                                                 │
│  POST /api/pets/{id}/summary                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐                                               │
│  │ Report Agent │  → Vet-ready narrative + key concerns         │
│  └──────────────┘                                               │
│                                                                 │
│  POST /api/pets/{id}/chat                                       │
│       ▼                                                         │
│  ┌──────────────┐                                               │
│  │  Chat Agent  │  → Conversational Q&A over full history       │
│  └──────────────┘                                               │
│                                                                 │
│  GET  /api/pets/{id}/medications/interactions                   │
│       ▼                                                         │
│  ┌──────────────────────┐                                       │
│  │ Interaction Checker  │  → AI drug interaction analysis       │
│  └──────────────────────┘                                       │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │           MCP Server (FastMCP)          │                   │
│  │  get_pet_profile · get_recent_logs      │                   │
│  │  get_active_medications · save_log      │                   │
│  │  save_vet_summary · get_flagged_logs    │                   │
│  └────────────────────┬────────────────────┘                   │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Row Level Security)         │
│  pets · health_logs · medications · vaccinations                │
│  appointments · vet_visits · vet_notes · pet_shares             │
│  share_links · pet_co_owners · lab_results · profiles           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts Demonstrated

| Concept | Where | File / Line |
|---|---|---|
| **Multi-agent system (ADK)** | Sequential pipeline: Intake → Analysis → Report | `backend/agents/intake_agent.py`, `analysis_agent.py`, `report_agent.py`; orchestrated in `backend/main.py:185` |
| **MCP Server** | 6 tools exposed via FastMCP; agents call them via `MCPToolset` | `backend/mcp_server/pet_data_server.py` |
| **Antigravity** | Natural language input — no medical terms needed; AI extracts structure | `backend/agents/intake_agent.py` (INTAKE_INSTRUCTION prompt) |
| **Security (AI-specific)** | 7-pillar agent security: JWT auth, input sanitization, output cap, UUID validation, RLS, rate limits, trajectory logging | `backend/main.py` (`get_user_from_token`, `sanitize_agent_input`, `run_agent`), `mcp_server/pet_data_server.py` (`_require_uuid`), `SECURITY.md` |
| **Deployability** | Vercel-ready frontend; Render-ready FastAPI backend | `next.config.ts`, `backend/main.py` (`uvicorn`), this README |
| **Agent skills** | Chat agent + medication interaction agent as additional skill-style agents | `backend/main.py:700` (chat), `:797` (interactions) |

---

## AI Agent Security

PawLog implements the **7-Pillar Agent Security Architecture** described in Google's *Vibe Coding: Agent Security and Evaluation* course. Full details in [SECURITY.md](SECURITY.md).

### Pillar 1 — Infrastructure
- Startup validation: FastAPI crashes at boot if `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, or `GOOGLE_API_KEY` are absent — no silent fallback to unauthenticated state. (`main.py` — `on_startup()`)
- MCP server runs as a **local subprocess over stdio**, never on a network port — eliminates remote MCP spoofing surface.

### Pillar 2 — Data
- **Supabase RLS on all 12 tables** — every query is gated by `auth.uid()` at the database layer. Addresses the most common vibe-coding security failure: backends left wide open.
- **UUID validation at every MCP tool boundary** (`mcp_server/pet_data_server.py` — `_require_uuid()`): agents cannot query arbitrary rows via hallucinated or injected IDs. Closes the **Confused Deputy** vector at the data layer.
- `get_recent_health_logs` hard-caps at 90 entries — agents cannot trigger unbounded reads.

### Pillar 3 — Model
- **Server-side prompts only** — all agent system instructions live in backend Python files. The client sends only a pet ID and raw text. No client-controlled prompt content exists.
- **Injection-resistance guardrails** in all three pipeline agents: if input attempts to override instructions, the agent returns a safe empty-JSON default and does not comply.
- **No-diagnosis mandate** enforced in every agent instruction — agents extract observations only; the Report Agent's output must always close with a disclaimer.

### Pillar 4 — Application & Runtime
- **Input sanitization** (`main.py` — `sanitize_agent_input()`): user text is stripped and hard-capped at 2,000 chars before reaching any agent. Prevents prompt-padding and context-stuffing (Zero Ambient Authority).
- **Output cap** (`main.py` — `run_agent()`): agent responses truncated at 8,000 chars — **Denial of Wallet** defence against runaway model output.
- **Agent output validation gate** (`main.py` — `parse_json_response()`): all agent JSON passes through a parse gate; malformed output returns `{}` rather than crashing the pipeline.
- **Rate limits** on every AI endpoint (slowapi): 20/min logs · 10/hr summaries · 30/hr chat · 20/hr interactions.

### Pillar 5 — IAM
- **JWT verification before every agent run** (`main.py` — `get_user_from_token()`): no valid Supabase Bearer token → 401, no agent execution. Solves the **Confused Deputy problem** — agents always run on behalf of a verified identity.
- **Zero Ambient Authority**: agents receive a pet ID and sanitized text only — never a JWT, email, or any credential. The MCP server uses its own service key, not the user's session.
- **Admin-secret gate** on privileged ops (`main.py` — `verify_vet()`): vet verification requires `X-Admin-Secret` header; a valid user JWT alone cannot escalate privileges.

### Pillar 6 — Observability
- **Structured trajectory logging** in `run_agent()`: every invocation emits `[AGENT:START]`, `[AGENT:DONE]` (with elapsed time + output size), `[AGENT:TRUNCATE]` (if capped), and `[PARSE]` warnings on JSON failure — a full **Vibe Trajectory** audit log per request.

### Pillar 7 — Governance
- `SECURITY.md` documents every control with a threat × control matrix.
- Responsible-AI disclaimer enforced in agent prompts and shown in the UI on every page that surfaces AI output.

---

## Features

### Pet Owner
- **Daily health logging** — plain text in, structured data out (symptoms, behaviors, mood, severity)
- **AI pattern detection** — flags recurring symptoms across 30/60/90-day windows
- **Vet visit summary** — one-click AI report with key concerns and suggested vet questions
- **Print / Save PDF** — `@media print` optimised report page
- **AI chat** — ask anything about your pet's history in natural language
- **Medication tracking** — active meds with dose/frequency; AI interaction checker
- **Vaccination log** — overdue + due-soon alerts (amber/red badges)
- **Appointment scheduling** — upcoming appointments with vet notifications
- **Vet visit history** — past visit records
- **Lab results** — upload PDFs, images, DICOM files (20 MB, Supabase Storage)
- **Weight trend chart** — recharts area chart from logged weights
- **QR code per pet** — downloadable PNG, links directly to pet profile
- **CSV export** — all logs with AI-extracted fields
- **Shareable read-only link** — token-based public page, no login required
- **Co-owner access** — invite partner/family as pet co-owner
- **Dark mode** — system preference aware, persisted to localStorage

### Veterinarian
- **Patient dashboard** — all shared patients, flagged count, last log date
- **Full health timeline** — every log, observation, and AI analysis
- **Clinical notes** — observation / diagnosis / treatment / follow-up note types
- **Prescribe medications** — adds directly to patient's record
- **Vaccination management** — add/view vaccines for patients
- **Verified badge** — admin-grantable verification mark shown to pet owners

### Backend / Platform
- **Email notifications** — Resend: vet invites, high-severity alerts, daily reminders, weekly digest, medication refill, vaccination reminders, appointment reminders
- **Scheduled jobs** — APScheduler: daily 8pm reminder, Sunday digest, Monday vet digest, 10-min appointment checks
- **Async job polling** — long AI runs return a job ID; frontend polls until done
- **117 tests** — 30 Jest, 83 pytest (contract + security + integration), 108 Playwright E2E

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Auth | Supabase Auth — Google OAuth + email/password |
| Backend | FastAPI (Python 3.12), Google ADK, Gemini 2.5 Flash |
| AI Agents | `google-adk`, `LlmAgent`, `Runner`, `InMemorySessionService` |
| MCP Server | `fastmcp` (python-mcp) |
| Database | Supabase — PostgreSQL with Row Level Security |
| Storage | Supabase Storage (`pet-photos`, `lab-results` buckets) |
| Email | Resend API |
| Rate limiting | slowapi |
| Scheduling | APScheduler |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Try It

**Demo accounts (no signup needed):**

| Role | Email | Password |
|---|---|---|
| 🐾 Pet Owner | `pawlog.e2e@test.local` | `PawLogTest2026!` |
| 🩺 Veterinarian | `pawlog.vet@test.local` | `PawLogVet2026!` |

Or use the **"Try a demo account"** shortcuts on the sign-in page.

---

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Supabase project
- Google AI Studio API key (Gemini)
- Resend API key (optional, for emails)

### 1. Clone

```bash
git clone https://github.com/emmi-yeo/pet-health-agent.git
cd pawlog
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In SQL Editor, run `supabase/schema.sql` (creates all tables + RLS policies)
3. Enable Google OAuth: Authentication → Providers → Google
4. Create Supabase Storage buckets: `pet-photos` (public, 5 MB) and `lab-results` (public, 20 MB)

### 3. Frontend

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm install
npm run dev          # http://localhost:3000
```

### 4. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:
```
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
RESEND_API_KEY=re_your_key          # optional
FRONTEND_URL=http://localhost:3000
ADMIN_SECRET=your_admin_secret      # for vet verification endpoint
```

```bash
python main.py       # http://localhost:8000
```

### 5. Database migrations (Phase 2 + 3 features)

```bash
cd backend
python migrations/002_phase2_features.py
python migrations/003_phase3_features.py
```

### 6. Run tests

```bash
# Backend
cd backend && python -m pytest tests/ -q

# Frontend unit tests
npm test

# E2E (requires both servers running)
npx playwright test
```

---

## Deployment

### Frontend → Vercel

```bash
npm install -g vercel
vercel --prod
```

Set env vars in Vercel dashboard (same as `.env.local`).

### Backend → Render

1. New Web Service → connect repo → root: `backend/`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env vars in Render dashboard

Update `NEXT_PUBLIC_API_URL` in Vercel to point to your Render URL.

---

## Agent Pipeline — Detailed Flow

### Log Entry (Sequential Multi-Agent)

```
User writes: "Buddy ate less than half his food and was scratching his ear a lot"
                              │
                              ▼
                    ┌─────────────────┐
                    │  Intake Agent   │
                    │  (Gemini Flash) │
                    └────────┬────────┘
                             │  Returns JSON:
                             │  { symptoms: ["ear scratching"],
                             │    behaviors: ["reduced appetite"],
                             │    mood: "normal",
                             │    initial_flag: true }
                             ▼
              ┌──────────────────────────────┐
              │       Analysis Agent         │
              │  reads 90-day history        │
              │  via MCP get_recent_logs()   │
              └──────────────┬───────────────┘
                             │  Returns JSON:
                             │  { patterns: ["ear scratching 4x in 7 days"],
                             │    flagged: true,
                             │    severity: "medium",
                             │    flag_reason: "Recurring ear issue" }
                             ▼
              ┌──────────────────────────────┐
              │    MCP save_health_log()     │
              │    → persisted to Supabase   │
              └──────────────────────────────┘
                             │
                             ▼ (if severity == "high")
              ┌──────────────────────────────┐
              │   Email owner via Resend     │
              └──────────────────────────────┘
```

### Vet Summary (Single Agent + MCP)

```
User requests summary
        │
        ▼
┌─────────────────────────────────────────┐
│  Report Agent reads via MCP:            │
│  • get_pet_profile()                    │
│  • get_recent_health_logs(limit=90)     │
│  • get_active_medications()             │
└──────────────────────┬──────────────────┘
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

## Project Structure

```
pawlog/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── auth/               # Sign in / sign up
│   │   ├── dashboard/          # Pet owner dashboard
│   │   ├── pets/[id]/          # Pet profile + all tabs
│   │   │   ├── log/            # Log health observation
│   │   │   ├── summary/        # AI vet summary + print
│   │   │   ├── chat/           # AI chat about pet history
│   │   │   ├── medications/    # Medication management
│   │   │   ├── share/          # Share with vet / co-owner / public link
│   │   │   └── qr/             # QR code page
│   │   ├── vet/                # Vet dashboard + patient pages
│   │   └── p/[token]/          # Public read-only pet page (no auth)
│   └── components/             # React components
├── backend/
│   ├── main.py                 # FastAPI app (1,130 lines, 30+ endpoints)
│   ├── agents/
│   │   ├── intake_agent.py     # ADK LlmAgent — symptom extraction
│   │   ├── analysis_agent.py   # ADK LlmAgent — pattern detection
│   │   └── report_agent.py     # ADK LlmAgent — vet summary generation
│   ├── mcp_server/
│   │   └── pet_data_server.py  # FastMCP server with 6 tools
│   ├── migrations/             # DB migration scripts
│   ├── scheduler.py            # APScheduler jobs
│   ├── email_service.py        # Resend integration
│   └── email_templates.py      # HTML email templates
├── tests/
│   └── e2e/                    # Playwright E2E tests (108 tests)
└── supabase/
    └── schema.sql              # Full DB schema + RLS policies
```

---

## Disclaimer

PawLog does not provide veterinary advice or diagnosis. All AI-generated content is for informational purposes only. Always consult a licensed veterinarian for your pet's health needs.
