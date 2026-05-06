import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  OperatorMorningDigest as GeneratedOperatorMorningDigest,
  OperatorMorningDigestQueueSummary,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import {
  assertOperatorDigestDerivationContract,
  buildOperatorDigestDerivationContract,
  emptyOperatorDigestOutcomeEntryRefs,
  emptyOperatorDigestSummaryCounts,
  isOperatorDigestUnresolvedOutcome,
  OPERATOR_DIGEST_QUEUE_SOURCE_BASIS,
  OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME,
  type OperatorDigestHighlightedClientOutcome,
  type OperatorDigestOutcomeBucket,
  type OperatorDigestOutcomeEntryRefs,
  type OperatorDigestSummaryCounts,
} from "./operator_digest_derivation_contract.ts";
import {
  buildNightlyExecutionModeBoundaryContract,
  nightlyBatchRunRef,
  type NightlyBatchOutcomeBucket,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
} from "./nightly_batch_run.ts";

export type OperatorMorningDigestRecord = Omit<
  GeneratedOperatorMorningDigest,
  "highlighted_client_outcomes"
> & {
  highlighted_client_outcomes: OperatorDigestHighlightedClientOutcome[];
};

export type OperatorMorningDigestErrorCode =
  | "OPERATOR_MORNING_DIGEST_FIELD_INVALID"
  | "OPERATOR_MORNING_DIGEST_PARTITION_INVALID"
  | "OPERATOR_MORNING_DIGEST_DERIVATION_INVALID";

export class OperatorMorningDigestError extends Error {
  readonly code: OperatorMorningDigestErrorCode;

  constructor(code: OperatorMorningDigestErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "OperatorMorningDigestError";
    this.code = code;
  }
}

function assertDigest(
  condition: unknown,
  code: OperatorMorningDigestErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new OperatorMorningDigestError(code, detail);
  }
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values: readonly string[]) {
  const sorted = sortStrings([...new Set(values)]);
  assertDigest(
    sorted.length === values.length,
    "OPERATOR_MORNING_DIGEST_FIELD_INVALID",
    "digest ref lists must be unique",
  );
  return sorted;
}

function coverageDateFromWindow(nightlyWindowKey: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(nightlyWindowKey)
    ? nightlyWindowKey.slice(0, 10)
    : nightlyWindowKey;
}

function outcomeBucketForDigest(entry: NightlyBatchRunSelectionEntryRecord) {
  assertDigest(
    entry.outcome_bucket !== null,
    "OPERATOR_MORNING_DIGEST_PARTITION_INVALID",
    `selection entry ${entry.entry_id} must have an outcome before digest publication`,
  );
  return entry.outcome_bucket as OperatorDigestOutcomeBucket;
}

export function deriveOperatorMorningDigestId(input: {
  tenant_id: string;
  coverage_date: string;
  source_batch_run_refs: readonly string[];
  publication_generation: number;
}) {
  return `operator-digest.${(stableJsonHash({
    tenant_id: input.tenant_id,
    coverage_date: input.coverage_date,
    source_batch_run_refs: sortStrings(input.source_batch_run_refs),
    publication_generation: input.publication_generation,
  }) as string).slice(0, 32)}`;
}

function outcomeEntryPartitions(entries: readonly NightlyBatchRunSelectionEntryRecord[]) {
  const outcomeEntryRefs = emptyOperatorDigestOutcomeEntryRefs();
  const summaryCounts = emptyOperatorDigestSummaryCounts();
  for (const entry of entries) {
    const outcomeBucket = outcomeBucketForDigest(entry);
    const summaryField = OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME[outcomeBucket];
    outcomeEntryRefs[summaryField].push(entry.entry_id);
    summaryCounts[summaryField] += 1;
  }
  for (const field of Object.keys(outcomeEntryRefs) as (keyof OperatorDigestOutcomeEntryRefs)[]) {
    outcomeEntryRefs[field] = sortStrings(outcomeEntryRefs[field]);
  }
  return { outcomeEntryRefs, summaryCounts };
}

