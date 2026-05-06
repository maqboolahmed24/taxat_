import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  NightlyPortfolioWhatIfSimulation as GeneratedNightlyPortfolioWhatIfSimulation,
  NightlyPortfolioWhatIfSimulationEntryDiff,
  NightlyPortfolioWhatIfSimulationHighlightDiff,
  NightlyPortfolioWhatIfSimulationOutcomeBucket,
  NightlyPortfolioWhatIfSimulationSummaryCounts,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { ExecutionModeBoundaryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  deriveExecutionModeBoundaryContractHash,
  type NightlyBatchSelectionDisposition,
} from "./nightly_batch_run.ts";
import {
  assertNightlyPortfolioSimulationBasisContract,
  type NightlyPortfolioSimulationBasisContractRecord,
} from "./nightly_portfolio_simulation_basis_contract.ts";

export type NightlyPortfolioWhatIfSimulationRecord =
  GeneratedNightlyPortfolioWhatIfSimulation;
export type NightlyPortfolioWhatIfSimulationSummaryCountsRecord =
  NightlyPortfolioWhatIfSimulationSummaryCounts;
export type NightlyPortfolioWhatIfSimulationEntryDiffRecord =
  NightlyPortfolioWhatIfSimulationEntryDiff;
export type NightlyPortfolioWhatIfSimulationHighlightDiffRecord =
  NightlyPortfolioWhatIfSimulationHighlightDiff;
export type NightlyPortfolioWhatIfOutcomeBucket =
  NightlyPortfolioWhatIfSimulationOutcomeBucket;

export const NIGHTLY_PORTFOLIO_WHAT_IF_ARTIFACT_TYPE =
  "NightlyPortfolioWhatIfSimulation" as const;

export const NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON =
  "UNCHANGED_FROM_PERSISTED_SELECTION_TRUTH" as const;

export type NightlyPortfolioWhatIfSimulationErrorCode =
  | "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID"
  | "NIGHTLY_PORTFOLIO_WHAT_IF_BOUNDARY_INVALID"
  | "NIGHTLY_PORTFOLIO_WHAT_IF_BASIS_INVALID"
  | "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID"
  | "NIGHTLY_PORTFOLIO_WHAT_IF_REASON_INVALID";

export class NightlyPortfolioWhatIfSimulationError extends Error {
  readonly code: NightlyPortfolioWhatIfSimulationErrorCode;

  constructor(code: NightlyPortfolioWhatIfSimulationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "NightlyPortfolioWhatIfSimulationError";
    this.code = code;
  }
}

function assertSimulation(
  condition: unknown,
  code: NightlyPortfolioWhatIfSimulationErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new NightlyPortfolioWhatIfSimulationError(code, detail);
  }
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedStrings(
  label: string,
  values: readonly string[],
  options: { allow_empty: boolean } = { allow_empty: true },
) {
  assertSimulation(
    Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must contain only non-empty strings`,
  );
  const sorted = sortStrings([...new Set(values)]);
  assertSimulation(
    sorted.length === values.length,
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must not contain duplicates`,
  );
  assertSimulation(
    options.allow_empty || sorted.length > 0,
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must not be empty`,
  );
  return sorted;
}

function assertNonEmptyString(label: string, value: unknown) {
  assertSimulation(
    typeof value === "string" && value.length > 0,
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must be a non-empty string`,
  );
}

