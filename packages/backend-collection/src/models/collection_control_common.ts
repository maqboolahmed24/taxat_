import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";

export const COLLECTION_SOURCE_CLASS_CODES = [
  "AUTHORITY_ACKNOWLEDGEMENT",
  "AUTHORITY_REFERENCE",
  "INSTITUTIONAL_FEED",
  "BOOKS_OF_ENTRY",
  "DOCUMENTARY_EVIDENCE",
  "DECLARED_ASSERTION",
  "DETERMINISTIC_DERIVATION",
  "PROBABILISTIC_INFERENCE",
  "GOVERNANCE_ARTIFACT",
] as const;

export const COLLECTION_LATE_DATA_POLICY_REFS = [
  "EXCLUDE_LATE",
  "SPAWN_CHILD_MANIFEST",
  "REVIEW_IF_LATE",
] as const;

export type CollectionSourceClass = (typeof COLLECTION_SOURCE_CLASS_CODES)[number];
export type CollectionSourceClassOrNull = CollectionSourceClass | null;
export type CollectionLateDataPolicyRef = (typeof COLLECTION_LATE_DATA_POLICY_REFS)[number];

export type CollectionControlModelErrorCode =
  | "COLLECTION_ARTIFACT_HASH_MISMATCH"
  | "COLLECTION_CONSTANT_INVALID"
  | "COLLECTION_FIELD_REQUIRED"
  | "COLLECTION_LATE_DATA_POLICY_INVALID"
  | "COLLECTION_SOURCE_CLASS_INVALID";

export class CollectionControlModelError extends Error {
  readonly code: CollectionControlModelErrorCode;

  constructor(code: CollectionControlModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionControlModelError";
    this.code = code;
  }
}

export function assertCollectionControl(
  condition: unknown,
  code: CollectionControlModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new CollectionControlModelError(code, detail);
  }
}

export function normalizeCollectionString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new CollectionControlModelError(
      "COLLECTION_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} is required`,
    );
  }
}

export function normalizeCollectionStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options?: { minItems?: number },
) {
  try {
    return normalizeStringSet(label, values, options);
  } catch (error) {
    throw new CollectionControlModelError(
      "COLLECTION_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} is invalid`,
    );
  }
}

export function normalizeCollectionRuntimeScopes(
  label: string,
  values: readonly string[] | null | undefined,
) {
  try {
    return normalizeScopeSequence(label, values, { allowEmpty: true }) as CanonicalScopeToken[];
  } catch (error) {
    throw new CollectionControlModelError(
      "COLLECTION_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} is invalid`,
    );
  }
}

export function normalizeCollectionSourceClass(
  label: string,
  value: unknown,
): CollectionSourceClass {
  const normalized = normalizeCollectionString(label, value);
  assertCollectionControl(
    COLLECTION_SOURCE_CLASS_CODES.includes(normalized as CollectionSourceClass),
    "COLLECTION_SOURCE_CLASS_INVALID",
    `${label} must be a canonical source class`,
  );
  return normalized as CollectionSourceClass;
}

export function normalizeCollectionSourceClassOrNull(
  label: string,
  value: unknown,
): CollectionSourceClassOrNull {
  if (value === null) {
    return null;
  }
  return normalizeCollectionSourceClass(label, value);
}

export function normalizeLateDataPolicyRef(
  label: string,
  value: unknown,
): CollectionLateDataPolicyRef {
  const normalized = normalizeCollectionString(label, value);
  assertCollectionControl(
    COLLECTION_LATE_DATA_POLICY_REFS.includes(normalized as CollectionLateDataPolicyRef),
    "COLLECTION_LATE_DATA_POLICY_INVALID",
    `${label} must be a canonical late-data policy ref`,
  );
  return normalized as CollectionLateDataPolicyRef;
}

export function buildCollectionArtifactContract(input: {
  artifact_content_hash: string;
  artifact_id: string;
  artifact_type: string;
  schema_bundle_hash?: string;
  schema_id: string;
  schema_source_hash: string;
  writer_build_id?: string;
}): SchemaBundleArtifactContract {
  return {
    artifact_id: normalizeCollectionString("artifact_contract.artifact_id", input.artifact_id),
    schema_id: input.schema_id,
    artifact_type: input.artifact_type,
    semantic_version: "1.0.0",
    content_hash: input.schema_source_hash,
    dialect_ref: "json-schema-draft-2020-12",
    compatibility_class: "BACKWARD_COMPATIBLE",
    supersedes_schema_id: null,
    writer_min_reader_version: "1.0.0",
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    schema_bundle_hash: normalizeCollectionString(
      "artifact_contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.collection.default",
    ),
    artifact_content_hash: normalizeCollectionString(
      "artifact_contract.artifact_content_hash",
      input.artifact_content_hash,
    ),
    writer_build_id: normalizeCollectionString(
      "artifact_contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.collection.0109",
    ),
  };
}

export function deriveCollectionControlHash(input: {
  artifact_family: string;
  payload: unknown;
}) {
  return stableJsonHash({
    artifact_family: input.artifact_family,
    payload: input.payload,
  });
}
