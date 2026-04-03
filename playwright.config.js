// playwright.config.js – BuchungsWerk E2E Tests
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.spec.js",
  timeout: 45 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      // Fallback: bereits installiertes Chromium 1208 nutzen wenn 1217 fehlt
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        "C:/Users/a.gebert/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",
    },
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
