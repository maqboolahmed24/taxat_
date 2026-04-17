import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = Number(process.env.RUN_ENGINE_ATLAS_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
const repoDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 80,
    },
  },
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
