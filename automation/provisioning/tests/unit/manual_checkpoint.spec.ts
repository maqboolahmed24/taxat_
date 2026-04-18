import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test, expect } from "@playwright/test";

import {
  createManualCheckpoint,
} from "../../src/core/manual_checkpoint.js";
import { FileResumeStore } from "../../src/core/resume_store.js";
import {
  createRunContext,
  summarizeRunContext,
} from "../../src/core/run_context.js";
import {
  attachManualCheckpoint,
  createPendingStep,
  transitionStep,
} from "../../src/core/step_contract.js";

test("persists and resumes a manual checkpoint without replaying unsafe state", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-provisioning-"));
  const runContext = createRunContext({
    providerId: "fixture-sandbox-console",
    flowId: "fixture-existing-resource-check",
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.fixture",
    workspaceId: "wk-local-fixture",
    evidenceRoot: path.join(rootDir, "evidence"),
  });
  const checkpoint = createManualCheckpoint({
    checkpointId: "checkpoint-001",
    stepId: "step-002",
    reason: "MFA",
    prompt: "Complete the MFA challenge before resuming the provider flow.",
    expectedSignals: ["Security prompt cleared"],
    reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
  });
  const openStep = attachManualCheckpoint(
    transitionStep(
      createPendingStep({
        stepId: "step-002",
        title: "Await provider security challenge",
      }),
      "RUNNING",
      "Provider challenge appeared",
    ),
    checkpoint,
  );

  const store = new FileResumeStore(rootDir);
  const firstSnapshot = await store.saveSnapshot({
    runContext: summarizeRunContext(runContext),
    steps: [openStep],
    checkpoint,
    browserStorageStateRef: "vault://resume/run_fixture/storage-state",
    notes: ["Checkpoint opened"],
  });

  expect(firstSnapshot.revision).toBe(1);
  expect(firstSnapshot.checkpoint?.status).toBe("OPEN");

  const resumed = await store.markCheckpointResumed(
    runContext.runId,
    checkpoint.checkpointId,
    "ops.fixture",
    "MFA challenge approved",
  );

  expect(resumed.revision).toBe(2);
  expect(resumed.checkpoint?.status).toBe("RESUMED");
  expect(resumed.checkpoint?.resumeHistory).toHaveLength(1);
  expect(resumed.steps[0].status).toBe("RUNNING");
  expect(resumed.steps[0].manualCheckpoint).toBeNull();
  expect(resumed.steps[0].history.at(-1)).toMatchObject({
    status: "RUNNING",
    reason: "Resumed after manual checkpoint checkpoint-001",
  });

  const latestRaw = await readFile(
    path.join(rootDir, runContext.runId, "latest.json"),
    "utf8",
  );
  expect(JSON.parse(latestRaw)).toMatchObject({
    revision: 2,
    checkpoint: { status: "RESUMED" },
  });
});
