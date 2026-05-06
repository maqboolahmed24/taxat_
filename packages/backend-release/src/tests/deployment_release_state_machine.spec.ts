import { expect, test } from "@playwright/test";

import { buildSchemaReaderWindowContract } from "../../../backend-manifest/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildDeploymentReleaseRecord,
  DeploymentReleaseRepository,
  deriveCandidateIdentityContract,
  evaluateCanaryHealthSummary,
  type DeploymentReleaseTransitionEventCode,
  type DeploymentRolloutState,
  type DeploymentRolloutStrategy,
  type SchemaReaderWindowContractRecord,
} from "../index.ts";

const candidateIdentityContract = deriveCandidateIdentityContract({
  artifact_digest:
    "sha256:pc0220release907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_artifact_ref: "build.pc0220.release.0002",
  candidate_environment_ref: "candidate-env.production.pc0220",
  config_bundle_hash: "config-bundle-hash.pc0220.release",
  enabled_provider_profile_refs: ["provider.github-actions.oidc", "provider.sigstore.keyless"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0220.release",
  supported_client_window_ref_or_null: "client-window.operator.stable.pc0220",
});

function schemaReaderWindow(
  windowState: SchemaReaderWindowContractRecord["window_state"] =
    "VERIFIED_PREVIOUS_READERS_SUPPORTED",
) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0220/${windowState.toLowerCase()}`,
    writer_schema_bundle_hash: candidateIdentityContract.schema_bundle_hash,
    supported_reader_schema_bundle_hashes: [
      candidateIdentityContract.schema_bundle_hash,
      "schema-bundle-hash.pc0220.previous",
    ],
    protected_historical_schema_bundle_hashes: [
      "schema-bundle-hash.pc0220.previous",
    ],
    window_state: windowState,
  });
}

function releaseFixture(input: {
  release_id?: string;
  rollout_state?: DeploymentRolloutState;
  rollout_strategy?: DeploymentRolloutStrategy;
  previous_state_or_null?: DeploymentRolloutState | null;
  transition_event_code?: DeploymentReleaseTransitionEventCode;
  reader_window_state?: SchemaReaderWindowContractRecord["window_state"];
  deployed_at?: string | null;
  rollback_boundary_state?: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  canary_fraction?: number | null;
  health_gate_state?: "GREEN" | "AMBER" | "RED";
  rollback_of_release_id?: string | null;
  compensating_release_id_or_null?: string | null;
  fail_forward_owner_ref_or_null?: string | null;
  emergency_override_ref?: string | null;
  emergency_override_expires_at?: string | null;
} = {}) {
  const rolloutState = input.rollout_state ?? "PLANNED";
  const rolloutStrategy = input.rollout_strategy ?? "STANDARD_CANARY";
  return buildDeploymentReleaseRecord({
    release_id: input.release_id ?? "release.pc0220.0001",
    candidate_identity_contract: candidateIdentityContract,
    schema_reader_window_contract: schemaReaderWindow(input.reader_window_state),
    rollout_strategy: rolloutStrategy,
    rollout_state: rolloutState,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: "2026-05-05T11:00:00Z",
    transition_audit_ref: `audit://pc0220/${input.release_id ?? "release.pc0220.0001"}/${rolloutState.toLowerCase()}`,
    rollback_boundary_state: input.rollback_boundary_state,
    canary_fraction:
      typeof input.canary_fraction !== "undefined"
        ? input.canary_fraction
        : rolloutStrategy === "STANDARD_CANARY"
          ? 0.05
          : null,
    health_gate_state: input.health_gate_state ?? "GREEN",
    release_verification_manifest_ref: "release-verification://pc0220/approved",
    deployed_at:
      typeof input.deployed_at !== "undefined"
        ? input.deployed_at
        : rolloutState === "PLANNED"
          ? null
          : "2026-05-05T11:05:00Z",
    rollback_of_release_id: input.rollback_of_release_id,
    compensating_release_id_or_null: input.compensating_release_id_or_null,
    rollback_runbook_ref: "runbook://release/rollback/pc0220",
    fail_forward_runbook_ref: "runbook://release/fail-forward/pc0220",
    fail_forward_owner_ref_or_null: input.fail_forward_owner_ref_or_null,
    emergency_override_ref: input.emergency_override_ref,
    emergency_override_expires_at: input.emergency_override_expires_at,
  });
}

