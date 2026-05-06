import {
  createCommandRequestTruthBoundaryContract,
  loadNorthboundPolicyBundle,
  type NorthboundActorContext,
  type NorthboundRouteState,
} from "../../../apps/control-plane-api/src/northbound/index.ts";
import type { CommandEnvelope } from "../../../packages/backend-northbound/src/index.ts";

export const fixedNow = new Date("2026-05-03T10:00:00.000Z");

export function actorContext(
  overrides: Partial<NorthboundActorContext> = {},
): NorthboundActorContext {
  return {
    client_id_or_null: "client.taxpayer-2001",
    principal_ref: "principal.caseworker-11",
    session_ref: "session.workspace-1",
    tenant_id: "tenant.taxat-sandbox",
    ...overrides,
  };
}

export function workspaceRouteState(
  overrides: Partial<NorthboundRouteState> = {},
): NorthboundRouteState {
  return {
    guard_vector_components: {
      client_portal_workspace_version_or_null: null,
      customer_thread_head_or_null: 14,
      decision_bundle_hash_or_null: null,
      dependency_topology_hash_or_null: null,
      frame_epoch_or_null: 3,
      internal_thread_head_or_null: 8,
      mutation_basis_contract_hash_or_null: null,
      policy_snapshot_hash_or_null: null,
      request_state_version_or_null: null,
      shell_stability_token_or_null: "workspace.shell.live",
      simulation_basis_hash_or_null: null,
      view_guard_ref_or_null: null,
      work_item_version_or_null: 28,
    },
    last_published_sequence_or_null: 72,
    latest_refs: {
      approval_pack_ref_or_null: null,
      client_portal_workspace_ref_or_null: null,
      command_receipt_ref_or_null: "receipt.workspace.previous",
      decision_bundle_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      upload_session_ref_or_null: null,
      workspace_snapshot_ref_or_null: "workspace.snapshot.live",
    },
    publication_generation: 5,
    resume_capability: "STREAM_RESUMABLE",
    resume_token_or_null: "resume.workspace.72",
    route_scope_class: "WORKSPACE",
    ...overrides,
  };
}

export async function workItemCommandEnvelope(
  overrides: Partial<CommandEnvelope> = {},
): Promise<CommandEnvelope> {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("REQUEST_CUSTOMER_INFO");
  if (!family) {
    throw new Error("REQUEST_CUSTOMER_INFO policy row missing");
  }
  return {
    actor_session_ref: "session.workspace-1",
    artifact_type: "CommandEnvelope",
    client_id: "client.taxpayer-2001",
    command_id: "command.workspace.001",
    command_type: "REQUEST_CUSTOMER_INFO",
    governance_target_ref: null,
    idempotency_key: "idem.workspace.001",
    if_match_approval_pack_hash: null,
    if_match_client_portal_workspace_version: null,
    if_match_customer_head_sequence: 14,
    if_match_decision_bundle_hash: null,
    if_match_dependency_topology_hash: null,
    if_match_frame_epoch: null,
    if_match_internal_head_sequence: null,
    if_match_policy_snapshot_hash: null,
    if_match_request_state_version: null,
    if_match_shell_stability_token: "workspace.shell.live",
    if_match_work_item_version: 28,
    manifest_id: null,
    mutation_basis_contract: null,
    mutation_precondition_binding: family.mutation_precondition_binding,
    payload: {
      prompt_code: "MISSING_DIVIDEND_CERTIFICATE",
    },
    period: null,
    requested_at: "2026-05-03T09:59:00.000Z",
    requested_scope: [],
    simulation_basis_hash: null,
    target_scope_class: "WORK_ITEM",
    tenant_id: "tenant.taxat-sandbox",
    truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
    work_item_id: "work-item.001",
    ...overrides,
  };
}

export async function uploadFinalizeCommandEnvelope(
  payload: CommandEnvelope["payload"],
): Promise<CommandEnvelope> {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("CLIENT_PORTAL_FINALIZE_UPLOAD");
  if (!family) {
    throw new Error("CLIENT_PORTAL_FINALIZE_UPLOAD policy row missing");
  }
  return {
    actor_session_ref: "session.portal-1",
    artifact_type: "CommandEnvelope",
    client_id: "client.taxpayer-2001",
    command_id: "command.portal.upload.001",
    command_type: "CLIENT_PORTAL_FINALIZE_UPLOAD",
    governance_target_ref: null,
    idempotency_key: "idem.portal.upload.001",
    if_match_approval_pack_hash: null,
    if_match_client_portal_workspace_version: 9,
    if_match_customer_head_sequence: null,
    if_match_decision_bundle_hash: null,
    if_match_dependency_topology_hash: null,
    if_match_frame_epoch: null,
    if_match_internal_head_sequence: null,
    if_match_policy_snapshot_hash: null,
    if_match_request_state_version: null,
    if_match_shell_stability_token: null,
    if_match_work_item_version: null,
    manifest_id: "manifest.portal.001",
    mutation_basis_contract: null,
    mutation_precondition_binding: family.mutation_precondition_binding,
    payload,
    period: null,
    requested_at: "2026-05-03T09:59:00.000Z",
    requested_scope: [],
    simulation_basis_hash: null,
    target_scope_class: "MANIFEST",
    tenant_id: "tenant.taxat-sandbox",
    truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
    work_item_id: null,
  };
}
