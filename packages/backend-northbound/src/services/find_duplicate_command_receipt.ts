import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type {
  ApiCommandReceiptRepository,
  StoredApiCommandReceipt,
} from "../repositories/api_command_receipt_repository.ts";

export type DuplicateCommandReceiptDecision =
  | {
      outcome: "NO_DUPLICATE";
    }
  | {
      existing: StoredApiCommandReceipt;
      outcome: "DUPLICATE_REPLAY";
    }
  | {
      existing: StoredApiCommandReceipt;
      outcome: "IDEMPOTENCY_COLLISION";
    };

export async function findDuplicateCommandReceipt(input: {
  parsed: ParsedCommandEnvelope;
  receiptRepository: ApiCommandReceiptRepository;
  requestHash: string;
}): Promise<DuplicateCommandReceiptDecision> {
  const lookup = {
    command_id: input.parsed.command.command_id,
    idempotency_key: input.parsed.command.idempotency_key,
    principal_ref: input.parsed.actorContext.principal_ref,
    request_hash: input.requestHash,
    session_ref: input.parsed.actorContext.session_ref,
    tenant_id: input.parsed.command.tenant_id,
  };

  const duplicate = await input.receiptRepository.findExactAcceptedReceipt(lookup);
  if (duplicate !== null) {
    return {
      existing: duplicate,
      outcome: "DUPLICATE_REPLAY",
    };
  }

  const collision = await input.receiptRepository.findIdempotencyCollision(lookup);
  if (collision !== null) {
    return {
      existing: collision,
      outcome: "IDEMPOTENCY_COLLISION",
    };
  }

  return {
    outcome: "NO_DUPLICATE",
  };
}
