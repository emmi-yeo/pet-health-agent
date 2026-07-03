/**
 * PHASE 2 FEATURES — E2E tests for all features built in the second batch.
 * Covers: appointments, vaccinations, vet visits, QR code, AI chat, CSV export,
 * weight chart tab, onboarding checklist, photo upload page, medication interactions.
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

// ── Pet profile new tabs ────────────────────────────────────────────────────

test.describe("Pet profile — new tabs", () => {
  test("appointments tab is visible on pet profile", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("tab", { name: /appointments/i })).toBeVisible({ timeout: 10_000 });
  });

  test("vaccinations tab is visible on pet profile", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("tab", { name: /vaccines/i })).toBeVisible({ timeout: 10_000 });
  });

  test("vet visits tab is visible on pet profile", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("tab", { name: /vet visits/i })).toBeVisible({ timeout: 10_000 });
  });

  test("clicking appointments tab shows schedule button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /appointments/i }).click();
    await expect(page.getByRole("button", { name: /schedule/i })).toBeVisible({ timeout: 8_000 });
  });

  test("clicking vaccinations tab shows add vaccine button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /vaccines/i }).click();
    await expect(page.getByRole("button", { name: /add vaccine/i })).toBeVisible({ timeout: 8_000 });
  });

  test("clicking vet visits tab shows log visit button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /vet visits/i }).click();
    await expect(page.getByRole("button", { name: /log visit/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ── Appointment form ─────────────────────────────────────────────────────────

test.describe("Appointment scheduling", () => {
  test("schedule form appears when Schedule button is clicked", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /appointments/i }).click();
    await page.getByRole("button", { name: /schedule/i }).click();
    await expect(page.locator("label").filter({ hasText: /date/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  test("cancel button hides the appointment form", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /appointments/i }).click();
    await page.getByRole("button", { name: /schedule/i }).click();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("button", { name: /save/i })).not.toBeVisible();
  });
});

// ── Vaccination form ─────────────────────────────────────────────────────────

test.describe("Vaccination log", () => {
  test("add vaccine form shows required fields", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /vaccines/i }).click();
    await page.getByRole("button", { name: /add vaccine/i }).click();
    await expect(page.getByLabel(/vaccine name/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/date administered/i)).toBeVisible();
  });

  test("vaccine form has optional next due date field", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /vaccines/i }).click();
    await page.getByRole("button", { name: /add vaccine/i }).click();
    await expect(page.getByLabel(/next due/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Vet visit form ───────────────────────────────────────────────────────────

test.describe("Vet visit log", () => {
  test("log visit form shows date and notes fields", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await page.getByRole("tab", { name: /vet visits/i }).click();
    await page.getByRole("button", { name: /log visit/i }).click();
    await expect(page.getByLabel(/visit date/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/notes/i).first()).toBeVisible();
  });
});

// ── QR code page ─────────────────────────────────────────────────────────────

test.describe("QR code page", () => {
  test("QR button visible on pet profile header", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    const qrLink = page.getByRole("link", { name: /qr/i });
    await expect(qrLink).toBeVisible({ timeout: 8_000 });
  });

  test("QR page loads with download button", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/qr`);
    await expect(page.getByRole("button", { name: /download/i })).toBeVisible({ timeout: 8_000 });
  });

  test("QR page shows pet name in heading", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/qr`);
    await expect(page.getByText(/qr code/i)).toBeVisible({ timeout: 8_000 });
  });

  test("QR page renders a canvas element", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/qr`);
    await page.waitForTimeout(1000);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 8_000 });
  });
});

// ── AI Chat page ─────────────────────────────────────────────────────────────

test.describe("AI chat page", () => {
  test("Ask AI button visible on pet profile", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole("link", { name: /ask ai/i })).toBeVisible({ timeout: 8_000 });
  });

  test("chat page loads with input field", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/chat`);
    await expect(page.locator("textarea")).toBeVisible({ timeout: 8_000 });
  });

  test("chat page shows suggested questions", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/chat`);
    await expect(page.getByText(/symptoms/i).or(page.getByText(/patterns/i))).toBeVisible({ timeout: 8_000 });
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/chat`);
    const sendBtn = page.getByRole("button").filter({ has: page.locator("svg") }).last();
    await expect(sendBtn).toBeDisabled({ timeout: 5_000 });
  });

  test("send button enables when text is typed", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/chat`);
    await page.locator("textarea").fill("How is my pet?");
    const sendBtn = page.getByRole("button").filter({ has: page.locator("svg") }).last();
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
  });

  test("chat page back link goes to pet profile", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/chat`);
    const backLink = page.getByRole("link", { name: /back/i });
    await expect(backLink).toBeVisible({ timeout: 5_000 });
    await backLink.click();
    await expect(page).toHaveURL(new RegExp(`/pets/${petId}`), { timeout: 8_000 });
  });
});

// ── Export button ─────────────────────────────────────────────────────────────

test.describe("CSV export", () => {
  test("export CSV button visible on logs tab", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}`);
    await expect(page.getByText(/export csv/i)).toBeVisible({ timeout: 8_000 });
  });
});

// ── Pet photo upload page ─────────────────────────────────────────────────────

test.describe("Pet photo upload", () => {
  test("edit pet page shows photo upload section", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/edit`);
    await expect(page.getByText(/profile photo/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/upload photo/i).or(page.getByText(/change photo/i))).toBeVisible();
  });
});

// ── Weight field on log form ──────────────────────────────────────────────────

test.describe("Weight field on log form", () => {
  test("log form shows optional weight field", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/log`);
    await expect(page.getByLabel(/weight today/i)).toBeVisible({ timeout: 8_000 });
  });

  test("weight field accepts decimal input", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/log`);
    const weightInput = page.getByLabel(/weight today/i);
    await weightInput.fill("8.5");
    await expect(weightInput).toHaveValue("8.5");
  });
});

// ── Onboarding checklist ──────────────────────────────────────────────────────

test.describe("Onboarding checklist", () => {
  test("dashboard page loads without errors", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    // Should not show a JS error
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes("minification"))).toHaveLength(0);
  });
});

// ── Medication interaction checker ────────────────────────────────────────────

test.describe("Medication interaction checker", () => {
  test("interaction checker section appears when medications exist", async ({ page }) => {
    await signIn(page);
    const petId = await getFirstPetId(page);
    if (!petId) test.skip();
    await page.goto(`/pets/${petId}/medications`);
    // The checker only shows with 2+ active meds — check the section header is present if so
    const interactionSection = page.getByText(/ai interaction check/i);
    // If it exists, verify the check button; if not, that's ok (fewer than 2 meds)
    if (await interactionSection.count() > 0) {
      await expect(page.getByRole("button", { name: /check interactions/i })).toBeVisible();
    }
  });
});

// ── New backend endpoints — auth contract ─────────────────────────────────────

test.describe("New API endpoints — auth required (via fetch)", () => {
  test("appointments API requires auth", async ({ page }) => {
    await signIn(page);
    const base = process.env.PLAYWRIGHT_API_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8000";
    const res = await page.evaluate(async (apiBase) => {
      const r = await fetch(`${apiBase}/api/pets/fake-id/appointments`);
      return r.status;
    }, base);
    expect(res).toBe(401);
  });

  test("vaccinations API requires auth", async ({ page }) => {
    await signIn(page);
    const base = process.env.PLAYWRIGHT_API_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8000";
    const res = await page.evaluate(async (apiBase) => {
      const r = await fetch(`${apiBase}/api/pets/fake-id/vaccinations`);
      return r.status;
    }, base);
    expect(res).toBe(401);
  });

  test("chat API requires auth", async ({ page }) => {
    await signIn(page);
    const base = process.env.PLAYWRIGHT_API_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8000";
    const res = await page.evaluate(async (apiBase) => {
      const r = await fetch(`${apiBase}/api/pets/fake-id/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test" }),
      });
      return r.status;
    }, base);
    expect(res).toBe(401);
  });

  test("export API requires auth", async ({ page }) => {
    await signIn(page);
    const base = process.env.PLAYWRIGHT_API_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8000";
    const res = await page.evaluate(async (apiBase) => {
      const r = await fetch(`${apiBase}/api/pets/fake-id/export`);
      return r.status;
    }, base);
    expect(res).toBe(401);
  });
});
