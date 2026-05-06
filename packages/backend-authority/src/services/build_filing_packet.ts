import {
  AuthorityModelError,
  buildStateTransitionContract,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import { type FilingCaseRecord } from "../models/filing_case.ts";
import {
  buildFilingPacketRecord,
  type FilingPacketApprovalState,
  type FilingPacketDeclaredBasisAckState,
  type FilingPacketLifecycleState,
} from "../models/filing_packet.ts";
import { FilingPacketRepository } from "../repositories/filing_packet_repository.ts";
import type { AuthorityCalculationReadinessContextRecord } from "../models/authority_calculation_readiness_context.ts";
import type { AuthorityCalculationRequestRecord } from "../models/authority_calculation_request.ts";
import type { AuthorityCalculationResultRecord } from "../models/authority_calculation_result.ts";
import type { CalculationBasisRecord } from "../models/calculation_basis.ts";
import type { CalculationUserConfirmationRecord } from "../models/calculation_user_confirmation.ts";
import { verifyCalculationHandshakeIntegrity } from "./verify_calculation_handshake_integrity.ts";

export type BuildFilingPacketInput = {
  approval_state?: FilingPacketApprovalState;
  approved_at?: string | null;
  calculation_handshake?: {
    baseline_hash?: string | null;
    basis: CalculationBasisRecord;
    confirmation: CalculationUserConfirmationRecord;
    expected_handshake_hash?: string | null;
    readiness_context: AuthorityCalculationReadinessContextRecord;
    request: AuthorityCalculationRequestRecord;
    result: AuthorityCalculationResultRecord;
  };
  declared_basis: string;
  declared_basis_ack_state?: FilingPacketDeclaredBasisAckState;
  disclaimers?: readonly string[];
  filing_case: FilingCaseRecord;
  filing_gate_override_ref?: string | null;
  filing_gate_ref?: string | null;
  lifecycle_state?: Extract<FilingPacketLifecycleState, "DRAFT" | "PREPARED" | "APPROVED_TO_SUBMIT">;
  manifest_binding_hash: string;
  notice_resolution_ref?: string | null;
  notice_step_refs?: readonly string[];
  packet_id?: string;
  payload_hash: string;
  payload_ref: string;
  repository?: FilingPacketRepository;
  state_changed_at: string;
};

function ensureApprovalEligibility(input: BuildFilingPacketInput) {
  const filingCase = input.filing_case;
  if (filingCase.trust_currency_state !== "CURRENT") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT packet requires CURRENT filing-case trust",
    );
  }
  if (
    (!filingCase.current_trust_ref || !filingCase.current_parity_ref) &&
    !input.filing_gate_override_ref
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT packet requires trust/parity refs or an explicit filing gate override",
    );
  }
  if (!input.filing_gate_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT packet requires a bound filing_gate_ref",
    );
  }
  if (filingCase.proof_closure_state !== "CLOSED" || !filingCase.controlling_proof_bundle_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT packet requires closed controlling proof bundle from the filing case",
    );
  }
  if ((input.notice_step_refs ?? []).length > 0 && !input.notice_resolution_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT packet with notice steps requires notice_resolution_ref",
    );
  }
}

export async function buildFilingPacket(input: BuildFilingPacketInput) {
  const repository = input.repository ?? new FilingPacketRepository();
  const filingCase = input.filing_case;
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const lifecycleState = input.lifecycle_state ?? "PREPARED";
  if (lifecycleState === "APPROVED_TO_SUBMIT") {
    ensureApprovalEligibility(input);
  }
  if (filingCase.readiness_context_ref !== null && input.calculation_handshake === undefined) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing packet build with calculation lineage requires a verified calculation handshake tuple",
    );
  }
  if (input.calculation_handshake !== undefined) {
    const verified = verifyCalculationHandshakeIntegrity(input.calculation_handshake);
    if (
      verified.calculation_readiness_context_ref !== filingCase.readiness_context_ref ||
      verified.calculation_request_ref !== filingCase.calculation_request_ref ||
      verified.calculation_ref !== filingCase.authority_calculation_ref ||
      verified.calculation_basis_ref !== filingCase.calculation_basis_ref ||
      verified.user_confirmation_ref !== filingCase.user_confirmation_ref ||
      verified.calculation_id !== filingCase.calculation_id
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing case calculation lineage does not match verified handshake tuple",
      );
    }
  }
  const packet = buildFilingPacketRecord({
    approval_state:
      input.approval_state ??
      (lifecycleState === "APPROVED_TO_SUBMIT" ? "SATISFIED" : lifecycleState === "PREPARED" ? "REQUIRED_PENDING" : null),
    approved_at: lifecycleState === "APPROVED_TO_SUBMIT" ? input.approved_at ?? stateChangedAt : null,
    authority_calculation_ref: filingCase.authority_calculation_ref,
    calculation_basis_ref: filingCase.calculation_basis_ref,
    controlling_proof_bundle_ref:
      lifecycleState === "DRAFT" ? null : filingCase.controlling_proof_bundle_ref,
    created_at: stateChangedAt,
    declared_basis: input.declared_basis,
    declared_basis_ack_state:
      input.declared_basis_ack_state ??
      (lifecycleState === "APPROVED_TO_SUBMIT" ? "SATISFIED" : lifecycleState === "PREPARED" ? "REQUIRED_PENDING" : null),
    disclaimers: input.disclaimers ?? [],
    execution_mode_boundary_contract: filingCase.execution_mode_boundary_contract,
    filing_gate_ref: lifecycleState === "APPROVED_TO_SUBMIT" ? requireString("filing_gate_ref", input.filing_gate_ref) : null,
    lifecycle_state: lifecycleState,
    manifest_binding_hash: input.manifest_binding_hash,
    manifest_id: requireString("current_manifest_ref", filingCase.current_manifest_ref),
    notice_resolution_ref: input.notice_resolution_ref ?? null,
    notice_step_refs: input.notice_step_refs ?? [],
    packet_id: input.packet_id,
    payload_hash: input.payload_hash,
    payload_ref: input.payload_ref,
    proof_closure_state:
      lifecycleState === "DRAFT"
        ? "NOT_APPLICABLE"
        : lifecycleState === "APPROVED_TO_SUBMIT"
          ? "CLOSED"
          : filingCase.proof_closure_state,
    readiness_context_ref: filingCase.readiness_context_ref,
    state_changed_at: stateChangedAt,
    state_transition_contract: buildStateTransitionContract({
      current_state: lifecycleState,
      object_family: "FILING_PACKET",
      previous_state_or_null: null,
      transition_applied_at: stateChangedAt,
      transition_event_code: lifecycleState === "APPROVED_TO_SUBMIT" ? "approval_complete" : "packet_build_complete",
    }),
    user_confirmation_ref: filingCase.user_confirmation_ref,
  });
  const stored = await repository.persistFilingPacket({ packet });
  return { packet, repository, stored };
}
