export type RouteScopeClass =
  | "MANIFEST_EXPERIENCE"
  | "WORKSPACE"
  | "CLIENT_PORTAL_ROUTE"
  | "GOVERNANCE_ROUTE";

export type ResumeCapability = "STREAM_RESUMABLE" | "SNAPSHOT_ONLY" | "ACCESS_REBIND_REQUIRED";

export type RouteGuardVectorComponents = {
  decision_bundle_hash_or_null: string | null;
  shell_stability_token_or_null: string | null;
  frame_epoch_or_null: number | null;
  work_item_version_or_null: number | null;
  customer_thread_head_or_null: number | null;
  internal_thread_head_or_null: number | null;
  request_state_version_or_null: number | null;
  client_portal_workspace_version_or_null: number | null;
  view_guard_ref_or_null: string | null;
  policy_snapshot_hash_or_null: string | null;
  dependency_topology_hash_or_null: string | null;
  simulation_basis_hash_or_null: string | null;
  mutation_basis_contract_hash_or_null?: string | null;
};

export type RouteStabilityContract = {
  route_scope_class: RouteScopeClass;
  publication_generation: number;
  guard_vector_hash: string;
  guard_vector_components: RouteGuardVectorComponents;
  last_published_sequence_or_null: number | null;
  resume_token_or_null: string | null;
  resume_capability: ResumeCapability;
};

export function routeStabilityCanResume(contract: RouteStabilityContract) {
  return (
    contract.resume_capability === "STREAM_RESUMABLE" &&
    contract.last_published_sequence_or_null !== null &&
    contract.resume_token_or_null !== null
  );
}

export function routeStabilitySnapshotKey(contract: RouteStabilityContract) {
  return [
    contract.route_scope_class,
    contract.publication_generation,
    contract.guard_vector_hash,
    contract.resume_capability,
  ].join(":");
}
