import { AuthorityModelError, normalizeTimestamp } from "../models/authority_common.ts";
import {
  buildFilingNoticeResolutionRecord,
  filingNoticeResolutionRef,
  type FilingNoticeResolutionRecord,
} from "../models/filing_notice_resolution.ts";
import {
  buildFilingNoticeStepRecord,
  compareFilingNoticeSteps,
  filingNoticeStepRef,
  type FilingNoticeStepCode,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";
import {
  type FilingPacketApprovalState,
  type FilingPacketDeclaredBasisAckState,
  type FilingPacketRecord,
} from "../models/filing_packet.ts";
import { FilingNoticeResolutionRepository } from "../repositories/filing_notice_resolution_repository.ts";
import { FilingNoticeStepRepository } from "../repositories/filing_notice_step_repository.ts";
import { validateFilingNoticeResolution } from "./validate_filing_notice_resolution.ts";
import { validatePacketNoticeStep } from "./validate_packet_notice_step.ts";

export type ResolveFilingNoticesInput = {
  acknowledged_notice_step_refs?: readonly string[];
  acknowledged_step_codes?: readonly FilingNoticeStepCode[];
  packet: FilingPacketRecord;
  resolution_id?: string;
  resolution_repository?: FilingNoticeResolutionRepository;
  resolved_at: string;
  step_repository?: FilingNoticeStepRepository;
  steps: readonly FilingNoticeStepRecord[];
};

export type ResolveFilingNoticesResult = {
  notice_resolution_ref: string;
  resolution: FilingNoticeResolutionRecord;
  resolution_repository: FilingNoticeResolutionRepository;
  step_repository: FilingNoticeStepRepository;
  steps: FilingNoticeStepRecord[];
};

function unresolvedReasonForStep(step: FilingNoticeStepRecord) {
  if (step.lifecycle_state === "UNSATISFIABLE") {
    return `${step.step_code}_UNSATISFIABLE`;
  }
  return `${step.step_code}_UNRESOLVED`;
}

function shouldSatisfyStep(input: {
  acknowledged_refs: readonly string[];
  acknowledged_step_codes: readonly FilingNoticeStepCode[];
  step: FilingNoticeStepRecord;
}) {
  return (
    input.step.lifecycle_state === "SATISFIED" ||
    input.acknowledged_refs.includes(filingNoticeStepRef(input.step)) ||
    input.acknowledged_step_codes.includes(input.step.step_code)
  );
}

function nextStepState(input: {
  acknowledged_refs: readonly string[];
  acknowledged_step_codes: readonly FilingNoticeStepCode[];
  resolved_at: string;
  step: FilingNoticeStepRecord;
}) {
  if (input.step.lifecycle_state === "UNSATISFIABLE") {
    return buildFilingNoticeStepRecord({
      ...input.step,
      lifecycle_state: "UNSATISFIABLE",
      resolved_at: input.step.resolved_at ?? input.resolved_at,
    });
  }
  if (shouldSatisfyStep(input)) {
    return buildFilingNoticeStepRecord({
      ...input.step,
      lifecycle_state: "SATISFIED",
      resolved_at: input.step.resolved_at ?? input.resolved_at,
    });
  }
  return buildFilingNoticeStepRecord({
    ...input.step,
    lifecycle_state: "PENDING",
    resolved_at: null,
  });
}

function hasStep(steps: readonly FilingNoticeStepRecord[], stepCode: FilingNoticeStepCode) {
  return steps.some((step) => step.step_code === stepCode);
}

function resolveApprovalState(input: {
  packet: FilingPacketRecord;
  steps: readonly FilingNoticeStepRecord[];
}): FilingPacketApprovalState {
  const current = input.packet.approval_state;
  if (current === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing notice resolution requires packet approval_state",
    );
  }
  if (["UNSATISFIABLE", "DENIED"].includes(current)) {
    return current;
  }
  if (!hasStep(input.steps, "PACKET_APPROVAL_REQUIRED")) {
    return current === "REQUIRED_PENDING" ? "REQUIRED_PENDING" : current;
  }
  return input.steps.find((step) => step.step_code === "PACKET_APPROVAL_REQUIRED")?.lifecycle_state ===
    "SATISFIED"
    ? "SATISFIED"
    : "REQUIRED_PENDING";
}

