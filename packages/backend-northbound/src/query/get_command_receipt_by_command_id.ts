import type {
  ApiCommandReceiptRepository,
  StoredApiCommandReceipt,
} from "../repositories/api_command_receipt_repository.ts";

export type CommandReceiptByCommandIdQueryResult = {
  latest: StoredApiCommandReceipt | null;
  records: StoredApiCommandReceipt[];
};

export async function getCommandReceiptByCommandId(input: {
  commandId: string;
  receiptRepository: ApiCommandReceiptRepository;
  tenantId: string;
}): Promise<CommandReceiptByCommandIdQueryResult> {
  const records = await input.receiptRepository.findStoredReceiptsByCommandId(
    input.tenantId,
    input.commandId,
  );
  return {
    latest: records.at(-1) ?? null,
    records,
  };
}
