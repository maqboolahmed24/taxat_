import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildRestorePrivacyReconciliationContract } from "../../../backend-recovery/src/index.ts";
import {
  assembleReleaseVerificationManifestAssemblyContract,
  assembleSchemaBundleCompatibilityGateContract,
  bindRestoreDrillIntoReleaseEvidence,
  buildRestoreDrillResult,
  buildSchemaReaderWindowContract,
  deriveCandidateIdentityContract,
  deriveReleaseGateBindings,
  RELEASE_VERIFICATION_MANIFEST_GATE_ORDER,
  validateRestoreDrillPromotionReadiness,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseGateBindingEvidenceInput,
  type ReleaseVerificationGateName,
  type ReleaseVerificationGateStatus,
} from "../index.ts";

const restoreDrillId = "restore-drill://pc0224/promotion";
const checkpointRef = "recovery-checkpoint://pc0224/promotion";

function candidate() {
  return deriveCandidateIdentityContract({
    artifact_digest:
      "sha256:pc0224promotion22222222222222222222222222222222222222222222222",
    build_artifact_ref: "build://pc0224/promotion",
    candidate_environment_ref: "candidate-env://pc0224/promotion",
    config_bundle_hash: "config-bundle-hash.pc0224.promotion",
    enabled_provider_profile_refs: ["provider.hmrc.it", "provider.hmrc.vat"],
    migration_plan_ref_or_null: null,
    schema_bundle_hash: "schema-bundle-hash.pc0224.promotion",
    supported_client_window_ref_or_null: "client-window://pc0224/promotion",
  });
}

function readerWindow(candidateIdentity: ReleaseCandidateIdentityContractRecord) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://pc0224/promotion",
    protected_historical_schema_bundle_hashes: [],
    supported_reader_schema_bundle_hashes: [candidateIdentity.schema_bundle_hash],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
  });
}

function privacyContract(input: {
  state?: "PENDING_RECONCILIATION" | "RECONCILED_NO_COMPENSATION_REQUIRED";
} = {}) {
  const state = input.state ?? "RECONCILED_NO_COMPENSATION_REQUIRED";
  return buildRestorePrivacyReconciliationContract({
    audit_chain_continuity_ref: "audit-chain://pc0224/promotion",
    audit_chain_continuity_state: state === "PENDING_RECONCILIATION" ? "FAILED" : "VERIFIED",
    checkpoint_ref: checkpointRef,
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
    privacy_reconciliation_outcome_ref: "privacy-reconciliation://pc0224/promotion",
    privacy_reconciliation_state: state,
    reconciliation_decided_at_or_null:
      state === "PENDING_RECONCILIATION" ? null : "2026-05-05T18:00:00Z",
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
              "privacy-scan://pc0224/promotion-clean",
            resurrected_data_posture: "NONE_DETECTED",
            resurrected_subject_count_or_null: 0,
          },
    restore_drill_ref: restoreDrillId,
  });
}

function restoreResult(input: {
  outcome?: "PASSED" | "FAILED" | "QUARANTINED";
  authority_binding_revalidation_verified?: boolean;
} = {}) {
  const candidateIdentity = candidate();
  return buildRestoreDrillResult({
    audit_continuity_verified: true,
    authority_binding_revalidation_verified:
      input.authority_binding_revalidation_verified ?? true,
    authority_rebuild_verified:
      input.authority_binding_revalidation_verified === false ? false : true,
    candidate_identity_contract: candidateIdentity,
    checkpoint_ref: checkpointRef,
    drill_report_ref: "restore-drill-report://pc0224/promotion",
    drill_scope: "CURRENT_RELEASE_CANDIDATE",
    executed_at: "2026-05-05T18:05:00Z",
    failure_reason_codes:
      input.outcome === "FAILED" || input.outcome === "QUARANTINED"
        ? ["AUTHORITY_BINDING_REVALIDATION_FAILED"]
        : [],
    outcome: input.outcome ?? "PASSED",
    privacy_reconciliation_contract: privacyContract(),
    privacy_reconciliation_verified: true,
    queue_rebuild_verified: true,
    restore_drill_id: restoreDrillId,
    schema_reader_window_contract: readerWindow(candidateIdentity),
  });
}

function greenGateEvidence(
  restoreEvidence: ReleaseGateBindingEvidenceInput,
): ReleaseGateBindingEvidenceInput[] {
  return RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.map((gateName) => {
    if (gateName === "restore_drill") {
      return restoreEvidence;
    }
    const status = "GREEN" satisfies ReleaseVerificationGateStatus;
    return {
      admissibility_ref: `gate-admissibility://pc0224/${gateName}`,
      admissibility_state: "ADMISSIBLE",
      executed_at: "2026-05-05T18:10:00Z",
      gate_name: gateName as ReleaseVerificationGateName,
      manual_waiver_state: "NONE",
      quarantine_state: "NONE",
      result_ref: `verification-suite-result://pc0224/${gateName}`,
      status,
    };
  });
}