function resolveAckState(input: {
  packet: FilingPacketRecord;
  steps: readonly FilingNoticeStepRecord[];
}): FilingPacketDeclaredBasisAckState {
  const current = input.packet.declared_basis_ack_state;
  if (current === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing notice resolution requires packet declared_basis_ack_state",
    );
  }
  if (current === "UNSATISFIABLE") {
    return current;
  }
  const ackStepCodes: FilingNoticeStepCode[] = [
    "DECLARED_BASIS_ACK_REQUIRED",
    "DISCLAIMER_ACK_REQUIRED",
  ];
  const ackSteps = input.steps.filter((step) => ackStepCodes.includes(step.step_code));
  if (ackSteps.length === 0) {
    return current === "REQUIRED_PENDING" ? "REQUIRED_PENDING" : current;
  }
  return ackSteps.every((step) => step.lifecycle_state === "SATISFIED")
    ? "SATISFIED"
    : "REQUIRED_PENDING";
}

function unresolvedReasons(input: {
  approval_state: FilingPacketApprovalState;
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState;
  steps: readonly FilingNoticeStepRecord[];
}) {
  const reasons = new Set<string>();
  for (const step of input.steps) {
    if (step.lifecycle_state !== "SATISFIED") {
      reasons.add(unresolvedReasonForStep(step));
    }
  }
  if (input.approval_state === "DENIED") {
    reasons.add("PACKET_APPROVAL_DENIED");
  }
  if (input.approval_state === "REQUIRED_PENDING") {
    reasons.add("PACKET_APPROVAL_REQUIRED_UNRESOLVED");
  }
  if (input.approval_state === "UNSATISFIABLE") {
    reasons.add("PACKET_APPROVAL_UNSATISFIABLE");
  }
  if (input.declared_basis_ack_state === "REQUIRED_PENDING") {
    reasons.add("DECLARED_BASIS_ACK_REQUIRED_UNRESOLVED");
  }
  if (input.declared_basis_ack_state === "UNSATISFIABLE") {
    reasons.add("DECLARED_BASIS_ACK_UNSATISFIABLE");
  }
  return [...reasons].sort();
}

export async function resolveFilingNotices(input: ResolveFilingNoticesInput) {
  const packet = input.packet;
  if (packet.lifecycle_state !== "PREPARED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing notices may only be resolved for a PREPARED packet",
    );
  }
  const resolvedAt = normalizeTimestamp("resolved_at", input.resolved_at);
  const acknowledgedRefs = [...(input.acknowledged_notice_step_refs ?? [])];
  const acknowledgedStepCodes = [...(input.acknowledged_step_codes ?? [])];
  const orderedInputSteps = [...input.steps].sort(compareFilingNoticeSteps);
  if (orderedInputSteps.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "FilingNoticeResolution requires at least one packet-local notice step",
    );
  }
  for (const step of orderedInputSteps) {
    validatePacketNoticeStep({ packet, step });
  }
  if (
    packet.notice_step_refs.length > 0 &&
    packet.notice_step_refs.join("\n") !==
      orderedInputSteps.map((step) => filingNoticeStepRef(step)).join("\n")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "packet notice_step_refs drift from resolution step set",
    );
  }

  const resolvedSteps = orderedInputSteps.map((step) =>
    nextStepState({
      acknowledged_refs: acknowledgedRefs,
      acknowledged_step_codes: acknowledgedStepCodes,
      resolved_at: resolvedAt,
      step,
    }),
  );
  const approvalState = resolveApprovalState({ packet, steps: resolvedSteps });
  const declaredBasisAckState = resolveAckState({ packet, steps: resolvedSteps });
  const unresolved = unresolvedReasons({
    approval_state: approvalState,
    declared_basis_ack_state: declaredBasisAckState,
    steps: resolvedSteps,
  });
  const noticeRequirementsSatisfied = unresolved.length === 0;

  const resolution = buildFilingNoticeResolutionRecord({
    approval_state: approvalState,
    declared_basis_ack_state: declaredBasisAckState,
    manifest_id: packet.manifest_id,
    notice_requirements_satisfied: noticeRequirementsSatisfied,
    notice_resolution_id: input.resolution_id,
    notice_step_refs: resolvedSteps.map((step) => filingNoticeStepRef(step)),
    packet_id: packet.packet_id,
    resolved_at: resolvedAt,
    unresolved_reason_codes: unresolved,
  });
  validateFilingNoticeResolution({ packet, resolution, steps: resolvedSteps });

  const stepRepository = input.step_repository ?? new FilingNoticeStepRepository();
  const resolutionRepository =
    input.resolution_repository ?? new FilingNoticeResolutionRepository();
  for (const step of resolvedSteps) {
    await stepRepository.persistFilingNoticeStep({ step });
  }
  await resolutionRepository.persistFilingNoticeResolution({ resolution });
  return {
    notice_resolution_ref: filingNoticeResolutionRef(resolution),
    resolution,
    resolution_repository: resolutionRepository,
    step_repository: stepRepository,
    steps: resolvedSteps,
  } satisfies ResolveFilingNoticesResult;
}
