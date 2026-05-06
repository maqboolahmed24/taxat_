import { createHash } from "node:crypto";

import { canonicalJsonStringify, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  NightlyBatchRunRecord,
  NightlyBatchRunSelectionEntryRecord,
  NightlyBatchRunGlobalConcurrencyProfileRecord,
  NightlyBatchRunPriorityTupleRecord,
} from "../models/nightly_batch_run.ts";

type CanonicalJsonValue =
  | boolean
  | null
  | number
  | string
  | PythonFloat
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

type PythonFloat = {
  readonly __nightly_python_float: number;
};

export type NightlySelectionCandidateIdentityInput = {
  tenant_id: string;
  nightly_window_key: string;
  client_id: string;
  period: string;
  requested_scope: readonly string[];
};

export type NightlySelectionBasisBatchInput = Pick<
  NightlyBatchRunRecord,
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
> & {
  global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
};

export type NightlySelectionBasisEntryInput = Pick<
  NightlyBatchRunSelectionEntryRecord,
  | "candidate_identity_hash"
  | "selection_disposition"
  | "terminal_result_reuse_state"
  | "active_attempt_resolution_state"
  | "requested_scope"
  | "reason_codes"
  | "priority_tuple"
  | "prior_manifest_ref"
  | "predecessor_selection_entry_ref_or_null"
  | "next_checkpoint_at"
  | "fairness_group_key"
>;

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function pythonFloat(value: number): PythonFloat {
  return { __nightly_python_float: value };
}

function appendUnicodeEscape(parts: string[], codePoint: number) {
  if (codePoint <= 0xffff) {
    parts.push(`\\u${codePoint.toString(16).padStart(4, "0")}`);
    return;
  }
  const normalizedCodePoint = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (normalizedCodePoint >> 10);
  const lowSurrogate = 0xdc00 + (normalizedCodePoint & 0x3ff);
  parts.push(`\\u${highSurrogate.toString(16).padStart(4, "0")}`);
  parts.push(`\\u${lowSurrogate.toString(16).padStart(4, "0")}`);
}

function escapeAsciiJsonString(value: string) {
  const parts = ['"'];
  for (const character of value.normalize("NFC")) {
    switch (character) {
      case '"':
        parts.push('\\"');
        continue;
      case "\\":
        parts.push("\\\\");
        continue;
      case "\b":
        parts.push("\\b");
        continue;
      case "\f":
        parts.push("\\f");
        continue;
      case "\n":
        parts.push("\\n");
        continue;
      case "\r":
        parts.push("\\r");
        continue;
      case "\t":
        parts.push("\\t");
        continue;
      default:
        break;
    }
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint <= 0x1f || codePoint > 0x7e) {
      appendUnicodeEscape(parts, codePoint);
      continue;
    }
    parts.push(character);
  }
  parts.push('"');
  return parts.join("");
}

function serializePythonJsonNumber(value: number, forceFloat: boolean) {
  if (!Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error("nightly selection hash input contains an unsupported number");
  }
  if (forceFloat && Number.isInteger(value)) {
    return `${value}.0`;
  }
  return JSON.stringify(value);
}

function isPythonFloat(value: CanonicalJsonValue): value is PythonFloat {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as PythonFloat).__nightly_python_float === "number"
  );
}

function serializePythonCompatibleJson(value: CanonicalJsonValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return escapeAsciiJsonString(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return serializePythonJsonNumber(value, false);
  }
  if (isPythonFloat(value)) {
    return serializePythonJsonNumber(value.__nightly_python_float, true);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializePythonCompatibleJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${escapeAsciiJsonString(key)}:${serializePythonCompatibleJson(value[key]!)}`)
    .join(",")}}`;
}

function stablePythonCompatibleHash(value: CanonicalJsonValue) {
  return createHash("sha256")
    .update(serializePythonCompatibleJson(value), "utf8")
    .digest("hex");
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireStringList(label: string, values: readonly string[]) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value)) {
    throw new Error(`${label} must contain only non-empty strings`);
  }
  return values;
}

function metricFloat(value: number | undefined) {
  return value === undefined ? null : pythonFloat(value);
}

export function deriveNightlySelectionCandidateIdentityHash(
  input: NightlySelectionCandidateIdentityInput,
) {
  return stableJsonHash({
    tenant_id: requireString("tenant_id", input.tenant_id),
    nightly_window_key: requireString("nightly_window_key", input.nightly_window_key),
    client_id: requireString("client_id", input.client_id),
    period: requireString("period", input.period),
    requested_scope: sortStrings(requireStringList("requested_scope", input.requested_scope)),
  }) as string;
}

