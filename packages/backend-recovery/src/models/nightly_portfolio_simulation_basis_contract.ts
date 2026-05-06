import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  NightlyPortfolioSimulationBasisContract as GeneratedNightlyPortfolioSimulationBasisContract,
  NightlyPortfolioSimulationBasisContractCandidateCounterfactual,
  NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { ReleaseCandidateIdentityContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  deriveExecutionModeBoundaryContractHash,
  type NightlyBatchRunGlobalConcurrencyProfileRecord,
} from "./nightly_batch_run.ts";
import type { ExecutionModeBoundaryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type NightlyPortfolioSimulationBasisContract =
  GeneratedNightlyPortfolioSimulationBasisContract;
export type NightlyPortfolioSimulationBasisContractRecord =
  NightlyPortfolioSimulationBasisContract;
export type NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfileRecord =
  NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile;
export type NightlyPortfolioCandidateCounterfactual =
  NightlyPortfolioSimulationBasisContractCandidateCounterfactual;

export const NIGHTLY_PORTFOLIO_SIMULATION_BASIS_CONTRACT_VERSION =
  "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_V1" as const;

export const NIGHTLY_PORTFOLIO_SIMULATION_POLICIES = {
  source_batch_window_state: "SINGLE_NIGHTLY_WINDOW",
  truth_source_policy: "PERSISTED_NIGHTLY_BATCH_SELECTION_DIGEST_AND_RELEASE_TRUTH_ONLY",
  selection_projection_policy: "REPLAY_SELECTION_ENTRIES_WITHOUT_LIVE_REQUERY",
  digest_projection_policy: "REPLAY_BASELINE_DIGEST_PARTITION_AND_APPLY_EXPLICIT_DIFFS_ONLY",
  non_execution_boundary_policy:
    "STEP_UP_APPROVAL_RELEASE_AND_AUTHORITY_AMBIGUITY_REMAIN_BLOCKING",
  release_identity_policy: "COUNTERFACTUAL_RELEASE_REQUIRES_EXACT_CANDIDATE_AND_SCHEMA_BINDING",
  successor_recovery_policy: "SOURCE_BATCH_SET_MAY_INCLUDE_SUCCESSOR_CHAIN_FOR_ONE_WINDOW_ONLY",
  diff_explainability_policy:
    "EVERY_BUCKET_ORDER_AND_HIGHLIGHT_CHANGE_REQUIRES_REASON_CODE_DIFFS",
} as const;

const CANDIDATE_COUNTERFACTUAL_OUTCOME_REASON = {
  counterfactual_policy_outcome: "SIMULATED_POLICY_CHANGE",
  counterfactual_authority_outcome: "SIMULATED_AUTHORITY_CHANGE",
  counterfactual_retry_outcome: "SIMULATED_RETRY_BUDGET_CHANGE",
  counterfactual_release_outcome: "SIMULATED_RELEASE_ADMISSIBILITY_CHANGE",
} as const;

export type NightlyPortfolioSimulationBasisContractErrorCode =
  | "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID"
  | "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_HASH_INVALID"
  | "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_POLICY_INVALID"
  | "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID";

export class NightlyPortfolioSimulationBasisContractError extends Error {
  readonly code: NightlyPortfolioSimulationBasisContractErrorCode;

  constructor(code: NightlyPortfolioSimulationBasisContractErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "NightlyPortfolioSimulationBasisContractError";
    this.code = code;
  }
}

function assertBasis(
  condition: unknown,
  code: NightlyPortfolioSimulationBasisContractErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new NightlyPortfolioSimulationBasisContractError(code, detail);
  }
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function uniqueSortedNightlyPortfolioSimulationStrings(
  label: string,
  values: readonly string[],
  options: { allow_empty: boolean } = { allow_empty: true },
) {
  assertBasis(
    Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label} must contain only non-empty strings`,
  );
  const sorted = sortStrings([...new Set(values)]);
  assertBasis(
    sorted.length === values.length,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label} must not contain duplicate values`,
  );
  assertBasis(
    options.allow_empty || sorted.length > 0,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label} must not be empty`,
  );
  return sorted;
}

function assertNonEmptyString(label: string, value: unknown) {
  assertBasis(
    typeof value === "string" && value.length > 0,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label} must be a non-empty string`,
  );
}

