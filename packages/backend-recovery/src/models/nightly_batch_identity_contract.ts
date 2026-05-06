import {
  canonicalJsonStringify,
  sha256HexUtf8,
  stableJsonHash,
} from "../../../domain-kernel/src/primitives/hash.ts";
import type { NightlyBatchIdentityContract as GeneratedNightlyBatchIdentityContract } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

export type NightlyBatchIdentityContract = GeneratedNightlyBatchIdentityContract;
export type NightlyBatchTriggerClass = NightlyBatchIdentityContract["trigger_class"];
export type NightlyBatchEnvironmentRef = NightlyBatchIdentityContract["environment_ref"];
export type NightlyBatchRecoveryResumeState =
  NightlyBatchIdentityContract["recovery_resume_state"];

export const NIGHTLY_BATCH_IDENTITY_CONTRACT_VERSION =
  "NIGHTLY_BATCH_IDENTITY_V1" as const;

export const NIGHTLY_BATCH_IDENTITY_POLICIES = {
  identity_binding_policy:
    "TENANT_WINDOW_TRIGGER_RELEASE_POLICY_AUTOPILOT_SCHEMA_BUILD_UNIVERSE_HASH",
  same_window_duplicate_policy: "REUSE_BATCH_AND_PERSIST_EXPLICIT_CLIENT_DISPOSITIONS",
  candidate_universe_policy: "EVERY_CANDIDATE_REQUIRES_PERSISTED_SELECTION_DISPOSITION",
  terminal_result_reuse_policy: "REUSE_TERMINAL_RESULT_BEFORE_NEW_MANIFEST_ALLOCATION",
  active_attempt_isolation_policy: "SAME_WINDOW_ACTIVE_ATTEMPT_REQUIRES_DEFER_OR_STALE_RECLAIM",
  shard_failure_isolation_policy: "UNRELATED_CLIENTS_RETAIN_EXPLICIT_OUTCOME_DESPITE_SHARD_FAILURE",
  cross_window_continuity_policy: "WINDOW_KEY_PART_OF_MANIFEST_AND_BATCH_IDENTITY",
  recovery_lineage_policy: "SUCCESSOR_MUST_LINK_AND_RESUME_PREDECESSOR",
} as const satisfies Pick<
  NightlyBatchIdentityContract,
  | "identity_binding_policy"
  | "same_window_duplicate_policy"
  | "candidate_universe_policy"
  | "terminal_result_reuse_policy"
  | "active_attempt_isolation_policy"
  | "shard_failure_isolation_policy"
  | "cross_window_continuity_policy"
  | "recovery_lineage_policy"
>;

export type NightlyBatchIdentityContractInput = Omit<
  NightlyBatchIdentityContract,
  | "contract_version"
  | "identity_contract_hash"
  | keyof typeof NIGHTLY_BATCH_IDENTITY_POLICIES
>;

export type NightlyBatchSchedulerDedupeTuple = Pick<
  NightlyBatchIdentityContract,
  | "tenant_id"
  | "nightly_window_key"
  | "trigger_class"
  | "release_verification_manifest_ref"
  | "policy_snapshot_hash"
  | "autopilot_policy_hash"
>;

export type NightlyBatchIdentityContractErrorCode =
  | "NIGHTLY_BATCH_IDENTITY_FIELD_INVALID"
  | "NIGHTLY_BATCH_IDENTITY_HASH_INVALID"
  | "NIGHTLY_BATCH_IDENTITY_POLICY_INVALID"
  | "NIGHTLY_BATCH_IDENTITY_RECOVERY_INVALID";

export class NightlyBatchIdentityContractError extends Error {
  readonly code: NightlyBatchIdentityContractErrorCode;
  readonly trace: string;

  constructor(
    code: NightlyBatchIdentityContractErrorCode,
    detail: string,
    traceSubject?: unknown,
  ) {
    super(`${code}: ${detail}`);
    this.name = "NightlyBatchIdentityContractError";
    this.code = code;
    this.trace = nightlyBatchIdentityContractFailureTrace(traceSubject ?? detail);
  }
}

export function nightlyBatchIdentityContractFailureTrace(value: unknown) {
  try {
    return canonicalJsonStringify(value);
  } catch {
    return JSON.stringify(value, null, 2);
  }
}

function assertIdentityContract(
  condition: unknown,
  code: NightlyBatchIdentityContractErrorCode,
  detail: string,
  traceSubject?: unknown,
): asserts condition {
  if (!condition) {
    throw new NightlyBatchIdentityContractError(code, detail, traceSubject);
  }
}

function requireNonEmptyString(label: string, value: unknown, traceSubject: unknown) {
  assertIdentityContract(
    typeof value === "string" && value.length > 0 && value.trim() === value,
    "NIGHTLY_BATCH_IDENTITY_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
    traceSubject,
  );
}

export function deriveNightlySchedulerDedupeKey(tuple: NightlyBatchSchedulerDedupeTuple) {
  for (const [field, value] of Object.entries(tuple)) {
    requireNonEmptyString(`scheduler_dedupe_tuple.${field}`, value, tuple);
  }
  return sha256HexUtf8(
    [
      tuple.tenant_id,
      tuple.nightly_window_key,
      tuple.trigger_class,
      tuple.release_verification_manifest_ref,
      tuple.policy_snapshot_hash,
      tuple.autopilot_policy_hash,
    ].join("|"),
  ) as string;
}

