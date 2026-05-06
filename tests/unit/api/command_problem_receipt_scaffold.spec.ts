import { expect, test } from "@playwright/test";

import {
  buildApiCommandReceipt,
  buildProblemEnvelope,
  createCommandRequestTruthBoundaryContract,
  evaluateCommandIdempotency,
  evaluateStalePreconditions,
  loadNorthboundPolicyBundle,
  parseCommandEnvelope,
  type NorthboundRouteState,
} from "../../../apps/control-plane-api/src/index.ts";

function manifestRouteState(): NorthboundRouteState {
  return {
    route_scope_class: "MANIFEST_EXPERIENCE",
    publication_generation: 7,
    guard_vector_components: {
      decision_bundle_hash_or_null: "bundle.hash.live",
      shell_stability_token_or_null: "shell.live.7",
      frame_epoch_or_null: 12,
      work_item_version_or_null: null,
      customer_thread_head_or_null: null,
      internal_thread_head_or_null: null,
      request_state_version_or_null: null,
      client_portal_workspace_version_or_null: null,
      view_guard_ref_or_null: "approval.pack.live",
      policy_snapshot_hash_or_null: null,
      dependency_topology_hash_or_null: null,
      simulation_basis_hash_or_null: null,
      mutation_basis_contract_hash_or_null: null,
    },
    last_published_sequence_or_null: 44,
    resume_token_or_null: "resume.manifest.44",
    resume_capability: "STREAM_RESUMABLE",
    latest_refs: {
      decision_bundle_ref_or_null: "decision.bundle.live",
      workspace_snapshot_ref_or_null: null,
      approval_pack_ref_or_null: "approval.pack.live",
      client_portal_workspace_ref_or_null: null,
      upload_session_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      command_receipt_ref_or_null: "receipt.live.previous",
    },
  };
}

test("parses a manifest command, emits an accepted receipt, and preserves the command truth boundary", async () => {
  const bundle = await loadNorthboundPolicyBundle({ reload: true });
  const family = bundle.commandFamiliesByType.get("AMEND_RETURN");
  expect(family).toBeTruthy();

  const parsed = await parseCommandEnvelope(
    {
      artifact_type: "CommandEnvelope",
      command_id: "command.amend.001",
      command_type: "AMEND_RETURN",
      idempotency_key: "idem.amend.001",
      actor_session_ref: "session.operator.17",
      target_scope_class: "MANIFEST",
      tenant_id: "tenant.taxat-sandbox",
      client_id: "client.taxpayer-2001",
      manifest_id: "manifest.case-2026-04-23",
      work_item_id: null,
      governance_target_ref: null,
      period: "2025-26",
      requested_scope: ["income-tax"],
      if_match_decision_bundle_hash: "bundle.hash.live",
      if_match_shell_stability_token: "shell.live.7",
      if_match_frame_epoch: 12,
      if_match_work_item_version: null,
      if_match_internal_head_sequence: null,
      if_match_customer_head_sequence: null,
      if_match_request_state_version: null,
      if_match_approval_pack_hash: null,
      if_match_client_portal_workspace_version: null,
      if_match_policy_snapshot_hash: null,
      if_match_dependency_topology_hash: null,
      simulation_basis_hash: null,
      mutation_basis_contract: null,
      truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
      mutation_precondition_binding: family?.mutation_precondition_binding,
      payload: {
        amendment_kind: "VOLUNTARY",
      },
      requested_at: "2026-04-23T09:00:00.000Z",
    },
    {
      tenant_id: "tenant.taxat-sandbox",
      principal_ref: "principal.operator.caseworker-17",
      session_ref: "session.operator.17",
      client_id_or_null: "client.taxpayer-2001",
    },
    { policyBundle: bundle },
  );

  const accepted = buildApiCommandReceipt({
    parsed,
    acceptedAt: "2026-04-23T09:01:00.000Z",
    acceptanceState: "ACCEPTED",
    expiresAt: "2026-04-23T10:01:00.000Z",
    projectionRefOrNull: "decision.bundle.live",
    projectionSequenceOrNull: 44,
    requestHash: "request.hash.amend.001",
    resultRefOrNull: "result.amend.001",
  });

  expect(accepted.acceptance_state).toBe("ACCEPTED");
  expect(accepted.projection_stream_class).toBe("MANIFEST_EXPERIENCE");
  expect(accepted.truth_boundary_contract.artifact_role).toBe("BOUNDARY_RECEIPT");
  expect(accepted.mutation_precondition_binding.profile_code).toBe("MANIFEST_RENDER_FRAME");
});

