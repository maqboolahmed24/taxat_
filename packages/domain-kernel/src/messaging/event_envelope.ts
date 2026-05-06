import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { stableJsonHash, type HashDigest } from "../primitives/hash.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import {
  buildMessageIdempotencyIdentity,
  type AuthorityRequestIdentityContract,
  type GenericMessageIdentityInput,
  type MessageIdentityContract,
} from "./idempotency.ts";
import {
  createMessageCorrelationContract,
  deriveOrderDomainKey,
  type CorrelationContract,
} from "./correlation.ts";

export type MessageFamilyRef =
  | "NORTHBOUND_COMMAND"
  | "STAGE_TASK"
  | "ARTIFACT_EVENT"
  | "AUTHORITY_REQUEST"
  | "AUTHORITY_INGRESS";

export type PayloadPosture = "OPAQUE_REFS_AND_HASHES_ONLY";

export type EventEnvelope = {
  channelRef: string;
  correlation: CorrelationContract;
  deliveryDedupeKey: HashDigest;
  durableTruthStatement: string;
  envelopeRef: TaxatRef<"event-envelope">;
  identity: AuthorityRequestIdentityContract | MessageIdentityContract;
  messageFamilyRef: MessageFamilyRef;
  notes: string[];
  orderDomainKey: HashDigest;
  packetId: string;
  payloadHash: HashDigest;
  payloadPosture: PayloadPosture;
  payloadRefOrNull: string | null;
  producedAt: string;
  producerRef: string;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
};

export type CreateEventEnvelopeInput = {
  authorityIdentityOrNull?: AuthorityRequestIdentityContract | null;
  causationRefOrNull?: string | null;
  channelRef: string;
  genericIdentityInput?: GenericMessageIdentityInput;
  durableTruthStatement: string;
  manifestRefOrNull?: string | null;
  messageFamilyRef: MessageFamilyRef;
  notes?: readonly string[];
  orderDomainParts?: readonly string[];
  packetId: string;
  payload: unknown;
  payloadRefOrNull?: string | null;
  producedAt: string;
  producerRef: string;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
};

function deriveEnvelopeRef(packetId: string, sourceRecordRef: string) {
  return asTaxatRef(
    `event-envelope.${stableJsonHash({
      packet_id: packetId,
      source_record_ref: sourceRecordRef,
    })}`,
    "event-envelope",
  );
}

export function createEventEnvelope(input: CreateEventEnvelopeInput): EventEnvelope {
  const payloadHash = stableJsonHash(input.payload ?? null);
  const identity =
    input.authorityIdentityOrNull ??
    buildMessageIdempotencyIdentity(
      input.genericIdentityInput ?? {
        channelRef: input.channelRef,
        consumerRef: "UNSPECIFIED_CONSUMER",
        familyRef: input.messageFamilyRef,
        payload: input.payload,
        producerRef: input.producerRef,
        scopeRef:
          input.messageFamilyRef === "NORTHBOUND_COMMAND"
            ? "NORTHBOUND_COMMAND"
            : input.messageFamilyRef === "STAGE_TASK"
              ? "STAGE_TASK"
              : input.messageFamilyRef === "ARTIFACT_EVENT"
                ? "ARTIFACT_EVENT"
                : "AUTHORITY_INGRESS",
        semanticOperationRef: input.messageFamilyRef,
        semanticTargetRef: input.sourceRecordRef,
        sourceRecordRef: input.sourceRecordRef,
        sourceRecordVersionHash: input.sourceRecordVersionHash,
        tenantId: "tenant.unspecified",
      },
    );
  const orderDomainKey = deriveOrderDomainKey(
    input.orderDomainParts ?? [input.channelRef, input.sourceRecordRef, identity.duplicateMeaningKey],
  );

  return {
    channelRef: input.channelRef,
    correlation: createMessageCorrelationContract({
      causationRefOrNull: input.causationRefOrNull,
      duplicateMeaningKey: identity.duplicateMeaningKey,
      idempotencyKey: identity.idempotencyKey,
      manifestRefOrNull: input.manifestRefOrNull,
      observedAt: input.producedAt,
      orderDomainKey,
      packetId: input.packetId,
      requestHash: identity.requestHash,
      sourceRecordRef: input.sourceRecordRef,
    }),
    deliveryDedupeKey: stableJsonHash({
      channel_ref: input.channelRef,
      packet_id: input.packetId,
      request_hash: identity.requestHash,
      source_record_ref: input.sourceRecordRef,
    }),
    durableTruthStatement: input.durableTruthStatement,
    envelopeRef: deriveEnvelopeRef(input.packetId, input.sourceRecordRef),
    identity,
    messageFamilyRef: input.messageFamilyRef,
    notes: [...(input.notes ?? [])],
    orderDomainKey,
    packetId: input.packetId,
    payloadHash,
    payloadPosture: "OPAQUE_REFS_AND_HASHES_ONLY",
    payloadRefOrNull: input.payloadRefOrNull ?? null,
    producedAt: normalizeUtcInstantString(input.producedAt),
    producerRef: input.producerRef,
    sourceRecordRef: input.sourceRecordRef,
    sourceRecordVersionHash: input.sourceRecordVersionHash,
  };
}
