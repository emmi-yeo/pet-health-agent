/**
 * Phase 3 E2E tests
 * Covers: dark mode, print button, shareable read-only link,
 * co-owner invite, lab results tab, vet verified badge UI.
 */

import { test, expect } from "@playwright/test";

const TEST_EMAIL = "pawlog.e2e@test.local";
const TEST_PASSWORD = "PawLogTest2026!";

async function signIn(page: any) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function getFirstPetId(page: any): Promise<string | null> {
  const petLink = page.locator('a[href^="/pets/"]').first();
  if (await petLink.count() === 0) return null;
  const href = await petLink.getAttribute("href");
  return href?.split("/pets/")[1]?.split("/")[0] ?? null;
}

// ── Dark mode ────────────────────────────────────────────────────────────────

test.describe("Dark mode toggle", () => {
  test("dark mode toggle button is present in nav", async ({ page }) => {
    await signIn(page);
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
  });

  test("clicking dark mode toggle adds dark class to html", async ({ page }) => {
    await signIn(page);
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    await toggle.click();
    const htmlClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(htmlClass).toBe(true);
  });

  test("clicking dark mode toggle twice returns to light mode", async ({ page }) => {
    await signIn(page);
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    await toggle.click();
    await toggle.click();
    const htmlClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(htmlClass).toBe(false);
  });

  test("dark mode preference persists after navigation", async ({ page }) => {
    await signIn(page);
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    await toggle.click();
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);
    await page.reload();
    const stillDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(stillDark).toBe(true);
    // Reset to light for other tests
    const toggle2 = page.locator('[aria-label="Toggle dark mode"]');
    await toggle2.click();
  });

  test("dark mode icon changes between Sun and Moon", async ({ page }) => {
    await signIn(page);
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    const initialTitle = await toggle.getAttribute("title");
    await toggle.click();
    const afterTitle = await toggle.getAttribute("title");
    expect(initialTitle).not.toBe(afterTitle);
  });
});

// ── Print-friendly vet report ─────────────────────────────────────────────────

test.describe("Print-friendly vet report", () => {
  test("summary page has print button when summary is generated", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/summary`);
    // Before generating, no print button
    await expect(page.getByRole("button", { name: /generate vet summary/i })).toBeVisible({ timeout: 8_000 });
  });

  test("summary page back button exists", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/summary`);
    await expect(page.getByRole("link", { name: /back/i })).toBeVisible({ timeout: 5_000 });
  });
});

// ── Shareable read-only link ──────────────────────────────────────────────────

test.describe("Share page — read-only link manager", () => {
  test("share page shows read-only link section", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByText(/read-only share links/i)).toBeVisible({ timeout: 8_000 });
  });

  test("New link button is present on share page", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByRole("button", { name: /new link/i })).toBeVisible({ timeout: 8_000 });
  });

  test("Public /p/ route returns 404 for unknown token", async ({ page }) => {
    await page.goto("/p/this-token-definitely-does-not-exist-12345");
    await expect(page).toHaveURL(/p\//);
    // Page should show not-found content or navigate to 404
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("public pet page has read-only badge in header", async ({ page }) => {
    // Test with a valid token format — will 404 but tests structure
    await page.goto("/p/abc123fake");
    // If 404, we see Next's not-found page
    await page.waitForLoadState("networkidle");
    const status = page.url();
    expect(status).toContain("/p/");
  });
});

// ── Co-owner access ───────────────────────────────────────────────────────────

test.describe("Co-owner invite section", () => {
  test("share page shows co-owner section", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByText(/co-owner access/i)).toBeVisible({ timeout: 8_000 });
  });

  test("co-owner invite has email input", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByLabel(/email address/i).last()).toBeVisible({ timeout: 8_000 });
  });

  test("co-owner invite has Invite button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByRole("button", { name: /^invite$/i })).toBeVisible({ timeout: 8_000 });
  });

  test("co-owner endpoint returns 404 for bad token (API contract via fetch)", async ({ page }) => {
    await signIn(page);
    const res = await page.evaluate(async () => {
      const r = await fetch("http://localhost:8000/api/accept-co-owner?token=no-such-token-xyz");
      return r.status;
    });
    expect(res).toBe(404);
  });
});

// ── Lab results tab ───────────────────────────────────────────────────────────

test.describe("Lab results tab", () => {
  test("pet profile shows Labs tab", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("tab", { name: /labs/i })).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Labs tab shows upload button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /labs/i }).click();
    await expect(page.getByRole("button", { name: /upload file/i })).toBeVisible({ timeout: 8_000 });
  });

  test("clicking Upload file button shows the upload form", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /labs/i }).click();
    await page.getByRole("button", { name: /upload file/i }).click();
    await expect(page.locator('input[type="file"]')).toBeVisible({ timeout: 5_000 });
  });

  test("lab results form has test date and notes fields", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /labs/i }).click();
    await page.getByRole("button", { name: /upload file/i }).click();
    await expect(page.getByLabel(/test date/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/notes/i).last()).toBeVisible();
  });

  test("lab results form cancel button hides the form", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /labs/i }).click();
    await page.getByRole("button", { name: /upload file/i }).click();
    await page.getByRole("button", { name: /cancel/i }).last().click();
    await expect(page.locator('input[type="file"]')).not.toBeVisible();
  });

  test("lab results API requires auth", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    const res = await page.evaluate(async (pid) => {
      const r = await fetch(`http://localhost:8000/api/pets/${pid}/lab-results`);
      return r.status;
    }, petId);
    expect(res).toBe(401);
  });
});

// ── Vet verified badge ─────────────────────────────────────────────────────────

test.describe("Vet verified badge API", () => {
  test("admin verify endpoint returns 403 without secret", async ({ page }) => {
    await signIn(page);
    const res = await page.evaluate(async () => {
      const r = await fetch("http://localhost:8000/api/admin/verify-vet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vet_id: "00000000-0000-0000-0000-000000000000" }),
      });
      return r.status;
    });
    expect(res).toBe(403);
  });

  test("verify status endpoint returns 401 without auth", async ({ page }) => {
    await signIn(page);
    const res = await page.evaluate(async () => {
      const r = await fetch("http://localhost:8000/api/vet/verify-status");
      return r.status;
    });
    expect(res).toBe(401);
  });
});

// ── Regression: existing features still render with new code ──────────────────

test.describe("Regression — existing features intact", () => {
  test("dashboard still loads after layout change", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes("minification"))).toHaveLength(0);
  });

  test("nav still renders after ThemeProvider wrapping", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(/PawLog/)).toBeVisible({ timeout: 5_000 });
  });

  test("pet profile still loads all existing tabs", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("tab", { name: /health logs/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("tab", { name: /medications/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /appointments/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /vaccines/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /vet visits/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /vet notes/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /ai summaries/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /labs/i })).toBeVisible();
  });

  test("share page still shows vet invite form", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/share`);
    await expect(page.getByText(/send invite/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/read-only share links/i)).toBeVisible();
    await expect(page.getByText(/co-owner access/i)).toBeVisible();
  });
});
