import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { CommandEnvelope } from "../models/command_envelope.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";
import type { StoredApiCommandReceipt } from "../repositories/api_command_receipt_repository.ts";

export type CommandReceiptReadAuthorization =
  | {
      authorized: true;
      reasonCodes: string[];
      targetRef: string;
      targetScopeClass: ApiCommandReceipt["target_scope_class"];
    }
  | {
      authorized: true;
      corruptionReasonCodes: string[];
      reasonCodes: string[];
      targetRef: null;
      targetScopeClass: ApiCommandReceipt["target_scope_class"];
    }
  | {
      authorized: false;
      hidden: true;
      reasonCodes: string[];
    };

function expectedReadClientId(actorContext: NorthboundActorContext) {
  return actorContext.client_id_or_null ?? "client.system.control-plane";
}

function receiptTargetRef(receipt: ApiCommandReceipt) {
  switch (receipt.target_scope_class) {
    case "MANIFEST":
      return receipt.manifest_id;
    case "WORK_ITEM":
      return receipt.work_item_id;
    case "GOVERNANCE":
      return receipt.governance_target_ref;
  }
}

function targetShapeIsValid(receipt: ApiCommandReceipt) {
  switch (receipt.target_scope_class) {
    case "MANIFEST":
      return (
        receipt.manifest_id !== null &&
        receipt.work_item_id === null &&
        receipt.governance_target_ref === null
      );
    case "WORK_ITEM":
      return (
        receipt.work_item_id !== null &&
        receipt.manifest_id === null &&
        receipt.governance_target_ref === null
      );
    case "GOVERNANCE":
      return (
        receipt.governance_target_ref !== null &&
        receipt.manifest_id === null &&
        receipt.work_item_id === null
      );
  }
}

function commandAndReceiptTargetsMatch(
  command: CommandEnvelope,
  receipt: ApiCommandReceipt,
) {
  return (
    command.target_scope_class === receipt.target_scope_class &&
    command.manifest_id === receipt.manifest_id &&
    command.work_item_id === receipt.work_item_id &&
    command.governance_target_ref === receipt.governance_target_ref
  );
}

export function authorizeCommandReceiptRead(input: {
  actorContext: NorthboundActorContext;
  storedReceipt: StoredApiCommandReceipt;
}): CommandReceiptReadAuthorization {
  const receipt = input.storedReceipt.receipt;
  const actorClientId = expectedReadClientId(input.actorContext);

  if (
    receipt.tenant_id !== input.actorContext.tenant_id ||
    receipt.principal_ref !== input.actorContext.principal_ref ||
    receipt.client_id !== actorClientId
  ) {
    return {
      authorized: false,
      hidden: true,
      reasonCodes: ["COMMAND_RECEIPT_SCOPE_HIDDEN"],
    };
  }

  if (
    !targetShapeIsValid(receipt) ||
    !commandAndReceiptTargetsMatch(input.storedReceipt.command, receipt)
  ) {
    return {
      authorized: true,
      corruptionReasonCodes: ["COMMAND_RECEIPT_TARGET_SCOPE_CORRUPT"],
      reasonCodes: ["COMMAND_RECEIPT_READ_AUTHORIZED"],
      targetRef: null,
      targetScopeClass: receipt.target_scope_class,
    };
  }

  return {
    authorized: true,
    reasonCodes: ["COMMAND_RECEIPT_READ_AUTHORIZED"],
    targetRef: receiptTargetRef(receipt) as string,
    targetScopeClass: receipt.target_scope_class,
  };
}