export function nightlyBatchIdentityContractHashPayload(
  contract: NightlyBatchIdentityContract,
) {
  return {
    contract_version: contract.contract_version,
    tenant_id: contract.tenant_id,
    nightly_window_key: contract.nightly_window_key,
    trigger_class: contract.trigger_class,
    release_verification_manifest_ref: contract.release_verification_manifest_ref,
    policy_snapshot_hash: contract.policy_snapshot_hash,
    autopilot_policy_hash: contract.autopilot_policy_hash,
    scheduler_dedupe_key: contract.scheduler_dedupe_key,
    schema_bundle_hash: contract.schema_bundle_hash,
    code_build_id: contract.code_build_id,
    environment_ref: contract.environment_ref,
    selection_universe_hash: contract.selection_universe_hash,
    selection_universe_count: contract.selection_universe_count,
    reclaimed_predecessor_batch_run_ref_or_null:
      contract.reclaimed_predecessor_batch_run_ref_or_null,
    recovery_resume_state: contract.recovery_resume_state,
    identity_binding_policy: contract.identity_binding_policy,
    same_window_duplicate_policy: contract.same_window_duplicate_policy,
    candidate_universe_policy: contract.candidate_universe_policy,
    terminal_result_reuse_policy: contract.terminal_result_reuse_policy,
    active_attempt_isolation_policy: contract.active_attempt_isolation_policy,
    shard_failure_isolation_policy: contract.shard_failure_isolation_policy,
    cross_window_continuity_policy: contract.cross_window_continuity_policy,
    recovery_lineage_policy: contract.recovery_lineage_policy,
  };
}

export function deriveNightlyBatchIdentityContractHash(
  contract: NightlyBatchIdentityContract,
) {
  return stableJsonHash(nightlyBatchIdentityContractHashPayload(contract)) as string;
}

export function assertNightlyBatchIdentityContract(
  contract: NightlyBatchIdentityContract,
) {
  assertIdentityContract(
    contract.contract_version === NIGHTLY_BATCH_IDENTITY_CONTRACT_VERSION,
    "NIGHTLY_BATCH_IDENTITY_FIELD_INVALID",
    `contract_version must be ${NIGHTLY_BATCH_IDENTITY_CONTRACT_VERSION}`,
    contract,
  );

  for (const field of [
    "tenant_id",
    "nightly_window_key",
    "trigger_class",
    "release_verification_manifest_ref",
    "policy_snapshot_hash",
    "autopilot_policy_hash",
    "scheduler_dedupe_key",
    "schema_bundle_hash",
    "code_build_id",
    "environment_ref",
    "selection_universe_hash",
    "recovery_resume_state",
  ] as const) {
    requireNonEmptyString(field, contract[field], contract);
  }

  assertIdentityContract(
    Number.isInteger(contract.selection_universe_count) &&
      contract.selection_universe_count >= 0,
    "NIGHTLY_BATCH_IDENTITY_FIELD_INVALID",
    "selection_universe_count must be a non-negative integer",
    contract,
  );

  for (const [field, expected] of Object.entries(NIGHTLY_BATCH_IDENTITY_POLICIES)) {
    assertIdentityContract(
      contract[field as keyof typeof NIGHTLY_BATCH_IDENTITY_POLICIES] === expected,
      "NIGHTLY_BATCH_IDENTITY_POLICY_INVALID",
      `${field} must be ${expected}`,
      contract,
    );
  }

  if (contract.trigger_class === "RECOVERY_RECLAIM_WINDOW") {
    requireNonEmptyString(
      "reclaimed_predecessor_batch_run_ref_or_null",
      contract.reclaimed_predecessor_batch_run_ref_or_null,
      contract,
    );
    assertIdentityContract(
      contract.recovery_resume_state === "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" ||
        contract.recovery_resume_state === "PREDECESSOR_SELECTION_REUSED_RESHARDED",
      "NIGHTLY_BATCH_IDENTITY_RECOVERY_INVALID",
      "RECOVERY_RECLAIM_WINDOW requires a predecessor resume state",
      contract,
    );
  } else {
    assertIdentityContract(
      contract.reclaimed_predecessor_batch_run_ref_or_null === null,
      "NIGHTLY_BATCH_IDENTITY_RECOVERY_INVALID",
      "non-recovery nightly triggers must keep predecessor linkage null",
      contract,
    );
    assertIdentityContract(
      contract.recovery_resume_state === "NOT_APPLICABLE",
      "NIGHTLY_BATCH_IDENTITY_RECOVERY_INVALID",
      "non-recovery nightly triggers must keep recovery_resume_state = NOT_APPLICABLE",
      contract,
    );
  }

  const expectedHash = deriveNightlyBatchIdentityContractHash(contract);
  assertIdentityContract(
    contract.identity_contract_hash === expectedHash,
    "NIGHTLY_BATCH_IDENTITY_HASH_INVALID",
    "identity_contract_hash must equal the canonical nightly batch identity hash",
    { expectedHash, contract },
  );

  return contract;
}

export function buildNightlyBatchIdentityContract(
  input: NightlyBatchIdentityContractInput,
) {
  const contract = {
    contract_version: NIGHTLY_BATCH_IDENTITY_CONTRACT_VERSION,
    identity_contract_hash: "",
    ...input,
    ...NIGHTLY_BATCH_IDENTITY_POLICIES,
  } satisfies NightlyBatchIdentityContract;
  contract.identity_contract_hash = deriveNightlyBatchIdentityContractHash(contract);
  return assertNightlyBatchIdentityContract(contract);
}

export function cloneNightlyBatchIdentityContract(contract: NightlyBatchIdentityContract) {
  return structuredClone(assertNightlyBatchIdentityContract(contract));
}
