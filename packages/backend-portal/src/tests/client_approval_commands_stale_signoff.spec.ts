import { expect, test } from "@playwright/test";

import {
  createCommandRequestTruthBoundaryContract,
  loadNorthboundPolicyBundle,
  type NorthboundActorContext,
  type NorthboundRouteState,
} from "../../../../apps/control-plane-api/src/northbound/index.ts";
import {
  ApiCommandReceiptRepository,
  postCommandsEndpoint,
  type CommandEnvelope,
} from "../../../backend-northbound/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function actorContext(): NorthboundActorContext {
  return {
    client_id_or_null: "client.approval-1",
    principal_ref: "principal.client-signatory-1",
    session_ref: "session.portal-approval-1",
    tenant_id: "tenant.approval-1",
  };
}

function approvalRouteState(): NorthboundRouteState {
  return {
    guard_vector_components: {
      client_portal_workspace_version_or_null: 22,
      customer_thread_head_or_null: null,
      decision_bundle_hash_or_null: null,
      dependency_topology_hash_or_null: null,
      frame_epoch_or_null: null,
      internal_thread_head_or_null: null,
      mutation_basis_contract_hash_or_null: null,
      policy_snapshot_hash_or_null: null,
      request_state_version_or_null: null,
      shell_stability_token_or_null: null,
      simulation_basis_hash_or_null: null,
      view_guard_ref_or_null: "approval.hash.v2",
      work_item_version_or_null: null,
    },
    last_published_sequence_or_null: null,
    latest_refs: {
      approval_pack_ref_or_null: "approval.pack.v2",
      client_portal_workspace_ref_or_null: null,
      command_receipt_ref_or_null: null,
      decision_bundle_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      upload_session_ref_or_null: null,
      workspace_snapshot_ref_or_null: null,
    },
    publication_generation: 7,
    resume_capability: "SNAPSHOT_ONLY",
    resume_token_or_null: null,
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  };
}

async function staleSignApprovalCommand(): Promise<CommandEnvelope> {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("CLIENT_PORTAL_SIGN_APPROVAL_PACK");
  if (!family) {
    throw new Error("CLIENT_PORTAL_SIGN_APPROVAL_PACK policy row missing");
  }
  return {
    actor_session_ref: "session.portal-approval-1",
    artifact_type: "CommandEnvelope",
    client_id: "client.approval-1",
    command_id: "command.approval.sign.001",
    command_type: "CLIENT_PORTAL_SIGN_APPROVAL_PACK",
    governance_target_ref: null,
    idempotency_key: "idem.approval.sign.001",
    if_match_approval_pack_hash: "approval.hash.v1",
    if_match_client_portal_workspace_version: null,
    if_match_customer_head_sequence: null,
    if_match_decision_bundle_hash: "decision.approval.current",
    if_match_dependency_topology_hash: null,
    if_match_frame_epoch: 7,
    if_match_internal_head_sequence: null,
    if_match_policy_snapshot_hash: null,
    if_match_request_state_version: null,
    if_match_shell_stability_token: "shell.approval.current",
    if_match_work_item_version: null,
    manifest_id: "manifest.approval-1",
    mutation_basis_contract: null,
    mutation_precondition_binding: family.mutation_precondition_binding,
    payload: {
      approval_pack_id: "approval.pack.v1",
      step_up_proof_ref: "step-up.proof.fresh",
    },
    period: null,
    requested_at: "2026-05-04T09:11:00.000Z",
    requested_scope: [],
    simulation_basis_hash: null,
    target_scope_class: "MANIFEST",
    tenant_id: "tenant.approval-1",
    truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
    work_item_id: null,
  };
}

test("stale approval sign-off rejects with latest pack ref and approval-pack guard metadata", async () => {
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await staleSignApprovalCommand(),
      correlationId: "corr.approval.sign.stale",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => new Date("2026-05-04T09:12:00.000Z"),
      receiptRepository: new ApiCommandReceiptRepository(),
      routeStateResolver: () => approvalRouteState(),
    },
  );

  expect(response.status).toBe(409);
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("VIEW_STALE");
  expect(response.body.latest_approval_pack_ref).toBe("approval.pack.v2");
  expect(response.body.stale_guard_family).toBe("APPROVAL_PACK_HASH");
  expect(response.body.latest_stale_guard_value).toBe("approval.hash.v2");
  expect(response.body.reason_codes).toContain("APPROVAL_PACK_HASH_MISMATCH");
  expect(response.body.rebase_required).toBe(true);
  expect(response.body.mutation_precondition_binding_or_null).toMatchObject({
    profile_code: "MANIFEST_APPROVAL_PACK_REVIEW",
    stale_guard_families: [
      "DECISION_BUNDLE_HASH",
      "SHELL_STABILITY_TOKEN",
      "FRAME_EPOCH",
      "APPROVAL_PACK_HASH",
    ],
  });
  expect(response.body.latest_stability_contract_or_null).toMatchObject({
    guard_vector_components: expect.objectContaining({
      client_portal_workspace_version_or_null: 22,
      view_guard_ref_or_null: "approval.hash.v2",
    }),
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  });
  expect(response.body.actionability_state).toBe("NO_SAFE_ACTION");
  expect(response.body.suggested_detail_surface_code).not.toBeNull();

  await validateContractSchema("problem_envelope", response.body);
});
