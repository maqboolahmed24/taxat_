import { expect, test } from "@playwright/test";

import {
  REQUIRED_MANUAL_CHECKPOINT_REASON_CODES,
  createBlockedPortalResumePolicy,
  createCheckpointRedactionPolicy,
} from "../../src/providers/shared/flows/capture_manual_checkpoint_evidence.js";

test("blocked portal resume policy covers every required reason code with explicit fail-closed rules", () => {
  const resumePolicy = createBlockedPortalResumePolicy();

  REQUIRED_MANUAL_CHECKPOINT_REASON_CODES.forEach((reasonCode) => {
    expect(
      resumePolicy.policy_rows.some((row) =>
        row.applies_to_reason_codes.includes(reasonCode),
      ),
    ).toBe(true);
  });

  resumePolicy.policy_rows.forEach((row) => {
    expect(row.selector_drift_check_requirement).toBe("REQUIRED");
    expect(row.safe_noop_verification_step.length).toBeGreaterThan(10);
    expect(row.forbidden_actions.length).toBeGreaterThan(0);
  });
});

test("checkpoint redaction policy suppresses traces and keeps browser storage reference-only", () => {
  const redactionPolicy = createCheckpointRedactionPolicy();

  expect(
    redactionPolicy.rule_rows.find(
      (row) => row.artifact_kind === "TRACE_REFERENCE",
    )?.capture_mode,
  ).toBe("SUPPRESSED");
  expect(
    redactionPolicy.rule_rows.find(
      (row) => row.artifact_kind === "BROWSER_STORAGE",
    )?.capture_mode,
  ).toBe("REFERENCE_ONLY");
  expect(
    redactionPolicy.rule_rows.find(
      (row) => row.artifact_kind === "DOM_SNAPSHOT",
    )?.capture_mode,
  ).toBe("HASH_ONLY");
});
