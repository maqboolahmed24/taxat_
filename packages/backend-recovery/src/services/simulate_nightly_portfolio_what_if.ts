import type { OperatorMorningDigestRecord } from "../models/operator_morning_digest.ts";
import {
  buildNightlyExecutionModeBoundaryContract,
  type NightlyBatchRunGlobalConcurrencyProfileRecord,
  type NightlyBatchSelectionDisposition,
} from "../models/nightly_batch_run.ts";
import {
  buildNightlyPortfolioSimulationBasisContract,
  type NightlyPortfolioCandidateCounterfactual,
} from "../models/nightly_portfolio_simulation_basis_contract.ts";
import {
  buildNightlyPortfolioWhatIfSimulation,
  emptyNightlyPortfolioWhatIfSummaryCounts,
  NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS,
  NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON,
  nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs,
  type NightlyPortfolioWhatIfOutcomeBucket,
  type NightlyPortfolioWhatIfSimulationEntryDiffRecord,
  type NightlyPortfolioWhatIfSimulationRecord,
} from "../models/nightly_portfolio_what_if_simulation.ts";
import type { NightlyBatchRunRepository } from "../repositories/nightly_batch_run_repository.ts";
import {
  deriveNightlyPortfolioDiffExplainability,
  deriveNightlyPortfolioEntryLossScore,
  type NightlyPortfolioHighlightProjection,
} from "./derive_nightly_portfolio_diff_explainability.ts";
import {
  loadNightlySimulationSourceBatchSet,
  type NightlySimulationSourceBatchSet,
} from "./load_nightly_simulation_source_batch_set.ts";
import {
  replayNightlySelectionEntries,
  type ReplayedNightlySelectionEntry,
} from "./replay_nightly_selection_entries.ts";

export type SimulateNightlyPortfolioWhatIfInput = {
  repository: NightlyBatchRunRepository;
  tenant_id: string;
  nightly_window_key: string;
  source_batch_run_refs?: readonly string[];
  baseline_digest?: OperatorMorningDigestRecord | null;
  counterfactual_policy_snapshot_hash_or_null?: string | null;
  counterfactual_autopilot_policy_hash_or_null?: string | null;
  counterfactual_release_verification_manifest_ref_or_null?: string | null;
  counterfactual_release_candidate_identity_contract_or_null?: Parameters<
    typeof buildNightlyPortfolioSimulationBasisContract
  >[0]["counterfactual_release_candidate_identity_contract_or_null"];
  counterfactual_global_concurrency_profile_or_null?: Partial<NightlyBatchRunGlobalConcurrencyProfileRecord> | null;
  candidate_counterfactuals?: readonly NightlyPortfolioCandidateCounterfactual[];
  counterfactual_reason_codes?: readonly string[];
  simulated_by_principal_ref: string;
  simulated_at: string;
  persist_simulation?: (simulation: NightlyPortfolioWhatIfSimulationRecord) => Promise<void> | void;
};

export type SimulateNightlyPortfolioWhatIfResult = {
  source_batch_set: NightlySimulationSourceBatchSet;
  simulation: NightlyPortfolioWhatIfSimulationRecord;
  persisted: boolean;
};

type SimulatedEntryProjection = {
  replayed: ReplayedNightlySelectionEntry;
  simulated_selection_disposition: NightlyBatchSelectionDisposition;
  simulated_outcome_bucket: NightlyPortfolioWhatIfOutcomeBucket;
  simulated_reason_codes: string[];
  simulated_priority_score_or_null: number | null;
  simulated_execution_rank_or_null: number | null;
  movement_reason_codes: string[];
};

const HARD_BLOCKING_REASON_FRAGMENTS = [
  "AUTHORITY_AMBIGUITY",
  "STEP_UP",
  "APPROVAL_REQUIRED",
  "APPROVAL_GAP",
  "APPROVAL_BARRIER",
] as const;

