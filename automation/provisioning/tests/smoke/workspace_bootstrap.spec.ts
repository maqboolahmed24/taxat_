import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test, expect } from "@playwright/test";

import {
  createEvidenceManifest,
  appendEvidenceRecord,
} from "../../src/core/evidence_manifest.js";
import {
  createManualCheckpoint,
} from "../../src/core/manual_checkpoint.js";
import {
  createDefaultProviderRegistry,
  assertProviderFlowAllowed,
} from "../../src/core/provider_registry.js";
import { redactText } from "../../src/core/redaction.js";
import {
  createRunContext,
} from "../../src/core/run_context.js";
import { FileResumeStore } from "../../src/core/resume_store.js";
import { rankSelectors } from "../../src/core/selector_contract.js";
import {
  attachManualCheckpoint,
  createPendingStep,
  markSkippedAsAlreadyPresent,
  transitionStep,
} from "../../src/core/step_contract.js";

test("boots the provisioning workspace against a local fixture portal", async ({
  page,
}) => {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired("fixture-sandbox-console");
  const flow = provider.flows[0];
  const selectorManifest = provider.selectorManifests[0];

  const runContext = createRunContext({
    providerId: provider.providerId,
    flowId: flow.flowId,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.fixture",
    workspaceId: "wk-fixture-smoke",
    evidenceRoot: "artifacts/runs/fixture-smoke",
  });

  assertProviderFlowAllowed(runContext, provider, flow.flowId);
  expect(rankSelectors(selectorManifest.selectors).map((entry) => entry.selectorId)).toEqual([
    "fixture-heading",
    "existing-resource-button",
    "checkpoint-button",
  ]);

  await page.goto("/tests/fixtures/mock_provider_portal.html");
  await expect(
    page.getByRole("heading", { name: "HMRC Developer Hub Sandbox" }),
  ).toBeVisible();

  const existingResourceButton = page.getByRole("button", {
    name: "Check for existing sandbox application",
  });
  await existingResourceButton.click();
  await expect(page.locator("body")).toHaveAttribute("data-existing-resource", "true");

  const portalStatus = page.getByRole("status");
  await expect(portalStatus).toContainText(
    "Adopt current registration rather than duplicating it.",
  );

  const existingStep = markSkippedAsAlreadyPresent(
    transitionStep(
      createPendingStep({
        stepId: "step-001",
        title: "Check existing sandbox application",
        selectorRefs: ["existing-resource-button"],
      }),
      "RUNNING",
      "Fixture provider portal opened",
    ),
    "Existing sandbox application located and adopted",
  );

  const rules = [
    {
      id: "portal-status-uri",
      category: "SECRET" as const,
      kind: "EXACT" as const,
      pattern: "https://staging.taxat.test/callback/hmrc",
      replacement: "[REDACTED_CALLBACK_URI]",
    },
  ];

  const redacted = redactText(
    `${await portalStatus.textContent()} https://staging.taxat.test/callback/hmrc`,
    rules,
  );
  const evidenceManifest = appendEvidenceRecord(
    createEvidenceManifest(runContext),
    {
      evidenceId: "evidence-existing-resource",
      stepId: existingStep.stepId,
      kind: "STRUCTURED_LOG",
      relativePath: "step-001/existing-resource.json",
      captureMode: "REDACTED",
      summary: redacted.value,
      locatorRefs: ["existing-resource-button"],
      redactionNotes: redacted.notes,
    },
  );

  expect(evidenceManifest.entries[0].summary).not.toContain(
    "https://staging.taxat.test/callback/hmrc",
  );

  await page.getByRole("button", { name: "Pause for MFA review" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-manual-checkpoint", "true");
  await expect(
    page.getByRole("heading", { name: "Manual checkpoint required" }),
  ).toBeVisible();

  const checkpoint = createManualCheckpoint({
    checkpointId: "checkpoint-fixture-mfa",
    stepId: "step-002",
    reason: "MFA",
    prompt: "Approve the external MFA factor, then resume without replaying the settings write.",
    expectedSignals: ["Manual checkpoint panel visible"],
    reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
  });
  const checkpointStep = attachManualCheckpoint(
    transitionStep(
      createPendingStep({
        stepId: "step-002",
        title: "Pause for MFA review",
        selectorRefs: ["checkpoint-button"],
        sensitiveCapturePolicy: "SUPPRESS",
      }),
      "RUNNING",
      "Checkpoint button activated from fixture portal",
    ),
    checkpoint,
  );

  const resumeRoot = await mkdtemp(
    path.join(os.tmpdir(), "taxat-provisioning-smoke-"),
  );
  const store = new FileResumeStore(resumeRoot);
  const snapshot = await store.saveSnapshot({
    runContext: {
      runId: runContext.runId,
      providerId: runContext.providerId,
      flowId: runContext.flowId,
      productEnvironmentId: runContext.productEnvironmentId,
      providerEnvironment: runContext.providerEnvironment,
      executionMode: runContext.executionMode,
      operatorIdentityAlias: runContext.operatorIdentityAlias,
      workspaceId: runContext.workspaceId,
      evidenceRoot: runContext.evidenceRoot,
      liveProviderExecutionAllowed: runContext.liveProviderExecutionAllowed,
    },
    steps: [existingStep, checkpointStep],
    checkpoint,
    notes: ["Fixture checkpoint opened"],
  });

  expect(snapshot.revision).toBe(1);
  expect(snapshot.checkpoint?.status).toBe("OPEN");
  expect(snapshot.steps[1].status).toBe("MANUAL_CHECKPOINT_REQUIRED");
});
