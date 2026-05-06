import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ArtifactRetentionRecord } from "../models/artifact_retention.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  type RetentionClass,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";
import { assertRetentionTagArtifactAlignment } from "./propagate_limitation_and_expiry.ts";

export type ErasureLawfulAction = "DELETE" | "PSEUDONYMISE" | "RETAIN_WITH_LIMITATION" | "BLOCK";

export type ErasureEligibilityCode =
  | "ELIGIBLE_DELETE"
  | "ELIGIBLE_PSEUDONYMISE"
  | "BLOCKED_LEGAL_HOLD"
  | "BLOCKED_MINIMUM_RETENTION"
  | "BLOCKED_PROOF_PRESERVATION"
  | "BLOCKED_AUTHORITY_AMBIGUITY"
  | "BLOCKED_MISSING_PROOF_PRECONDITION";

export type ErasureEligibilityDecision = {
  artifact_retention_ref: string;
  retention_tag_ref: string;
  retention_class: RetentionClass;
  target_ref: string;
  requested_at: string;
  eligibility_code: ErasureEligibilityCode;
  lawful_action: ErasureLawfulAction;
  blocking_reason_codes: string[];
  retained_basis_refs: string[];
  legal_hold_ref: string | null;
  proof_preservation_basis_ref: string | null;
  authority_ambiguity_ref: string | null;
};

export type DeriveErasureEligibilityInput = {
  artifact_retention: ArtifactRetentionRecord;
  requested_at: string;
  retention_tag: RetentionTagRecord;
  preferred_action?: "DELETE" | "PSEUDONYMISE";
  proof_preservation_preconditions_satisfied?: boolean;
};

function retainedBasisRefs(tag: RetentionTagRecord) {
  return [
    tag.retention_basis_ref,
    tag.proof_preservation_basis_ref,
    tag.authority_ambiguity_ref,
  ].filter((value): value is string => value !== null);
}

function canPseudonymise(tag: RetentionTagRecord) {
  return tag.pseudonymisation_mode !== "NONE" && tag.pseudonymisation_mode !== "FORBIDDEN";
}

function decision(input: {
  artifact_retention: ArtifactRetentionRecord;
  blocking_reason_codes?: readonly string[];
  eligibility_code: ErasureEligibilityCode;
  lawful_action: ErasureLawfulAction;
  requested_at: string;
  retention_tag: RetentionTagRecord;
}): ErasureEligibilityDecision {
  return {
    artifact_retention_ref: input.artifact_retention.retention_id,
    retention_tag_ref: input.retention_tag.retention_tag_id,
    retention_class: input.retention_tag.retention_class,
    target_ref: input.artifact_retention.artifact_ref,
    requested_at: input.requested_at,
    eligibility_code: input.eligibility_code,
    lawful_action: input.lawful_action,
    blocking_reason_codes: [...(input.blocking_reason_codes ?? [])].sort((left, right) =>
      left.localeCompare(right),
    ),
    retained_basis_refs: retainedBasisRefs(input.retention_tag),
    legal_hold_ref: input.retention_tag.legal_hold_ref,
    proof_preservation_basis_ref: input.retention_tag.proof_preservation_basis_ref,
    authority_ambiguity_ref: input.retention_tag.authority_ambiguity_ref,
  };
}

export function deriveErasureEligibility(
  input: DeriveErasureEligibilityInput,
): ErasureEligibilityDecision {
  assertRetentionTagArtifactAlignment(input);
  const requestedAt = normalizeUtcInstantString(input.requested_at);
  assertNonEmptyRetentionString("artifact_retention.retention_id", input.artifact_retention.retention_id);

  if (
    input.retention_tag.legal_hold_state === "ACTIVE" ||
    input.retention_tag.legal_hold_state === "RELEASE_ELIGIBLE" ||
    input.artifact_retention.lifecycle_state === "LEGAL_HOLD"
  ) {
    return decision({
      artifact_retention: input.artifact_retention,
      blocking_reason_codes: ["LEGAL_HOLD_UNRESOLVED"],
      eligibility_code: "BLOCKED_LEGAL_HOLD",
      lawful_action: "BLOCK",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  if (Date.parse(requestedAt) < Date.parse(input.retention_tag.minimum_expiry_at)) {
    return decision({
      artifact_retention: input.artifact_retention,
      blocking_reason_codes: ["STATUTORY_MINIMUM_RETENTION_UNMET"],
      eligibility_code: "BLOCKED_MINIMUM_RETENTION",
      lawful_action: "BLOCK",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  if (Date.parse(requestedAt) < Date.parse(input.retention_tag.effective_expiry_at)) {
    return decision({
      artifact_retention: input.artifact_retention,
      blocking_reason_codes: ["EFFECTIVE_RETENTION_WINDOW_UNMET"],
      eligibility_code: "BLOCKED_MINIMUM_RETENTION",
      lawful_action: "BLOCK",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  if (input.retention_tag.authority_ambiguity_ref !== null) {
    return decision({
      artifact_retention: input.artifact_retention,
      blocking_reason_codes: ["AUTHORITY_AMBIGUITY_UNRESOLVED"],
      eligibility_code: "BLOCKED_AUTHORITY_AMBIGUITY",
      lawful_action: "BLOCK",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  if (input.retention_tag.proof_preservation_basis_ref !== null) {
    if (input.proof_preservation_preconditions_satisfied !== true) {
      return decision({
        artifact_retention: input.artifact_retention,
        blocking_reason_codes: ["PROOF_PRESERVATION_PRECONDITION_MISSING"],
        eligibility_code: "BLOCKED_MISSING_PROOF_PRECONDITION",
        lawful_action: "BLOCK",
        requested_at: requestedAt,
        retention_tag: input.retention_tag,
      });
    }
    if (canPseudonymise(input.retention_tag)) {
      return decision({
        artifact_retention: input.artifact_retention,
        eligibility_code: "ELIGIBLE_PSEUDONYMISE",
        lawful_action: "PSEUDONYMISE",
        requested_at: requestedAt,
        retention_tag: input.retention_tag,
      });
    }
    return decision({
      artifact_retention: input.artifact_retention,
      blocking_reason_codes: ["PROOF_PRESERVATION_REQUIRES_SURVIVING_BASIS"],
      eligibility_code: "BLOCKED_PROOF_PRESERVATION",
      lawful_action: "RETAIN_WITH_LIMITATION",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  if (input.preferred_action === "PSEUDONYMISE") {
    assertRetention(
      canPseudonymise(input.retention_tag),
      "RETENTION_FIELD_INVALID",
      "preferred pseudonymisation requires a pseudonymisation-capable retention policy",
    );
    return decision({
      artifact_retention: input.artifact_retention,
      eligibility_code: "ELIGIBLE_PSEUDONYMISE",
      lawful_action: "PSEUDONYMISE",
      requested_at: requestedAt,
      retention_tag: input.retention_tag,
    });
  }

  return decision({
    artifact_retention: input.artifact_retention,
    eligibility_code: "ELIGIBLE_DELETE",
    lawful_action: "DELETE",
    requested_at: requestedAt,
    retention_tag: input.retention_tag,
  });
}
