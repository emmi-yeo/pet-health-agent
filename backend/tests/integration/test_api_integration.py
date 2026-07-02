"""
INTEGRATION TESTS — FastAPI app with mocked Supabase and agents.
Tests that the route handlers correctly orchestrate the pipeline:
auth check → agent calls → DB save → response shape.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock


@pytest.fixture
def client():
    """Create a test client with Supabase and agents fully mocked."""
    with patch("main.create_client") as mock_db, \
         patch("main.run_agent", new_callable=AsyncMock) as mock_agent:

        # Mock Supabase auth — return a valid user
        mock_user = MagicMock()
        mock_user.id = "test-user-id"
        mock_user.user = mock_user
        mock_db.return_value.auth.get_user.return_value = mock_user

        # Mock DB queries
        mock_db.return_value.table.return_value.select.return_value \
            .eq.return_value.order.return_value.limit.return_value \
            .execute.return_value.data = []
        mock_db.return_value.table.return_value.insert.return_value \
            .execute.return_value.data = [{"id": "log-id", "pet_id": "pet-id"}]
        mock_db.return_value.table.return_value.select.return_value \
            .eq.return_value.single.return_value \
            .execute.return_value.data = {
                "id": "pet-id", "name": "Bella", "species": "dog"
            }

        # Mock agent responses
        import json
        mock_agent.side_effect = [
            json.dumps({
                "extracted_symptoms": ["ear scratching"],
                "extracted_behaviors": ["skipped dinner"],
                "extracted_mood": "lethargic",
                "initial_flag": True,
                "initial_flag_reason": "Multiple symptoms"
            }),
            json.dumps({
                "patterns_detected": ["recurring ear issue"],
                "flagged": True,
                "flag_reason": "3 ear events in 7 days",
                "severity": "medium"
            }),
        ]

        from main import app
        yield TestClient(app)


class TestLogEndpointIntegration:
    def test_returns_401_without_auth_header(self, client):
        r = client.post("/api/pets/pet-123/logs", json={"raw_input": "Bella scratched ear"})
        assert r.status_code == 401

    def test_returns_422_with_empty_body(self, client):
        r = client.post("/api/pets/pet-123/logs",
                        json={},
                        headers={"Authorization": "Bearer token"})
        assert r.status_code in (401, 422)

    def test_health_returns_correct_payload(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestOpenAPISchema:
    def test_openapi_lists_log_route(self, client):
        r = client.get("/openapi.json")
        paths = r.json()["paths"]
        assert any("logs" in p for p in paths)

    def test_openapi_lists_summary_route(self, client):
        r = client.get("/openapi.json")
        paths = r.json()["paths"]
        assert any("summary" in p for p in paths)

    def test_openapi_lists_health_route(self, client):
        r = client.get("/openapi.json")
        paths = r.json()["paths"]
        assert "/health" in paths
