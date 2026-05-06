import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AdmissibilityState,
  type ProvenancePartitionContract,
  assertConfidence,
  assertNonNegativeInteger,
  buildProvenancePartitionContract,
  cloneRecord,
  normalizeManifestRefSpine,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  refFromId,
  requireString,
} from "./provenance_common.ts";
import { type ProvenancePathRankingBasisItem } from "./provenance_path.ts";

export type ExecutionModeBoundaryContract = {
  contract_version: "EXECUTION_MODE_BOUNDARY_V1";
  boundary_hash: string;
  run_kind: "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
  replay_class_or_null: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  analysis_only: boolean;
  non_compliance_config_refs: string[];
  counterfactual_basis: string | null;
  execution_posture: "LIVE_COMPLIANCE" | "LIVE_ANALYSIS" | "REPLAY_COMPLIANCE" | "REPLAY_COUNTERFACTUAL";
  legal_effect_boundary:
    | "COMPLIANCE_CAPABLE"
    | "MODELED_READ_ONLY"
    | "HISTORICAL_REPLAY_READ_ONLY"
    | "COUNTERFACTUAL_REPLAY_READ_ONLY";
  disclosure_reason_codes: string[];
};

export type RetentionLimitedExplainabilityContract = {
  contract_version: "RETENTION_EXPLAINABILITY_V1";
  boundary_scope: "EVIDENCE_GRAPH";
  surface_role: "GRAPH_EXPLANATION_INDEX";
  surface_specific_binding_policy: "EVIDENCE_GRAPH_RETAINS_LIMITATION_NOTES_AND_TARGET_EXPLANATION_POSTURE";
  decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT";
  explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES";
  omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE";
  audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM";
  present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED";
  silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN";
};

export type ProofClosureContract = {
  closure_profile_code: "PROOF_CLOSURE_V1";
  path_ranking_profile_code: "PROOF_PATH_SELECTION_V1";
  support_closed: boolean;
  authority_closed: boolean;
  contradiction_isolated: boolean;
  replay_closed: boolean;
  silent_limitation_ambiguity_present: boolean;
  current_decisive_anchor_present: boolean;
  staleness_invalidated: boolean;
  closure_failure_reason_codes: string[];
};

export type EvidenceGraphLifecycleState =
  | "NOT_BUILT"
  | "BUILDING"
  | "BUILT"
  | "LIMITED"
  | "STALE"
  | "REBUILD_REQUIRED"
  | "SUPERSEDED";
export type EvidenceGraphTargetClass = "FIGURE" | "TOTAL" | "FILING_FIELD" | "DECISION" | "LEGAL_STATE";
export type EvidenceGraphSupportState =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "CONTRADICTED"
  | "STALE";
export type EvidenceGraphClosureState = "CLOSED" | "OPEN";
export type EvidenceGraphExplanationStatus = "AVAILABLE" | "LIMITED" | "FAILED";

export type EvidenceGraphLineageBoundary = {
  boundary_id: string;
  boundary_edge_ref: string;
  from_manifest_id: string;
  to_manifest_id: string;
  relation: "ED_CONTINUES" | "ED_REPLAYS" | "ED_RECOVERS" | "ED_SUPERSEDES";
  exposed_in_path_refs: string[];
  decisive_in_path_refs: string[];
  tenant_id: string;
  client_id: string | null;
  partition_scope_refs: string[];
  period_scope_ref_or_null: string | null;
};

export type EvidenceGraphLimitationNote = {
  note_id: string;
  limitation_code: string;
  note_class: "RETENTION" | "PRIVACY" | "MASKING" | "MISSING_SUPPORT" | "AUTHORITY_LIMIT" | "SUPERSESSION";
  affected_refs: string[];
};

export type EvidenceGraphConfidenceSummary = {
  primary_path_weakest_support_confidence: number;
  weighted_path_confidence: number;
  admissible_critical_path_count: number;
  limited_critical_path_count: number;
};

