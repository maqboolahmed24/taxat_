import { AuthorityModelError } from "../models/authority_common.ts";
import {
  filingNoticeStepRef,
  normalizeFilingNoticeStepRecord,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";
import { filingPacketRef, type FilingPacketRecord } from "../models/filing_packet.ts";

export type ValidatePacketNoticeStepInput = {
  packet?: FilingPacketRecord | null;
  step: FilingNoticeStepRecord;
};

export function validatePacketNoticeStep(input: ValidatePacketNoticeStepInput) {
  const step = normalizeFilingNoticeStepRecord(input.step);
  if (input.packet !== undefined && input.packet !== null) {
    if (step.packet_id !== input.packet.packet_id || step.manifest_id !== input.packet.manifest_id) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing notice step must bind to the owning filing packet manifest and packet_id",
      );
    }
    if (
      !step.packet_refs.includes(input.packet.packet_id) ||
      !step.packet_refs.includes(filingPacketRef(input.packet))
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing notice step packet_refs must include packet id and packet ref",
      );
    }
  }
  return {
    notice_step_ref: filingNoticeStepRef(step),
    step,
  };
}
