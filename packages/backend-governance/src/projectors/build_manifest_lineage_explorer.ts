import {
  deriveManifestLineageTraceStableHash,
  manifestLineageTraceRef,
  normalizeManifestLineageTrace,
  type BranchCandidateEvaluationRecord,
  type ManifestLineageTraceRecord,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";

import {
  ManifestLineageExplorerAssertionError,
  assertManifestLineageCandidateCoverage,
} from "../services/assert_manifest_lineage_candidate_coverage.ts";
import {
  buildManifestReuseDecisionSummary,
  type ManifestReuseDecisionSummary,
} from "../services/build_manifest_reuse_decision_summary.ts";

export type ManifestLineageExplorerProjectionErrorCode =
  | "MANIFEST_LINEAGE_EXPLORER_SELECTED_MANIFEST_MISMATCH"
  | "MANIFEST_LINEAGE_EXPLORER_TRACE_REF_MISSING";

export class ManifestLineageExplorerProjectionError extends Error {
  readonly code: ManifestLineageExplorerProjectionErrorCode;

  constructor(code: ManifestLineageExplorerProjectionErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageExplorerProjectionError";
    this.code = code;
  }
}

function assertProjection(
  condition: unknown,
  code: ManifestLineageExplorerProjectionErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageExplorerProjectionError(code, detail);
  }
}

export type ManifestLineageExplorerProjection = {
  explorer_contract_version: "MANIFEST_LINEAGE_EXPLORER_V1";
  lineage_trace_id: string;
  lineage_trace_ref: string;
  lineage_trace_hash: string;
  query_truth_policy: "PERSISTED_MANIFEST_LINEAGE_TRACE_ONLY";
  operator_rendering_policy: ManifestLineageTraceRecord["operator_rendering_policy"];
  selected_manifest_ref_alignment: "TRACE_REF_PRESENT";
  selected_manifest_lineage_trace_refs: string[];
  trace: ManifestLineageTraceRecord;
  decision_summary: ManifestReuseDecisionSummary;
  candidate_matrix: {
    coverage_state: "EXHAUSTIVE_CANONICAL_ACTIONS";
    canonical_action_order: ManifestLineageTraceRecord["selected_branch_action"][];
    selected_candidate: BranchCandidateEvaluationRecord;
    rejected_candidates: BranchCandidateEvaluationRecord[];
  };
  selected_path: {
    selected_branch_action: ManifestLineageTraceRecord["selected_branch_action"];
    selected_branch_reason_code: ManifestLineageTraceRecord["selected_branch_reason_code"];
    selected_manifest_id: string;
    selected_manifest_continuation_basis: RunManifestRecord["continuation_basis"];
    selected_branch_action_differs_from_manifest_continuation_basis: boolean;
    prior_manifest_id_or_null: string | null;
    prior_manifest_hash_at_decision_or_null: string | null;
    prior_manifest_lifecycle_state_or_null: ManifestLineageTraceRecord["prior_manifest_lifecycle_state_or_null"];
    returned_decision_bundle_hash_or_null: string | null;
    config_inheritance_mode_or_null: ManifestLineageTraceRecord["config_inheritance_mode_or_null"];
    input_inheritance_mode_or_null: ManifestLineageTraceRecord["input_inheritance_mode_or_null"];
  };
  mirror_evidence: {
    mirror_consistency_policy: ManifestLineageTraceRecord["mirror_consistency_policy"];
    mirror_consistency_state: ManifestLineageTraceRecord["mirror_consistency_state"];
    mirror_sources: ManifestLineageTraceRecord["mirror_sources"];
    divergence_policy: "FAIL_CLOSED";
  };
  nightly_predecessor_context: ManifestReuseDecisionSummary["nightly_predecessor_context"];
  evidence_refs: ManifestReuseDecisionSummary["evidence_refs"];
};

export type BuildManifestLineageExplorerInput = {
  expected_selected_manifest_id?: string | undefined;
  expected_selected_manifest_continuation_basis?:
    | RunManifestRecord["continuation_basis"]
    | undefined;
  selected_manifest_lineage_trace_refs: readonly string[];
  trace: ManifestLineageTraceRecord;
};

