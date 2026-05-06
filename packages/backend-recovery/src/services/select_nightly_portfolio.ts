import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  NightlyBatchRunPriorityTupleRecord,
  NightlyBatchRunRecord,
  NightlyBatchRunSelectionEntryRecord,
  NightlyBatchSelectionDisposition,
  NightlyBatchOutcomeBucket,
} from "../models/nightly_batch_run.ts";
import {
  deriveNightlySelectionBasisHash,
  deriveNightlySelectionCandidateIdentityHash,
  deriveNightlyStableTieBreakKey,
} from "./derive_nightly_selection_universe_hash.ts";

export type NightlyRequestedScope =
  NightlyBatchRunSelectionEntryRecord["requested_scope"][number];

export type NightlyPortfolioCandidateInput = {
  client_id: string;
  period: string;
  requested_scope: readonly NightlyRequestedScope[];
  reason_codes?: readonly string[];
  workflow_item_refs?: readonly string[];
  next_checkpoint_at?: string | null;
  priority_tuple?: Partial<NightlyBatchRunPriorityTupleRecord>;
  fairness_group_key?: string;
  shard_key?: string;
  authority_name?: string;
  operation_family?: string;
  reusable_terminal_result?: {
    prior_manifest_ref: string;
    reason_codes?: readonly string[];
  };
  stale_attempt_reclaim?: {
    prior_manifest_ref: string;
    predecessor_selection_entry_ref: string;
    reason_codes?: readonly string[];
  };
  active_attempt_ref?: string | null;
  retry_deferred_until?: string | null;
  escalation?: {
    workflow_item_refs: readonly string[];
    outcome_bucket?: Extract<
      NightlyBatchOutcomeBucket,
      "REVIEW_REQUIRED" | "REQUEST_CLIENT_INFO" | "BLOCKED_INTERNAL"
    >;
    reason_codes?: readonly string[];
  };
  ineligible_reason_codes?: readonly string[];
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function requireNonEmptyString(label: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function defaultWorkflowRef(input: {
  candidate_identity_hash: string;
  reason: string;
}) {
  return `workflow://nightly-selection/${input.reason}/${input.candidate_identity_hash}`;
}

function defaultShardKey(input: {
  tenant_id: string;
  nightly_window_key: string;
  fairness_group_key: string;
}) {
  return `nightly-shard.${(stableJsonHash(input) as string).slice(0, 24)}`;
}

function entryId(input: { batch_run_id: string; candidate_identity_hash: string }) {
  return `nightly-entry.${(stableJsonHash(input) as string).slice(0, 32)}`;
}

function normalizePriorityTuple(input: {
  candidate: NightlyPortfolioCandidateInput;
  disposition: NightlyBatchSelectionDisposition;
  stable_tie_break_key: string;
}): NightlyBatchRunPriorityTupleRecord {
  const priority = input.candidate.priority_tuple ?? {};
  const execution =
    input.disposition === "EXECUTE_NEW_MANIFEST" ||
    input.disposition === "EXECUTE_CONTINUATION_CHILD";
  return {
    deadline_bucket: priority.deadline_bucket ?? 3,
    filing_state_bucket: priority.filing_state_bucket ?? 2,
    authority_checkpoint_bucket: priority.authority_checkpoint_bucket ?? 2,
    risk_bucket: priority.risk_bucket ?? 2,
    automation_readiness_bucket: priority.automation_readiness_bucket ?? (execution ? 0 : 4),
    retry_ready_bucket: priority.retry_ready_bucket ?? 1,
    priority_score: priority.priority_score ?? (execution ? 1.25 : 0),
    expected_service_minutes: priority.expected_service_minutes ?? (execution ? 18.5 : 5.5),
    deadline_pressure: priority.deadline_pressure ?? (execution ? 0.6 : 0),
    checkpoint_pressure: priority.checkpoint_pressure ?? 0.2,
    risk_pressure: priority.risk_pressure ?? 0.3,
    fairness_credit: priority.fairness_credit ?? 0.4,
    retry_success_probability: priority.retry_success_probability ?? 0.7,
    retry_expected_gain: priority.retry_expected_gain ?? (execution ? 0.8 : 0),
    stable_tie_break_key: input.stable_tie_break_key,
  };
}

function resolveDisposition(candidate: NightlyPortfolioCandidateInput): {
  selection_disposition: NightlyBatchSelectionDisposition;
  terminal_result_reuse_state: NightlyBatchRunSelectionEntryRecord["terminal_result_reuse_state"];
  active_attempt_resolution_state: NightlyBatchRunSelectionEntryRecord["active_attempt_resolution_state"];
  prior_manifest_ref: string | null;
  predecessor_selection_entry_ref_or_null: string | null;
  workflow_item_refs: string[];
  next_checkpoint_at: string | null;
  outcome_bucket: NightlyBatchRunSelectionEntryRecord["outcome_bucket"];
  reason_codes: string[];
} {
  if (candidate.reusable_terminal_result) {
    return {
      selection_disposition: "REUSE_EXISTING_TERMINAL_RESULT",
      terminal_result_reuse_state: "REUSED_TERMINAL_RESULT",
      active_attempt_resolution_state: "NO_ACTIVE_ATTEMPT",
      prior_manifest_ref: requireNonEmptyString(
        "reusable_terminal_result.prior_manifest_ref",
        candidate.reusable_terminal_result.prior_manifest_ref,
      ),
      predecessor_selection_entry_ref_or_null: null,
      workflow_item_refs: [],
      next_checkpoint_at: null,
      outcome_bucket: "REUSED_RESULT",
      reason_codes: uniqueSorted([
        ...(candidate.reason_codes ?? []),
        ...(candidate.reusable_terminal_result.reason_codes ?? []),
        "TERMINAL_RESULT_REUSED",
      ]),
    };
  }

  if (candidate.stale_attempt_reclaim) {
    return {
      selection_disposition: "EXECUTE_CONTINUATION_CHILD",
      terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
      active_attempt_resolution_state: "STALE_ATTEMPT_RECLAIM_REQUIRED",
      prior_manifest_ref: requireNonEmptyString(
        "stale_attempt_reclaim.prior_manifest_ref",
        candidate.stale_attempt_reclaim.prior_manifest_ref,
      ),
      predecessor_selection_entry_ref_or_null: requireNonEmptyString(
        "stale_attempt_reclaim.predecessor_selection_entry_ref",
        candidate.stale_attempt_reclaim.predecessor_selection_entry_ref,
      ),
      workflow_item_refs: uniqueSorted(candidate.workflow_item_refs ?? []),
      next_checkpoint_at: candidate.next_checkpoint_at ?? null,
      outcome_bucket: null,
      reason_codes: uniqueSorted([
        ...(candidate.reason_codes ?? []),
        ...(candidate.stale_attempt_reclaim.reason_codes ?? []),
        "STALE_ATTEMPT_RECLAIM_REQUIRED",
      ]),
    };
  }

  if (candidate.active_attempt_ref) {
    return {
      selection_disposition: "DEFER_ACTIVE_ATTEMPT",
      terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
      active_attempt_resolution_state: "ACTIVE_ATTEMPT_DEFERRED",
      prior_manifest_ref: null,
      predecessor_selection_entry_ref_or_null: null,
      workflow_item_refs: uniqueSorted([
        ...(candidate.workflow_item_refs ?? []),
        `workflow://active-attempt/${candidate.active_attempt_ref}`,
      ]),
      next_checkpoint_at: candidate.next_checkpoint_at ?? new Date(0).toISOString(),
      outcome_bucket: "DEFERRED",
      reason_codes: uniqueSorted([
        ...(candidate.reason_codes ?? []),
        "SAME_WINDOW_ACTIVE_ATTEMPT_DEFERRED",
      ]),
    };
  }

  if (candidate.retry_deferred_until) {
    return {
      selection_disposition: "DEFER_RETRY_WINDOW",
      terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
      active_attempt_resolution_state: "NO_ACTIVE_ATTEMPT",
      prior_manifest_ref: null,
      predecessor_selection_entry_ref_or_null: null,
      workflow_item_refs: uniqueSorted(candidate.workflow_item_refs ?? []),
      next_checkpoint_at: candidate.retry_deferred_until,
      outcome_bucket: "DEFERRED",
      reason_codes: uniqueSorted([...(candidate.reason_codes ?? []), "RETRY_WINDOW_NOT_DUE"]),
    };
  }

  if (candidate.escalation) {
    return {
      selection_disposition: "ESCALATE_ONLY",
      terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
      active_attempt_resolution_state: "NO_ACTIVE_ATTEMPT",
      prior_manifest_ref: null,
      predecessor_selection_entry_ref_or_null: null,
      workflow_item_refs: uniqueSorted(candidate.escalation.workflow_item_refs),
      next_checkpoint_at: candidate.next_checkpoint_at ?? null,
      outcome_bucket: candidate.escalation.outcome_bucket ?? "REVIEW_REQUIRED",
      reason_codes: uniqueSorted([
        ...(candidate.reason_codes ?? []),
        ...(candidate.escalation.reason_codes ?? []),
        "OPERATOR_HANDOFF_REQUIRED",
      ]),
    };
  }

  if (candidate.ineligible_reason_codes && candidate.ineligible_reason_codes.length > 0) {
    return {
      selection_disposition: "SKIP_INELIGIBLE",
      terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
      active_attempt_resolution_state: "NO_ACTIVE_ATTEMPT",
      prior_manifest_ref: null,
      predecessor_selection_entry_ref_or_null: null,
      workflow_item_refs: uniqueSorted(candidate.workflow_item_refs ?? []),
      next_checkpoint_at: null,
      outcome_bucket: "SKIPPED",
      reason_codes: uniqueSorted([
        ...(candidate.reason_codes ?? []),
        ...candidate.ineligible_reason_codes,
      ]),
    };
  }

  return {
    selection_disposition: "EXECUTE_NEW_MANIFEST",
    terminal_result_reuse_state: "NO_REUSABLE_TERMINAL_RESULT",
    active_attempt_resolution_state: "NO_ACTIVE_ATTEMPT",
    prior_manifest_ref: null,
    predecessor_selection_entry_ref_or_null: null,
    workflow_item_refs: uniqueSorted(candidate.workflow_item_refs ?? []),
    next_checkpoint_at: candidate.next_checkpoint_at ?? null,
    outcome_bucket: null,
    reason_codes: uniqueSorted([...(candidate.reason_codes ?? []), "AUTONOMOUS_EXECUTION_ADMISSIBLE"]),
  };
}

export function selectNightlyPortfolio(input: {
  batch_run: Pick<
    NightlyBatchRunRecord,
    | "batch_run_id"
    | "tenant_id"
    | "nightly_window_key"
    | "trigger_class"
    | "recovery_resume_state"
    | "policy_snapshot_hash"
    | "autopilot_policy_hash"
    | "release_verification_manifest_ref"
    | "schema_bundle_hash"
    | "code_build_id"
    | "environment_ref"
    | "selection_universe_hash"
    | "global_concurrency_profile"
  >;
  candidates: readonly NightlyPortfolioCandidateInput[];
}) {
  const entries = input.candidates.map((candidate) => {
    const requestedScope = uniqueSorted(candidate.requested_scope) as NightlyRequestedScope[];
    const candidateIdentityHash = deriveNightlySelectionCandidateIdentityHash({
      tenant_id: input.batch_run.tenant_id,
      nightly_window_key: input.batch_run.nightly_window_key,
      client_id: candidate.client_id,
      period: candidate.period,
      requested_scope: requestedScope,
    });
    const disposition = resolveDisposition(candidate);
    if (
      (disposition.selection_disposition === "DEFER_ACTIVE_ATTEMPT" ||
        disposition.selection_disposition === "DEFER_RETRY_WINDOW") &&
      disposition.workflow_item_refs.length === 0
    ) {
      disposition.workflow_item_refs.push(
        defaultWorkflowRef({
          candidate_identity_hash: candidateIdentityHash,
          reason: disposition.selection_disposition.toLowerCase(),
        }),
      );
    }
    const execution =
      disposition.selection_disposition === "EXECUTE_NEW_MANIFEST" ||
      disposition.selection_disposition === "EXECUTE_CONTINUATION_CHILD";
    const fairnessGroupKey = execution
      ? candidate.fairness_group_key ??
        (candidate.authority_name && candidate.operation_family
          ? `${candidate.authority_name}|${candidate.operation_family}`
          : candidate.client_id)
      : null;
    const shardKey = execution
      ? candidate.shard_key ??
        defaultShardKey({
          tenant_id: input.batch_run.tenant_id,
          nightly_window_key: input.batch_run.nightly_window_key,
          fairness_group_key: fairnessGroupKey,
        })
      : null;
    const entryWithoutHashes: NightlyBatchRunSelectionEntryRecord = {
      entry_id: entryId({
        batch_run_id: input.batch_run.batch_run_id,
        candidate_identity_hash: candidateIdentityHash,
      }),
      candidate_identity_hash: candidateIdentityHash,
      selection_basis_hash: "",
      client_id: candidate.client_id,
      period: candidate.period,
      requested_scope: requestedScope,
      selection_disposition: disposition.selection_disposition,
      terminal_result_reuse_state: disposition.terminal_result_reuse_state,
      active_attempt_resolution_state: disposition.active_attempt_resolution_state,
      priority_tuple: normalizePriorityTuple({
        candidate,
        disposition: disposition.selection_disposition,
        stable_tie_break_key: "pending",
      }),
      reason_codes: disposition.reason_codes.length
        ? disposition.reason_codes
        : ["NIGHTLY_SELECTION_RESOLVED"],
      manifest_ref: null,
      prior_manifest_ref: disposition.prior_manifest_ref,
      predecessor_selection_entry_ref_or_null:
        disposition.predecessor_selection_entry_ref_or_null,
      workflow_item_refs: disposition.workflow_item_refs,
      next_checkpoint_at: disposition.next_checkpoint_at,
      fairness_group_key: fairnessGroupKey,
      shard_key: shardKey,
      outcome_bucket: disposition.outcome_bucket,
      executed_at: null,
    };
    const selectionBasisHash = deriveNightlySelectionBasisHash({
      batch: input.batch_run,
      entry: entryWithoutHashes,
    });
    entryWithoutHashes.selection_basis_hash = selectionBasisHash;
    entryWithoutHashes.priority_tuple = {
      ...entryWithoutHashes.priority_tuple,
      stable_tie_break_key: deriveNightlyStableTieBreakKey({
        client_id: entryWithoutHashes.client_id,
        period: entryWithoutHashes.period,
        requested_scope: entryWithoutHashes.requested_scope,
        selection_basis_hash: selectionBasisHash,
      }),
    };
    return entryWithoutHashes;
  });

  return entries.sort((left, right) => {
    const leftScore = left.priority_tuple.priority_score ?? 0;
    const rightScore = right.priority_tuple.priority_score ?? 0;
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return left.priority_tuple.stable_tie_break_key.localeCompare(
      right.priority_tuple.stable_tie_break_key,
    );
  });
}
