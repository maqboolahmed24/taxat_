import {
  cloneComputeResultRecord,
  normalizeComputeResultRecord,
  withRefreshedComputeResultContract,
  type ComputeResultLifecycleState,
  type ComputeResultRecord,
  type ComputeResultTotals,
} from "../models/compute_result.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type ComputeResultTransitionEventCode =
  | "compute_start"
  | "compute_success"
  | "data_or_policy_block"
  | "newer_manifest_compute";

export type ComputeResultTransitionRecord = {
  compute_id: string;
  compute_result_row_version: number;
  event_code: ComputeResultTransitionEventCode;
  from_lifecycle_state: ComputeResultLifecycleState | null;
  to_lifecycle_state: ComputeResultLifecycleState;
  transition_audit_ref: string;
  transition_id: string;
  transitioned_at: string;
};

export class ComputeResultTransitionError extends Error {
  readonly code: "COMPUTE_RESULT_ILLEGAL_TRANSITION" | "COMPUTE_RESULT_TRANSITION_DATA_REQUIRED";

  constructor(code: ComputeResultTransitionError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ComputeResultTransitionError";
    this.code = code;
  }
}

const LEGAL_TRANSITIONS = new Map<string, ComputeResultLifecycleState>([
  ["NOT_RUN::compute_start", "RUNNING"],
  ["RUNNING::compute_success", "COMPUTED"],
  ["RUNNING::data_or_policy_block", "BLOCKED"],
  ["COMPUTED::newer_manifest_compute", "SUPERSEDED"],
]);

export function stableComputeTransitionId(input: {
  compute_id: string;
  event_code: ComputeResultTransitionEventCode;
  row_version: number;
  transitioned_at: string;
}) {
  return [
    "compute-result-transition",
    input.compute_id,
    input.row_version,
    input.event_code,
    input.transitioned_at,
  ].join(".");
}

function resolveTransition(
  from: ComputeResultLifecycleState,
  eventCode: ComputeResultTransitionEventCode,
) {
  const next = LEGAL_TRANSITIONS.get(`${from}::${eventCode}`);
  if (!next) {
    throw new ComputeResultTransitionError(
      "COMPUTE_RESULT_ILLEGAL_TRANSITION",
      `${from} cannot apply ${eventCode}`,
    );
  }
  return next;
}

export function transitionComputeResult(input: {
  compute_result: ComputeResultRecord;
  diagnostic_artifact_refs?: readonly string[];
  diagnostic_reason_codes?: readonly string[];
  event_code: ComputeResultTransitionEventCode;
  schema_bundle_hash?: string;
  totals?: ComputeResultTotals;
  transitioned_at: string;
  transition_audit_ref: string;
  writer_build_id?: string;
}) {
  const current = normalizeComputeResultRecord(input.compute_result);
  const transitionedAt = normalizeUtcInstantString(input.transitioned_at);
  const nextState = resolveTransition(current.lifecycle_state, input.event_code);
  const { contract: _contract, ...withoutContract } = cloneComputeResultRecord(current);
  let next: Omit<ComputeResultRecord, "contract"> = {
    ...withoutContract,
    lifecycle_state: nextState,
  };

  if (input.event_code === "compute_start") {
    next = {
      ...next,
      computed_at: null,
      diagnostic_artifact_refs: [],
      diagnostic_reason_codes: [],
      totals: {},
    };
  }
  if (input.event_code === "compute_success") {
    if (input.totals === undefined || Object.keys(input.totals).length === 0) {
      throw new ComputeResultTransitionError(
        "COMPUTE_RESULT_TRANSITION_DATA_REQUIRED",
        "compute_success requires computed totals",
      );
    }
    next = {
      ...next,
      computed_at: transitionedAt,
      diagnostic_artifact_refs: [...(input.diagnostic_artifact_refs ?? [])],
      diagnostic_reason_codes: [...(input.diagnostic_reason_codes ?? [])],
      totals: input.totals,
    };
  }
  if (input.event_code === "data_or_policy_block") {
    if (
      input.diagnostic_reason_codes === undefined ||
      input.diagnostic_artifact_refs === undefined ||
      input.diagnostic_reason_codes.length === 0 ||
      input.diagnostic_artifact_refs.length === 0
    ) {
      throw new ComputeResultTransitionError(
        "COMPUTE_RESULT_TRANSITION_DATA_REQUIRED",
        "data_or_policy_block requires diagnostic reason codes and artifact refs",
      );
    }
    next = {
      ...next,
      computed_at: null,
      diagnostic_artifact_refs: [...input.diagnostic_artifact_refs],
      diagnostic_reason_codes: [...input.diagnostic_reason_codes],
      totals: {},
    };
  }

  return withRefreshedComputeResultContract({
    compute_result: next,
    schema_bundle_hash: input.schema_bundle_hash ?? current.contract.schema_bundle_hash,
    writer_build_id: input.writer_build_id ?? current.contract.writer_build_id,
  });
}
