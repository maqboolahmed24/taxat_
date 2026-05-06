import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const pythonPath = path.join(repoRoot, "scripts", "test");
const bootstrapScript = path.join(
  repoRoot,
  "scripts",
  "test",
  "bootstrap_ephemeral_environment.py",
);

type PythonOutcome =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; stdout: string; stderr: string; code: number | null };

type EphemeralManifest = {
  environment_id: string;
  browser_attachment: {
    environment_identity_chip: string;
    session_fixture_alias: string;
    route_identity_ref: string;
    queue_flow_ref: string;
    upload_object_ref: string;
    cache_partition_ref: string;
    retry_rebase_token: string;
  };
};

type SeedMaterial = {
  browser_session: {
    actor_alias: string;
    session_ref: string;
  };
};

function environmentDir(stateDir: string, environmentId: string) {
  return path.join(stateDir, environmentId);
}

function manifestFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "environment_manifest.json");
}

function seedMaterialFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "seed_material.json");
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function runPython(scriptPath: string, args: string[]): Promise<PythonOutcome> {
  try {
    const result = await execFileAsync("python3", [scriptPath, ...args], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: [pythonPath, process.env.PYTHONPATH ?? ""].filter(Boolean).join(path.delimiter),
      },
      maxBuffer: 32 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    return {
      ok: false,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: typeof failure.code === "number" ? failure.code : null,
    };
  }
}

