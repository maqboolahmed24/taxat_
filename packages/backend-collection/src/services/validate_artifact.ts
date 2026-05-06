import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import type { SchemaBundleEntryRecord } from "../../../backend-manifest/src/models/schema_bundle_entry.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";
import {
  type ArtifactContractGateDecision,
  type ArtifactSchemaValidator,
  type ArtifactValidationIssue,
  type ArtifactValidationReasonCode,
  type ArtifactValidationResult,
} from "../types/artifact_validation_result.ts";
import { recordArtifactContractRef } from "./record_artifact_contract_ref.ts";
import { resolveFrozenSchemaEntry } from "./resolve_frozen_schema_entry.ts";

const CONTRACT_REQUIRED_FIELDS = [
  "schema_id",
  "semantic_version",
  "dialect_ref",
  "schema_bundle_hash",
  "artifact_content_hash",
  "writer_build_id",
] as const;

function getObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function artifactTypeFrom(input: { artifact: unknown; artifact_type?: string }) {
  return normalizeCollectionString(
    "artifact_validation.artifact_type",
    input.artifact_type ?? getObject(input.artifact).artifact_type,
  );
}

export function artifactRefFromContract(
  contract: Pick<SchemaBundleArtifactContract, "artifact_id"> | null | undefined,
  fallbackArtifactType: string,
) {
  return contract?.artifact_id
    ? normalizeCollectionString("artifact_validation.artifact_ref", contract.artifact_id)
    : `artifact://${fallbackArtifactType}/unknown`;
}

function artifactContractFrom(artifact: unknown): SchemaBundleArtifactContract | null {
  const contract = getObject(artifact).contract;
  return contract !== null && typeof contract === "object" && !Array.isArray(contract)
    ? (structuredClone(contract) as SchemaBundleArtifactContract)
    : null;
}

function issue(input: {
  artifact_ref: string;
  artifact_type: string;
  detail: string;
  reason_code: ArtifactValidationReasonCode;
  severity?: ArtifactValidationIssue["severity"];
}): ArtifactValidationIssue {
  return {
    artifact_ref: input.artifact_ref,
    artifact_type: input.artifact_type,
    detail: input.detail,
    reason_code: input.reason_code,
    severity: input.severity ?? "ERROR",
  };
}