export function canonicalNightlyPriorityTupleForSelectionBasis(
  priorityTuple: NightlyBatchRunPriorityTupleRecord,
): CanonicalJsonValue {
  return {
    deadline_bucket: priorityTuple.deadline_bucket,
    filing_state_bucket: priorityTuple.filing_state_bucket,
    authority_checkpoint_bucket: priorityTuple.authority_checkpoint_bucket,
    risk_bucket: priorityTuple.risk_bucket,
    automation_readiness_bucket: priorityTuple.automation_readiness_bucket,
    retry_ready_bucket: priorityTuple.retry_ready_bucket,
    priority_score: metricFloat(priorityTuple.priority_score),
    expected_service_minutes: metricFloat(priorityTuple.expected_service_minutes),
    deadline_pressure: metricFloat(priorityTuple.deadline_pressure),
    checkpoint_pressure: metricFloat(priorityTuple.checkpoint_pressure),
    risk_pressure: metricFloat(priorityTuple.risk_pressure),
    fairness_credit: metricFloat(priorityTuple.fairness_credit),
    retry_success_probability: metricFloat(priorityTuple.retry_success_probability),
    retry_expected_gain: metricFloat(priorityTuple.retry_expected_gain),
  };
}

export function deriveNightlySelectionBasisHash(input: {
  batch: NightlySelectionBasisBatchInput;
  entry: NightlySelectionBasisEntryInput;
}) {
  const globalConcurrencyProfileHash = stableJsonHash(
    input.batch.global_concurrency_profile,
  ) as string;
  return stablePythonCompatibleHash({
    nightly_window_key: requireString("nightly_window_key", input.batch.nightly_window_key),
    trigger_class: requireString("trigger_class", input.batch.trigger_class),
    recovery_resume_state: requireString(
      "recovery_resume_state",
      input.batch.recovery_resume_state,
    ),
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.batch.policy_snapshot_hash),
    autopilot_policy_hash: requireString(
      "autopilot_policy_hash",
      input.batch.autopilot_policy_hash,
    ),
    release_verification_manifest_ref: requireString(
      "release_verification_manifest_ref",
      input.batch.release_verification_manifest_ref,
    ),
    schema_bundle_hash: requireString("schema_bundle_hash", input.batch.schema_bundle_hash),
    code_build_id: requireString("code_build_id", input.batch.code_build_id),
    environment_ref: requireString("environment_ref", input.batch.environment_ref),
    selection_universe_hash: requireString(
      "selection_universe_hash",
      input.batch.selection_universe_hash,
    ),
    global_concurrency_profile_hash: globalConcurrencyProfileHash,
    candidate_identity_hash: requireString(
      "candidate_identity_hash",
      input.entry.candidate_identity_hash,
    ),
    selection_disposition: requireString(
      "selection_disposition",
      input.entry.selection_disposition,
    ),
    terminal_result_reuse_state: requireString(
      "terminal_result_reuse_state",
      input.entry.terminal_result_reuse_state,
    ),
    active_attempt_resolution_state: requireString(
      "active_attempt_resolution_state",
      input.entry.active_attempt_resolution_state,
    ),
    requested_scope: sortStrings(requireStringList("requested_scope", input.entry.requested_scope)),
    reason_codes: sortStrings(requireStringList("reason_codes", input.entry.reason_codes)),
    priority_tuple: canonicalNightlyPriorityTupleForSelectionBasis(input.entry.priority_tuple),
    prior_manifest_ref: input.entry.prior_manifest_ref,
    predecessor_selection_entry_ref_or_null: input.entry.predecessor_selection_entry_ref_or_null,
    next_checkpoint_at: input.entry.next_checkpoint_at,
    fairness_group_key: input.entry.fairness_group_key ?? null,
  });
}

export function deriveNightlyStableTieBreakKey(input: {
  client_id: string;
  period: string;
  requested_scope: readonly string[];
  selection_basis_hash: string;
}) {
  return stableJsonHash({
    client_id: requireString("client_id", input.client_id),
    period: requireString("period", input.period),
    requested_scope: sortStrings(requireStringList("requested_scope", input.requested_scope)),
    selection_basis_hash: requireString("selection_basis_hash", input.selection_basis_hash),
  }) as string;
}

export function deriveNightlySelectionUniverseHashFromCandidateHashes(
  candidateIdentityHashes: readonly string[],
) {
  return stableJsonHash({
    candidate_identity_hashes: sortStrings(
      requireStringList("candidate_identity_hashes", candidateIdentityHashes),
    ),
  }) as string;
}

export function deriveNightlySelectionUniverseHash(
  candidates: readonly NightlySelectionCandidateIdentityInput[],
) {
  return deriveNightlySelectionUniverseHashFromCandidateHashes(
    candidates.map((candidate) => deriveNightlySelectionCandidateIdentityHash(candidate)),
  );
}

export function deriveNightlyBatchRunId(input: {
  tenant_id: string;
  nightly_window_key: string;
  scheduler_dedupe_key: string;
  reclaimed_predecessor_batch_run_ref: string | null;
}) {
  const digest = stableJsonHash({
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    scheduler_dedupe_key: input.scheduler_dedupe_key,
    reclaimed_predecessor_batch_run_ref: input.reclaimed_predecessor_batch_run_ref,
  }) as string;
  return `nightly-batch.${digest.slice(0, 32)}`;
}

export function nightlySelectionDerivationTrace(value: unknown) {
  try {
    return canonicalJsonStringify(value);
  } catch {
    return JSON.stringify(value, null, 2);
  }
}
