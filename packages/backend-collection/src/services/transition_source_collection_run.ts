import {
  buildSourceCollectionRunStateTransitionContract,
  normalizeSourceCollectionRunRecord,
  type SourceCollectionRunAbandonedReasonCode,
  type SourceCollectionRunFailureReasonCode,
  type SourceCollectionRunLifecycleState,
  type SourceCollectionRunRecord,
  type SourceCollectionRunTransitionEventCode,
} from "../models/source_collection_run.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type SourceCollectionRunTransitionErrorCode =
  | "SOURCE_COLLECTION_RUN_ILLEGAL_TRANSITION"
  | "SOURCE_COLLECTION_RUN_TRANSITION_REASON_REQUIRED";

export class SourceCollectionRunTransitionError extends Error {
  readonly code: SourceCollectionRunTransitionErrorCode;

  constructor(code: SourceCollectionRunTransitionErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceCollectionRunTransitionError";
    this.code = code;
  }
}

const LEGAL_TRANSITIONS = new Map<
  string,
  {
    event_code: SourceCollectionRunTransitionEventCode;
    to: SourceCollectionRunLifecycleState;
  }
>([
  ["NOT_STARTED::fetch_begin", { event_code: "fetch_begin", to: "FETCHING" }],
  ["FETCHING::all_sources_returned", { event_code: "all_sources_returned", to: "FETCHED" }],
  [
    "FETCHING::some_sources_returned_with_gaps",
    { event_code: "some_sources_returned_with_gaps", to: "PARTIAL" },
  ],
  ["FETCHING::fatal_provider_failure", { event_code: "fatal_provider_failure", to: "FAILED" }],
  ["PARTIAL::operator_abort", { event_code: "operator_abort", to: "ABANDONED" }],
]);

function transitionKey(
  from: SourceCollectionRunLifecycleState,
  eventCode: SourceCollectionRunTransitionEventCode,
) {
  return `${from}::${eventCode}`;
}

function resolveTransition(input: {
  event_code: SourceCollectionRunTransitionEventCode;
  from: SourceCollectionRunLifecycleState;
}) {
  const transition = LEGAL_TRANSITIONS.get(transitionKey(input.from, input.event_code));
  if (!transition) {
    throw new SourceCollectionRunTransitionError(
      "SOURCE_COLLECTION_RUN_ILLEGAL_TRANSITION",
      `${input.from} cannot apply ${input.event_code}`,
    );
  }
  return transition.to;
}

export function transitionSourceCollectionRun(input: {
  abandoned_reason_code?: SourceCollectionRunAbandonedReasonCode;
  audit_refs?: readonly string[];
  event_code: Exclude<SourceCollectionRunTransitionEventCode, "collection_run_allocated">;
  failure_reason_code?: SourceCollectionRunFailureReasonCode;
  fetch_audit_refs?: readonly string[];
  partial_gap_refs?: readonly string[];
  run: SourceCollectionRunRecord;
  transitioned_at: string;
  transition_audit_ref: string;
}) {
  const run = normalizeSourceCollectionRunRecord(input.run);
  const transitionedAt = normalizeUtcInstantString(input.transitioned_at);
  const nextState = resolveTransition({
    event_code: input.event_code,
    from: run.lifecycle_state,
  });
  const fetchAuditRefs = normalizeCollectionStringSet(
    "source_collection_run.fetch_audit_refs",
    [...run.fetch_audit_refs, ...(input.fetch_audit_refs ?? [])],
  );
  const transitionAuditRefs = normalizeCollectionStringSet(
    "source_collection_run.audit_refs",
    [input.transition_audit_ref, ...run.audit_refs, ...(input.audit_refs ?? [])],
    { minItems: 1 },
  );

  let nextRun: SourceCollectionRunRecord = {
    ...run,
    audit_refs: transitionAuditRefs,
    fetch_audit_refs: fetchAuditRefs,
    lifecycle_state: nextState,
    state_changed_at: transitionedAt,
    state_transition_contract: buildSourceCollectionRunStateTransitionContract({
      current_state: nextState,
      previous_state_or_null: run.lifecycle_state,
      transition_applied_at: transitionedAt,
      transition_audit_ref: input.transition_audit_ref,
      transition_event_code: input.event_code,
    }),
  };

  switch (input.event_code) {
    case "fetch_begin":
      nextRun = {
        ...nextRun,
        abandoned_reason_code_or_null: null,
        completed_at_or_null: null,
        failure_reason_code_or_null: null,
        partial_gap_refs: [],
        started_at_or_null: transitionedAt,
      };
      break;
    case "all_sources_returned":
      nextRun = {
        ...nextRun,
        abandoned_reason_code_or_null: null,
        completed_at_or_null: transitionedAt,
        failure_reason_code_or_null: null,
        partial_gap_refs: [],
        started_at_or_null: run.started_at_or_null,
      };
      break;
    case "some_sources_returned_with_gaps":
      nextRun = {
        ...nextRun,
        abandoned_reason_code_or_null: null,
        completed_at_or_null: transitionedAt,
        failure_reason_code_or_null: null,
        partial_gap_refs: normalizeCollectionStringSet(
          "source_collection_run.partial_gap_refs",
          [...run.partial_gap_refs, ...(input.partial_gap_refs ?? [])],
          { minItems: 1 },
        ),
        started_at_or_null: run.started_at_or_null,
      };
      break;
    case "fatal_provider_failure":
      if (!input.failure_reason_code) {
        throw new SourceCollectionRunTransitionError(
          "SOURCE_COLLECTION_RUN_TRANSITION_REASON_REQUIRED",
          "fatal_provider_failure requires a failure reason code",
        );
      }
      nextRun = {
        ...nextRun,
        abandoned_reason_code_or_null: null,
        completed_at_or_null: transitionedAt,
        failure_reason_code_or_null: input.failure_reason_code,
        partial_gap_refs: [],
        started_at_or_null: run.started_at_or_null,
      };
      break;
    case "operator_abort":
      if (!input.abandoned_reason_code) {
        throw new SourceCollectionRunTransitionError(
          "SOURCE_COLLECTION_RUN_TRANSITION_REASON_REQUIRED",
          "operator_abort requires an abandonment reason code",
        );
      }
      nextRun = {
        ...nextRun,
        abandoned_reason_code_or_null: input.abandoned_reason_code,
        completed_at_or_null: transitionedAt,
        failure_reason_code_or_null: null,
        partial_gap_refs: run.partial_gap_refs,
        started_at_or_null: run.started_at_or_null,
      };
      break;
  }

  return normalizeSourceCollectionRunRecord(nextRun);
}
