"""
SMOKE TESTS — Basic health checks against the running backend.
These verify the server is up and responding before any other tests run.
"""

import httpx
import pytest

BASE_URL = "http://localhost:8000"


class TestSmoke:
    def test_health_endpoint_returns_200(self):
        r = httpx.get(f"{BASE_URL}/health")
        assert r.status_code == 200

    def test_health_endpoint_returns_ok_status(self):
        r = httpx.get(f"{BASE_URL}/health")
        body = r.json()
        assert body["status"] == "ok"

    def test_health_endpoint_identifies_service(self):
        r = httpx.get(f"{BASE_URL}/health")
        body = r.json()
        assert body["service"] == "pawlog-api"

    def test_openapi_docs_accessible(self):
        r = httpx.get(f"{BASE_URL}/docs")
        assert r.status_code == 200

    def test_openapi_json_accessible(self):
        r = httpx.get(f"{BASE_URL}/openapi.json")
        assert r.status_code == 200
        body = r.json()
        assert "paths" in body
        assert "info" in body

    def test_server_returns_json_content_type(self):
        r = httpx.get(f"{BASE_URL}/health")
        assert "application/json" in r.headers.get("content-type", "")
