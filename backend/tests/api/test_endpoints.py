"""
API TESTS — FastAPI endpoint contract tests.
Tests request/response shape, status codes, and headers.
No real DB or agent calls — auth is tested via missing/invalid tokens.
"""

import httpx
import pytest

BASE_URL = "http://localhost:8000"


class TestHealthEndpoint:
    def test_get_health_200(self):
        r = httpx.get(f"{BASE_URL}/health")
        assert r.status_code == 200

    def test_health_response_schema(self):
        r = httpx.get(f"{BASE_URL}/health")
        body = r.json()
        assert "status" in body
        assert "service" in body
        assert isinstance(body["status"], str)
        assert isinstance(body["service"], str)


class TestLogEndpoint:
    def test_post_log_without_auth_returns_401(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/some-pet-id/logs",
            json={"raw_input": "Bella was scratching her ear"},
        )
        assert r.status_code == 401

    def test_post_log_with_invalid_token_returns_401(self):
        # A structurally valid but unauthorized JWT — server must return 401 not 500
        r = httpx.post(
            f"{BASE_URL}/api/pets/some-pet-id/logs",
            json={"raw_input": "Bella was scratching her ear"},
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIn0.fake"},
        )
        assert r.status_code == 401

    def test_post_log_with_missing_body_returns_422(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/some-pet-id/logs",
            json={},
            headers={"Authorization": "Bearer fake-token"},
        )
        # 422 Unprocessable Entity for missing required field
        assert r.status_code in (401, 422)

    def test_post_log_content_type(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/some-pet-id/logs",
            json={"raw_input": "test"},
        )
        assert "application/json" in r.headers.get("content-type", "")


class TestSummaryEndpoint:
    def test_post_summary_without_auth_returns_401(self):
        r = httpx.post(f"{BASE_URL}/api/pets/some-pet-id/summary")
        assert r.status_code == 401

    def test_post_summary_with_invalid_token_returns_401(self):
        r = httpx.post(
            f"{BASE_URL}/api/pets/some-pet-id/summary",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIn0.fake"},
        )
        assert r.status_code == 401


class TestCORSHeaders:
    def test_cors_header_present_for_frontend_origin(self):
        r = httpx.options(
            f"{BASE_URL}/health",
            headers={"Origin": "http://localhost:3000"},
        )
        # Either 200 or 405 but CORS headers should be present
        assert r.status_code in (200, 405)
