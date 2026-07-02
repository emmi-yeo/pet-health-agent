# PawLog — Feature Registry

Two user roles: **Pet Owner** (tracks daily health) and **Veterinarian** (reviews patient records, adds clinical notes).

---

## ✅ Built

### Auth
- Email + password sign up / sign in
- Google OAuth
- Role selection at signup (Pet Owner vs Veterinarian) with descriptions
- Vet clinic name field on signup
- Role-aware routing (vets → `/vet/dashboard`, owners → `/dashboard`)
- Password reset (forgot password page + update password page)
- Account settings page (update name, clinic, sign out)
- Delete account with full data wipe (UI + backend)
- `profiles` table with `role`, `full_name`, `clinic_name`
- JWT verification on all backend API calls

### Pet Owner — Core
- Add a pet (name, species, breed, age, **birthday**, weight, color, microchip)
- **Pet photo upload** (Supabase Storage, avatar shown on profile + vet page)
- Birthday stored as date — age auto-calculated and displayed
- Edit pet profile
- Dashboard showing all pets with flag badges + "Add pet" card
- **Onboarding checklist** for new users (3-step wizard, dismissible)
- Pet profile with tabs: Health Logs, Medications, **Appointments**, **Vaccinations**, **Vet Visits**, Vet Notes, AI Summaries
- Log a health observation (plain text → AI pipeline) + **optional weight field**
- **Weight trend chart** (recharts area chart — appears when ≥2 weight data points)
- **Sort/export**: Export all logs as CSV (auth-gated download button)
- Delete health log
- Generate vet visit summary (AI report agent)
- Share pet with vet (invite by email)
- **Revoke vet access** (share page → Revoke button)
- View clinical notes left by vets
- **QR code per pet** — scan at clinic, generates PNG download
- **"Ask the AI" chat** — `/pets/[id]/chat` page, conversational AI about pet history

### Appointments & Scheduling
- **Schedule upcoming appointment** (date/time, notes)
- **Log past vet visit** (date, vet name, clinic, reason, outcome notes)
- **Vaccination log** — record vaccines given, next due date, lot number
- Owner and vet both see upcoming appointments
- Overdue vaccination alerts (red badge)
- Vaccination due-soon alerts (amber badge, within 14 days)
- `appointments` table (id, pet_id, vet_id, owner_id, scheduled_at, notes, status)
- `vaccinations` table (id, pet_id, vet_id, vaccine_name, administered_date, next_due_date, lot_number)
- `vet_visits` table (id, pet_id, user_id, visit_date, vet_name, clinic_name, reason, notes)

### AI Pipeline (3 ADK agents, Gemini 2.5 Flash)
- **Intake agent** — extracts symptoms, behaviors, mood, initial flag from raw text
- **Analysis agent** — detects patterns across **90-day history** (not just recent), sets severity + flag reason
- **Report agent** — generates structured vet summary with key concerns + questions
- **Vet summary includes previous vet clinical notes + 90-day log window**
- **Breed-specific health risk** mentions in summaries
- **"Ask the AI" chat** — conversational AI about full pet history (owner + vet can use)
- **Medication interaction checker** (AI-powered, shows severity + drug pairs)

### MCP Server
- Tools: `get_pet_profile`, `get_recent_health_logs`, `get_active_medications`,
  `save_health_log`, `save_vet_summary`, `get_flagged_logs`

### Vet Dashboard
- All linked patients in one view with stats bar (patients, flagged, pending review)
- Owner's name displayed on each patient card
- Flagged log count per patient
- Last log date per patient

### Vet Clinical Notes
- Vet adds clinical notes — general or tied to a specific log entry
- Note types: observation, diagnosis, treatment, follow-up
- `vet_notes` table (id, pet_id, vet_id, log_id nullable, content, note_type)
- Owner sees vet notes on their pet's profile (Vet Notes tab)
- Vet patient page shows owner's name + birthday + full health timeline