function entryLossScore(entry: NightlyBatchRunSelectionEntryRecord) {
  const outcomeBucket = entry.outcome_bucket ?? "SKIPPED";
  const blockingWeight =
    outcomeBucket === "REVIEW_REQUIRED" ||
    outcomeBucket === "BLOCKED_INTERNAL" ||
    outcomeBucket === "FAILED_NON_RETRYABLE"
      ? 2
      : 0;
  const authorityWeight =
    outcomeBucket === "WAITING_ON_AUTHORITY" && entry.next_checkpoint_at !== null ? 1 : 0;
  const failureWeight =
    outcomeBucket === "FAILED_RETRYABLE" || outcomeBucket === "FAILED_NON_RETRYABLE" ? 1.5 : 0;
  return Number(
    (
      (entry.priority_tuple.deadline_pressure ?? 0) * 3 +
      (entry.priority_tuple.risk_pressure ?? 0) * 3 +
      blockingWeight +
      authorityWeight +
      failureWeight +
      (entry.priority_tuple.priority_score ?? 0) / 100
    ).toFixed(6),
  );
}

function publishedWorkflowRefForEntry(entry: NightlyBatchRunSelectionEntryRecord) {
  const refs = sortStrings(entry.workflow_item_refs);
  assertDigest(
    refs.length === 1,
    "OPERATOR_MORNING_DIGEST_PARTITION_INVALID",
    `unresolved entry ${entry.entry_id} must have exactly one published workflow item ref`,
  );
  return refs[0]!;
}

function buildQueueSummaries(input: {
  tenant_id: string;
  coverage_date: string;
  entries: readonly NightlyBatchRunSelectionEntryRecord[];
}) {
  const byQueue = new Map<
    string,
    {
      entries: NightlyBatchRunSelectionEntryRecord[];
      item_refs: string[];
      reason_codes: string[];
    }
  >();
  for (const entry of input.entries) {
    const outcomeBucket = outcomeBucketForDigest(entry);
    if (!isOperatorDigestUnresolvedOutcome(outcomeBucket)) {
      continue;
    }
    const summaryField = OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME[outcomeBucket];
    const queueRef = `queue://nightly-handoff/${input.tenant_id}/${input.coverage_date}/${summaryField}`;
    const current = byQueue.get(queueRef) ?? {
      entries: [],
      item_refs: [],
      reason_codes: [],
    };
    current.entries.push(entry);
    current.item_refs.push(publishedWorkflowRefForEntry(entry));
    current.reason_codes.push(outcomeBucket, ...entry.reason_codes);
    byQueue.set(queueRef, current);
  }
  return [...byQueue.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([queue_ref, group]): OperatorMorningDigestQueueSummary => {
      const highest = [...group.entries].sort(
        (left, right) =>
          (right.priority_tuple.priority_score ?? 0) -
            (left.priority_tuple.priority_score ?? 0) ||
          left.priority_tuple.stable_tie_break_key.localeCompare(
            right.priority_tuple.stable_tie_break_key,
          ),
      )[0]!;
      const itemRefs = sortStrings(group.item_refs);
      return {
        queue_ref,
        source_basis: OPERATOR_DIGEST_QUEUE_SOURCE_BASIS,
        item_refs: itemRefs,
        dominant_reason_codes: sortStrings([...new Set(group.reason_codes)]),
        item_count: itemRefs.length,
        highest_priority: {
          deadline_bucket: highest.priority_tuple.deadline_bucket,
          risk_bucket: highest.priority_tuple.risk_bucket,
          stable_tie_break_key: highest.priority_tuple.stable_tie_break_key,
        },
      };
    });
}

function buildHighlightedClientOutcomes(
  entries: readonly NightlyBatchRunSelectionEntryRecord[],
) {
  return [...entries]
    .map((entry) => {
      const outcomeBucket = outcomeBucketForDigest(entry);
      const unresolved = isOperatorDigestUnresolvedOutcome(outcomeBucket);
      return {
        selection_entry_ref: entry.entry_id,
        client_id: entry.client_id,
        period: entry.period,
        dominant_outcome: outcomeBucket,
        highlight_rank: 0,
        entry_loss_score: entryLossScore(entry),
        manifest_ref: entry.manifest_ref,
        work_item_ref: unresolved ? publishedWorkflowRefForEntry(entry) : null,
        reason_codes: sortStrings(entry.reason_codes),
        next_checkpoint_at:
          outcomeBucket === "WAITING_ON_AUTHORITY" ||
          outcomeBucket === "WAITING_ON_LATE_DATA" ||
          outcomeBucket === "DEFERRED"
            ? entry.next_checkpoint_at
            : null,
      } satisfies OperatorDigestHighlightedClientOutcome;
    })
    .sort(
      (left, right) =>
        right.entry_loss_score - left.entry_loss_score ||
        left.selection_entry_ref.localeCompare(right.selection_entry_ref),
    )
    .map((outcome, index) => ({
      ...outcome,
      highlight_rank: index + 1,
    }));
}

