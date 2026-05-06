import type {
  ApiCommandReceiptRepository,
  StoredApiCommandReceipt,
} from "../repositories/api_command_receipt_repository.ts";

export class CommandReceiptDuplicateLineageError extends Error {
  readonly code = "COMMAND_RECEIPT_DUPLICATE_LINEAGE_INVALID";
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "CommandReceiptDuplicateLineageError";
    this.reasonCodes = reasonCodes;
  }
}

export type CommandReceiptDuplicateLineage = {
  duplicateSource: StoredApiCommandReceipt | null;
  latest: StoredApiCommandReceipt;
};

export async function loadLatestReceiptForDuplicateLineage(input: {
  latest: StoredApiCommandReceipt;
  receiptRepository: ApiCommandReceiptRepository;
}): Promise<CommandReceiptDuplicateLineage> {
  const duplicateOfReceiptId = input.latest.receipt.duplicate_of_receipt_id;
  if (duplicateOfReceiptId === null) {
    return {
      duplicateSource: null,
      latest: input.latest,
    };
  }
  if (duplicateOfReceiptId === input.latest.receipt.receipt_id) {
    throw new CommandReceiptDuplicateLineageError(
      "duplicate replay receipt points at itself",
      ["COMMAND_RECEIPT_DUPLICATE_SELF_REFERENCE"],
    );
  }

  const duplicateSource = await input.receiptRepository.findStoredByReceiptId(
    duplicateOfReceiptId,
  );
  if (duplicateSource === null) {
    throw new CommandReceiptDuplicateLineageError(
      "duplicate replay source receipt is missing",
      ["COMMAND_RECEIPT_DUPLICATE_SOURCE_MISSING"],
    );
  }
  if (duplicateSource.receipt.tenant_id !== input.latest.receipt.tenant_id) {
    throw new CommandReceiptDuplicateLineageError(
      "duplicate replay source crosses tenant boundary",
      ["COMMAND_RECEIPT_DUPLICATE_SOURCE_SCOPE_MISMATCH"],
    );
  }
  if (
    duplicateSource.receipt.principal_ref !== input.latest.receipt.principal_ref ||
    duplicateSource.receipt.client_id !== input.latest.receipt.client_id ||
    duplicateSource.receipt.target_scope_class !== input.latest.receipt.target_scope_class ||
    duplicateSource.receipt.manifest_id !== input.latest.receipt.manifest_id ||
    duplicateSource.receipt.work_item_id !== input.latest.receipt.work_item_id ||
    duplicateSource.receipt.governance_target_ref !== input.latest.receipt.governance_target_ref
  ) {
    throw new CommandReceiptDuplicateLineageError(
      "duplicate replay source crosses actor or target boundary",
      ["COMMAND_RECEIPT_DUPLICATE_SOURCE_SCOPE_MISMATCH"],
    );
  }

  return {
    duplicateSource,
    latest: input.latest,
  };
}
