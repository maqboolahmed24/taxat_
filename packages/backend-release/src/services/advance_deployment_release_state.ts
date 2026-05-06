import type { CanaryHealthSummaryRecord } from "../models/canary_health_summary.ts";
import {
  buildDeploymentReleaseRecord,
  cloneDeploymentReleaseRecord,
  DEPLOYMENT_RELEASE_ALLOWED_TRANSITIONS,
  DeploymentReleaseModelError,
  type DeploymentHealthGateState,
  type DeploymentReleaseRecord,
  type DeploymentReleaseTransitionEventCode,
  type DeploymentRollbackBoundaryState,
  type DeploymentRolloutState,
  type DeploymentRolloutStrategy,
} from "../models/deployment_release.ts";

export type AdvanceDeploymentReleaseStateInput = {
  release: DeploymentReleaseRecord;
  transition_event_code: DeploymentReleaseTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
  canary_health_summary?: CanaryHealthSummaryRecord;
  deployed_at?: string;
  rollback_of_release_id?: string | null;
  compensating_release_id_or_null?: string | null;
  fail_forward_owner_ref_or_null?: string | null;
  health_gate_state?: DeploymentHealthGateState;
  emergency_override_ref?: string | null;
  emergency_override_expires_at?: string | null;
};

function targetStateForTransition(
  from: DeploymentRolloutState,
  eventCode: DeploymentReleaseTransitionEventCode,
) {
  const transition = DEPLOYMENT_RELEASE_ALLOWED_TRANSITIONS.find(
    ([previousState, event]) => previousState === from && event === eventCode,
  );
  return transition?.[2];
}

function requireTargetState(
  from: DeploymentRolloutState,
  eventCode: DeploymentReleaseTransitionEventCode,
) {
  const target = targetStateForTransition(from, eventCode);
  if (!target) {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_ILLEGAL_TRANSITION",
      `cannot apply ${eventCode} from rollout_state=${from}`,
    );
  }
  return target;
}

function candidateMatchesCanarySummary(
  release: DeploymentReleaseRecord,
  canarySummary: CanaryHealthSummaryRecord,
) {
  return (
    canarySummary.candidate_identity_hash === release.candidate_identity_hash &&
    canarySummary.candidate_environment_ref === release.environment_ref &&
    canarySummary.build_artifact_ref === release.build_id &&
    canarySummary.candidate_identity_contract.candidate_identity_hash ===
      release.candidate_identity_hash
  );
}

function requireCanarySummaryCandidateMatch(
  release: DeploymentReleaseRecord,
  canarySummary: CanaryHealthSummaryRecord | undefined,
) {
  if (!canarySummary) {
    return;
  }
  if (!candidateMatchesCanarySummary(release, canarySummary)) {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_CANDIDATE_MISMATCH",
      "canary_health_summary must be bound to the same candidate tuple as the deployment release",
    );
  }
}

function valueOrExisting<T>(value: T | undefined, existing: T) {
  return typeof value === "undefined" ? existing : value;
}

