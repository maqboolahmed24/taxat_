import type { CanonicalScopeToken } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  buildRunManifestGateDecisionRecord,
  type RunManifestGateDecisionRecord,
} from "../../../backend-manifest/src/models/run_manifest.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type {
  ArtifactContractGateDecision,
  ArtifactValidationReasonCode,
  PresealArtifactValidationResult,
} from "../types/artifact_validation_result.ts";

const ARTIFACT_CONTRACT_REASON_PRIORITY: ArtifactValidationReasonCode[] = [
  "ARTIFACT_SCHEMA_MISSING",
  "ARTIFACT_SCHEMA_NOT_IN_BUNDLE",
  "ARTIFACT_SCHEMA_VALIDATION_FAILED",
  "ARTIFACT_VERSION_INCOMPATIBLE",
  "ARTIFACT_ENVELOPE_INCOMPLETE",
  "ARTIFACT_CONTRACT_REF_MISSING",
  "ARTIFACT_CONTRACT_HASH_MISMATCH",
  "ARTIFACT_SCHEMA_DEPRECATED_ALLOWED",
  "ARTIFACT_CONTRACTS_VALID",
];

function orderedReasonCodes(reasonCodes: readonly ArtifactValidationReasonCode[]) {
  const present = new Set(reasonCodes);
  const ordered = ARTIFACT_CONTRACT_REASON_PRIORITY.filter((code) => present.has(code));
  return ordered.length > 0 ? ordered : ["ARTIFACT_CONTRACTS_VALID" as const];
}

function explanationFor(decision: ArtifactContractGateDecision) {
  if (decision === "HARD_BLOCK") {
    return "Artifact contracts do not match the frozen schema bundle.";
  }
  if (decision === "PASS_WITH_NOTICE") {
    return "Artifact contracts pass with frozen reader-window notices.";
  }
  return "Artifact contracts match the frozen schema bundle.";
}

export function buildArtifactContractGateRecord(input: {
  decided_at: string;
  effective_scope: CanonicalScopeToken[];
  manifest_id: string;
  policy_version_ref?: string;
  prerequisite_gate_refs?: readonly string[];
  validation: PresealArtifactValidationResult;
}): RunManifestGateDecisionRecord {
  const reasonCodes = orderedReasonCodes(input.validation.reason_codes);
  const dominantReasonCode = reasonCodes[0] ?? "ARTIFACT_CONTRACTS_VALID";
  const record = buildRunManifestGateDecisionRecord({
    decided_at: input.decided_at,
    decision: input.validation.decision,
    effective_scope: input.effective_scope,
    gate_code: "ARTIFACT_CONTRACT_GATE",
    gate_stage_index: 2,
    input_artifact_refs: input.validation.input_artifact_refs,
    manifest_id: input.manifest_id,
    ...(input.policy_version_ref === undefined
      ? {}
      : { policy_version_ref: input.policy_version_ref }),
    ...(input.prerequisite_gate_refs === undefined
      ? {}
      : { prerequisite_gate_refs: [...input.prerequisite_gate_refs] }),
    reason_codes: reasonCodes,
  });

  return {
    ...record,
    blocking_dependency_refs:
      input.validation.decision === "HARD_BLOCK"
        ? normalizeCollectionStringSet(
            "artifact_contract_gate.blocking_dependency_refs",
            input.validation.issues
              .filter((issue) => issue.severity === "ERROR")
              .map((issue) => issue.artifact_ref)
              .slice(0, 8),
          )
        : [],
    decision_basis_ref: `decision-basis://${input.manifest_id}/artifact-contract-gate/${input.validation.artifact_contract_hash_recorded ?? "missing"}`,
    dominant_reason_code: dominantReasonCode,
    metrics: {
      artifact_contract_ref_count: input.validation.artifact_contract_refs_recorded.length,
      hard_issue_count: input.validation.issues.filter((issue) => issue.severity === "ERROR")
        .length,
      notice_issue_count: input.validation.issues.filter((issue) => issue.severity === "NOTICE")
        .length,
      validation_result_count: input.validation.validation_results.length,
    },
    plain_explanation: explanationFor(input.validation.decision),
    reason_codes: reasonCodes,
  };
}
