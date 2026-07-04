import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  testMatch: "**/appzoro-landing*.spec.ts",
  fullyParallel: true,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(__dirname, "playwright-report-landing"), open: "never" }],
  ],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://localhost:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-iphone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    },
    {
      name: "mobile-android",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npx serve -l 3456 .",
    cwd: __dirname,
    url: "http://localhost:3456",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
