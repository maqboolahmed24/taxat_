import {
  normalizeManifestLineageTrace,
  type BranchCandidateEvaluationRecord,
  type ManifestLineageTraceRecord,
} from "../../../backend-manifest/src/index.ts";

import { assertManifestLineageCandidateCoverage } from "./assert_manifest_lineage_candidate_coverage.ts";

export type ManifestReuseDisposition =
  | "NEW_MANIFEST_ALLOCATED"
  | "EXISTING_DECISION_BUNDLE_RETURNED"
  | "SEALED_MANIFEST_REUSED"
  | "REPLAY_CHILD_ALLOCATED"
  | "RECOVERY_CHILD_ALLOCATED"
  | "CONTINUATION_CHILD_ALLOCATED"
  | "NEW_REQUEST_CHILD_ALLOCATED";

export type ManifestReuseDecisionSummary = {
  summary_contract_version: "MANIFEST_REUSE_DECISION_SUMMARY_V1";
  lineage_trace_id: string;
  idempotency_key: string;
  request_identity_hash: string;
  selected_branch_action: ManifestLineageTraceRecord["selected_branch_action"];
  selected_branch_reason_code: ManifestLineageTraceRecord["selected_branch_reason_code"];
  selected_manifest_id: string;
  selected_manifest_continuation_basis: ManifestLineageTraceRecord["selected_manifest_continuation_basis"];
  selected_manifest_generation: number;
  selected_branch_action_differs_from_manifest_continuation_basis: boolean;
  reuse_disposition: ManifestReuseDisposition;
  requested_scope: ManifestLineageTraceRecord["requested_scope"];
  effective_scope: ManifestLineageTraceRecord["effective_scope"];
  prior_manifest: {
    manifest_id_or_null: string | null;
    manifest_hash_at_decision_or_null: string | null;
    lifecycle_state_or_null: ManifestLineageTraceRecord["prior_manifest_lifecycle_state_or_null"];
  };
  selected_lineage: {
    root_manifest_id: string;
    parent_manifest_id_or_null: string | null;
    continuation_of_manifest_id_or_null: string | null;
    replay_of_manifest_id_or_null: string | null;
    supersedes_manifest_id_or_null: string | null;
  };
  inheritance_modes: {
    config_inheritance_mode_or_null: ManifestLineageTraceRecord["config_inheritance_mode_or_null"];
    input_inheritance_mode_or_null: ManifestLineageTraceRecord["input_inheritance_mode_or_null"];
  };
  returned_decision_bundle_hash_or_null: string | null;
  selected_candidate: BranchCandidateEvaluationRecord;
  rejected_candidates: BranchCandidateEvaluationRecord[];
  nightly_predecessor_context: {
    run_kind: ManifestLineageTraceRecord["run_kind"];
    nightly_window_key_or_null: string | null;
    nightly_context_reason_code_or_null: ManifestLineageTraceRecord["nightly_context_reason_code_or_null"];
    predecessor_batch_run_ref_or_null: string | null;
    predecessor_manifest_id_or_null: string | null;
    predecessor_manifest_hash_or_null: string | null;
  };
  mirror_evidence: {
    mirror_consistency_state: ManifestLineageTraceRecord["mirror_consistency_state"];
    mirror_sources: ManifestLineageTraceRecord["mirror_sources"];
  };
  evidence_refs: {
    branch_decision_audit_refs: string[];
    branch_decision_trace_span_refs: string[];
  };
  authority_policy: "PERSISTED_MANIFEST_LINEAGE_TRACE_ONLY";
};

function dispositionFor(
  selectedBranchAction: ManifestLineageTraceRecord["selected_branch_action"],
): ManifestReuseDisposition {
  switch (selectedBranchAction) {
    case "NEW_MANIFEST":
      return "NEW_MANIFEST_ALLOCATED";
    case "RETURN_EXISTING_BUNDLE":
      return "EXISTING_DECISION_BUNDLE_RETURNED";
    case "REUSE_SEALED_MANIFEST":
      return "SEALED_MANIFEST_REUSED";
    case "REPLAY_CHILD":
      return "REPLAY_CHILD_ALLOCATED";
    case "RECOVERY_CHILD":
      return "RECOVERY_CHILD_ALLOCATED";
    case "CONTINUATION_CHILD":
      return "CONTINUATION_CHILD_ALLOCATED";
    case "NEW_REQUEST_CHILD":
      return "NEW_REQUEST_CHILD_ALLOCATED";
  }
}

