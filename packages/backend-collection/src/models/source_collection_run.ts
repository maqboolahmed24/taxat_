import type { SourceCollectionRun as GeneratedSourceCollectionRun } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { StateTransitionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString, parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";
import {
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";

export type SourceCollectionRunLifecycleState =
  | "NOT_STARTED"
  | "FETCHING"
  | "FETCHED"
  | "PARTIAL"
  | "FAILED"
  | "ABANDONED";

export type SourceCollectionRunTransitionEventCode =
  | "collection_run_allocated"
  | "fetch_begin"
  | "all_sources_returned"
  | "some_sources_returned_with_gaps"
  | "fatal_provider_failure"
  | "operator_abort";

export const SOURCE_COLLECTION_RUN_FAILURE_REASON_CODES = [
  "FATAL_PROVIDER_FAILURE",
  "DISPATCH_FATAL_FAILURE",
  "FETCH_ROLLUP_FATAL",
  "NO_FETCH_RESULTS",
  "READ_CUTOFF_VIOLATED",
  "SYSTEM_FAULT",
] as const;

export const SOURCE_COLLECTION_RUN_ABANDONED_REASON_CODES = [
  "OPERATOR_ABORT",
  "SUPERSEDED_BY_MANIFEST",
  "STALE_COLLECTION_RUN",
  "MANUAL_CHECKPOINT_REQUIRED",
] as const;

export type SourceCollectionRunFailureReasonCode =
  (typeof SOURCE_COLLECTION_RUN_FAILURE_REASON_CODES)[number];
export type SourceCollectionRunAbandonedReasonCode =
  (typeof SOURCE_COLLECTION_RUN_ABANDONED_REASON_CODES)[number];

export type SourceCollectionRunStateTransitionContract = StateTransitionContract & {
  object_family: "SOURCE_COLLECTION_RUN";
  machine_code: "SOURCE_COLLECTION_RUN_LIFECYCLE_V1";
  state_field_name: "lifecycle_state";
};

export type SourceCollectionRunRecord = Omit<
  GeneratedSourceCollectionRun,
  | "abandoned_reason_code_or_null"
  | "completed_at_or_null"
  | "failure_reason_code_or_null"
  | "lifecycle_state"
  | "started_at_or_null"
  | "state_transition_contract"
> & {
  abandoned_reason_code_or_null: SourceCollectionRunAbandonedReasonCode | null;
  completed_at_or_null: string | null;
  failure_reason_code_or_null: SourceCollectionRunFailureReasonCode | null;
  lifecycle_state: SourceCollectionRunLifecycleState;
  started_at_or_null: string | null;
  state_transition_contract: SourceCollectionRunStateTransitionContract;
};

export type SourceCollectionRunModelErrorCode =
  | "SOURCE_COLLECTION_RUN_ARTIFACT_TYPE_INVALID"
  | "SOURCE_COLLECTION_RUN_REASON_CODE_INVALID"
  | "SOURCE_COLLECTION_RUN_STATE_CONTRACT_INVALID"
  | "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID"
  | "SOURCE_COLLECTION_RUN_TIMESTAMP_ORDER_INVALID";

export class SourceCollectionRunModelError extends Error {
  readonly code: SourceCollectionRunModelErrorCode;

  constructor(code: SourceCollectionRunModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceCollectionRunModelError";
    this.code = code;
  }
}

export const SOURCE_COLLECTION_RUN_MACHINE_CODE = "SOURCE_COLLECTION_RUN_LIFECYCLE_V1";
export const SOURCE_COLLECTION_RUN_OBJECT_FAMILY = "SOURCE_COLLECTION_RUN";
export const SOURCE_COLLECTION_RUN_STATE_FIELD = "lifecycle_state";

const SOURCE_COLLECTION_RUN_LIFECYCLE_STATES = new Set<SourceCollectionRunLifecycleState>([
  "NOT_STARTED",
  "FETCHING",
  "FETCHED",
  "PARTIAL",
  "FAILED",
  "ABANDONED",
]);

const SOURCE_COLLECTION_RUN_FAILURE_REASONS = new Set<string>(
  SOURCE_COLLECTION_RUN_FAILURE_REASON_CODES,
);
const SOURCE_COLLECTION_RUN_ABANDONED_REASONS = new Set<string>(
  SOURCE_COLLECTION_RUN_ABANDONED_REASON_CODES,
);

function normalizeLifecycleState(value: unknown): SourceCollectionRunLifecycleState {
  const normalized = normalizeCollectionString("source_collection_run.lifecycle_state", value);
  if (!SOURCE_COLLECTION_RUN_LIFECYCLE_STATES.has(normalized as SourceCollectionRunLifecycleState)) {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
      `unsupported lifecycle_state ${normalized}`,
    );
  }
  return normalized as SourceCollectionRunLifecycleState;
}

function normalizeOptionalInstant(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  return normalizeUtcInstantString(value);
}

function normalizeFailureReason(value: unknown): SourceCollectionRunFailureReasonCode | null {
  if (value === null) {
    return null;
  }
  const normalized = normalizeCollectionString(
    "source_collection_run.failure_reason_code_or_null",
    value,
  );
  if (!SOURCE_COLLECTION_RUN_FAILURE_REASONS.has(normalized)) {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_REASON_CODE_INVALID",
      `unsupported failure reason ${normalized}`,
    );
  }
  return normalized as SourceCollectionRunFailureReasonCode;
}

