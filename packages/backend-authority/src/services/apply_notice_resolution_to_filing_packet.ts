import { AuthorityModelError, normalizeTimestamp } from "../models/authority_common.ts";
import {
  filingNoticeResolutionRef,
  type FilingNoticeResolutionRecord,
} from "../models/filing_notice_resolution.ts";
import { filingNoticeStepRef, type FilingNoticeStepRecord } from "../models/filing_notice_step.ts";
import type { FilingPacketRecord } from "../models/filing_packet.ts";
import { FilingNoticeResolutionRepository } from "../repositories/filing_notice_resolution_repository.ts";
import { FilingNoticeStepRepository } from "../repositories/filing_notice_step_repository.ts";
import { FilingPacketRepository } from "../repositories/filing_packet_repository.ts";
import { transitionFilingPacket } from "./transition_filing_packet.ts";
import { validateFilingNoticeResolution } from "./validate_filing_notice_resolution.ts";

export type ApplyNoticeResolutionToFilingPacketInput = {
  approved_at?: string | null;
  filing_gate_ref: string;
  notice_resolution_repository?: FilingNoticeResolutionRepository;
  packet: FilingPacketRecord;
  packet_repository?: FilingPacketRepository;
  resolution: FilingNoticeResolutionRecord;
  state_changed_at: string;
  step_repository?: FilingNoticeStepRepository;
  steps: readonly FilingNoticeStepRecord[];
};

export async function applyNoticeResolutionToFilingPacket(
  input: ApplyNoticeResolutionToFilingPacketInput,
) {
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  if (!input.resolution.notice_requirements_satisfied) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "unsatisfied filing notice resolution cannot promote a packet",
    );
  }
  const validation = validateFilingNoticeResolution({
    packet: input.packet,
    resolution: input.resolution,
    steps: input.steps,
  });
  const noticeStepRefs = input.steps.map((step) => filingNoticeStepRef(step));
  if (noticeStepRefs.join("\n") !== input.resolution.notice_step_refs.join("\n")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "packet promotion requires resolution notice_step_refs to mirror step refs",
    );
  }

  const stepRepository = input.step_repository ?? new FilingNoticeStepRepository();
  const noticeResolutionRepository =
    input.notice_resolution_repository ?? new FilingNoticeResolutionRepository();
  const packetRepository = input.packet_repository ?? new FilingPacketRepository();
  for (const step of input.steps) {
    await stepRepository.persistFilingNoticeStep({ step });
  }
  await noticeResolutionRepository.persistFilingNoticeResolution({
    resolution: validation.resolution,
  });
  const promoted = await transitionFilingPacket({
    approval_state: validation.resolution.approval_state,
    approved_at: input.approved_at ?? stateChangedAt,
    current: input.packet,
    declared_basis_ack_state: validation.resolution.declared_basis_ack_state,
    event: "approval_complete",
    filing_gate_ref: input.filing_gate_ref,
    notice_resolution_ref: filingNoticeResolutionRef(validation.resolution),
    notice_step_refs: noticeStepRefs,
    repository: packetRepository,
    state_changed_at: stateChangedAt,
  });
  return {
    notice_resolution_repository: noticeResolutionRepository,
    packet: promoted.packet,
    packet_repository: packetRepository,
    step_repository: stepRepository,
  };
}