export function emptyNightlyPortfolioWhatIfSummaryCounts(): NightlyPortfolioWhatIfSimulationSummaryCountsRecord {
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

export const NIGHTLY_PORTFOLIO_WHAT_IF_SUMMARY_FIELD_BY_OUTCOME = {
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
} as const satisfies Record<
  NightlyPortfolioWhatIfOutcomeBucket,
  keyof NightlyPortfolioWhatIfSimulationSummaryCountsRecord
>;

export const NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS = [
  "EXECUTE_NEW_MANIFEST",
  "EXECUTE_CONTINUATION_CHILD",
] as const satisfies readonly NightlyBatchSelectionDisposition[];

function canonicalSummaryCounts(
  counts: NightlyPortfolioWhatIfSimulationSummaryCountsRecord,
) {
  const canonical = emptyNightlyPortfolioWhatIfSummaryCounts();
  for (const field of Object.keys(canonical) as (keyof typeof canonical)[]) {
    const value = counts[field];
    assertSimulation(
      Number.isInteger(value) && value >= 0,
      "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
      `summary_counts.${field} must be a non-negative integer`,
    );
    canonical[field] = value;
  }
  return canonical;
}

export function nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs(
  entryDiffs: readonly NightlyPortfolioWhatIfSimulationEntryDiffRecord[],
  side: "baseline" | "simulated",
) {
  const counts = emptyNightlyPortfolioWhatIfSummaryCounts();
  const field =
    side === "baseline" ? "baseline_outcome_bucket" : "simulated_outcome_bucket";
  for (const diff of entryDiffs) {
    counts[NIGHTLY_PORTFOLIO_WHAT_IF_SUMMARY_FIELD_BY_OUTCOME[diff[field]]] += 1;
  }
  return counts;
}

function assertExecutionModeBoundary(contract: ExecutionModeBoundaryContract) {
  assertSimulation(
    contract.run_kind === "NIGHTLY" &&
      contract.execution_mode === "ANALYSIS" &&
      contract.analysis_only === true &&
      contract.execution_posture === "LIVE_ANALYSIS" &&
      contract.legal_effect_boundary === "MODELED_READ_ONLY" &&
      contract.boundary_hash === deriveExecutionModeBoundaryContractHash(contract),
    "NIGHTLY_PORTFOLIO_WHAT_IF_BOUNDARY_INVALID",
    "execution_mode_boundary_contract must freeze NIGHTLY analysis-only read posture",
  );
}

export function deriveNightlyPortfolioWhatIfSimulationId(input: {
  basis_contract_hash: string;
  simulated_by_principal_ref: string;
  simulated_at: string;
}) {
  return `nightly-portfolio-what-if.${(stableJsonHash(input) as string).slice(0, 32)}`;
}

export type BuildNightlyPortfolioWhatIfSimulationInput = Omit<
  NightlyPortfolioWhatIfSimulationRecord,
  "artifact_type" | "simulation_id"
> & {
  simulation_id?: string;
};

export function buildNightlyPortfolioWhatIfSimulation(
  input: BuildNightlyPortfolioWhatIfSimulationInput,
) {
  const simulation: NightlyPortfolioWhatIfSimulationRecord = {
    artifact_type: NIGHTLY_PORTFOLIO_WHAT_IF_ARTIFACT_TYPE,
    simulation_id:
      input.simulation_id ??
      deriveNightlyPortfolioWhatIfSimulationId({
        basis_contract_hash: input.basis_contract.basis_contract_hash,
        simulated_by_principal_ref: input.simulated_by_principal_ref,
        simulated_at: input.simulated_at,
      }),
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    execution_mode_boundary_contract: input.execution_mode_boundary_contract,
    basis_contract: input.basis_contract,
    baseline_digest_ref_or_null: input.baseline_digest_ref_or_null,
    baseline_summary_counts: canonicalSummaryCounts(input.baseline_summary_counts),
    simulated_summary_counts: canonicalSummaryCounts(input.simulated_summary_counts),
    baseline_backlog_pressure: input.baseline_backlog_pressure,
    simulated_backlog_pressure: input.simulated_backlog_pressure,
    baseline_portfolio_tail_risk: input.baseline_portfolio_tail_risk,
    simulated_portfolio_tail_risk: input.simulated_portfolio_tail_risk,
    baseline_stability_state: input.baseline_stability_state,
    simulated_stability_state: input.simulated_stability_state,
    baseline_highlighted_selection_entry_refs: uniqueSortedStrings(
      "baseline_highlighted_selection_entry_refs",
      input.baseline_highlighted_selection_entry_refs,
    ),
    simulated_highlighted_selection_entry_refs: uniqueSortedStrings(
      "simulated_highlighted_selection_entry_refs",
      input.simulated_highlighted_selection_entry_refs,
    ),
    entry_diffs: input.entry_diffs,
    highlight_diffs: input.highlight_diffs,
    simulated_by_principal_ref: input.simulated_by_principal_ref,
    simulated_at: input.simulated_at,
  };
  return assertNightlyPortfolioWhatIfSimulation(simulation);
}

function nonEmptyReasonSet(label: string, values: readonly string[]) {
  return new Set(uniqueSortedStrings(label, values, { allow_empty: false }));
}

function assertNullableNonNegativeNumber(label: string, value: unknown) {
  assertSimulation(
    value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0),
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must be null or a non-negative finite number`,
  );
}

function assertNullableRank(label: string, value: unknown) {
  assertSimulation(
    value === null || (Number.isInteger(value) && Number(value) >= 1),
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    `${label} must be null or a positive integer`,
  );
}

export function assertNightlyPortfolioWhatIfSimulation(
  simulation: NightlyPortfolioWhatIfSimulationRecord,
) {
  assertSimulation(
    simulation.artifact_type === NIGHTLY_PORTFOLIO_WHAT_IF_ARTIFACT_TYPE,
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    "artifact_type must be NightlyPortfolioWhatIfSimulation",
  );
  assertNonEmptyString("simulation_id", simulation.simulation_id);
  assertNonEmptyString("tenant_id", simulation.tenant_id);
  assertNonEmptyString("nightly_window_key", simulation.nightly_window_key);
  assertNonEmptyString("simulated_by_principal_ref", simulation.simulated_by_principal_ref);
  assertNonEmptyString("simulated_at", simulation.simulated_at);
  assertSimulation(
    Number.isFinite(Date.parse(simulation.simulated_at)),
    "NIGHTLY_PORTFOLIO_WHAT_IF_FIELD_INVALID",
    "simulated_at must be a valid date-time",
  );
  assertExecutionModeBoundary(simulation.execution_mode_boundary_contract);
  const basis = assertNightlyPortfolioSimulationBasisContract(
    simulation.basis_contract as NightlyPortfolioSimulationBasisContractRecord,
  );
  assertSimulation(
    basis.execution_mode_boundary_hash ===
      deriveExecutionModeBoundaryContractHash(simulation.execution_mode_boundary_contract),
    "NIGHTLY_PORTFOLIO_WHAT_IF_BASIS_INVALID",
    "basis_contract execution boundary hash must mirror the simulation boundary",
  );
  assertSimulation(
    basis.tenant_id === simulation.tenant_id &&
      basis.nightly_window_key === simulation.nightly_window_key,
    "NIGHTLY_PORTFOLIO_WHAT_IF_BASIS_INVALID",
    "basis_contract tenant and nightly window must mirror the simulation",
  );
  if (simulation.baseline_digest_ref_or_null !== null) {
    assertNonEmptyString("baseline_digest_ref_or_null", simulation.baseline_digest_ref_or_null);
  }
  for (const [label, value] of [
    ["baseline_backlog_pressure", simulation.baseline_backlog_pressure],
    ["simulated_backlog_pressure", simulation.simulated_backlog_pressure],
    ["baseline_portfolio_tail_risk", simulation.baseline_portfolio_tail_risk],
    ["simulated_portfolio_tail_risk", simulation.simulated_portfolio_tail_risk],
  ] as const) {
    assertNullableNonNegativeNumber(label, value);
  }
  const coveredSelectionEntryRefs = new Set(basis.covered_selection_entry_refs);
  const entryDiffRefs: string[] = [];
  const movementReasonCodesByEntry = new Map<string, Set<string>>();
  const candidateCounterfactualsByEntry = new Map(
    basis.candidate_counterfactuals.map((counterfactual) => [
      counterfactual.selection_entry_ref,
      counterfactual,
    ]),
  );
  for (const entryDiff of simulation.entry_diffs) {
    assertNonEmptyString("entry_diffs[].selection_entry_ref", entryDiff.selection_entry_ref);
    assertNonEmptyString("entry_diffs[].candidate_identity_hash", entryDiff.candidate_identity_hash);
    assertNonEmptyString(
      "entry_diffs[].baseline_selection_basis_hash",
      entryDiff.baseline_selection_basis_hash,
    );
    assertSimulation(
      coveredSelectionEntryRefs.has(entryDiff.selection_entry_ref),
      "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
      `entry diff ${entryDiff.selection_entry_ref} is outside the basis coverage`,
    );
    entryDiffRefs.push(entryDiff.selection_entry_ref);
    const baselineExecution = (
      NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS as readonly string[]
    ).includes(entryDiff.baseline_selection_disposition);
    const simulatedExecution = (
      NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS as readonly string[]
    ).includes(entryDiff.simulated_selection_disposition);
    if (baselineExecution) {
      assertNullableRank(
        `entry_diffs[${entryDiff.selection_entry_ref}].baseline_execution_rank_or_null`,
        entryDiff.baseline_execution_rank_or_null,
      );
      assertSimulation(
        entryDiff.baseline_execution_rank_or_null !== null &&
          entryDiff.baseline_priority_score_or_null !== null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `execution-capable baseline entry ${entryDiff.selection_entry_ref} must retain rank and priority score`,
      );
    } else {
      assertSimulation(
        entryDiff.baseline_execution_rank_or_null === null &&
          entryDiff.baseline_priority_score_or_null === null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `non-execution baseline entry ${entryDiff.selection_entry_ref} must clear rank and priority score`,
      );
    }
    if (simulatedExecution) {
      assertNullableRank(
        `entry_diffs[${entryDiff.selection_entry_ref}].simulated_execution_rank_or_null`,
        entryDiff.simulated_execution_rank_or_null,
      );
      assertSimulation(
        entryDiff.simulated_execution_rank_or_null !== null &&
          entryDiff.simulated_priority_score_or_null !== null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `execution-capable simulated entry ${entryDiff.selection_entry_ref} must retain rank and priority score`,
      );
    } else {
      assertSimulation(
        entryDiff.simulated_execution_rank_or_null === null &&
          entryDiff.simulated_priority_score_or_null === null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `non-execution simulated entry ${entryDiff.selection_entry_ref} must clear rank and priority score`,
      );
    }
    assertNullableRank(
      `entry_diffs[${entryDiff.selection_entry_ref}].baseline_highlight_rank_or_null`,
      entryDiff.baseline_highlight_rank_or_null,
    );
    assertNullableRank(
      `entry_diffs[${entryDiff.selection_entry_ref}].simulated_highlight_rank_or_null`,
      entryDiff.simulated_highlight_rank_or_null,
    );
    assertNullableNonNegativeNumber(
      `entry_diffs[${entryDiff.selection_entry_ref}].baseline_priority_score_or_null`,
      entryDiff.baseline_priority_score_or_null,
    );
    assertNullableNonNegativeNumber(
      `entry_diffs[${entryDiff.selection_entry_ref}].simulated_priority_score_or_null`,
      entryDiff.simulated_priority_score_or_null,
    );
    nonEmptyReasonSet(
      `entry_diffs[${entryDiff.selection_entry_ref}].baseline_reason_codes`,
      entryDiff.baseline_reason_codes,
    );
    nonEmptyReasonSet(
      `entry_diffs[${entryDiff.selection_entry_ref}].simulated_reason_codes`,
      entryDiff.simulated_reason_codes,
    );
    const movementReasonCodes = nonEmptyReasonSet(
      `entry_diffs[${entryDiff.selection_entry_ref}].movement_reason_codes`,
      entryDiff.movement_reason_codes,
    );
    movementReasonCodesByEntry.set(entryDiff.selection_entry_ref, movementReasonCodes);
    const changed =
      entryDiff.baseline_selection_disposition !== entryDiff.simulated_selection_disposition ||
      entryDiff.baseline_outcome_bucket !== entryDiff.simulated_outcome_bucket ||
      entryDiff.baseline_execution_rank_or_null !== entryDiff.simulated_execution_rank_or_null ||
      entryDiff.baseline_highlight_rank_or_null !== entryDiff.simulated_highlight_rank_or_null;
    if (changed) {
      const declaredReasonCodes = new Set([
        ...basis.counterfactual_reason_codes,
        ...(candidateCounterfactualsByEntry.get(entryDiff.selection_entry_ref)?.reason_codes ?? []),
      ]);
      assertSimulation(
        declaredReasonCodes.size === 0 ||
          [...movementReasonCodes].some((code) => declaredReasonCodes.has(code)),
        "NIGHTLY_PORTFOLIO_WHAT_IF_REASON_INVALID",
        `entry diff ${entryDiff.selection_entry_ref} must explain the declared counterfactual that changed it`,
      );
    }
    const candidateCounterfactual = candidateCounterfactualsByEntry.get(
      entryDiff.selection_entry_ref,
    );
    assertSimulation(
      !(
        candidateCounterfactual?.counterfactual_authority_outcome === "AMBIGUOUS" &&
        (entryDiff.simulated_outcome_bucket === "AUTO_COMPLETED" ||
          entryDiff.simulated_outcome_bucket === "REUSED_RESULT")
      ),
      "NIGHTLY_PORTFOLIO_WHAT_IF_REASON_INVALID",
      `entry diff ${entryDiff.selection_entry_ref} must keep authority ambiguity blocking`,
    );
  }
  assertSimulation(
    simulation.entry_diffs.length > 0,
    "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
    "entry_diffs must not be empty",
  );
  const sortedEntryDiffRefs = uniqueSortedStrings("entry_diffs[].selection_entry_ref", entryDiffRefs, {
    allow_empty: false,
  });
  assertSimulation(
    sortedEntryDiffRefs.join("\n") === basis.covered_selection_entry_refs.join("\n"),
    "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
    "entry_diffs must exactly cover basis covered_selection_entry_refs",
  );
  assertSimulation(
    JSON.stringify(canonicalSummaryCounts(simulation.baseline_summary_counts)) ===
      JSON.stringify(nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs(simulation.entry_diffs, "baseline")),
    "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
    "baseline_summary_counts must replay from entry_diffs baseline outcomes",
  );
  assertSimulation(
    JSON.stringify(canonicalSummaryCounts(simulation.simulated_summary_counts)) ===
      JSON.stringify(nightlyPortfolioWhatIfSummaryCountsFromEntryDiffs(simulation.entry_diffs, "simulated")),
    "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
    "simulated_summary_counts must replay from entry_diffs simulated outcomes",
  );
  const baselineHighlightRefs = new Set(
    uniqueSortedStrings(
      "baseline_highlighted_selection_entry_refs",
      simulation.baseline_highlighted_selection_entry_refs,
    ),
  );
  const simulatedHighlightRefs = new Set(
    uniqueSortedStrings(
      "simulated_highlighted_selection_entry_refs",
      simulation.simulated_highlighted_selection_entry_refs,
    ),
  );
  const highlightDiffRefs: string[] = [];
  for (const highlightDiff of simulation.highlight_diffs) {
    assertNonEmptyString("highlight_diffs[].selection_entry_ref", highlightDiff.selection_entry_ref);
    highlightDiffRefs.push(highlightDiff.selection_entry_ref);
    assertSimulation(
      baselineHighlightRefs.has(highlightDiff.selection_entry_ref) ||
        simulatedHighlightRefs.has(highlightDiff.selection_entry_ref),
      "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
      `highlight diff ${highlightDiff.selection_entry_ref} is outside highlighted ref union`,
    );
    assertNullableRank(
      `highlight_diffs[${highlightDiff.selection_entry_ref}].baseline_highlight_rank_or_null`,
      highlightDiff.baseline_highlight_rank_or_null,
    );
    assertNullableRank(
      `highlight_diffs[${highlightDiff.selection_entry_ref}].simulated_highlight_rank_or_null`,
      highlightDiff.simulated_highlight_rank_or_null,
    );
    assertNullableNonNegativeNumber(
      `highlight_diffs[${highlightDiff.selection_entry_ref}].baseline_entry_loss_score_or_null`,
      highlightDiff.baseline_entry_loss_score_or_null,
    );
    assertNullableNonNegativeNumber(
      `highlight_diffs[${highlightDiff.selection_entry_ref}].simulated_entry_loss_score_or_null`,
      highlightDiff.simulated_entry_loss_score_or_null,
    );
    const reasonCodes = nonEmptyReasonSet(
      `highlight_diffs[${highlightDiff.selection_entry_ref}].reason_codes`,
      highlightDiff.reason_codes,
    );
    const movementReasonCodes = movementReasonCodesByEntry.get(highlightDiff.selection_entry_ref);
    assertSimulation(
      movementReasonCodes === undefined ||
        [...reasonCodes].some((code) => movementReasonCodes.has(code)),
      "NIGHTLY_PORTFOLIO_WHAT_IF_REASON_INVALID",
      `highlight diff ${highlightDiff.selection_entry_ref} must align to entry movement reason codes`,
    );
    if (highlightDiff.diff_state === "ADDED") {
      assertSimulation(
        highlightDiff.baseline_highlight_rank_or_null === null &&
          highlightDiff.simulated_highlight_rank_or_null !== null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `highlight diff ${highlightDiff.selection_entry_ref} ADDED must clear baseline rank and retain simulated rank`,
      );
    }
    if (highlightDiff.diff_state === "REMOVED") {
      assertSimulation(
        highlightDiff.baseline_highlight_rank_or_null !== null &&
          highlightDiff.simulated_highlight_rank_or_null === null,
        "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
        `highlight diff ${highlightDiff.selection_entry_ref} REMOVED must retain baseline rank and clear simulated rank`,
      );
    }
  }
  const expectedHighlightRefs = sortStrings([
    ...new Set([...baselineHighlightRefs, ...simulatedHighlightRefs]),
  ]);
  const actualHighlightRefs = uniqueSortedStrings("highlight_diffs[].selection_entry_ref", highlightDiffRefs);
  assertSimulation(
    expectedHighlightRefs.join("\n") === actualHighlightRefs.join("\n"),
    "NIGHTLY_PORTFOLIO_WHAT_IF_PARTITION_INVALID",
    "highlight_diffs must exactly cover baseline and simulated highlighted ref union",
  );
  return simulation;
}
