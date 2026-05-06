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

function workspaceRouteState(): NorthboundRouteState {
  return {
    route_scope_class: "WORKSPACE",
    publication_generation: 5,
    guard_vector_components: {
      decision_bundle_hash_or_null: null,
      shell_stability_token_or_null: "workspace.shell.live",
      frame_epoch_or_null: null,
      work_item_version_or_null: 28,
      customer_thread_head_or_null: 14,
      internal_thread_head_or_null: 8,
      request_state_version_or_null: 3,
      client_portal_workspace_version_or_null: null,
      view_guard_ref_or_null: null,
      policy_snapshot_hash_or_null: null,
      dependency_topology_hash_or_null: null,
      simulation_basis_hash_or_null: null,
      mutation_basis_contract_hash_or_null: null,
    },
    last_published_sequence_or_null: 72,
    resume_token_or_null: "resume.workspace.72",
    resume_capability: "STREAM_RESUMABLE",
    latest_refs: {
      decision_bundle_ref_or_null: null,
      workspace_snapshot_ref_or_null: "workspace.snapshot.live",
      approval_pack_ref_or_null: null,
      client_portal_workspace_ref_or_null: null,
      upload_session_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      command_receipt_ref_or_null: "receipt.workspace.previous",
    },
  };
}

test("accepted work-item command can be replayed safely without allocating a second receipt", async () => {
  const bundle = await loadNorthboundPolicyBundle({ reload: true });
  const family = bundle.commandFamiliesByType.get("REQUEST_CUSTOMER_INFO");

  const parsed = await parseCommandEnvelope(
    {
      artifact_type: "CommandEnvelope",
      command_id: "command.workspace.001",
      command_type: "REQUEST_CUSTOMER_INFO",
      idempotency_key: "idem.workspace.001",
      actor_session_ref: "session.workspace.1",
      target_scope_class: "WORK_ITEM",
      tenant_id: "tenant.taxat-sandbox",
      client_id: "client.taxpayer-2001",
      manifest_id: null,
      work_item_id: "work-item.001",
      governance_target_ref: null,
      period: null,
      requested_scope: [],
      if_match_decision_bundle_hash: null,
      if_match_shell_stability_token: "workspace.shell.live",
      if_match_frame_epoch: null,
      if_match_work_item_version: 28,
      if_match_internal_head_sequence: null,
      if_match_customer_head_sequence: 14,
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
        prompt_code: "MISSING_DIVIDEND_CERTIFICATE",
      },
      requested_at: "2026-04-23T10:00:00.000Z",
    },
    {
      tenant_id: "tenant.taxat-sandbox",
      principal_ref: "principal.caseworker.11",
      session_ref: "session.workspace.1",
      client_id_or_null: "client.taxpayer-2001",
    },
    { policyBundle: bundle },
  );

  const stale = evaluateStalePreconditions(parsed, workspaceRouteState());
  expect(stale.outcome).toBe("CURRENT");

  const firstAttempt = evaluateCommandIdempotency(parsed, null);
  expect(firstAttempt.outcome).toBe("ACCEPT_NEW");
  if (firstAttempt.outcome !== "ACCEPT_NEW") {
    throw new Error("expected first attempt to be accepted");
  }

  const receipt = buildApiCommandReceipt({
    parsed,
    acceptedAt: "2026-04-23T10:01:00.000Z",
    acceptanceState: "ACCEPTED",
    expiresAt: "2026-04-23T11:01:00.000Z",
    projectionRefOrNull: "workspace.snapshot.live",
    projectionSequenceOrNull: 72,
    requestHash: firstAttempt.requestHash,
    resultRefOrNull: "request-info.record.001",
  });

  const replay = evaluateCommandIdempotency(parsed, {
    comparableIdentity: firstAttempt.comparableIdentity,
    receipt,
  });

  expect(replay.outcome).toBe("RETURN_EXISTING_RECEIPT");
  if (replay.outcome !== "RETURN_EXISTING_RECEIPT") {
    throw new Error("expected replay");
  }
  expect(replay.existingReceipt.receipt_id).toBe(receipt.receipt_id);
});

