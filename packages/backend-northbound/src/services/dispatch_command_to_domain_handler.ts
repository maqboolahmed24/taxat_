import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";

export type DispatchCommandResult = {
  dispatched_at: string;
  dispatch_ref: string;
};

export type DomainCommandHandler = (input: {
  parsed: ParsedCommandEnvelope;
  persistedReceipt: ApiCommandReceipt;
}) => Promise<DispatchCommandResult> | DispatchCommandResult;

export async function dispatchCommandToDomainHandler(input: {
  handler?: DomainCommandHandler;
  parsed: ParsedCommandEnvelope;
  persistedReceipt: ApiCommandReceipt;
}): Promise<DispatchCommandResult> {
  if (input.handler) {
    return input.handler({
      parsed: input.parsed,
      persistedReceipt: input.persistedReceipt,
    });
  }

  return {
    dispatched_at: input.persistedReceipt.accepted_at,
    dispatch_ref: `dispatch.${input.persistedReceipt.request_hash}`,
  };
}
