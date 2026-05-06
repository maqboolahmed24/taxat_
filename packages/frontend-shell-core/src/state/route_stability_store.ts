import type {
  RouteGuardVectorComponents,
  RouteScopeClass,
  RouteStabilityContract,
} from "../route_contracts/route_stability";
import { StateContainerError } from "./state_container_errors";

export type RouteGuardComponentKey = keyof RouteGuardVectorComponents;

export const routeGuardComponentKeys = [
  "decision_bundle_hash_or_null",
  "shell_stability_token_or_null",
  "frame_epoch_or_null",
  "work_item_version_or_null",
  "customer_thread_head_or_null",
  "internal_thread_head_or_null",
  "request_state_version_or_null",
  "client_portal_workspace_version_or_null",
  "view_guard_ref_or_null",
  "policy_snapshot_hash_or_null",
  "dependency_topology_hash_or_null",
  "simulation_basis_hash_or_null",
  "mutation_basis_contract_hash_or_null",
] as const satisfies readonly RouteGuardComponentKey[];

export type RouteIdentity = {
  shell_route_key: string;
  workspace_route_key: string;
  route_context_ref: string;
  object_anchor_ref: string;
  focus_anchor_ref: string;
};

export type StreamRecoveryContractSummary = {
  delivery_window_state:
    | "LIVE_RESUMABLE"
    | "REBASE_REQUIRED"
    | "ACCESS_REBIND_REQUIRED"
    | "SNAPSHOT_ONLY";
  rebase_reason_code_or_null:
    | "FRAME_EPOCH_ADVANCED"
    | "HISTORY_COMPACTED"
    | "SHELL_STABILITY_CHANGED"
    | "ROUTE_CONTEXT_CHANGED"
    | "SESSION_BINDING_CHANGED"
    | "ACCESS_BINDING_CHANGED"
    | "MASKING_POSTURE_CHANGED"
    | "SCHEMA_INCOMPATIBLE"
    | null;
  route_key: string;
  shell_stability_token: string;
  session_binding_hash: string;
  access_binding_hash: string;
  masking_context_hash: string;
  frame_epoch: number;
  publication_generation: number;
  resume_binding_ref_or_null: string | null;
};

export type CacheIsolationContractSummary = {
  cache_partition_ref: string;
  route_identity_ref: string;
  session_binding_hash: string;
  access_binding_hash_or_null: string | null;
  masking_posture_fingerprint_or_null: string | null;
  shell_stability_ref_or_null: string | null;
  local_storage_reuse_policy:
    | "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT"
    | string;
};

export type RouteStabilityFrame = {
  etag_or_null: string | null;
  route_identity: RouteIdentity;
  stability_contract: RouteStabilityContract;
  approval_pack_hash_or_null: string | null;
  policy_snapshot_hash_or_null: string | null;
  request_version_ref_or_null: string | null;
  cache_isolation_contract_or_null: CacheIsolationContractSummary | null;
  stream_recovery_contract_or_null: StreamRecoveryContractSummary | null;
  received_at_epoch_ms: number;
};

export type RouteStabilityStore = {
  current_frame: RouteStabilityFrame;
  history: readonly RouteStabilityFrame[];
  route_scope_class: RouteScopeClass;
};

export type GuardVectorComparison = {
  component_fields_equal: boolean;
  drift_component_keys: readonly RouteGuardComponentKey[];
  guard_vector_hash_equal: boolean;
  illegal_mixed_generation_basis: boolean;
  newer_frame_epoch_with_old_shell_token: boolean;
  publication_generation_delta: number;
  route_scope_class: RouteScopeClass;
};

function routeIdentityRef(identity: RouteIdentity) {
  return [
    identity.shell_route_key,
    identity.workspace_route_key,
    identity.route_context_ref,
    identity.object_anchor_ref,
  ].join("|");
}

export function readGuardVectorComponent<Key extends RouteGuardComponentKey>(
  components: RouteGuardVectorComponents,
  key: Key,
): Exclude<RouteGuardVectorComponents[Key], undefined> | null {
  return (components[key] ?? null) as Exclude<RouteGuardVectorComponents[Key], undefined> | null;
}

export function createRouteStabilityFrame(
  input: Omit<RouteStabilityFrame, "received_at_epoch_ms"> & {
    received_at_epoch_ms?: number | undefined;
  },
): RouteStabilityFrame {
  return {
    ...input,
    received_at_epoch_ms: input.received_at_epoch_ms ?? 0,
  };
}

export function createRouteStabilityStore(frame: RouteStabilityFrame): RouteStabilityStore {
  return {
    current_frame: frame,
    history: [frame],
    route_scope_class: frame.stability_contract.route_scope_class,
  };
}

