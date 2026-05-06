import {
  type ArtifactRetentionRecord,
} from "../models/artifact_retention.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  type RetentionLimitationBehavior,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";

export type RetentionSupportPosture =
  | "CONTROLLING_PROOF"
  | "REVIEW_ONLY"
  | "AUDIT_OR_TOMBSTONE_ONLY"
  | "UNSUPPORTED";

export type RetentionQuantitativeSemantics = {
  decision_information_ratio: number;
  projection_information_ratio: number;
  limitation_explicitness: number;
  silent_ambiguity: number;
  survivability: number;
  projection_fidelity: number;
  support_posture: RetentionSupportPosture;
};

export type RetentionQuantitativeInput = {
  decision_information_ratio: number;
  projection_information_ratio: number;
  limitation_explicitness?: number;
  limitation_behavior: RetentionLimitationBehavior | null;
  limitation_reason_codes: readonly string[];
};

export type PropagatedRetentionBinding = {
  target_ref: string;
  retention_tag_ref: string;
  artifact_retention_ref: string;
  retention_class: RetentionTagRecord["retention_class"];
  effective_expiry_at: string;
  limitation_behavior: RetentionLimitationBehavior | null;
  limitation_reason_codes: string[];
  proof_preservation_basis_ref: string | null;
  authority_ambiguity_ref: string | null;
  retained_basis_refs: string[];
  quantitative_semantics: RetentionQuantitativeSemantics;
};

function assertRatio(label: string, value: unknown) {
  assertRetention(
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1,
    "RETENTION_LIMITATION_INVALID",
    `${label} must be a finite ratio in [0,1]`,
  );
  return value;
}

