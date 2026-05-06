import { expect, test } from "@playwright/test";

import {
  buildFailureResolutionContract,
  buildRemediationTask,
} from "../../../backend-workflow/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  applyRetentionPolicy,
  bindRetentionToErrorAndRemediation,
  propagateLimitationAndExpiry,
  type RetentionLifecycleApplicationInput,
  type RetentionPolicySource,
} from "../index.ts";

const basePolicy: RetentionPolicySource = {
  policy_ref: "retention-basis://pc0209/artifact-default",
  retention_class: "derived_artifact",
  minimum_retention_days: 365,
  policy_retention_days: 730,
  pseudonymisation_mode: "PSEUDONYMIZE_ALLOWED_AFTER_EXPIRY",
};

function applicationInput(
  overrides: Partial<RetentionLifecycleApplicationInput> = {},
): RetentionLifecycleApplicationInput {
  return {
    anchor_timestamp: "2026-05-01T09:00:00Z",
    artifact_ref: "proof-bundle://pc0209/retention-limited",
    erasure_decided_at: "2026-05-05T09:00:00Z",
    object_class: "PROOF_BUNDLE",
    observed_at: "2026-05-05T09:05:00Z",
    policy: basePolicy,
    tenant_id: "tenant.pc0209",
    ...overrides,
  };
}

test("derives ArtifactRetention bound to the canonical RetentionTag", async () => {
  const applied = applyRetentionPolicy(applicationInput());

  expect(applied.artifact_retention.lifecycle_state).toBe("ACTIVE");
  expect(applied.artifact_retention.retention_tag_ref).toBe(
    applied.retention_tag.retention_tag_id,
  );
  expect(applied.artifact_retention.effective_expiry_at).toBe(
    applied.retention_tag.effective_expiry_at,
  );
  await validateContractSchema("retention_tag", applied.retention_tag);
  await validateContractSchema("artifact_retention", applied.artifact_retention);
});

test("legal-hold lifecycle requires bounded follow-up refs and checkpoint", async () => {
  const holdInput = applicationInput({
    legal_hold: {
      changed_at: "2026-05-02T09:00:00Z",
      hold_ref: "legal-hold://pc0209/check-open-enquiry",
      state: "ACTIVE",
    },
  });

  expect(() => applyRetentionPolicy(holdInput)).toThrow(/LEGAL_HOLD requires/i);

  const applied = applyRetentionPolicy({
    ...holdInput,
    next_checkpoint_at: "2026-05-06T09:00:00Z",
    workflow_item_refs: ["workflow://pc0209/check-hold"],
  });

  expect(applied.artifact_retention.lifecycle_state).toBe("LEGAL_HOLD");
  expect(applied.artifact_retention.hold_ref).toBe(
    "legal-hold://pc0209/check-open-enquiry",
  );
  await validateContractSchema("artifact_retention", applied.artifact_retention);
});

test("propagates limitation semantics and quantitative survivability deterministically", async () => {
  const applied = applyRetentionPolicy(
    applicationInput({
      limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
      limitation_reason_codes: ["RETENTION_LIMITED_DECISIVE_PATH"],
    }),
  );
  const [binding] = propagateLimitationAndExpiry({
    artifact_retention: applied.artifact_retention,
    decision_information_ratio: 0.6,
    projection_information_ratio: 0.3,
    retention_tag: applied.retention_tag,
    target_refs: ["enquiry-pack://pc0209/limited"],
  });

  expect(applied.artifact_retention.lifecycle_state).toBe("LIMITED");
  expect(binding?.limitation_behavior).toBe("SURVIVE_WITH_LIMITATION_NOTES");
  expect(binding?.quantitative_semantics).toMatchObject({
    projection_fidelity: 0.5,
    silent_ambiguity: 0,
    support_posture: "REVIEW_ONLY",
    survivability: 0.6,
  });
  await validateContractSchema("retention_tag", applied.retention_tag);
  await validateContractSchema("artifact_retention", applied.artifact_retention);
});

test("silent limitation ambiguity and projection-ratio inflation fail closed", () => {
  const applied = applyRetentionPolicy(applicationInput());

  expect(() =>
    propagateLimitationAndExpiry({
      artifact_retention: applied.artifact_retention,
      decision_information_ratio: 0.5,
      projection_information_ratio: 0.5,
      retention_tag: applied.retention_tag,
      target_refs: ["proof-bundle://pc0209/silent-limitation"],
    }),
  ).toThrow(/silent limitation ambiguity/i);

  expect(() =>
    propagateLimitationAndExpiry({
      artifact_retention: applied.artifact_retention,
      decision_information_ratio: 0.4,
      projection_information_ratio: 0.6,
      retention_tag: applied.retention_tag,
      target_refs: ["proof-bundle://pc0209/projection-invalid"],
    }),
  ).toThrow(/PRIVACY_PROJECTION_RATIO_INVALID/i);
});

