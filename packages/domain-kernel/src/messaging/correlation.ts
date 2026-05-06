import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { stableJsonHash, type HashDigest } from "../primitives/hash.ts";

export type CorrelationContract = {
  causationRefOrNull: string | null;
  duplicateMeaningKey: string;
  idempotencyKey: string;
  manifestRefOrNull: string | null;
  observedAt: string;
  orderDomainKey: HashDigest;
  requestHash: string;
  sourceRecordRef: string;
  traceRef: TaxatRef<"trace">;
};

export type CreateCorrelationContractInput = {
  causationRefOrNull?: string | null;
  duplicateMeaningKey: string;
  idempotencyKey: string;
  manifestRefOrNull?: string | null;
  observedAt: string;
  orderDomainKey: HashDigest;
  packetId: string;
  requestHash: string;
  sourceRecordRef: string;
};

export function deriveOrderDomainKey(parts: readonly string[]) {
  return stableJsonHash({
    order_domain_parts: parts,
  });
}

export function createMessageCorrelationContract(
  input: CreateCorrelationContractInput,
): CorrelationContract {
  return {
    causationRefOrNull: input.causationRefOrNull ?? null,
    duplicateMeaningKey: input.duplicateMeaningKey,
    idempotencyKey: input.idempotencyKey,
    manifestRefOrNull: input.manifestRefOrNull ?? null,
    observedAt: normalizeUtcInstantString(input.observedAt),
    orderDomainKey: input.orderDomainKey,
    requestHash: input.requestHash,
    sourceRecordRef: input.sourceRecordRef,
    traceRef: asTaxatRef(
      `trace.${stableJsonHash({
        duplicate_meaning_key: input.duplicateMeaningKey,
        order_domain_key: input.orderDomainKey,
        packet_id: input.packetId,
        request_hash: input.requestHash,
        source_record_ref: input.sourceRecordRef,
      })}`,
      "trace",
    ),
  };
}