const RESOLVED_OR_NON_BACKLOG_OUTCOMES = new Set<NightlyPortfolioWhatIfOutcomeBucket>([
  "AUTO_COMPLETED",
  "REUSED_RESULT",
  "SKIPPED",
]);

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values: readonly string[], fallback = NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON) {
  const sorted = sortStrings([...new Set(values.filter((value) => value.length > 0))]);
  return sorted.length > 0 ? sorted : [fallback];
}

function isExecutionDisposition(disposition: NightlyBatchSelectionDisposition) {
  return (NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS as readonly string[]).includes(
    disposition,
  );
}

function operatorMorningDigestRef(digest: OperatorMorningDigestRecord) {
  return `operator-morning-digest://${digest.digest_id}`;
}

function normalizeConcurrencyProfile(input: {
  baseline: NightlyBatchRunGlobalConcurrencyProfileRecord;
  override?: Partial<NightlyBatchRunGlobalConcurrencyProfileRecord> | null;
}) {
  return input.override ? { ...input.baseline, ...input.override } : null;
}

function assertBaselineDigestMatches(input: {
  digest: OperatorMorningDigestRecord;
  source_batch_set: NightlySimulationSourceBatchSet;
}) {
  if (
    input.digest.tenant_id !== input.source_batch_set.tenant_id ||
    input.digest.derivation_contract.nightly_window_key !== input.source_batch_set.nightly_window_key
  ) {
    throw new Error("baseline digest must mirror source batch tenant and nightly window");
  }
  if (
    sortStrings(input.digest.source_batch_run_refs).join("\n") !==
    input.source_batch_set.source_batch_run_refs.join("\n")
  ) {
    throw new Error("baseline digest source_batch_run_refs must mirror the simulation source set");
  }
  if (
    sortStrings(input.digest.covered_selection_entry_refs).join("\n") !==
    input.source_batch_set.covered_selection_entry_refs.join("\n")
  ) {
    throw new Error("baseline digest covered_selection_entry_refs must mirror replay coverage");
  }
}

function hasHardBlockingPosture(input: {
  replayed: ReplayedNightlySelectionEntry;
  counterfactual?: NightlyPortfolioCandidateCounterfactual;
}) {
  if (input.counterfactual?.counterfactual_authority_outcome === "AMBIGUOUS") {
    return true;
  }
  return input.replayed.baseline_reason_codes.some((code) =>
    HARD_BLOCKING_REASON_FRAGMENTS.some((fragment) => code.includes(fragment)),
  );
}

function withReasonCodes(
  base: readonly string[],
  additions: readonly string[],
  fallback = NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON,
) {
  return uniqueSorted([...base, ...additions], fallback);
}

