import type {
  AuditEventRecord,
  AuditPayloadAvailabilityState,
  AuditRetainedContext,
} from "../../../audit/src/index.ts";
import type { ObservabilityCorrelationContext } from "./observability_correlation_context.ts";
import {
  normalizeObservabilityStringSet,
  ObservabilityContractError,
} from "./observability_correlation_context.ts";

export type AuditEvent = AuditEventRecord;
export type AuditEventRetainedContext = AuditRetainedContext;
export type AuditEventPayloadAvailabilityState = AuditPayloadAvailabilityState;

export const NIGHTLY_AUDIT_EVENT_TYPES = [
  "NightlyBatchAllocated",
  "NightlyPortfolioSelected",
  "NightlyClientExecutionDispatched",
  "NightlyClientExecutionDeferred",
  "NightlyClientExecutionSkipped",
  "NightlyClientExecutionEscalated",
  "NightlyBatchShardClaimed",
  "NightlyBatchShardReclaimed",
  "NightlyBatchQuiesced",
  "NightlyBatchCompleted",
  "NightlyBatchAbandoned",
  "OperatorMorningDigestPublished",
] as const;

export const REPLAY_AUDIT_EVENT_TYPES = [
  "ReplayPreflightValidated",
  "ReplayBasisCorruptionDetected",
  "FrozenPostSealBasisLoaded",
  "HistoricalAuthorityBasisReused",
  "HistoricalLateDataBasisReused",
  "ReplayOutcomeCompared",
  "ReplayAttested",
] as const;

function assertRetainedContext(event: AuditEvent) {
  const retained = event.retained_context;
  if (retained.payload_availability_state === "FULL") {
    if (
      retained.audit_sufficiency_state !== "SUFFICIENT" ||
      retained.payload_expiry_at_or_null !== null ||
      retained.limitation_reason_codes.length > 0
    ) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_FIELD_INVALID",
        "FULL audit retained_context must be sufficient, unexpired, and un-limited",
      );
    }
    return;
  }
  if (
    retained.audit_sufficiency_state !== "LIMITED" ||
    retained.payload_expiry_at_or_null === null ||
    event.reason_codes.length === 0 ||
    event.object_refs.length === 0 ||
    retained.lineage_refs.length === 0 ||
    retained.limitation_reason_codes.length === 0
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "post-expiry audit events must preserve reason, object, lineage, and limitation posture",
    );
  }
}

function assertAuditMirror(
  event: AuditEvent,
  context: ObservabilityCorrelationContext,
) {
  for (const field of ["tenant_id", "client_id", "manifest_id"] as const) {
    if (context[field] !== undefined && context[field] !== event[field]) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_FIELD_INVALID",
        `AuditEvent.${field} must mirror correlation_context.${field}`,
      );
    }
  }
}

export function assertAuditEventContract(event: AuditEvent) {
  if (event.actor_ref === null && event.service_ref === null) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "AuditEvent requires actor_ref or service_ref",
    );
  }
  normalizeObservabilityStringSet("AuditEvent.object_refs", event.object_refs);
  normalizeObservabilityStringSet("AuditEvent.reason_codes", event.reason_codes);
  assertRetainedContext(event);
  assertAuditMirror(event, event.correlation_context);
  if (event.stream_sequence === 0 && event.prev_event_hash !== null) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "root audit event must not carry prev_event_hash",
    );
  }
  if (event.stream_sequence > 0 && !event.prev_event_hash) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "non-root audit event must carry prev_event_hash",
    );
  }

  const context = event.correlation_context;
  if (event.event_type === "OutOfBandStateObserved" && !context.submission_record_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "OutOfBandStateObserved requires submission_record_id correlation",
    );
  }
  if (
    (NIGHTLY_AUDIT_EVENT_TYPES as readonly string[]).includes(event.event_type) &&
    (!context.nightly_batch_run_ref || !context.nightly_window_key)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "nightly audit events require nightly batch and window correlation",
    );
  }
  if (
    [
      "NightlyClientExecutionDispatched",
      "NightlyClientExecutionDeferred",
      "NightlyClientExecutionSkipped",
      "NightlyClientExecutionEscalated",
    ].includes(event.event_type) &&
    !context.selection_disposition
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "nightly client-disposition audit events require selection_disposition",
    );
  }
  if (
    (REPLAY_AUDIT_EVENT_TYPES as readonly string[]).includes(event.event_type) &&
    (!event.manifest_id ||
      !context.replay_of_manifest_id ||
      !context.replay_class ||
      !context.comparison_mode ||
      !context.basis_validation_state ||
      !context.expected_execution_basis_hash ||
      !context.actual_execution_basis_hash)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay audit events require replay lineage and execution-basis hashes",
    );
  }
  if (
    ["ReplayOutcomeCompared", "ReplayAttested"].includes(event.event_type) &&
    (!context.expected_deterministic_outcome_hash ||
      !context.actual_deterministic_outcome_hash)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay outcome audit events require deterministic outcome hashes",
    );
  }
  if (
    ["RemediationOpened", "RemediationCompleted"].includes(event.event_type) &&
    (!context.error_id || !context.task_id)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "remediation audit events require error_id and task_id correlation",
    );
  }
  if (
    ["CompensationApplied", "CompensationVerified"].includes(event.event_type) &&
    (!context.error_id || !context.compensation_id)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "compensation audit events require error_id and compensation_id correlation",
    );
  }
}
