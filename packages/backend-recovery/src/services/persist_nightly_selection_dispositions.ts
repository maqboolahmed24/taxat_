import {
  assertNightlyBatchRun,
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  buildNightlyShardPlan,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
} from "../models/nightly_batch_run.ts";
import { buildNightlyBatchIdentityContract } from "../models/nightly_batch_identity_contract.ts";
import { deriveNightlySelectionUniverseHashFromCandidateHashes } from "./derive_nightly_selection_universe_hash.ts";

export type PersistNightlySelectionDispositionsInput = {
  batch_run: NightlyBatchRunRecord;
  selection_entries: readonly NightlyBatchRunSelectionEntryRecord[];
  selection_started_at: string;
  selection_completed_at: string;
  transition_audit_ref: string;
  backlog_pressure?: number | null;
  portfolio_tail_risk?: number | null;
  stability_state?: NightlyBatchRunRecord["stability_state"];
};

export function persistNightlySelectionDispositions(
  input: PersistNightlySelectionDispositionsInput,
) {
  const candidateHashes = input.selection_entries.map((entry) => entry.candidate_identity_hash);
  const selectionUniverseHash = deriveNightlySelectionUniverseHashFromCandidateHashes(candidateHashes);
  const plannedAt = input.selection_completed_at;
  const transition = buildNightlyBatchStateTransitionContract({
    current_state: "PLANNED",
    previous_state_or_null: "SELECTING",
    transition_event_code: "selection_completed",
    transition_applied_at: plannedAt,
    transition_audit_ref: input.transition_audit_ref,
  });
  const auditRefs = [...new Set([...input.batch_run.audit_refs, input.transition_audit_ref])].sort();

  const batch = buildNightlyBatchRunRecord({
    ...input.batch_run,
    lifecycle_state: "PLANNED",
    state_transition_contract: transition,
    identity_contract: buildNightlyBatchIdentityContract({
      tenant_id: input.batch_run.tenant_id,
      nightly_window_key: input.batch_run.nightly_window_key,
      trigger_class: input.batch_run.trigger_class,
      release_verification_manifest_ref: input.batch_run.release_verification_manifest_ref,
      policy_snapshot_hash: input.batch_run.policy_snapshot_hash,
      autopilot_policy_hash: input.batch_run.autopilot_policy_hash,
      scheduler_dedupe_key: input.batch_run.scheduler_dedupe_key,
      schema_bundle_hash: input.batch_run.schema_bundle_hash,
      code_build_id: input.batch_run.code_build_id,
      environment_ref: input.batch_run.environment_ref,
      selection_universe_hash: selectionUniverseHash,
      selection_universe_count: input.selection_entries.length,
      reclaimed_predecessor_batch_run_ref_or_null:
        input.batch_run.reclaimed_predecessor_batch_run_ref,
      recovery_resume_state: input.batch_run.recovery_resume_state,
    }),
    selection_universe_hash: selectionUniverseHash,
    selection_universe_count: input.selection_entries.length,
    selection_entries: [...input.selection_entries],
    shard_plan: buildNightlyShardPlan({
      entries: input.selection_entries,
      global_concurrency_profile: input.batch_run.global_concurrency_profile,
      planned_at: plannedAt,
    }),
    selection_started_at: input.selection_started_at,
    selection_completed_at: plannedAt,
    started_at: null,
    last_heartbeat_at: null,
    quiesced_at: null,
    completed_at: null,
    abandoned_at: null,
    successor_batch_run_ref: null,
    backlog_pressure: input.backlog_pressure ?? input.batch_run.backlog_pressure,
    portfolio_tail_risk: input.portfolio_tail_risk ?? input.batch_run.portfolio_tail_risk,
    stability_state: input.stability_state ?? input.batch_run.stability_state ?? "NORMAL",
    operator_digest_publication_state: "NOT_READY",
    operator_digest_derivation_contract_or_null: null,
    operator_digest_ref: null,
    audit_refs: auditRefs,
  });

  return assertNightlyBatchRun(batch);
}
