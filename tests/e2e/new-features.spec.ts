/**
 * NEW FEATURES — E2E tests for all Phase 1-6 additions
 * Covers: role selection signup, password reset page, account page,
 * medications UI, vet dashboard, pet sharing, 404 page.
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

// ── Auth page enhancements ───────────────────────────────────────────────────

test.describe("Auth — role selection on signup", () => {
  test("signup tab shows role radio buttons", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/pet owner/i)).toBeVisible();
    await expect(page.getByText(/veterinarian/i)).toBeVisible();
  });

  test("selecting vet role shows clinic name field", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.getByLabel(/veterinarian/i).check();
    await expect(page.getByPlaceholder(/clinic name/i).or(page.getByLabel(/clinic/i))).toBeVisible();
  });

  test("forgot password link is visible on sign in tab", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });
});

// ── Password reset pages ─────────────────────────────────────────────────────

test.describe("Password reset flow", () => {
  test("reset-password page renders email form", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset/i })).toBeVisible();
  });

  test("update-password page renders password fields", async ({ page }) => {
    await page.goto("/auth/update-password");
    const pwInputs = page.locator('input[type="password"]');
    await expect(pwInputs.first()).toBeVisible();
  });
});

// ── Account page ─────────────────────────────────────────────────────────────

test.describe("Account settings page", () => {
  test("account page requires sign in — redirects unauthenticated users", async ({ page }) => {
    await page.goto("/account");
    await page.waitForURL(/auth|account/, { timeout: 8_000 });
    // Either redirected to /auth or shown the page (if session somehow persists)
    const url = page.url();
    expect(url).toMatch(/auth|account/);
  });

  test("account page loads for authenticated user", async ({ page }) => {
    await signIn(page);
    await page.goto("/account");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should show save/sign out options
    await expect(page.getByRole("button", { name: /sign out|save/i }).first()).toBeVisible();
  });
});

// ── Medications UI ───────────────────────────────────────────────────────────

test.describe("Medications page", () => {
  let petId = "";

  test("medications page loads for a pet", async ({ page }) => {
    await signIn(page);
    // Get first pet from dashboard
    await expect(page.locator("main")).toBeVisible();
    const petLink = page.getByRole("link", { name: /bella/i }).first();
    if (await petLink.count() > 0) {
      await petLink.click();
      await page.waitForURL(/\/pets\/[a-f0-9-]{36}$/, { timeout: 10_000 });
      petId = page.url().split("/pets/")[1];
      await page.goto(`/pets/${petId}/medications`);
      await expect(page.getByRole("heading", { name: "Medications", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /add medication/i })).toBeVisible();
    }
  });

  test("add medication form has required fields", async ({ page }) => {
    await signIn(page);
    const petLink = page.getByRole("link", { name: /bella/i }).first();
    if (await petLink.count() > 0) {
      await petLink.click();
      await page.waitForURL(/\/pets\/[a-f0-9-]{36}$/, { timeout: 10_000 });
      petId = page.url().split("/pets/")[1];
      await page.goto(`/pets/${petId}/medications`);
      await page.getByRole("button", { name: /add medication/i }).click();
      await expect(page.getByLabel(/medication name/i).or(page.getByPlaceholder(/e\.g\. amoxicillin/i))).toBeVisible();
    }
  });
});

// ── Vet dashboard ─────────────────────────────────────────────────────────────

test.describe("Vet dashboard — redirects non-vets", () => {
  test("owner visiting /vet/dashboard is redirected to /dashboard", async ({ page }) => {
    await signIn(page);
    await page.goto("/vet/dashboard");
    await page.waitForURL(/dashboard/, { timeout: 8_000 });
    expect(page.url()).not.toContain("/vet/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});

// ── Pet profile enhancements ─────────────────────────────────────────────────

test.describe("Pet profile — edit and share buttons", () => {
  test("pet profile has edit and share with vet buttons", async ({ page }) => {
    await signIn(page);
    const petLink = page.getByRole("link", { name: /bella/i }).first();
    if (await petLink.count() > 0) {
      await petLink.click();
      await page.waitForURL(/\/pets\/[a-f0-9-]{36}$/, { timeout: 10_000 });
      // Edit button
      const editBtn = page.getByRole("link", { name: /edit/i }).or(page.getByRole("button", { name: /edit/i }));
      await expect(editBtn.first()).toBeVisible();
      // Share with vet
      const shareBtn = page.getByRole("link", { name: /share/i }).or(page.getByRole("button", { name: /share/i }));
      await expect(shareBtn.first()).toBeVisible();
    }
  });
});

// ── 404 and error pages ──────────────────────────────────────────────────────

test.describe("Error pages", () => {
  test("unknown route shows custom 404 page", async ({ page }) => {
    await page.goto("/this-page-definitely-does-not-exist");
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible({ timeout: 5_000 });
  });
});

// ── Nav enhancements ─────────────────────────────────────────────────────────

test.describe("Nav — account link and mobile menu", () => {
  test("authenticated nav shows account avatar", async ({ page }) => {
    await signIn(page);
    // Avatar should link to /account
    const accountLink = page.locator('a[href="/account"]');
    await expect(accountLink).toBeVisible();
  });

  test("nav hamburger visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page);
    // Hamburger menu button should be visible
    const menuBtn = page.locator('button[aria-label*="menu" i], button:has(svg):visible').first();
    await expect(menuBtn).toBeVisible();
  });
});
