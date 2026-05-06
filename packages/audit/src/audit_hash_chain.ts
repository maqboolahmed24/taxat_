import type { RetentionLimitedExplainabilityContract } from "../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type { TelemetryResourceCorrelationContext } from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";

import type { AuditRetainedContext } from "./audit_visibility_and_retention.ts";

export type AuditEventRecord = {
  actor_ref: string | null;
  audit_event_id: string;
  audit_stream_ref: string;
  client_id: string | null;
  correlation_context: TelemetryResourceCorrelationContext;
  event_payload_hash: string;
  event_time: string;
  event_type: string;
  manifest_id: string | null;
  object_refs: string[];
  prev_event_hash: string | null;
  reason_codes: string[];
  recorded_at: string;
  retained_context: AuditRetainedContext;
  retention_class: string;
  retention_limited_explainability_contract: RetentionLimitedExplainabilityContract;
  service_ref: string | null;
  signature_ref: string | null;
  stream_sequence: number;
  tenant_id: string;
  visibility_class: string;
};

type AuditHashChainErrorInit = {
  code:
    | "AUDIT_CHAIN_EVENT_ID_MISMATCH"
    | "AUDIT_CHAIN_PREV_HASH_MISMATCH"
    | "AUDIT_CHAIN_SEQUENCE_INVALID"
    | "AUDIT_CHAIN_STREAM_DRIFT"
    | "AUDIT_PAYLOAD_HASH_MISMATCH";
  detail: string;
};

export class AuditHashChainError extends Error {
  readonly code: AuditHashChainErrorInit["code"];

  constructor(init: AuditHashChainErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "AuditHashChainError";
    this.code = init.code;
  }
}

function canonicalPayload(event: Omit<AuditEventRecord, "audit_event_id" | "audit_stream_ref" | "event_payload_hash" | "prev_event_hash" | "recorded_at" | "signature_ref" | "stream_sequence">) {
  return {
    actor_ref: event.actor_ref,
    client_id: event.client_id,
    correlation_context: event.correlation_context,
    event_time: event.event_time,
    event_type: event.event_type,
    manifest_id: event.manifest_id,
    object_refs: event.object_refs,
    reason_codes: event.reason_codes,
    retained_context: event.retained_context,
    retention_class: event.retention_class,
    retention_limited_explainability_contract: event.retention_limited_explainability_contract,
    service_ref: event.service_ref,
    tenant_id: event.tenant_id,
    visibility_class: event.visibility_class,
  };
}

export function createAuditEventPayloadHash(
  event: Omit<AuditEventRecord, "audit_event_id" | "audit_stream_ref" | "event_payload_hash" | "prev_event_hash" | "recorded_at" | "signature_ref" | "stream_sequence">,
) {
  return stableJsonHash(canonicalPayload(event));
}

export function createAuditChainHash(
  event: Pick<
    AuditEventRecord,
    | "audit_stream_ref"
    | "event_payload_hash"
    | "prev_event_hash"
    | "recorded_at"
    | "signature_ref"
    | "stream_sequence"
  >,
) {
  return stableJsonHash({
    audit_stream_ref: event.audit_stream_ref,
    event_payload_hash: event.event_payload_hash,
    prev_event_hash: event.prev_event_hash,
    recorded_at: event.recorded_at,
    signature_ref: event.signature_ref,
    stream_sequence: event.stream_sequence,
  });
}

export function createAuditEventId(chainHash: string) {
  return `audit.${chainHash}`;
}

export function verifyAuditHashChain(events: readonly AuditEventRecord[]) {
  if (events.length === 0) {
    return {
      eventCount: 0,
      lastChainHashOrNull: null,
      status: "VERIFIED" as const,
    };
  }

  const streamRef = events[0].audit_stream_ref;
  let previousHash: string | null = null;
  let previousSequence = 0;
  for (const event of events) {
    if (event.audit_stream_ref !== streamRef) {
      throw new AuditHashChainError({
        code: "AUDIT_CHAIN_STREAM_DRIFT",
        detail: "audit hash chain verification accepts exactly one audit stream at a time",
      });
    }
    if (event.stream_sequence !== previousSequence + 1) {
      throw new AuditHashChainError({
        code: "AUDIT_CHAIN_SEQUENCE_INVALID",
        detail: `expected sequence ${previousSequence + 1} but found ${event.stream_sequence}`,
      });
    }
    const payloadHash = createAuditEventPayloadHash({
      actor_ref: event.actor_ref,
      client_id: event.client_id,
      correlation_context: event.correlation_context,
      event_time: event.event_time,
      event_type: event.event_type,
      manifest_id: event.manifest_id,
      object_refs: event.object_refs,
      reason_codes: event.reason_codes,
      retained_context: event.retained_context,
      retention_class: event.retention_class,
      retention_limited_explainability_contract:
        event.retention_limited_explainability_contract,
      service_ref: event.service_ref,
      tenant_id: event.tenant_id,
      visibility_class: event.visibility_class,
    });
    if (payloadHash !== event.event_payload_hash) {
      throw new AuditHashChainError({
        code: "AUDIT_PAYLOAD_HASH_MISMATCH",
        detail: `audit event ${event.audit_event_id} published a payload hash that does not match the semantic payload`,
      });
    }
    if (event.prev_event_hash !== previousHash) {
      throw new AuditHashChainError({
        code: "AUDIT_CHAIN_PREV_HASH_MISMATCH",
        detail: `audit event ${event.audit_event_id} does not link to the expected previous chain hash`,
      });
    }
    const chainHash = createAuditChainHash(event);
    if (event.audit_event_id !== createAuditEventId(chainHash)) {
      throw new AuditHashChainError({
        code: "AUDIT_CHAIN_EVENT_ID_MISMATCH",
        detail: `audit event ${event.audit_event_id} does not match the deterministic hash-chain identifier`,
      });
    }

    previousHash = chainHash;
    previousSequence = event.stream_sequence;
  }

  return {
    eventCount: events.length,
    lastChainHashOrNull: previousHash,
    status: "VERIFIED" as const,
  };
}
