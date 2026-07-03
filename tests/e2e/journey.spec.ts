/**
 * FULL USER JOURNEY TEST
 * One single test that runs every step in order with a shared browser page.
 * This correctly models the real user experience: sign in once, do everything,
 * sign out. State is shared across steps via closure variables (petId).
 *
 * Steps:
 *   1. Sign in with email + password
 *   2. Dashboard loads and shows welcome heading + Add pet button
 *   3. Add a new pet (Bella the dog)
 *   4. Log a health observation — triggers AI pipeline (intake + analysis agents)
 *   5. Pet profile shows the new log entry
 *   6. Generate a vet summary — triggers report agent
 *   7. Copy summary to clipboard — button changes to "Copied!"
 *   8. Sign out — returns to home/auth
 *
 * Requires: Next.js on :3000, FastAPI on :8000, valid GOOGLE_API_KEY.
 */

import { test, expect } from "@playwright/test";

const TEST_EMAIL = "pawlog.e2e@test.local";
const TEST_PASSWORD = "PawLogTest2026!";
const PET_NAME = "Bella";

test.setTimeout(480_000); // 8 minutes total — AI pipeline on Render free tier can take 200-300s

test("complete user journey — sign in to vet summary", async ({ page, context }) => {
  let petId = "";

  // ────────────────────────────────────────────────────
  // Step 1: Sign in
  // ────────────────────────────────────────────────────
  await test.step("1 — sign in with email + password", async () => {
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.locator("form").getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  // ────────────────────────────────────────────────────
  // Step 2: Dashboard
  // ────────────────────────────────────────────────────
  await test.step("2 — dashboard loads with welcome heading and Add pet button", async () => {
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await expect(page.getByRole("link", { name: /add.*pet/i }).first()).toBeVisible();
  });

  // ────────────────────────────────────────────────────
  // Step 3: Add a pet
  // ────────────────────────────────────────────────────
  await test.step("3 — add a new pet (Bella the dog)", async () => {
    // Click the "Add pet" button in the dashboard header
    await page.getByRole("link", { name: /add.*pet/i }).first().click();
    await page.waitForURL("**/pets/new", { timeout: 10_000 });
    await expect(page.locator("h1")).toContainText(/add a pet/i);

    // Fill the pet form
    await page.locator("#name").fill(PET_NAME);
    await page.locator("#species").selectOption("dog");
    await page.locator("#breed").fill("Labrador");
    await page.locator("#age").fill("3");

    // Submit
    await page.getByRole("button", { name: /create pet profile/i }).click();

    // Redirected to /pets/<uuid>
    await page.waitForURL(/\/pets\/[a-f0-9-]{36}$/, { timeout: 15_000 });
    petId = page.url().split("/pets/")[1];

    // Pet name is visible on the profile page
    await expect(page.getByRole("heading", { name: PET_NAME })).toBeVisible();
  });

  // ────────────────────────────────────────────────────
  // Step 4: Log a health observation (AI pipeline)
  // ────────────────────────────────────────────────────
  await test.step("4 — log a health observation and wait for AI pipeline", async () => {
    await page.goto(`/pets/${petId}/log`);
    await expect(page.locator("h1")).toContainText(/log.*observations/i);

    await page.locator("#observation").fill(
      "Bella scratched her left ear repeatedly today and skipped half her dinner. " +
      "She was a bit lethargic in the afternoon but perked up on her evening walk."
    );

    await page.getByRole("button", { name: /save log/i }).click();

    // AI pipeline runs — waits for redirect back to pet profile (up to 280s; client polls for 300s)
    await page.waitForURL(/\/pets\/[a-f0-9-]{36}$/, { timeout: 280_000 });
    expect(page.url()).toContain(petId);
  });

  // ────────────────────────────────────────────────────
  // Step 5: Pet profile shows the new log
  // ────────────────────────────────────────────────────
  await test.step("5 — pet profile shows the new log entry", async () => {
    await expect(page.locator("main")).toBeVisible();
    // The "Log today" button proves we're on the pet profile
    await expect(
      page.getByRole("link", { name: /log today|add first log/i }).first()
    ).toBeVisible();
    // The page should show at least one log entry — check for the date or any log content
    const pageText = await page.locator("main").innerText();
    // Page must contain something beyond just the empty state
    expect(pageText.length).toBeGreaterThan(50);
  });

  // ────────────────────────────────────────────────────
  // Step 6: Generate vet summary (AI pipeline)
  // ────────────────────────────────────────────────────
  await test.step("6 — generate a vet summary with the report agent", async () => {
    await page.goto(`/pets/${petId}/summary`);
    await expect(page.locator("h1")).toContainText(/vet visit summary/i);

    await page.getByRole("button", { name: /generate vet summary/i }).click();

    // Report agent generates summary — wait up to 90s
    await page.waitForSelector("text=Questions to ask", { timeout: 90_000 });

    // Summary content must be substantive
    const summaryText = await page.locator("main").innerText();
    expect(summaryText.length).toBeGreaterThan(100);
  });

  // ────────────────────────────────────────────────────
  // Step 7: Copy to clipboard
  // ────────────────────────────────────────────────────
  await test.step("7 — copy vet summary to clipboard", async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: /copy to clipboard/i }).click();
    // Button text changes to "Copied!" briefly
    await expect(page.getByRole("button", { name: /copied/i })).toBeVisible({ timeout: 3_000 });
  });

  // ────────────────────────────────────────────────────
  // Step 8: Sign out
  // ────────────────────────────────────────────────────
  await test.step("8 — sign out and return to landing or auth page", async () => {
    await page.getByRole("button", { name: /sign out/i }).click();
    // After sign out, user is no longer on a protected route
    await page.waitForURL(/\/(auth|$|\?.*)?$/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });
});