test("proof-preservation basis survives pseudonymised artifact retention", async () => {
  const applied = applyRetentionPolicy(
    applicationInput({
      erasure_action_ref: "erasure-action://pc0209/pseudonymise",
      erasure_proof_ref: "erasure-proof://pc0209/pseudonymise",
      erasure_request_ref: "erasure-request://pc0209/pseudonymise",
      limitation_behavior: "PSEUDONYMISED_SURVIVAL",
      limitation_reason_codes: ["PSEUDONYMISED_PROOF_SURVIVES"],
      proof_preservation_basis_ref: "proof-preservation://pc0209/append-only",
    }),
  );
  const [binding] = propagateLimitationAndExpiry({
    artifact_retention: applied.artifact_retention,
    decision_information_ratio: 0.3,
    projection_information_ratio: 0.15,
    retention_tag: applied.retention_tag,
    target_refs: ["proof-bundle://pc0209/pseudonymised-survival"],
  });

  expect(applied.retention_tag.erasure_eligibility).toBe("BLOCKED_PROOF_PRESERVATION");
  expect(applied.artifact_retention.lifecycle_state).toBe("PSEUDONYMISED");
  expect(binding?.retained_basis_refs).toContain(
    "proof-preservation://pc0209/append-only",
  );
  expect(binding?.quantitative_semantics.support_posture).toBe("AUDIT_OR_TOMBSTONE_ONLY");
  await validateContractSchema("retention_tag", applied.retention_tag);
  await validateContractSchema("artifact_retention", applied.artifact_retention);
});

test("limitation-only state remains distinct from erasure and pseudonymisation", () => {
  expect(() =>
    applyRetentionPolicy(
      applicationInput({
        erasure_request_ref: "erasure-request://pc0209/invalid-limited",
        lifecycle_state: "LIMITED",
        limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
        limitation_reason_codes: ["LIMITATION_ONLY"],
      }),
    ),
  ).toThrow(/LIMITED must not carry erasure/i);
});

test("retained failure and remediation objects inherit the same retention object and basis", async () => {
  const applied = applyRetentionPolicy(
    applicationInput({
      limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
      limitation_reason_codes: ["RETENTION_LIMITED_DECISIVE_PATH"],
    }),
  );
  const retainedBasisRef = applied.retention_tag.retention_basis_ref;

  const errorBinding = bindRetentionToErrorAndRemediation({
    artifact_retention: applied.artifact_retention,
    companion: {
      affected_object_refs: [],
      error_family: "RETENTION_ERROR",
      provenance_refs: [],
      remediation_task_ref: "remediation-task://pc0209/retention-follow-up",
    },
    kind: "ERROR_RECORD",
    retained_basis_ref: retainedBasisRef,
    retention_tag: applied.retention_tag,
  });
  expect(errorBinding.artifact_retention_ref).toBe(applied.artifact_retention.retention_id);
  expect(errorBinding.retention_class).toBe(applied.artifact_retention.retention_class);
  expect(errorBinding.affected_object_refs).toEqual([
    applied.artifact_retention.artifact_ref,
    retainedBasisRef,
  ]);

  const boundTaskInput = bindRetentionToErrorAndRemediation({
    artifact_retention: applied.artifact_retention,
    companion: {
      audit_refs: ["audit://pc0209/remediation/open"],
      blocking_class: "BLOCKS_ERASURE",
      created_at: "2026-05-05T09:10:00Z",
      error_id: "error-pc0209-retention",
      failure_resolution_contract: buildFailureResolutionContract({
        lifecycle_role: "REMEDIATION_TASK",
      }),
      manifest_id: "manifest-pc0209",
      owner_ref: "operator://pc0209",
      owner_type: "SERVICE_OPERATOR",
      provenance_refs: ["provenance://pc0209/root"],
      remediation_steps_ref: "remediation-steps://pc0209/check-hold",
      root_manifest_id: "manifest-root-pc0209",
      task_id: "remediation-task-pc0209-retention",
      task_type: "CHECK_RETENTION_HOLD",
      workflow_item_id: "workflow://pc0209/check-retention",
    },
    kind: "REMEDIATION_TASK",
    retained_basis_ref: retainedBasisRef,
    retention_tag: applied.retention_tag,
  });
  const task = buildRemediationTask(boundTaskInput);

  expect(task.artifact_retention_ref).toBe(applied.artifact_retention.retention_id);
  expect(task.retention_class).toBe("derived_artifact");
  expect(task.provenance_refs).toContain(retainedBasisRef);
  await validateContractSchema("remediation_task", task);

  expect(() =>
    bindRetentionToErrorAndRemediation({
      artifact_retention: applied.artifact_retention,
      companion: {
        error_family: "RETENTION_ERROR",
        remediation_task_ref: "remediation-task://pc0209/missing-basis",
      },
      kind: "ERROR_RECORD",
      retained_basis_ref: "retention-basis://pc0209/detached",
      retention_tag: applied.retention_tag,
    }),
  ).toThrow(/canonical RetentionTag basis refs/i);
});
