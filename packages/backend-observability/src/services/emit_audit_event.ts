import type {
  AuditEventDraftInput,
  AuditPolicyBundle,
} from "../../../audit/src/index.ts";
import {
  createAuditChainHash,
  createAuditEventDraft,
  createAuditEventId,
  createAuditExplainabilityContract,
  loadAuditPolicyBundle,
  type AuditEventRecord,
} from "../../../audit/src/index.ts";
import type { TelemetryResource } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { assertAuditEventContract } from "../models/audit_event.ts";
import { buildObservabilityCorrelationContext } from "./build_observability_correlation_context.ts";

export type StoredBackendAuditEvent = {
  chain_hash: string;
  event: AuditEventRecord;
  event_family_ref: string;
  publication_ref: string;
};

export type EmitAuditEventInput = AuditEventDraftInput & {
  expectedPrevEventHashOrNull?: string | null;
  publicationRef?: string | null;
  recordedAtOrNull?: string | null;
  resource?: TelemetryResource | null;
  signatureRefOrNull?: string | null;
};

type AuditStreamHead = {
  lastChainHashOrNull: string | null;
  streamSequence: number;
};

export class BackendObservabilityAuditEventStore {
  private readonly eventsByStream = new Map<string, StoredBackendAuditEvent[]>();
  private readonly publicationIndexByStream = new Map<
    string,
    Map<string, StoredBackendAuditEvent>
  >();

  constructor(readonly policyBundle: AuditPolicyBundle) {}

  static async create() {
    return new BackendObservabilityAuditEventStore(await loadAuditPolicyBundle());
  }

  private streamEvents(streamRef: string) {
    const existing = this.eventsByStream.get(streamRef);
    if (existing) {
      return existing;
    }
    const created: StoredBackendAuditEvent[] = [];
    this.eventsByStream.set(streamRef, created);
    return created;
  }

  private publicationIndex(streamRef: string) {
    const existing = this.publicationIndexByStream.get(streamRef);
    if (existing) {
      return existing;
    }
    const created = new Map<string, StoredBackendAuditEvent>();
    this.publicationIndexByStream.set(streamRef, created);
    return created;
  }

  private streamHead(streamRef: string): AuditStreamHead {
    const events = this.streamEvents(streamRef);
    const last = events.at(-1);
    if (!last) {
      return {
        lastChainHashOrNull: null,
        streamSequence: -1,
      };
    }
    return {
      lastChainHashOrNull: last.chain_hash,
      streamSequence: last.event.stream_sequence,
    };
  }

  async append(input: EmitAuditEventInput) {
    const correlationContext = buildObservabilityCorrelationContext({
      ...(input.correlationContext ?? {}),
      resource: input.resource ?? null,
      client_id: input.clientIdOrNull ?? input.correlationContext?.client_id,
      manifest_id: input.manifestIdOrNull ?? input.correlationContext?.manifest_id,
      tenant_id: input.tenantId,
    });
    const draft = await createAuditEventDraft(
      {
        ...input,
        correlationContext,
        serviceRefOrNull:
          input.serviceRefOrNull ??
          (input.resource ? input.resource.resource_id : null),
      },
      {
        policyBundle: this.policyBundle,
      },
    );
    const publicationRef =
      input.publicationRef ??
      `audit-publication.${stableJsonHash({
        audit_stream_ref: draft.auditStreamRef,
        event_payload_hash: draft.eventPayloadHash,
        event_time: draft.eventTime,
        event_type: draft.eventType,
      })}`;
    const streamEvents = this.streamEvents(draft.auditStreamRef);
    const publicationIndex = this.publicationIndex(draft.auditStreamRef);
    const existing = publicationIndex.get(publicationRef);
    if (existing) {
      if (existing.event.event_payload_hash === draft.eventPayloadHash) {
        return {
          status: "DUPLICATE_IGNORED" as const,
          storedEvent: existing,
        };
      }
      throw new Error("AUDIT_DUPLICATE_PUBLICATION_DIVERGENT_PAYLOAD");
    }

    const head = this.streamHead(draft.auditStreamRef);
    if (
      input.expectedPrevEventHashOrNull !== undefined &&
      input.expectedPrevEventHashOrNull !== head.lastChainHashOrNull
    ) {
      throw new Error("AUDIT_EXPECTED_PREV_HASH_MISMATCH");
    }
    const event: AuditEventRecord = {
      actor_ref: draft.actorRef,
      audit_event_id: "audit.pending",
      audit_stream_ref: draft.auditStreamRef,
      client_id: draft.clientId,
      correlation_context: draft.correlationContext,
      event_payload_hash: draft.eventPayloadHash,
      event_time: draft.eventTime,
      event_type: draft.eventType,
      manifest_id: draft.manifestId,
      object_refs: draft.objectRefs,
      prev_event_hash: head.lastChainHashOrNull,
      reason_codes: draft.reasonCodes,
      recorded_at: normalizeUtcInstantString(input.recordedAtOrNull ?? draft.eventTime),
      retained_context: draft.retainedContext,
      retention_class: draft.retentionClass,
      retention_limited_explainability_contract: createAuditExplainabilityContract(),
      service_ref: draft.serviceRef,
      signature_ref: input.signatureRefOrNull ?? null,
      stream_sequence: head.streamSequence + 1,
      tenant_id: draft.tenantId,
      visibility_class: draft.visibilityClass,
    };
    const chainHash = createAuditChainHash(event);
    event.audit_event_id = createAuditEventId(chainHash);
    assertAuditEventContract(event);

    const storedEvent: StoredBackendAuditEvent = {
      chain_hash: chainHash,
      event,
      event_family_ref: draft.eventFamilyRef,
      publication_ref: publicationRef,
    };
    streamEvents.push(storedEvent);
    publicationIndex.set(publicationRef, storedEvent);
    return {
      status: "APPENDED" as const,
      storedEvent,
    };
  }

  listMergedView() {
    return [...this.eventsByStream.values()]
      .flatMap((stream) => stream)
      .sort((left, right) => {
        if (left.event.recorded_at !== right.event.recorded_at) {
          return left.event.recorded_at.localeCompare(right.event.recorded_at);
        }
        if (left.event.audit_stream_ref !== right.event.audit_stream_ref) {
          return left.event.audit_stream_ref.localeCompare(right.event.audit_stream_ref);
        }
        return left.event.stream_sequence - right.event.stream_sequence;
      });
  }

  readStream(streamRef: string) {
    return [...(this.eventsByStream.get(streamRef) ?? [])];
  }
}

export async function emitAuditEvent(
  input: EmitAuditEventInput & { store?: BackendObservabilityAuditEventStore },
) {
  const store = input.store ?? (await BackendObservabilityAuditEventStore.create());
  return store.append(input);
}
