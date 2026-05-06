import type { CanaryHealthSummary } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityExpectedMirrors,
} from "./release_candidate_identity_contract.ts";

export type CanaryHealthSummaryRecord = CanaryHealthSummary;
export type CanaryBudgetState = CanaryHealthSummaryRecord["latency_budget_state"];
export type CanaryHealthGateState = CanaryHealthSummaryRecord["health_gate_state"];

export type CanaryHealthSummaryDraft = {
  canary_summary_id: unknown;
  candidate_environment_ref: unknown;
  build_artifact_ref: unknown;
  artifact_digest: unknown;
  candidate_identity_hash: unknown;
  candidate_identity_contract: unknown;
  canary_fraction: unknown;
  slo_profile_ref: unknown;
  error_budget_profile_ref: unknown;
  latency_budget_state: unknown;
  error_budget_state: unknown;
  health_gate_state: unknown;
  abort_recommended: unknown;
  summary_ref: unknown;
  evaluated_at: unknown;
};

export type CanaryHealthSummaryPosture = {
  health_gate_state: CanaryHealthGateState;
  abort_recommended: boolean;
};

export type CanaryHealthSummaryModelErrorCode =
  | "CANARY_HEALTH_FIELD_INVALID"
  | "CANARY_HEALTH_BUDGET_STATE_INVALID"
  | "CANARY_HEALTH_POSTURE_INVALID"
  | "CANARY_HEALTH_CANDIDATE_MISMATCH";

export class CanaryHealthSummaryModelError extends Error {
  readonly code: CanaryHealthSummaryModelErrorCode;

  constructor(code: CanaryHealthSummaryModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CanaryHealthSummaryModelError";
    this.code = code;
  }
}

function assertCanarySummary(
  condition: unknown,
  code: CanaryHealthSummaryModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new CanaryHealthSummaryModelError(code, detail);
  }
}

function requireTrimmedString(label: string, value: unknown) {
  assertCanarySummary(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "CANARY_HEALTH_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireCanaryFraction(value: unknown) {
  assertCanarySummary(
    typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1,
    "CANARY_HEALTH_FIELD_INVALID",
    "canary_fraction must be a finite number greater than 0 and less than 1",
  );
  return value;
}

function requireBudgetState(label: string, value: unknown): CanaryBudgetState {
  assertCanarySummary(
    value === "WITHIN_BUDGET" || value === "BREACHED",
    "CANARY_HEALTH_BUDGET_STATE_INVALID",
    `${label} must be WITHIN_BUDGET or BREACHED`,
  );
  return value;
}

function requireHealthGateState(value: unknown): CanaryHealthGateState {
  assertCanarySummary(
    value === "GREEN" || value === "AMBER" || value === "RED",
    "CANARY_HEALTH_POSTURE_INVALID",
    "health_gate_state must be GREEN, AMBER, or RED",
  );
  return value;
}

function requireBoolean(label: string, value: unknown) {
  assertCanarySummary(
    typeof value === "boolean",
    "CANARY_HEALTH_POSTURE_INVALID",
    `${label} must be a boolean`,
  );
  return value;
}

export function deriveCanaryHealthPosture(input: {
  latency_budget_state: CanaryBudgetState;
  error_budget_state: CanaryBudgetState;
  abort_recommended?: boolean;
}): CanaryHealthSummaryPosture {
  const breachedBudgetCount = [
    input.latency_budget_state,
    input.error_budget_state,
  ].filter((state) => state === "BREACHED").length;

  if (breachedBudgetCount === 0) {
    assertCanarySummary(
      input.abort_recommended !== true,
      "CANARY_HEALTH_POSTURE_INVALID",
      "abort_recommended cannot be true while both budgets remain within budget",
    );
    return {
      health_gate_state: "GREEN",
      abort_recommended: false,
    };
  }

  if (breachedBudgetCount === 2) {
    return {
      health_gate_state: "RED",
      abort_recommended: true,
    };
  }

  if (input.abort_recommended === true) {
    return {
      health_gate_state: "RED",
      abort_recommended: true,
    };
  }

  return {
    health_gate_state: "AMBER",
    abort_recommended: false,
  };
}

export function normalizeCanaryHealthSummaryRecord(
  input: CanaryHealthSummaryDraft,
): CanaryHealthSummaryRecord {
  const candidateEnvironmentRef = requireTrimmedString(
    "candidate_environment_ref",
    input.candidate_environment_ref,
  );
  const buildArtifactRef = requireTrimmedString(
    "build_artifact_ref",
    input.build_artifact_ref,
  );
  const artifactDigest = requireTrimmedString("artifact_digest", input.artifact_digest);
  const candidateIdentityHash = requireTrimmedString(
    "candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const expectedCandidateMirrors: ReleaseCandidateIdentityExpectedMirrors = {
    artifact_digest: artifactDigest,
    build_artifact_ref: buildArtifactRef,
    candidate_environment_ref: candidateEnvironmentRef,
    candidate_identity_hash: candidateIdentityHash,
  };
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
    expectedCandidateMirrors,
  );
  const latencyBudgetState = requireBudgetState(
    "latency_budget_state",
    input.latency_budget_state,
  );
  const errorBudgetState = requireBudgetState(
    "error_budget_state",
    input.error_budget_state,
  );
  const healthGateState = requireHealthGateState(input.health_gate_state);
  const abortRecommended = requireBoolean(
    "abort_recommended",
    input.abort_recommended,
  );
  const derivedPosture = deriveCanaryHealthPosture({
    latency_budget_state: latencyBudgetState,
    error_budget_state: errorBudgetState,
    abort_recommended: abortRecommended,
  });

  assertCanarySummary(
    healthGateState === derivedPosture.health_gate_state &&
      abortRecommended === derivedPosture.abort_recommended,
    "CANARY_HEALTH_POSTURE_INVALID",
    "health_gate_state and abort_recommended must mirror the canonical latency/error budget posture",
  );

  return {
    canary_summary_id: requireTrimmedString(
      "canary_summary_id",
      input.canary_summary_id,
    ),
    candidate_environment_ref: candidateEnvironmentRef,
    build_artifact_ref: buildArtifactRef,
    artifact_digest: artifactDigest,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    canary_fraction: requireCanaryFraction(input.canary_fraction),
    slo_profile_ref: requireTrimmedString("slo_profile_ref", input.slo_profile_ref),
    error_budget_profile_ref: requireTrimmedString(
      "error_budget_profile_ref",
      input.error_budget_profile_ref,
    ),
    latency_budget_state: latencyBudgetState,
    error_budget_state: errorBudgetState,
    health_gate_state: healthGateState,
    abort_recommended: abortRecommended,
    summary_ref: requireTrimmedString("summary_ref", input.summary_ref),
    evaluated_at: normalizeUtcInstantString(input.evaluated_at),
  };
}

