import type { RouteScopeClass } from "../route_contracts/route_stability";
import { readGuardVectorComponent, type RouteStabilityFrame } from "./route_stability_store";
import { StateContainerError } from "./state_container_errors";

export type CommandMutationFamily =
  | "CLIENT_PORTAL_APPROVAL"
  | "GOVERNANCE_POLICY_MUTATION"
  | "MANIFEST_MUTATION"
  | "WORKSPACE_MUTATION";

export type CommandGuardField =
  | "approval_pack_hash_or_null"
  | "etag_or_null"
  | "if_match_client_portal_workspace_version"
  | "if_match_customer_head_sequence"
  | "if_match_decision_bundle_hash"
  | "if_match_dependency_topology_hash"
  | "if_match_frame_epoch"
  | "if_match_internal_head_sequence"
  | "if_match_policy_snapshot_hash"
  | "if_match_request_state_version"
  | "if_match_shell_stability_token"
  | "if_match_simulation_basis_hash"
  | "if_match_view_guard_ref"
  | "if_match_work_item_version"
  | "mutation_basis_contract_hash_or_null"
  | "request_version_ref_or_null";

export type CommandGuardSnapshot = {
  approval_pack_hash_or_null: string | null;
  etag_or_null: string | null;
  guard_vector_hash: string;
  if_match_client_portal_workspace_version: number | null;
  if_match_customer_head_sequence: number | null;
  if_match_decision_bundle_hash: string | null;
  if_match_dependency_topology_hash: string | null;
  if_match_frame_epoch: number | null;
  if_match_internal_head_sequence: number | null;
  if_match_policy_snapshot_hash: string | null;
  if_match_request_state_version: number | null;
  if_match_shell_stability_token: string | null;
  if_match_simulation_basis_hash: string | null;
  if_match_view_guard_ref: string | null;
  if_match_work_item_version: number | null;
  mutation_basis_contract_hash_or_null: string | null;
  mutation_family: CommandMutationFamily;
  publication_generation: number;
  request_version_ref_or_null: string | null;
  required_guard_fields: readonly CommandGuardField[];
  route_scope_class: RouteScopeClass;
  safe_for_command_formation: true;
};

export type ViewGuardStore = {
  frame: RouteStabilityFrame;
  route_scope_class: RouteScopeClass;
};

const mutationFamilyScope = {
  CLIENT_PORTAL_APPROVAL: "CLIENT_PORTAL_ROUTE",
  GOVERNANCE_POLICY_MUTATION: "GOVERNANCE_ROUTE",
  MANIFEST_MUTATION: "MANIFEST_EXPERIENCE",
  WORKSPACE_MUTATION: "WORKSPACE",
} as const satisfies Record<CommandMutationFamily, RouteScopeClass>;

const requiredGuardFields = {
  CLIENT_PORTAL_APPROVAL: [
    "if_match_client_portal_workspace_version",
    "if_match_view_guard_ref",
    "approval_pack_hash_or_null",
  ],
  GOVERNANCE_POLICY_MUTATION: [
    "if_match_policy_snapshot_hash",
    "if_match_dependency_topology_hash",
    "if_match_simulation_basis_hash",
  ],
  MANIFEST_MUTATION: [
    "if_match_decision_bundle_hash",
    "if_match_shell_stability_token",
    "if_match_frame_epoch",
  ],
  WORKSPACE_MUTATION: [
    "if_match_work_item_version",
    "if_match_shell_stability_token",
    "request_version_ref_or_null",
  ],
} as const satisfies Record<CommandMutationFamily, readonly CommandGuardField[]>;

function buildSnapshotFields(frame: RouteStabilityFrame) {
  const components = frame.stability_contract.guard_vector_components;
  return {
    approval_pack_hash_or_null: frame.approval_pack_hash_or_null,
    etag_or_null: frame.etag_or_null,
    guard_vector_hash: frame.stability_contract.guard_vector_hash,
    if_match_client_portal_workspace_version: readGuardVectorComponent(
      components,
      "client_portal_workspace_version_or_null",
    ),
    if_match_customer_head_sequence: readGuardVectorComponent(
      components,
      "customer_thread_head_or_null",
    ),
    if_match_decision_bundle_hash: readGuardVectorComponent(
      components,
      "decision_bundle_hash_or_null",
    ),
    if_match_dependency_topology_hash: readGuardVectorComponent(
      components,
      "dependency_topology_hash_or_null",
    ),
    if_match_frame_epoch: readGuardVectorComponent(components, "frame_epoch_or_null"),
    if_match_internal_head_sequence: readGuardVectorComponent(
      components,
      "internal_thread_head_or_null",
    ),
    if_match_policy_snapshot_hash:
      frame.policy_snapshot_hash_or_null ??
      readGuardVectorComponent(components, "policy_snapshot_hash_or_null"),
    if_match_request_state_version: readGuardVectorComponent(
      components,
      "request_state_version_or_null",
    ),
    if_match_shell_stability_token: readGuardVectorComponent(
      components,
      "shell_stability_token_or_null",
    ),
    if_match_simulation_basis_hash: readGuardVectorComponent(
      components,
      "simulation_basis_hash_or_null",
    ),
    if_match_view_guard_ref: readGuardVectorComponent(components, "view_guard_ref_or_null"),
    if_match_work_item_version: readGuardVectorComponent(components, "work_item_version_or_null"),
    mutation_basis_contract_hash_or_null: readGuardVectorComponent(
      components,
      "mutation_basis_contract_hash_or_null",
    ),
    publication_generation: frame.stability_contract.publication_generation,
    request_version_ref_or_null: frame.request_version_ref_or_null,
    route_scope_class: frame.stability_contract.route_scope_class,
  } as const;
}

function missingGuardFields(
  fields: ReturnType<typeof buildSnapshotFields>,
  requiredFields: readonly CommandGuardField[],
) {
  return requiredFields.filter((field) => fields[field] === null);
}

export function requiredGuardFieldsForMutationFamily(mutationFamily: CommandMutationFamily) {
  return requiredGuardFields[mutationFamily];
}

export function createViewGuardStore(frame: RouteStabilityFrame): ViewGuardStore {
  return {
    frame,
    route_scope_class: frame.stability_contract.route_scope_class,
  };
}

export function selectCommandGuardSnapshot(
  store: ViewGuardStore,
  mutationFamily: CommandMutationFamily,
): CommandGuardSnapshot {
  const expectedScope = mutationFamilyScope[mutationFamily];
  if (store.route_scope_class !== expectedScope) {
    throw new StateContainerError(
      "STATE_CONTAINER_ROUTE_SCOPE_MISMATCH",
      "Mutation guard family cannot be selected from a different route scope.",
      {
        expected_route_scope_class: expectedScope,
        mutation_family: mutationFamily,
        route_scope_class: store.route_scope_class,
      },
    );
  }

  const fields = buildSnapshotFields(store.frame);
  const requiredFields = requiredGuardFields[mutationFamily];
  const missing = missingGuardFields(fields, requiredFields);
  if (missing.length > 0) {
    throw new StateContainerError(
      "STATE_CONTAINER_MISSING_GUARD",
      "Command guard snapshot is missing required route-scoped guards.",
      {
        missing_guard_fields: missing,
        mutation_family: mutationFamily,
        route_scope_class: store.route_scope_class,
      },
    );
  }

  return {
    ...fields,
    mutation_family: mutationFamily,
    required_guard_fields: requiredFields,
    safe_for_command_formation: true,
  };
}
