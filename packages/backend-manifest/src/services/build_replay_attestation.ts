import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ExecutionModeBoundaryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  ReplayAttestationSchemaLineage,
  type ReplayAttestation,
  type ReplayAttestationBasisDimensionResult,
  type ReplayAttestationMismatchItem,
  type ReplayAttestationOutcomeComponentResult,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RunManifestReplayClass } from "../models/run_manifest.ts";
import type { BuildReplayBasisIntegrityContractInput } from "./replay_basis_integrity_contract_builder.ts";
import { buildReplayBasisIntegrityContract } from "./replay_basis_integrity_contract_builder.ts";
import {
  classifyReplayComparison,
  type ReplayBasisValidationState,
} from "./replay_comparison_classifier.ts";

export type BuildReplayAttestationInput = {
  actual_deterministic_outcome_hash: string | null;
  actual_execution_basis_hash: string | null;
  attestation_envelope_ref?: string | null;
  auditor_summary_ref?: string | null;
  basis_dimension_results: readonly ReplayAttestationBasisDimensionResult[];
  basis_integrity_contract?: BuildReplayBasisIntegrityContractInput;
  basis_validation_state: ReplayBasisValidationState;
  compared_at: string;
  counterfactual_basis?: string | null;
  expected_deterministic_outcome_hash: string | null;
  expected_execution_basis_hash: string | null;
  manifest_id: string;
  mismatch_inventory?: readonly ReplayAttestationMismatchItem[];
  non_compliance_config_refs?: readonly string[];
  operator_summary_ref?: string | null;
  outcome_component_results: readonly ReplayAttestationOutcomeComponentResult[];
  replay_class: RunManifestReplayClass;
  replay_of_manifest_id: string;
  schema_bundle_hash?: string;
  signature_verification_state?:
    | "VERIFIED"
    | "NOT_SIGNED"
    | "VERIFICATION_MATERIAL_MISSING"
    | "SIGNATURE_INVALID";
  verification_material_refs?: readonly string[];
  writer_build_id?: string;
};