test("route-stability mismatch after a stale UI action emits a rebase-required problem", async () => {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("ADD_INTERNAL_NOTE");
  const parsed = await parseCommandEnvelope(
    {
      artifact_type: "CommandEnvelope",
      command_id: "command.workspace.002",
      command_type: "ADD_INTERNAL_NOTE",
      idempotency_key: "idem.workspace.002",
      actor_session_ref: "session.workspace.1",
      target_scope_class: "WORK_ITEM",
      tenant_id: "tenant.taxat-sandbox",
      client_id: "client.taxpayer-2001",
      manifest_id: null,
      work_item_id: "work-item.001",
      governance_target_ref: null,
      period: null,
      requested_scope: [],
      if_match_decision_bundle_hash: null,
      if_match_shell_stability_token: "workspace.shell.stale",
      if_match_frame_epoch: null,
      if_match_work_item_version: 28,
      if_match_internal_head_sequence: 8,
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
        note: "Need one more authority confirmation.",
      },
      requested_at: "2026-04-23T10:10:00.000Z",
    },
    {
      tenant_id: "tenant.taxat-sandbox",
      principal_ref: "principal.caseworker.11",
      session_ref: "session.workspace.1",
      client_id_or_null: "client.taxpayer-2001",
    },
    { policyBundle: bundle },
  );

  const stale = evaluateStalePreconditions(parsed, workspaceRouteState());
  expect(stale.outcome).toBe("STALE");
  if (stale.outcome !== "STALE") {
    throw new Error("expected stale route");
  }

  const problem = buildProblemEnvelope({
    problemCode: stale.problemCode,
    policyBundle: bundle,
    correlationId: "corr.workspace.002",
    parsed,
    latestCommandReceiptRefOrNull: stale.latestCommandReceiptRefOrNull,
    latestStaleGuardValue: stale.latestStaleGuardValue,
    latestStabilityContractOrNull: stale.routeStabilityContract,
    reasonCodes: stale.reasonCodes,
    routeState: workspaceRouteState(),
    staleGuardFamily: stale.staleGuardFamily,
  });

  expect(problem.problem_code).toBe("REBASE_REQUIRED");
  expect(problem.latest_workspace_snapshot_ref).toBe("workspace.snapshot.live");
  expect(problem.latest_stability_contract_or_null?.resume_capability).toBe("STREAM_RESUMABLE");
});

test("idempotency collision becomes a typed problem instead of speculative acceptance", async () => {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("REQUEST_CUSTOMER_INFO");

  const parse = (payload) =>
    parseCommandEnvelope(
      {
        artifact_type: "CommandEnvelope",
        command_id: "command.workspace.003",
        command_type: "REQUEST_CUSTOMER_INFO",
        idempotency_key: "idem.workspace.003",
        actor_session_ref: "session.workspace.1",
        target_scope_class: "WORK_ITEM",
        tenant_id: "tenant.taxat-sandbox",
        client_id: "client.taxpayer-2001",
        manifest_id: null,
        work_item_id: "work-item.001",
        governance_target_ref: null,
        period: null,
        requested_scope: [],
        if_match_decision_bundle_hash: null,
        if_match_shell_stability_token: "workspace.shell.live",
        if_match_frame_epoch: null,
        if_match_work_item_version: 28,
        if_match_internal_head_sequence: null,
        if_match_customer_head_sequence: 14,
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
        requested_at: "2026-04-23T10:20:00.000Z",
      },
      {
        tenant_id: "tenant.taxat-sandbox",
        principal_ref: "principal.caseworker.11",
        session_ref: "session.workspace.1",
        client_id_or_null: "client.taxpayer-2001",
      },
      { policyBundle: bundle },
    );

  const baseline = await parse({
    prompt_code: "MISSING_DIVIDEND_CERTIFICATE",
  });
  const accepted = evaluateCommandIdempotency(baseline, null);
  if (accepted.outcome !== "ACCEPT_NEW") {
    throw new Error("expected accepted baseline");
  }
  const receipt = buildApiCommandReceipt({
    parsed: baseline,
    acceptedAt: "2026-04-23T10:21:00.000Z",
    acceptanceState: "ACCEPTED",
    expiresAt: "2026-04-23T11:21:00.000Z",
    projectionRefOrNull: "workspace.snapshot.live",
    projectionSequenceOrNull: 72,
    requestHash: accepted.requestHash,
    resultRefOrNull: "request-info.record.002",
  });

  const drifted = await parse({
    prompt_code: "MISSING_DIVIDEND_CERTIFICATE",
    urgency: "HIGH",
  });
  const collision = evaluateCommandIdempotency(drifted, {
    comparableIdentity: accepted.comparableIdentity,
    receipt,
  });
  expect(collision.outcome).toBe("IDEMPOTENCY_COLLISION");
  if (collision.outcome !== "IDEMPOTENCY_COLLISION") {
    throw new Error("expected collision");
  }

  const problem = buildProblemEnvelope({
    problemCode: "IDEMPOTENCY_COLLISION",
    policyBundle: bundle,
    correlationId: "corr.workspace.003",
    parsed: drifted,
    latestCommandReceiptRefOrNull: collision.existingReceiptRefOrNull,
    reasonCodes: collision.reasonCodes,
  });

  expect(problem.problem_code).toBe("IDEMPOTENCY_COLLISION");
  expect(problem.actionability_state).toBe("ACTION_AVAILABLE");
  expect(problem.latest_command_receipt_ref).toBe(receipt.receipt_id);
});