function renderHarness(input: {
  primaryManifest: EphemeralManifest;
  primarySeedMaterial: SeedMaterial;
  foreignManifest: EphemeralManifest;
}) {
  const payload = JSON.stringify(input).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en" data-motion="reduce">
  <head>
    <meta charset="utf-8" />
    <title>Ephemeral Environment Smoke</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Iowan Old Style", "Palatino Linotype", serif;
        background:
          radial-gradient(circle at top left, rgba(198, 219, 255, 0.45), transparent 42%),
          linear-gradient(180deg, #f7f4ea 0%, #eef1f6 100%);
        color: #1f2833;
      }
      body {
        margin: 0;
        min-height: 100vh;
      }
      main {
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 28px 56px;
      }
      section {
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(31, 40, 51, 0.12);
        border-radius: 20px;
        padding: 20px 22px;
        margin-top: 18px;
        box-shadow: 0 18px 44px rgba(35, 44, 58, 0.08);
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 24px;
      }
      dt {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #5e6773;
      }
      dd {
        margin: 4px 0 0;
        font-family: "SFMono-Regular", "Menlo", monospace;
        font-size: 0.95rem;
        word-break: break-word;
      }
      .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
      }
      button {
        border: none;
        border-radius: 999px;
        padding: 12px 18px;
        background: #214e6b;
        color: #fff;
        font: inherit;
        cursor: pointer;
      }
      button[disabled] {
        cursor: not-allowed;
        opacity: 0.5;
      }
      label,
      input {
        display: block;
      }
      input {
        width: 100%;
        max-width: 420px;
        margin-top: 8px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(31, 40, 51, 0.2);
        font: inherit;
      }
      [role="status"],
      [role="alert"] {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(33, 78, 107, 0.08);
      }
      [role="alert"] {
        background: rgba(158, 47, 47, 0.12);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p>Manifest-driven browser harness for ephemeral environments.</p>
        <h1>Ephemeral Environment Smoke</h1>
      </header>

      <section aria-labelledby="basis-heading">
        <h2 id="basis-heading">Environment basis</h2>
        <p>
          Browser is attached to
          <strong id="environment-chip"></strong>
          using a seeded fixture session.
        </p>
        <dl>
          <div>
            <dt>Session alias</dt>
            <dd id="session-alias"></dd>
          </div>
          <div>
            <dt>Session ref</dt>
            <dd id="session-ref"></dd>
          </div>
          <div>
            <dt>Route identity</dt>
            <dd id="route-identity"></dd>
          </div>
          <div>
            <dt>Queue flow</dt>
            <dd id="queue-flow"></dd>
          </div>
          <div>
            <dt>Upload object</dt>
            <dd id="upload-object"></dd>
          </div>
          <div>
            <dt>Cache partition</dt>
            <dd id="cache-partition"></dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="happy-heading">
        <h2 id="happy-heading">Happy path</h2>
        <p>Start the seeded browser session, then complete one manifest-bound workflow.</p>
        <div class="button-row">
          <button type="button" id="start-session">Start seeded operator session</button>
          <button type="button" id="complete-journey" disabled>Complete seeded happy path</button>
        </div>
        <div role="status" id="journey-status">Waiting for the seeded session.</div>
      </section>

      <section aria-labelledby="retry-heading">
        <h2 id="retry-heading">Retry and rebase gate</h2>
        <label for="retry-token">Retry token</label>
        <input id="retry-token" name="retry-token" />
        <div class="button-row">
          <button type="button" id="retry-request">Retry request</button>
        </div>
        <div role="status" id="retry-status">Waiting for retry.</div>
        <div role="alert" id="retry-alert" hidden></div>
      </section>

      <script>
        const data = ${payload};
        const environmentChip = document.getElementById("environment-chip");
        const sessionAlias = document.getElementById("session-alias");
        const sessionRef = document.getElementById("session-ref");
        const routeIdentity = document.getElementById("route-identity");
        const queueFlow = document.getElementById("queue-flow");
        const uploadObject = document.getElementById("upload-object");
        const cachePartition = document.getElementById("cache-partition");
        const journeyStatus = document.getElementById("journey-status");
        const retryStatus = document.getElementById("retry-status");
        const retryAlert = document.getElementById("retry-alert");
        const retryTokenInput = document.getElementById("retry-token");
        const completeButton = document.getElementById("complete-journey");

        const primary = data.primaryManifest;
        const foreign = data.foreignManifest;
        const seedMaterial = data.primarySeedMaterial;
        const knownForeignTokens = {
          [foreign.browser_attachment.retry_rebase_token]: foreign.environment_id
        };

        environmentChip.textContent = primary.browser_attachment.environment_identity_chip;
        sessionAlias.textContent = primary.browser_attachment.session_fixture_alias;
        sessionRef.textContent = seedMaterial.browser_session.session_ref;
        routeIdentity.textContent = "Not started";
        queueFlow.textContent = "Not started";
        uploadObject.textContent = "Not started";
        cachePartition.textContent = "Not started";

        document.getElementById("start-session").addEventListener("click", () => {
          routeIdentity.textContent = primary.browser_attachment.route_identity_ref;
          journeyStatus.textContent =
            "Seeded session " +
            primary.browser_attachment.session_fixture_alias +
            " attached to " +
            primary.environment_id +
            ".";
          completeButton.disabled = false;
        });

        completeButton.addEventListener("click", () => {
          queueFlow.textContent = primary.browser_attachment.queue_flow_ref;
          uploadObject.textContent = primary.browser_attachment.upload_object_ref;
          cachePartition.textContent = primary.browser_attachment.cache_partition_ref;
          journeyStatus.textContent =
            "Happy path completed for " +
            primary.environment_id +
            " using " +
            primary.browser_attachment.route_identity_ref +
            ".";
        });

        document.getElementById("retry-request").addEventListener("click", () => {
          const token = retryTokenInput.value.trim();
          if (token !== primary.browser_attachment.retry_rebase_token) {
            retryAlert.hidden = false;
            const foreignEnvironmentId = knownForeignTokens[token];
            retryAlert.textContent = foreignEnvironmentId
              ? "Retry denied because the browser is attached to " +
                primary.environment_id +
                " but the token belongs to " +
                foreignEnvironmentId +
                "."
              : "Retry denied because the token does not match " + primary.environment_id + ".";
            retryStatus.textContent = "Retry blocked.";
            return;
          }
          retryAlert.hidden = true;
          retryAlert.textContent = "";
          retryStatus.textContent =
            "Retry accepted for " +
            primary.browser_attachment.route_identity_ref +
            " with " +
            primary.browser_attachment.retry_rebase_token +
            ".";
        });
      </script>
    </main>
  </body>
</html>`;
}

test("browser smoke follows the manifest-bound happy path and blocks a retry token from another ephemeral environment", async ({
  page,
}) => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "taxat-ephemeral-browser-"));
  const primaryId = "env-ephemeral-local-browser-001";
  const foreignId = "env-ephemeral-local-browser-002";

  try {
    const bootstrapArgs = [
      "--scope-class",
      "LOCAL_HIGH_FIDELITY_SHARD",
      "--owner-ref",
      "local.browser.20260423",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
    ];

    const [primaryBootstrap, foreignBootstrap] = await Promise.all([
      runPython(bootstrapScript, [
        "--environment-id",
        primaryId,
        "--shard-ref",
        "browser-a",
        ...bootstrapArgs,
      ]),
      runPython(bootstrapScript, [
        "--environment-id",
        foreignId,
        "--shard-ref",
        "browser-b",
        ...bootstrapArgs,
      ]),
    ]);

    expect(primaryBootstrap.ok).toBe(true);
    expect(foreignBootstrap.ok).toBe(true);

    const [primaryManifest, primarySeedMaterial, foreignManifest] = await Promise.all([
      readJson<EphemeralManifest>(manifestFile(stateDir, primaryId)),
      readJson<SeedMaterial>(seedMaterialFile(stateDir, primaryId)),
      readJson<EphemeralManifest>(manifestFile(stateDir, foreignId)),
    ]);

    await page.setContent(
      renderHarness({
        primaryManifest,
        primarySeedMaterial,
        foreignManifest,
      }),
    );

    await expect(page.getByRole("heading", { name: "Ephemeral Environment Smoke" })).toBeVisible();
    await expect(
      page.getByText(primaryManifest.browser_attachment.environment_identity_chip),
    ).toBeVisible();
    await expect(
      page.getByText(primaryManifest.browser_attachment.session_fixture_alias),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start seeded operator session" }).click();
    await expect(page.getByRole("status").first()).toContainText(primaryManifest.environment_id);
    await expect(
      page.getByText(primaryManifest.browser_attachment.route_identity_ref),
    ).toBeVisible();

    await page.getByRole("button", { name: "Complete seeded happy path" }).click();
    await expect(page.getByRole("status").first()).toContainText("Happy path completed");
    await expect(page.getByText(primaryManifest.browser_attachment.queue_flow_ref)).toBeVisible();
    await expect(
      page.getByText(primaryManifest.browser_attachment.upload_object_ref),
    ).toBeVisible();
    await expect(
      page.getByText(primaryManifest.browser_attachment.cache_partition_ref),
    ).toBeVisible();

    await page
      .getByLabel("Retry token")
      .fill(foreignManifest.browser_attachment.retry_rebase_token);
    await page.getByRole("button", { name: "Retry request" }).click();
    await expect(page.getByRole("alert")).toContainText(primaryManifest.environment_id);
    await expect(page.getByRole("alert")).toContainText(foreignManifest.environment_id);

    await page
      .getByLabel("Retry token")
      .fill(primaryManifest.browser_attachment.retry_rebase_token);
    await page.getByRole("button", { name: "Retry request" }).click();
    await expect(page.getByRole("status").nth(1)).toContainText(
      primaryManifest.browser_attachment.retry_rebase_token,
    );
    await expect(page.getByRole("alert")).toBeHidden();
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});
