/**
 * E2E TESTS — Auth Page
 * Tests the authentication page UI and form interactions
 * without submitting real credentials.
 */

import { test, expect } from "@playwright/test";

test.describe("Auth Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("renders sign in tab by default", async ({ page }) => {
    // Both the tab and submit button say "Sign in" — check the first one (tab)
    await expect(page.getByRole("button", { name: /^sign in$/i }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("shows Google sign in button", async ({ page }) => {
    await expect(page.getByText(/continue with google/i)).toBeVisible();
  });

  test("does not show name field on sign in tab", async ({ page }) => {
    await expect(page.getByLabel(/full name/i)).not.toBeVisible();
  });

  test("switches to create account tab", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });

  test("switches back to sign in tab", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByLabel(/full name/i)).not.toBeVisible();
  });

  test("shows disclaimer about veterinary advice", async ({ page }) => {
    await expect(page.getByText(/not provide veterinary advice/i)).toBeVisible();
  });

  test("PawLog logo links back to home", async ({ page }) => {
    // Logo link is mobile-only (lg:hidden) — use mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.getByRole("link", { name: /pawlog/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("email field accepts input", async ({ page }) => {
    await page.getByLabel(/email/i).fill("test@example.com");
    await expect(page.getByLabel(/email/i)).toHaveValue("test@example.com");
  });

  test("password field masks input", async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("sign in button is present and clickable", async ({ page }) => {
    // Target the submit button inside the form specifically
    const btn = page.locator("form").getByRole("button", { name: /sign in/i });
    await expect(btn).toBeVisible();
    await expect(btn).not.toBeDisabled();
  });
});