function applyCandidateCounterfactual(input: {
  replayed: ReplayedNightlySelectionEntry;
  counterfactual?: NightlyPortfolioCandidateCounterfactual;
}): SimulatedEntryProjection {
  const { replayed, counterfactual } = input;
  const movementReasonCodes = new Set<string>();
  const simulatedReasonCodes = new Set<string>(replayed.baseline_reason_codes);
  let simulatedSelectionDisposition = replayed.baseline_selection_disposition;
  let simulatedOutcomeBucket = replayed.baseline_outcome_bucket;
  let simulatedPriorityScore: number | null = replayed.baseline_priority_score_or_null;

  if (!counterfactual) {
    return {
      replayed,
      simulated_selection_disposition: simulatedSelectionDisposition,
      simulated_outcome_bucket: simulatedOutcomeBucket,
      simulated_reason_codes: [...simulatedReasonCodes].sort(),
      simulated_priority_score_or_null: simulatedPriorityScore,
      simulated_execution_rank_or_null: null,
      movement_reason_codes: [NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON],
    };
  }

  for (const reasonCode of counterfactual.reason_codes) {
    movementReasonCodes.add(reasonCode);
    simulatedReasonCodes.add(reasonCode);
  }

  if (counterfactual.counterfactual_release_outcome === "INADMISSIBLE") {
    simulatedSelectionDisposition = "ESCALATE_ONLY";
    simulatedOutcomeBucket = "BLOCKED_INTERNAL";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("RELEASE_INADMISSIBLE_REMAINS_BLOCKING");
  }

  if (counterfactual.counterfactual_policy_outcome === "DENY") {
    simulatedSelectionDisposition = "SKIP_INELIGIBLE";
    simulatedOutcomeBucket = "SKIPPED";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("SIMULATED_POLICY_DENY");
  }

  if (counterfactual.counterfactual_policy_outcome === "REVIEW_REQUIRED") {
    simulatedSelectionDisposition = "ESCALATE_ONLY";
    simulatedOutcomeBucket = "REVIEW_REQUIRED";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("SIMULATED_POLICY_REVIEW_REQUIRED");
  }

  if (counterfactual.counterfactual_authority_outcome === "WAITING") {
    simulatedSelectionDisposition = "ESCALATE_ONLY";
    simulatedOutcomeBucket = "WAITING_ON_AUTHORITY";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("SIMULATED_AUTHORITY_WAITING");
  }

  if (counterfactual.counterfactual_retry_outcome === "DEFER") {
    simulatedSelectionDisposition = "DEFER_RETRY_WINDOW";
    simulatedOutcomeBucket = "DEFERRED";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("SIMULATED_RETRY_DEFERRED");
  }

  if (hasHardBlockingPosture({ replayed, counterfactual })) {
    simulatedSelectionDisposition = "ESCALATE_ONLY";
    simulatedOutcomeBucket = "BLOCKED_INTERNAL";
    simulatedPriorityScore = null;
    simulatedReasonCodes.add("HARD_UNATTENDED_BOUNDARY_REMAINS_BLOCKING");
    if (counterfactual.counterfactual_authority_outcome === "AMBIGUOUS") {
      simulatedReasonCodes.add("AUTHORITY_AMBIGUITY_REMAINS_BLOCKING");
    }
  } else {
    const explicitClear =
      counterfactual.counterfactual_policy_outcome === "ALLOW" ||
      counterfactual.counterfactual_authority_outcome === "CLEAR" ||
      counterfactual.counterfactual_retry_outcome === "READY" ||
      counterfactual.counterfactual_release_outcome === "ADMISSIBLE";
    if (explicitClear && !RESOLVED_OR_NON_BACKLOG_OUTCOMES.has(simulatedOutcomeBucket)) {
      simulatedSelectionDisposition = "EXECUTE_NEW_MANIFEST";
      simulatedOutcomeBucket = "AUTO_COMPLETED";
      simulatedPriorityScore =
        replayed.entry.priority_tuple.priority_score ??
        replayed.baseline_priority_score_or_null ??
        0;
      simulatedReasonCodes.add("SIMULATED_COUNTERFACTUAL_CLEAR");
    }
  }

  return {
    replayed,
    simulated_selection_disposition: simulatedSelectionDisposition,
    simulated_outcome_bucket: simulatedOutcomeBucket,
    simulated_reason_codes: [...simulatedReasonCodes].sort(),
    simulated_priority_score_or_null: isExecutionDisposition(simulatedSelectionDisposition)
      ? simulatedPriorityScore ?? replayed.entry.priority_tuple.priority_score ?? 0
      : null,
    simulated_execution_rank_or_null: null,
    movement_reason_codes: uniqueSorted([...movementReasonCodes]),
  };
}

