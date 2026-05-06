import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildRestorePrivacyReconciliationContract } from "../../../backend-recovery/src/index.ts";
import {
  assertRestoreDrillResultRecord,
  buildRestoreDrillResult,
  buildSchemaReaderWindowContract,
  deriveCandidateIdentityContract,
  deriveRestoreVerificationHash,
  recordRestoreDrillResult,
  RestoreDrillResultModelError,
  RestoreDrillResultRepository,
  validateRestoreDrillPromotionReadiness,
  type ReleaseCandidateIdentityContractRecord,
} from "../index.ts";

const restoreDrillId = "restore-drill://pc0224/control-plane";
const checkpointRef = "recovery-checkpoint://pc0224/control-plane";

function candidate(input: {
  id?: string;
  enabled_provider_profile_refs?: string[];
} = {}) {
  const id = input.id ?? "primary";
  return deriveCandidateIdentityContract({
    artifact_digest: `sha256:pc0224${id.padEnd(58, "2")}`,
    build_artifact_ref: `build://pc0224/${id}`,
    candidate_environment_ref: `candidate-env://pc0224/${id}`,
    config_bundle_hash: `config-bundle-hash.pc0224.${id}`,
    enabled_provider_profile_refs: input.enabled_provider_profile_refs ?? [
      "provider.hmrc.it",
      "provider.hmrc.vat",
    ],
    migration_plan_ref_or_null: null,
    schema_bundle_hash: `schema-bundle-hash.pc0224.${id}`,
    supported_client_window_ref_or_null: null,
  });
}