export type BuildOperatorMorningDigestFromBatchInput = {
  batch_run: NightlyBatchRunRecord;
  source_batch_run_refs?: readonly string[];
  coverage_date?: string;
  generated_by_principal_ref: string;
  workflow_publication_settled_at: string;
  notification_publication_settled_at: string;
  publication_qa_completed_at: string;
  generated_at: string;
  published_at: string;
  published_notification_refs?: readonly string[];
  publication_generation?: number;
  supersedes_digest_id?: string | null;
  supersession_root_digest_id?: string;
  supersession_reason_codes?: readonly string[];
};

export function buildOperatorMorningDigestFromBatch(
  input: BuildOperatorMorningDigestFromBatchInput,
): OperatorMorningDigestRecord {
  const batch = input.batch_run;
  const coverageDate = input.coverage_date ?? coverageDateFromWindow(batch.nightly_window_key);
  const sourceBatchRunRefs = uniqueSorted(
    input.source_batch_run_refs ?? [nightlyBatchRunRef(batch)],
  );
  assertDigest(
    sourceBatchRunRefs.length > 0,
    "OPERATOR_MORNING_DIGEST_FIELD_INVALID",
    "source_batch_run_refs must not be empty",
  );
  const publicationGeneration =
    input.publication_generation ?? (input.supersedes_digest_id ? 2 : 1);
  const digestId = deriveOperatorMorningDigestId({
    tenant_id: batch.tenant_id,
    coverage_date: coverageDate,
    source_batch_run_refs: sourceBatchRunRefs,
    publication_generation: publicationGeneration,
  });
  const coveredSelectionEntryRefs = sortStrings(
    batch.selection_entries.map((entry) => entry.entry_id),
  );
  const { outcomeEntryRefs, summaryCounts } = outcomeEntryPartitions(batch.selection_entries);
  const publishedWorkflowItemRefs = sortStrings(
    batch.selection_entries.flatMap((entry) => entry.workflow_item_refs),
  );
  const queueSummaries = buildQueueSummaries({
    tenant_id: batch.tenant_id,
    coverage_date: coverageDate,
    entries: batch.selection_entries,
  });
  const highlightedClientOutcomes = buildHighlightedClientOutcomes(batch.selection_entries);
  const waitingOnAuthorityRefs = sortStrings(
    batch.selection_entries
      .filter((entry) => entry.outcome_bucket === "WAITING_ON_AUTHORITY")
      .map((entry) => `authority://nightly-wait/${batch.batch_run_id}/${entry.entry_id}`),
  );
  const lateDataHoldRefs = sortStrings(
    batch.selection_entries
      .filter((entry) => entry.outcome_bucket === "WAITING_ON_LATE_DATA")
      .map((entry) => `late-data-hold://nightly/${batch.batch_run_id}/${entry.entry_id}`),
  );
  const publishedNotificationRefs = uniqueSorted(input.published_notification_refs ?? []);
  const derivationContract = buildOperatorDigestDerivationContract({
    digest_id: digestId,
    execution_mode_boundary_contract:
      batch.execution_mode_boundary_contract ?? buildNightlyExecutionModeBoundaryContract(),
    coverage_date: coverageDate,
    nightly_window_key: batch.nightly_window_key,
    source_batch_run_refs: sourceBatchRunRefs,
    covered_selection_entry_refs: coveredSelectionEntryRefs,
    outcome_entry_refs: outcomeEntryRefs,
    queue_summaries: queueSummaries,
    highlighted_client_outcomes: highlightedClientOutcomes,
    published_workflow_item_refs: publishedWorkflowItemRefs,
    published_notification_refs: publishedNotificationRefs,
    waiting_on_authority_refs: waitingOnAuthorityRefs,
    late_data_hold_refs: lateDataHoldRefs,
    persisted_outcome_counts: summaryCounts,
    workflow_publication_settled_at: input.workflow_publication_settled_at,
    notification_publication_settled_at: input.notification_publication_settled_at,
    publication_qa_completed_at: input.publication_qa_completed_at,
    backlog_pressure_basis_hash: stableJsonHash({
      nightly_window_key: batch.nightly_window_key,
      source_batch_run_refs: sourceBatchRunRefs,
      backlog_pressure: batch.backlog_pressure,
    }) as string,
    portfolio_tail_risk_basis_hash: stableJsonHash({
      nightly_window_key: batch.nightly_window_key,
      source_batch_run_refs: sourceBatchRunRefs,
      portfolio_tail_risk: batch.portfolio_tail_risk,
    }) as string,
    stability_basis_hash: stableJsonHash({
      nightly_window_key: batch.nightly_window_key,
      source_batch_run_refs: sourceBatchRunRefs,
      stability_state: batch.stability_state,
    }) as string,
    publication_generation: publicationGeneration,
    supersedes_digest_id_or_null: input.supersedes_digest_id ?? null,
    supersession_root_digest_id: input.supersession_root_digest_id,
    supersession_reason_codes: input.supersession_reason_codes,
  });
  const digest: OperatorMorningDigestRecord = {
    artifact_type: "OperatorMorningDigest",
    digest_id: digestId,
    tenant_id: batch.tenant_id,
    execution_mode_boundary_contract:
      batch.execution_mode_boundary_contract ?? buildNightlyExecutionModeBoundaryContract(),
    coverage_date: coverageDate,
    source_batch_run_refs: sourceBatchRunRefs,
    derivation_contract: derivationContract,
    covered_selection_entry_refs: coveredSelectionEntryRefs,
    summary_counts: summaryCounts,
    outcome_entry_refs: outcomeEntryRefs,
    queue_summaries: queueSummaries,
    highlighted_client_outcomes: highlightedClientOutcomes,
    waiting_on_authority_refs: waitingOnAuthorityRefs,
    late_data_hold_refs: lateDataHoldRefs,
    backlog_pressure: batch.backlog_pressure,
    portfolio_tail_risk: batch.portfolio_tail_risk,
    stability_state: batch.stability_state,
    published_workflow_item_refs: publishedWorkflowItemRefs,
    published_notification_refs: publishedNotificationRefs,
    generated_by_principal_ref: input.generated_by_principal_ref,
    generated_at: input.generated_at,
    published_at: input.published_at,
    supersedes_digest_id: input.supersedes_digest_id ?? null,
  };
  return assertOperatorMorningDigest(digest);
}