export type EvidenceGraphSupersessionSummary = {
  supersedes_graph_ref: string | null;
  superseded_by_graph_ref: string | null;
  lineage_reason: "NONE" | "CONTINUATION" | "REPLAY" | "RECOVERY" | "SUPERSESSION";
};

export type EvidenceGraphQuality = {
  graph_quality_score: number;
  critical_path_coverage: number;
  critical_retention_limited_count: number;
  critical_evidence_erased_count: number;
  inferred_critical_path_ratio: number;
  proof_bundle_coverage: number;
  unsupported_critical_target_count: number;
  contradicted_critical_target_count: number;
  stale_critical_target_count: number;
  replay_failure_target_count: number;
};

export type EvidenceGraphIntegritySummary = {
  unsupported_critical_target_count: number;
  contradicted_critical_target_count: number;
  stale_critical_target_count: number;
  open_critical_target_count: number;
  replay_failure_target_count: number;
  missing_proof_bundle_target_count: number;
  explanation_failure_count: number;
  rebuild_required: boolean;
};

export type EvidenceGraphTargetAssessment = {
  target_ref: string;
  target_class: EvidenceGraphTargetClass;
  filing_critical: boolean;
  support_state: EvidenceGraphSupportState;
  admissibility_state: AdmissibilityState;
  closure_state: EvidenceGraphClosureState;
  proof_closure_contract: ProofClosureContract;
  primary_path_ref: string | null;
  proof_bundle_ref: string | null;
  rejected_path_refs: string[];
  replayable: boolean;
  explanation_status: EvidenceGraphExplanationStatus;
  contradiction_refs: string[];
  stale_reason_codes: string[];
  staleness_dependency_refs: string[];
  temporal_propagation_event_refs: string[];
  closure_failure_reason_codes: string[];
  last_validated_at: string;
};

export type EvidenceGraphRecord = {
  graph_id: string;
  manifest_id: string;
  manifest_refs: string[];
  partition_contract: ProvenancePartitionContract;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  graph_version: string;
  lifecycle_state: EvidenceGraphLifecycleState;
  nodes_ref: string | null;
  edges_ref: string | null;
  critical_paths_ref: string | null;
  primary_path_ref: string | null;
  path_ranking_basis: ProvenancePathRankingBasisItem[];
  lineage_boundaries: EvidenceGraphLineageBoundary[];
  limitation_notes: EvidenceGraphLimitationNote[];
  retention_limited_explainability_contract: RetentionLimitedExplainabilityContract;
  confidence_summary: EvidenceGraphConfidenceSummary | null;
  supersession_summary: EvidenceGraphSupersessionSummary;
  quality: EvidenceGraphQuality | null;
  built_at: string | null;
  build_scope: string[];
  target_assessments: EvidenceGraphTargetAssessment[];
  proof_bundle_refs: string[];
  integrity_summary: EvidenceGraphIntegritySummary;
  graph_hash: string;
};

export type EvidenceGraphBuildInput = Partial<EvidenceGraphRecord> & {
  graph_id: string;
  manifest_id: string;
  partition_contract: ProvenancePartitionContract;
  nodes_ref: string;
  edges_ref: string;
  critical_paths_ref: string;
  primary_path_ref: string;
  path_ranking_basis: ProvenancePathRankingBasisItem[];
  target_assessments: EvidenceGraphTargetAssessment[];
  built_at?: string;
};

export function evidenceGraphRef(graph: Pick<EvidenceGraphRecord, "graph_id"> | string) {
  return refFromId("evidence-graph", typeof graph === "string" ? graph : graph.graph_id);
}

