"""
LOAD TESTS — Locust performance test suite.
Tests how the API behaves under concurrent load.

Run with:
  locust -f tests/load/locustfile.py --host=http://localhost:8000
  --headless -u 20 -r 5 --run-time 30s

Or for a quick automated run:
  locust -f tests/load/locustfile.py --host=http://localhost:8000
  --headless -u 10 -r 2 --run-time 15s --html tests/load/report.html
"""

from locust import HttpUser, task, between, constant
from locust import events


class PublicAPIUser(HttpUser):
    """Simulates a user hitting public/unauthenticated endpoints."""
    wait_time = between(0.5, 2)

    @task(5)
    def health_check(self):
        """Most frequent — health endpoint should handle high load."""
        with self.client.get("/health", catch_response=True) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Health check failed: {r.status_code}")

    @task(2)
    def openapi_docs(self):
        """Docs endpoint — lower priority."""
        with self.client.get("/openapi.json", catch_response=True) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"OpenAPI failed: {r.status_code}")


class AuthAttemptUser(HttpUser):
    """Simulates unauthenticated requests to protected endpoints."""
    wait_time = constant(1)

    @task
    def attempt_log_without_auth(self):
        """Protected endpoint — should return 401 quickly under load."""
        with self.client.post(
            "/api/pets/test-pet-id/logs",
            json={"raw_input": "test observation"},
            catch_response=True,
        ) as r:
            if r.status_code == 401:
                r.success()  # Expected response
            else:
                r.failure(f"Expected 401, got {r.status_code}")

    @task
    def attempt_summary_without_auth(self):
        """Summary endpoint — should return 401 quickly under load."""
        with self.client.post(
            "/api/pets/test-pet-id/summary",
            catch_response=True,
        ) as r:
            if r.status_code == 401:
                r.success()
            else:
                r.failure(f"Expected 401, got {r.status_code}")
