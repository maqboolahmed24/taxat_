import type {
  ManifestBranchDecisionContract,
  ManifestLineageTrace,
  ManifestLineageTraceCandidateEvaluation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

import { normalizeManifestBranchDecisionContract } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import {
  deriveManifestLineageTraceStableHash,
  normalizeManifestLineageTrace,
  type ManifestLineageTraceRecord,
} from "../models/manifest_lineage_trace.ts";
import { validateBranchCandidateEvaluations } from "./branch_candidate_evaluation_validator.ts";
import { evaluateManifestLineageMirrorConsistency } from "./mirror_consistency_state_evaluator.ts";

export type ManifestLineageTraceFactoryInput = {
  branch_decision_audit_refs: string[];
  branch_decision_trace_span_refs: string[];
  candidate_evaluations: ManifestLineageTraceCandidateEvaluation[];
  lineage_trace_id?: string;
  nightly_predecessor_context?: {
    nightly_context_reason_code:
      | "NO_PREDECESSOR_BATCH"
      | "SAME_WINDOW_REUSE"
      | "WINDOW_ADVANCE_FROM_PREDECESSOR";
    predecessor_batch_run_ref_or_null: string | null;
    predecessor_manifest_hash_or_null: string | null;
    predecessor_manifest_id_or_null: string | null;
  };
  request_branch_decision: ManifestBranchDecisionContract;
  selected_manifest: RunManifestRecord;
};

export type ManifestLineageTraceFactoryErrorCode =
  | "MANIFEST_LINEAGE_TRACE_BRANCH_SELECTED_MANIFEST_MISMATCH"
  | "MANIFEST_LINEAGE_TRACE_BRANCH_STATE_INVALID"
  | "MANIFEST_LINEAGE_TRACE_SCOPE_MISMATCH";

export class ManifestLineageTraceFactoryError extends Error {
  readonly code: ManifestLineageTraceFactoryErrorCode;

  constructor(code: ManifestLineageTraceFactoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageTraceFactoryError";
    this.code = code;
  }
}

function assertFactory(
  condition: unknown,
  code: ManifestLineageTraceFactoryErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageTraceFactoryError(code, detail);
  }
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function defaultNightlyContext(input: {
  branch_action: ManifestBranchDecisionContract["branch_action"];
  run_kind: ManifestBranchDecisionContract["run_kind"];
}) {
  if (input.run_kind !== "NIGHTLY") {
    return {
      nightly_context_reason_code: "NOT_NIGHTLY" as const,
      predecessor_batch_run_ref_or_null: null,
      predecessor_manifest_hash_or_null: null,
      predecessor_manifest_id_or_null: null,
    };
  }
  if (
    input.branch_action === "RETURN_EXISTING_BUNDLE" ||
    input.branch_action === "REUSE_SEALED_MANIFEST"
  ) {
    return {
      nightly_context_reason_code: "SAME_WINDOW_REUSE" as const,
      predecessor_batch_run_ref_or_null: null,
      predecessor_manifest_hash_or_null: null,
      predecessor_manifest_id_or_null: null,
    };
  }
  return {
    nightly_context_reason_code: "NO_PREDECESSOR_BATCH" as const,
    predecessor_batch_run_ref_or_null: null,
    predecessor_manifest_hash_or_null: null,
    predecessor_manifest_id_or_null: null,
  };
}

function deriveLineageTraceId(input: {
  request_branch_decision: ManifestBranchDecisionContract;
  selected_manifest: RunManifestRecord;
}) {
  const digest = stableJsonHash({
    artifact_family: "MANIFEST_LINEAGE_TRACE",
    request_identity_hash: input.request_branch_decision.request_identity_hash,
    selected_branch_action: input.request_branch_decision.branch_action,
    selected_manifest_id: input.selected_manifest.manifest_id,
  });
  return `mlt.${digest.slice(0, 32)}`;
}

function assertSelectedManifestMatchesBranchDecision(input: {
  branchDecision: ManifestBranchDecisionContract;
  selectedManifest: RunManifestRecord;
}) {
  const { branchDecision, selectedManifest } = input;
  assertFactory(
    branchDecision.selected_manifest_id === selectedManifest.manifest_id,
    "MANIFEST_LINEAGE_TRACE_BRANCH_SELECTED_MANIFEST_MISMATCH",
    "request-time branch decision selected manifest id must match the selected manifest",
  );
  assertFactory(
    branchDecision.selected_manifest_continuation_basis === selectedManifest.continuation_basis,
    "MANIFEST_LINEAGE_TRACE_BRANCH_SELECTED_MANIFEST_MISMATCH",
    "request-time branch decision must preserve the selected manifest continuation basis",
  );
  assertFactory(
    sameJson(branchDecision.effective_scope, selectedManifest.scope_execution_binding.executable_scope),
    "MANIFEST_LINEAGE_TRACE_SCOPE_MISMATCH",
    "request-time branch effective_scope must mirror the selected manifest executable scope",
  );

  if (branchDecision.branch_action === "RETURN_EXISTING_BUNDLE") {
    assertFactory(
      ["COMPLETED", "BLOCKED"].includes(selectedManifest.lifecycle_state) &&
        selectedManifest.decision_bundle_hash ===
          branchDecision.returned_decision_bundle_hash_or_null,
      "MANIFEST_LINEAGE_TRACE_BRANCH_STATE_INVALID",
      "bundle-return traces require a terminal selected manifest and matching decision bundle hash",
    );
  }
  if (branchDecision.branch_action === "REUSE_SEALED_MANIFEST") {
    assertFactory(
      selectedManifest.lifecycle_state === "SEALED",
      "MANIFEST_LINEAGE_TRACE_BRANCH_STATE_INVALID",
      "sealed-manifest reuse traces require a SEALED selected manifest",
    );
  }
}

export function buildManifestLineageTrace(
  input: ManifestLineageTraceFactoryInput,
): ManifestLineageTraceRecord {
  const branchDecision = normalizeManifestBranchDecisionContract(input.request_branch_decision);
  assertSelectedManifestMatchesBranchDecision({
    branchDecision,
    selectedManifest: input.selected_manifest,
  });
  const mirrorEvaluation = evaluateManifestLineageMirrorConsistency(input.selected_manifest);
  const candidateEvaluations = validateBranchCandidateEvaluations({
    candidate_evaluations: input.candidate_evaluations,
    selected_branch_action: branchDecision.branch_action,
  });
  const nightlyContext =
    input.nightly_predecessor_context ??
    defaultNightlyContext({
      branch_action: branchDecision.branch_action,
      run_kind: branchDecision.run_kind,
    });

  const trace: ManifestLineageTrace = {
    lineage_trace_id:
      input.lineage_trace_id ??
      deriveLineageTraceId({
        request_branch_decision: branchDecision,
        selected_manifest: input.selected_manifest,
      }),
    contract_version: "MANIFEST_LINEAGE_TRACE_V1",
    binding_scope: "RUN_MANIFEST_BRANCH_SELECTION",
    explorer_binding_policy: "PERSIST_SELECTED_BRANCH_AND_ALL_REJECTION_BASES",
    operator_rendering_policy: "USE_PERSISTED_TRACE_NOT_ADJACENT_MANIFEST_INFERENCE",
    mirror_consistency_policy: "SELECTED_MANIFEST_LINEAGE_MIRRORS_MUST_STAY_EXACT",
    nightly_context_policy:
      "NIGHTLY_WINDOW_AND_PREDECESSOR_CONTEXT_PERSISTED_WHEN_APPLICABLE",
    idempotency_key: branchDecision.idempotency_key,
    request_identity_hash: branchDecision.request_identity_hash,
    access_binding_hash: branchDecision.access_binding_hash,
    requested_scope: branchDecision.requested_scope as ManifestLineageTrace["requested_scope"],
    effective_scope: branchDecision.effective_scope as ManifestLineageTrace["effective_scope"],
    mode: branchDecision.mode,
    run_kind: branchDecision.run_kind,
    replay_class_or_null: branchDecision.replay_class_or_null,
    nightly_window_key_or_null: branchDecision.nightly_window_key_or_null,
    selected_branch_action: branchDecision.branch_action,
    selected_branch_reason_code: branchDecision.branch_reason_code,
    selected_manifest_id: input.selected_manifest.manifest_id,
    selected_manifest_continuation_basis: input.selected_manifest.continuation_basis,
    selected_manifest_generation: input.selected_manifest.manifest_generation,
    root_manifest_id: input.selected_manifest.root_manifest_id ?? input.selected_manifest.manifest_id,
    parent_manifest_id_or_null: input.selected_manifest.parent_manifest_id,
    continuation_of_manifest_id_or_null: input.selected_manifest.continuation_of_manifest_id,
    replay_of_manifest_id_or_null: input.selected_manifest.replay_of_manifest_id,
    supersedes_manifest_id_or_null: input.selected_manifest.supersedes_manifest_id,
    prior_manifest_id_or_null: branchDecision.prior_manifest_id_or_null,
    prior_manifest_hash_at_decision_or_null:
      branchDecision.prior_manifest_hash_at_decision_or_null,
    prior_manifest_lifecycle_state_or_null:
      branchDecision.prior_manifest_lifecycle_state_or_null,
    config_inheritance_mode_or_null: input.selected_manifest.continuation_set.config_inheritance_mode,
    input_inheritance_mode_or_null: input.selected_manifest.continuation_set.input_inheritance_mode,
    returned_decision_bundle_hash_or_null:
      branchDecision.returned_decision_bundle_hash_or_null,
    candidate_evaluations: candidateEvaluations,
    mirror_consistency_state: mirrorEvaluation.mirror_consistency_state,
    mirror_sources: mirrorEvaluation.mirror_sources,
    nightly_predecessor_batch_run_ref_or_null:
      nightlyContext.predecessor_batch_run_ref_or_null,
    nightly_predecessor_manifest_id_or_null:
      nightlyContext.predecessor_manifest_id_or_null,
    nightly_predecessor_manifest_hash_or_null:
      nightlyContext.predecessor_manifest_hash_or_null,
    nightly_context_reason_code_or_null: nightlyContext.nightly_context_reason_code,
    branch_decision_audit_refs: input.branch_decision_audit_refs,
    branch_decision_trace_span_refs: input.branch_decision_trace_span_refs,
  };

  return normalizeManifestLineageTrace(trace);
}

export function assertManifestLineageTraceByteStable(input: ManifestLineageTraceFactoryInput) {
  const first = buildManifestLineageTrace(input);
  const second = buildManifestLineageTrace(input);
  assertFactory(
    deriveManifestLineageTraceStableHash(first) === deriveManifestLineageTraceStableHash(second),
    "MANIFEST_LINEAGE_TRACE_BRANCH_STATE_INVALID",
    "same decided inputs must produce byte-stable trace artifacts",
  );
  return first;
}