export function buildExecutionModeBoundaryContract(
  input: Partial<Omit<ExecutionModeBoundaryContract, "contract_version" | "boundary_hash">> = {},
): ExecutionModeBoundaryContract {
  const runKind = input.run_kind ?? "INTERACTIVE";
  const replayClass = input.replay_class_or_null ?? null;
  const executionMode = input.execution_mode ?? "COMPLIANCE";
  const analysisOnly = input.analysis_only ?? executionMode === "ANALYSIS";
  const nonComplianceConfigRefs = normalizeSortedStringSet(
    "execution_mode_boundary_contract.non_compliance_config_refs",
    input.non_compliance_config_refs ?? [],
  );
  const counterfactualBasis = normalizeNullableString(
    "execution_mode_boundary_contract.counterfactual_basis",
    input.counterfactual_basis,
  );
  let executionPosture = input.execution_posture;
  let legalEffectBoundary = input.legal_effect_boundary;
  let disclosureReasonCodes = normalizeSortedStringSet(
    "execution_mode_boundary_contract.disclosure_reason_codes",
    input.disclosure_reason_codes ?? [],
  );

  if (runKind === "REPLAY" && replayClass === "COUNTERFACTUAL_ANALYSIS") {
    executionPosture = "REPLAY_COUNTERFACTUAL";
    legalEffectBoundary = "COUNTERFACTUAL_REPLAY_READ_ONLY";
    disclosureReasonCodes = normalizeSortedStringSet("disclosure_reason_codes", [
      ...disclosureReasonCodes,
      "COUNTERFACTUAL_REPLAY_POSTURE",
    ]);
  } else if (runKind === "REPLAY") {
    executionPosture = "REPLAY_COMPLIANCE";
    legalEffectBoundary = "HISTORICAL_REPLAY_READ_ONLY";
    disclosureReasonCodes = normalizeSortedStringSet("disclosure_reason_codes", [
      ...disclosureReasonCodes,
      "REPLAY_NON_LIVE_POSTURE",
    ]);
  } else if (executionMode === "ANALYSIS") {
    executionPosture = "LIVE_ANALYSIS";
    legalEffectBoundary = "MODELED_READ_ONLY";
    disclosureReasonCodes = normalizeSortedStringSet("disclosure_reason_codes", [
      ...disclosureReasonCodes,
      "ANALYSIS_ONLY_POSTURE",
    ]);
  } else {
    executionPosture = "LIVE_COMPLIANCE";
    legalEffectBoundary = "COMPLIANCE_CAPABLE";
    disclosureReasonCodes = [];
  }

  if (executionMode === "COMPLIANCE" && (analysisOnly || counterfactualBasis || nonComplianceConfigRefs.length > 0)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "COMPLIANCE execution boundary must not retain analysis-only inputs",
    );
  }
  if (executionMode === "ANALYSIS" && (!analysisOnly || !counterfactualBasis)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "ANALYSIS execution boundary requires analysis_only=true and a counterfactual basis",
    );
  }

  const canonicalPayload = {
    contract_version: "EXECUTION_MODE_BOUNDARY_V1" as const,
    run_kind: runKind,
    replay_class_or_null: replayClass,
    execution_mode: executionMode,
    analysis_only: analysisOnly,
    non_compliance_config_refs: nonComplianceConfigRefs,
    counterfactual_basis: counterfactualBasis,
    execution_posture: executionPosture,
    legal_effect_boundary: legalEffectBoundary,
    disclosure_reason_codes: disclosureReasonCodes,
  };

  return {
    ...canonicalPayload,
    boundary_hash: stableJsonHash(canonicalPayload),
  };
}

export function buildEvidenceGraphRetentionLimitedExplainabilityContract(): RetentionLimitedExplainabilityContract {
  return {
    audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM",
    boundary_scope: "EVIDENCE_GRAPH",
    contract_version: "RETENTION_EXPLAINABILITY_V1",
    decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT",
    explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES",
    omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE",
    present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED",
    silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN",
    surface_role: "GRAPH_EXPLANATION_INDEX",
    surface_specific_binding_policy: "EVIDENCE_GRAPH_RETAINS_LIMITATION_NOTES_AND_TARGET_EXPLANATION_POSTURE",
  };
}

