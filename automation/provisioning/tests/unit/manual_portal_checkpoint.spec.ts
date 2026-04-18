import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  assertManualCheckpointArtifactsSanitized,
  createBlockedPortalResumePolicy,
  createCheckpointRedactionPolicy,
  createManualCheckpointReasonCodes,
  createPortalCheckpointAtlasViewModel,
  createRecommendedManualCheckpointRecordTemplate,
  detectCheckpointReasonCodeFromText,
  validateBlockedPortalResumePolicy,
  validateCheckpointRedactionPolicy,
  validateManualCheckpointReasonCodes,
  validateManualPortalCheckpointRecord,
  type BlockedPortalResumePolicy,
  type CheckpointRedactionPolicy,
  type ManualCheckpointReasonCodes,
  type ManualPortalCheckpointRecord,
  type PortalCheckpointAtlasViewModel,
} from "../../src/providers/shared/flows/capture_manual_checkpoint_evidence.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(
    await readFile(path.join(repoRoot, ...segments), "utf8"),
  ) as T;
}

test("checked-in manual checkpoint policy pack and atlas match the builders", async () => {
  const reasonCodes = await readJson<ManualCheckpointReasonCodes>([
    "config",
    "provisioning",
    "manual_checkpoint_reason_codes.json",
  ]);
  const resumePolicy = await readJson<BlockedPortalResumePolicy>([
    "config",
    "provisioning",
    "blocked_portal_resume_policy.json",
  ]);
  const redactionPolicy = await readJson<CheckpointRedactionPolicy>([
    "config",
    "provisioning",
    "checkpoint_redaction_policy.json",
  ]);
  const checkpointTemplate = await readJson<ManualPortalCheckpointRecord>([
    "data",
    "provisioning",
    "manual_checkpoint_record.template.json",
  ]);
  const sampleRun = await readJson<{
    portalCheckpointAtlas: PortalCheckpointAtlasViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(reasonCodes).toEqual(createManualCheckpointReasonCodes());
  expect(resumePolicy).toEqual(createBlockedPortalResumePolicy());
  expect(redactionPolicy).toEqual(createCheckpointRedactionPolicy());
  expect(checkpointTemplate).toEqual(createRecommendedManualCheckpointRecordTemplate());
  expect(sampleRun.portalCheckpointAtlas).toEqual(
    createPortalCheckpointAtlasViewModel(),
  );
});

test("manual checkpoint pack fails closed on unknown challenges and rejects sensitive persistence", () => {
  const reasonCodes = createManualCheckpointReasonCodes();
  const resumePolicy = createBlockedPortalResumePolicy();
  const redactionPolicy = createCheckpointRedactionPolicy();
  const checkpointTemplate = createRecommendedManualCheckpointRecordTemplate();

  validateManualCheckpointReasonCodes(reasonCodes);
  validateBlockedPortalResumePolicy(resumePolicy);
  validateCheckpointRedactionPolicy(redactionPolicy);
  validateManualPortalCheckpointRecord(checkpointTemplate);

  expect(
    detectCheckpointReasonCodeFromText(
      "A provider-defined challenge gate is active and requires review before continuing.",
    ),
  ).toBe("UNKNOWN_CHALLENGE_REVIEW_REQUIRED");

  expect(() =>
    assertManualCheckpointArtifactsSanitized(
      {
        checkpointTemplate,
        leakedCopy: "Use code 483920 sent to ops@example.invalid",
      },
      ["483920", "ops@example.invalid"],
    ),
  ).toThrow(/must not persist sensitive value/i);
});
