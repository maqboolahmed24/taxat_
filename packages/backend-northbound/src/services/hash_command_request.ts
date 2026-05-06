import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";
import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";

export type HashedCommandRequest = {
  duplicate_suppression_key: string;
  request_hash: string;
};

function mutationBasisContractHash(parsed: ParsedCommandEnvelope) {
  return parsed.command.mutation_basis_contract?.basis_contract_hash ?? null;
}

export function hashCommandRequest(parsed: ParsedCommandEnvelope): HashedCommandRequest {
  const request_hash = stableJsonHash({
    contract_version: "NORTHBOUND_COMMAND_REQUEST_HASH_V1",
    actor_session_ref: parsed.command.actor_session_ref,
    client_id: parsed.command.client_id,
    command_id: parsed.command.command_id,
    command_type: parsed.command.command_type,
    governance_target_ref: parsed.command.governance_target_ref,
    guard_bundle: {
      if_match_approval_pack_hash: parsed.command.if_match_approval_pack_hash,
      if_match_client_portal_workspace_version:
        parsed.command.if_match_client_portal_workspace_version,
      if_match_customer_head_sequence: parsed.command.if_match_customer_head_sequence,
      if_match_decision_bundle_hash: parsed.command.if_match_decision_bundle_hash,
      if_match_dependency_topology_hash: parsed.command.if_match_dependency_topology_hash,
      if_match_frame_epoch: parsed.command.if_match_frame_epoch,
      if_match_internal_head_sequence: parsed.command.if_match_internal_head_sequence,
      if_match_policy_snapshot_hash: parsed.command.if_match_policy_snapshot_hash,
      if_match_request_state_version: parsed.command.if_match_request_state_version,
      if_match_shell_stability_token: parsed.command.if_match_shell_stability_token,
      if_match_work_item_version: parsed.command.if_match_work_item_version,
      mutation_basis_contract_hash: mutationBasisContractHash(parsed),
      simulation_basis_hash: parsed.command.simulation_basis_hash,
    },
    idempotency_key: parsed.command.idempotency_key,
    manifest_id: parsed.command.manifest_id,
    mutation_basis_contract: parsed.command.mutation_basis_contract,
    mutation_precondition_binding: parsed.command.mutation_precondition_binding,
    payload: parsed.command.payload,
    period: parsed.command.period,
    requested_at: parsed.command.requested_at,
    requested_scope: parsed.command.requested_scope,
    target_scope_class: parsed.command.target_scope_class,
    tenant_id: parsed.command.tenant_id,
    truth_boundary_contract: parsed.command.truth_boundary_contract,
    work_item_id: parsed.command.work_item_id,
  });

  return {
    request_hash,
    duplicate_suppression_key: stableJsonHash({
      contract_version: "NORTHBOUND_COMMAND_DUPLICATE_SUPPRESSION_V1",
      command_id: parsed.command.command_id,
      idempotency_key: parsed.command.idempotency_key,
      principal_ref: parsed.actorContext.principal_ref,
      request_hash,
      session_ref: parsed.actorContext.session_ref,
      tenant_id: parsed.command.tenant_id,
    }),
  };
}
