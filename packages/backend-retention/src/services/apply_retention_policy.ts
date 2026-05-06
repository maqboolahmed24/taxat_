import {
  artifactRetentionFromTag,
  type ArtifactRetentionLifecycleState,
  type ArtifactRetentionRecord,
} from "../models/artifact_retention.ts";
import {
  assertRetention,
  type RetentionLimitationBehavior,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";
import {
  deriveRetentionTag,
  type DeriveRetentionTagInput,
} from "./derive_retention_tag.ts";

export type RetentionLifecycleApplicationInput = DeriveRetentionTagInput & {
  tenant_id: string;
  observed_at: string;
  lifecycle_state?: ArtifactRetentionLifecycleState;
  workflow_item_refs?: readonly string[];
  next_checkpoint_at?: string | null;
  erasure_request_ref?: string | null;
  erasure_action_ref?: string | null;
  erasure_proof_ref?: string | null;
};

export type RetentionLifecycleApplication = {
  retention_tag: RetentionTagRecord;
  artifact_retention: ArtifactRetentionRecord;
};

function completedErasureState(input: RetentionLifecycleApplicationInput, tag: RetentionTagRecord) {
  if (!input.erasure_action_ref || !input.erasure_proof_ref || !input.erasure_request_ref) {
    return null;
  }
  if (tag.limitation_behavior === "PSEUDONYMISED_SURVIVAL") {
    return "PSEUDONYMISED" as const;
  }
  return "ERASED" as const;
}

function inferLifecycleState(
  input: RetentionLifecycleApplicationInput,
  tag: RetentionTagRecord,
): ArtifactRetentionLifecycleState {
  if (input.lifecycle_state !== undefined) {
    return input.lifecycle_state;
  }
  if (tag.legal_hold_state === "ACTIVE" || tag.legal_hold_state === "RELEASE_ELIGIBLE") {
    return "LEGAL_HOLD";
  }
  const completedState = completedErasureState(input, tag);
  if (completedState !== null) {
    return completedState;
  }
  if (input.erasure_request_ref) {
    return "ERASURE_PENDING";
  }
  if (tag.limitation_behavior !== "NONE") {
    return "LIMITED";
  }
  return "ACTIVE";
}

function limitationForLifecycle(
  lifecycleState: ArtifactRetentionLifecycleState,
  tag: RetentionTagRecord,
): {
  limitation_behavior: RetentionLimitationBehavior | null;
  limitation_reason_codes: readonly string[];
} {
  if (lifecycleState === "LIMITED" || lifecycleState === "PSEUDONYMISED") {
    assertRetention(
      tag.limitation_behavior !== "NONE" && tag.limitation_reason_codes.length > 0,
      "RETENTION_LIMITATION_INVALID",
      `${lifecycleState} requires limitation semantics on the canonical retention tag`,
    );
    return {
      limitation_behavior: tag.limitation_behavior,
      limitation_reason_codes: tag.limitation_reason_codes,
    };
  }
  return {
    limitation_behavior: null,
    limitation_reason_codes: [],
  };
}

export function applyRetentionPolicy(
  input: RetentionLifecycleApplicationInput,
): RetentionLifecycleApplication {
  const retentionTag = deriveRetentionTag(input);
  const lifecycleState = inferLifecycleState(input, retentionTag);
  const limitation = limitationForLifecycle(lifecycleState, retentionTag);

  const artifactRetention = artifactRetentionFromTag({
    artifact_ref: input.artifact_ref,
    erasure_action_ref: input.erasure_action_ref ?? null,
    erasure_proof_ref: input.erasure_proof_ref ?? null,
    erasure_request_ref: input.erasure_request_ref ?? null,
    hold_ref: lifecycleState === "LEGAL_HOLD" ? retentionTag.legal_hold_ref : null,
    last_evaluated_at: input.observed_at,
    lifecycle_state: lifecycleState,
    limitation_behavior: limitation.limitation_behavior,
    limitation_reason_codes: limitation.limitation_reason_codes,
    next_checkpoint_at:
      lifecycleState === "LEGAL_HOLD" || lifecycleState === "ERASURE_PENDING"
        ? input.next_checkpoint_at ?? null
        : null,
    retention_tag: retentionTag,
    state_changed_at: input.observed_at,
    tenant_id: input.tenant_id,
    workflow_item_refs:
      lifecycleState === "LEGAL_HOLD" || lifecycleState === "ERASURE_PENDING"
        ? [...(input.workflow_item_refs ?? [])]
        : [],
  });

  return {
    retention_tag: retentionTag,
    artifact_retention: artifactRetention,
  };
}