export function buildManifestReuseDecisionSummary(
  traceInput: ManifestLineageTraceRecord,
): ManifestReuseDecisionSummary {
  const trace = normalizeManifestLineageTrace(traceInput);
  const candidateCoverage = assertManifestLineageCandidateCoverage(trace);
  const selectedCandidate = candidateCoverage.selected_candidate;

  return {
    summary_contract_version: "MANIFEST_REUSE_DECISION_SUMMARY_V1",
    lineage_trace_id: trace.lineage_trace_id,
    idempotency_key: trace.idempotency_key,
    request_identity_hash: trace.request_identity_hash,
    selected_branch_action: trace.selected_branch_action,
    selected_branch_reason_code: trace.selected_branch_reason_code,
    selected_manifest_id: trace.selected_manifest_id,
    selected_manifest_continuation_basis: trace.selected_manifest_continuation_basis,
    selected_manifest_generation: trace.selected_manifest_generation,
    selected_branch_action_differs_from_manifest_continuation_basis:
      trace.selected_branch_action !== trace.selected_manifest_continuation_basis,
    reuse_disposition: dispositionFor(trace.selected_branch_action),
    requested_scope: [...trace.requested_scope] as ManifestLineageTraceRecord["requested_scope"],
    effective_scope: [...trace.effective_scope] as ManifestLineageTraceRecord["effective_scope"],
    prior_manifest: {
      manifest_id_or_null: trace.prior_manifest_id_or_null,
      manifest_hash_at_decision_or_null: trace.prior_manifest_hash_at_decision_or_null,
      lifecycle_state_or_null: trace.prior_manifest_lifecycle_state_or_null,
    },
    selected_lineage: {
      root_manifest_id: trace.root_manifest_id,
      parent_manifest_id_or_null: trace.parent_manifest_id_or_null,
      continuation_of_manifest_id_or_null: trace.continuation_of_manifest_id_or_null,
      replay_of_manifest_id_or_null: trace.replay_of_manifest_id_or_null,
      supersedes_manifest_id_or_null: trace.supersedes_manifest_id_or_null,
    },
    inheritance_modes: {
      config_inheritance_mode_or_null: trace.config_inheritance_mode_or_null,
      input_inheritance_mode_or_null: trace.input_inheritance_mode_or_null,
    },
    returned_decision_bundle_hash_or_null: trace.returned_decision_bundle_hash_or_null,
    selected_candidate: structuredClone(selectedCandidate),
    rejected_candidates: candidateCoverage.candidate_evaluations
      .filter((candidate) => candidate.evaluation_state === "REJECTED")
      .map((candidate) => structuredClone(candidate)),
    nightly_predecessor_context: {
      run_kind: trace.run_kind,
      nightly_window_key_or_null: trace.nightly_window_key_or_null,
      nightly_context_reason_code_or_null: trace.nightly_context_reason_code_or_null,
      predecessor_batch_run_ref_or_null: trace.nightly_predecessor_batch_run_ref_or_null,
      predecessor_manifest_id_or_null: trace.nightly_predecessor_manifest_id_or_null,
      predecessor_manifest_hash_or_null: trace.nightly_predecessor_manifest_hash_or_null,
    },
    mirror_evidence: {
      mirror_consistency_state: trace.mirror_consistency_state,
      mirror_sources: [...trace.mirror_sources],
    },
    evidence_refs: {
      branch_decision_audit_refs: [...trace.branch_decision_audit_refs],
      branch_decision_trace_span_refs: [...trace.branch_decision_trace_span_refs],
    },
    authority_policy: "PERSISTED_MANIFEST_LINEAGE_TRACE_ONLY",
  };
}
