import {
  buildDeploymentReleaseRecord,
  cloneDeploymentReleaseRecord,
  DeploymentReleaseModelError,
  rollbackBoundaryForReaderWindow,
  type DeploymentHealthGateState,
  type DeploymentReleaseRecord,
  type DeploymentRollbackBoundaryState,
} from "../models/deployment_release.ts";

export type ReleaseRollbackBoundaryReport = {
  release_id: string;
  reader_window_state: DeploymentReleaseRecord["schema_reader_window_contract"]["window_state"];
  gate_rollback_boundary_state: DeploymentRollbackBoundaryState;
  derived_rollback_boundary_state: DeploymentRollbackBoundaryState;
  release_rollback_boundary_state: DeploymentRollbackBoundaryState;
  rollback_allowed: boolean;
};

export function deriveReleaseRollbackBoundaryReport(
  release: DeploymentReleaseRecord,
): ReleaseRollbackBoundaryReport {
  const normalized = cloneDeploymentReleaseRecord(release);
  const derivedBoundary = rollbackBoundaryForReaderWindow(
    normalized.schema_reader_window_contract.window_state,
  );
  const gateBoundary =
    normalized.schema_bundle_compatibility_gate_contract.rollback_boundary_state;
  if (
    normalized.rollback_boundary_state !== derivedBoundary ||
    gateBoundary !== derivedBoundary
  ) {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED",
      "deployment release rollback boundary must mirror the schema reader window and compatibility gate",
    );
  }
  return {
    release_id: normalized.release_id,
    reader_window_state: normalized.schema_reader_window_contract.window_state,
    gate_rollback_boundary_state: gateBoundary,
    derived_rollback_boundary_state: derivedBoundary,
    release_rollback_boundary_state: normalized.rollback_boundary_state,
    rollback_allowed: derivedBoundary === "ROLLBACK_ALLOWED",
  };
}

export type ApplyReleaseFailForwardBoundaryInput = {
  release: DeploymentReleaseRecord;
  transition_applied_at: unknown;
  transition_audit_ref: unknown;
  compensating_release_id_or_null?: unknown;
  fail_forward_owner_ref_or_null?: unknown;
  health_gate_state?: DeploymentHealthGateState;
};

export function applyReleaseFailForwardBoundary(
  input: ApplyReleaseFailForwardBoundaryInput,
): DeploymentReleaseRecord {
  const current = cloneDeploymentReleaseRecord(input.release);
  const report = deriveReleaseRollbackBoundaryReport(current);
  if (report.rollback_allowed) {
    if (current.rollout_state === "FAILED_FORWARD") {
      throw new DeploymentReleaseModelError(
        "DEPLOYMENT_RELEASE_POLICY_INVALID",
        "FAILED_FORWARD posture is not lawful while rollback remains allowed",
      );
    }
    return current;
  }
  if (current.rollout_state === "FAILED_FORWARD") {
    return current;
  }
  if (current.rollout_state === "ROLLED_BACK") {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED",
      "ROLLED_BACK is not lawful when rollback_boundary_state=FAIL_FORWARD_ONLY",
    );
  }
  if (current.rollout_state !== "PROMOTED") {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_ILLEGAL_TRANSITION",
      "fail-forward boundary application requires a promoted release or an existing failed-forward release",
    );
  }
  return buildDeploymentReleaseRecord({
    release_id: current.release_id,
    candidate_identity_contract: current.candidate_identity_contract,
    recovery_governance_contract: current.recovery_governance_contract,
    schema_reader_window_contract: current.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract:
      current.schema_bundle_compatibility_gate_contract,
    rollout_strategy: "FAIL_FORWARD_COMPENSATING",
    rollout_state: "FAILED_FORWARD",
    previous_state_or_null: current.rollout_state,
    transition_event_code: "rollback_unsafe_fail_forward_required",
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    rollback_boundary_state: "FAIL_FORWARD_ONLY",
    canary_fraction: null,
    health_gate_state: input.health_gate_state ?? "AMBER",
    release_verification_manifest_ref: current.release_verification_manifest_ref,
    deployed_at: current.deployed_at,
    rollback_of_release_id: null,
    compensating_release_id_or_null: input.compensating_release_id_or_null,
    rollback_runbook_ref: current.rollback_runbook_ref,
    fail_forward_runbook_ref: current.fail_forward_runbook_ref,
    fail_forward_owner_ref_or_null: input.fail_forward_owner_ref_or_null,
    emergency_override_ref: null,
    emergency_override_expires_at: null,
  });
}
