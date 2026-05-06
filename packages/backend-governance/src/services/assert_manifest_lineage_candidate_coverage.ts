import { isStringSubset } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  CANONICAL_BRANCH_ACTION_ORDER,
  CANONICAL_MIRROR_SOURCE_ORDER,
  validateBranchCandidateEvaluations,
  type BranchCandidateEvaluationRecord,
  type ManifestBranchAction,
  type ManifestLineageTraceRecord,
} from "../../../backend-manifest/src/index.ts";
import type { ManifestLineageTrace } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type ManifestLineageExplorerAssertionErrorCode =
  | "MANIFEST_LINEAGE_TRACE_CANDIDATE_REF_INVALID"
  | "MANIFEST_LINEAGE_TRACE_EFFECTIVE_SCOPE_WIDENED"
  | "MANIFEST_LINEAGE_TRACE_MIRROR_DIVERGENCE"
  | "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID";

export class ManifestLineageExplorerAssertionError extends Error {
  readonly code: ManifestLineageExplorerAssertionErrorCode;

  constructor(code: ManifestLineageExplorerAssertionErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageExplorerAssertionError";
    this.code = code;
  }
}

function assertLineageExplorer(
  condition: unknown,
  code: ManifestLineageExplorerAssertionErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageExplorerAssertionError(code, detail);
  }
}

const REQUIRED_LINEAGE_MIRROR_SOURCES = [
  "RUN_MANIFEST_TOP_LEVEL",
  "CONTINUATION_SET",
  "MANIFEST_BRANCH_DECISION",
] as const satisfies readonly ManifestLineageTrace["mirror_sources"][number][];

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function selectedCandidateComparedManifestId(input: {
  selected_branch_action: ManifestBranchAction;
  selected_manifest_id: string;
  prior_manifest_id_or_null: string | null;
}) {
  if (input.selected_branch_action === "NEW_MANIFEST") {
    return null;
  }
  if (
    input.selected_branch_action === "RETURN_EXISTING_BUNDLE" ||
    input.selected_branch_action === "REUSE_SEALED_MANIFEST"
  ) {
    return input.selected_manifest_id;
  }
  return input.prior_manifest_id_or_null;
}

function assertSelectedCandidateBinding(input: {
  selectedCandidate: BranchCandidateEvaluationRecord;
  trace: ManifestLineageTraceRecord;
}) {
  const { selectedCandidate, trace } = input;
  const expectedComparedManifestId = selectedCandidateComparedManifestId({
    prior_manifest_id_or_null: trace.prior_manifest_id_or_null,
    selected_branch_action: trace.selected_branch_action,
    selected_manifest_id: trace.selected_manifest_id,
  });

  assertLineageExplorer(
    selectedCandidate.compared_manifest_id_or_null === expectedComparedManifestId,
    "MANIFEST_LINEAGE_TRACE_CANDIDATE_REF_INVALID",
    "selected candidate compared manifest ref must mirror the persisted branch action binding",
  );

  if (trace.selected_branch_action === "NEW_MANIFEST") {
    assertLineageExplorer(
      selectedCandidate.compared_manifest_hash_or_null === null &&
        selectedCandidate.compared_manifest_lifecycle_state_or_null === null,
      "MANIFEST_LINEAGE_TRACE_CANDIDATE_REF_INVALID",
      "selected NEW_MANIFEST candidate must not carry compared-manifest evidence",
    );
    return;
  }

  assertLineageExplorer(
    selectedCandidate.compared_manifest_hash_or_null ===
      trace.prior_manifest_hash_at_decision_or_null &&
      selectedCandidate.compared_manifest_lifecycle_state_or_null ===
        trace.prior_manifest_lifecycle_state_or_null,
    "MANIFEST_LINEAGE_TRACE_CANDIDATE_REF_INVALID",
    "selected candidate compared manifest hash and lifecycle must mirror persisted prior-manifest evidence",
  );
}

