import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";

import {
  createCommandRequestTruthBoundaryContract,
  loadNorthboundPolicyBundle,
  type NorthboundActorContext,
  type NorthboundRouteState,
} from "../../../apps/control-plane-api/src/northbound/index.ts";
import {
  ApiCommandReceiptRepository,
  registerPostCommandsRoute,
  type CommandEnvelope,
  type PostCommandsRouteHandler,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

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
    command_id: "command.approval.sign.api.001",
    command_type: "CLIENT_PORTAL_SIGN_APPROVAL_PACK",
    governance_target_ref: null,
    idempotency_key: "idem.approval.sign.api.001",
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

async function commandsHttpHarness() {
  let handler: PostCommandsRouteHandler | null = null;
  registerPostCommandsRoute(
    {
      post: (_path, routeHandler) => {
        handler = routeHandler;
      },
    },
    {
      clock: () => new Date("2026-05-04T09:12:00.000Z"),
      receiptRepository: new ApiCommandReceiptRepository(),
      routeStateResolver: () => approvalRouteState(),
    },
  );
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    if ((request.method ?? "GET") !== "POST" || request.url !== "/v1/commands") {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ problem_code: "HTTP_ROUTE_INVALID" }));
      return;
    }
    const bodyBytes = await readRequestBody(request);
    const result = await handler!({
      actorContext: actorContext(),
      body: JSON.parse(bodyBytes.toString("utf8")),
      correlationId: "corr.api.approval.sign.stale",
      method: "POST",
      path: "/v1/commands",
    });
    response.writeHead(result.status, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify(result.body));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test("POST /v1/commands stale approval sign-off returns typed approval-pack recovery", async ({
  request,
}) => {
  const harness = await commandsHttpHarness();
  try {
    const response = await request.post(`${harness.baseUrl}/v1/commands`, {
      data: await staleSignApprovalCommand(),
    });
    expect(response.status()).toBe(409);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const problem = await response.json();
    expect(problem.artifact_type).toBe("ProblemEnvelope");
    expect(problem.problem_code).toBe("VIEW_STALE");
    expect(problem.latest_approval_pack_ref).toBe("approval.pack.v2");
    expect(problem.stale_guard_family).toBe("APPROVAL_PACK_HASH");
    expect(problem.latest_stale_guard_value).toBe("approval.hash.v2");
    expect(problem.reason_codes).toContain("APPROVAL_PACK_HASH_MISMATCH");
    expect(problem.suggested_detail_surface_code).toBe("CUSTOMER_ACTIVITY");
    await validateContractSchema("problem_envelope", problem);
  } finally {
    await harness.close();
  }
});

