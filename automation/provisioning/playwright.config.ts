import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PROVISIONING_VIEWER_PORT || 4328);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  outputDir: "./artifacts/test-results",
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "./artifacts/html-report",
      },
    ],
  ],
  use: {
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1440, height: 1024 },
  },
  projects: [
    {
      name: "unit",
      testMatch: /tests\/unit\/.*\.spec\.ts/,
    },
    {
      name: "smoke",
      testMatch: /tests\/smoke\/workspace_bootstrap\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "viewer",
      testMatch: /tests\/smoke\/run_viewer\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    cwd: workspaceDir,
    url: baseURL,
    reuseExistingServer: false,
  },
});
