import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import type { SchemaBundleEntryRecord } from "../../../backend-manifest/src/models/schema_bundle_entry.ts";
import { normalizeSchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";
import type { ArtifactValidationIssue } from "../types/artifact_validation_result.ts";

export type FrozenSchemaEntryResolution = {
  entry: SchemaBundleEntryRecord | null;
  issues: ArtifactValidationIssue[];
};

function issue(input: {
  artifact_ref?: string;
  artifact_type: string;
  detail: string;
}): ArtifactValidationIssue {
  return {
    artifact_ref: input.artifact_ref ?? `artifact-type://${input.artifact_type}`,
    artifact_type: input.artifact_type,
    detail: input.detail,
    reason_code: "ARTIFACT_SCHEMA_MISSING",
    severity: "ERROR",
  };
}

export function resolveFrozenSchemaEntry(input: {
  artifact_ref?: string;
  artifact_type: string;
  schema_bundle: SchemaBundleRecord;
}): FrozenSchemaEntryResolution {
  const artifactType = normalizeCollectionString(
    "frozen_schema_entry.artifact_type",
    input.artifact_type,
  );
  const schemaBundle = normalizeSchemaBundleRecord(input.schema_bundle);
  const matches = schemaBundle.entries.filter((entry) => entry.artifact_type === artifactType);

  if (matches.length === 0) {
    return {
      entry: null,
      issues: [
        issue({
          ...(input.artifact_ref === undefined ? {} : { artifact_ref: input.artifact_ref }),
          artifact_type: artifactType,
          detail: `frozen schema bundle ${schemaBundle.schema_bundle_hash} has no entry for ${artifactType}`,
        }),
      ],
    };
  }

  if (matches.length > 1) {
    return {
      entry: null,
      issues: [
        issue({
          ...(input.artifact_ref === undefined ? {} : { artifact_ref: input.artifact_ref }),
          artifact_type: artifactType,
          detail: `frozen schema bundle ${schemaBundle.schema_bundle_hash} has multiple entries for ${artifactType}`,
        }),
      ],
    };
  }

  return { entry: matches[0]!, issues: [] };
}
