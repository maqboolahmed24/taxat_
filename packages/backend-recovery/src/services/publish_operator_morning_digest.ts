import {
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  nightlyBatchRunRef,
  type NightlyBatchOutcomeBucket,
  type NightlyBatchRunSelectionEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  buildOperatorMorningDigestFromBatch,
  isFailureOrHandoffOutcome,
  type OperatorMorningDigestRecord,
} from "../models/operator_morning_digest.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";
import {
  deriveNightlySelectionBasisHash,
  deriveNightlyStableTieBreakKey,
} from "./derive_nightly_selection_universe_hash.ts";

export type PublishOperatorMorningDigestInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  generated_by_principal_ref: string;
  workflow_publication_settled_at?: string | null;
  notification_publication_settled_at?: string | null;
  publication_qa_completed_at?: string | null;
  generated_at: string;
  published_at: string;
  published_notification_refs?: readonly string[];
  supersedes_digest_id?: string | null;
  supersession_root_digest_id?: string;
  supersession_reason_codes?: readonly string[];
};

export type PublishOperatorMorningDigestResult =
  | {
      publication_state: "WORKFLOW_PUBLICATION_PENDING" | "NOTIFICATION_PUBLICATION_PENDING";
      stored: StoredNightlyBatchRunRecord;
      digest: null;
    }
  | {
      publication_state: "PUBLISHED_COMPLETE";
      stored: StoredNightlyBatchRunRecord;
      digest: OperatorMorningDigestRecord;
    };

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function workflowRefForEntry(batchRunId: string, entryId: string, outcome: NightlyBatchOutcomeBucket) {
  return `workflow://nightly-handoff/${batchRunId}/${entryId}/${outcome.toLowerCase()}`;
}

function normalizeEntryForWorkflowPublication(input: {
  batch_run_id: string;
  entry: NightlyBatchRunSelectionEntryRecord;
  workflow_publication_settled_at: string;
}) {
  if (input.entry.outcome_bucket === null) {
    throw new Error(`entry ${input.entry.entry_id} is missing outcome_bucket`);
  }
  if (!isFailureOrHandoffOutcome(input.entry.outcome_bucket)) {
    return {
      ...input.entry,
      workflow_item_refs: [],
    } satisfies NightlyBatchRunSelectionEntryRecord;
  }
  const workflowRefs = uniqueSorted(
    input.entry.workflow_item_refs.length
      ? input.entry.workflow_item_refs
      : [
          workflowRefForEntry(
            input.batch_run_id,
            input.entry.entry_id,
            input.entry.outcome_bucket,
          ),
        ],
  );
  return {
    ...input.entry,
    workflow_item_refs: [workflowRefs[0]!],
    next_checkpoint_at:
      input.entry.outcome_bucket === "WAITING_ON_AUTHORITY" ||
      input.entry.outcome_bucket === "WAITING_ON_LATE_DATA" ||
      input.entry.outcome_bucket === "DEFERRED"
        ? input.entry.next_checkpoint_at ?? input.workflow_publication_settled_at
        : input.entry.next_checkpoint_at,
  } satisfies NightlyBatchRunSelectionEntryRecord;
}

function rederiveSelectionEntry(input: {
  batch: Parameters<typeof deriveNightlySelectionBasisHash>[0]["batch"];
  entry: NightlyBatchRunSelectionEntryRecord;
}) {
  const nextEntry: NightlyBatchRunSelectionEntryRecord = {
    ...input.entry,
    selection_basis_hash: "",
    priority_tuple: {
      ...input.entry.priority_tuple,
      stable_tie_break_key: "pending",
    },
  };
  const selectionBasisHash = deriveNightlySelectionBasisHash({
    batch: input.batch,
    entry: nextEntry,
  });
  return {
    ...nextEntry,
    selection_basis_hash: selectionBasisHash,
    priority_tuple: {
      ...nextEntry.priority_tuple,
      stable_tie_break_key: deriveNightlyStableTieBreakKey({
        client_id: nextEntry.client_id,
        period: nextEntry.period,
        requested_scope: nextEntry.requested_scope,
        selection_basis_hash: selectionBasisHash,
      }),
    },
  } satisfies NightlyBatchRunSelectionEntryRecord;
}

function sourceBatchRunRefs(batch: {
  reclaimed_predecessor_batch_run_ref: string | null;
  batch_run_id: string;
}) {
  return uniqueSorted([
    ...(batch.reclaimed_predecessor_batch_run_ref
      ? [batch.reclaimed_predecessor_batch_run_ref]
      : []),
    nightlyBatchRunRef(batch),
  ]);
}

function operatorMorningDigestRef(digest: OperatorMorningDigestRecord) {
  return `operator-morning-digest://${digest.digest_id}`;
}

function hasFailureOrHandoff(entries: readonly NightlyBatchRunSelectionEntryRecord[]) {
  return entries.some(
    (entry) => entry.outcome_bucket !== null && isFailureOrHandoffOutcome(entry.outcome_bucket),
  );
}

function publicationAuditRef(input: PublishOperatorMorningDigestInput, event: string) {
  return `audit://nightly-batch/${input.batch_run_id}/${event}/${input.published_at}`;
}

