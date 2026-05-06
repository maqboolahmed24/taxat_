import {
  ApiCommandReceiptContractError,
  assertApiCommandReceiptContract,
  receiptHasDurableRecoveryAnchor,
  receiptSuccessClass,
  type ApiCommandReceipt,
} from "../models/api_command_receipt.ts";

export type CommandReceiptRecoveryAnchorFamily =
  | "ACTIVITY_REFS"
  | "AUDIT_EVENT_REFS"
  | "RESULT_REF";

export class CommandReceiptRecoveryAnchorError extends Error {
  readonly code = "COMMAND_RECEIPT_RECOVERY_ANCHOR_INVALID";
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "CommandReceiptRecoveryAnchorError";
    this.reasonCodes = reasonCodes;
  }
}

function sameStringArray(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function commandReceiptRecoveryAnchorFamilies(
  receipt: ApiCommandReceipt,
): CommandReceiptRecoveryAnchorFamily[] {
  const families: CommandReceiptRecoveryAnchorFamily[] = [];
  if (receipt.result_ref !== null) {
    families.push("RESULT_REF");
  }
  if (receipt.activity_refs.length > 0) {
    families.push("ACTIVITY_REFS");
  }
  if (receipt.audit_event_refs.length > 0) {
    families.push("AUDIT_EVENT_REFS");
  }
  return families;
}

function fail(message: string, reasonCodes: string[]): never {
  throw new CommandReceiptRecoveryAnchorError(message, reasonCodes);
}

function assertDuplicateLineage(input: {
  duplicateSource: ApiCommandReceipt;
  receipt: ApiCommandReceipt;
}) {
  const { duplicateSource, receipt } = input;
  if (receipt.duplicate_of_receipt_id !== duplicateSource.receipt_id) {
    fail("duplicate replay receipt must point at the loaded source receipt", [
      "COMMAND_RECEIPT_DUPLICATE_LINEAGE_BROKEN",
    ]);
  }
  if (receipt.semantic_action_id !== duplicateSource.semantic_action_id) {
    fail("duplicate replay receipt must preserve semantic_action_id", [
      "COMMAND_RECEIPT_SEMANTIC_ACTION_DRIFT",
    ]);
  }
  if (
    receipt.result_ref !== duplicateSource.result_ref ||
    receipt.latest_projection_ref !== duplicateSource.latest_projection_ref ||
    !sameStringArray(receipt.activity_refs, duplicateSource.activity_refs) ||
    !sameStringArray(receipt.audit_event_refs, duplicateSource.audit_event_refs) ||
    !sameStringArray(receipt.notification_refs, duplicateSource.notification_refs)
  ) {
    fail("duplicate replay receipt must preserve original recovery anchors", [
      "COMMAND_RECEIPT_DUPLICATE_ANCHOR_DRIFT",
    ]);
  }
}

export function validateCommandReceiptRecoveryAnchors(input: {
  duplicateSource?: ApiCommandReceipt | null;
  receipt: ApiCommandReceipt;
}) {
  try {
    assertApiCommandReceiptContract(input.receipt);
  } catch (error) {
    if (error instanceof ApiCommandReceiptContractError) {
      fail(error.message, ["COMMAND_RECEIPT_SCHEMA_INVALID"]);
    }
    throw error;
  }

  if (receiptSuccessClass(input.receipt) && !receiptHasDurableRecoveryAnchor(input.receipt)) {
    fail("success-class receipt lacks a durable recovery anchor", [
      "COMMAND_RECEIPT_DURABLE_ANCHOR_MISSING",
    ]);
  }

  if (
    input.receipt.acceptance_state === "EXPIRED" &&
    input.receipt.original_acceptance_state !== null &&
    ["ACCEPTED", "DUPLICATE_REPLAY"].includes(input.receipt.original_acceptance_state)
  ) {
    const anchorFamilies = commandReceiptRecoveryAnchorFamilies(input.receipt);
    if (anchorFamilies.length === 0) {
      fail("expired success receipt must preserve its recovery-anchor family", [
        "COMMAND_RECEIPT_EXPIRED_ANCHOR_FAMILY_MISSING",
      ]);
    }
  }

  const preservesDuplicateLineage =
    input.receipt.acceptance_state === "DUPLICATE_REPLAY" ||
    (input.receipt.acceptance_state === "EXPIRED" &&
      input.receipt.original_acceptance_state === "DUPLICATE_REPLAY");

  if (preservesDuplicateLineage) {
    if (input.duplicateSource === null || input.duplicateSource === undefined) {
      fail("duplicate replay receipt source could not be loaded", [
        "COMMAND_RECEIPT_DUPLICATE_SOURCE_MISSING",
      ]);
    }
    assertDuplicateLineage({
      duplicateSource: input.duplicateSource,
      receipt: input.receipt,
    });
  }

  return input.receipt;
}