export function buildProofClosureContract(
  input: Partial<Omit<ProofClosureContract, "closure_profile_code" | "path_ranking_profile_code">> = {},
): ProofClosureContract {
  const closure = {
    authority_closed: input.authority_closed ?? true,
    contradiction_isolated: input.contradiction_isolated ?? true,
    current_decisive_anchor_present: input.current_decisive_anchor_present ?? true,
    replay_closed: input.replay_closed ?? true,
    silent_limitation_ambiguity_present: input.silent_limitation_ambiguity_present ?? false,
    staleness_invalidated: input.staleness_invalidated ?? false,
    support_closed: input.support_closed ?? true,
  };
  const failures = new Set(input.closure_failure_reason_codes ?? []);
  if (!closure.support_closed) failures.add("SUPPORT_OPEN");
  if (!closure.authority_closed) failures.add("AUTHORITY_OPEN");
  if (!closure.contradiction_isolated) failures.add("CONTRADICTION_NOT_ISOLATED");
  if (!closure.replay_closed) failures.add("REPLAY_NOT_CLOSED");
  if (closure.silent_limitation_ambiguity_present) failures.add("SILENT_LIMITATION_AMBIGUITY");
  if (!closure.current_decisive_anchor_present) failures.add("CURRENT_DECISIVE_ANCHOR_MISSING");
  if (closure.staleness_invalidated) failures.add("STALENESS_INVALIDATED");
  const allClosed =
    closure.support_closed &&
    closure.authority_closed &&
    closure.contradiction_isolated &&
    closure.replay_closed &&
    !closure.silent_limitation_ambiguity_present &&
    closure.current_decisive_anchor_present &&
    !closure.staleness_invalidated;
  return {
    closure_profile_code: "PROOF_CLOSURE_V1",
    path_ranking_profile_code: "PROOF_PATH_SELECTION_V1",
    ...closure,
    closure_failure_reason_codes: allClosed ? [] : normalizeSortedStringSet("closure_failure_reason_codes", [...failures], { minItems: 1 }),
  };
}

export function buildEvidenceGraphTargetAssessment(
  input: Partial<EvidenceGraphTargetAssessment> & {
    target_ref: string;
    primary_path_ref?: string | null;
    proof_bundle_ref?: string | null;
    last_validated_at?: string;
  },
): EvidenceGraphTargetAssessment {
  const supportState = input.support_state ?? (input.primary_path_ref ? "SUPPORTED" : "UNSUPPORTED");
  const isClosed = supportState === "SUPPORTED" || supportState === "PARTIALLY_SUPPORTED";
  const proofClosure =
    input.proof_closure_contract ??
    buildProofClosureContract({
      contradiction_isolated: supportState !== "CONTRADICTED",
      current_decisive_anchor_present: Boolean(input.primary_path_ref),
      staleness_invalidated: supportState === "STALE",
      support_closed: supportState !== "UNSUPPORTED",
      authority_closed: supportState !== "UNSUPPORTED",
      replay_closed: input.replayable ?? supportState !== "UNSUPPORTED",
    });
  const closureFailureReasonCodes = normalizeSortedStringSet(
    "closure_failure_reason_codes",
    proofClosure.closure_failure_reason_codes,
  );
  const primaryPathRef = normalizeNullableString("primary_path_ref", input.primary_path_ref ?? null);
  const proofBundleRef = normalizeNullableString(
    "proof_bundle_ref",
    input.proof_bundle_ref ??
      (primaryPathRef
        ? `proof-bundle-pending://${stableJsonHash({
            target_ref: input.target_ref,
            primary_path_ref: primaryPathRef,
          })}`
        : null),
  );
  return {
    admissibility_state:
      input.admissibility_state ?? (supportState === "PARTIALLY_SUPPORTED" ? "LIMITED" : supportState === "SUPPORTED" ? "ADMISSIBLE" : "LIMITED"),
    closure_failure_reason_codes: closureFailureReasonCodes,
    closure_state: input.closure_state ?? (isClosed ? "CLOSED" : "OPEN"),
    contradiction_refs: normalizeSortedStringSet("contradiction_refs", input.contradiction_refs ?? []),
    explanation_status: input.explanation_status ?? "AVAILABLE",
    filing_critical: input.filing_critical ?? true,
    last_validated_at: normalizeTimestamp("last_validated_at", input.last_validated_at ?? "2026-04-28T00:00:00Z"),
    primary_path_ref: primaryPathRef,
    proof_bundle_ref: proofBundleRef,
    proof_closure_contract: proofClosure,
    rejected_path_refs: normalizeSortedStringSet("rejected_path_refs", input.rejected_path_refs ?? []),
    replayable: input.replayable ?? isClosed,
    stale_reason_codes: normalizeSortedStringSet("stale_reason_codes", input.stale_reason_codes ?? []),
    staleness_dependency_refs: normalizeSortedStringSet(
      "staleness_dependency_refs",
      input.staleness_dependency_refs ?? [],
    ),
    support_state: supportState,
    target_class: input.target_class ?? "FIGURE",
    target_ref: requireString("target_ref", input.target_ref),
    temporal_propagation_event_refs: normalizeSortedStringSet(
      "temporal_propagation_event_refs",
      input.temporal_propagation_event_refs ?? [],
    ),
  };
}