async function updatePendingState(input: {
  repository: NightlyBatchRunRepository;
  stored: StoredNightlyBatchRunRecord;
  publication_state: "WORKFLOW_PUBLICATION_PENDING" | "NOTIFICATION_PUBLICATION_PENDING";
  persisted_at: string;
}) {
  const batch = input.stored.nightly_batch_run;
  const pendingBatch = buildNightlyBatchRunRecord({
    ...batch,
    operator_digest_publication_state: input.publication_state,
  });
  return input.repository.upsertNightlyBatchRunIfRowVersion({
    batch_run: pendingBatch,
    expected_row_version: input.stored.nightly_batch_run_row_version,
    persisted_at: input.persisted_at,
  });
}

export async function publishOperatorMorningDigest(
  input: PublishOperatorMorningDigestInput,
): Promise<PublishOperatorMorningDigestResult> {
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const batch = stored.nightly_batch_run;
  if (batch.lifecycle_state !== "QUIESCING") {
    throw new Error(`cannot publish digest while lifecycle_state is ${batch.lifecycle_state}`);
  }
  if (!input.workflow_publication_settled_at) {
    return {
      publication_state: "WORKFLOW_PUBLICATION_PENDING",
      digest: null,
      stored: await updatePendingState({
        repository: input.repository,
        stored,
        publication_state: "WORKFLOW_PUBLICATION_PENDING",
        persisted_at: input.published_at,
      }),
    };
  }

  const workflowPublishedEntries = batch.selection_entries
    .map((entry) =>
      normalizeEntryForWorkflowPublication({
        batch_run_id: batch.batch_run_id,
        entry,
        workflow_publication_settled_at: input.workflow_publication_settled_at!,
      }),
    )
    .map((entry) => rederiveSelectionEntry({ batch, entry }));
  const workflowPublishedBatch = buildNightlyBatchRunRecord({
    ...batch,
    selection_entries: workflowPublishedEntries,
    operator_digest_publication_state: input.notification_publication_settled_at
      ? "WORKFLOW_PUBLICATION_PENDING"
      : "NOTIFICATION_PUBLICATION_PENDING",
  });

  if (!input.notification_publication_settled_at) {
    return {
      publication_state: "NOTIFICATION_PUBLICATION_PENDING",
      digest: null,
      stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
        batch_run: {
          ...workflowPublishedBatch,
          operator_digest_publication_state: "NOTIFICATION_PUBLICATION_PENDING",
        },
        expected_row_version: stored.nightly_batch_run_row_version,
        persisted_at: input.published_at,
      }),
    };
  }
  if (!input.publication_qa_completed_at) {
    return {
      publication_state: "NOTIFICATION_PUBLICATION_PENDING",
      digest: null,
      stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
        batch_run: {
          ...workflowPublishedBatch,
          operator_digest_publication_state: "NOTIFICATION_PUBLICATION_PENDING",
        },
        expected_row_version: stored.nightly_batch_run_row_version,
        persisted_at: input.published_at,
      }),
    };
  }

  const publicationGeneration = input.supersedes_digest_id ? 2 : 1;
  const digest = buildOperatorMorningDigestFromBatch({
    batch_run: workflowPublishedBatch,
    source_batch_run_refs: sourceBatchRunRefs(workflowPublishedBatch),
    generated_by_principal_ref: input.generated_by_principal_ref,
    workflow_publication_settled_at: input.workflow_publication_settled_at,
    notification_publication_settled_at: input.notification_publication_settled_at,
    publication_qa_completed_at: input.publication_qa_completed_at,
    generated_at: input.generated_at,
    published_at: input.published_at,
    published_notification_refs: input.published_notification_refs ?? [],
    publication_generation: publicationGeneration,
    supersedes_digest_id: input.supersedes_digest_id ?? null,
    supersession_root_digest_id: input.supersession_root_digest_id,
    supersession_reason_codes: input.supersession_reason_codes,
  });
  const finalState = hasFailureOrHandoff(workflowPublishedBatch.selection_entries)
    ? "COMPLETED_WITH_FAILURES"
    : "COMPLETED";
  const auditRef = publicationAuditRef(
    input,
    finalState === "COMPLETED" ? "batch_completed_clean" : "batch_completed_with_failures",
  );
  const completedBatch = buildNightlyBatchRunRecord({
    ...workflowPublishedBatch,
    lifecycle_state: finalState,
    state_transition_contract: buildNightlyBatchStateTransitionContract({
      current_state: finalState,
      previous_state_or_null: "QUIESCING",
      transition_event_code:
        finalState === "COMPLETED"
          ? "batch_completed_clean"
          : "batch_completed_with_failures",
      transition_applied_at: input.published_at,
      transition_audit_ref: auditRef,
    }),
    completed_at: input.published_at,
    operator_digest_publication_state: "PUBLISHED_COMPLETE",
    operator_digest_derivation_contract_or_null: digest.derivation_contract,
    operator_digest_ref: operatorMorningDigestRef(digest),
    audit_refs: [...new Set([...workflowPublishedBatch.audit_refs, auditRef])].sort(),
  });
  return {
    publication_state: "PUBLISHED_COMPLETE",
    digest,
    stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
      batch_run: completedBatch,
      expected_row_version: stored.nightly_batch_run_row_version,
      persisted_at: input.published_at,
    }),
  };
}
