import {
  AuthorityModelError,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import {
  buildFilingNoticeStepRecord,
  compareFilingNoticeSteps,
  filingNoticeStepRef,
  type FilingNoticeStepCode,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";
import {
  filingPacketRef,
  type FilingPacketApprovalState,
  type FilingPacketDeclaredBasisAckState,
  type FilingPacketRecord,
} from "../models/filing_packet.ts";
import { FilingNoticeStepRepository } from "../repositories/filing_notice_step_repository.ts";
import { validatePacketNoticeStep } from "./validate_packet_notice_step.ts";

export type DerivedPacketNoticeStepsResult = {
  notice_step_refs: string[];
  repository: FilingNoticeStepRepository;
  steps: FilingNoticeStepRecord[];
  stored_steps: Awaited<ReturnType<FilingNoticeStepRepository["persistFilingNoticeStep"]>>[];
};

export type DerivePacketNoticeStepsInput = {
  actor_ref: string;
  approval_state?: FilingPacketApprovalState;
  created_at: string;
  declared_basis_ack_state?: FilingPacketDeclaredBasisAckState;
  packet: FilingPacketRecord;
  repository?: FilingNoticeStepRepository;
  required_approval_refs?: readonly string[];
  runtime_scope: readonly string[];
};

const DEFAULT_REASON_CODES: Record<FilingNoticeStepCode, string[]> = {
  DECLARED_BASIS_ACK_REQUIRED: ["DECLARATION_BASIS_ACK_REQUIRED"],
  DISCLAIMER_ACK_REQUIRED: ["PACKET_DISCLAIMER_ACK_REQUIRED"],
  PACKET_APPROVAL_REQUIRED: ["PACKET_APPROVAL_REQUIRED"],
};

function reasonCodesForStep(input: {
  packet: FilingPacketRecord;
  required_approval_refs: readonly string[];
  step_code: FilingNoticeStepCode;
}) {
  const defaults = DEFAULT_REASON_CODES[input.step_code];
  if (input.step_code === "DISCLAIMER_ACK_REQUIRED") {
    return [...defaults, ...input.packet.disclaimers.map((code) => `DISCLAIMER:${code}`)];
  }
  if (input.step_code === "PACKET_APPROVAL_REQUIRED") {
    return [...defaults, ...input.required_approval_refs.map((ref) => `REQUIRED_APPROVAL:${ref}`)];
  }
  return defaults;
}

function stepLifecycle(input: {
  approval_state: FilingPacketApprovalState;
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState;
  step_code: FilingNoticeStepCode;
}) {
  if (
    input.step_code === "DECLARED_BASIS_ACK_REQUIRED" &&
    input.declared_basis_ack_state === "UNSATISFIABLE"
  ) {
    return "UNSATISFIABLE" as const;
  }
  if (
    input.step_code === "PACKET_APPROVAL_REQUIRED" &&
    (input.approval_state === "UNSATISFIABLE" || input.approval_state === "DENIED")
  ) {
    return "UNSATISFIABLE" as const;
  }
  return "PENDING" as const;
}

function deriveStepCodes(input: {
  approval_state: FilingPacketApprovalState;
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState;
  packet: FilingPacketRecord;
  required_approval_refs: readonly string[];
}) {
  const codes: FilingNoticeStepCode[] = [];
  if (["REQUIRED_PENDING", "UNSATISFIABLE"].includes(input.declared_basis_ack_state)) {
    codes.push("DECLARED_BASIS_ACK_REQUIRED");
  }
  if (input.packet.disclaimers.length > 0) {
    codes.push("DISCLAIMER_ACK_REQUIRED");
  }
  if (
    ["REQUIRED_PENDING", "UNSATISFIABLE", "DENIED"].includes(input.approval_state) ||
    input.required_approval_refs.length > 0
  ) {
    codes.push("PACKET_APPROVAL_REQUIRED");
  }
  return codes;
}

function assertExistingRefsAreNotDrifting(packet: FilingPacketRecord, noticeStepRefs: readonly string[]) {
  if (packet.notice_step_refs.length === 0) {
    return;
  }
  if (packet.notice_step_refs.join("\n") !== noticeStepRefs.join("\n")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "existing packet notice_step_refs drift from canonical packet-local notice derivation",
    );
  }
}

export async function derivePacketNoticeSteps(input: DerivePacketNoticeStepsInput) {
  const packet = input.packet;
  if (packet.lifecycle_state !== "PREPARED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "packet-local notice steps may only be derived after BUILD_FILING_PACKET for a PREPARED packet",
    );
  }
  const createdAt = normalizeTimestamp("created_at", input.created_at);
  const actorRef = requireString("actor_ref", input.actor_ref);
  const scopeRefs = normalizeSortedStringSet("runtime_scope", [...input.runtime_scope, actorRef], {
    minItems: 1,
  });
  const requiredApprovalRefs = normalizeSortedStringSet(
    "required_approval_refs",
    input.required_approval_refs,
  );
  const approvalState = input.approval_state ?? packet.approval_state;
  const declaredBasisAckState = input.declared_basis_ack_state ?? packet.declared_basis_ack_state;
  if (approvalState === null || declaredBasisAckState === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "PREPARED packet notice derivation requires packet-phase approval and declaration acknowledgement states",
    );
  }

  const steps = deriveStepCodes({
    approval_state: approvalState,
    declared_basis_ack_state: declaredBasisAckState,
    packet,
    required_approval_refs: requiredApprovalRefs,
  })
    .map((stepCode) =>
      buildFilingNoticeStepRecord({
        created_at: createdAt,
        lifecycle_state: stepLifecycle({
          approval_state: approvalState,
          declared_basis_ack_state: declaredBasisAckState,
          step_code: stepCode,
        }),
        manifest_id: packet.manifest_id,
        packet_id: packet.packet_id,
        packet_refs: [packet.packet_id, filingPacketRef(packet)],
        reason_codes: reasonCodesForStep({
          packet,
          required_approval_refs: requiredApprovalRefs,
          step_code: stepCode,
        }),
        resolved_at:
          stepLifecycle({
            approval_state: approvalState,
            declared_basis_ack_state: declaredBasisAckState,
            step_code: stepCode,
          }) === "UNSATISFIABLE"
            ? createdAt
            : null,
        scope_refs: scopeRefs,
        step_code: stepCode,
      }),
    )
    .sort(compareFilingNoticeSteps);

  const noticeStepRefs = steps.map((step) => filingNoticeStepRef(step));
  assertExistingRefsAreNotDrifting(packet, noticeStepRefs);
  const repository = input.repository ?? new FilingNoticeStepRepository();
  const storedSteps = [];
  for (const step of steps) {
    validatePacketNoticeStep({ packet, step });
    storedSteps.push(await repository.persistFilingNoticeStep({ step }));
  }
  return {
    notice_step_refs: noticeStepRefs,
    repository,
    steps,
    stored_steps: storedSteps,
  } satisfies DerivedPacketNoticeStepsResult;
}
