import { expect, test } from "@playwright/test";

import {
  applyRouteStabilityFrame,
  assertStreamResumeAvailable,
  compareRouteStabilityContracts,
  createRouteStabilityFrame,
  createRouteStabilityStore,
  createStaleGuardSnapshot,
  createViewGuardStore,
  evaluateCurrentness,
  selectCommandGuardSnapshot,
  StateContainerError,
  type RouteGuardVectorComponents,
  type RouteStabilityContract,
  type RouteStabilityFrame,
} from "../../../packages/frontend-shell-core/src/index";
import { createStabilityDebugPillSnapshot } from "../../../packages/shared-ui/src/state/StabilityDebugPill";
import { validateContractSchema } from "../backend_northbound/audit_and_enquiry_fixtures";

const baseComponents: RouteGuardVectorComponents = {
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
};

function contract(
  overrides: Partial<RouteStabilityContract> & {
    guard_vector_components?: RouteGuardVectorComponents | undefined;
  } = {},
): RouteStabilityContract {
  return {
    guard_vector_components: overrides.guard_vector_components ?? baseComponents,
    guard_vector_hash: overrides.guard_vector_hash ?? "sha256:pc0233-route-guard-current",
    last_published_sequence_or_null:
      "last_published_sequence_or_null" in overrides
        ? (overrides.last_published_sequence_or_null ?? null)
        : 128,
    publication_generation: overrides.publication_generation ?? 3,
    resume_capability: overrides.resume_capability ?? "STREAM_RESUMABLE",
    resume_token_or_null:
      "resume_token_or_null" in overrides
        ? (overrides.resume_token_or_null ?? null)
        : "resume:pc0233:128",
    route_scope_class: overrides.route_scope_class ?? "MANIFEST_EXPERIENCE",
  };
}