function greenCanarySummary(evaluatedAt = "2026-05-05T11:06:00Z") {
  return evaluateCanaryHealthSummary({
    candidate_identity_contract: candidateIdentityContract,
    canary_fraction: 0.05,
    slo_profile_ref: "slo-profile://pc0220/prod",
    error_budget_profile_ref: "error-budget-profile://pc0220/prod",
    latency_budget_state: "WITHIN_BUDGET",
    error_budget_state: "WITHIN_BUDGET",
    summary_ref: `canary-report://pc0220/prod/${evaluatedAt}`,
    evaluated_at: evaluatedAt,
  });
}

function repositoryFixture() {
  return new DeploymentReleaseRepository({
    validate_contract_schema: validateContractSchema,
  });
}

test("persists deployment releases through legal canary transitions with mirrored state contracts", async () => {
  const repository = repositoryFixture();
  const planned = releaseFixture();
  const stored = await repository.persistDeploymentRelease({
    deployment_release: planned,
    persisted_at: "2026-05-05T11:00:00Z",
  });
  const canary = await repository.advanceDeploymentReleaseState({
    release_id: stored.release_id,
    expected_row_version: stored.deployment_release_row_version,
    transition_event_code: "canary_start",
    transition_applied_at: "2026-05-05T11:05:00Z",
    transition_audit_ref: "audit://pc0220/canary-start",
    deployed_at: "2026-05-05T11:05:00Z",
    canary_health_summary: greenCanarySummary(),
  });
  const promoted = await repository.advanceDeploymentReleaseState({
    release_id: stored.release_id,
    expected_row_version: canary.deployment_release_row_version,
    transition_event_code: "promote",
    transition_applied_at: "2026-05-05T11:20:00Z",
    transition_audit_ref: "audit://pc0220/promote",
    canary_health_summary: greenCanarySummary("2026-05-05T11:19:00Z"),
  });
  const retriedPromote = await repository.advanceDeploymentReleaseState({
    release_id: stored.release_id,
    expected_row_version: canary.deployment_release_row_version,
    transition_event_code: "promote",
    transition_applied_at: "2026-05-05T11:20:00Z",
    transition_audit_ref: "audit://pc0220/promote",
    canary_health_summary: greenCanarySummary("2026-05-05T11:19:00Z"),
  });

  expect(canary.deployment_release.rollout_state).toBe("CANARY");
  expect(canary.deployment_release.state_transition_contract).toMatchObject({
    previous_state_or_null: "PLANNED",
    current_state: "CANARY",
    transition_event_code: "canary_start",
  });
  expect(promoted.deployment_release.rollout_state).toBe("PROMOTED");
  expect(promoted.deployment_release.state_transition_contract.current_state).toBe(
    promoted.deployment_release.rollout_state,
  );
  expect(retriedPromote.deployment_release_row_version).toBe(
    promoted.deployment_release_row_version,
  );
  await validateContractSchema("deployment_release", promoted.deployment_release);

  await expect(
    validateContractSchema("deployment_release", {
      ...promoted.deployment_release,
      state_transition_contract: {
        ...promoted.deployment_release.state_transition_contract,
        current_state: "CANARY",
      },
    }),
  ).rejects.toThrow("current_state must mirror");
});

test("blocks rollback after reader-window closure and rejects self-rollback lineage", async () => {
  const repository = repositoryFixture();
  const closedPromoted = await repository.persistDeploymentRelease({
    deployment_release: releaseFixture({
      release_id: "release.pc0220.closed",
      rollout_state: "PROMOTED",
      previous_state_or_null: "CANARY",
      transition_event_code: "promote",
      reader_window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollback_boundary_state: "FAIL_FORWARD_ONLY",
    }),
    persisted_at: "2026-05-05T12:00:00Z",
  });
  await expect(
    repository.advanceDeploymentReleaseState({
      release_id: closedPromoted.release_id,
      expected_row_version: closedPromoted.deployment_release_row_version,
      transition_event_code: "rollback",
      transition_applied_at: "2026-05-05T12:05:00Z",
      transition_audit_ref: "audit://pc0220/rollback-closed",
      rollback_of_release_id: "release.pc0220.previous",
    }),
  ).rejects.toThrow("DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED");

  const openPromoted = await repository.persistDeploymentRelease({
    deployment_release: releaseFixture({
      release_id: "release.pc0220.open",
      rollout_state: "PROMOTED",
      previous_state_or_null: "CANARY",
      transition_event_code: "promote",
    }),
    persisted_at: "2026-05-05T12:10:00Z",
  });
  await expect(
    repository.advanceDeploymentReleaseState({
      release_id: openPromoted.release_id,
      expected_row_version: openPromoted.deployment_release_row_version,
      transition_event_code: "rollback",
      transition_applied_at: "2026-05-05T12:15:00Z",
      transition_audit_ref: "audit://pc0220/self-rollback",
      rollback_of_release_id: openPromoted.release_id,
    }),
  ).rejects.toThrow("DEPLOYMENT_RELEASE_SELF_ROLLBACK");
});