function assertSelectedManifestAlignment(input: {
  expected_selected_manifest_continuation_basis?:
    | RunManifestRecord["continuation_basis"]
    | undefined;
  expected_selected_manifest_id?: string | undefined;
  lineageTraceRef: string;
  selectedManifestLineageTraceRefs: readonly string[];
  trace: ManifestLineageTraceRecord;
}) {
  if (input.expected_selected_manifest_id !== undefined) {
    assertProjection(
      input.trace.selected_manifest_id === input.expected_selected_manifest_id,
      "MANIFEST_LINEAGE_EXPLORER_SELECTED_MANIFEST_MISMATCH",
      "lineage trace selected manifest id must match the explicit selected manifest",
    );
  }
  if (input.expected_selected_manifest_continuation_basis !== undefined) {
    assertProjection(
      input.trace.selected_manifest_continuation_basis ===
        input.expected_selected_manifest_continuation_basis,
      "MANIFEST_LINEAGE_EXPLORER_SELECTED_MANIFEST_MISMATCH",
      "lineage trace selected manifest continuation basis must match the explicit selected manifest",
    );
  }
  assertProjection(
    input.selectedManifestLineageTraceRefs.includes(input.lineageTraceRef),
    "MANIFEST_LINEAGE_EXPLORER_TRACE_REF_MISSING",
    "selected manifest lineage trace refs must explicitly include the projected trace ref",
  );
}

export function buildManifestLineageExplorer(
  input: BuildManifestLineageExplorerInput,
): ManifestLineageExplorerProjection {
  const trace = normalizeManifestLineageTrace(input.trace);
  const lineageTraceRef = manifestLineageTraceRef(trace);
  assertSelectedManifestAlignment({
    expected_selected_manifest_continuation_basis:
      input.expected_selected_manifest_continuation_basis,
    expected_selected_manifest_id: input.expected_selected_manifest_id,
    lineageTraceRef,
    selectedManifestLineageTraceRefs: input.selected_manifest_lineage_trace_refs,
    trace,
  });
  const candidateCoverage = assertManifestLineageCandidateCoverage(trace);
  const decisionSummary = buildManifestReuseDecisionSummary(trace);

  return {
    explorer_contract_version: "MANIFEST_LINEAGE_EXPLORER_V1",
    lineage_trace_id: trace.lineage_trace_id,
    lineage_trace_ref: lineageTraceRef,
    lineage_trace_hash: deriveManifestLineageTraceStableHash(trace),
    query_truth_policy: "PERSISTED_MANIFEST_LINEAGE_TRACE_ONLY",
    operator_rendering_policy: trace.operator_rendering_policy,
    selected_manifest_ref_alignment: "TRACE_REF_PRESENT",
    selected_manifest_lineage_trace_refs: [...input.selected_manifest_lineage_trace_refs],
    trace: structuredClone(trace),
    decision_summary: decisionSummary,
    candidate_matrix: {
      coverage_state: "EXHAUSTIVE_CANONICAL_ACTIONS",
      canonical_action_order: [...candidateCoverage.canonical_action_order],
      selected_candidate: structuredClone(candidateCoverage.selected_candidate),
      rejected_candidates: candidateCoverage.candidate_evaluations
        .filter((candidate) => candidate.evaluation_state === "REJECTED")
        .map((candidate) => structuredClone(candidate)),
    },
    selected_path: {
      selected_branch_action: trace.selected_branch_action,
      selected_branch_reason_code: trace.selected_branch_reason_code,
      selected_manifest_id: trace.selected_manifest_id,
      selected_manifest_continuation_basis: trace.selected_manifest_continuation_basis,
      selected_branch_action_differs_from_manifest_continuation_basis:
        trace.selected_branch_action !== trace.selected_manifest_continuation_basis,
      prior_manifest_id_or_null: trace.prior_manifest_id_or_null,
      prior_manifest_hash_at_decision_or_null:
        trace.prior_manifest_hash_at_decision_or_null,
      prior_manifest_lifecycle_state_or_null:
        trace.prior_manifest_lifecycle_state_or_null,
      returned_decision_bundle_hash_or_null:
        trace.returned_decision_bundle_hash_or_null,
      config_inheritance_mode_or_null: trace.config_inheritance_mode_or_null,
      input_inheritance_mode_or_null: trace.input_inheritance_mode_or_null,
    },
    mirror_evidence: {
      mirror_consistency_policy: trace.mirror_consistency_policy,
      mirror_consistency_state: trace.mirror_consistency_state,
      mirror_sources: [...trace.mirror_sources],
      divergence_policy: "FAIL_CLOSED",
    },
    nightly_predecessor_context: decisionSummary.nightly_predecessor_context,
    evidence_refs: decisionSummary.evidence_refs,
  };
}

export { ManifestLineageExplorerAssertionError };