function normalizeLineageBoundaries(boundaries: readonly EvidenceGraphLineageBoundary[] | undefined) {
  return [...(boundaries ?? [])]
    .map((boundary) => ({
      boundary_edge_ref: requireString("lineage_boundaries.boundary_edge_ref", boundary.boundary_edge_ref),
      boundary_id: requireString("lineage_boundaries.boundary_id", boundary.boundary_id),
      client_id: normalizeNullableString("lineage_boundaries.client_id", boundary.client_id),
      decisive_in_path_refs: normalizeSortedStringSet(
        "lineage_boundaries.decisive_in_path_refs",
        boundary.decisive_in_path_refs ?? [],
      ),
      exposed_in_path_refs: normalizeSortedStringSet(
        "lineage_boundaries.exposed_in_path_refs",
        boundary.exposed_in_path_refs,
        { minItems: 1 },
      ),
      from_manifest_id: requireString("lineage_boundaries.from_manifest_id", boundary.from_manifest_id),
      partition_scope_refs: normalizeSortedStringSet(
        "lineage_boundaries.partition_scope_refs",
        boundary.partition_scope_refs ?? [],
      ),
      period_scope_ref_or_null: normalizeNullableString(
        "lineage_boundaries.period_scope_ref_or_null",
        boundary.period_scope_ref_or_null,
      ),
      relation: boundary.relation,
      tenant_id: requireString("lineage_boundaries.tenant_id", boundary.tenant_id),
      to_manifest_id: requireString("lineage_boundaries.to_manifest_id", boundary.to_manifest_id),
    }))
    .sort((left, right) => left.boundary_id.localeCompare(right.boundary_id));
}

function normalizeLimitationNotes(notes: readonly EvidenceGraphLimitationNote[] | undefined) {
  return [...(notes ?? [])]
    .map((note) => ({
      affected_refs: normalizeSortedStringSet("limitation_notes.affected_refs", note.affected_refs, {
        minItems: 1,
      }),
      limitation_code: requireString("limitation_notes.limitation_code", note.limitation_code),
      note_class: note.note_class,
      note_id: requireString("limitation_notes.note_id", note.note_id),
    }))
    .sort((left, right) => left.note_id.localeCompare(right.note_id));
}

