import {
  buildRouteStabilityContract,
  type NorthboundRouteState,
} from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export function buildManifestRouteGuardVectorComponents(input: {
  decisionBundleHash: string;
  frameEpoch: number;
  shellStabilityToken: string;
}): RouteStabilityContract["guard_vector_components"] {
  return {
    client_portal_workspace_version_or_null: null,
    customer_thread_head_or_null: null,
    decision_bundle_hash_or_null: input.decisionBundleHash,
    dependency_topology_hash_or_null: null,
    frame_epoch_or_null: input.frameEpoch,
    internal_thread_head_or_null: null,
    policy_snapshot_hash_or_null: null,
    request_state_version_or_null: null,
    shell_stability_token_or_null: input.shellStabilityToken,
    simulation_basis_hash_or_null: null,
    view_guard_ref_or_null: null,
    work_item_version_or_null: null,
  };
}

export function buildManifestRouteStabilityContract(input: {
  decisionBundleHash: string;
  frameEpoch: number;
  lastPublishedSequence: number;
  publicationGeneration: number;
  resumeToken: string;
  shellStabilityToken: string;
}) {
  const routeState = {
    guard_vector_components: buildManifestRouteGuardVectorComponents(input),
    last_published_sequence_or_null: input.lastPublishedSequence,
    latest_refs: {
      approval_pack_ref_or_null: null,
      client_portal_workspace_ref_or_null: null,
      command_receipt_ref_or_null: null,
      decision_bundle_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      upload_session_ref_or_null: null,
      workspace_snapshot_ref_or_null: null,
    },
    publication_generation: input.publicationGeneration,
    resume_capability: "STREAM_RESUMABLE",
    resume_token_or_null: input.resumeToken,
    route_scope_class: "MANIFEST_EXPERIENCE",
  } satisfies NorthboundRouteState;
  return buildRouteStabilityContract(routeState);
}
