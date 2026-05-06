import {
  createRouteStabilityFrame,
  evaluateCurrentness,
  type RouteGuardVectorComponents,
  type RouteStabilityContract,
} from "@taxat/frontend-shell-core";
import { createStabilityDebugPillSnapshot } from "@taxat/shared-ui";

const routeGuardVectorComponents = {
  client_portal_workspace_version_or_null: null,
  customer_thread_head_or_null: 91,
  decision_bundle_hash_or_null: "sha256:pc0233-decision-current",
  dependency_topology_hash_or_null: "sha256:pc0233-dependency-current",
  frame_epoch_or_null: 42,
  internal_thread_head_or_null: 144,
  mutation_basis_contract_hash_or_null: "sha256:pc0233-mutation-current",
  policy_snapshot_hash_or_null: "sha256:pc0233-policy-current",
  request_state_version_or_null: 7,
  shell_stability_token_or_null: "shell-stability:pc0233:current",
  simulation_basis_hash_or_null: null,
  view_guard_ref_or_null: "view-guard:pc0233:manifest",
  work_item_version_or_null: 17,
} satisfies RouteGuardVectorComponents;

const stabilityContract = {
  guard_vector_components: routeGuardVectorComponents,
  guard_vector_hash: "sha256:pc0233-route-guard-current",
  last_published_sequence_or_null: 128,
  publication_generation: 3,
  resume_capability: "STREAM_RESUMABLE",
  resume_token_or_null: "resume:pc0233:128",
  route_scope_class: "MANIFEST_EXPERIENCE",
} satisfies RouteStabilityContract;

const currentFrame = createRouteStabilityFrame({
  approval_pack_hash_or_null: "sha256:pc0233-approval",
  cache_isolation_contract_or_null: {
    access_binding_hash_or_null: "access-binding:pc0233:current",
    cache_partition_ref: "cache-partition:pc0233:current",
    local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
    masking_posture_fingerprint_or_null: "masking:pc0233:current",
    route_identity_ref: "calm.manifest|manifest:pc0233|manifest",
    session_binding_hash: "session-binding:pc0233:current",
    shell_stability_ref_or_null: "shell-stability:pc0233:current",
  },
  etag_or_null: "sha256:pc0233-etag-current",
  policy_snapshot_hash_or_null: "sha256:pc0233-policy-current",
  received_at_epoch_ms: 1,
  request_version_ref_or_null: "request-version:pc0233:7",
  route_identity: {
    focus_anchor_ref: "calm.context-bar",
    object_anchor_ref: "manifest:pc0233",
    route_context_ref: "manifest",
    shell_route_key: "calm.manifest",
    workspace_route_key: "manifest:pc0233",
  },
  stability_contract: stabilityContract,
  stream_recovery_contract_or_null: {
    access_binding_hash: "access-binding:pc0233:current",
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 42,
    masking_context_hash: "masking:pc0233:current",
    publication_generation: 3,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: "resume:pc0233:128",
    route_key: "manifest:pc0233",
    session_binding_hash: "session-binding:pc0233:current",
    shell_stability_token: "shell-stability:pc0233:current",
  },
});

const currentness = evaluateCurrentness({ current_frame: currentFrame });

export const viewGuardStateContainersRoute = {
  currentness,
  debugPillSnapshot: createStabilityDebugPillSnapshot({
    etagOrNull: currentFrame.etag_or_null,
    evaluation: currentness,
    shellTokenOrNull: routeGuardVectorComponents.shell_stability_token_or_null,
  }),
  id: "view-guard-state-containers",
  publicPath: "/apps/operator-web/public/internal/view-guard-state-containers/index.html",
  routePath: "/internal/view-guard-state-containers",
  title: "View Guard State Containers",
} as const;
