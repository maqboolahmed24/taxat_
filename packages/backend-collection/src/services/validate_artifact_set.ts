import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
} from "../models/collection_control_common.ts";
import {
  type ArtifactSchemaValidator,
  type ArtifactValidationIssue,
  type ArtifactValidationResult,
} from "../types/artifact_validation_result.ts";
import { validateArtifact } from "./validate_artifact.ts";

const INTAKE_SET_TYPES = new Set([
  "SourceRecordSet",
  "EvidenceItemSet",
  "CandidateFactSet",
  "ConflictSet",
  "CanonicalFactSet",
]);

function getObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function issue(input: {
  artifact_ref: string;
  artifact_type: string;
  detail: string;
}): ArtifactValidationIssue {
  return {
    artifact_ref: input.artifact_ref,
    artifact_type: input.artifact_type,
    detail: input.detail,
    reason_code: "ARTIFACT_SCHEMA_VALIDATION_FAILED",
    severity: "ERROR",
  };
}

function stablePayload(value: unknown) {
  return deriveCollectionControlHash({
    artifact_family: "ARTIFACT_SET_VALIDATION_ITEM",
    payload: value,
  });
}

export async function validateArtifactSet(input: {
  artifact: unknown;
  artifact_ref?: string;
  schema_bundle: SchemaBundleRecord;
  schema_validator?: ArtifactSchemaValidator;
}): Promise<ArtifactValidationResult> {
  const artifact = getObject(input.artifact);
  const artifactType = normalizeCollectionString(
    "artifact_set_validation.artifact_type",
    artifact.artifact_type,
  );
  const result = await validateArtifact({
    artifact: input.artifact,
    ...(input.artifact_ref === undefined ? {} : { artifact_ref: input.artifact_ref }),
    artifact_type: artifactType,
    schema_bundle: input.schema_bundle,
    ...(input.schema_validator === undefined ? {} : { schema_validator: input.schema_validator }),
  });
  const issues = [...result.issues];

  if (!INTAKE_SET_TYPES.has(artifactType)) {
    issues.push(
      issue({
        artifact_ref: result.artifact_ref,
        artifact_type: artifactType,
        detail: "artifact set validation only accepts authoritative intake set families",
      }),
    );
  }
  if (!Array.isArray(artifact.items)) {
    issues.push(
      issue({
        artifact_ref: result.artifact_ref,
        artifact_type: artifactType,
        detail: "artifact set items must be an array",
      }),
    );
  } else {
    const seen = new Set<string>();
    for (const item of artifact.items) {
      const payload = stablePayload(item);
      if (seen.has(payload)) {
        issues.push(
          issue({
            artifact_ref: result.artifact_ref,
            artifact_type: artifactType,
            detail: "artifact set contains a duplicate canonical item payload",
          }),
        );
        break;
      }
      seen.add(payload);
    }
  }

  const decision = issues.some((entry) => entry.severity === "ERROR")
    ? "HARD_BLOCK"
    : issues.some((entry) => entry.severity === "NOTICE")
      ? "PASS_WITH_NOTICE"
      : "PASS";
  return {
    ...result,
    decision,
    issues,
    reason_codes:
      issues.length === 0
        ? ["ARTIFACT_CONTRACTS_VALID"]
        : [...new Set(issues.map((entry) => entry.reason_code))].sort(),
  };
}