function roundRatio(value: number) {
  return Number(value.toFixed(6));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function supportPosture(survivability: number): RetentionSupportPosture {
  if (survivability >= 0.8) {
    return "CONTROLLING_PROOF";
  }
  if (survivability >= 0.45) {
    return "REVIEW_ONLY";
  }
  if (survivability >= 0.15) {
    return "AUDIT_OR_TOMBSTONE_ONLY";
  }
  return "UNSUPPORTED";
}

function inferExplicitness(input: RetentionQuantitativeInput) {
  if (input.limitation_explicitness !== undefined) {
    return assertRatio("limitation_explicitness", input.limitation_explicitness);
  }
  if (input.decision_information_ratio === 1 && input.projection_information_ratio === 1) {
    return 1;
  }
  if (input.limitation_behavior !== null && input.limitation_reason_codes.length > 0) {
    return 1;
  }
  return 0;
}

export function deriveRetentionQuantitativeSemantics(
  input: RetentionQuantitativeInput,
): RetentionQuantitativeSemantics {
  const decisionInformationRatio = assertRatio(
    "decision_information_ratio",
    input.decision_information_ratio,
  );
  const projectionInformationRatio = assertRatio(
    "projection_information_ratio",
    input.projection_information_ratio,
  );
  assertRetention(
    projectionInformationRatio <= decisionInformationRatio,
    "RETENTION_LIMITATION_INVALID",
    "PRIVACY_PROJECTION_RATIO_INVALID: projection_information_ratio must not exceed decision_information_ratio",
  );

  const limitationExplicitness = inferExplicitness({
    ...input,
    decision_information_ratio: decisionInformationRatio,
    projection_information_ratio: projectionInformationRatio,
  });
  const silentAmbiguity = roundRatio(1 - limitationExplicitness);
  assertRetention(
    silentAmbiguity === 0,
    "RETENTION_LIMITATION_INVALID",
    "silent limitation ambiguity is a structural retention defect",
  );

  const survivability = roundRatio(
    clamp01(decisionInformationRatio * limitationExplicitness),
  );
  const projectionFidelity =
    decisionInformationRatio === 0
      ? 0
      : roundRatio(clamp01(projectionInformationRatio / decisionInformationRatio));

  return {
    decision_information_ratio: decisionInformationRatio,
    projection_information_ratio: projectionInformationRatio,
    limitation_explicitness: limitationExplicitness,
    silent_ambiguity: silentAmbiguity,
    survivability,
    projection_fidelity: projectionFidelity,
    support_posture: supportPosture(survivability),
  };
}

export function assertRetentionTagArtifactAlignment(input: {
  artifact_retention: ArtifactRetentionRecord;
  retention_tag: RetentionTagRecord;
}) {
  const { artifact_retention: artifactRetention, retention_tag: retentionTag } = input;
  assertRetention(
    artifactRetention.retention_tag_ref === retentionTag.retention_tag_id,
    "RETENTION_FIELD_INVALID",
    "ArtifactRetention.retention_tag_ref must match RetentionTag.retention_tag_id",
  );
  assertRetention(
    artifactRetention.retention_class === retentionTag.retention_class,
    "RETENTION_FIELD_INVALID",
    "ArtifactRetention.retention_class must match RetentionTag.retention_class",
  );
  for (const field of ["minimum_expiry_at", "policy_expiry_at", "effective_expiry_at"] as const) {
    assertRetention(
      artifactRetention[field] === retentionTag[field],
      "RETENTION_CHRONOLOGY_INVALID",
      `ArtifactRetention.${field} must mirror RetentionTag.${field}`,
    );
  }
  if (retentionTag.legal_hold_state === "ACTIVE" || retentionTag.legal_hold_state === "RELEASE_ELIGIBLE") {
    assertRetention(
      artifactRetention.lifecycle_state === "LEGAL_HOLD" &&
        artifactRetention.hold_ref === retentionTag.legal_hold_ref,
      "RETENTION_HOLD_POSTURE_INVALID",
      "active legal hold posture must propagate to ArtifactRetention",
    );
  }
  if (artifactRetention.lifecycle_state === "LIMITED") {
    assertRetention(
      retentionTag.limitation_behavior === artifactRetention.limitation_behavior,
      "RETENTION_LIMITATION_INVALID",
      "LIMITED ArtifactRetention must carry the canonical RetentionTag limitation behavior",
    );
  }
  if (artifactRetention.lifecycle_state === "PSEUDONYMISED") {
    assertRetention(
      retentionTag.limitation_behavior === "PSEUDONYMISED_SURVIVAL",
      "RETENTION_LIMITATION_INVALID",
      "PSEUDONYMISED ArtifactRetention requires PSEUDONYMISED_SURVIVAL on RetentionTag",
    );
  }
}

export function propagateLimitationAndExpiry(input: {
  artifact_retention: ArtifactRetentionRecord;
  retention_tag: RetentionTagRecord;
  target_refs: readonly string[];
  decision_information_ratio: number;
  projection_information_ratio: number;
  limitation_explicitness?: number;
}): PropagatedRetentionBinding[] {
  assertRetentionTagArtifactAlignment(input);
  const limitationBehavior =
    input.artifact_retention.limitation_behavior ??
    (input.retention_tag.limitation_behavior === "NONE"
      ? null
      : input.retention_tag.limitation_behavior);
  const limitationReasonCodes =
    input.artifact_retention.limitation_reason_codes.length > 0
      ? input.artifact_retention.limitation_reason_codes
      : input.retention_tag.limitation_reason_codes;

  const quantitativeSemantics = deriveRetentionQuantitativeSemantics({
    decision_information_ratio: input.decision_information_ratio,
    projection_information_ratio: input.projection_information_ratio,
    limitation_behavior: limitationBehavior,
    limitation_reason_codes: limitationReasonCodes,
    limitation_explicitness: input.limitation_explicitness,
  });

  const retainedBasisRefs = [
    input.retention_tag.retention_basis_ref,
    input.retention_tag.proof_preservation_basis_ref,
    input.retention_tag.authority_ambiguity_ref,
  ].filter((value): value is string => value !== null);

  return input.target_refs.map((targetRef) => ({
    target_ref: assertNonEmptyRetentionString("target_refs[]", targetRef),
    retention_tag_ref: input.retention_tag.retention_tag_id,
    artifact_retention_ref: input.artifact_retention.retention_id,
    retention_class: input.retention_tag.retention_class,
    effective_expiry_at: input.retention_tag.effective_expiry_at,
    limitation_behavior: limitationBehavior,
    limitation_reason_codes: [...limitationReasonCodes],
    proof_preservation_basis_ref: input.retention_tag.proof_preservation_basis_ref,
    authority_ambiguity_ref: input.retention_tag.authority_ambiguity_ref,
    retained_basis_refs: retainedBasisRefs,
    quantitative_semantics: quantitativeSemantics,
  }));
}
