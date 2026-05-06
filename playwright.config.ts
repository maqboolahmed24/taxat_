import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.RUN_ENGINE_ATLAS_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
const repoDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 80,
    },
  },
  projects: [
    {
      name: "browser",
      testMatch: /tests\/(playwright|playwright_browser)\/.*\.spec\.ts/,
    },
    {
      name: "unit",
      testMatch: /tests\/(unit|ci)\/.*\.spec\.ts/,
    },
    {
      name: "api",
      testMatch: /tests\/playwright_api\/.*\.spec\.ts/,
    },
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    viewport: { width: 1600, height: 1200 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    cwd: repoDir,
    url: baseURL,
    reuseExistingServer: true,
  },
});