test("requires compensating release and owner before FAILED_FORWARD persistence", async () => {
  const repository = repositoryFixture();
  const promoted = await repository.persistDeploymentRelease({
    deployment_release: releaseFixture({
      release_id: "release.pc0220.fail-forward",
      rollout_state: "PROMOTED",
      previous_state_or_null: "CANARY",
      transition_event_code: "promote",
      reader_window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollback_boundary_state: "FAIL_FORWARD_ONLY",
    }),
    persisted_at: "2026-05-05T13:00:00Z",
  });
  await expect(
    repository.advanceDeploymentReleaseState({
      release_id: promoted.release_id,
      expected_row_version: promoted.deployment_release_row_version,
      transition_event_code: "rollback_unsafe_fail_forward_required",
      transition_applied_at: "2026-05-05T13:05:00Z",
      transition_audit_ref: "audit://pc0220/fail-forward-missing-owner",
    }),
  ).rejects.toThrow("DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING");

  const failedForward = await repository.advanceDeploymentReleaseState({
    release_id: promoted.release_id,
    expected_row_version: promoted.deployment_release_row_version,
    transition_event_code: "rollback_unsafe_fail_forward_required",
    transition_applied_at: "2026-05-05T13:10:00Z",
    transition_audit_ref: "audit://pc0220/fail-forward",
    compensating_release_id_or_null: "release.pc0220.compensating.0001",
    fail_forward_owner_ref_or_null: "operator://release-manager/pc0220",
    health_gate_state: "AMBER",
  });

  expect(failedForward.deployment_release).toMatchObject({
    rollout_strategy: "FAIL_FORWARD_COMPENSATING",
    rollout_state: "FAILED_FORWARD",
    rollback_boundary_state: "FAIL_FORWARD_ONLY",
    compensating_release_id_or_null: "release.pc0220.compensating.0001",
    fail_forward_owner_ref_or_null: "operator://release-manager/pc0220",
  });
  await validateContractSchema(
    "deployment_release",
    failedForward.deployment_release,
  );
});

test("keeps emergency override expiry scoped to post-deploy emergency promotion", async () => {
  expect(() =>
    releaseFixture({
      release_id: "release.pc0220.emergency.invalid",
      rollout_strategy: "EMERGENCY_PROMOTE",
      rollout_state: "PROMOTED",
      previous_state_or_null: "PLANNED",
      transition_event_code: "emergency_promote_with_override",
      canary_fraction: null,
      emergency_override_ref: "override://pc0220/emergency",
      emergency_override_expires_at: "2026-05-05T10:59:00Z",
      deployed_at: "2026-05-05T11:00:00Z",
    }),
  ).toThrow("DEPLOYMENT_RELEASE_EMERGENCY_OVERRIDE_INVALID");

  const validEmergency = releaseFixture({
    release_id: "release.pc0220.emergency.valid",
    rollout_strategy: "EMERGENCY_PROMOTE",
    rollout_state: "PROMOTED",
    previous_state_or_null: "PLANNED",
    transition_event_code: "emergency_promote_with_override",
    canary_fraction: null,
    emergency_override_ref: "override://pc0220/emergency",
    emergency_override_expires_at: "2026-05-05T12:00:00Z",
    deployed_at: "2026-05-05T11:00:00Z",
  });

  expect(validEmergency.emergency_override_ref).toBe("override://pc0220/emergency");
  await validateContractSchema("deployment_release", validEmergency);
});
