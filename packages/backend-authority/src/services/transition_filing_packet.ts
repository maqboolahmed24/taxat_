import { AuthorityModelError, buildStateTransitionContract, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import {
  buildFilingPacketRecord,
  type FilingPacketApprovalState,
  type FilingPacketDeclaredBasisAckState,
  type FilingPacketLifecycleState,
  type FilingPacketRecord,
} from "../models/filing_packet.ts";
import { FilingPacketRepository } from "../repositories/filing_packet_repository.ts";

export type FilingPacketTransitionEvent =
  | "packet_build_complete"
  | "approval_complete"
  | "submit_begin"
  | "packet_invalidated"
  | "rebuilt_under_new_manifest";

export type TransitionFilingPacketInput = {
  approval_state?: FilingPacketApprovalState | null;
  approved_at?: string | null;
  current: FilingPacketRecord;
  declared_basis_ack_state?: FilingPacketDeclaredBasisAckState | null;
  event: FilingPacketTransitionEvent;
  filing_gate_ref?: string | null;
  notice_resolution_ref?: string | null;
  notice_step_refs?: readonly string[];
  repository?: FilingPacketRepository;
  state_changed_at: string;
  submitted_at?: string | null;
  superseded_at?: string | null;
  voided_at?: string | null;
};

const ALLOWED: Record<FilingPacketLifecycleState, FilingPacketTransitionEvent[]> = {
  APPROVED_TO_SUBMIT: ["submit_begin", "packet_invalidated", "rebuilt_under_new_manifest"],
  DRAFT: ["packet_build_complete"],
  PREPARED: ["approval_complete", "packet_invalidated", "rebuilt_under_new_manifest"],
  SUBMITTED: [],
  SUPERSEDED: [],
  VOID: [],
};

const TARGET: Record<FilingPacketTransitionEvent, FilingPacketLifecycleState> = {
  approval_complete: "APPROVED_TO_SUBMIT",
  packet_build_complete: "PREPARED",
  packet_invalidated: "VOID",
  rebuilt_under_new_manifest: "SUPERSEDED",
  submit_begin: "SUBMITTED",
};

function ensureAllowed(current: FilingPacketRecord, event: FilingPacketTransitionEvent) {
  if (!ALLOWED[current.lifecycle_state].includes(event)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${current.lifecycle_state} packet cannot transition with ${event}`,
    );
  }
}

export async function transitionFilingPacket(input: TransitionFilingPacketInput) {
  ensureAllowed(input.current, input.event);
  const repository = input.repository ?? new FilingPacketRepository();
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const target = TARGET[input.event];
  const approvedAt = target === "APPROVED_TO_SUBMIT"
    ? normalizeTimestamp("approved_at", input.approved_at ?? stateChangedAt)
    : input.current.approved_at;
  const packet = buildFilingPacketRecord({
    ...input.current,
    approval_state:
      target === "APPROVED_TO_SUBMIT" || target === "SUBMITTED"
        ? input.approval_state ?? "SATISFIED"
        : target === "PREPARED"
          ? input.current.approval_state ?? "REQUIRED_PENDING"
          : input.current.approval_state,
    approved_at: target === "VOID" || target === "SUPERSEDED" ? null : approvedAt,
    declared_basis_ack_state:
      target === "APPROVED_TO_SUBMIT" || target === "SUBMITTED"
        ? input.declared_basis_ack_state ?? "SATISFIED"
        : target === "PREPARED"
          ? input.current.declared_basis_ack_state ?? "REQUIRED_PENDING"
          : input.current.declared_basis_ack_state,
    filing_gate_ref:
      target === "APPROVED_TO_SUBMIT" || target === "SUBMITTED"
        ? requireString("filing_gate_ref", input.filing_gate_ref ?? input.current.filing_gate_ref)
        : input.current.filing_gate_ref,
    lifecycle_state: target,
    notice_resolution_ref:
      target === "APPROVED_TO_SUBMIT" || target === "SUBMITTED"
        ? input.notice_resolution_ref ?? input.current.notice_resolution_ref
        : input.current.notice_resolution_ref,
    notice_step_refs: input.notice_step_refs ?? input.current.notice_step_refs,
    proof_closure_state:
      target === "APPROVED_TO_SUBMIT" || target === "SUBMITTED"
        ? "CLOSED"
        : input.current.proof_closure_state,
    state_changed_at: stateChangedAt,
    state_transition_contract: buildStateTransitionContract({
      current_state: target,
      object_family: "FILING_PACKET",
      previous_state_or_null: input.current.lifecycle_state,
      transition_applied_at: stateChangedAt,
      transition_event_code: input.event,
    }),
    submitted_at: target === "SUBMITTED" ? normalizeTimestamp("submitted_at", input.submitted_at ?? stateChangedAt) : null,
    superseded_at: target === "SUPERSEDED" ? normalizeTimestamp("superseded_at", input.superseded_at ?? stateChangedAt) : null,
    voided_at: target === "VOID" ? normalizeTimestamp("voided_at", input.voided_at ?? stateChangedAt) : null,
  });
  const stored = await repository.persistFilingPacket({ packet });
  return { packet, repository, stored };
}