export function buildCanaryHealthSummary(input: {
  canary_summary_id: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  canary_fraction: unknown;
  slo_profile_ref: unknown;
  error_budget_profile_ref: unknown;
  latency_budget_state: unknown;
  error_budget_state: unknown;
  summary_ref: unknown;
  evaluated_at: unknown;
  abort_recommended?: boolean;
}) {
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  const latencyBudgetState = requireBudgetState(
    "latency_budget_state",
    input.latency_budget_state,
  );
  const errorBudgetState = requireBudgetState(
    "error_budget_state",
    input.error_budget_state,
  );
  const posture = deriveCanaryHealthPosture({
    latency_budget_state: latencyBudgetState,
    error_budget_state: errorBudgetState,
    abort_recommended: input.abort_recommended,
  });

  return normalizeCanaryHealthSummaryRecord({
    canary_summary_id: input.canary_summary_id,
    candidate_environment_ref: candidateIdentityContract.candidate_environment_ref,
    build_artifact_ref: candidateIdentityContract.build_artifact_ref,
    artifact_digest: candidateIdentityContract.artifact_digest,
    candidate_identity_hash: candidateIdentityContract.candidate_identity_hash,
    candidate_identity_contract: candidateIdentityContract,
    canary_fraction: input.canary_fraction,
    slo_profile_ref: input.slo_profile_ref,
    error_budget_profile_ref: input.error_budget_profile_ref,
    latency_budget_state: latencyBudgetState,
    error_budget_state: errorBudgetState,
    health_gate_state: posture.health_gate_state,
    abort_recommended: posture.abort_recommended,
    summary_ref: input.summary_ref,
    evaluated_at: input.evaluated_at,
  });
}

export function assertCanaryHealthSummaryRecord(record: CanaryHealthSummaryRecord) {
  return normalizeCanaryHealthSummaryRecord(record);
}

export function cloneCanaryHealthSummaryRecord(record: CanaryHealthSummaryRecord) {
  return structuredClone(record);
}