test("binds passed restore drill evidence into suite, admissibility, and manifest companion refs", async () => {
  const result = restoreResult();
  const candidateIdentity = result.candidate_identity_contract;
  const compatibilityGate = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: result.schema_reader_window_contract,
  });
  const binding = bindRestoreDrillIntoReleaseEvidence({
    admissibility_id: "gate-admissibility://pc0224/restore",
    evaluated_at: "2026-05-05T18:15:00Z",
    restore_drill_result: result,
    schema_bundle_compatibility_gate_contract: compatibilityGate,
    suite_result_id: "verification-suite-result://pc0224/restore",
  });
  const readiness = validateRestoreDrillPromotionReadiness(result);

  expect(binding.restore_promotion_readiness).toEqual(readiness);
  expect(binding.verification_suite_result.suite_family).toBe("RESTORE_DRILL");
  expect(binding.verification_suite_result.restore_drill_ref).toBe(restoreDrillId);
  expect(binding.verification_suite_result.restore_checkpoint_ref).toBe(checkpointRef);
  expect(binding.gate_admissibility_record.admissibility_state).toBe("ADMISSIBLE");
  expect(binding.release_gate_evidence.status).toBe("GREEN");
  await validateContractSchema(
    "verification_suite_result",
    binding.verification_suite_result,
  );
  await validateContractSchema(
    "gate_admissibility_record",
    binding.gate_admissibility_record,
  );

  const assembly = assembleReleaseVerificationManifestAssemblyContract({
    approval_ref_or_null: "approval://pc0224/release",
    canary_summary_ref_or_null: "canary-summary://pc0224/release",
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    client_compatibility_matrix_ref_or_null:
      "client-compatibility-matrix://pc0224/release",
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    decision_state: "APPROVED",
    deployment_release_ref_or_null: "deployment-release://pc0224/release",
    deterministic_golden_pack_ref_or_null:
      "deterministic-golden-pack://pc0224/release",
    enabled_provider_profile_refs: candidateIdentity.enabled_provider_profile_refs,
    executed_test_run_identifiers: [restoreDrillId],
    gate_bindings: deriveReleaseGateBindings({
      authority_sandbox_coverage_hash: "authority-sandbox-coverage-hash.pc0224",
      candidate_identity_hash: candidateIdentity.candidate_identity_hash,
      compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
      gate_evidence: greenGateEvidence(binding.release_gate_evidence),
    }),
    migration_ledger_refs: [],
    migration_mode: "NO_MIGRATION",
    migration_plan_ref_or_null: null,
    restore_checkpoint_ref_or_null: readiness.restore_checkpoint_ref,
    restore_drill_ref_or_null: readiness.restore_drill_ref,
    superseded_by_verification_manifest_ref_or_null: null,
    supported_client_window_ref:
      candidateIdentity.supported_client_window_ref_or_null!,
  });

  await validateContractSchema(
    "release_verification_manifest_assembly_contract",
    assembly,
  );
});

test("binds failed restore drill evidence as an inadmissible red release gate", async () => {
  const result = restoreResult({
    authority_binding_revalidation_verified: false,
    outcome: "FAILED",
  });
  const compatibilityGate = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: result.candidate_identity_contract,
    schema_reader_window_contract: result.schema_reader_window_contract,
  });
  const binding = bindRestoreDrillIntoReleaseEvidence({
    admissibility_id: "gate-admissibility://pc0224/restore-failed",
    evaluated_at: "2026-05-05T18:20:00Z",
    restore_drill_result: result,
    schema_bundle_compatibility_gate_contract: compatibilityGate,
    suite_result_id: "verification-suite-result://pc0224/restore-failed",
  });

  expect(binding.restore_promotion_readiness).toBeNull();
  expect(binding.verification_suite_result.result_state).toBe("FAILED");
  expect(binding.gate_admissibility_record.admissibility_state).toBe("INADMISSIBLE");
  expect(binding.gate_admissibility_record.reason_codes).toContain(
    "AUTHORITY_BINDING_REVALIDATION_FAILED",
  );
  expect(binding.release_gate_evidence.status).toBe("RED");
  await validateContractSchema(
    "verification_suite_result",
    binding.verification_suite_result,
  );
  await validateContractSchema(
    "gate_admissibility_record",
    binding.gate_admissibility_record,
  );
});
