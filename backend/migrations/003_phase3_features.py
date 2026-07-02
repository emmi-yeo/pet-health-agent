"""
Migration 003 — Phase 3 features:
  - share_links table (read-only public pet links)
  - pet_co_owners table (partner/family co-owner access)
  - lab_results table (PDF/image uploads)
  - profiles.verified column (vet verified badge)
  - Supabase Storage bucket: lab-results
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
if not DB_URL:
    print("ERROR: Set DATABASE_URL or SUPABASE_DB_URL in .env")
    sys.exit(1)


DDL = """
-- ── share_links ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.share_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id      UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    label       TEXT,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their share links" ON public.share_links;
CREATE POLICY "Owners manage their share links"
    ON public.share_links
    FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Public read — no auth needed (token is the secret)
DROP POLICY IF EXISTS "Public read by token" ON public.share_links;
CREATE POLICY "Public read by token"
    ON public.share_links
    FOR SELECT
    USING (true);

-- ── pet_co_owners ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_co_owners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_email   TEXT NOT NULL,
    invite_token    TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_co_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pet owners manage co-owners" ON public.pet_co_owners;
CREATE POLICY "Pet owners manage co-owners"
    ON public.pet_co_owners
    FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- ── lab_results ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id      UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    notes       TEXT,
    test_date   DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read their lab results" ON public.lab_results;
CREATE POLICY "Owners read their lab results"
    ON public.lab_results
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR pet_id IN (
            SELECT pet_id FROM public.pet_shares
            WHERE vet_id = auth.uid() AND status = 'accepted'
        )
    );

DROP POLICY IF EXISTS "Owners insert lab results" ON public.lab_results;
CREATE POLICY "Owners insert lab results"
    ON public.lab_results
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners delete their lab results" ON public.lab_results;
CREATE POLICY "Owners delete their lab results"
    ON public.lab_results
    FOR DELETE
    USING (user_id = auth.uid());

-- ── profiles.verified (vet badge) ─────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
"""


def run():
    conn = psycopg2.connect(DB_URL, sslmode="require")
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(DDL)
        print("✅ Migration 003 applied successfully.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run()
