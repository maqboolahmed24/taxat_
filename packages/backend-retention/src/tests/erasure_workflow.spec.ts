import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  applyLegalHold,
  applyRetentionPolicy,
  deriveErasureEligibility,
  executeErasureOrPseudonymisation,
  releaseLegalHold,
  type RetentionLifecycleApplicationInput,
  type RetentionPolicySource,
} from "../index.ts";

const erasablePolicy: RetentionPolicySource = {
  minimum_retention_days: 1,
  policy_ref: "retention-basis://pc0210/erasable",
  policy_retention_days: 1,
  pseudonymisation_mode: "PSEUDONYMIZE_ALLOWED_AFTER_EXPIRY",
  retention_class: "regulated_record",
};

function retentionInput(
  overrides: Partial<RetentionLifecycleApplicationInput> = {},
): RetentionLifecycleApplicationInput {
  return {
    anchor_timestamp: "2020-01-01T09:00:00Z",
    artifact_ref: "source-record://pc0210/client-source",
    erasure_decided_at: "2030-01-01T09:00:00Z",
    object_class: "SOURCE_RECORD",
    observed_at: "2030-01-01T09:01:00Z",
    policy: erasablePolicy,
    tenant_id: "tenant.pc0210",
    ...overrides,
  };
}

test("unresolved legal hold blocks erasure even when the retention window is satisfied", async () => {
  const active = applyRetentionPolicy(retentionInput());
  const held = applyLegalHold({
    artifact_retention: active.artifact_retention,
    changed_at: "2030-01-01T09:02:00Z",
    hold_ref: "legal-hold://pc0210/open-enquiry",
    next_checkpoint_at: "2030-01-02T09:02:00Z",
    retention_tag: active.retention_tag,
    workflow_item_refs: ["workflow://pc0210/check-hold"],
  });

  const decision = deriveErasureEligibility({
    artifact_retention: held.artifact_retention,
    requested_at: "2030-01-01T09:03:00Z",
    retention_tag: held.retention_tag,
  });

  expect(decision).toMatchObject({
    eligibility_code: "BLOCKED_LEGAL_HOLD",
    lawful_action: "BLOCK",
    legal_hold_ref: "legal-hold://pc0210/open-enquiry",
  });
  await validateContractSchema("retention_tag", held.retention_tag);
  await validateContractSchema("artifact_retention", held.artifact_retention);
});

test("unmet minimum retention blocks erasure even when policy expiry has passed", () => {
  const retained = applyRetentionPolicy(
    retentionInput({
      anchor_timestamp: "2030-01-01T09:00:00Z",
      erasure_decided_at: "2030-01-06T09:00:00Z",
      observed_at: "2030-01-06T09:01:00Z",
      policy: {
        ...erasablePolicy,
        minimum_retention_days: 10,
        policy_retention_days: 1,
      },
    }),
  );
  const decision = deriveErasureEligibility({
    artifact_retention: retained.artifact_retention,
    requested_at: "2030-01-06T09:02:00Z",
    retention_tag: retained.retention_tag,
  });

  expect(decision.eligibility_code).toBe("BLOCKED_MINIMUM_RETENTION");
  expect(decision.blocking_reason_codes).toContain("STATUTORY_MINIMUM_RETENTION_UNMET");
});

test("legal-hold release publishes preview posture before destructive action", async () => {
  const active = applyRetentionPolicy(retentionInput());
  const held = applyLegalHold({
    artifact_retention: active.artifact_retention,
    changed_at: "2030-01-01T09:02:00Z",
    hold_ref: "legal-hold://pc0210/release-preview",
    next_checkpoint_at: "2030-01-02T09:02:00Z",
    retention_tag: active.retention_tag,
    workflow_item_refs: ["workflow://pc0210/hold-release"],
  });
  const released = releaseLegalHold({
    artifact_retention: held.artifact_retention,
    changed_at: "2030-01-01T09:04:00Z",
    release_preview_ref: "legal-hold-release-preview://pc0210/release-preview",
    retention_tag: held.retention_tag,
  });

  expect(released.release_preview).toMatchObject({
    action_posture: "RELEASE_PREVIEW_REQUIRED",
    eligible_after_release: true,
    retained_hold_ref: "legal-hold://pc0210/release-preview",
  });
  expect(released.artifact_retention.lifecycle_state).toBe("ACTIVE");
  expect(released.artifact_retention.erasure_request_ref).toBeNull();
  await validateContractSchema("retention_tag", released.retention_tag);
  await validateContractSchema("artifact_retention", released.artifact_retention);
});

