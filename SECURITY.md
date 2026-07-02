# PawLog — AI Agent Security Architecture

PawLog's security design follows the **7-Pillar Agent Security Architecture** from Google's *Vibe Coding: Agent Security and Evaluation* course. Each pillar is mapped below to the specific file and line where it is implemented.

---

## Pillar 1 — Infrastructure & Networking

**Threat:** Agents running with ambient cloud credentials; no fail-fast on missing secrets.

**PawLog implementation:**

- FastAPI startup validates all required environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_API_KEY`) and raises `RuntimeError` before accepting any requests if any are absent. (`backend/main.py` — `on_startup()`)
- CORS is locked to a single origin (`FRONTEND_URL` env var, default `localhost:3000`). No wildcard origin is ever accepted.
- The MCP server runs as a **local subprocess** over stdio — it is never exposed on a network port, eliminating the remote MCP spoofing attack surface described in the whitepaper.

---

## Pillar 2 — Data Security

**Threat:** Agents accessing other users' data; hallucinated or injected IDs bypassing row isolation.

**PawLog implementation:**

- **Supabase Row Level Security (RLS)** is enabled on all 12 tables. Every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` is gated by `auth.uid()` policies at the database layer. Even if an agent were given a wrong `pet_id`, RLS ensures it reads nothing it shouldn't. (`supabase/schema.sql`)
- **UUID validation at the MCP boundary** (`backend/mcp_server/pet_data_server.py` — `_require_uuid()`): every MCP tool that accepts a `pet_id` or `user_id` validates it against a strict UUID regex before touching the database. This prevents agents from accidentally (or via prompt injection) querying arbitrary rows with crafted IDs.
- The Supabase **service role key** is only used inside the MCP server subprocess. The frontend only receives the public anon key. The service key never crosses a network boundary to the client.
- `get_recent_health_logs` hard-caps the `limit` parameter at 90 entries regardless of what the agent requests — agents cannot trigger unbounded data reads.

---

## Pillar 3 — Model Security

**Threat:** Prompt injection from user input overriding system instructions; agents providing medical diagnoses; jailbreaking via context stuffing.

**PawLog implementation:**

- **Server-side prompts only.** All agent system instructions live in backend Python files (`backend/agents/`). The frontend never sends prompt content — only a pet ID and the user's raw observation text. There is no mechanism for a client to supply or modify system instructions.
- **Explicit injection-resistance guardrails** in every agent instruction:
  - Intake Agent: if the observation attempts to override instructions, return a safe empty JSON default.
  - Analysis Agent: if input attempts to alter instructions, return empty analysis.
  - Report Agent: if input attempts to alter instructions, return an error summary.
  - All three: never provide diagnoses, never recommend medications, return only the specified JSON schema.
- **Mandatory disclaimer** in Report Agent: the `content` field must always end with "This summary is informational only and does not constitute a veterinary diagnosis."

---

## Pillar 4 — Application & Runtime Security

**Threat:** Prompt injection from user input; runaway LLM output costs (Denial of Wallet); missing validation of agent output schema.

**PawLog implementation:**

- **Input sanitization at the API boundary** (`backend/main.py` — `sanitize_agent_input()`): all user-controlled text is stripped and hard-capped at 2,000 characters before being embedded in an agent prompt. This prevents prompt-padding and context-stuffing attacks. Applied in: health log pipeline and AI chat endpoint.
- **Output length cap** (`backend/main.py` — `run_agent()`): agent responses are truncated at 8,000 characters. A single misbehaving model call cannot produce a response large enough to exhaust memory or downstream processing budget.
- **Agent output validation gate** (`backend/main.py` — `parse_json_response()`): agent JSON is never trusted directly. All responses pass through a parse gate that strips markdown fences and returns `{}` on any JSON decode failure rather than raising. Misbehaving agents cannot crash the pipeline.
- **Rate limiting on all AI endpoints** (slowapi):
  - Health log pipeline: 20 requests/minute
  - Vet summaries: 10 requests/hour
  - AI chat: 30 requests/hour
  - Medication interaction checker: 20 requests/hour

---

## Pillar 5 — Identity & Access Management (IAM)

