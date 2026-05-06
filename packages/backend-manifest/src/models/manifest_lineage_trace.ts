import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type {
  ManifestLineageTrace,
  ManifestLineageTraceCandidateEvaluation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

import {
  CANONICAL_BRANCH_ACTION_ORDER,
  CANONICAL_MIRROR_SOURCE_ORDER,
  type ManifestBranchAction,
  type ManifestMirrorSource,
} from "./manifest_branch_decision_contract.ts";

export type ManifestLineageTraceRecord = ManifestLineageTrace;
export type BranchCandidateEvaluationRecord = ManifestLineageTraceCandidateEvaluation;

export const MANIFEST_LINEAGE_TRACE_CONTRACT_VERSION = "MANIFEST_LINEAGE_TRACE_V1";
export const MANIFEST_LINEAGE_TRACE_BINDING_SCOPE = "RUN_MANIFEST_BRANCH_SELECTION";
export const MANIFEST_LINEAGE_TRACE_REF_PREFIX = "manifest-lineage-trace://";

export type ManifestLineageTraceErrorCode =
  | "MANIFEST_LINEAGE_TRACE_FIELD_REQUIRED"
  | "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID"
  | "MANIFEST_LINEAGE_TRACE_RETURN_BUNDLE_INVALID";

export class ManifestLineageTraceError extends Error {
  readonly code: ManifestLineageTraceErrorCode;

  constructor(code: ManifestLineageTraceErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageTraceError";
    this.code = code;
  }
}

function assertTrace(
  condition: unknown,
  code: ManifestLineageTraceErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageTraceError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function normalizeMirrorSources(values: readonly ManifestMirrorSource[]) {
  const valueSet = new Set(values);
  return CANONICAL_MIRROR_SOURCE_ORDER.filter((source) => valueSet.has(source));
}

function validateReturnedBundlePosture(trace: ManifestLineageTraceRecord) {
  assertTrace(
    trace.selected_branch_action === "RETURN_EXISTING_BUNDLE"
      ? trace.returned_decision_bundle_hash_or_null !== null
      : trace.returned_decision_bundle_hash_or_null === null,
    "MANIFEST_LINEAGE_TRACE_RETURN_BUNDLE_INVALID",
    "returned_decision_bundle_hash_or_null is present only for bundle-return traces",
  );
}

function validateNightlyContext(trace: ManifestLineageTraceRecord) {
  if (trace.run_kind !== "NIGHTLY") {
    assertTrace(
      trace.nightly_window_key_or_null === null &&
        trace.nightly_predecessor_batch_run_ref_or_null === null &&
        trace.nightly_predecessor_manifest_id_or_null === null &&
        trace.nightly_predecessor_manifest_hash_or_null === null &&
        trace.nightly_context_reason_code_or_null === "NOT_NIGHTLY",
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "non-nightly traces must null all nightly predecessor fields and use NOT_NIGHTLY",
    );
    return;
  }

  assertTrace(
    trace.nightly_window_key_or_null !== null,
    "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
    "nightly traces require nightly_window_key_or_null",
  );

  if (
    trace.selected_branch_action === "CONTINUATION_CHILD" &&
    trace.selected_branch_reason_code === "NIGHTLY_WINDOW_ADVANCED"
  ) {
    assertTrace(
      trace.nightly_context_reason_code_or_null === "WINDOW_ADVANCE_FROM_PREDECESSOR" &&
        trace.nightly_predecessor_batch_run_ref_or_null !== null &&
        trace.nightly_predecessor_manifest_id_or_null !== null &&
        trace.nightly_predecessor_manifest_hash_or_null !== null,
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "nightly window advancement requires frozen predecessor batch, manifest, and hash context",
    );
    return;
  }

  if (
    trace.selected_branch_action === "RETURN_EXISTING_BUNDLE" ||
    trace.selected_branch_action === "REUSE_SEALED_MANIFEST"
  ) {
    assertTrace(
      trace.nightly_context_reason_code_or_null === "SAME_WINDOW_REUSE",
      "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
      "nightly same-window reuse must remain typed as SAME_WINDOW_REUSE",
    );
    return;
  }

  assertTrace(
    trace.nightly_context_reason_code_or_null === "NO_PREDECESSOR_BATCH" ||
      trace.nightly_context_reason_code_or_null === "WINDOW_ADVANCE_FROM_PREDECESSOR",
    "MANIFEST_LINEAGE_TRACE_NIGHTLY_CONTEXT_INVALID",
    "nightly traces must retain explicit predecessor disposition",
  );
}

export function normalizeManifestLineageTrace(
  trace: ManifestLineageTraceRecord,
): ManifestLineageTraceRecord {
  const requested_scope = normalizeScopeSequence(
    "manifest_lineage_trace.requested_scope",
    trace.requested_scope,
  );
  const effective_scope = normalizeScopeSequence(
    "manifest_lineage_trace.effective_scope",
    trace.effective_scope,
  );
  const branch_decision_audit_refs = normalizeStringSet(
    "manifest_lineage_trace.branch_decision_audit_refs",
    trace.branch_decision_audit_refs,
    { minItems: 1 },
  );
  const branch_decision_trace_span_refs = normalizeStringSet(
    "manifest_lineage_trace.branch_decision_trace_span_refs",
    trace.branch_decision_trace_span_refs,
    { minItems: 1 },
  );

  const normalized: ManifestLineageTraceRecord = {
    ...structuredClone(trace),
    lineage_trace_id: requireTrimmedString(
      "manifest_lineage_trace.lineage_trace_id",
      trace.lineage_trace_id,
    ),
    contract_version: MANIFEST_LINEAGE_TRACE_CONTRACT_VERSION,
    binding_scope: MANIFEST_LINEAGE_TRACE_BINDING_SCOPE,
    explorer_binding_policy: "PERSIST_SELECTED_BRANCH_AND_ALL_REJECTION_BASES",
    operator_rendering_policy: "USE_PERSISTED_TRACE_NOT_ADJACENT_MANIFEST_INFERENCE",
    mirror_consistency_policy: "SELECTED_MANIFEST_LINEAGE_MIRRORS_MUST_STAY_EXACT",
    nightly_context_policy:
      "NIGHTLY_WINDOW_AND_PREDECESSOR_CONTEXT_PERSISTED_WHEN_APPLICABLE",
    idempotency_key: requireTrimmedString(
      "manifest_lineage_trace.idempotency_key",
      trace.idempotency_key,
    ),
    request_identity_hash: requireTrimmedString(
      "manifest_lineage_trace.request_identity_hash",
      trace.request_identity_hash,
    ),
    access_binding_hash: requireTrimmedString(
      "manifest_lineage_trace.access_binding_hash",
      trace.access_binding_hash,
    ),
    requested_scope,
    effective_scope,
    nightly_window_key_or_null: normalizeOptionalString(
      "manifest_lineage_trace.nightly_window_key_or_null",
      trace.nightly_window_key_or_null,
    ),
    selected_manifest_id: requireTrimmedString(
      "manifest_lineage_trace.selected_manifest_id",
      trace.selected_manifest_id,
    ),
    root_manifest_id: requireTrimmedString(
      "manifest_lineage_trace.root_manifest_id",
      trace.root_manifest_id,
    ),
    parent_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.parent_manifest_id_or_null",
      trace.parent_manifest_id_or_null,
    ),
    continuation_of_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.continuation_of_manifest_id_or_null",
      trace.continuation_of_manifest_id_or_null,
    ),
    replay_of_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.replay_of_manifest_id_or_null",
      trace.replay_of_manifest_id_or_null,
    ),
    supersedes_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.supersedes_manifest_id_or_null",
      trace.supersedes_manifest_id_or_null,
    ),
    prior_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.prior_manifest_id_or_null",
      trace.prior_manifest_id_or_null,
    ),
    prior_manifest_hash_at_decision_or_null: normalizeOptionalString(
      "manifest_lineage_trace.prior_manifest_hash_at_decision_or_null",
      trace.prior_manifest_hash_at_decision_or_null,
    ),
    returned_decision_bundle_hash_or_null: normalizeOptionalString(
      "manifest_lineage_trace.returned_decision_bundle_hash_or_null",
      trace.returned_decision_bundle_hash_or_null,
    ),
    mirror_consistency_state: "ALL_MIRRORS_IN_SYNC",
    mirror_sources: normalizeMirrorSources(trace.mirror_sources),
    nightly_predecessor_batch_run_ref_or_null: normalizeOptionalString(
      "manifest_lineage_trace.nightly_predecessor_batch_run_ref_or_null",
      trace.nightly_predecessor_batch_run_ref_or_null,
    ),
    nightly_predecessor_manifest_id_or_null: normalizeOptionalString(
      "manifest_lineage_trace.nightly_predecessor_manifest_id_or_null",
      trace.nightly_predecessor_manifest_id_or_null,
    ),
    nightly_predecessor_manifest_hash_or_null: normalizeOptionalString(
      "manifest_lineage_trace.nightly_predecessor_manifest_hash_or_null",
      trace.nightly_predecessor_manifest_hash_or_null,
    ),
    branch_decision_audit_refs,
    branch_decision_trace_span_refs,
  };

  assertTrace(
    CANONICAL_BRANCH_ACTION_ORDER.includes(
      normalized.selected_branch_action as ManifestBranchAction,
    ),
    "MANIFEST_LINEAGE_TRACE_FIELD_REQUIRED",
    "selected_branch_action must use the canonical manifest branch vocabulary",
  );
  assertTrace(
    typeof normalized.selected_branch_reason_code === "string" &&
      normalized.selected_branch_reason_code.length > 0,
    "MANIFEST_LINEAGE_TRACE_FIELD_REQUIRED",
    "selected_branch_reason_code must be a typed branch reason",
  );
  validateReturnedBundlePosture(normalized);
  validateNightlyContext(normalized);
  return normalized;
}

export function cloneManifestLineageTrace(trace: ManifestLineageTraceRecord) {
  return structuredClone(trace);
}

export function manifestLineageTraceRef(trace: Pick<ManifestLineageTraceRecord, "lineage_trace_id">) {
  const lineageTraceId = requireTrimmedString("lineage_trace_id", trace.lineage_trace_id);
  return lineageTraceId.startsWith(MANIFEST_LINEAGE_TRACE_REF_PREFIX)
    ? lineageTraceId
    : `${MANIFEST_LINEAGE_TRACE_REF_PREFIX}${lineageTraceId}`;
}

export function deriveManifestLineageTraceStableHash(trace: ManifestLineageTraceRecord) {
  return stableJsonHash(normalizeManifestLineageTrace(trace));
}