export function advanceDeploymentReleaseState(
  input: AdvanceDeploymentReleaseStateInput,
): DeploymentReleaseRecord {
  const current = cloneDeploymentReleaseRecord(input.release);
  const targetState = requireTargetState(
    current.rollout_state,
    input.transition_event_code,
  );
  requireCanarySummaryCandidateMatch(current, input.canary_health_summary);

  let rolloutStrategy: DeploymentRolloutStrategy = current.rollout_strategy;
  let rollbackBoundaryState: DeploymentRollbackBoundaryState =
    current.rollback_boundary_state;
  let canaryFraction = current.canary_fraction;
  let healthGateState: DeploymentHealthGateState = current.health_gate_state;
  let deployedAt = valueOrExisting(input.deployed_at, current.deployed_at);
  let rollbackOfReleaseId = current.rollback_of_release_id;
  let compensatingReleaseId = current.compensating_release_id_or_null;
  let failForwardOwnerRef = current.fail_forward_owner_ref_or_null;
  let emergencyOverrideRef = current.emergency_override_ref;
  let emergencyOverrideExpiresAt = current.emergency_override_expires_at;

  if (input.canary_health_summary) {
    canaryFraction = input.canary_health_summary.canary_fraction;
    healthGateState = input.canary_health_summary.health_gate_state;
  }

  switch (input.transition_event_code) {
    case "canary_start":
      rolloutStrategy = "STANDARD_CANARY";
      deployedAt = valueOrExisting(input.deployed_at, deployedAt);
      canaryFraction = input.canary_health_summary?.canary_fraction ?? canaryFraction;
      healthGateState = input.canary_health_summary?.health_gate_state ?? healthGateState;
      rollbackOfReleaseId = null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "emergency_promote_with_override":
      rolloutStrategy = "EMERGENCY_PROMOTE";
      deployedAt = valueOrExisting(input.deployed_at, deployedAt);
      canaryFraction = null;
      healthGateState = "GREEN";
      rollbackOfReleaseId = null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef =
        input.emergency_override_ref ?? current.emergency_override_ref;
      emergencyOverrideExpiresAt =
        input.emergency_override_expires_at ?? current.emergency_override_expires_at;
      break;
    case "promote":
      rolloutStrategy = "STANDARD_CANARY";
      canaryFraction = input.canary_health_summary?.canary_fraction ?? canaryFraction;
      healthGateState = "GREEN";
      rollbackOfReleaseId = null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "abort":
      rolloutStrategy = "STANDARD_CANARY";
      canaryFraction = input.canary_health_summary?.canary_fraction ?? canaryFraction;
      healthGateState = "RED";
      rollbackBoundaryState = "ROLLBACK_ALLOWED";
      rollbackOfReleaseId = null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "rollback":
      if (
        current.rollback_boundary_state !== "ROLLBACK_ALLOWED" ||
        current.schema_reader_window_contract.window_state ===
          "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
      ) {
        throw new DeploymentReleaseModelError(
          "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED",
          "rollback is blocked once the reader window closes or rollback_boundary_state=FAIL_FORWARD_ONLY",
        );
      }
      rollbackBoundaryState = "ROLLBACK_ALLOWED";
      rollbackOfReleaseId = input.rollback_of_release_id ?? null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "rollback_unsafe_fail_forward_required":
      rolloutStrategy = "FAIL_FORWARD_COMPENSATING";
      rollbackBoundaryState = "FAIL_FORWARD_ONLY";
      canaryFraction = null;
      rollbackOfReleaseId = null;
      compensatingReleaseId = input.compensating_release_id_or_null ?? null;
      failForwardOwnerRef = input.fail_forward_owner_ref_or_null ?? null;
      healthGateState = input.health_gate_state ?? "AMBER";
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "emergency_pin":
      rolloutStrategy = "PIN_BASELINE";
      canaryFraction = null;
      rollbackOfReleaseId = null;
      compensatingReleaseId = null;
      failForwardOwnerRef = null;
      emergencyOverrideRef = null;
      emergencyOverrideExpiresAt = null;
      break;
    case "supersede":
      rollbackOfReleaseId = current.rollback_of_release_id;
      compensatingReleaseId = current.compensating_release_id_or_null;
      failForwardOwnerRef = current.fail_forward_owner_ref_or_null;
      emergencyOverrideRef = current.emergency_override_ref;
      emergencyOverrideExpiresAt = current.emergency_override_expires_at;
      break;
    case "release_planned":
      throw new DeploymentReleaseModelError(
        "DEPLOYMENT_RELEASE_ILLEGAL_TRANSITION",
        "release_planned is only valid for initial release lineage creation",
      );
  }

  return buildDeploymentReleaseRecord({
    release_id: current.release_id,
    candidate_identity_contract: current.candidate_identity_contract,
    recovery_governance_contract: current.recovery_governance_contract,
    schema_reader_window_contract: current.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract:
      current.schema_bundle_compatibility_gate_contract,
    rollout_strategy: rolloutStrategy,
    rollout_state: targetState,
    previous_state_or_null: current.rollout_state,
    transition_event_code: input.transition_event_code,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    rollback_boundary_state: rollbackBoundaryState,
    canary_fraction: canaryFraction,
    health_gate_state: healthGateState,
    release_verification_manifest_ref: current.release_verification_manifest_ref,
    deployed_at: deployedAt,
    rollback_of_release_id: rollbackOfReleaseId,
    compensating_release_id_or_null: compensatingReleaseId,
    rollback_runbook_ref: current.rollback_runbook_ref,
    fail_forward_runbook_ref: current.fail_forward_runbook_ref,
    fail_forward_owner_ref_or_null: failForwardOwnerRef,
    emergency_override_ref: emergencyOverrideRef,
    emergency_override_expires_at: emergencyOverrideExpiresAt,
  });
}
