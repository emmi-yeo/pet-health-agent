import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/._*"],
  timeout: 45000,
  retries: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Do NOT start a server — we use the already-running dev server
  webServer: undefined,
});
