import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { FileResumeStore } from "../../../../automation/provisioning/src/core/resume_store.js";
import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  MANUAL_PORTAL_CHECKPOINT_FLOW_ID,
  captureManualCheckpointEvidence,
  type CaptureManualCheckpointEvidenceResult,
} from "../../../../automation/provisioning/src/providers/shared/flows/capture_manual_checkpoint_evidence.js";

function fixtureRunContext() {
  return createRunContext({
    runId: "run-blocked-portal-checkpoint",
    providerId: "oidc-external-idp-control-plane",
    flowId: MANUAL_PORTAL_CHECKPOINT_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.portal.checkpoint.fixture",
    workspaceId: "wk-local-provisioning-checkpoint",
    evidenceRoot: "artifacts/runs/portal-checkpoint-fixture",
    browserStorageStatePolicy: "SECRET_REFERENCE_ONLY",
  });
}

function blockedUrl(scenario: string) {
  return `/automation/provisioning/tests/fixtures/blocked_portal_checkpoint_console.html?scenario=${scenario}&state=blocked`;
}

function resolvedUrl(scenario: string) {
  return `/automation/provisioning/tests/fixtures/blocked_portal_checkpoint_console.html?scenario=${scenario}&state=resolved`;
}

async function runFixtureFlow(
  page: Parameters<typeof captureManualCheckpointEvidence>[0]["page"],
  scenario: string,
) {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "taxat-portal-checkpoint-"),
  );
  const checkpointRecordPath = path.join(rootDir, "manual_checkpoint_record.json");
  const evidencePackPath = path.join(rootDir, "manual_checkpoint_evidence_pack.json");
  const resumeRoot = path.join(rootDir, "resume");

  const result = await captureManualCheckpointEvidence({
    page,
    runContext: fixtureRunContext(),
    checkpointRecordPath,
    evidencePackPath,
    resumeRoot,
    entryUrl: blockedUrl(scenario),
    providerLabel: "External identity dashboard",
    environmentLabel: "Local provisioning workstation",
    recipeRef: `fixture.${scenario}.blocked`,
    stepId: "fixture.portal.checkpoint.capture",
    stepTitle: "Detect and persist blocked portal checkpoint",
    safeLastCompletedStepId: "fixture.portal.checkpoint.last-safe-step",
    selectorManifestVersion: "fixture.blocked-portal.v1",
    browserSessionPosture: "PRE_CHALLENGE_SESSION_PENDING_REVALIDATION",
    secretEntrySuppressionActive: true,
    expectedPostCheckpointRouteRef: `fixture.${scenario}.successor`,
    portalRouteRef: `fixture.${scenario}.blocked`,
    pageIdentityRef: `${scenario}-checkpoint`,
    additionalSensitiveValues: ["ops@example.invalid", "483920"],
    browserStorageStateRef: "vault://browser-state/fixture/current",
  });

  const [checkpointRecordRaw, evidencePackRaw, evidenceManifestRaw] =
    await Promise.all([
      readFile(checkpointRecordPath, "utf8"),
      readFile(evidencePackPath, "utf8"),
      readFile(result.evidenceManifestPath, "utf8"),
    ]);

  return {
    rootDir,
    resumeRoot,
    result,
    checkpointRecordRaw,
    evidencePackRaw,
    evidenceManifestRaw,
  };
}

function expectCheckpointStatuses(result: CaptureManualCheckpointEvidenceResult) {
  const statuses = result.steps.slice(-3).map((step) => step.status);
  expect(statuses).toEqual([
    "SUCCEEDED",
    "MANUAL_CHECKPOINT_REQUIRED",
    "SUCCEEDED",
  ]);
}

test("fixture checkpoint flow persists sanitized evidence and resume state for MFA-like blocks", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "mfa");

  expect(flow.result.outcome).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expectCheckpointStatuses(flow.result);
  expect(flow.result.checkpointRecord.checkpoint_reason_code).toBe("MFA_REQUIRED");
  expect(flow.result.checkpointRecord.resume_requirements.resume_snapshot_ref_or_null).toBeTruthy();
  expect(flow.checkpointRecordRaw).not.toContain("483920");
  expect(flow.checkpointRecordRaw).not.toContain("ops@example.invalid");
  expect(flow.evidencePackRaw).not.toContain("483920");
  expect(flow.evidencePackRaw).not.toContain("ops@example.invalid");
  expect(flow.evidenceManifestRaw).toContain("Checkpoint screenshot retained with masking");

  const store = new FileResumeStore(flow.resumeRoot);
  const snapshot = await store.loadLatest(fixtureRunContext().runId);
  expect(snapshot?.checkpoint?.status).toBe("OPEN");

  await page.goto(resolvedUrl("mfa"));
  await expect(page.locator("body")).toHaveAttribute(
    "data-route-ref",
    "hmrc.developer_hub.applications",
  );

  const resumed = await store.markCheckpointResumed(
    fixtureRunContext().runId,
    flow.result.checkpointRecord.mapped_core_checkpoint.checkpoint_id,
    "ops.portal.checkpoint.fixture",
    "Human completed the MFA factor.",
  );
  expect(resumed.checkpoint?.status).toBe("RESUMED");
  expect(
    flow.result.checkpointRecord.resume_requirements.safe_noop_verification_step,
  ).toContain("Re-read portal heading");
});

test("portal checkpoint atlas renders the timeline and persistent inspector for blocked-portal families", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=portal-checkpoint-atlas",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", {
      name: "Checkpoint families and portal runs",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Automation Path", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Checkpoint Encountered", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText(
    "HMRC sign-in 2-step verification",
  );
  await expect(page.getByTestId("checkpoint-reason-chip")).toHaveText(
    "MFA_REQUIRED",
  );
  await expect(page.getByTestId("resume-preconditions-list")).toBeVisible();
  await expect(page.getByTestId("evidence-list")).toBeVisible();

  await page
    .locator(".portal-checkpoint-rail-list button")
    .filter({ hasText: "Provider policy or rate-limit block" })
    .click();
  await expect(page.locator("#main-title")).toHaveText(
    "Provider policy or rate-limit block",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "Provider policy or rate-limit block",
  );
  await expect(page.getByTestId("checkpoint-reason-chip")).toHaveText(
    "PORTAL_POLICY_BLOCK",
  );
  await expect(
    page.getByText("Policy block is cleared.", { exact: false }),
  ).toBeVisible();
});
