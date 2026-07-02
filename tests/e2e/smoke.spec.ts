/**
 * SMOKE TESTS — Critical path checks
 * Quick sanity tests that verify the app starts and key
 * routes are reachable. These run first in CI.
 */

import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("landing page returns 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("auth page returns 200", async ({ page }) => {
    const response = await page.goto("/auth");
    expect(response?.status()).toBe(200);
  });

  test("unauthenticated /dashboard redirects to /auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unauthenticated /pets/new redirects to /auth", async ({ page }) => {
    await page.goto("/pets/new");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("landing page has no broken main layout", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("auth page has a form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("form")).toBeVisible();
  });

  test("backend health endpoint is reachable", async ({ request }) => {
    const response = await request.get("http://localhost:8000/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
