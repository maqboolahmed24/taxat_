import {
  artifactRetentionFromTag,
  type ArtifactRetentionRecord,
} from "../models/artifact_retention.ts";
import { assertNonEmptyRetentionString, assertRetention, type RetentionTagRecord } from "../models/retention_tag.ts";
import { buildErasureProof, type ErasureProofRecord } from "./build_erasure_proof.ts";
import {
  deriveErasureEligibility,
  type ErasureEligibilityDecision,
} from "./derive_erasure_eligibility.ts";

export type ErasureExecutionResult =
  | {
      artifact_retention: ArtifactRetentionRecord;
      decision: ErasureEligibilityDecision;
      erasure_proof: ErasureProofRecord;
      execution_state: "COMPLETED";
    }
  | {
      artifact_retention: ArtifactRetentionRecord;
      decision: ErasureEligibilityDecision;
      erasure_proof: null;
      execution_state: "BLOCKED";
    };

export function executeErasureOrPseudonymisation(input: {
  action_completed_at?: string;
  action_result_ref?: string;
  artifact_retention: ArtifactRetentionRecord;
  created_at: string;
  erasure_action_ref: string;
  erasure_request_ref: string;
  manifest_id: string;
  preferred_action?: "DELETE" | "PSEUDONYMISE";
  proof_preservation_preconditions_satisfied?: boolean;
  requested_at: string;
  retention_tag: RetentionTagRecord;
}): ErasureExecutionResult {
  const decision = deriveErasureEligibility({
    artifact_retention: input.artifact_retention,
    preferred_action: input.preferred_action,
    proof_preservation_preconditions_satisfied: input.proof_preservation_preconditions_satisfied,
    requested_at: input.requested_at,
    retention_tag: input.retention_tag,
  });
  if (decision.lawful_action === "BLOCK" || decision.lawful_action === "RETAIN_WITH_LIMITATION") {
    return {
      artifact_retention: input.artifact_retention,
      decision,
      erasure_proof: null,
      execution_state: "BLOCKED",
    };
  }

  assertRetention(
    input.action_completed_at !== undefined && input.action_result_ref !== undefined,
    "RETENTION_FIELD_INVALID",
    "completed erasure proof requires a durable action result before proof emission",
  );
  const erasureRequestRef = assertNonEmptyRetentionString(
    "erasure_request_ref",
    input.erasure_request_ref,
  );
  const erasureActionRef = assertNonEmptyRetentionString(
    "erasure_action_ref",
    input.erasure_action_ref,
  );
  const builtProof = buildErasureProof({
    action_completed_at: input.action_completed_at,
    action_result_ref: input.action_result_ref,
    created_at: input.created_at,
    decision,
    erasure_action_ref: erasureActionRef,
    erasure_request_ref: erasureRequestRef,
    manifest_id: input.manifest_id,
    target_ref: input.artifact_retention.artifact_ref,
  });

  const pseudonymised = decision.lawful_action === "PSEUDONYMISE";
  assertRetention(
    !pseudonymised || input.retention_tag.limitation_behavior === "PSEUDONYMISED_SURVIVAL",
    "RETENTION_LIMITATION_INVALID",
    "pseudonymisation requires PSEUDONYMISED_SURVIVAL limitation behavior",
  );

  return {
    artifact_retention: artifactRetentionFromTag({
      artifact_ref: input.artifact_retention.artifact_ref,
      erasure_action_ref: erasureActionRef,
      erasure_proof_ref: builtProof.erasure_proof.erasure_proof_id,
      erasure_request_ref: erasureRequestRef,
      last_evaluated_at: input.created_at,
      lifecycle_state: pseudonymised ? "PSEUDONYMISED" : "ERASED",
      limitation_behavior: pseudonymised ? input.retention_tag.limitation_behavior : null,
      limitation_reason_codes: pseudonymised ? input.retention_tag.limitation_reason_codes : [],
      retention_id: input.artifact_retention.retention_id,
      retention_tag: input.retention_tag,
      state_changed_at: input.created_at,
      tenant_id: input.artifact_retention.tenant_id,
    }),
    decision,
    erasure_proof: builtProof.erasure_proof,
    execution_state: "COMPLETED",
  };
}