function buildExecutionModeBoundary(input: {
  counterfactual_basis: string | null;
  non_compliance_config_refs: readonly string[];
  replay_class: RunManifestReplayClass;
}): ExecutionModeBoundaryContract {
  const analysisOnly = input.replay_class === "COUNTERFACTUAL_ANALYSIS";
  const payload = {
    contract_version: "EXECUTION_MODE_BOUNDARY_V1" as const,
    run_kind: "REPLAY" as const,
    replay_class_or_null: input.replay_class,
    execution_mode: analysisOnly ? ("ANALYSIS" as const) : ("COMPLIANCE" as const),
    analysis_only: analysisOnly,
    non_compliance_config_refs: sortSetLikeStrings(input.non_compliance_config_refs),
    counterfactual_basis: input.counterfactual_basis,
    execution_posture: analysisOnly
      ? ("REPLAY_COUNTERFACTUAL" as const)
      : ("REPLAY_COMPLIANCE" as const),
    legal_effect_boundary: analysisOnly
      ? ("COUNTERFACTUAL_REPLAY_READ_ONLY" as const)
      : ("HISTORICAL_REPLAY_READ_ONLY" as const),
    disclosure_reason_codes: analysisOnly
      ? ["COUNTERFACTUAL_REPLAY_POSTURE"]
      : ["REPLAY_NON_LIVE_POSTURE"],
  };
  return {
    ...payload,
    boundary_hash: stableJsonHash(payload),
  };
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function confidenceBand(score: number): ReplayAttestation["attestation_confidence_band"] {
  if (score >= 95) {
    return "VERY_HIGH";
  }
  if (score >= 80) {
    return "HIGH";
  }
  if (score >= 60) {
    return "MODERATE";
  }
  if (score >= 30) {
    return "LOW";
  }
  return "INSUFFICIENT";
}

function confidenceFor(input: {
  basis_dimension_results: readonly ReplayAttestationBasisDimensionResult[];
  basis_validation_state: ReplayBasisValidationState;
  material_outcome_coverage: number;
  outcome_component_results: readonly ReplayAttestationOutcomeComponentResult[];
  signature_verification_state:
    | "VERIFIED"
    | "NOT_SIGNED"
    | "VERIFICATION_MATERIAL_MISSING"
    | "SIGNATURE_INVALID";
}) {
  const signatureFactor = {
    VERIFIED: 1,
    NOT_SIGNED: 0.85,
    VERIFICATION_MATERIAL_MISSING: 0.5,
    SIGNATURE_INVALID: 0,
  }[input.signature_verification_state];
  const basisTotal = input.basis_dimension_results.reduce(
    (sum, row) => sum + row.comparison_weight,
    0,
  );
  const basisUndeclared = input.basis_dimension_results
    .filter((row) => row.comparison_state === "MISMATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialRows = input.outcome_component_results.filter(
    (row) => row.materiality !== "NON_MATERIAL",
  );
  const materialTotal = materialRows.reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialUndeclared = materialRows
    .filter((row) => row.comparison_state === "MISMATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const coverageFactor = Math.min(
    ratio(
      input.basis_dimension_results
        .filter((row) => row.comparison_state !== "UNOBSERVABLE" && row.comparison_state !== "CORRUPT")
        .reduce((sum, row) => sum + row.comparison_weight, 0),
      basisTotal,
    ),
    input.material_outcome_coverage,
  );
  const undeclaredVarianceFactor =
    1 - Math.max(ratio(basisUndeclared, basisTotal), ratio(materialUndeclared, materialTotal));
  const score =
    input.basis_validation_state === "CORRUPT"
      ? 0
      : Math.min(100, Math.max(0, Math.floor(100 * signatureFactor * coverageFactor * undeclaredVarianceFactor + 0.5)));
  return {
    band: confidenceBand(score),
    score,
  };
}

function summaryFor(outcomeClass: ReplayAttestation["outcome_class"]) {
  return `Replay comparison classified as ${outcomeClass}.`;
}

function buildArtifactContract(input: {
  artifact_content_hash: string;
  replay_attestation_id: string;
  schema_bundle_hash: string;
  writer_build_id: string;
}) {
  return {
    artifact_id: input.replay_attestation_id,
    schema_id: ReplayAttestationSchemaLineage.schemaId,
    artifact_type: "ReplayAttestation",
    semantic_version: "1.0.0",
    content_hash: ReplayAttestationSchemaLineage.sourceHash,
    dialect_ref: "https://json-schema.org/draft/2020-12/schema",
    compatibility_class: "STRICT_APPEND_ONLY",
    supersedes_schema_id: null,
    writer_min_reader_version: "1.0.0",
    allowed_upgrade_kinds: ["PATCH_BACKWARD"],
    schema_bundle_hash: input.schema_bundle_hash,
    artifact_content_hash: input.artifact_content_hash,
    writer_build_id: input.writer_build_id,
  };
}

export function buildReplayAttestation(input: BuildReplayAttestationInput): ReplayAttestation {
  const counterfactualBasis =
    input.replay_class === "COUNTERFACTUAL_ANALYSIS"
      ? (input.counterfactual_basis ?? "counterfactual-basis://declared")
      : null;
  const nonComplianceConfigRefs = sortSetLikeStrings(input.non_compliance_config_refs ?? []);
  const boundary = buildExecutionModeBoundary({
    counterfactual_basis: counterfactualBasis,
    non_compliance_config_refs: nonComplianceConfigRefs,
    replay_class: input.replay_class,
  });
  const basisIntegrityContract = buildReplayBasisIntegrityContract(
    input.basis_integrity_contract ?? { replay_class: input.replay_class },
  );
  const classification = classifyReplayComparison({
    actual_deterministic_outcome_hash: input.actual_deterministic_outcome_hash,
    actual_execution_basis_hash: input.actual_execution_basis_hash,
    basis_dimension_results: input.basis_dimension_results,
    basis_validation_state: input.basis_validation_state,
    expected_deterministic_outcome_hash: input.expected_deterministic_outcome_hash,
    expected_execution_basis_hash: input.expected_execution_basis_hash,
    mismatch_inventory: input.mismatch_inventory,
    outcome_component_results: input.outcome_component_results,
    replay_class: input.replay_class,
  });
  const signatureState = input.signature_verification_state ?? "NOT_SIGNED";
  const confidence = confidenceFor({
    basis_dimension_results: input.basis_dimension_results,
    basis_validation_state: input.basis_validation_state,
    material_outcome_coverage: classification.material_outcome_coverage,
    outcome_component_results: input.outcome_component_results,
    signature_verification_state: signatureState,
  });
  const replayAttestationId = `replay-attestation.${stableJsonHash({
    manifest_id: input.manifest_id,
    replay_of_manifest_id: input.replay_of_manifest_id,
    replay_class: input.replay_class,
    actual_deterministic_outcome_hash: input.actual_deterministic_outcome_hash,
    compared_at: input.compared_at,
  })}`;
  const attestationEnvelopeRef =
    signatureState === "VERIFIED" || signatureState === "VERIFICATION_MATERIAL_MISSING"
      ? (input.attestation_envelope_ref ?? `attestation-envelope://${replayAttestationId}`)
      : null;
  const verificationMaterialRefs =
    signatureState === "VERIFIED"
      ? sortSetLikeStrings(input.verification_material_refs ?? [
          `verification-material://${replayAttestationId}`,
        ])
      : [];

  const withoutContract = {
    replay_attestation_id: replayAttestationId,
    manifest_id: input.manifest_id,
    replay_of_manifest_id: input.replay_of_manifest_id,
    artifact_type: "ReplayAttestation" as const,
    execution_mode: boundary.execution_mode,
    analysis_only: boundary.analysis_only,
    non_compliance_config_refs: nonComplianceConfigRefs,
    counterfactual_basis: counterfactualBasis,
    execution_mode_boundary_contract: boundary,
    replay_class: input.replay_class,
    comparison_mode: classification.comparison_mode,
    basis_validation_state: input.basis_validation_state,
    basis_identity_verdict: classification.basis_identity_verdict,
    deterministic_equivalence_verdict: classification.deterministic_equivalence_verdict,
    basis_dimension_results: [...input.basis_dimension_results],
    outcome_component_results: [...input.outcome_component_results],
    basis_coverage: classification.basis_coverage,
    basis_match_ratio: classification.basis_match_ratio,
    outcome_coverage: classification.outcome_coverage,
    outcome_match_ratio: classification.outcome_match_ratio,
    material_outcome_coverage: classification.material_outcome_coverage,
    material_outcome_match_ratio: classification.material_outcome_match_ratio,
    signature_verification_state: signatureState,
    attestation_envelope_ref: attestationEnvelopeRef,
    verification_material_refs: verificationMaterialRefs,
    attestation_confidence_score:
      signatureState === "SIGNATURE_INVALID" ? 0 : confidence.score,
    attestation_confidence_band:
      signatureState === "SIGNATURE_INVALID" ? "INSUFFICIENT" : confidence.band,
    outcome_class: classification.outcome_class,
    basis_integrity_contract: basisIntegrityContract,
    expected_execution_basis_hash: input.expected_execution_basis_hash,
    actual_execution_basis_hash: input.actual_execution_basis_hash,
    expected_deterministic_outcome_hash: input.expected_deterministic_outcome_hash,
    actual_deterministic_outcome_hash: input.actual_deterministic_outcome_hash,
    difference_reason_codes: classification.difference_reason_codes,
    limitation_codes: classification.limitation_codes,
    mismatch_inventory: classification.mismatch_inventory,
    plain_summary: summaryFor(classification.outcome_class),
    operator_summary_ref: input.operator_summary_ref ?? null,
    auditor_summary_ref: input.auditor_summary_ref ?? null,
    compared_at: input.compared_at,
  };

  return {
    ...withoutContract,
    contract: buildArtifactContract({
      artifact_content_hash: stableJsonHash(withoutContract),
      replay_attestation_id: replayAttestationId,
      schema_bundle_hash: input.schema_bundle_hash ?? "schema-bundle.replay-attestation.v1",
      writer_build_id: input.writer_build_id ?? "backend-manifest.replay-attestation.v1",
    }) as ReplayAttestation["contract"],
  };
}