function applyCapacityCounterfactual(input: {
  projections: readonly SimulatedEntryProjection[];
  global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
  capacity_counterfactual_declared: boolean;
}) {
  const executionCandidates = input.projections
    .filter((projection) => isExecutionDisposition(projection.simulated_selection_disposition))
    .sort(
      (left, right) =>
        (right.simulated_priority_score_or_null ?? 0) -
          (left.simulated_priority_score_or_null ?? 0) ||
        left.replayed.entry.priority_tuple.stable_tie_break_key.localeCompare(
          right.replayed.entry.priority_tuple.stable_tie_break_key,
        ) ||
        left.replayed.selection_entry_ref.localeCompare(right.replayed.selection_entry_ref),
    );
  const rankByEntry = new Map<string, number>();
  for (const [index, projection] of executionCandidates.entries()) {
    rankByEntry.set(projection.replayed.selection_entry_ref, index + 1);
  }
  return input.projections.map((projection): SimulatedEntryProjection => {
    const rank = rankByEntry.get(projection.replayed.selection_entry_ref) ?? null;
    if (
      input.capacity_counterfactual_declared &&
      rank !== null &&
      rank > input.global_concurrency_profile.global_manifest_limit
    ) {
      return {
        ...projection,
        simulated_selection_disposition: "DEFER_RETRY_WINDOW",
        simulated_outcome_bucket: "DEFERRED",
        simulated_priority_score_or_null: null,
        simulated_execution_rank_or_null: null,
        simulated_reason_codes: withReasonCodes(projection.simulated_reason_codes, [
          "CAPACITY_THROTTLED",
          "SIMULATED_CAPACITY_OR_RETRY_CHANGE",
        ]),
        movement_reason_codes: withReasonCodes(projection.movement_reason_codes, [
          "SIMULATED_CAPACITY_OR_RETRY_CHANGE",
        ]),
      };
    }
    return {
      ...projection,
      simulated_execution_rank_or_null: rank,
      simulated_priority_score_or_null: rank === null ? null : projection.simulated_priority_score_or_null,
    };
  });
}

function highlightProjectionsFromDigest(digest: OperatorMorningDigestRecord | null) {
  if (!digest) {
    return [];
  }
  return digest.highlighted_client_outcomes.map((highlight) => ({
    selection_entry_ref: highlight.selection_entry_ref,
    highlight_rank: highlight.highlight_rank,
    entry_loss_score: highlight.entry_loss_score,
  })) satisfies NightlyPortfolioHighlightProjection[];
}

function highlightProjectionsFromSimulation(projections: readonly SimulatedEntryProjection[]) {
  return projections
    .filter(
      (projection) => !RESOLVED_OR_NON_BACKLOG_OUTCOMES.has(projection.simulated_outcome_bucket),
    )
    .map((projection) => ({
      selection_entry_ref: projection.replayed.selection_entry_ref,
      highlight_rank: 0,
      entry_loss_score: deriveNightlyPortfolioEntryLossScore({
        outcome_bucket: projection.simulated_outcome_bucket,
        priority_tuple: projection.replayed.entry.priority_tuple,
      }),
    }))
    .sort(
      (left, right) =>
        right.entry_loss_score - left.entry_loss_score ||
        left.selection_entry_ref.localeCompare(right.selection_entry_ref),
    )
    .map((highlight, index) => ({
      ...highlight,
      highlight_rank: index + 1,
    }));
}

function projectionMap(projections: readonly NightlyPortfolioHighlightProjection[]) {
  return new Map(projections.map((projection) => [projection.selection_entry_ref, projection]));
}

function backlogPressure(input: {
  counts: ReturnType<typeof emptyNightlyPortfolioWhatIfSummaryCounts>;
  global_manifest_limit: number;
}) {
  const unresolved =
    input.counts.waiting_on_authority +
    input.counts.waiting_on_late_data +
    input.counts.review_required +
    input.counts.request_client_info +
    input.counts.blocked_internal +
    input.counts.failed_retryable +
    input.counts.failed_non_retryable +
    input.counts.deferred;
  return Number((unresolved / input.global_manifest_limit).toFixed(6));
}

function portfolioTailRisk(input: {
  projections: readonly SimulatedEntryProjection[];
  side: "baseline" | "simulated";
}) {
  const risks = input.projections
    .filter((projection) => {
      const outcome =
        input.side === "baseline"
          ? projection.replayed.baseline_outcome_bucket
          : projection.simulated_outcome_bucket;
      return !RESOLVED_OR_NON_BACKLOG_OUTCOMES.has(outcome);
    })
    .map((projection) => projection.replayed.entry.priority_tuple.risk_pressure ?? 0);
  return Number((Math.max(0, ...risks)).toFixed(6));
}