export function compareGuardVectorComponents(
  previous: RouteGuardVectorComponents,
  next: RouteGuardVectorComponents,
) {
  const driftComponentKeys = routeGuardComponentKeys.filter(
    (key) => readGuardVectorComponent(previous, key) !== readGuardVectorComponent(next, key),
  );
  return {
    component_fields_equal: driftComponentKeys.length === 0,
    drift_component_keys: driftComponentKeys,
  } as const;
}

export function compareRouteStabilityContracts(
  previous: RouteStabilityContract,
  next: RouteStabilityContract,
): GuardVectorComparison {
  if (previous.route_scope_class !== next.route_scope_class) {
    throw new StateContainerError(
      "STATE_CONTAINER_ROUTE_SCOPE_MISMATCH",
      "Route stability contracts cannot be compared across route-scope families.",
      {
        next_route_scope_class: next.route_scope_class,
        previous_route_scope_class: previous.route_scope_class,
      },
    );
  }

  const componentComparison = compareGuardVectorComponents(
    previous.guard_vector_components,
    next.guard_vector_components,
  );
  const guardVectorHashEqual = previous.guard_vector_hash === next.guard_vector_hash;
  const previousEpoch =
    readGuardVectorComponent(previous.guard_vector_components, "frame_epoch_or_null") ?? -1;
  const nextEpoch = readGuardVectorComponent(next.guard_vector_components, "frame_epoch_or_null") ?? -1;
  const previousShellToken = readGuardVectorComponent(
    previous.guard_vector_components,
    "shell_stability_token_or_null",
  );
  const nextShellToken = readGuardVectorComponent(
    next.guard_vector_components,
    "shell_stability_token_or_null",
  );
  const newerFrameEpochWithOldShellToken =
    typeof previousEpoch === "number" &&
    typeof nextEpoch === "number" &&
    nextEpoch > previousEpoch &&
    previousShellToken !== null &&
    previousShellToken === nextShellToken;

  return {
    component_fields_equal: componentComparison.component_fields_equal,
    drift_component_keys: componentComparison.drift_component_keys,
    guard_vector_hash_equal: guardVectorHashEqual,
    illegal_mixed_generation_basis:
      guardVectorHashEqual !== componentComparison.component_fields_equal ||
      newerFrameEpochWithOldShellToken,
    newer_frame_epoch_with_old_shell_token: newerFrameEpochWithOldShellToken,
    publication_generation_delta: next.publication_generation - previous.publication_generation,
    route_scope_class: previous.route_scope_class,
  } as const;
}

export function compareRouteStabilityFrames(
  previous: RouteStabilityFrame,
  next: RouteStabilityFrame,
) {
  const contractComparison = compareRouteStabilityContracts(
    previous.stability_contract,
    next.stability_contract,
  );
  const routeIdentityDrift =
    routeIdentityRef(previous.route_identity) !== routeIdentityRef(next.route_identity);

  return {
    ...contractComparison,
    route_identity_drift: routeIdentityDrift,
  } as const;
}

export function assertNoMixedGenerationBasis(comparison: GuardVectorComparison) {
  if (!comparison.illegal_mixed_generation_basis) {
    return comparison;
  }

  throw new StateContainerError(
    "STATE_CONTAINER_ILLEGAL_MIXED_GENERATION_BASIS",
    "Route stability frame mixes guard-vector hash and component fields from different generations.",
    {
      drift_component_keys: comparison.drift_component_keys,
      guard_vector_hash_equal: comparison.guard_vector_hash_equal,
      newer_frame_epoch_with_old_shell_token: comparison.newer_frame_epoch_with_old_shell_token,
      route_scope_class: comparison.route_scope_class,
    },
  );
}

export function applyRouteStabilityFrame(
  store: RouteStabilityStore,
  nextFrame: RouteStabilityFrame,
) {
  const comparison = compareRouteStabilityFrames(store.current_frame, nextFrame);
  assertNoMixedGenerationBasis(comparison);

  return {
    comparison,
    store: {
      current_frame: nextFrame,
      history: [...store.history, nextFrame],
      route_scope_class: nextFrame.stability_contract.route_scope_class,
    } satisfies RouteStabilityStore,
  } as const;
}

export function assertStreamResumeAvailable(frame: RouteStabilityFrame) {
  const contract = frame.stability_contract;
  if (
    contract.resume_capability !== "STREAM_RESUMABLE" ||
    contract.last_published_sequence_or_null === null ||
    contract.resume_token_or_null === null
  ) {
    throw new StateContainerError(
      "STATE_CONTAINER_SNAPSHOT_ONLY_RESUME_FORBIDDEN",
      "Snapshot-only route state cannot expose stream resume controls.",
      {
        resume_capability: contract.resume_capability,
        route_scope_class: contract.route_scope_class,
      },
    );
  }

  return {
    last_published_sequence: contract.last_published_sequence_or_null,
    resume_token: contract.resume_token_or_null,
  } as const;
}