export function assertOperatorMorningDigest(digest: OperatorMorningDigestRecord) {
  assertDigest(
    digest.artifact_type === "OperatorMorningDigest",
    "OPERATOR_MORNING_DIGEST_FIELD_INVALID",
    "artifact_type must be OperatorMorningDigest",
  );
  assertOperatorDigestDerivationContract(digest.derivation_contract);
  assertDigest(
    digest.derivation_contract.coverage_date === digest.coverage_date,
    "OPERATOR_MORNING_DIGEST_DERIVATION_INVALID",
    "derivation coverage_date must mirror digest coverage_date",
  );
  const outcomeRefs = new Set<string>();
  for (const refs of Object.values(digest.outcome_entry_refs)) {
    for (const ref of refs) {
      assertDigest(
        !outcomeRefs.has(ref),
        "OPERATOR_MORNING_DIGEST_PARTITION_INVALID",
        `selection entry ${ref} appears in more than one outcome bucket`,
      );
      outcomeRefs.add(ref);
    }
  }
  assertDigest(
    sortStrings([...outcomeRefs]).join("\n") === digest.covered_selection_entry_refs.join("\n"),
    "OPERATOR_MORNING_DIGEST_PARTITION_INVALID",
    "covered_selection_entry_refs must equal outcome_entry_refs union",
  );
  const summaryTotal = Object.values(digest.summary_counts as OperatorDigestSummaryCounts).reduce(
    (total, value) => total + value,
    0,
  );
  assertDigest(
    summaryTotal === digest.covered_selection_entry_refs.length,
    "OPERATOR_MORNING_DIGEST_PARTITION_INVALID",
    "summary counts must cover every selection entry exactly once",
  );
  return digest;
}

export function isFailureOrHandoffOutcome(outcome: NightlyBatchOutcomeBucket) {
  return (
    outcome === "WAITING_ON_AUTHORITY" ||
    outcome === "WAITING_ON_LATE_DATA" ||
    outcome === "REVIEW_REQUIRED" ||
    outcome === "REQUEST_CLIENT_INFO" ||
    outcome === "BLOCKED_INTERNAL" ||
    outcome === "FAILED_RETRYABLE" ||
    outcome === "FAILED_NON_RETRYABLE" ||
    outcome === "DEFERRED"
  );
}