function normalizeAbandonedReason(value: unknown): SourceCollectionRunAbandonedReasonCode | null {
  if (value === null) {
    return null;
  }
  const normalized = normalizeCollectionString(
    "source_collection_run.abandoned_reason_code_or_null",
    value,
  );
  if (!SOURCE_COLLECTION_RUN_ABANDONED_REASONS.has(normalized)) {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_REASON_CODE_INVALID",
      `unsupported abandonment reason ${normalized}`,
    );
  }
  return normalized as SourceCollectionRunAbandonedReasonCode;
}

function assertTimeline(input: {
  completed_at_or_null: string | null;
  started_at_or_null: string | null;
}) {
  if (!input.started_at_or_null || !input.completed_at_or_null) {
    return;
  }
  if (
    parseUtcInstant(input.completed_at_or_null).valueOf() <
    parseUtcInstant(input.started_at_or_null).valueOf()
  ) {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_TIMESTAMP_ORDER_INVALID",
      "completed_at_or_null must be at or after started_at_or_null",
    );
  }
}

function assertStateShape(record: SourceCollectionRunRecord) {
  switch (record.lifecycle_state) {
    case "NOT_STARTED":
      if (
        record.started_at_or_null !== null ||
        record.completed_at_or_null !== null ||
        record.partial_gap_refs.length !== 0 ||
        record.failure_reason_code_or_null !== null ||
        record.abandoned_reason_code_or_null !== null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "NOT_STARTED requires null timestamps and no gap or reason refs",
        );
      }
      return;
    case "FETCHING":
      if (
        record.started_at_or_null === null ||
        record.completed_at_or_null !== null ||
        record.partial_gap_refs.length !== 0 ||
        record.failure_reason_code_or_null !== null ||
        record.abandoned_reason_code_or_null !== null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "FETCHING requires started_at_or_null and no completion, gaps, or reasons",
        );
      }
      return;
    case "FETCHED":
      if (
        record.started_at_or_null === null ||
        record.completed_at_or_null === null ||
        record.partial_gap_refs.length !== 0 ||
        record.failure_reason_code_or_null !== null ||
        record.abandoned_reason_code_or_null !== null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "FETCHED requires start/completion timestamps and no gaps or reasons",
        );
      }
      return;
    case "PARTIAL":
      if (
        record.started_at_or_null === null ||
        record.completed_at_or_null === null ||
        record.partial_gap_refs.length === 0 ||
        record.failure_reason_code_or_null !== null ||
        record.abandoned_reason_code_or_null !== null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "PARTIAL requires start/completion timestamps, at least one gap ref, and no reasons",
        );
      }
      return;
    case "FAILED":
      if (
        record.started_at_or_null === null ||
        record.completed_at_or_null === null ||
        record.failure_reason_code_or_null === null ||
        record.abandoned_reason_code_or_null !== null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "FAILED requires start/completion timestamps, a failure reason, and no abandonment reason",
        );
      }
      return;
    case "ABANDONED":
      if (
        record.started_at_or_null === null ||
        record.completed_at_or_null === null ||
        record.failure_reason_code_or_null !== null ||
        record.abandoned_reason_code_or_null === null
      ) {
        throw new SourceCollectionRunModelError(
          "SOURCE_COLLECTION_RUN_STATE_SHAPE_INVALID",
          "ABANDONED requires start/completion timestamps, an abandonment reason, and no failure reason",
        );
      }
      return;
  }
}

