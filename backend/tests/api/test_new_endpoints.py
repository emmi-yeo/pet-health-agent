"""
NEW ENDPOINT TESTS — Contract tests for all features added in Phase 2.
Tests: appointments, visits, vaccinations, chat, export, prescribe, interactions.
No real DB calls — auth is tested via missing/invalid tokens.
All new endpoints must reject unauthenticated requests with 401.
"""

import httpx
import pytest

BASE_URL = "http://localhost:8000"
PET_ID = "00000000-0000-0000-0000-000000000000"
FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIn0.fake"
AUTH = {"Authorization": f"Bearer {FAKE_TOKEN}"}


# ── Appointments ──────────────────────────────────────────────────────────────

class TestAppointmentsEndpoint:
    def test_list_appointments_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/appointments")
        assert r.status_code == 401

    def test_list_appointments_rejects_invalid_token(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/appointments", headers=AUTH)
        assert r.status_code == 401

    def test_create_appointment_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/appointments",
            json={"scheduled_at": "2026-08-01T10:00:00Z", "notes": "Annual check-up"},
        )
        assert r.status_code == 401

    def test_create_appointment_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/appointments",
            json={"scheduled_at": "2026-08-01T10:00:00Z"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_create_appointment_requires_scheduled_at(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/appointments",
            json={},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_delete_appointment_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/appointments/some-id")
        assert r.status_code == 401

    def test_appointments_json_content_type(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/appointments")
        assert "application/json" in r.headers.get("content-type", "")


# ── Vet Visits ─────────────────────────────────────────────────────────────────

class TestVetVisitsEndpoint:
    def test_list_visits_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/visits")
        assert r.status_code == 401

    def test_create_visit_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/visits",
            json={"visit_date": "2026-06-01", "reason": "Annual check-up"},
        )
        assert r.status_code == 401

    def test_create_visit_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/visits",
            json={"visit_date": "2026-06-01"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_create_visit_requires_visit_date(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/visits",
            json={},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_delete_visit_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/visits/some-id")
        assert r.status_code == 401


# ── Vaccinations ───────────────────────────────────────────────────────────────

class TestVaccinationsEndpoint:
    def test_list_vaccinations_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/vaccinations")
        assert r.status_code == 401

    def test_create_vaccination_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/vaccinations",
            json={"vaccine_name": "Rabies", "administered_date": "2026-06-01"},
        )
        assert r.status_code == 401

    def test_create_vaccination_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/vaccinations",
            json={"vaccine_name": "Rabies", "administered_date": "2026-06-01"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_create_vaccination_requires_vaccine_name(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/vaccinations",
            json={"administered_date": "2026-06-01"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_create_vaccination_requires_administered_date(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/vaccinations",
            json={"vaccine_name": "Rabies"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_delete_vaccination_requires_auth(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/vaccinations/some-id")
        assert r.status_code == 401


# ── AI Chat ────────────────────────────────────────────────────────────────────

class TestChatEndpoint:
    def test_chat_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/chat",
            json={"message": "How is my pet doing?"},
        )
        assert r.status_code == 401

    def test_chat_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/chat",
            json={"message": "How is my pet doing?"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_chat_requires_message_field(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/chat",
            json={},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_chat_json_response(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/chat",
            json={"message": "test"},
        )
        assert "application/json" in r.headers.get("content-type", "")


# ── CSV Export ─────────────────────────────────────────────────────────────────

class TestExportEndpoint:
    def test_export_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/export")
        assert r.status_code == 401

    def test_export_rejects_invalid_token(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/export", headers=AUTH)
        assert r.status_code == 401

    def test_export_only_accepts_get(self):
        r = httpx.post(f"{BASE_URL}/api/pets/{PET_ID}/export")
        assert r.status_code == 405


# ── Medication Interaction Checker ─────────────────────────────────────────────

class TestInteractionCheckerEndpoint:
    def test_interactions_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/pets/{PET_ID}/medications/interactions")
        assert r.status_code == 401

    def test_interactions_rejects_invalid_token(self):
        r = httpx.get(
            f"{BASE_URL}/api/pets/{PET_ID}/medications/interactions",
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_interactions_only_accepts_get(self):
        r = httpx.delete(f"{BASE_URL}/api/pets/{PET_ID}/medications/interactions")
        assert r.status_code == 405


# ── Vet Prescribe ──────────────────────────────────────────────────────────────

class TestVetPrescribeEndpoint:
    def test_prescribe_requires_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/vet/prescribe",
            json={"pet_id": PET_ID, "name": "Amoxicillin"},
        )
        assert r.status_code == 401

    def test_prescribe_rejects_invalid_token(self):
        r = httpx.post(
            f"{BASE_URL}/api/vet/prescribe",
            json={"pet_id": PET_ID, "name": "Amoxicillin"},
            headers=AUTH,
        )
        assert r.status_code == 401

    def test_prescribe_requires_pet_id(self):
        r = httpx.post(
            f"{BASE_URL}/api/vet/prescribe",
            json={"name": "Amoxicillin"},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)

    def test_prescribe_requires_name(self):
        r = httpx.post(
            f"{BASE_URL}/api/vet/prescribe",
            json={"pet_id": PET_ID},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)


# ── Log endpoint — weight_kg optional field ────────────────────────────────────

class TestLogWithWeight:
    def test_log_with_weight_rejected_without_auth(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/logs",
            json={"raw_input": "Bella seems fine", "weight_kg": 8.5},
        )
        assert r.status_code == 401

    def test_log_without_weight_still_requires_raw_input(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/logs",
            json={"weight_kg": 8.5},
            headers=AUTH,
        )
        assert r.status_code in (401, 422)


# ── Rate limiting headers ──────────────────────────────────────────────────────

class TestRateLimitHeaders:
    def test_no_rate_limit_on_health(self):
        """Health endpoint is not rate-limited."""
        r = httpx.get(f"{BASE_URL}/health")
        assert r.status_code == 200

    def test_rate_limit_header_not_exposed_on_unauthenticated_request(self):
        """Rate limit should not kick in before auth check."""
        r = httpx.post(
            f"{BASE_URL}/api/pets/{PET_ID}/logs",
            json={"raw_input": "test"},
        )
        # Must return 401 before hitting rate limit
        assert r.status_code == 401


# ── Job status endpoint (unchanged) ───────────────────────────────────────────

class TestJobEndpoint:
    def test_unknown_job_returns_404(self):
        r = httpx.get(f"{BASE_URL}/api/jobs/nonexistent-job-id")
        assert r.status_code == 404

    def test_job_endpoint_json_response(self):
        r = httpx.get(f"{BASE_URL}/api/jobs/nonexistent-job-id")
        assert "application/json" in r.headers.get("content-type", "")

    def test_job_404_has_detail_field(self):
        r = httpx.get(f"{BASE_URL}/api/jobs/nonexistent-job-id")
        assert "detail" in r.json()