function stabilityState(input: {
  backlog_pressure: number | null;
  profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
}) {
  if (input.backlog_pressure === null) {
    return null;
  }
  if (input.backlog_pressure >= input.profile.hard_stability_rho) {
    return "HARD_THROTTLE" as const;
  }
  if (input.backlog_pressure >= input.profile.soft_stability_rho) {
    return "SOFT_THROTTLE" as const;
  }
  return "NORMAL" as const;
}

function entryDiffs(input: {
  projections: readonly SimulatedEntryProjection[];
  baseline_highlights: readonly NightlyPortfolioHighlightProjection[];
  simulated_highlights: readonly NightlyPortfolioHighlightProjection[];
  basis_reason_codes: readonly string[];
  baseline_digest_missing: boolean;
}) {
  const baselineHighlightByEntry = projectionMap(input.baseline_highlights);
  const simulatedHighlightByEntry = projectionMap(input.simulated_highlights);
  const diffs: NightlyPortfolioWhatIfSimulationEntryDiffRecord[] = [];
  const movementReasonCodesByEntry = new Map<string, string[]>();
  for (const projection of input.projections) {
    const baselineHighlight = baselineHighlightByEntry.get(projection.replayed.selection_entry_ref);
    const simulatedHighlight = simulatedHighlightByEntry.get(projection.replayed.selection_entry_ref);
    const movementReasons = new Set(projection.movement_reason_codes);
    const highlightChanged =
      (baselineHighlight?.highlight_rank ?? null) !== (simulatedHighlight?.highlight_rank ?? null);
    if (highlightChanged) {
      for (const reasonCode of input.basis_reason_codes) {
        movementReasons.add(reasonCode);
      }
      if (input.baseline_digest_missing) {
        movementReasons.add("BASELINE_DIGEST_MISSING");
      }
    }
    const changed =
      projection.replayed.baseline_selection_disposition !==
        projection.simulated_selection_disposition ||
      projection.replayed.baseline_outcome_bucket !== projection.simulated_outcome_bucket ||
      projection.replayed.baseline_execution_rank_or_null !==
        projection.simulated_execution_rank_or_null ||
      highlightChanged;
    const movementReasonCodes = changed
      ? uniqueSorted([...movementReasons, ...input.basis_reason_codes])
      : [NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON];
    movementReasonCodesByEntry.set(projection.replayed.selection_entry_ref, movementReasonCodes);
    diffs.push({
      selection_entry_ref: projection.replayed.selection_entry_ref,
      candidate_identity_hash: projection.replayed.candidate_identity_hash,
      baseline_selection_basis_hash: projection.replayed.baseline_selection_basis_hash,
      baseline_selection_disposition: projection.replayed.baseline_selection_disposition,
      simulated_selection_disposition: projection.simulated_selection_disposition,
      baseline_outcome_bucket: projection.replayed.baseline_outcome_bucket,
      simulated_outcome_bucket: projection.simulated_outcome_bucket,
      baseline_execution_rank_or_null: projection.replayed.baseline_execution_rank_or_null,
      simulated_execution_rank_or_null: projection.simulated_execution_rank_or_null,
      baseline_highlight_rank_or_null: baselineHighlight?.highlight_rank ?? null,
      simulated_highlight_rank_or_null: simulatedHighlight?.highlight_rank ?? null,
      baseline_priority_score_or_null: projection.replayed.baseline_priority_score_or_null,
      simulated_priority_score_or_null: projection.simulated_priority_score_or_null,
      baseline_reason_codes: projection.replayed.baseline_reason_codes,
      simulated_reason_codes: projection.simulated_reason_codes,
      movement_reason_codes: movementReasonCodes,
    });
  }
  return {
    diffs: diffs.sort((left, right) =>
      left.selection_entry_ref.localeCompare(right.selection_entry_ref),
    ),
    movement_reason_codes_by_entry_ref: movementReasonCodesByEntry,
  };
}