function readerWindow(candidateIdentity: ReleaseCandidateIdentityContractRecord) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0224/${candidateIdentity.build_artifact_ref}`,
    protected_historical_schema_bundle_hashes: [],
    supported_reader_schema_bundle_hashes: [candidateIdentity.schema_bundle_hash],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
  });
}

function privacyContract(input: {
  checkpoint_ref?: string;
  restore_drill_ref?: string;
  state?:
    | "PENDING_RECONCILIATION"
    | "RECONCILED_NO_COMPENSATION_REQUIRED";
} = {}) {
  const state = input.state ?? "RECONCILED_NO_COMPENSATION_REQUIRED";
  return buildRestorePrivacyReconciliationContract({
    audit_chain_continuity_ref: "audit-chain://pc0224/restore",
    audit_chain_continuity_state: state === "PENDING_RECONCILIATION" ? "FAILED" : "VERIFIED",
    checkpoint_ref: input.checkpoint_ref ?? checkpointRef,
    compensating_re_erasure_workflow_or_null: null,
    limitation_pass:
      state === "PENDING_RECONCILIATION"
        ? {
            enquiry_limitation_state: "FAILED",
            reopen_access_state: "BLOCKED",
            replay_limitation_state: "FAILED",
          }
        : {
            enquiry_limitation_state: "VERIFIED",
            reopen_access_state: "READY_FOR_REOPEN",
            replay_limitation_state: "VERIFIED",
          },
    privacy_reconciliation_outcome_ref: "privacy-reconciliation://pc0224/outcome",
    privacy_reconciliation_state: state,
    reconciliation_decided_at_or_null:
      state === "PENDING_RECONCILIATION" ? null : "2026-05-05T17:20:00Z",
    resurrected_data:
      state === "PENDING_RECONCILIATION"
        ? {
            evaluated_erasure_or_pseudonymisation_refs: [],
            resurrected_data_detection_basis_ref_or_null: null,
            resurrected_data_posture: "UNKNOWN_UNTIL_RECONCILED",
            resurrected_subject_count_or_null: null,
          }
        : {
            evaluated_erasure_or_pseudonymisation_refs: [],
            resurrected_data_detection_basis_ref_or_null:
              "privacy-scan://pc0224/clean",
            resurrected_data_posture: "NONE_DETECTED",
            resurrected_subject_count_or_null: 0,
          },
    restore_drill_ref: input.restore_drill_ref ?? restoreDrillId,
  });
}

function passedRestoreDrillResult(input: {
  candidate_identity_contract?: ReleaseCandidateIdentityContractRecord;
} = {}) {
  const candidateIdentity = input.candidate_identity_contract ?? candidate();
  return buildRestoreDrillResult({
    audit_continuity_verified: true,
    authority_binding_revalidation_verified: true,
    authority_rebuild_verified: true,
    candidate_identity_contract: candidateIdentity,
    checkpoint_ref: checkpointRef,
    drill_report_ref: "restore-drill-report://pc0224/control-plane",
    drill_scope: "CURRENT_RELEASE_CANDIDATE",
    executed_at: "2026-05-05T17:30:00Z",
    failure_reason_codes: [],
    outcome: "PASSED",
    privacy_reconciliation_contract: privacyContract(),
    privacy_reconciliation_verified: true,
    queue_rebuild_verified: true,
    restore_drill_id: restoreDrillId,
    schema_reader_window_contract: readerWindow(candidateIdentity),
  });
}

test("builds schema-valid passed restore drill evidence with canonical candidate binding", async () => {
  const result = passedRestoreDrillResult();

  expect(result.enabled_provider_profile_refs).toEqual([
    "provider.hmrc.it",
    "provider.hmrc.vat",
  ]);
  expect(validateRestoreDrillPromotionReadiness(result)).toMatchObject({
    promotion_eligible: true,
    restore_checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillId,
  });
  expect(deriveRestoreVerificationHash(result)).toMatch(/^[0-9a-f]{64}$/);
  await validateContractSchema("restore_drill_result", result);
});

test("fails closed when candidate identity or schema reader-window scope drifts", () => {
  const result = passedRestoreDrillResult();

  expect(() =>
    assertRestoreDrillResultRecord({
      ...result,
      candidate_identity_contract: {
        ...result.candidate_identity_contract,
        schema_bundle_hash: "schema-bundle-hash.pc0224.drift",
      },
    }),
  ).toThrow(RestoreDrillResultModelError);
  expect(() =>
    assertRestoreDrillResultRecord({
      ...result,
      schema_reader_window_contract: {
        ...result.schema_reader_window_contract,
        writer_schema_bundle_hash: "schema-bundle-hash.pc0224.stale",
      },
    }),
  ).toThrow(/writer_schema_bundle_hash/);
});

test("fails closed for non-canonical provider and failure-reason arrays", () => {
  const result = passedRestoreDrillResult();

  expect(() =>
    assertRestoreDrillResultRecord({
      ...result,
      enabled_provider_profile_refs: [
        "provider.hmrc.vat",
        "provider.hmrc.it",
      ],
    }),
  ).toThrow(/canonical order/);
  expect(() =>
    assertRestoreDrillResultRecord({
      ...result,
      failure_reason_codes: ["RESTORE_QUEUE_FAILED"],
    }),
  ).toThrow(/PASSED restore drills must not carry failure_reason_codes/);

  const failed = {
    ...result,
    audit_continuity_verified: false,
    failure_reason_codes: ["Z_FAILURE", "A_FAILURE"],
    outcome: "FAILED",
  };
  expect(() => assertRestoreDrillResultRecord(failed)).toThrow(/canonical order/);
});

test("requires final reopen-safe privacy reconciliation for passed drills", () => {
  const candidateIdentity = candidate({ id: "blocked-privacy" });

  expect(() =>
    buildRestoreDrillResult({
      audit_continuity_verified: true,
      authority_binding_revalidation_verified: true,
      authority_rebuild_verified: true,
      candidate_identity_contract: candidateIdentity,
      checkpoint_ref: checkpointRef,
      drill_report_ref: "restore-drill-report://pc0224/blocked-privacy",
      drill_scope: "CURRENT_RELEASE_CANDIDATE",
      executed_at: "2026-05-05T17:35:00Z",
      failure_reason_codes: [],
      outcome: "PASSED",
      privacy_reconciliation_contract: privacyContract({
        state: "PENDING_RECONCILIATION",
      }),
      privacy_reconciliation_verified: true,
      queue_rebuild_verified: true,
      restore_drill_id: restoreDrillId,
      schema_reader_window_contract: readerWindow(candidateIdentity),
    }),
  ).toThrow(/final, reopen-ready privacy reconciliation/);
});

test("non-passed restore drills expose failed basis and schema-valid reasons", async () => {
  const candidateIdentity = candidate({ id: "failed" });
  const result = buildRestoreDrillResult({
    audit_continuity_verified: true,
    authority_binding_revalidation_verified: false,
    authority_rebuild_verified: false,
    candidate_identity_contract: candidateIdentity,
    checkpoint_ref: checkpointRef,
    drill_report_ref: "restore-drill-report://pc0224/failed",
    drill_scope: "DR_FAILOVER_FAILBACK",
    executed_at: "2026-05-05T17:40:00Z",
    failure_reason_codes: ["AUTHORITY_BINDING_REVALIDATION_FAILED"],
    outcome: "QUARANTINED",
    privacy_reconciliation_contract: privacyContract(),
    privacy_reconciliation_verified: true,
    queue_rebuild_verified: true,
    restore_drill_id: restoreDrillId,
    schema_reader_window_contract: readerWindow(candidateIdentity),
  });

  await validateContractSchema("restore_drill_result", result);
  expect(() =>
    assertRestoreDrillResultRecord({
      ...result,
      authority_binding_revalidation_verified: true,
      authority_rebuild_verified: true,
      failure_reason_codes: [],
    }),
  ).toThrow(/non-passed restore drills/);
});

test("repository persists immutable checkpoint-bound restore drill results", async () => {
  const repository = new RestoreDrillResultRepository({
    validate_contract_schema: validateContractSchema,
  });
  const result = await recordRestoreDrillResult({
    ...passedRestoreDrillResult(),
    repository,
    persisted_at: "2026-05-05T17:45:00Z",
  });

  const idempotent = await repository.persistRestoreDrillResult({
    persisted_at: "2026-05-05T17:50:00Z",
    restore_drill_result: result,
  });

  expect(idempotent.persisted_at).toBe("2026-05-05T17:45:00Z");
  await expect(
    repository.listRestoreDrillResults({
      checkpoint_ref: checkpointRef,
      outcome: "PASSED",
    }),
  ).resolves.toHaveLength(1);
});
