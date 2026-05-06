import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";

export const commandReceiptNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export function buildCommandReceiptResponse(receipt: ApiCommandReceipt) {
  return {
    body: receipt,
    headers: commandReceiptNoStoreHeaders,
    status: 200 as const,
  };
}