export async function simulateNightlyPortfolioWhatIf(
  input: SimulateNightlyPortfolioWhatIfInput,
): Promise<SimulateNightlyPortfolioWhatIfResult> {
  const sourceBatchSet = await loadNightlySimulationSourceBatchSet({
    repository: input.repository,
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    source_batch_run_refs: input.source_batch_run_refs,
  });
  const baselineDigest = input.baseline_digest ?? null;
  if (baselineDigest) {
    assertBaselineDigestMatches({ digest: baselineDigest, source_batch_set: sourceBatchSet });
  }
  const executionModeBoundaryContract = buildNightlyExecutionModeBoundaryContract({
    execution_mode: "ANALYSIS",
    analysis_only: true,
    non_compliance_config_refs: ["nightly-what-if-simulator"],
    counterfactual_basis: "NIGHTLY_PORTFOLIO_WHAT_IF",
    execution_posture: "LIVE_ANALYSIS",
    legal_effect_boundary: "MODELED_READ_ONLY",
    disclosure_reason_codes: ["ANALYSIS_ONLY_POSTURE", "MODELED_WHAT_IF_ONLY"],
  });
  const counterfactualGlobalConcurrencyProfile = normalizeConcurrencyProfile({
    baseline: sourceBatchSet.effective_batch.global_concurrency_profile,
    override: input.counterfactual_global_concurrency_profile_or_null,
  });
  const basisContract = buildNightlyPortfolioSimulationBasisContract({
    execution_mode_boundary_contract: executionModeBoundaryContract,
    tenant_id: sourceBatchSet.tenant_id,
    nightly_window_key: sourceBatchSet.nightly_window_key,
    source_batch_run_refs: sourceBatchSet.source_batch_run_refs,
    covered_selection_entry_refs: sourceBatchSet.covered_selection_entry_refs,
    baseline_selection_universe_hash: sourceBatchSet.effective_batch.selection_universe_hash,
    baseline_policy_snapshot_hash: sourceBatchSet.effective_batch.policy_snapshot_hash,
    baseline_autopilot_policy_hash: sourceBatchSet.effective_batch.autopilot_policy_hash,
    baseline_release_verification_manifest_ref:
      sourceBatchSet.effective_batch.release_verification_manifest_ref,
    baseline_schema_bundle_hash: sourceBatchSet.effective_batch.schema_bundle_hash,
    baseline_code_build_id: sourceBatchSet.effective_batch.code_build_id,
    baseline_environment_ref: sourceBatchSet.effective_batch.environment_ref,
    baseline_global_concurrency_profile: sourceBatchSet.effective_batch.global_concurrency_profile,
    counterfactual_policy_snapshot_hash_or_null:
      input.counterfactual_policy_snapshot_hash_or_null ?? null,
    counterfactual_autopilot_policy_hash_or_null:
      input.counterfactual_autopilot_policy_hash_or_null ?? null,
    counterfactual_release_verification_manifest_ref_or_null:
      input.counterfactual_release_verification_manifest_ref_or_null ?? null,
    counterfactual_release_candidate_identity_contract_or_null:
      input.counterfactual_release_candidate_identity_contract_or_null ?? null,
    counterfactual_global_concurrency_profile_or_null: counterfactualGlobalConcurrencyProfile,
    counterfactual_reason_codes: input.counterfactual_reason_codes ?? [],
    candidate_counterfactuals: input.candidate_counterfactuals ?? [],
  });
  const replayedEntries = replayNightlySelectionEntries({ source_batch_set: sourceBatchSet });
  const candidateCounterfactualByEntry = new Map(
    basisContract.candidate_counterfactuals.map((counterfactual) => [
      counterfactual.selection_entry_ref,
      counterfactual,
    ]),
  );
  const projectedEntries = replayedEntries.map((replayed) =>
    applyCandidateCounterfactual({
      replayed,
      counterfactual: candidateCounterfactualByEntry.get(replayed.selection_entry_ref),
    }),
  );
  const simulatedGlobalConcurrencyProfile =
    counterfactualGlobalConcurrencyProfile ??
    sourceBatchSet.effective_batch.global_concurrency_profile;
  const capacityAdjusted = applyCapacityCounterfactual({
    projections: projectedEntries,
    global_concurrency_profile: simulatedGlobalConcurrencyProfile,
    capacity_counterfactual_declared: counterfactualGlobalConcurrencyProfile !== null,
  });
  const baselineHighlights = highlightProjectionsFromDigest(baselineDigest);
  const simulatedHighlights = highlightProjectionsFromSimulation(capacityAdjusted);
  const { diffs, movement_reason_codes_by_entry_ref: movementReasons } = entryDiffs({
    projections: capacityAdjusted,
    baseline_highlights: baselineHighlights,
    simulated_highlights: simulatedHighlights,
    basis_reason_codes: basisContract.counterfactual_reason_codes,
    baseline_digest_missing: baselineDigest === null,
  });
  const baselineSummaryCounts = nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs(
    diffs,
    "baseline",
  );
  const simulatedSummaryCounts = nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs(
    diffs,
    "simulated",
  );
  const baselineBacklogPressure =
    sourceBatchSet.effective_batch.backlog_pressure ??
    backlogPressure({
      counts: baselineSummaryCounts,
      global_manifest_limit:
        sourceBatchSet.effective_batch.global_concurrency_profile.global_manifest_limit,
    });
  const simulatedBacklogPressure = backlogPressure({
    counts: simulatedSummaryCounts,
    global_manifest_limit: simulatedGlobalConcurrencyProfile.global_manifest_limit,
  });
  const simulation = buildNightlyPortfolioWhatIfSimulation({
    tenant_id: sourceBatchSet.tenant_id,
    nightly_window_key: sourceBatchSet.nightly_window_key,
    execution_mode_boundary_contract: executionModeBoundaryContract,
    basis_contract: basisContract,
    baseline_digest_ref_or_null: baselineDigest ? operatorMorningDigestRef(baselineDigest) : null,
    baseline_summary_counts: baselineSummaryCounts,
    simulated_summary_counts: simulatedSummaryCounts,
    baseline_backlog_pressure: baselineBacklogPressure,
    simulated_backlog_pressure: simulatedBacklogPressure,
    baseline_portfolio_tail_risk:
      sourceBatchSet.effective_batch.portfolio_tail_risk ??
      portfolioTailRisk({ projections: capacityAdjusted, side: "baseline" }),
    simulated_portfolio_tail_risk: portfolioTailRisk({
      projections: capacityAdjusted,
      side: "simulated",
    }),
    baseline_stability_state:
      sourceBatchSet.effective_batch.stability_state ??
      stabilityState({
        backlog_pressure: baselineBacklogPressure,
        profile: sourceBatchSet.effective_batch.global_concurrency_profile,
      }),
    simulated_stability_state: stabilityState({
      backlog_pressure: simulatedBacklogPressure,
      profile: simulatedGlobalConcurrencyProfile,
    }),
    baseline_highlighted_selection_entry_refs: sortStrings(
      baselineHighlights.map((highlight) => highlight.selection_entry_ref),
    ),
    simulated_highlighted_selection_entry_refs: sortStrings(
      simulatedHighlights.map((highlight) => highlight.selection_entry_ref),
    ),
    entry_diffs: diffs,
    highlight_diffs: deriveNightlyPortfolioDiffExplainability({
      baseline_highlights: baselineHighlights,
      simulated_highlights: simulatedHighlights,
      movement_reason_codes_by_entry_ref: movementReasons,
    }),
    simulated_by_principal_ref: input.simulated_by_principal_ref,
    simulated_at: input.simulated_at,
  });
  if (input.persist_simulation) {
    await input.persist_simulation(simulation);
  }
  return {
    source_batch_set: sourceBatchSet,
    simulation,
    persisted: input.persist_simulation !== undefined,
  };
}
