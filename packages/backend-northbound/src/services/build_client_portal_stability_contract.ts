import {
  buildRouteStabilityContract,
  type NorthboundRouteState,
} from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { deriveAuthoritativeEtag } from "./derive_authoritative_etag.ts";

export function buildClientPortalGuardVectorComponents(input: {
  viewGuardRef: string;
  workspaceVersion: number;
}): RouteStabilityContract["guard_vector_components"] {
  return {
    client_portal_workspace_version_or_null: input.workspaceVersion,
    customer_thread_head_or_null: null,
    decision_bundle_hash_or_null: null,
    dependency_topology_hash_or_null: null,
    frame_epoch_or_null: null,
    internal_thread_head_or_null: null,
    policy_snapshot_hash_or_null: null,
    request_state_version_or_null: null,
    shell_stability_token_or_null: null,
    simulation_basis_hash_or_null: null,
    view_guard_ref_or_null: input.viewGuardRef,
    work_item_version_or_null: null,
  };
}

export function buildClientPortalStabilityContract(input: {
  publicationGeneration: number;
  viewGuardRef: string;
  workspaceVersion: number;
}) {
  const routeState = {
    guard_vector_components: buildClientPortalGuardVectorComponents(input),
    last_published_sequence_or_null: null,
    latest_refs: {
      approval_pack_ref_or_null: null,
      client_portal_workspace_ref_or_null: `client-portal-workspace://${input.workspaceVersion}`,
      command_receipt_ref_or_null: null,
      decision_bundle_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      upload_session_ref_or_null: null,
      workspace_snapshot_ref_or_null: null,
    },
    publication_generation: input.publicationGeneration,
    resume_capability: "SNAPSHOT_ONLY",
    resume_token_or_null: null,
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  } satisfies NorthboundRouteState;
  return buildRouteStabilityContract(routeState);
}

function normalizeIfNoneMatchToken(token: string) {
  const trimmed = token.trim();
  if (trimmed.startsWith("W/")) {
    return null;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function applyClientPortalWorkspaceConditionalRequest(input: {
  ifNoneMatch?: string | null;
  workspaceVersion: number;
}) {
  const etag = deriveAuthoritativeEtag({
    basis: "GUARD_VALUE",
    staleGuardFamily: "CLIENT_PORTAL_WORKSPACE_VERSION",
    value: input.workspaceVersion,
  });
  if (input.ifNoneMatch === undefined || input.ifNoneMatch === null) {
    return {
      etag,
      status: "SEND_BODY" as const,
    };
  }
  const matches = input.ifNoneMatch
    .split(",")
    .map(normalizeIfNoneMatchToken)
    .some((token) => token === etag);
  return {
    etag,
    status: matches ? ("NOT_MODIFIED" as const) : ("SEND_BODY" as const),
  };
}