function deriveIntegritySummary(targetAssessments: readonly EvidenceGraphTargetAssessment[], rebuildRequired: boolean) {
  const filingCritical = targetAssessments.filter((assessment) => assessment.filing_critical);
  return {
    contradicted_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "CONTRADICTED").length,
    explanation_failure_count: filingCritical.filter((assessment) => assessment.explanation_status === "FAILED").length,
    missing_proof_bundle_target_count: filingCritical.filter(
      (assessment) => assessment.support_state !== "UNSUPPORTED" && assessment.proof_bundle_ref === null,
    ).length,
    open_critical_target_count: filingCritical.filter((assessment) => assessment.closure_state === "OPEN").length,
    rebuild_required: rebuildRequired,
    replay_failure_target_count: filingCritical.filter((assessment) => !assessment.replayable).length,
    stale_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "STALE").length,
    unsupported_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "UNSUPPORTED").length,
  };
}

function deriveQuality(input: {
  target_assessments: readonly EvidenceGraphTargetAssessment[];
  critical_path_count: number;
  inferred_critical_path_count: number;
  critical_retention_limited_count: number;
  critical_evidence_erased_count: number;
}): EvidenceGraphQuality {
  const filingCritical = input.target_assessments.filter((assessment) => assessment.filing_critical);
  const denominator = filingCritical.length || 1;
  const supportedCount = filingCritical.filter((assessment) => assessment.support_state !== "UNSUPPORTED").length;
  return {
    contradicted_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "CONTRADICTED").length,
    critical_evidence_erased_count: input.critical_evidence_erased_count,
    critical_path_coverage: supportedCount / denominator,
    critical_retention_limited_count: input.critical_retention_limited_count,
    graph_quality_score: Math.max(
      0,
      Math.min(
        100,
        100 -
          25 * filingCritical.filter((assessment) => assessment.support_state === "UNSUPPORTED").length -
          35 * filingCritical.filter((assessment) => assessment.support_state === "CONTRADICTED").length -
          20 * filingCritical.filter((assessment) => assessment.support_state === "STALE").length,
      ),
    ),
    inferred_critical_path_ratio:
      input.critical_path_count === 0 ? 0 : input.inferred_critical_path_count / input.critical_path_count,
    proof_bundle_coverage:
      filingCritical.length === 0
        ? 1
        : filingCritical.filter((assessment) => assessment.proof_bundle_ref !== null).length / filingCritical.length,
    replay_failure_target_count: filingCritical.filter((assessment) => !assessment.replayable).length,
    stale_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "STALE").length,
    unsupported_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "UNSUPPORTED").length,
  };
}

export function deriveEvidenceGraphHash(input: Omit<EvidenceGraphRecord, "graph_hash">) {
  return stableJsonHash(input);
}

