/**
 * E2E TESTS — Landing Page
 * Tests the public landing page renders correctly and
 * navigation links work as expected.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the PawLog brand name", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Never forget a symptom/i })).toBeVisible();
  });

  test("shows navigation with sign in and get started buttons", async ({ page }) => {
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started free/i })).toBeVisible();
  });

  test("displays feature cards for owners and vets", async ({ page }) => {
    await expect(page.getByText("AI Pattern Detection")).toBeVisible();
    await expect(page.getByText("Vet Visit Summaries")).toBeVisible();
    await expect(page.getByText("Daily Health Logs")).toBeVisible();
    await expect(page.getByText("Medication Tracking")).toBeVisible();
    await expect(page.getByText("Secure Sharing")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clinical Notes" })).toBeVisible();
  });

  test("displays all 4 how-it-works steps", async ({ page }) => {
    await expect(page.getByText("01")).toBeVisible();
    await expect(page.getByText("02")).toBeVisible();
    await expect(page.getByText("03")).toBeVisible();
    await expect(page.getByText("04")).toBeVisible();
  });

  test("get started button navigates to /auth", async ({ page }) => {
    await page.getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL("/auth");
  });

  test("sign in link navigates to /auth", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL("/auth");
  });

  test("footer shows PawLog and tech stack", async ({ page }) => {
    await expect(page.getByText(/Built with Google ADK/i)).toBeVisible();
  });

  test("page title is correct", async ({ page }) => {
    await expect(page).toHaveTitle(/PawLog/i);
  });
});