function normalizeStateTransitionContract(
  contract: SourceCollectionRunRecord["state_transition_contract"],
  lifecycleState: SourceCollectionRunLifecycleState,
): SourceCollectionRunStateTransitionContract {
  if (
    contract.contract_version !== "STATE_TRANSITION_CONTRACT_V1" ||
    contract.object_family !== SOURCE_COLLECTION_RUN_OBJECT_FAMILY ||
    contract.machine_code !== SOURCE_COLLECTION_RUN_MACHINE_CODE ||
    contract.state_field_name !== SOURCE_COLLECTION_RUN_STATE_FIELD ||
    contract.current_state !== lifecycleState
  ) {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_STATE_CONTRACT_INVALID",
      "state_transition_contract must mirror the SourceCollectionRun lifecycle state machine",
    );
  }

  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: SOURCE_COLLECTION_RUN_OBJECT_FAMILY,
    machine_code: SOURCE_COLLECTION_RUN_MACHINE_CODE,
    state_field_name: SOURCE_COLLECTION_RUN_STATE_FIELD,
    current_state: lifecycleState,
    previous_state_or_null:
      contract.previous_state_or_null === null
        ? null
        : normalizeCollectionString(
            "source_collection_run.previous_state_or_null",
            contract.previous_state_or_null,
          ),
    transition_event_code: normalizeCollectionString(
      "source_collection_run.transition_event_code",
      contract.transition_event_code,
    ),
    transition_applied_at: normalizeUtcInstantString(contract.transition_applied_at),
    transition_audit_ref: normalizeCollectionString(
      "source_collection_run.transition_audit_ref",
      contract.transition_audit_ref,
    ),
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

export function sourceCollectionRunRef(run: Pick<SourceCollectionRunRecord, "collection_run_id">) {
  return `source-collection-run://${run.collection_run_id}`;
}

export function buildSourceCollectionRunStateTransitionContract(input: {
  current_state: SourceCollectionRunLifecycleState;
  previous_state_or_null: SourceCollectionRunLifecycleState | null;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: SourceCollectionRunTransitionEventCode;
}): SourceCollectionRunStateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: SOURCE_COLLECTION_RUN_OBJECT_FAMILY,
    machine_code: SOURCE_COLLECTION_RUN_MACHINE_CODE,
    state_field_name: SOURCE_COLLECTION_RUN_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: normalizeCollectionString(
      "source_collection_run.transition_audit_ref",
      input.transition_audit_ref,
    ),
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

export function normalizeSourceCollectionRunRecord(
  input: SourceCollectionRunRecord,
): SourceCollectionRunRecord {
  if (input.artifact_type !== "SourceCollectionRun") {
    throw new SourceCollectionRunModelError(
      "SOURCE_COLLECTION_RUN_ARTIFACT_TYPE_INVALID",
      "source collection runs must carry artifact_type SourceCollectionRun",
    );
  }

  const lifecycleState = normalizeLifecycleState(input.lifecycle_state);
  const normalized: SourceCollectionRunRecord = {
    artifact_type: "SourceCollectionRun",
    collection_run_id: normalizeCollectionString(
      "source_collection_run.collection_run_id",
      input.collection_run_id,
    ),
    manifest_id: normalizeCollectionString("source_collection_run.manifest_id", input.manifest_id),
    lifecycle_state: lifecycleState,
    state_transition_contract: normalizeStateTransitionContract(
      input.state_transition_contract,
      lifecycleState,
    ),
    source_window_ref: normalizeCollectionString(
      "source_collection_run.source_window_ref",
      input.source_window_ref,
    ),
    fetch_audit_refs: normalizeCollectionStringSet(
      "source_collection_run.fetch_audit_refs",
      input.fetch_audit_refs,
    ),
    partial_gap_refs: normalizeCollectionStringSet(
      "source_collection_run.partial_gap_refs",
      input.partial_gap_refs,
    ),
    failure_reason_code_or_null: normalizeFailureReason(input.failure_reason_code_or_null),
    abandoned_reason_code_or_null: normalizeAbandonedReason(input.abandoned_reason_code_or_null),
    started_at_or_null: normalizeOptionalInstant(
      "source_collection_run.started_at_or_null",
      input.started_at_or_null,
    ),
    completed_at_or_null: normalizeOptionalInstant(
      "source_collection_run.completed_at_or_null",
      input.completed_at_or_null,
    ),
    state_changed_at: normalizeUtcInstantString(input.state_changed_at),
    audit_refs: normalizeCollectionStringSet(
      "source_collection_run.audit_refs",
      input.audit_refs,
      { minItems: 1 },
    ),
    provenance_refs: normalizeCollectionStringSet(
      "source_collection_run.provenance_refs",
      input.provenance_refs,
    ),
  };

  assertTimeline(normalized);
  assertStateShape(normalized);
  return normalized;
}

export function cloneSourceCollectionRunRecord(record: SourceCollectionRunRecord) {
  return structuredClone(record);
}
