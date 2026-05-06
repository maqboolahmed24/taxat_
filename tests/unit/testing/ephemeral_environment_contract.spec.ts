import { expect, test } from "@playwright/test";

import {
  applyEphemeralResetScope,
  buildEphemeralResetEvidence,
  computeEphemeralSeedProfileHash,
  createEphemeralEnvironmentManifest,
  deriveEphemeralEnvironmentIdentity,
  deriveEphemeralNamespaces,
  evaluateEphemeralCleanliness,
  loadEphemeralEnvironmentBundle,
  transitionEphemeralLifecycle,
} from "../../../packages/runtime-foundation/src/ephemeral_environment_contract.ts";

test("ephemeral identity and namespace derivation stay stable and shard-isolated", async () => {
  const bundle = await loadEphemeralEnvironmentBundle();
  const left = deriveEphemeralEnvironmentIdentity(bundle, {
    environmentId: "env-ephemeral-ci-run-001",
    ownerRef: "ci.run.20260423.001",
    runtimeProfileRef: "local",
    scopeClassRef: "CI_RUN_SHARD",
    shardRef: "shard-a",
  });
  const right = deriveEphemeralEnvironmentIdentity(bundle, {
    environmentId: "env-ephemeral-ci-run-001",
    ownerRef: "ci.run.20260423.001",
    runtimeProfileRef: "local",
    scopeClassRef: "CI_RUN_SHARD",
    shardRef: "shard-b",
  });

  expect(left.environment_identity_hash).not.toBe(right.environment_identity_hash);
  expect(deriveEphemeralNamespaces(bundle, left).queue_namespace_refs[0]).not.toBe(
    deriveEphemeralNamespaces(bundle, right).queue_namespace_refs[0],
  );
  expect(deriveEphemeralNamespaces(bundle, left).object_prefix_refs[0]).toContain(
    left.environment_id,
  );
});

test("reset scopes preserve or recreate the intended resource classes only", async () => {
  const bundle = await loadEphemeralEnvironmentBundle();
  const manifest = createEphemeralEnvironmentManifest(bundle, {
    environmentId: "env-ephemeral-local-run-001",
    ownerRef: "local.suite.20260423.001",
    runtimeProfileRef: "local",
    scopeClassRef: "LOCAL_HIGH_FIDELITY_SHARD",
    seedProfileRef: "PROFILE_DETERMINISTIC_BASELINE",
    shardRef: "browser-01",
  });
  manifest.resource_state.queue_message_count = 4;
  manifest.resource_state.cache_key_count = 3;
  manifest.resource_state.upload_session_count = 2;

  const fast = applyEphemeralResetScope(bundle, manifest, "FAST_DISPOSABLE_REUSE");
  expect(fast.resource_state.queue_message_count).toBe(0);
  expect(fast.resource_state.cache_key_count).toBe(0);
  expect(fast.resource_state.upload_session_count).toBe(2);

  const full = applyEphemeralResetScope(bundle, manifest, "FULL_TEST_ISOLATION");
  expect(full.resource_state.queue_message_count).toBe(0);
  expect(full.resource_state.cache_key_count).toBe(0);
  expect(full.resource_state.upload_session_count).toBe(0);
  expect(full.resource_state.last_reset_scope_ref_or_null).toBe("FULL_TEST_ISOLATION");
});

test("lifecycle transitions fail closed when the phase does not permit the target state", async () => {
  const bundle = await loadEphemeralEnvironmentBundle();
  const manifest = createEphemeralEnvironmentManifest(bundle, {
    environmentId: "env-ephemeral-preview-run-001",
    ownerRef: "preview.pr-812.001",
    runtimeProfileRef: "local",
    scopeClassRef: "PREVIEW_REVIEW_SHARD",
    shardRef: "smoke-a",
  });

  expect(() =>
    transitionEphemeralLifecycle(bundle, manifest, {
      at: "2026-04-23T04:00:00Z",
      detail: "Illegal direct ready jump.",
      eventRef: "environment.illegal-ready-jump",
      phaseRef: "SEED_LOAD",
      toState: "READY",
    }),
  ).toThrow(/illegal lifecycle transition/i);
});

test("cleanliness synthesis and reset evidence stay deterministic and detect seed drift", async () => {
  const bundle = await loadEphemeralEnvironmentBundle();
  let manifest = createEphemeralEnvironmentManifest(bundle, {
    environmentId: "env-ephemeral-ci-run-validate-001",
    ownerRef: "ci.run.20260423.002",
    runtimeProfileRef: "local",
    scopeClassRef: "CI_RUN_SHARD",
    shardRef: "shard-01",
  });
  manifest = transitionEphemeralLifecycle(bundle, manifest, {
    at: "2026-04-23T04:10:00Z",
    detail: "Bootstrap started.",
    eventRef: "environment.bootstrap-started",
    phaseRef: "IDENTITY_LOCK",
    toState: "BOOTSTRAPPING",
  });
  manifest = transitionEphemeralLifecycle(bundle, manifest, {
    at: "2026-04-23T04:10:10Z",
    detail: "Cleanliness verified.",
    eventRef: "environment.cleanliness-verified",
    phaseRef: "CLEANLINESS_VERIFY",
    toState: "READY",
  });

  const clean = evaluateEphemeralCleanliness(bundle, manifest);
  expect(clean.ok).toBe(true);
  expect(clean.failureCodes).toEqual([]);

  const evidence = buildEphemeralResetEvidence(bundle, manifest, {
    actionKind: "RESET",
    chronology: [
      {
        at: "2026-04-23T04:11:00Z",
        detail: "Reset completed.",
        event_ref: "reset.completed",
        status: "SUCCEEDED",
      },
    ],
    outcome: "SUCCEEDED",
    residualWarnings: [],
    resetScopeRef: "FULL_TEST_ISOLATION",
  });
  expect(evidence.seed_profile_hash).toBe(
    computeEphemeralSeedProfileHash(bundle, manifest.seed_profile_ref),
  );

  manifest.seed_profile_hash = "0".repeat(64);
  const drifted = evaluateEphemeralCleanliness(bundle, manifest);
  expect(drifted.ok).toBe(false);
  expect(drifted.failureCodes).toContain("SEED_PROFILE_HASH_DRIFT");
});