export function normalizeEvidenceGraphRecord(input: EvidenceGraphRecord): EvidenceGraphRecord {
  const manifestId = requireString("manifest_id", input.manifest_id);
  const manifestRefs = normalizeManifestRefSpine(manifestId, input.manifest_refs);
  const partitionContract = buildProvenancePartitionContract(input.partition_contract);
  const targetAssessments = [...(input.target_assessments ?? [])]
    .map((assessment) => buildEvidenceGraphTargetAssessment(assessment))
    .sort((left, right) => left.target_ref.localeCompare(right.target_ref));
  const rebuildRequired = Boolean(input.integrity_summary?.rebuild_required ?? false);
  const integritySummary = deriveIntegritySummary(targetAssessments, rebuildRequired);
  const proofBundleRefs = normalizeSortedStringSet(
    "proof_bundle_refs",
    targetAssessments
      .map((assessment) => assessment.proof_bundle_ref)
      .filter((ref): ref is string => typeof ref === "string" && ref.length > 0),
  );
  const limitationNotes = normalizeLimitationNotes(input.limitation_notes ?? []);
  const quality =
    input.quality ??
    deriveQuality({
      target_assessments: targetAssessments,
      critical_path_count: targetAssessments.filter((assessment) => assessment.primary_path_ref !== null).length,
      inferred_critical_path_count: 0,
      critical_retention_limited_count: limitationNotes.some((note) => note.note_class === "RETENTION") ? 1 : 0,
      critical_evidence_erased_count: limitationNotes.some((note) => note.limitation_code.includes("ERASED")) ? 1 : 0,
    });
  const primaryPathRef = normalizeNullableString("primary_path_ref", input.primary_path_ref);
  if (
    primaryPathRef &&
    !targetAssessments.some(
      (assessment) =>
        assessment.primary_path_ref === primaryPathRef &&
        ["SUPPORTED", "PARTIALLY_SUPPORTED"].includes(assessment.support_state) &&
        assessment.closure_state === "CLOSED" &&
        assessment.replayable,
    )
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "primary_path_ref must resolve to a closed, replayable supported or partially supported target assessment",
    );
  }
  const lifecycleState = (input.lifecycle_state ?? "BUILT") as EvidenceGraphLifecycleState;
  if (lifecycleState === "BUILT" && limitationNotes.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "BUILT evidence graphs must not retain limitation_notes",
    );
  }
  if (manifestRefs.length === 1 && (input.lineage_boundaries ?? []).length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "single-manifest evidence graphs must not retain lineage_boundaries",
    );
  }
  if (manifestRefs.length > 1 && (input.lineage_boundaries ?? []).length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "cross-manifest evidence graphs must retain lineage_boundaries",
    );
  }

  const withoutHash: Omit<EvidenceGraphRecord, "graph_hash"> = {
    build_scope: normalizeSortedStringSet("build_scope", input.build_scope ?? ["EVIDENCE_SUPPORT_PATHS"], {
      minItems: 1,
    }),
    built_at: input.built_at === null ? null : normalizeTimestamp("built_at", input.built_at),
    confidence_summary: input.confidence_summary
      ? {
          admissible_critical_path_count: assertNonNegativeInteger(
            "confidence_summary.admissible_critical_path_count",
            input.confidence_summary.admissible_critical_path_count,
          ),
          limited_critical_path_count: assertNonNegativeInteger(
            "confidence_summary.limited_critical_path_count",
            input.confidence_summary.limited_critical_path_count,
          ),
          primary_path_weakest_support_confidence: assertConfidence(
            "confidence_summary.primary_path_weakest_support_confidence",
            input.confidence_summary.primary_path_weakest_support_confidence,
          ),
          weighted_path_confidence: assertConfidence(
            "confidence_summary.weighted_path_confidence",
            input.confidence_summary.weighted_path_confidence,
          ),
        }
      : null,
    critical_paths_ref: normalizeNullableString("critical_paths_ref", input.critical_paths_ref),
    edges_ref: normalizeNullableString("edges_ref", input.edges_ref),
    execution_mode_boundary_contract: input.execution_mode_boundary_contract
      ? buildExecutionModeBoundaryContract(input.execution_mode_boundary_contract)
      : buildExecutionModeBoundaryContract(),
    graph_id: requireString("graph_id", input.graph_id),
    graph_version: requireString("graph_version", input.graph_version ?? "PROVENANCE_GRAPH_V1"),
    integrity_summary: integritySummary,
    lifecycle_state: lifecycleState,
    limitation_notes: limitationNotes,
    lineage_boundaries: normalizeLineageBoundaries(input.lineage_boundaries ?? []),
    manifest_id: manifestId,
    manifest_refs: manifestRefs,
    nodes_ref: normalizeNullableString("nodes_ref", input.nodes_ref),
    partition_contract: partitionContract,
    path_ranking_basis: [...(input.path_ranking_basis ?? [])].sort(
      (left, right) => left.rank_order - right.rank_order,
    ),
    primary_path_ref: primaryPathRef,
    proof_bundle_refs: proofBundleRefs,
    quality,
    retention_limited_explainability_contract: buildEvidenceGraphRetentionLimitedExplainabilityContract(),
    supersession_summary: input.supersession_summary ?? {
      lineage_reason: "NONE",
      superseded_by_graph_ref: null,
      supersedes_graph_ref: null,
    },
    target_assessments: targetAssessments,
  };
  if (["BUILT", "LIMITED", "STALE", "REBUILD_REQUIRED", "SUPERSEDED"].includes(withoutHash.lifecycle_state)) {
    for (const field of ["nodes_ref", "edges_ref", "critical_paths_ref", "primary_path_ref"] as const) {
      if (withoutHash[field] === null) {
        throw new ProvenanceModelError(
          "PROVENANCE_CONTRACT_INVALID",
          `${field} is required once an evidence graph is built`,
        );
      }
    }
    if (withoutHash.path_ranking_basis.length === 0 || withoutHash.confidence_summary === null || withoutHash.quality === null) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "built evidence graphs require ranking, confidence, and quality summaries",
      );
    }
  }
  return {
    ...withoutHash,
    graph_hash: input.graph_hash ?? deriveEvidenceGraphHash(withoutHash),
  };
}