test("governance simulation-commit families reject missing basis inputs during parse", async () => {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("ADMIN_STAGE_POLICY_CHANGE");
  await expect(
    parseCommandEnvelope(
      {
        artifact_type: "CommandEnvelope",
        command_id: "command.gov.001",
        command_type: "ADMIN_STAGE_POLICY_CHANGE",
        idempotency_key: "idem.gov.001",
        actor_session_ref: "session.gov.7",
        target_scope_class: "GOVERNANCE",
        tenant_id: "tenant.taxat-sandbox",
        client_id: null,
        manifest_id: null,
        work_item_id: null,
        governance_target_ref: "governance.role-matrix",
        period: null,
        requested_scope: [],
        if_match_decision_bundle_hash: null,
        if_match_shell_stability_token: null,
        if_match_frame_epoch: null,
        if_match_work_item_version: null,
        if_match_internal_head_sequence: null,
        if_match_customer_head_sequence: null,
        if_match_request_state_version: null,
        if_match_approval_pack_hash: null,
        if_match_client_portal_workspace_version: null,
        if_match_policy_snapshot_hash: "policy.snapshot.live",
        if_match_dependency_topology_hash: null,
        simulation_basis_hash: null,
        mutation_basis_contract: null,
        truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
        mutation_precondition_binding: family?.mutation_precondition_binding,
        payload: {
          change_set_ref: "change-set.001",
        },
        requested_at: "2026-04-23T09:15:00.000Z",
      },
      {
        tenant_id: "tenant.taxat-sandbox",
        principal_ref: "principal.admin.7",
        session_ref: "session.gov.7",
        client_id_or_null: null,
      },
      { policyBundle: bundle },
    ),
  ).rejects.toMatchObject({
    problemCode: "GOVERNANCE_SIMULATION_BASIS_REQUIRED",
  });
});

test("stale guard mismatch emits a typed stale problem with the latest decision bundle recovery anchor", async () => {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("AMEND_RETURN");
  const parsed = await parseCommandEnvelope(
    {
      artifact_type: "CommandEnvelope",
      command_id: "command.amend.002",
      command_type: "AMEND_RETURN",
      idempotency_key: "idem.amend.002",
      actor_session_ref: "session.operator.17",
      target_scope_class: "MANIFEST",
      tenant_id: "tenant.taxat-sandbox",
      client_id: "client.taxpayer-2001",
      manifest_id: "manifest.case-2026-04-23",
      work_item_id: null,
      governance_target_ref: null,
      period: "2025-26",
      requested_scope: ["income-tax"],
      if_match_decision_bundle_hash: "bundle.hash.stale",
      if_match_shell_stability_token: "shell.live.7",
      if_match_frame_epoch: 12,
      if_match_work_item_version: null,
      if_match_internal_head_sequence: null,
      if_match_customer_head_sequence: null,
      if_match_request_state_version: null,
      if_match_approval_pack_hash: null,
      if_match_client_portal_workspace_version: null,
      if_match_policy_snapshot_hash: null,
      if_match_dependency_topology_hash: null,
      simulation_basis_hash: null,
      mutation_basis_contract: null,
      truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
      mutation_precondition_binding: family?.mutation_precondition_binding,
      payload: {
        amendment_kind: "VOLUNTARY",
      },
      requested_at: "2026-04-23T09:05:00.000Z",
    },
    {
      tenant_id: "tenant.taxat-sandbox",
      principal_ref: "principal.operator.caseworker-17",
      session_ref: "session.operator.17",
      client_id_or_null: "client.taxpayer-2001",
    },
    { policyBundle: bundle },
  );

  const stale = evaluateStalePreconditions(parsed, manifestRouteState());
  expect(stale.outcome).toBe("STALE");
  if (stale.outcome !== "STALE") {
    throw new Error("expected stale outcome");
  }

  const problem = buildProblemEnvelope({
    problemCode: stale.problemCode,
    policyBundle: bundle,
    correlationId: "corr.amend.002",
    parsed,
    latestCommandReceiptRefOrNull: stale.latestCommandReceiptRefOrNull,
    latestStaleGuardValue: stale.latestStaleGuardValue,
    latestStabilityContractOrNull: stale.routeStabilityContract,
    reasonCodes: stale.reasonCodes,
    routeState: manifestRouteState(),
    staleGuardFamily: stale.staleGuardFamily,
  });

  expect(problem.problem_code).toBe("VIEW_STALE");
  expect(problem.latest_decision_bundle_ref).toBe("decision.bundle.live");
  expect(problem.rebase_required).toBe(true);
  expect(problem.truth_boundary_contract.artifact_role).toBe("BOUNDARY_RECEIPT");
});