test("executes delete only after durable action result and emits schema-valid proof", async () => {
  const active = applyRetentionPolicy(retentionInput());

  expect(() =>
    executeErasureOrPseudonymisation({
      artifact_retention: active.artifact_retention,
      created_at: "2030-01-01T09:05:00Z",
      erasure_action_ref: "erasure-action://pc0210/delete",
      erasure_request_ref: "erasure-request://pc0210/delete",
      manifest_id: "manifest-pc0210",
      requested_at: "2030-01-01T09:03:00Z",
      retention_tag: active.retention_tag,
    }),
  ).toThrow(/durable action result/i);

  const completed = executeErasureOrPseudonymisation({
    action_completed_at: "2030-01-01T09:04:00Z",
    action_result_ref: "erasure-result://pc0210/delete-durable",
    artifact_retention: active.artifact_retention,
    created_at: "2030-01-01T09:05:00Z",
    erasure_action_ref: "erasure-action://pc0210/delete",
    erasure_request_ref: "erasure-request://pc0210/delete",
    manifest_id: "manifest-pc0210",
    requested_at: "2030-01-01T09:03:00Z",
    retention_tag: active.retention_tag,
  });

  expect(completed.execution_state).toBe("COMPLETED");
  expect(completed.artifact_retention.lifecycle_state).toBe("ERASED");
  expect(completed.artifact_retention.erasure_proof_ref).toBe(
    completed.erasure_proof.erasure_proof_id,
  );
  await validateContractSchema("erasure_proof", completed.erasure_proof);
  await validateContractSchema("artifact_retention", completed.artifact_retention);
});

test("routes proof-preserving erasure requests to pseudonymisation with limitation semantics", async () => {
  const retained = applyRetentionPolicy(
    retentionInput({
      limitation_behavior: "PSEUDONYMISED_SURVIVAL",
      limitation_reason_codes: ["PSEUDONYMISED_PROOF_SURVIVES"],
      proof_preservation_basis_ref: "proof-preservation://pc0210/append-only-proof",
    }),
  );
  const completed = executeErasureOrPseudonymisation({
    action_completed_at: "2030-01-01T09:04:00Z",
    action_result_ref: "erasure-result://pc0210/pseudonymise-durable",
    artifact_retention: retained.artifact_retention,
    created_at: "2030-01-01T09:05:00Z",
    erasure_action_ref: "erasure-action://pc0210/pseudonymise",
    erasure_request_ref: "erasure-request://pc0210/pseudonymise",
    manifest_id: "manifest-pc0210",
    proof_preservation_preconditions_satisfied: true,
    requested_at: "2030-01-01T09:03:00Z",
    retention_tag: retained.retention_tag,
  });

  expect(completed.decision.eligibility_code).toBe("ELIGIBLE_PSEUDONYMISE");
  expect(completed.artifact_retention.lifecycle_state).toBe("PSEUDONYMISED");
  expect(completed.artifact_retention.limitation_behavior).toBe("PSEUDONYMISED_SURVIVAL");
  expect(completed.decision.retained_basis_refs).toContain(
    "proof-preservation://pc0210/append-only-proof",
  );
  await validateContractSchema("erasure_proof", completed.erasure_proof);
  await validateContractSchema("artifact_retention", completed.artifact_retention);
});