export function buildEvidenceGraphRecord(input: EvidenceGraphBuildInput): EvidenceGraphRecord {
  const normalizedTargets = input.target_assessments.map((assessment) =>
    buildEvidenceGraphTargetAssessment(assessment),
  );
  const primaryTarget = normalizedTargets.find((assessment) => assessment.primary_path_ref === input.primary_path_ref);
  const confidenceSummary = input.confidence_summary ?? {
    admissible_critical_path_count: normalizedTargets.filter(
      (assessment) => assessment.admissibility_state === "ADMISSIBLE",
    ).length,
    limited_critical_path_count: normalizedTargets.filter(
      (assessment) => assessment.admissibility_state !== "ADMISSIBLE",
    ).length,
    primary_path_weakest_support_confidence: primaryTarget?.admissibility_state === "ADMISSIBLE" ? 1 : 0.75,
    weighted_path_confidence: primaryTarget?.admissibility_state === "ADMISSIBLE" ? 1 : 0.75,
  };
  const draft = {
    ...input,
    built_at: input.built_at ?? "2026-04-28T00:00:00Z",
    build_scope: input.build_scope ?? ["EVIDENCE_SUPPORT_PATHS"],
    confidence_summary: confidenceSummary,
    execution_mode_boundary_contract: input.execution_mode_boundary_contract ?? buildExecutionModeBoundaryContract(),
    graph_hash: input.graph_hash ?? "",
    graph_version: input.graph_version ?? "PROVENANCE_GRAPH_V1",
    lifecycle_state: input.lifecycle_state ?? "BUILT",
    lineage_boundaries: input.lineage_boundaries ?? [],
    limitation_notes: input.limitation_notes ?? [],
    manifest_refs: input.manifest_refs ?? [input.manifest_id],
    proof_bundle_refs: input.proof_bundle_refs ?? [],
    quality: input.quality ?? null,
    retention_limited_explainability_contract:
      input.retention_limited_explainability_contract ??
      buildEvidenceGraphRetentionLimitedExplainabilityContract(),
    supersession_summary: input.supersession_summary ?? {
      lineage_reason: "NONE",
      superseded_by_graph_ref: null,
      supersedes_graph_ref: null,
    },
    target_assessments: normalizedTargets,
    integrity_summary:
      input.integrity_summary ?? deriveIntegritySummary(normalizedTargets, input.lifecycle_state === "REBUILD_REQUIRED"),
  } as EvidenceGraphRecord;
  delete (draft as Partial<EvidenceGraphRecord>).graph_hash;
  return normalizeEvidenceGraphRecord(draft as EvidenceGraphRecord);
}

export function deriveEvidenceGraphContentHash(record: EvidenceGraphRecord) {
  return stableJsonHash(normalizeEvidenceGraphRecord(record));
}

export function cloneEvidenceGraphRecord(record: EvidenceGraphRecord) {
  return cloneRecord(normalizeEvidenceGraphRecord(record));
}