function hasRequiredContractFields(contract: SchemaBundleArtifactContract | null) {
  if (contract === null) {
    return false;
  }
  return CONTRACT_REQUIRED_FIELDS.every((field) => {
    const value = contract[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function compatibilityClassIsDeprecated(entry: SchemaBundleEntryRecord) {
  return entry.compatibility_class.toUpperCase().includes("DEPRECATED");
}

function deprecatedAllowed(input: {
  entry: SchemaBundleEntryRecord;
  schema_bundle: SchemaBundleRecord;
}) {
  return (
    compatibilityClassIsDeprecated(input.entry) &&
    input.schema_bundle.schema_reader_window_contract.window_state !==
      "CONTRACT_ELIGIBLE_WINDOW_CLOSED" &&
    input.schema_bundle.schema_reader_window_contract.supported_reader_schema_bundle_hashes.includes(
      input.schema_bundle.schema_bundle_hash,
    )
  );
}

function validateEnvelope(input: {
  artifact_ref: string;
  artifact_type: string;
  contract: SchemaBundleArtifactContract | null;
  entry: SchemaBundleEntryRecord | null;
  schema_bundle: SchemaBundleRecord;
}) {
  const issues: ArtifactValidationIssue[] = [];
  if (!hasRequiredContractFields(input.contract)) {
    issues.push(
      issue({
        artifact_ref: input.artifact_ref,
        artifact_type: input.artifact_type,
        detail: "artifact contract lacks one or more required identity fields",
        reason_code: "ARTIFACT_ENVELOPE_INCOMPLETE",
      }),
    );
    return issues;
  }
  const contract = input.contract!;
  if (contract.schema_bundle_hash !== input.schema_bundle.schema_bundle_hash) {
    issues.push(
      issue({
        artifact_ref: input.artifact_ref,
        artifact_type: input.artifact_type,
        detail: "artifact contract references a schema bundle outside the frozen bundle",
        reason_code: "ARTIFACT_SCHEMA_NOT_IN_BUNDLE",
      }),
    );
  }
  if (input.entry === null) {
    return issues;
  }
  if (
    contract.schema_id !== input.entry.schema_id ||
    contract.artifact_type !== input.entry.artifact_type ||
    contract.content_hash !== input.entry.content_hash ||
    contract.dialect_ref !== input.entry.dialect_ref
  ) {
    issues.push(
      issue({
        artifact_ref: input.artifact_ref,
        artifact_type: input.artifact_type,
        detail: "artifact contract schema identity does not match the frozen schema entry",
        reason_code: "ARTIFACT_SCHEMA_NOT_IN_BUNDLE",
      }),
    );
  }
  if (
    contract.semantic_version !== input.entry.semantic_version ||
    contract.compatibility_class !== input.entry.compatibility_class ||
    contract.writer_min_reader_version !== input.entry.writer_min_reader_version ||
    !sameStringSet(contract.allowed_upgrade_kinds, input.entry.allowed_upgrade_kinds)
  ) {
    issues.push(
      issue({
        artifact_ref: input.artifact_ref,
        artifact_type: input.artifact_type,
        detail: "artifact contract version metadata does not match the frozen schema entry",
        reason_code: "ARTIFACT_VERSION_INCOMPATIBLE",
      }),
    );
  }
  if (compatibilityClassIsDeprecated(input.entry)) {
    issues.push(
      issue({
        artifact_ref: input.artifact_ref,
        artifact_type: input.artifact_type,
        detail: deprecatedAllowed({ entry: input.entry, schema_bundle: input.schema_bundle })
          ? "artifact uses a deprecated schema version allowed by the frozen reader window"
          : "artifact uses a deprecated schema version outside an allowed reader window",
        reason_code: deprecatedAllowed({ entry: input.entry, schema_bundle: input.schema_bundle })
          ? "ARTIFACT_SCHEMA_DEPRECATED_ALLOWED"
          : "ARTIFACT_VERSION_INCOMPATIBLE",
        severity: deprecatedAllowed({ entry: input.entry, schema_bundle: input.schema_bundle })
          ? "NOTICE"
          : "ERROR",
      }),
    );
  }
  return issues;
}

function validateTopLevelContractHash(input: {
  artifact: unknown;
  artifact_ref: string;
  artifact_type: string;
  contract: SchemaBundleArtifactContract | null;
}) {
  const artifact = getObject(input.artifact);
  const declared = artifact.artifact_contract_hash;
  if (input.artifact_type === "InputFreeze" || declared === undefined || input.contract === null) {
    return [];
  }
  const expected = recordArtifactContractRef({ contract: input.contract }).artifact_contract_hash;
  return declared === expected
    ? []
    : [
        issue({
          artifact_ref: input.artifact_ref,
          artifact_type: input.artifact_type,
          detail: "top-level artifact_contract_hash does not match the artifact contract content",
          reason_code: "ARTIFACT_CONTRACT_HASH_MISMATCH",
        }),
      ];
}

function decisionForIssues(issues: readonly ArtifactValidationIssue[]): ArtifactContractGateDecision {
  if (issues.some((entry) => entry.severity === "ERROR")) {
    return "HARD_BLOCK";
  }
  if (issues.some((entry) => entry.severity === "NOTICE")) {
    return "PASS_WITH_NOTICE";
  }
  return "PASS";
}

function reasonCodesForIssues(
  issues: readonly ArtifactValidationIssue[],
): ArtifactValidationReasonCode[] {
  if (issues.length === 0) {
    return ["ARTIFACT_CONTRACTS_VALID"];
  }
  return [...new Set(issues.map((entry) => entry.reason_code))].sort();
}

export async function validateArtifact(input: {
  artifact: unknown;
  artifact_ref?: string;
  artifact_type?: string;
  schema_bundle: SchemaBundleRecord;
  schema_validator?: ArtifactSchemaValidator;
}): Promise<ArtifactValidationResult> {
  const artifactType = artifactTypeFrom(input);
  const contract = artifactContractFrom(input.artifact);
  const artifactRef = input.artifact_ref ?? artifactRefFromContract(contract, artifactType);
  const resolution = resolveFrozenSchemaEntry({
    artifact_ref: artifactRef,
    artifact_type: artifactType,
    schema_bundle: input.schema_bundle,
  });
  const issues = [
    ...resolution.issues,
    ...validateEnvelope({
      artifact_ref: artifactRef,
      artifact_type: artifactType,
      contract,
      entry: resolution.entry,
      schema_bundle: input.schema_bundle,
    }),
    ...validateTopLevelContractHash({
      artifact: input.artifact,
      artifact_ref: artifactRef,
      artifact_type: artifactType,
      contract,
    }),
  ];

  if (input.schema_validator !== undefined && resolution.entry !== null) {
    const schemaValidation = await input.schema_validator({
      artifact: input.artifact,
      artifact_ref: artifactRef,
      artifact_type: artifactType,
      schema_id: resolution.entry.schema_id,
    });
    if (!schemaValidation.valid) {
      issues.push(
        issue({
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          detail: schemaValidation.issues
            .map((entry) => `${entry.path}: ${entry.message}`)
            .slice(0, 3)
            .join("; "),
          reason_code: "ARTIFACT_SCHEMA_VALIDATION_FAILED",
        }),
      );
    }
  }

  return {
    artifact_ref: artifactRef,
    artifact_type: artifactType,
    contract,
    decision: decisionForIssues(issues),
    issues,
    reason_codes: reasonCodesForIssues(issues),
    schema_entry: resolution.entry,
  };
}