function assertPositiveInteger(label: string, value: unknown) {
  assertBasis(
    Number.isInteger(value) && Number(value) >= 1,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label} must be a positive integer`,
  );
}

function canonicalGlobalConcurrencyProfile(
  profile: NightlyBatchRunGlobalConcurrencyProfileRecord,
): NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfileRecord {
  return {
    global_manifest_limit: profile.global_manifest_limit,
    per_shard_manifest_limit: profile.per_shard_manifest_limit,
    authority_transmit_limit: profile.authority_transmit_limit,
    per_client_serialization: profile.per_client_serialization,
    heartbeat_interval_seconds: profile.heartbeat_interval_seconds,
    stale_heartbeat_after_seconds: profile.stale_heartbeat_after_seconds,
    soft_stability_rho: profile.soft_stability_rho,
    hard_stability_rho: profile.hard_stability_rho,
    retry_capacity_fraction: profile.retry_capacity_fraction,
    base_deficit_quantum_minutes: profile.base_deficit_quantum_minutes,
  };
}

function assertGlobalConcurrencyProfile(
  label: string,
  profile: NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfileRecord,
) {
  for (const field of [
    "global_manifest_limit",
    "per_shard_manifest_limit",
    "authority_transmit_limit",
    "heartbeat_interval_seconds",
    "stale_heartbeat_after_seconds",
  ] as const) {
    assertPositiveInteger(`${label}.${field}`, profile[field]);
  }
  for (const field of [
    "soft_stability_rho",
    "hard_stability_rho",
    "retry_capacity_fraction",
    "base_deficit_quantum_minutes",
  ] as const) {
    assertBasis(
      typeof profile[field] === "number" && Number.isFinite(profile[field]) && profile[field] > 0,
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
      `${label}.${field} must be a positive finite number`,
    );
  }
  assertBasis(
    profile.retry_capacity_fraction <= 1,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    `${label}.retry_capacity_fraction must be at most 1`,
  );
}

function canonicalCandidateCounterfactuals(
  counterfactuals: readonly NightlyPortfolioCandidateCounterfactual[],
) {
  const seenSelectionEntryRefs = new Set<string>();
  const seenCandidateIdentityHashes = new Set<string>();
  const canonical = counterfactuals.map((counterfactual) => {
    assertNonEmptyString(
      "candidate_counterfactuals[].selection_entry_ref",
      counterfactual.selection_entry_ref,
    );
    assertNonEmptyString(
      "candidate_counterfactuals[].candidate_identity_hash",
      counterfactual.candidate_identity_hash,
    );
    assertBasis(
      !seenSelectionEntryRefs.has(counterfactual.selection_entry_ref),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      `candidate_counterfactuals selection entry ${counterfactual.selection_entry_ref} is duplicated`,
    );
    assertBasis(
      !seenCandidateIdentityHashes.has(counterfactual.candidate_identity_hash),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      `candidate_counterfactuals candidate identity ${counterfactual.candidate_identity_hash} is duplicated`,
    );
    seenSelectionEntryRefs.add(counterfactual.selection_entry_ref);
    seenCandidateIdentityHashes.add(counterfactual.candidate_identity_hash);
    const reasonCodes = uniqueSortedNightlyPortfolioSimulationStrings(
      `candidate_counterfactuals[${counterfactual.selection_entry_ref}].reason_codes`,
      counterfactual.reason_codes,
      { allow_empty: false },
    );
    return {
      selection_entry_ref: counterfactual.selection_entry_ref,
      candidate_identity_hash: counterfactual.candidate_identity_hash,
      counterfactual_policy_outcome: counterfactual.counterfactual_policy_outcome,
      counterfactual_authority_outcome: counterfactual.counterfactual_authority_outcome,
      counterfactual_retry_outcome: counterfactual.counterfactual_retry_outcome,
      counterfactual_release_outcome: counterfactual.counterfactual_release_outcome,
      reason_codes: reasonCodes,
    } satisfies NightlyPortfolioCandidateCounterfactual;
  });
  return canonical.sort((left, right) =>
    left.selection_entry_ref.localeCompare(right.selection_entry_ref),
  );
}

export function deriveNightlyPortfolioSimulationSourceBatchSetHash(input: {
  nightly_window_key: string;
  source_batch_run_refs: readonly string[];
}) {
  return stableJsonHash({
    nightly_window_key: input.nightly_window_key,
    source_batch_run_refs: uniqueSortedNightlyPortfolioSimulationStrings(
      "source_batch_run_refs",
      input.source_batch_run_refs,
      { allow_empty: false },
    ),
  }) as string;
}

export function deriveNightlyPortfolioCounterfactualReasonCodes(input: {
  counterfactual_policy_snapshot_hash_or_null?: string | null;
  counterfactual_autopilot_policy_hash_or_null?: string | null;
  counterfactual_release_verification_manifest_ref_or_null?: string | null;
  counterfactual_release_candidate_identity_contract_or_null?: ReleaseCandidateIdentityContract | null;
  counterfactual_global_concurrency_profile_or_null?: NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfileRecord | null;
  additional_reason_codes?: readonly string[];
}) {
  const reasonCodes = new Set<string>(input.additional_reason_codes ?? []);
  if (
    input.counterfactual_policy_snapshot_hash_or_null !== null &&
    input.counterfactual_policy_snapshot_hash_or_null !== undefined
  ) {
    reasonCodes.add("SIMULATED_POLICY_CHANGE");
  }
  if (
    input.counterfactual_autopilot_policy_hash_or_null !== null &&
    input.counterfactual_autopilot_policy_hash_or_null !== undefined
  ) {
    reasonCodes.add("SIMULATED_POLICY_CHANGE");
  }
  if (
    input.counterfactual_release_verification_manifest_ref_or_null !== null &&
    input.counterfactual_release_verification_manifest_ref_or_null !== undefined
  ) {
    reasonCodes.add("SIMULATED_RELEASE_ADMISSIBILITY_CHANGE");
  }
  if (input.counterfactual_release_candidate_identity_contract_or_null !== null &&
      input.counterfactual_release_candidate_identity_contract_or_null !== undefined) {
    reasonCodes.add("SIMULATED_RELEASE_ADMISSIBILITY_CHANGE");
  }
  if (
    input.counterfactual_global_concurrency_profile_or_null !== null &&
    input.counterfactual_global_concurrency_profile_or_null !== undefined
  ) {
    reasonCodes.add("SIMULATED_CAPACITY_OR_RETRY_CHANGE");
  }
  return uniqueSortedNightlyPortfolioSimulationStrings(
    "counterfactual_reason_codes",
    [...reasonCodes],
  );
}

export function deriveNightlyPortfolioSimulationBasisContractHash(
  contract: NightlyPortfolioSimulationBasisContract,
) {
  const sourceBatchRunRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "source_batch_run_refs",
    contract.source_batch_run_refs,
    { allow_empty: false },
  );
  const coveredSelectionEntryRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "covered_selection_entry_refs",
    contract.covered_selection_entry_refs,
    { allow_empty: false },
  );
  const counterfactualReasonCodes = uniqueSortedNightlyPortfolioSimulationStrings(
    "counterfactual_reason_codes",
    contract.counterfactual_reason_codes,
  );
  const candidateCounterfactuals = canonicalCandidateCounterfactuals(
    contract.candidate_counterfactuals,
  );
  return stableJsonHash({
    contract_version: contract.contract_version,
    execution_mode_boundary_hash: contract.execution_mode_boundary_hash,
    tenant_id: contract.tenant_id,
    nightly_window_key: contract.nightly_window_key,
    source_batch_run_refs: sourceBatchRunRefs,
    source_batch_set_hash: contract.source_batch_set_hash,
    source_batch_count: contract.source_batch_count,
    source_batch_window_state: contract.source_batch_window_state,
    source_batch_recovery_state: contract.source_batch_recovery_state,
    covered_selection_entry_refs: coveredSelectionEntryRefs,
    covered_selection_entry_count: contract.covered_selection_entry_count,
    baseline_selection_universe_hash: contract.baseline_selection_universe_hash,
    baseline_policy_snapshot_hash: contract.baseline_policy_snapshot_hash,
    baseline_autopilot_policy_hash: contract.baseline_autopilot_policy_hash,
    baseline_release_verification_manifest_ref:
      contract.baseline_release_verification_manifest_ref,
    baseline_schema_bundle_hash: contract.baseline_schema_bundle_hash,
    baseline_code_build_id: contract.baseline_code_build_id,
    baseline_environment_ref: contract.baseline_environment_ref,
    baseline_global_concurrency_profile: contract.baseline_global_concurrency_profile,
    counterfactual_policy_snapshot_hash_or_null:
      contract.counterfactual_policy_snapshot_hash_or_null,
    counterfactual_autopilot_policy_hash_or_null:
      contract.counterfactual_autopilot_policy_hash_or_null,
    counterfactual_release_verification_manifest_ref_or_null:
      contract.counterfactual_release_verification_manifest_ref_or_null,
    counterfactual_release_candidate_identity_hash_or_null:
      contract.counterfactual_release_candidate_identity_contract_or_null
        ?.candidate_identity_hash ?? null,
    counterfactual_global_concurrency_profile_or_null:
      contract.counterfactual_global_concurrency_profile_or_null,
    counterfactual_reason_codes: counterfactualReasonCodes,
    candidate_counterfactuals: candidateCounterfactuals,
    truth_source_policy: contract.truth_source_policy,
    selection_projection_policy: contract.selection_projection_policy,
    digest_projection_policy: contract.digest_projection_policy,
    non_execution_boundary_policy: contract.non_execution_boundary_policy,
    release_identity_policy: contract.release_identity_policy,
    successor_recovery_policy: contract.successor_recovery_policy,
    diff_explainability_policy: contract.diff_explainability_policy,
  }) as string;
}

export type BuildNightlyPortfolioSimulationBasisContractInput = {
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  tenant_id: string;
  nightly_window_key: string;
  source_batch_run_refs: readonly string[];
  covered_selection_entry_refs: readonly string[];
  baseline_selection_universe_hash: string;
  baseline_policy_snapshot_hash: string;
  baseline_autopilot_policy_hash: string;
  baseline_release_verification_manifest_ref: string;
  baseline_schema_bundle_hash: string;
  baseline_code_build_id: string;
  baseline_environment_ref: NightlyPortfolioSimulationBasisContract["baseline_environment_ref"];
  baseline_global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
  counterfactual_policy_snapshot_hash_or_null?: string | null;
  counterfactual_autopilot_policy_hash_or_null?: string | null;
  counterfactual_release_verification_manifest_ref_or_null?: string | null;
  counterfactual_release_candidate_identity_contract_or_null?: ReleaseCandidateIdentityContract | null;
  counterfactual_global_concurrency_profile_or_null?: NightlyBatchRunGlobalConcurrencyProfileRecord | null;
  counterfactual_reason_codes?: readonly string[];
  candidate_counterfactuals?: readonly NightlyPortfolioCandidateCounterfactual[];
};

export function buildNightlyPortfolioSimulationBasisContract(
  input: BuildNightlyPortfolioSimulationBasisContractInput,
): NightlyPortfolioSimulationBasisContractRecord {
  const sourceBatchRunRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "source_batch_run_refs",
    input.source_batch_run_refs,
    { allow_empty: false },
  );
  const coveredSelectionEntryRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "covered_selection_entry_refs",
    input.covered_selection_entry_refs,
    { allow_empty: false },
  );
  const baselineGlobalConcurrencyProfile = canonicalGlobalConcurrencyProfile(
    input.baseline_global_concurrency_profile,
  );
  const counterfactualGlobalConcurrencyProfile =
    input.counterfactual_global_concurrency_profile_or_null === undefined ||
    input.counterfactual_global_concurrency_profile_or_null === null
      ? null
      : canonicalGlobalConcurrencyProfile(input.counterfactual_global_concurrency_profile_or_null);
  const counterfactualReasonCodes = deriveNightlyPortfolioCounterfactualReasonCodes({
    counterfactual_policy_snapshot_hash_or_null:
      input.counterfactual_policy_snapshot_hash_or_null ?? null,
    counterfactual_autopilot_policy_hash_or_null:
      input.counterfactual_autopilot_policy_hash_or_null ?? null,
    counterfactual_release_verification_manifest_ref_or_null:
      input.counterfactual_release_verification_manifest_ref_or_null ?? null,
    counterfactual_release_candidate_identity_contract_or_null:
      input.counterfactual_release_candidate_identity_contract_or_null ?? null,
    counterfactual_global_concurrency_profile_or_null: counterfactualGlobalConcurrencyProfile,
    additional_reason_codes: input.counterfactual_reason_codes ?? [],
  });
  const candidateCounterfactuals = canonicalCandidateCounterfactuals(
    input.candidate_counterfactuals ?? [],
  );
  const contract: NightlyPortfolioSimulationBasisContract = {
    contract_version: NIGHTLY_PORTFOLIO_SIMULATION_BASIS_CONTRACT_VERSION,
    basis_contract_hash: "",
    execution_mode_boundary_hash: deriveExecutionModeBoundaryContractHash(
      input.execution_mode_boundary_contract,
    ),
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    source_batch_run_refs: sourceBatchRunRefs,
    source_batch_set_hash: deriveNightlyPortfolioSimulationSourceBatchSetHash({
      nightly_window_key: input.nightly_window_key,
      source_batch_run_refs: sourceBatchRunRefs,
    }),
    source_batch_count: sourceBatchRunRefs.length,
    source_batch_window_state: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.source_batch_window_state,
    source_batch_recovery_state:
      sourceBatchRunRefs.length === 1 ? "SINGLE_BATCH" : "SUCCESSOR_RECOVERY_CHAIN",
    covered_selection_entry_refs: coveredSelectionEntryRefs,
    covered_selection_entry_count: coveredSelectionEntryRefs.length,
    baseline_selection_universe_hash: input.baseline_selection_universe_hash,
    baseline_policy_snapshot_hash: input.baseline_policy_snapshot_hash,
    baseline_autopilot_policy_hash: input.baseline_autopilot_policy_hash,
    baseline_release_verification_manifest_ref:
      input.baseline_release_verification_manifest_ref,
    baseline_schema_bundle_hash: input.baseline_schema_bundle_hash,
    baseline_code_build_id: input.baseline_code_build_id,
    baseline_environment_ref: input.baseline_environment_ref,
    baseline_global_concurrency_profile: baselineGlobalConcurrencyProfile,
    counterfactual_policy_snapshot_hash_or_null:
      input.counterfactual_policy_snapshot_hash_or_null ?? null,
    counterfactual_autopilot_policy_hash_or_null:
      input.counterfactual_autopilot_policy_hash_or_null ?? null,
    counterfactual_release_verification_manifest_ref_or_null:
      input.counterfactual_release_verification_manifest_ref_or_null ?? null,
    counterfactual_release_candidate_identity_contract_or_null:
      input.counterfactual_release_candidate_identity_contract_or_null ?? null,
    counterfactual_global_concurrency_profile_or_null: counterfactualGlobalConcurrencyProfile,
    counterfactual_reason_codes: counterfactualReasonCodes,
    candidate_counterfactuals: candidateCounterfactuals,
    truth_source_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.truth_source_policy,
    selection_projection_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.selection_projection_policy,
    digest_projection_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.digest_projection_policy,
    non_execution_boundary_policy:
      NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.non_execution_boundary_policy,
    release_identity_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.release_identity_policy,
    successor_recovery_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.successor_recovery_policy,
    diff_explainability_policy: NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.diff_explainability_policy,
  };
  contract.basis_contract_hash = deriveNightlyPortfolioSimulationBasisContractHash(contract);
  return assertNightlyPortfolioSimulationBasisContract(contract);
}

export function assertNightlyPortfolioSimulationBasisContract(
  contract: NightlyPortfolioSimulationBasisContractRecord,
) {
  assertBasis(
    contract.contract_version === NIGHTLY_PORTFOLIO_SIMULATION_BASIS_CONTRACT_VERSION,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    "contract_version must be NIGHTLY_PORTFOLIO_SIMULATION_BASIS_V1",
  );
  for (const field of [
    "basis_contract_hash",
    "execution_mode_boundary_hash",
    "tenant_id",
    "nightly_window_key",
    "source_batch_set_hash",
    "baseline_selection_universe_hash",
    "baseline_policy_snapshot_hash",
    "baseline_autopilot_policy_hash",
    "baseline_release_verification_manifest_ref",
    "baseline_schema_bundle_hash",
    "baseline_code_build_id",
    "baseline_environment_ref",
  ] as const) {
    assertNonEmptyString(field, contract[field]);
  }
  assertBasis(
    contract.basis_contract_hash === deriveNightlyPortfolioSimulationBasisContractHash(contract),
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_HASH_INVALID",
    "basis_contract_hash must equal the canonical basis payload hash",
  );
  const sourceBatchRunRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "source_batch_run_refs",
    contract.source_batch_run_refs,
    { allow_empty: false },
  );
  assertBasis(
    contract.source_batch_count === sourceBatchRunRefs.length,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    "source_batch_count must equal source_batch_run_refs length",
  );
  assertBasis(
    contract.source_batch_set_hash ===
      deriveNightlyPortfolioSimulationSourceBatchSetHash({
        nightly_window_key: contract.nightly_window_key,
        source_batch_run_refs: sourceBatchRunRefs,
      }),
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_HASH_INVALID",
    "source_batch_set_hash must equal the canonical source batch set hash",
  );
  assertBasis(
    contract.source_batch_window_state ===
      NIGHTLY_PORTFOLIO_SIMULATION_POLICIES.source_batch_window_state,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_POLICY_INVALID",
    "source_batch_window_state must remain SINGLE_NIGHTLY_WINDOW",
  );
  assertBasis(
    contract.source_batch_count === 1
      ? contract.source_batch_recovery_state === "SINGLE_BATCH"
      : contract.source_batch_recovery_state === "SUCCESSOR_RECOVERY_CHAIN",
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_POLICY_INVALID",
    "source_batch_recovery_state must mirror source batch count",
  );
  const coveredSelectionEntryRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "covered_selection_entry_refs",
    contract.covered_selection_entry_refs,
    { allow_empty: false },
  );
  assertBasis(
    contract.covered_selection_entry_count === coveredSelectionEntryRefs.length,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_FIELD_INVALID",
    "covered_selection_entry_count must equal covered_selection_entry_refs length",
  );
  assertGlobalConcurrencyProfile(
    "baseline_global_concurrency_profile",
    contract.baseline_global_concurrency_profile,
  );
  if (contract.counterfactual_global_concurrency_profile_or_null !== null) {
    assertGlobalConcurrencyProfile(
      "counterfactual_global_concurrency_profile_or_null",
      contract.counterfactual_global_concurrency_profile_or_null,
    );
  }
  for (const [field, expected] of Object.entries(NIGHTLY_PORTFOLIO_SIMULATION_POLICIES)) {
    assertBasis(
      contract[field as keyof typeof NIGHTLY_PORTFOLIO_SIMULATION_POLICIES] === expected,
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_POLICY_INVALID",
      `${field} must remain ${expected}`,
    );
  }
  const hasPolicyCounterfactual =
    contract.counterfactual_policy_snapshot_hash_or_null !== null ||
    contract.counterfactual_autopilot_policy_hash_or_null !== null;
  assertBasis(
    !hasPolicyCounterfactual ||
      (contract.counterfactual_policy_snapshot_hash_or_null !== null &&
        contract.counterfactual_autopilot_policy_hash_or_null !== null),
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
    "policy counterfactuals must declare policy and autopilot hashes together",
  );
  const hasReleaseCounterfactual =
    contract.counterfactual_release_verification_manifest_ref_or_null !== null ||
    contract.counterfactual_release_candidate_identity_contract_or_null !== null;
  assertBasis(
    !hasReleaseCounterfactual ||
      (contract.counterfactual_release_verification_manifest_ref_or_null !== null &&
        contract.counterfactual_release_candidate_identity_contract_or_null !== null),
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
    "release counterfactuals must declare release manifest and candidate identity together",
  );
  if (contract.counterfactual_release_candidate_identity_contract_or_null !== null) {
    assertBasis(
      contract.counterfactual_release_candidate_identity_contract_or_null.contract_version ===
        "RELEASE_CANDIDATE_IDENTITY_V1" &&
        contract.counterfactual_release_candidate_identity_contract_or_null
          .candidate_environment_ref === contract.baseline_environment_ref,
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      "counterfactual release identity must be exact and use the baseline environment",
    );
  }
  const hasCapacityCounterfactual =
    contract.counterfactual_global_concurrency_profile_or_null !== null;
  const hasAnyCounterfactual =
    hasPolicyCounterfactual ||
    hasReleaseCounterfactual ||
    hasCapacityCounterfactual ||
    contract.candidate_counterfactuals.length > 0;
  assertBasis(
    hasAnyCounterfactual,
    "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
    "nightly what-if basis must declare at least one counterfactual change",
  );
  const reasonCodes = new Set(
    uniqueSortedNightlyPortfolioSimulationStrings(
      "counterfactual_reason_codes",
      contract.counterfactual_reason_codes,
    ),
  );
  if (hasPolicyCounterfactual) {
    assertBasis(
      reasonCodes.has("SIMULATED_POLICY_CHANGE"),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      "policy counterfactuals require SIMULATED_POLICY_CHANGE",
    );
  }
  if (hasReleaseCounterfactual) {
    assertBasis(
      reasonCodes.has("SIMULATED_RELEASE_ADMISSIBILITY_CHANGE"),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      "release counterfactuals require SIMULATED_RELEASE_ADMISSIBILITY_CHANGE",
    );
  }
  if (hasCapacityCounterfactual) {
    assertBasis(
      reasonCodes.has("SIMULATED_CAPACITY_OR_RETRY_CHANGE"),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      "capacity counterfactuals require SIMULATED_CAPACITY_OR_RETRY_CHANGE",
    );
  }
  const coveredSelectionEntryRefSet = new Set(coveredSelectionEntryRefs);
  for (const counterfactual of canonicalCandidateCounterfactuals(contract.candidate_counterfactuals)) {
    assertBasis(
      coveredSelectionEntryRefSet.has(counterfactual.selection_entry_ref),
      "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
      `candidate counterfactual ${counterfactual.selection_entry_ref} must stay within coverage`,
    );
    const candidateReasonCodes = new Set(counterfactual.reason_codes);
    for (const [field, reasonCode] of Object.entries(CANDIDATE_COUNTERFACTUAL_OUTCOME_REASON)) {
      const value = counterfactual[field as keyof typeof CANDIDATE_COUNTERFACTUAL_OUTCOME_REASON];
      if (value !== "BASELINE") {
        assertBasis(
          candidateReasonCodes.has(reasonCode),
          "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_COUNTERFACTUAL_INVALID",
          `${counterfactual.selection_entry_ref} ${field} requires ${reasonCode}`,
        );
      }
    }
  }
  return contract;
}
