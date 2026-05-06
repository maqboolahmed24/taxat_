import type { CommandEnvelope } from "../models/command_envelope.ts";
import {
  assertApiCommandReceiptContract,
  cloneApiCommandReceipt,
  type ApiCommandReceipt,
} from "../models/api_command_receipt.ts";

export type StoredApiCommandReceipt = {
  command: CommandEnvelope;
  duplicate_suppression_key: string;
  persisted_at: string;
  receipt: ApiCommandReceipt;
};

export type ApiCommandReceiptLookup = {
  command_id: string;
  idempotency_key: string;
  principal_ref: string;
  request_hash: string;
  session_ref: string;
  tenant_id: string;
};

function cloneStoredReceipt(record: StoredApiCommandReceipt): StoredApiCommandReceipt {
  return JSON.parse(JSON.stringify(record)) as StoredApiCommandReceipt;
}

function lookupActorIdempotencyKey(lookup: Omit<ApiCommandReceiptLookup, "command_id" | "request_hash">) {
  return [
    lookup.tenant_id,
    lookup.principal_ref,
    lookup.session_ref,
    lookup.idempotency_key,
  ].join("|");
}

function lookupExactDuplicateKey(lookup: ApiCommandReceiptLookup) {
  return [
    lookupActorIdempotencyKey(lookup),
    lookup.command_id,
    lookup.request_hash,
  ].join("|");
}

function sameStableJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class ApiCommandReceiptRepository {
  private readonly exactAcceptedByDuplicateKey = new Map<string, string>();
  private readonly receiptIdsByActorIdempotencyKey = new Map<string, string[]>();
  private readonly receiptIdsByCommandKey = new Map<string, string[]>();
  private readonly receiptsById = new Map<string, StoredApiCommandReceipt>();

  async persistApiCommandReceipt(record: StoredApiCommandReceipt) {
    assertApiCommandReceiptContract(record.receipt);
    const existing = this.receiptsById.get(record.receipt.receipt_id);
    if (existing !== undefined) {
      if (!sameStableJson(existing, record)) {
        throw new Error(`api command receipt ${record.receipt.receipt_id} is immutable`);
      }
      return cloneStoredReceipt(existing);
    }

    const stored = cloneStoredReceipt(record);
    this.receiptsById.set(stored.receipt.receipt_id, stored);

    const actorKey = lookupActorIdempotencyKey({
      idempotency_key: stored.receipt.idempotency_key,
      principal_ref: stored.receipt.principal_ref,
      session_ref: stored.receipt.session_ref,
      tenant_id: stored.receipt.tenant_id,
    });
    const actorReceiptIds = this.receiptIdsByActorIdempotencyKey.get(actorKey) ?? [];
    actorReceiptIds.push(stored.receipt.receipt_id);
    this.receiptIdsByActorIdempotencyKey.set(actorKey, actorReceiptIds);

    const commandKey = `${stored.receipt.tenant_id}|${stored.receipt.command_id}`;
    const commandReceiptIds = this.receiptIdsByCommandKey.get(commandKey) ?? [];
    commandReceiptIds.push(stored.receipt.receipt_id);
    this.receiptIdsByCommandKey.set(commandKey, commandReceiptIds);

    if (stored.receipt.acceptance_state === "ACCEPTED") {
      const exactKey = lookupExactDuplicateKey({
        command_id: stored.receipt.command_id,
        idempotency_key: stored.receipt.idempotency_key,
        principal_ref: stored.receipt.principal_ref,
        request_hash: stored.receipt.request_hash,
        session_ref: stored.receipt.session_ref,
        tenant_id: stored.receipt.tenant_id,
      });
      const owner = this.exactAcceptedByDuplicateKey.get(exactKey);
      if (owner !== undefined && owner !== stored.receipt.receipt_id) {
        throw new Error(`duplicate accepted receipt for ${exactKey}`);
      }
      this.exactAcceptedByDuplicateKey.set(exactKey, stored.receipt.receipt_id);
    }

    return cloneStoredReceipt(stored);
  }

  async findExactAcceptedReceipt(lookup: ApiCommandReceiptLookup) {
    const receiptId = this.exactAcceptedByDuplicateKey.get(lookupExactDuplicateKey(lookup));
    if (receiptId === undefined) {
      return null;
    }
    const stored = this.receiptsById.get(receiptId);
    return stored ? cloneStoredReceipt(stored) : null;
  }

  async findIdempotencyCollision(lookup: ApiCommandReceiptLookup) {
    const ids =
      this.receiptIdsByActorIdempotencyKey.get(
        lookupActorIdempotencyKey({
          idempotency_key: lookup.idempotency_key,
          principal_ref: lookup.principal_ref,
          session_ref: lookup.session_ref,
          tenant_id: lookup.tenant_id,
        }),
      ) ?? [];
    for (const id of ids) {
      const stored = this.receiptsById.get(id);
      if (
        stored &&
        stored.receipt.request_hash !== lookup.request_hash &&
        stored.receipt.acceptance_state !== "REJECTED_INVALID"
      ) {
        return cloneStoredReceipt(stored);
      }
    }
    return null;
  }

  async findLatestByCommandId(tenantId: string, commandId: string) {
    const ids = this.receiptIdsByCommandKey.get(`${tenantId}|${commandId}`) ?? [];
    const latestId = ids.at(-1);
    const stored = latestId ? this.receiptsById.get(latestId) : undefined;
    return stored ? cloneApiCommandReceipt(stored.receipt) : null;
  }

  async findLatestStoredByCommandId(tenantId: string, commandId: string) {
    const ids = this.receiptIdsByCommandKey.get(`${tenantId}|${commandId}`) ?? [];
    const latestId = ids.at(-1);
    const stored = latestId ? this.receiptsById.get(latestId) : undefined;
    return stored ? cloneStoredReceipt(stored) : null;
  }

  async findStoredReceiptsByCommandId(tenantId: string, commandId: string) {
    const ids = this.receiptIdsByCommandKey.get(`${tenantId}|${commandId}`) ?? [];
    return ids.flatMap((id) => {
      const stored = this.receiptsById.get(id);
      return stored ? [cloneStoredReceipt(stored)] : [];
    });
  }

  async findStoredByReceiptId(receiptId: string) {
    const stored = this.receiptsById.get(receiptId);
    return stored ? cloneStoredReceipt(stored) : null;
  }

  async listApiCommandReceipts() {
    return [...this.receiptsById.values()].map(cloneStoredReceipt);
  }
}
