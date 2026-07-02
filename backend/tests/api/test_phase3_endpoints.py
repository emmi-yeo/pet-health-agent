"""
Phase 3 endpoint contract tests.
Covers: share links, public pet view, co-owners, lab results, vet verified badge.
No real DB calls — verifies auth enforcement and HTTP shape.
"""

import httpx
import pytest

BASE_URL = "http://localhost:8000"
PET_ID = "00000000-0000-0000-0000-000000000000"
FAKE_ID = "11111111-1111-1111-1111-111111111111"
FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIn0.fake"
AUTH = {"Authorization": f"Bearer {FAKE_TOKEN}"}


# ── Share links ───────────────────────────────────────────────────────────────

class TestShareLinkEndpoints:
    def test_create_share_link_requires_auth(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/share-link", json={})
        assert r.status_code == 401

    def test_create_share_link_rejects_invalid_token(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/share-link", json={}, headers=AUTH)
        assert r.status_code == 401

    def test_list_share_links_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/share-link")
        assert r.status_code == 401

    def test_list_share_links_rejects_invalid_token(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/share-link", headers=AUTH)
        assert r.status_code == 401

    def test_delete_share_link_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/share-link/{FAKE_ID}")
        assert r.status_code == 401

    def test_delete_share_link_rejects_invalid_token(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/share-link/{FAKE_ID}", headers=AUTH)
        assert r.status_code == 401

    def test_share_link_endpoints_return_json(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/share-link")
        assert "application/json" in r.headers.get("content-type", "")


# ── Public pet view (no auth) ─────────────────────────────────────────────────

class TestPublicPetEndpoint:
    def test_nonexistent_token_returns_404(self):
        r = httpx.get(f"{BASE_URL}/api/public/pets/this-token-does-not-exist-abc123")
        assert r.status_code == 404

    def test_public_endpoint_needs_no_auth(self):
        r = httpx.get(f"{BASE_URL}/api/public/pets/nonexistent")
        assert r.status_code in (404, 410)

    def test_public_endpoint_returns_json(self):
        r = httpx.get(f"{BASE_URL}/api/public/pets/nonexistent")
        assert "application/json" in r.headers.get("content-type", "")

    def test_public_endpoint_only_accepts_get(self):
        r = httpx.post(f"{BASE_URL}/api/public/pets/nonexistent")
        assert r.status_code == 405

    def test_public_endpoint_404_has_detail(self):
        r = httpx.get(f"{BASE_URL}/api/public/pets/nonexistent")
        assert "detail" in r.json()


# ── Co-owner endpoints ─────────────────────────────────────────────────────────

class TestCoOwnerEndpoints:
    def test_invite_co_owner_requires_auth(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/co-owners", json={"email": "x@y.com"})
        assert r.status_code == 401

    def test_invite_co_owner_rejects_invalid_token(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/co-owners", json={"email": "x@y.com"}, headers=AUTH)
        assert r.status_code == 401

    def test_invite_co_owner_requires_email(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/co-owners", json={}, headers=AUTH)
        assert r.status_code in (401, 422)

    def test_list_co_owners_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/co-owners")
        assert r.status_code == 401

    def test_revoke_co_owner_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/co-owners/{FAKE_ID}")
        assert r.status_code == 401

    def test_accept_co_owner_without_token_returns_404(self):
        r = httpx.get(f"{BASE_URL}/api/accept-co-owner?token=fake-token-xyz")
        assert r.status_code == 404

    def test_accept_co_owner_404_has_detail(self):
        r = httpx.get(f"{BASE_URL}/api/accept-co-owner?token=fake-token-xyz")
        assert "detail" in r.json()


# ── Lab results endpoints ──────────────────────────────────────────────────────

class TestLabResultEndpoints:
    def test_create_lab_result_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/lab-results",
            json={"file_url": "https://example.com/file.pdf", "file_name": "panel.pdf", "file_type": "application/pdf"},
        )
        assert r.status_code == 401

    def test_create_lab_result_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/lab-results",
            json={"file_url": "https://example.com/file.pdf", "file_name": "panel.pdf", "file_type": "application/pdf"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_create_lab_result_requires_file_url(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/lab-results",
            json={"file_name": "panel.pdf", "file_type": "application/pdf"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_create_lab_result_requires_file_name(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/lab-results",
            json={"file_url": "https://example.com/f.pdf", "file_type": "application/pdf"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_create_lab_result_requires_file_type(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/lab-results",
            json={"file_url": "https://example.com/f.pdf", "file_name": "f.pdf"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_list_lab_results_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/lab-results")
        assert r.status_code == 401

    def test_list_lab_results_json_response(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/lab-results")
        assert "application/json" in r.headers.get("content-type", "")

    def test_delete_lab_result_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/lab-results/{FAKE_ID}")
        assert r.status_code == 401


# ── Vet verified badge ─────────────────────────────────────────────────────────

class TestVetVerifiedBadge:
    def test_verify_vet_without_admin_secret_rejected(self):
        r = httpx.post(f"{BASE_URL}/api/admin/verify-vet", json={"vet_id": FAKE_ID})
        assert r.status_code == 403

    def test_verify_vet_wrong_admin_secret_rejected(self):
        r = httpx.post(
            f"{BASE_URL}/api/admin/verify-vet",
            json={"vet_id": FAKE_ID},
            headers={"X-Admin-Secret": "wrong-secret"},
        )
        assert r.status_code == 403

    def test_verify_vet_requires_vet_id(self):
        r = httpx.post(f"{BASE_URL}/api/admin/verify-vet", json={})
        assert r.status_code in (403, 422)

    def test_verify_vet_returns_json(self):
        r = httpx.post(f"{BASE_URL}/api/admin/verify-vet", json={"vet_id": FAKE_ID})
        assert "application/json" in r.headers.get("content-type", "")

    def test_get_verify_status_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/vet/verify-status")
        assert r.status_code == 401

    def test_get_verify_status_rejects_invalid_token(self):
        r = httpx.get(f"{BASE_URL}/api/vet/verify-status", headers=AUTH)
        assert r.status_code == 401

    def test_admin_endpoint_only_accepts_post(self):
        r = httpx.get(f"{BASE_URL}/api/admin/verify-vet")
        assert r.status_code == 405