### Vet Patient Page (enhanced)
- **Vaccination records** with add/view/delete
- **Upcoming appointments** for the patient
- **Prescribe medication** from patient profile (adds to owner's pet record)
- **General clinical notes + per-log notes**

### Medications
- Add / edit / delete medications (name, dose, frequency, start/end date)
- Active medications tracked with expiry logic
- Medications shown on pet profile and vet patient view
- **Medication interaction checker** (AI-powered, on medications page when ≥2 active meds)

### Sharing
- Owner invites vet by email from pet profile
- `pet_shares` table (pet_id, vet_id, owner_id, status, invite_token)
- Vet receives invite email (when RESEND_API_KEY set)
- Vet accepts invite at `/vet/accept-invite?token=...`
- Owner can revoke vet access
- Email summary endpoint (`POST /api/pets/:id/summary/email`)

### Backend (FastAPI)
- `POST /api/pets/{id}/logs` — AI intake + analysis + save log (with optional weight_kg)
- `POST /api/pets/{id}/summary` — AI report agent + save summary (90-day context + vet notes)
- `POST /api/pets/{id}/share` — create pet share invite
- `GET  /api/vet/accept-invite` — accept invite token (notifies owner)
- `POST /api/vet/notes` — create vet clinical note
- `POST /api/pets/{id}/summary/email` — email summary to vet
- `GET  /api/pets/{id}/appointments` — list appointments
- `POST /api/pets/{id}/appointments` — create appointment
- `DELETE /api/pets/{id}/appointments/{id}` — delete appointment
- `GET  /api/pets/{id}/visits` — list vet visits
- `POST /api/pets/{id}/visits` — log past vet visit
- `DELETE /api/pets/{id}/visits/{id}` — delete vet visit
- `GET  /api/pets/{id}/vaccinations` — list vaccinations
- `POST /api/pets/{id}/vaccinations` — add vaccination
- `DELETE /api/pets/{id}/vaccinations/{id}` — delete vaccination
- `POST /api/pets/{id}/chat` — AI chat about pet history
- `GET  /api/pets/{id}/export` — export logs as CSV
- `GET  /api/pets/{id}/medications/interactions` — AI medication interaction check
- `POST /api/vet/prescribe` — vet prescribes medication to patient
- `DELETE /api/account` — delete authenticated user account
- `GET  /api/jobs/{job_id}` — poll async job status
- `GET  /health` — health check
- **Rate limiting** (slowapi): 20/min on logs, 10/hr on summaries, 30/hr on chat, 20/hr on interactions
- Scheduled jobs: daily reminders 20:00 UTC, weekly owner digest Sun 08:00, **vet weekly digest Mon 08:00**, medication refill 09:00, **vaccination reminder 09:30**, appointment reminders every 10min

### Email Notifications (Resend — skipped if no API key)
- Vet invite email when owner shares pet
- High-severity alert email to owner
- Vet note notification to owner
- **Vet first-access notification** — owner notified when vet first opens their pet's profile
- Daily log reminder at 8pm UTC (if no log today)
- Weekly owner digest (Sundays) — log count + flagged count
- **Vet weekly digest** (Mondays) — flagged patients per vet
- Medication refill alert (3 days before end date)
- **Vaccination due reminder** (2 weeks before next due date)
- Appointment reminder 24h before (owner)
- Appointment reminder 1h before (vet)

### Export & Sharing
- **Export all logs as CSV** — auth-gated download, includes weight, symptoms, behaviors, severity
- **QR code per pet** — `/pets/[id]/qr`, downloadable PNG, emerald branded

### Pet Photo Upload
- Supabase Storage (`pet-photos` bucket, public, 5MB limit)
- Upload on edit pet page — JPG/PNG/WebP
- Photo shown as avatar on pet profile header and vet patient page

### UI / UX
- Gradient backgrounds throughout all pages
- Improved nav with gradient logo, active state indicators, vet role badge
- Better card design with shadows, gradient accents, hover states
- Stats bars on dashboards
- Better empty states with illustrated icons
- Improved tab design with active emerald fill (7 tabs on pet profile)
- Birthday display with age auto-calculation
- Mobile responsive layout + hamburger menu
- Custom 404 page
- Error boundary page
- Loading skeletons (dashboard)
- Toast-style inline messages
- **"Ask AI" button** on pet profile header → chat page

### Database (Supabase + RLS)
- `pets` — pet profiles with birthday, photo_url columns
- `health_logs` — logs with extracted symptoms, flagged, severity, **weight_kg**
- `medications` — active medications with CRUD
- `vet_visits` — visit records (owner + vet viewable)
- `vaccinations` — vaccination records with next due date (RLS: owner + vet)
- `appointments` — scheduled appointments (RLS: owner + vet)
- `vet_summaries` — AI-generated summaries
- `vet_notes` — clinical notes (FK to `profiles` for join support)
- `pet_shares` — sharing records (FKs to `profiles` for join support)
- `profiles` — user profiles with role

### Tests
- 30 Jest unit + integration tests
- 83 pytest API + security + integration tests (39 new contract tests for Phase 2 endpoints)
- 1 Playwright full owner journey (sign in → add pet → log → AI → summary → sign out)
- 14 Playwright new-features tests (roles, password reset, account, medications, nav, 404)
- 1 Playwright full vet journey (share → accept → view patient → clinical note → owner sees note)
- 46 Playwright Phase 2 E2E tests (appointments, vaccinations, visits, QR code, AI chat, CSV export, photo upload, weight field, interaction checker, API auth)

---

### Dark Mode
- Theme toggle (Moon/Sun icon) in nav bar and mobile menu
- Persists preference in localStorage; respects system `prefers-color-scheme` on first visit
- Shadcn CSS variables handle all component colors automatically via `.dark` class on `<html>`
- `ThemeProvider` + `DarkModeToggle` client components; `suppressHydrationWarning` on `<html>`

### Print-friendly vet report
- Print / Save PDF button on the summary page (appears after generating a summary)
- `@media print` styles: hides nav, buttons, back links; forces white background
- Print-only header with PawLog logo, generation date, pet name
- Print-only footer with disclaimer
- `data-print-hide` / `data-print-include` / `data-printable` attribute system

### Shareable read-only link
- Create unlimited token-based share links per pet (no expiry, or set expiry in days)
- `ShareLinkManager` component on the share page — create, copy URL, delete links
- `/p/[token]` public page: shows pet info, photo, active meds, vaccinations, recent logs
- Overdue vaccination alerts shown on public page
- No login required for public page; "Read-only" badge in header
- `share_links` table with RLS: owners manage, public read by token
- Backend: `POST/GET/DELETE /api/pets/{id}/share-link`, `GET /api/public/pets/{token}`

### Co-owner access
- Invite a partner/family member by email as co-owner of a pet
- Co-owner invite email with accept link
- `CoOwnerForm` component on share page — invite, view status, revoke access
- `pet_co_owners` table with RLS; statuses: pending / accepted / revoked
- Backend: `POST/GET /api/pets/{id}/co-owners`, `DELETE /api/pets/{id}/co-owners/{id}`, `GET /api/accept-co-owner?token=...`

### Lab results & X-rays
- Upload PDFs, JPEG, PNG, WebP, TIFF, DICOM files to Supabase Storage (`lab-results` bucket)
- Max 20 MB per file
- `LabResultUpload` component — upload form, file list, open externally, delete
- Optional test date + notes per file
- New **Labs** tab on pet profile (8th tab, count shown in tab label)
- `lab_results` table with RLS: owner + shared vets can read, owner manages
- Backend: `POST/GET/DELETE /api/pets/{id}/lab-results`

### Vet verified badge
- Admin-only `POST /api/admin/verify-vet` endpoint (requires `X-Admin-Secret` header matching `ADMIN_SECRET` env var)
- `profiles.verified` boolean column — default false
- Green shield checkmark shown next to vet name on vet notes (pet profile Vet Notes tab)
- "Verified" badge shown on vet dashboard welcome header
- `GET /api/vet/verify-status` for vets to check their own status
- Can be revoked: `{"vet_id": "...", "verified": false}`

### Tests
- 30 Jest unit + integration tests
- 117 pytest API + security + integration tests (34 new Phase 3 contract tests)
- 1 Playwright full owner journey (sign in → add pet → log → AI → summary → sign out)
- 14 Playwright new-features tests (roles, password reset, account, medications, nav, 404)
- 1 Playwright full vet journey (share → accept → view patient → clinical note → owner sees note)
- 46 Playwright Phase 2 E2E tests (appointments, vaccinations, visits, QR code, AI chat, CSV export, photo upload, weight field, interaction checker, API auth)
- 47 Playwright Phase 3 E2E tests (dark mode, print button, share links, co-owner, lab results, vet badge, regression)

---

## 🔲 Planned / Deferred

### Technical
- [ ] Deploy frontend → Vercel
- [ ] Deploy backend → Render
- [ ] Real-time updates via Supabase Realtime
- [ ] API versioning (`/api/v1/`)
- [ ] GDPR: full data export (partial — delete account already works)
