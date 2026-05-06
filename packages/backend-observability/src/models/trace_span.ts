import type { TelemetryResourceAttributeMap } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import type { ObservabilityCorrelationContext } from "./observability_correlation_context.ts";
import {
  assertNonEmptyObservabilityString,
  normalizeAttributeMap,
  ObservabilityContractError,
} from "./observability_correlation_context.ts";

export const TRACE_SPAN_CODES = [
  "RUN_ROOT",
  "PRIOR_MANIFEST_CONTEXT_LOAD",
  "REUSE_CONTINUATION_DECISION",
  "CONFIG_RESOLVE_OR_INHERITANCE_DECISION",
  "EXISTING_DECISION_BUNDLE_RELOAD",
  "MANIFEST_FREEZE",
  "MANIFEST_START_CLAIM",
  "SOURCE_COLLECTION",
  "SNAPSHOT_BUILD",
  "COMPUTE",
  "PARITY",
  "TRUST",
  "GRAPH_BUILD",
  "FILING_PACKET_BUILD",
  "AUTHORITY_REQUEST_BUILD",
  "AUTHORITY_TRANSMIT",
  "AUTHORITY_RECONCILE",
  "DRIFT_DETECT",
  "AMENDMENT_EVALUATE",
  "RETENTION_APPLY",
  "ERASURE_EXECUTE",
  "OTHER",
] as const;

export type TraceSpanCode = (typeof TRACE_SPAN_CODES)[number];
export type TraceSpanStatusCode = "UNSET" | "OK" | "ERROR";
export type TraceSpanSamplingClass =
  | "MANDATORY_FORENSIC"
  | "DETERMINISTIC_RETAIN"
  | "SAMPLED_OPERATIONAL";

export type TraceSpan = {
  artifact_type: "TraceSpan";
  correlation_context: ObservabilityCorrelationContext;
  ended_at: string | null;
  manifest_id: string;
  parent_span_id: string | null;
  resource_ref: string;
  retention_class: string;
  sampling_class: TraceSpanSamplingClass;
  span_attributes: TelemetryResourceAttributeMap;
  span_code: TraceSpanCode;
  span_id: string;
  span_scope_class: "MANIFEST_RUNTIME";
  started_at: string;
  status_code: TraceSpanStatusCode;
  trace_id: string;
};

const MANDATORY_FORENSIC_SPAN_CODES = new Set<TraceSpanCode>([
  "FILING_PACKET_BUILD",
  "AUTHORITY_REQUEST_BUILD",
  "AUTHORITY_TRANSMIT",
  "AUTHORITY_RECONCILE",
  "DRIFT_DETECT",
  "AMENDMENT_EVALUATE",
  "RETENTION_APPLY",
  "ERASURE_EXECUTE",
]);

const DETERMINISTIC_RETAIN_SPAN_CODES = new Set<TraceSpanCode>([
  "RUN_ROOT",
  "PRIOR_MANIFEST_CONTEXT_LOAD",
  "REUSE_CONTINUATION_DECISION",
  "CONFIG_RESOLVE_OR_INHERITANCE_DECISION",
  "EXISTING_DECISION_BUNDLE_RELOAD",
  "MANIFEST_FREEZE",
  "MANIFEST_START_CLAIM",
]);

export function samplingClassForSpanCode(spanCode: TraceSpanCode): TraceSpanSamplingClass {
  if (MANDATORY_FORENSIC_SPAN_CODES.has(spanCode)) {
    return "MANDATORY_FORENSIC";
  }
  if (DETERMINISTIC_RETAIN_SPAN_CODES.has(spanCode)) {
    return "DETERMINISTIC_RETAIN";
  }
  return "SAMPLED_OPERATIONAL";
}

export function retentionClassForSpanCode(_spanCode: TraceSpanCode) {
  return "retention.telemetry.trace_hot_14d";
}

export function assertTraceSpanContract(span: TraceSpan) {
  if (!TRACE_SPAN_CODES.includes(span.span_code)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "span_code is outside the frozen TraceSpan vocabulary",
    );
  }
  assertNonEmptyObservabilityString("TraceSpan.trace_id", span.trace_id);
  assertNonEmptyObservabilityString("TraceSpan.span_id", span.span_id);
  assertNonEmptyObservabilityString("TraceSpan.manifest_id", span.manifest_id);
  if (span.correlation_context.trace_id !== span.trace_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "TraceSpan.trace_id must mirror correlation_context.trace_id",
    );
  }
  if (span.correlation_context.span_id !== span.span_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "TraceSpan.span_id must mirror correlation_context.span_id",
    );
  }
  if (span.correlation_context.manifest_id !== span.manifest_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "TraceSpan.manifest_id must mirror correlation_context.manifest_id",
    );
  }
  if (span.span_code === "RUN_ROOT" && span.parent_span_id !== null) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "RUN_ROOT spans must not carry parent_span_id",
    );
  }
  if (span.span_code !== "RUN_ROOT" && !span.parent_span_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "child spans must carry parent_span_id",
    );
  }
  if (span.ended_at === null && span.status_code !== "UNSET") {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "open spans must keep status_code UNSET",
    );
  }
  if (span.ended_at !== null && span.status_code === "UNSET") {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "closed spans must carry OK or ERROR status",
    );
  }
  if (span.ended_at !== null && Date.parse(span.ended_at) < Date.parse(span.started_at)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "TraceSpan.ended_at must not be earlier than started_at",
    );
  }
  if (span.status_code === "ERROR") {
    if (!span.correlation_context.error_id) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
        "error spans require correlation_context.error_id",
      );
    }
    if (!span.span_attributes.failure_class || !span.span_attributes.failure_phase) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
        "error spans require failure_class and failure_phase attributes",
      );
    }
  }
  if (
    span.span_code === "RUN_ROOT" &&
    span.correlation_context.run_kind === "NIGHTLY" &&
    (!span.correlation_context.nightly_batch_run_ref ||
      !span.correlation_context.nightly_window_key)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "nightly RUN_ROOT spans require nightly batch and window keys",
    );
  }
  if (
    span.span_code === "RUN_ROOT" &&
    span.correlation_context.run_kind === "REPLAY" &&
    !span.correlation_context.replay_class
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay RUN_ROOT spans require replay_class",
    );
  }
  if (
    span.span_code === "CONFIG_RESOLVE_OR_INHERITANCE_DECISION" &&
    span.correlation_context.manifest_branch_decision?.branch_action &&
    ["RETURN_EXISTING_BUNDLE", "REUSE_SEALED_MANIFEST"].includes(
      span.correlation_context.manifest_branch_decision.branch_action,
    )
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "CONFIG_RESOLVE_OR_INHERITANCE_DECISION cannot masquerade as bundle-return reuse",
    );
  }
  if (
    span.span_code === "MANIFEST_START_CLAIM" &&
    span.correlation_context.manifest_branch_decision?.branch_action ===
      "RETURN_EXISTING_BUNDLE"
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "MANIFEST_START_CLAIM cannot emit for bundle-return paths",
    );
  }
  if (
    span.span_code === "MANIFEST_START_CLAIM" &&
    span.correlation_context.manifest_start_claim?.claim_state === "UNCLAIMED_SEALED"
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_START_CLAIM_MIRROR_DRIFT",
      "MANIFEST_START_CLAIM must preserve post-claim posture",
    );
  }
  normalizeAttributeMap("TraceSpan.span_attributes", span.span_attributes);
}