export function assertManifestLineageMirrorCoverage(trace: ManifestLineageTraceRecord) {
  assertLineageExplorer(
    trace.mirror_consistency_state === "ALL_MIRRORS_IN_SYNC",
    "MANIFEST_LINEAGE_TRACE_MIRROR_DIVERGENCE",
    "manifest lineage explorer fails closed unless persisted mirror state is ALL_MIRRORS_IN_SYNC",
  );

  const duplicateSources = trace.mirror_sources.filter(
    (source, index) => trace.mirror_sources.indexOf(source) !== index,
  );
  assertLineageExplorer(
    duplicateSources.length === 0,
    "MANIFEST_LINEAGE_TRACE_MIRROR_DIVERGENCE",
    "manifest lineage mirror sources must remain unique",
  );

  const expectedOrder = CANONICAL_MIRROR_SOURCE_ORDER.filter((source) =>
    trace.mirror_sources.includes(source),
  );
  assertLineageExplorer(
    sameJson(trace.mirror_sources, expectedOrder),
    "MANIFEST_LINEAGE_TRACE_MIRROR_DIVERGENCE",
    "manifest lineage mirror sources must follow canonical ordering",
  );

  const missingSources = REQUIRED_LINEAGE_MIRROR_SOURCES.filter(
    (source) => !trace.mirror_sources.includes(source),
  );
  assertLineageExplorer(
    missingSources.length === 0,
    "MANIFEST_LINEAGE_TRACE_MIRROR_DIVERGENCE",
    `manifest lineage mirror sources are missing ${missingSources.join(", ")}`,
  );
}

function assertNightlyPredecessorContext(trace: ManifestLineageTraceRecord) {
  if (trace.run_kind !== "NIGHTLY") {
    assertLineageExplorer(
      trace.nightly_context_reason_code_or_null === "NOT_NIGHTLY" &&
        trace.nightly_window_key_or_null === null &&
        trace.nightly_predecessor_batch_run_ref_or_null === null &&
        trace.nightly_predecessor_manifest_id_or_null === null &&
        trace.nightly_predecessor_manifest_hash_or_null === null,
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "non-nightly lineage traces must not carry nightly predecessor context",
    );
    return;
  }

  assertLineageExplorer(
    trace.nightly_window_key_or_null !== null,
    "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
    "nightly lineage traces require a persisted nightly window key",
  );

  if (trace.nightly_context_reason_code_or_null === "WINDOW_ADVANCE_FROM_PREDECESSOR") {
    assertLineageExplorer(
      trace.nightly_predecessor_batch_run_ref_or_null !== null &&
        trace.nightly_predecessor_manifest_id_or_null !== null &&
        trace.nightly_predecessor_manifest_hash_or_null !== null &&
        trace.selected_branch_reason_code === "NIGHTLY_WINDOW_ADVANCED",
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "nightly window advancement requires predecessor batch, manifest, hash, and NIGHTLY_WINDOW_ADVANCED reason evidence",
    );
    return;
  }

  if (trace.nightly_context_reason_code_or_null === "NO_PREDECESSOR_BATCH") {
    assertLineageExplorer(
      trace.nightly_predecessor_batch_run_ref_or_null === null &&
        trace.nightly_predecessor_manifest_id_or_null === null &&
        trace.nightly_predecessor_manifest_hash_or_null === null,
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "NO_PREDECESSOR_BATCH nightly traces must clear predecessor refs",
    );
    return;
  }

  assertLineageExplorer(
    trace.nightly_context_reason_code_or_null === "SAME_WINDOW_REUSE" &&
      (trace.selected_branch_action === "RETURN_EXISTING_BUNDLE" ||
        trace.selected_branch_action === "REUSE_SEALED_MANIFEST") &&
      trace.nightly_predecessor_batch_run_ref_or_null !== null &&
      trace.nightly_predecessor_manifest_id_or_null === trace.prior_manifest_id_or_null &&
      trace.nightly_predecessor_manifest_hash_or_null ===
        trace.prior_manifest_hash_at_decision_or_null,
    "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
    "same-window nightly reuse must preserve predecessor batch and mirror prior-manifest id/hash",
  );
}

export function assertManifestLineageCandidateCoverage(trace: ManifestLineageTraceRecord) {
  assertLineageExplorer(
    isStringSubset(trace.effective_scope, trace.requested_scope),
    "MANIFEST_LINEAGE_TRACE_EFFECTIVE_SCOPE_WIDENED",
    "manifest lineage trace effective_scope cannot widen beyond requested_scope",
  );

  const candidateEvaluations = validateBranchCandidateEvaluations({
    candidate_evaluations: trace.candidate_evaluations,
    selected_branch_action: trace.selected_branch_action,
  });
  const selectedCandidate = candidateEvaluations.find(
    (candidate) => candidate.evaluation_state === "SELECTED",
  );
  assertLineageExplorer(
    selectedCandidate !== undefined,
    "MANIFEST_LINEAGE_TRACE_CANDIDATE_REF_INVALID",
    "manifest lineage trace must contain one selected branch candidate",
  );
  assertSelectedCandidateBinding({ selectedCandidate, trace });
  assertManifestLineageMirrorCoverage(trace);
  assertNightlyPredecessorContext(trace);

  return {
    canonical_action_order: [...CANONICAL_BRANCH_ACTION_ORDER],
    candidate_evaluations: candidateEvaluations,
    selected_candidate: selectedCandidate,
  };
}
