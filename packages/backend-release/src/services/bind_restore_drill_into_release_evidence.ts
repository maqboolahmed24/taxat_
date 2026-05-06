import {
  buildVerificationSuiteResult,
  type VerificationSuiteResultRecord,
} from "../models/verification_suite_result.ts";
import type { GateAdmissibilityRecordRecord } from "../models/gate_admissibility_record.ts";
import type { RestoreDrillResultRecord } from "../models/restore_drill_result.ts";
import type { SchemaBundleCompatibilityGateContractRecord } from "../models/schema_bundle_compatibility_gate_contract.ts";
import {
  evaluateGateAdmissibilityRecord,
  type EvaluateGateAdmissibilityRecordInput,
} from "./evaluate_gate_admissibility_record.ts";
import {
  validateRestoreDrillPromotionReadiness,
  type RestoreDrillPromotionReadiness,
} from "./validate_restore_drill_promotion_readiness.ts";
import type { ReleaseGateBindingEvidenceInput } from "./derive_release_gate_bindings.ts";

export type BindRestoreDrillIntoReleaseEvidenceInput = {
  restore_drill_result: RestoreDrillResultRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  suite_result_id: string;
  admissibility_id: string;
  evaluated_at: string;
  reason_codes?: string[];
};

export type RestoreDrillReleaseEvidenceBinding = {
  restore_promotion_readiness: RestoreDrillPromotionReadiness | null;
  verification_suite_result: VerificationSuiteResultRecord;
  gate_admissibility_record: GateAdmissibilityRecordRecord;
  release_gate_evidence: ReleaseGateBindingEvidenceInput;
};

function failedBasisReasonCodes(result: RestoreDrillResultRecord) {
  const reasonCodes = new Set(result.failure_reason_codes);
  if (!result.audit_continuity_verified) {
    reasonCodes.add("AUDIT_CONTINUITY_NOT_VERIFIED");
  }
  if (!result.privacy_reconciliation_verified) {
    reasonCodes.add("PRIVACY_RECONCILIATION_NOT_VERIFIED");
  }
  if (!result.queue_rebuild_verified) {
    reasonCodes.add("QUEUE_REBUILD_NOT_VERIFIED");
  }
  if (!result.authority_rebuild_verified) {
    reasonCodes.add("AUTHORITY_REBUILD_NOT_VERIFIED");
  }
  if (!result.authority_binding_revalidation_verified) {
    reasonCodes.add("AUTHORITY_BINDING_REVALIDATION_NOT_VERIFIED");
  }
  return [...reasonCodes].sort();
}

export function bindRestoreDrillIntoReleaseEvidence(
  input: BindRestoreDrillIntoReleaseEvidenceInput,
): RestoreDrillReleaseEvidenceBinding {
  const restoreResult = input.restore_drill_result;
  const readiness =
    restoreResult.outcome === "PASSED"
      ? validateRestoreDrillPromotionReadiness(restoreResult)
      : null;
  const suiteResult = buildVerificationSuiteResult({
    candidate_identity_contract: restoreResult.candidate_identity_contract,
    deterministic_golden_pack_ref: null,
    executed_at: restoreResult.executed_at,
    restore_checkpoint_ref: restoreResult.checkpoint_ref,
    restore_drill_ref: restoreResult.restore_drill_id,
    result_state: restoreResult.outcome === "PASSED" ? "PASSED" : "FAILED",
    result_summary_ref: restoreResult.drill_report_ref,
    schema_bundle_compatibility_gate_contract:
      input.schema_bundle_compatibility_gate_contract,
    schema_reader_window_contract: restoreResult.schema_reader_window_contract,
    suite_family: "RESTORE_DRILL",
    suite_result_id: input.suite_result_id,
    test_run_identifiers: [restoreResult.restore_drill_id],
  });
  const admissibilityInput: EvaluateGateAdmissibilityRecordInput = {
    admissibility_id: input.admissibility_id,
    candidate_identity_match: true,
    contract_window_consistent: true,
    evaluated_at: input.evaluated_at,
    freshness_verified: true,
    quarantine_state:
      restoreResult.outcome === "QUARANTINED" ? "FLAKE_QUARANTINED" : "NONE",
    reason_codes:
      restoreResult.outcome === "PASSED"
        ? input.reason_codes ?? []
        : [...failedBasisReasonCodes(restoreResult), ...(input.reason_codes ?? [])],
    rerun_scope_preserved: true,
    suite_result: suiteResult,
  };
  const admissibility = evaluateGateAdmissibilityRecord(admissibilityInput);
  const status = admissibility.admissibility_state === "ADMISSIBLE" ? "GREEN" : "RED";
  return {
    restore_promotion_readiness: readiness,
    verification_suite_result: suiteResult,
    gate_admissibility_record: admissibility,
    release_gate_evidence: {
      admissibility_ref: admissibility.admissibility_id,
      admissibility_state: admissibility.admissibility_state,
      executed_at: suiteResult.executed_at,
      gate_name: "restore_drill",
      manual_waiver_state: "NONE",
      quarantine_state: restoreResult.outcome === "QUARANTINED" ? "QUARANTINED" : "NONE",
      result_ref: suiteResult.suite_result_id,
      status,
    },
  };
}
