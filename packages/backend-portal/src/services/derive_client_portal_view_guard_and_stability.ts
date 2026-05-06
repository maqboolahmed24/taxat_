import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { RouteStabilityContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export function deriveClientPortalViewGuardAndStability(input: {
  publicationGeneration?: number | undefined;
  viewGuardRef?: string | undefined;
  workspaceVersion: number;
}) {
  const viewGuardRef = input.viewGuardRef ?? `view-guard.portal.${input.workspaceVersion}`;
  const guardVectorComponents: RouteStabilityContract["guard_vector_components"] = {
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
    view_guard_ref_or_null: viewGuardRef,
    work_item_version_or_null: null,
  };
  return {
    stability_contract: {
      guard_vector_components: guardVectorComponents,
      guard_vector_hash: stableJsonHash(guardVectorComponents),
      last_published_sequence_or_null: null,
      publication_generation: input.publicationGeneration ?? 0,
      resume_capability: "SNAPSHOT_ONLY",
      resume_token_or_null: null,
      route_scope_class: "CLIENT_PORTAL_ROUTE",
    } satisfies RouteStabilityContract,
    view_guard_ref: viewGuardRef,
    workspace_version: input.workspaceVersion,
  };
}
