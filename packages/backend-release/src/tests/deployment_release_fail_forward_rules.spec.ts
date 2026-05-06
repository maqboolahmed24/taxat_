import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  DeploymentReleaseModelError,
  applyReleaseFailForwardBoundary,
  buildDeploymentReleaseRecord,
  buildSchemaReaderWindowContract,
  deriveCandidateIdentityContract,
  deriveReleaseRollbackBoundaryReport,
  type DeploymentReleaseTransitionEventCode,
  type DeploymentRolloutState,
  type DeploymentRolloutStrategy,
  type SchemaReaderWindowContractRecord,
} from "../index.ts";

const candidateIdentityContract = deriveCandidateIdentityContract({
  artifact_digest:
    "sha256:pc0226release907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_artifact_ref: "build://pc0226/release",
  candidate_environment_ref: "candidate-env://pc0226/release",
  config_bundle_hash: "config-bundle-hash.pc0226.release",
  enabled_provider_profile_refs: ["provider.hmrc.it"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0226.release",
  supported_client_window_ref_or_null: "client-window://pc0226/release",
});

function schemaReaderWindow(
  windowState: SchemaReaderWindowContractRecord["window_state"] =
    "VERIFIED_PREVIOUS_READERS_SUPPORTED",
) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0226/${windowState.toLowerCase()}`,
    protected_historical_schema_bundle_hashes: [],
    supported_reader_schema_bundle_hashes: [candidateIdentityContract.schema_bundle_hash],
    window_state: windowState,
    writer_schema_bundle_hash: candidateIdentityContract.schema_bundle_hash,
  });
}

function releaseFixture(input: {
  canary_fraction?: number | null;
  compensating_release_id_or_null?: string | null;
  deployed_at?: string | null;
  fail_forward_owner_ref_or_null?: string | null;
  health_gate_state?: "GREEN" | "AMBER" | "RED";
  previous_state_or_null?: DeploymentRolloutState | null;
  reader_window_state?: SchemaReaderWindowContractRecord["window_state"];
  release_id?: string;
  rollback_boundary_state?: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  rollback_of_release_id?: string | null;
  rollout_state?: DeploymentRolloutState;
  rollout_strategy?: DeploymentRolloutStrategy;
  transition_event_code?: DeploymentReleaseTransitionEventCode;
} = {}) {
  const rolloutState = input.rollout_state ?? "PROMOTED";
  const rolloutStrategy = input.rollout_strategy ?? "STANDARD_CANARY";
  return buildDeploymentReleaseRecord({
    canary_fraction:
      typeof input.canary_fraction === "undefined"
        ? rolloutStrategy === "STANDARD_CANARY"
          ? 0.1
          : null
        : input.canary_fraction,
    candidate_identity_contract: candidateIdentityContract,
    compensating_release_id_or_null: input.compensating_release_id_or_null,
    deployed_at:
      typeof input.deployed_at === "undefined"
        ? rolloutState === "PLANNED"
          ? null
          : "2026-05-05T19:05:00Z"
        : input.deployed_at,
    fail_forward_owner_ref_or_null: input.fail_forward_owner_ref_or_null,
    fail_forward_runbook_ref: "runbook://pc0226/fail-forward",
    health_gate_state: input.health_gate_state ?? "GREEN",
    previous_state_or_null: input.previous_state_or_null ?? "CANARY",
    release_id: input.release_id ?? "release://pc0226/promoted",
    release_verification_manifest_ref: "release-verification://pc0226/approved",
    rollback_boundary_state: input.rollback_boundary_state,
    rollback_of_release_id: input.rollback_of_release_id,
    rollback_runbook_ref: "runbook://pc0226/rollback",
    rollout_state: rolloutState,
    rollout_strategy: rolloutStrategy,
    schema_reader_window_contract: schemaReaderWindow(input.reader_window_state),
    transition_applied_at: "2026-05-05T19:00:00Z",
    transition_audit_ref: `audit://pc0226/${rolloutState.toLowerCase()}`,
    transition_event_code: input.transition_event_code ?? "promote",
  });
}

test("derives rollback-allowed posture while the reader window remains rollback compatible", async () => {
  const release = releaseFixture();
  const report = deriveReleaseRollbackBoundaryReport(release);

  expect(report).toMatchObject({
    derived_rollback_boundary_state: "ROLLBACK_ALLOWED",
    rollback_allowed: true,
  });
  expect(applyReleaseFailForwardBoundary({
    release,
    transition_applied_at: "2026-05-05T19:10:00Z",
    transition_audit_ref: "audit://pc0226/noop",
  })).toEqual(release);
  await validateContractSchema("deployment_release", release);
});

test("forces fail-forward ownership and compensating release once rollback is unsafe", async () => {
  const closedPromoted = releaseFixture({
    reader_window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
    rollback_boundary_state: "FAIL_FORWARD_ONLY",
    release_id: "release://pc0226/closed",
  });

  expect(() =>
    applyReleaseFailForwardBoundary({
      release: closedPromoted,
      transition_applied_at: "2026-05-05T19:15:00Z",
      transition_audit_ref: "audit://pc0226/fail-forward-missing-owner",
    }),
  ).toThrow(DeploymentReleaseModelError);

  const failedForward = applyReleaseFailForwardBoundary({
    compensating_release_id_or_null: "release://pc0226/compensating",
    fail_forward_owner_ref_or_null: "operator://pc0226/release-owner",
    health_gate_state: "AMBER",
    release: closedPromoted,
    transition_applied_at: "2026-05-05T19:20:00Z",
    transition_audit_ref: "audit://pc0226/fail-forward",
  });

  expect(failedForward).toMatchObject({
    compensating_release_id_or_null: "release://pc0226/compensating",
    fail_forward_owner_ref_or_null: "operator://pc0226/release-owner",
    rollback_boundary_state: "FAIL_FORWARD_ONLY",
    rollout_state: "FAILED_FORWARD",
    rollout_strategy: "FAIL_FORWARD_COMPENSATING",
  });
  await validateContractSchema("deployment_release", failedForward);
});

test("rejects rolled-back and aborted release posture after the reader window closes", () => {
  expect(() =>
    releaseFixture({
      previous_state_or_null: "PROMOTED",
      reader_window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollback_boundary_state: "FAIL_FORWARD_ONLY",
      rollback_of_release_id: "release://pc0226/previous",
      rollout_state: "ROLLED_BACK",
      transition_event_code: "rollback",
    }),
  ).toThrow(/ROLLED_BACK/);

  expect(() =>
    releaseFixture({
      canary_fraction: 0.1,
      health_gate_state: "RED",
      reader_window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollback_boundary_state: "FAIL_FORWARD_ONLY",
      rollout_state: "ABORTED",
      transition_event_code: "abort",
    }),
  ).toThrow(/ABORTED/);
});
