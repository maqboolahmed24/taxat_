import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  OperatorDigestDerivationContract as GeneratedOperatorDigestDerivationContract,
  OperatorDigestDerivationContractSummaryCounts,
  OperatorMorningDigestHighlightedClientOutcome,
  OperatorMorningDigestOutcomeEntryRefs,
  OperatorMorningDigestQueueSummary,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { ExecutionModeBoundaryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { buildNightlyExecutionModeBoundaryContract } from "./nightly_batch_run.ts";

export type OperatorDigestDerivationContract =
  GeneratedOperatorDigestDerivationContract;
export type OperatorDigestSummaryCounts = OperatorDigestDerivationContractSummaryCounts;
export type OperatorDigestOutcomeEntryRefs = OperatorMorningDigestOutcomeEntryRefs;
export type OperatorDigestQueueSummary = OperatorMorningDigestQueueSummary;
export type OperatorDigestHighlightedClientOutcome = Omit<
  OperatorMorningDigestHighlightedClientOutcome,
  "next_checkpoint_at"
> & {
  next_checkpoint_at: string | null;
};

export const OPERATOR_DIGEST_DERIVATION_CONTRACT_VERSION =
  "OPERATOR_DIGEST_DERIVATION_V1" as const;

export const OPERATOR_DIGEST_POLICIES = {
  source_batch_window_state: "SINGLE_NIGHTLY_WINDOW",
  truth_source_policy:
    "PERSISTED_BATCH_MANIFEST_DECISION_WORKFLOW_NOTIFICATION_AND_ERROR_TRUTH_ONLY",
  unresolved_handoff_policy:
    "EVERY_UNRESOLVED_OUTCOME_REQUIRES_PUBLISHED_WORKFLOW_HANDOFF",
  queue_summary_policy: "QUEUE_SUMMARIES_PARTITION_PUBLISHED_WORKFLOW_ITEMS",
  highlight_ranking_profile: "ENTRY_LOSS_THEN_PRIORITY_TUPLE_V1",
  highlight_source_policy:
    "HIGHLIGHTS_SUBSET_OF_PUBLISHED_WORKFLOW_AND_PERSISTED_OUTCOME_TRUTH",
  publication_qa_profile: "DIGEST_PUBLICATION_HANDOFF_QA_V1",
  publication_qa_state: "PASSED",
  supersession_policy:
    "MONOTONIC_COVERAGE_DATE_PUBLICATION_WITH_EXPLICIT_SUPERSESSION",
} as const;

export const OPERATOR_DIGEST_QUEUE_SOURCE_BASIS = "PUBLISHED_WORKFLOW_ITEMS" as const;

export const OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME = {
  AUTO_COMPLETED: "auto_completed",
  WAITING_ON_AUTHORITY: "waiting_on_authority",
  WAITING_ON_LATE_DATA: "waiting_on_late_data",
  REVIEW_REQUIRED: "review_required",
  REQUEST_CLIENT_INFO: "request_client_info",
  BLOCKED_INTERNAL: "blocked_internal",
  FAILED_RETRYABLE: "failed_retryable",
  FAILED_NON_RETRYABLE: "failed_non_retryable",
  REUSED_RESULT: "reused_result",
  DEFERRED: "deferred",
  SKIPPED: "skipped",
} as const;

export type OperatorDigestOutcomeBucket =
  keyof typeof OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME;
export type OperatorDigestSummaryField =
  (typeof OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME)[OperatorDigestOutcomeBucket];

export const OPERATOR_DIGEST_SUMMARY_FIELDS = Object.values(
  OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME,
) as OperatorDigestSummaryField[];

export const OPERATOR_DIGEST_UNRESOLVED_OUTCOME_BUCKETS = [
  "WAITING_ON_AUTHORITY",
  "WAITING_ON_LATE_DATA",
  "REVIEW_REQUIRED",
  "REQUEST_CLIENT_INFO",
  "BLOCKED_INTERNAL",
  "FAILED_RETRYABLE",
  "FAILED_NON_RETRYABLE",
  "DEFERRED",
] as const satisfies readonly OperatorDigestOutcomeBucket[];

const OPERATOR_DIGEST_UNRESOLVED_OUTCOME_SET = new Set<string>(
  OPERATOR_DIGEST_UNRESOLVED_OUTCOME_BUCKETS,
);

export type OperatorDigestDerivationContractErrorCode =
  | "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID"
  | "OPERATOR_DIGEST_DERIVATION_HASH_INVALID"
  | "OPERATOR_DIGEST_DERIVATION_POLICY_INVALID"
  | "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID";

export class OperatorDigestDerivationContractError extends Error {
  readonly code: OperatorDigestDerivationContractErrorCode;

  constructor(code: OperatorDigestDerivationContractErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "OperatorDigestDerivationContractError";
    this.code = code;
  }
}

function assertDerivationContract(
  condition: unknown,
  code: OperatorDigestDerivationContractErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new OperatorDigestDerivationContractError(code, detail);
  }
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function uniqueSortedStrings(
  label: string,
  values: readonly string[],
  options: { allow_empty: boolean } = { allow_empty: true },
) {
  assertDerivationContract(
    Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
    "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
    `${label} must contain only non-empty strings`,
  );
  const sorted = sortStrings([...new Set(values)]);
  assertDerivationContract(
    sorted.length === values.length,
    "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
    `${label} must not contain duplicate refs`,
  );
  assertDerivationContract(
    options.allow_empty || sorted.length > 0,
    "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
    `${label} must not be empty`,
  );
  return sorted;
}

export function emptyOperatorDigestSummaryCounts(): OperatorDigestSummaryCounts {
  return {
    auto_completed: 0,
    waiting_on_authority: 0,
    waiting_on_late_data: 0,
    review_required: 0,
    request_client_info: 0,
    blocked_internal: 0,
    failed_retryable: 0,
    failed_non_retryable: 0,
    reused_result: 0,
    deferred: 0,
    skipped: 0,
  };
}

export function canonicalOperatorDigestSummaryCounts(
  counts: OperatorDigestSummaryCounts,
): OperatorDigestSummaryCounts {
  const canonical = emptyOperatorDigestSummaryCounts();
  for (const field of OPERATOR_DIGEST_SUMMARY_FIELDS) {
    const value = counts[field];
    assertDerivationContract(
      Number.isInteger(value) && value >= 0,
      "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
      `summary_counts.${field} must be a non-negative integer`,
    );
    canonical[field] = value;
  }
  return canonical;
}

export function operatorDigestSummaryCountsFromOutcomeBuckets(
  outcomeBuckets: readonly OperatorDigestOutcomeBucket[],
) {
  const counts = emptyOperatorDigestSummaryCounts();
  for (const bucket of outcomeBuckets) {
    counts[OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME[bucket]] += 1;
  }
  return counts;
}

export function workflowCountsFromPersistedCounts(
  counts: OperatorDigestSummaryCounts,
): OperatorDigestSummaryCounts {
  const canonical = canonicalOperatorDigestSummaryCounts(counts);
  const workflowCounts = emptyOperatorDigestSummaryCounts();
  for (const outcomeBucket of OPERATOR_DIGEST_UNRESOLVED_OUTCOME_BUCKETS) {
    const field = OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME[outcomeBucket];
    workflowCounts[field] = canonical[field];
  }
  return workflowCounts;
}

export function unresolvedWorkflowItemCount(counts: OperatorDigestSummaryCounts) {
  const canonical = canonicalOperatorDigestSummaryCounts(counts);
  return OPERATOR_DIGEST_UNRESOLVED_OUTCOME_BUCKETS.reduce(
    (total, outcomeBucket) =>
      total + canonical[OPERATOR_DIGEST_SUMMARY_FIELD_BY_OUTCOME[outcomeBucket]],
    0,
  );
}

export function deriveOperatorDigestRefSetHash(
  refs: readonly string[],
  options: { allow_empty: boolean },
) {
  return stableJsonHash({
    refs: uniqueSortedStrings("operator_digest.refs", refs, options),
  }) as string;
}

export function emptyOperatorDigestOutcomeEntryRefs(): OperatorDigestOutcomeEntryRefs {
  return {
    auto_completed: [],
    waiting_on_authority: [],
    waiting_on_late_data: [],
    review_required: [],
    request_client_info: [],
    blocked_internal: [],
    failed_retryable: [],
    failed_non_retryable: [],
    reused_result: [],
    deferred: [],
    skipped: [],
  };
}

export function deriveOperatorDigestOutcomeEntryPartitionHash(
  outcomeEntryRefs: OperatorDigestOutcomeEntryRefs,
) {
  const canonical = emptyOperatorDigestOutcomeEntryRefs();
  const seen = new Set<string>();
  for (const field of OPERATOR_DIGEST_SUMMARY_FIELDS) {
    const refs = uniqueSortedStrings(`outcome_entry_refs.${field}`, outcomeEntryRefs[field]);
    for (const ref of refs) {
      assertDerivationContract(
        !seen.has(ref),
        "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
        `outcome entry ref ${ref} appears in more than one outcome bucket`,
      );
      seen.add(ref);
    }
    canonical[field] = refs;
  }
  return stableJsonHash(canonical) as string;
}

export function deriveOperatorDigestQueuePartitionHash(
  queueSummaries: readonly OperatorDigestQueueSummary[],
) {
  const seenQueueRefs = new Set<string>();
  const seenItemRefs = new Set<string>();
  const canonical = queueSummaries.map((queueSummary) => {
    assertDerivationContract(
      typeof queueSummary.queue_ref === "string" &&
        queueSummary.queue_ref.length > 0 &&
        !seenQueueRefs.has(queueSummary.queue_ref),
      "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
      "queue_summaries[].queue_ref must be unique and non-empty",
    );
    seenQueueRefs.add(queueSummary.queue_ref);
    const itemRefs = uniqueSortedStrings(
      `queue_summaries[${queueSummary.queue_ref}].item_refs`,
      queueSummary.item_refs,
    );
    for (const itemRef of itemRefs) {
      assertDerivationContract(
        !seenItemRefs.has(itemRef),
        "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
        `workflow item ref ${itemRef} appears in more than one queue summary`,
      );
      seenItemRefs.add(itemRef);
    }
    return {
      queue_ref: queueSummary.queue_ref,
      source_basis: queueSummary.source_basis,
      item_refs: itemRefs,
      dominant_reason_codes: uniqueSortedStrings(
        `queue_summaries[${queueSummary.queue_ref}].dominant_reason_codes`,
        queueSummary.dominant_reason_codes,
        { allow_empty: false },
      ),
      highest_priority: {
        deadline_bucket: queueSummary.highest_priority.deadline_bucket,
        risk_bucket: queueSummary.highest_priority.risk_bucket,
        stable_tie_break_key: queueSummary.highest_priority.stable_tie_break_key,
      },
    };
  });
  canonical.sort((left, right) => left.queue_ref.localeCompare(right.queue_ref));
  return stableJsonHash(canonical) as string;
}

export function deriveOperatorDigestHighlightOrderHash(
  highlightedClientOutcomes: readonly OperatorDigestHighlightedClientOutcome[],
) {
  const seenClientPeriods = new Set<string>();
  const seenSelectionEntryRefs = new Set<string>();
  const canonical = highlightedClientOutcomes.map((outcome, index) => {
    const expectedRank = index + 1;
    const clientPeriodKey = `${outcome.client_id}|${outcome.period}`;
    assertDerivationContract(
      outcome.highlight_rank === expectedRank,
      "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
      "highlighted_client_outcomes[] must use contiguous highlight ranks",
    );
    assertDerivationContract(
      !seenClientPeriods.has(clientPeriodKey) &&
        !seenSelectionEntryRefs.has(outcome.selection_entry_ref),
      "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
      "highlighted_client_outcomes[] must be unique by client-period and selection entry",
    );
    seenClientPeriods.add(clientPeriodKey);
    seenSelectionEntryRefs.add(outcome.selection_entry_ref);
    return {
      selection_entry_ref: outcome.selection_entry_ref,
      client_id: outcome.client_id,
      period: outcome.period,
      dominant_outcome: outcome.dominant_outcome,
      highlight_rank: outcome.highlight_rank,
      entry_loss_score: outcome.entry_loss_score,
      manifest_ref_or_null: outcome.manifest_ref,
      work_item_ref_or_null: outcome.work_item_ref,
      reason_codes: uniqueSortedStrings(
        `highlighted_client_outcomes[${outcome.selection_entry_ref}].reason_codes`,
        outcome.reason_codes,
        { allow_empty: false },
      ),
      next_checkpoint_at_or_null: outcome.next_checkpoint_at,
    };
  });
  return stableJsonHash(canonical) as string;
}

export function deriveOperatorDigestDerivationContractHash(
  contract: OperatorDigestDerivationContract,
) {
  const executionModeBoundaryHash =
    contract.execution_mode_boundary_contract.boundary_hash;
  return stableJsonHash({
    contract_version: contract.contract_version,
    execution_mode_boundary_hash: executionModeBoundaryHash,
    coverage_date: contract.coverage_date,
    nightly_window_key: contract.nightly_window_key,
    source_batch_set_hash: contract.source_batch_set_hash,
    source_batch_count: contract.source_batch_count,
    source_batch_window_state: contract.source_batch_window_state,
    truth_source_policy: contract.truth_source_policy,
    unresolved_handoff_policy: contract.unresolved_handoff_policy,
    queue_summary_policy: contract.queue_summary_policy,
    highlight_ranking_profile: contract.highlight_ranking_profile,
    highlight_source_policy: contract.highlight_source_policy,
    publication_qa_profile: contract.publication_qa_profile,
    publication_qa_state: contract.publication_qa_state,
    publication_qa_completed_at: contract.publication_qa_completed_at,
    covered_selection_entry_ref_set_hash: contract.covered_selection_entry_ref_set_hash,
    outcome_entry_partition_hash: contract.outcome_entry_partition_hash,
    queue_partition_hash: contract.queue_partition_hash,
    highlight_order_hash: contract.highlight_order_hash,
    published_workflow_item_ref_set_hash: contract.published_workflow_item_ref_set_hash,
    published_notification_ref_set_hash: contract.published_notification_ref_set_hash,
    waiting_on_authority_ref_set_hash: contract.waiting_on_authority_ref_set_hash,
    late_data_hold_ref_set_hash: contract.late_data_hold_ref_set_hash,
    workflow_publication_state: contract.workflow_publication_state,
    workflow_publication_settled_at: contract.workflow_publication_settled_at,
    published_workflow_outcome_counts: canonicalOperatorDigestSummaryCounts(
      contract.published_workflow_outcome_counts,
    ),
    published_workflow_item_count: contract.published_workflow_item_count,
    notification_publication_state: contract.notification_publication_state,
    notification_publication_settled_at: contract.notification_publication_settled_at,
    published_notification_ref_count: contract.published_notification_ref_count,
    persisted_outcome_counts: canonicalOperatorDigestSummaryCounts(
      contract.persisted_outcome_counts,
    ),
    covered_selection_entry_count: contract.covered_selection_entry_count,
    backlog_pressure_basis_hash: contract.backlog_pressure_basis_hash,
    portfolio_tail_risk_basis_hash: contract.portfolio_tail_risk_basis_hash,
    stability_basis_hash: contract.stability_basis_hash,
    publication_generation: contract.publication_generation,
    supersession_state: contract.supersession_state,
    supersession_root_digest_id: contract.supersession_root_digest_id,
    supersedes_digest_id_or_null: contract.supersedes_digest_id_or_null,
    supersession_reason_codes: uniqueSortedStrings(
      "supersession_reason_codes",
      contract.supersession_reason_codes,
    ),
    supersession_policy: contract.supersession_policy,
  }) as string;
}

export type BuildOperatorDigestDerivationContractInput = {
  digest_id: string;
  execution_mode_boundary_contract?: ExecutionModeBoundaryContract;
  coverage_date: string;
  nightly_window_key: string;
  source_batch_run_refs: readonly string[];
  covered_selection_entry_refs: readonly string[];
  outcome_entry_refs: OperatorDigestOutcomeEntryRefs;
  queue_summaries: readonly OperatorDigestQueueSummary[];
  highlighted_client_outcomes: readonly OperatorDigestHighlightedClientOutcome[];
  published_workflow_item_refs: readonly string[];
  published_notification_refs: readonly string[];
  waiting_on_authority_refs: readonly string[];
  late_data_hold_refs: readonly string[];
  persisted_outcome_counts: OperatorDigestSummaryCounts;
  workflow_publication_settled_at: string;
  notification_publication_settled_at: string;
  publication_qa_completed_at: string;
  backlog_pressure_basis_hash?: string;
  portfolio_tail_risk_basis_hash?: string;
  stability_basis_hash?: string;
  publication_generation?: number;
  supersedes_digest_id_or_null?: string | null;
  supersession_root_digest_id?: string;
  supersession_reason_codes?: readonly string[];
};

export function buildOperatorDigestDerivationContract(
  input: BuildOperatorDigestDerivationContractInput,
): OperatorDigestDerivationContract {
  const sourceBatchRunRefs = uniqueSortedStrings(
    "source_batch_run_refs",
    input.source_batch_run_refs,
    { allow_empty: false },
  );
  const coveredSelectionEntryRefs = uniqueSortedStrings(
    "covered_selection_entry_refs",
    input.covered_selection_entry_refs,
    { allow_empty: false },
  );
  const publishedWorkflowItemRefs = uniqueSortedStrings(
    "published_workflow_item_refs",
    input.published_workflow_item_refs,
  );
  const publishedNotificationRefs = uniqueSortedStrings(
    "published_notification_refs",
    input.published_notification_refs,
  );
  const waitingOnAuthorityRefs = uniqueSortedStrings(
    "waiting_on_authority_refs",
    input.waiting_on_authority_refs,
  );
  const lateDataHoldRefs = uniqueSortedStrings(
    "late_data_hold_refs",
    input.late_data_hold_refs,
  );
  const persistedOutcomeCounts = canonicalOperatorDigestSummaryCounts(
    input.persisted_outcome_counts,
  );
  const publishedWorkflowOutcomeCounts =
    workflowCountsFromPersistedCounts(persistedOutcomeCounts);
  const publishedWorkflowItemCount = unresolvedWorkflowItemCount(persistedOutcomeCounts);
  const workflowPublicationState =
    publishedWorkflowItemCount === 0
      ? "COMPLETE_WITH_NO_UNRESOLVED_ITEMS"
      : "COMPLETE_WITH_PUBLISHED_WORKFLOW_ITEMS";
  const notificationPublicationState =
    publishedNotificationRefs.length === 0
      ? "COMPLETE_WITH_EXPLICIT_NONE"
      : "COMPLETE_WITH_PUBLISHED_NOTIFICATION_REFS";
  const supersedesDigestId = input.supersedes_digest_id_or_null ?? null;
  const supersessionState =
    supersedesDigestId === null ? "INITIAL_PUBLICATION" : "RECOVERY_SUPERSESSION";
  const supersessionReasonCodes = uniqueSortedStrings(
    "supersession_reason_codes",
    supersessionState === "INITIAL_PUBLICATION"
      ? []
      : input.supersession_reason_codes?.length
        ? input.supersession_reason_codes
        : ["RECOVERY_PUBLICATION_SUPERSESSION"],
  );
  const contract: OperatorDigestDerivationContract = {
    contract_version: OPERATOR_DIGEST_DERIVATION_CONTRACT_VERSION,
    derivation_contract_hash: "",
    execution_mode_boundary_contract:
      input.execution_mode_boundary_contract ?? buildNightlyExecutionModeBoundaryContract(),
    coverage_date: input.coverage_date,
    nightly_window_key: input.nightly_window_key,
    source_batch_set_hash: stableJsonHash({
      nightly_window_key: input.nightly_window_key,
      source_batch_run_refs: sourceBatchRunRefs,
    }) as string,
    source_batch_count: sourceBatchRunRefs.length,
    source_batch_window_state: OPERATOR_DIGEST_POLICIES.source_batch_window_state,
    truth_source_policy: OPERATOR_DIGEST_POLICIES.truth_source_policy,
    unresolved_handoff_policy: OPERATOR_DIGEST_POLICIES.unresolved_handoff_policy,
    queue_summary_policy: OPERATOR_DIGEST_POLICIES.queue_summary_policy,
    highlight_ranking_profile: OPERATOR_DIGEST_POLICIES.highlight_ranking_profile,
    highlight_source_policy: OPERATOR_DIGEST_POLICIES.highlight_source_policy,
    publication_qa_profile: OPERATOR_DIGEST_POLICIES.publication_qa_profile,
    publication_qa_state: OPERATOR_DIGEST_POLICIES.publication_qa_state,
    publication_qa_completed_at: input.publication_qa_completed_at,
    covered_selection_entry_ref_set_hash: deriveOperatorDigestRefSetHash(
      coveredSelectionEntryRefs,
      { allow_empty: false },
    ),
    outcome_entry_partition_hash:
      deriveOperatorDigestOutcomeEntryPartitionHash(input.outcome_entry_refs),
    queue_partition_hash: deriveOperatorDigestQueuePartitionHash(input.queue_summaries),
    highlight_order_hash: deriveOperatorDigestHighlightOrderHash(
      input.highlighted_client_outcomes,
    ),
    published_workflow_item_ref_set_hash: deriveOperatorDigestRefSetHash(
      publishedWorkflowItemRefs,
      { allow_empty: true },
    ),
    published_notification_ref_set_hash: deriveOperatorDigestRefSetHash(
      publishedNotificationRefs,
      { allow_empty: true },
    ),
    waiting_on_authority_ref_set_hash: deriveOperatorDigestRefSetHash(
      waitingOnAuthorityRefs,
      { allow_empty: true },
    ),
    late_data_hold_ref_set_hash: deriveOperatorDigestRefSetHash(lateDataHoldRefs, {
      allow_empty: true,
    }),
    workflow_publication_state: workflowPublicationState,
    workflow_publication_settled_at: input.workflow_publication_settled_at,
    published_workflow_outcome_counts: publishedWorkflowOutcomeCounts,
    published_workflow_item_count: publishedWorkflowItemCount,
    notification_publication_state: notificationPublicationState,
    notification_publication_settled_at: input.notification_publication_settled_at,
    published_notification_ref_count: publishedNotificationRefs.length,
    persisted_outcome_counts: persistedOutcomeCounts,
    covered_selection_entry_count: coveredSelectionEntryRefs.length,
    backlog_pressure_basis_hash:
      input.backlog_pressure_basis_hash ??
      (stableJsonHash({
        nightly_window_key: input.nightly_window_key,
        source_batch_run_refs: sourceBatchRunRefs,
        basis: "backlog_pressure",
      }) as string),
    portfolio_tail_risk_basis_hash:
      input.portfolio_tail_risk_basis_hash ??
      (stableJsonHash({
        nightly_window_key: input.nightly_window_key,
        source_batch_run_refs: sourceBatchRunRefs,
        basis: "portfolio_tail_risk",
      }) as string),
    stability_basis_hash:
      input.stability_basis_hash ??
      (stableJsonHash({
        nightly_window_key: input.nightly_window_key,
        source_batch_run_refs: sourceBatchRunRefs,
        basis: "stability_state",
      }) as string),
    publication_generation: input.publication_generation ?? (supersedesDigestId ? 2 : 1),
    supersession_state: supersessionState,
    supersession_root_digest_id:
      input.supersession_root_digest_id ??
      (supersedesDigestId === null ? input.digest_id : supersedesDigestId),
    supersedes_digest_id_or_null: supersedesDigestId,
    supersession_reason_codes: supersessionReasonCodes,
    supersession_policy: OPERATOR_DIGEST_POLICIES.supersession_policy,
  };
  contract.derivation_contract_hash = deriveOperatorDigestDerivationContractHash(contract);
  return assertOperatorDigestDerivationContract(contract);
}

export function assertOperatorDigestDerivationContract(
  contract: OperatorDigestDerivationContract,
) {
  assertDerivationContract(
    contract.contract_version === OPERATOR_DIGEST_DERIVATION_CONTRACT_VERSION,
    "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
    `contract_version must be ${OPERATOR_DIGEST_DERIVATION_CONTRACT_VERSION}`,
  );
  for (const [field, expected] of Object.entries(OPERATOR_DIGEST_POLICIES)) {
    assertDerivationContract(
      contract[field as keyof typeof OPERATOR_DIGEST_POLICIES] === expected,
      "OPERATOR_DIGEST_DERIVATION_POLICY_INVALID",
      `${field} must be ${expected}`,
    );
  }
  assertDerivationContract(
    contract.derivation_contract_hash === deriveOperatorDigestDerivationContractHash(contract),
    "OPERATOR_DIGEST_DERIVATION_HASH_INVALID",
    "derivation_contract_hash must equal the canonical operator digest derivation hash",
  );
  assertDerivationContract(
    contract.covered_selection_entry_count ===
      Object.values(contract.persisted_outcome_counts).reduce((total, value) => total + value, 0),
    "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
    "covered_selection_entry_count must equal persisted outcome count total",
  );
  assertDerivationContract(
    contract.published_workflow_item_count ===
      unresolvedWorkflowItemCount(contract.persisted_outcome_counts),
    "OPERATOR_DIGEST_DERIVATION_PARTITION_INVALID",
    "published_workflow_item_count must equal unresolved persisted outcome count",
  );
  if (contract.supersession_state === "INITIAL_PUBLICATION") {
    assertDerivationContract(
      contract.supersedes_digest_id_or_null === null &&
        contract.supersession_reason_codes.length === 0,
      "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
      "initial publications must not carry supersession pointers or reason codes",
    );
  } else {
    assertDerivationContract(
      typeof contract.supersedes_digest_id_or_null === "string" &&
        contract.supersedes_digest_id_or_null.length > 0 &&
        contract.supersession_reason_codes.length > 0,
      "OPERATOR_DIGEST_DERIVATION_FIELD_INVALID",
      "recovery supersessions must carry superseded digest and reason codes",
    );
  }
  return contract;
}

export function isOperatorDigestUnresolvedOutcome(outcomeBucket: string) {
  return OPERATOR_DIGEST_UNRESOLVED_OUTCOME_SET.has(outcomeBucket);
}