test("exact retries reuse the existing receipt while body drift on the same idempotency key becomes a collision", async () => {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("AMEND_RETURN");

  const parse = (payload) =>
    parseCommandEnvelope(
      {
        artifact_type: "CommandEnvelope",
        command_id: "command.amend.003",
        command_type: "AMEND_RETURN",
        idempotency_key: "idem.amend.003",
        actor_session_ref: "session.operator.17",
        target_scope_class: "MANIFEST",
        tenant_id: "tenant.taxat-sandbox",
        client_id: "client.taxpayer-2001",
        manifest_id: "manifest.case-2026-04-23",
        work_item_id: null,
        governance_target_ref: null,
        period: "2025-26",
        requested_scope: ["income-tax"],
        if_match_decision_bundle_hash: "bundle.hash.live",
        if_match_shell_stability_token: "shell.live.7",
        if_match_frame_epoch: 12,
        if_match_work_item_version: null,
        if_match_internal_head_sequence: null,
        if_match_customer_head_sequence: null,
        if_match_request_state_version: null,
        if_match_approval_pack_hash: null,
        if_match_client_portal_workspace_version: null,
        if_match_policy_snapshot_hash: null,
        if_match_dependency_topology_hash: null,
        simulation_basis_hash: null,
        mutation_basis_contract: null,
        truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
        mutation_precondition_binding: family?.mutation_precondition_binding,
        payload,
        requested_at: "2026-04-23T09:08:00.000Z",
      },
      {
        tenant_id: "tenant.taxat-sandbox",
        principal_ref: "principal.operator.caseworker-17",
        session_ref: "session.operator.17",
        client_id_or_null: "client.taxpayer-2001",
      },
      { policyBundle: bundle },
    );

  const baseline = await parse({
    amendment_kind: "VOLUNTARY",
  });
  const accepted = buildApiCommandReceipt({
    parsed: baseline,
    acceptedAt: "2026-04-23T09:09:00.000Z",
    acceptanceState: "ACCEPTED",
    expiresAt: "2026-04-23T10:09:00.000Z",
    projectionRefOrNull: "decision.bundle.live",
    projectionSequenceOrNull: 44,
    requestHash: "request.hash.amend.003",
    resultRefOrNull: "result.amend.003",
  });

  const exactReplay = evaluateCommandIdempotency(baseline, {
    comparableIdentity: evaluateCommandIdempotency(baseline, null).comparableIdentity,
    receipt: accepted,
  });
  expect(exactReplay.outcome).toBe("RETURN_EXISTING_RECEIPT");

  const drifted = await parse({
    amendment_kind: "VOLUNTARY",
    declaration_basis: "revised",
  });
  const collision = evaluateCommandIdempotency(drifted, {
    comparableIdentity: evaluateCommandIdempotency(baseline, null).comparableIdentity,
    receipt: accepted,
  });
  expect(collision.outcome).toBe("IDEMPOTENCY_COLLISION");
});
