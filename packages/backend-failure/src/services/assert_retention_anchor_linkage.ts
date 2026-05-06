import {
  normalizeArtifactRetention,
  type ArtifactRetentionRecord,
} from "../../../backend-retention/src/models/artifact_retention.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  normalizeRetentionTag,
  type RetentionTagRecord,
} from "../../../backend-retention/src/models/retention_tag.ts";
import { assertRetentionTagArtifactAlignment } from "../../../backend-retention/src/services/propagate_limitation_and_expiry.ts";

export class RetentionFailureBindingError extends Error {
  constructor(
    readonly code: "RETENTION_FAILURE_BINDING_INVALID",
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "RetentionFailureBindingError";
  }
}

export type RetentionAnchorCompanionSnapshot = {
  artifact_retention_ref?: string | null;
  label: string;
  retention_class?: string | null;
};

export type AssertRetentionAnchorLinkageInput = {
  artifact_retention: ArtifactRetentionRecord;
  companions?: readonly RetentionAnchorCompanionSnapshot[];
  retained_basis_ref?: string | null;
  retention_tag: RetentionTagRecord;
};

export type RetentionAnchorLinkage = {
  artifact_retention: ArtifactRetentionRecord;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
};

function bindingError(detail: string): never {
  throw new RetentionFailureBindingError("RETENTION_FAILURE_BINDING_INVALID", detail);
}

function basisRefs(retentionTag: RetentionTagRecord) {
  return [
    retentionTag.retention_basis_ref,
    retentionTag.proof_preservation_basis_ref,
    retentionTag.authority_ambiguity_ref,
  ].filter((value): value is string => value !== null);
}

export function deriveDefaultRetainedBasisRef(retentionTag: RetentionTagRecord) {
  if (retentionTag.erasure_eligibility === "BLOCKED_PROOF_PRESERVATION") {
    if (retentionTag.proof_preservation_basis_ref === null) {
      bindingError("BLOCKED_PROOF_PRESERVATION requires proof_preservation_basis_ref");
    }
    return retentionTag.proof_preservation_basis_ref;
  }
  if (retentionTag.erasure_eligibility === "BLOCKED_AUTHORITY_AMBIGUITY") {
    if (retentionTag.authority_ambiguity_ref === null) {
      bindingError("BLOCKED_AUTHORITY_AMBIGUITY requires authority_ambiguity_ref");
    }
    return retentionTag.authority_ambiguity_ref;
  }
  return retentionTag.retention_basis_ref;
}

function assertSameRetentionObject(
  artifactRetention: ArtifactRetentionRecord,
  companion: RetentionAnchorCompanionSnapshot,
) {
  if (
    companion.artifact_retention_ref !== undefined &&
    companion.artifact_retention_ref !== null &&
    companion.artifact_retention_ref !== artifactRetention.retention_id
  ) {
    bindingError(
      `${companion.label}.artifact_retention_ref must mirror the causal ArtifactRetention.retention_id`,
    );
  }
  if (
    companion.retention_class !== undefined &&
    companion.retention_class !== null &&
    companion.retention_class !== artifactRetention.retention_class
  ) {
    bindingError(
      `${companion.label}.retention_class must mirror the causal ArtifactRetention.retention_class`,
    );
  }
}

export function assertRetentionAnchorLinkage(
  input: AssertRetentionAnchorLinkageInput,
): RetentionAnchorLinkage {
  const retentionTag = normalizeRetentionTag(input.retention_tag);
  const artifactRetention = normalizeArtifactRetention(input.artifact_retention);
  assertRetentionTagArtifactAlignment({
    artifact_retention: artifactRetention,
    retention_tag: retentionTag,
  });

  const retainedBasisRef = assertNonEmptyRetentionString(
    "retained_basis_ref",
    input.retained_basis_ref ?? deriveDefaultRetainedBasisRef(retentionTag),
  );
  assertRetention(
    basisRefs(retentionTag).includes(retainedBasisRef),
    "RETENTION_BLOCKING_BASIS_INVALID",
    "retained_basis_ref must be one of the canonical RetentionTag basis refs",
  );

  for (const companion of input.companions ?? []) {
    assertSameRetentionObject(artifactRetention, companion);
  }

  return {
    artifact_retention: artifactRetention,
    retained_basis_ref: retainedBasisRef,
    retention_tag: retentionTag,
  };
}