**Threat:** Confused Deputy problem — agents acting on behalf of unauthenticated users; privilege escalation to admin operations.

**PawLog implementation:**

- **JWT verification before every agent-triggering endpoint** (`backend/main.py` — `get_user_from_token()`): every route that runs an agent validates the Supabase Bearer token. No valid token → no agent run → 401. The agent pipeline always has a verified `user.id` before it begins.
- **Zero Ambient Authority for agents**: agents receive the minimum context needed — a `pet_id` and sanitized text. They never receive the user's JWT, email address, or any credential. The MCP server operates with its own service key, not with the user's session token.
- **Admin-gated privileged operations**: the vet verification endpoint (`POST /api/admin/verify-vet`) requires an `X-Admin-Secret` header checked against a server-side environment variable. A valid user JWT alone does not grant admin capabilities. (`backend/main.py` — `verify_vet()`)

---

## Pillar 6 — Observability & SecOps

**Threat:** No audit trail of agent actions; inability to detect intent drift, cost anomalies, or injection attempts.

**PawLog implementation:**

- **Structured agent lifecycle logging** (`backend/main.py` — `run_agent()`): every agent invocation emits:
  - `[AGENT:START]` — agent name at invocation
  - `[AGENT:DONE]` — agent name, elapsed time in seconds, output character count
  - `[AGENT:TRUNCATE]` — warning when output exceeds the 8,000-char cap
  - `[PARSE]` — warning when agent output fails JSON decode
- This creates a **Vibe Trajectory** log for every request: which agents ran, how long they took, how large their outputs were. Anomalies (runaway latency, oversized outputs, repeated parse failures) are detectable from logs without touching model internals.
- Startup validation logs `[STARTUP] Environment validated` so ops teams can confirm the agent backend started in a known-good state.

---

## Pillar 7 — Governance

**Threat:** No documented security posture; no responsible AI boundary enforcement; audit gaps.

**PawLog implementation:**

- This document (`SECURITY.md`) serves as the security architecture record, mapping each threat to its control.
- **Responsible AI boundary in every agent prompt**: agents are explicitly instructed not to provide diagnoses, not to recommend medications, and to always include a disclaimer that output is informational only.
- **Disclaimer shown to all users** on the auth page and in the README: "PawLog does not provide veterinary advice or diagnosis. All AI-generated content is for informational purposes only."
- Demo accounts are scoped test credentials (`pawlog.e2e@test.local`, `pawlog.vet@test.local`) that can be rotated without affecting real users.

---

## Threat × Control Matrix

| Threat (from whitepaper) | PawLog Control | Where |
|---|---|---|
| Confused Deputy | JWT before every agent + admin secret for privileged ops | `main.py:get_user_from_token()`, `verify_vet()` |
| Prompt injection (client) | Server-side prompts only; client sends only a pet ID + text | `backend/agents/` |
| Prompt injection (in-context) | Injection-resistance guardrails in all 3 agent instructions | `agents/intake_agent.py`, `analysis_agent.py`, `report_agent.py` |
| Context stuffing / padding | Input cap at 2,000 chars before embedding in prompt | `main.py:sanitize_agent_input()` |
| Denial of Wallet (output) | Output truncated at 8,000 chars | `main.py:run_agent()` |
| Denial of Wallet (rate) | slowapi rate limits on all AI endpoints | `main.py:@limiter.limit(...)` |
| Hallucinated / injected IDs | UUID regex validation at MCP tool boundary | `mcp_server/pet_data_server.py:_require_uuid()` |
| Cross-tenant data access | Supabase RLS on all 12 tables | `supabase/schema.sql` |
| MCP server spoofing | MCP runs as local subprocess over stdio, never network-exposed | `main.py:MCP_PARAMS` |
| Unbounded data reads | `get_recent_health_logs` caps at 90 entries | `mcp_server/pet_data_server.py` |
| Missing credential startup | Hard crash if `SUPABASE_*` or `GOOGLE_API_KEY` absent | `main.py:on_startup()` |
| No audit trail | Structured logging: start, done, truncate, parse-fail per agent | `main.py:run_agent()` |
| AI medical liability | Mandatory disclaimer in Report Agent output + UI copy | `agents/report_agent.py`, `src/app/auth/page.tsx` |