function frame(
  overrides: Partial<Omit<RouteStabilityFrame, "stability_contract">> & {
    stability_contract?: RouteStabilityContract | undefined;
  } = {},
): RouteStabilityFrame {
  return createRouteStabilityFrame({
    approval_pack_hash_or_null: overrides.approval_pack_hash_or_null ?? "sha256:pc0233-approval",
    cache_isolation_contract_or_null: overrides.cache_isolation_contract_or_null ?? {
      access_binding_hash_or_null: "access-binding:pc0233:current",
      cache_partition_ref: "cache-partition:pc0233:current",
      local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
      masking_posture_fingerprint_or_null: "masking:pc0233:current",
      route_identity_ref: "calm.manifest|manifest:pc0233|manifest",
      session_binding_hash: "session-binding:pc0233:current",
      shell_stability_ref_or_null: "shell-stability:pc0233:current",
    },
    etag_or_null: overrides.etag_or_null ?? "sha256:pc0233-etag-current",
    policy_snapshot_hash_or_null:
      overrides.policy_snapshot_hash_or_null ?? "sha256:pc0233-policy-current",
    received_at_epoch_ms: overrides.received_at_epoch_ms ?? 1,
    request_version_ref_or_null:
      overrides.request_version_ref_or_null ?? "request-version:pc0233:7",
    route_identity: overrides.route_identity ?? {
      focus_anchor_ref: "calm.context-bar",
      object_anchor_ref: "manifest:pc0233",
      route_context_ref: "manifest",
      shell_route_key: "calm.manifest",
      workspace_route_key: "manifest:pc0233",
    },
    stability_contract: overrides.stability_contract ?? contract(),
    stream_recovery_contract_or_null: overrides.stream_recovery_contract_or_null ?? {
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
}

test("route stability frames stay schema-valid and expose current command guards", async () => {
  const currentFrame = frame();
  await validateContractSchema("route_stability_contract", currentFrame.stability_contract);

  const store = createRouteStabilityStore(currentFrame);
  const guardSnapshot = selectCommandGuardSnapshot(
    createViewGuardStore(store.current_frame),
    "MANIFEST_MUTATION",
  );

  expect(evaluateCurrentness({ current_frame: currentFrame }).posture).toBe("CURRENT");
  expect(assertStreamResumeAvailable(currentFrame)).toEqual({
    last_published_sequence: 128,
    resume_token: "resume:pc0233:128",
  });
  expect(guardSnapshot.safe_for_command_formation).toBe(true);
  expect(guardSnapshot.if_match_decision_bundle_hash).toBe("sha256:pc0233-decision-current");
  expect(guardSnapshot.if_match_shell_stability_token).toBe("shell-stability:pc0233:current");
  expect(guardSnapshot.if_match_frame_epoch).toBe(42);
});

test("guard vector comparison rejects mixed-generation hash and component pairings", () => {
  const current = contract();
  const changedComponents = {
    ...baseComponents,
    decision_bundle_hash_or_null: "sha256:pc0233-decision-new",
  };
  const stale = contract({
    guard_vector_components: changedComponents,
    guard_vector_hash: "sha256:pc0233-route-guard-new",
    publication_generation: 4,
  });
  const comparison = compareRouteStabilityContracts(current, stale);
  expect(comparison.guard_vector_hash_equal).toBe(false);
  expect(comparison.drift_component_keys).toContain("decision_bundle_hash_or_null");
  expect(comparison.illegal_mixed_generation_basis).toBe(false);

  const mixed = contract({
    guard_vector_components: changedComponents,
    guard_vector_hash: current.guard_vector_hash,
    publication_generation: 4,
  });
  expect(compareRouteStabilityContracts(current, mixed).illegal_mixed_generation_basis).toBe(true);
});

test("newer frame epoch with old shell token cannot become current", () => {
  const currentFrame = frame();
  const nextFrame = frame({
    stability_contract: contract({
      guard_vector_components: {
        ...baseComponents,
        frame_epoch_or_null: 43,
      },
      guard_vector_hash: "sha256:pc0233-route-guard-epoch-new",
      publication_generation: 4,
    }),
  });

  expect(
    evaluateCurrentness({ candidate_frame: nextFrame, current_frame: currentFrame }).posture,
  ).toBe("ILLEGAL_MIXED_GENERATION_BASIS");
  expect(() =>
    applyRouteStabilityFrame(createRouteStabilityStore(currentFrame), nextFrame),
  ).toThrow(StateContainerError);
});

test("missing route-scoped guards block command formation without fabrication", () => {
  const missingGuardFrame = frame({
    stability_contract: contract({
      guard_vector_components: {
        ...baseComponents,
        decision_bundle_hash_or_null: null,
      },
      guard_vector_hash: "sha256:pc0233-route-guard-missing-decision",
    }),
  });

  const snapshot = createStaleGuardSnapshot({
    frame: missingGuardFrame,
    mutation_family: "MANIFEST_MUTATION",
  });
  expect(snapshot.safe_for_command_formation).toBe(false);
  expect(snapshot.missing_guard_fields).toEqual(["if_match_decision_bundle_hash"]);

  expect(() =>
    selectCommandGuardSnapshot(createViewGuardStore(frame()), "CLIENT_PORTAL_APPROVAL"),
  ).toThrow(StateContainerError);
});

test("access, session, and masking drift enter access-rebind posture with purge cues", () => {
  const currentFrame = frame();
  const driftFrame = frame({
    cache_isolation_contract_or_null: {
      access_binding_hash_or_null: "access-binding:pc0233:changed",
      cache_partition_ref: "cache-partition:pc0233:changed",
      local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
      masking_posture_fingerprint_or_null: "masking:pc0233:changed",
      route_identity_ref: "calm.manifest|manifest:pc0233|manifest",
      session_binding_hash: "session-binding:pc0233:changed",
      shell_stability_ref_or_null: "shell-stability:pc0233:current",
    },
    stream_recovery_contract_or_null: {
      access_binding_hash: "access-binding:pc0233:changed",
      delivery_window_state: "ACCESS_REBIND_REQUIRED",
      frame_epoch: 42,
      masking_context_hash: "masking:pc0233:changed",
      publication_generation: 3,
      rebase_reason_code_or_null: "ACCESS_BINDING_CHANGED",
      resume_binding_ref_or_null: null,
      route_key: "manifest:pc0233",
      session_binding_hash: "session-binding:pc0233:changed",
      shell_stability_token: "shell-stability:pc0233:current",
    },
  });

  const evaluation = evaluateCurrentness({
    candidate_frame: driftFrame,
    current_frame: currentFrame,
  });
  expect(evaluation.posture).toBe("ACCESS_REBIND_REQUIRED");
  expect(evaluation.purge_cues).toEqual(
    expect.arrayContaining([
      "PURGE_CACHE_ON_ACCESS_BINDING_DRIFT",
      "PURGE_CACHE_ON_MASKING_POSTURE_DRIFT",
      "PURGE_CACHE_ON_SESSION_DRIFT",
    ]),
  );
  expect(evaluation.stream_resume_controls_available).toBe(false);
});

test("snapshot-only route state never exposes stream resume controls", () => {
  const snapshotFrame = frame({
    stability_contract: contract({
      last_published_sequence_or_null: null,
      resume_capability: "SNAPSHOT_ONLY",
      resume_token_or_null: null,
    }),
    stream_recovery_contract_or_null: {
      access_binding_hash: "access-binding:pc0233:current",
      delivery_window_state: "SNAPSHOT_ONLY",
      frame_epoch: 42,
      masking_context_hash: "masking:pc0233:current",
      publication_generation: 3,
      rebase_reason_code_or_null: null,
      resume_binding_ref_or_null: null,
      route_key: "manifest:pc0233",
      session_binding_hash: "session-binding:pc0233:current",
      shell_stability_token: "shell-stability:pc0233:current",
    },
  });

  expect(evaluateCurrentness({ current_frame: snapshotFrame }).posture).toBe("SNAPSHOT_ONLY");
  expect(() => assertStreamResumeAvailable(snapshotFrame)).toThrow(StateContainerError);
});

test("stability debug pill only renders opaque stability refs", () => {
  const evaluation = evaluateCurrentness({ current_frame: frame() });
  const pill = createStabilityDebugPillSnapshot({
    etagOrNull: "raw-authority-tax-value-never-render",
    evaluation,
    shellTokenOrNull: "raw-shell-token-never-render",
  });
  const rendered = JSON.stringify(pill);
  expect(rendered).not.toContain("raw-authority-tax-value-never-render");
  expect(rendered).not.toContain("raw-shell-token-never-render");
  expect(pill.visible_text).toContain("current");
  expect(pill.safe_refs.guard_vector_hash).toContain("opaque:");
});
