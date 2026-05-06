import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type SchemaBundleAllowedUpgradeKind =
  | "PATCH_BACKWARD"
  | "MINOR_BACKWARD"
  | "MAJOR_BREAKING";

export type SchemaBundleEntryRecord = {
  schema_id: string;
  artifact_type: string;
  semantic_version: string;
  content_hash: string;
  dialect_ref: string;
  compatibility_class: string;
  supersedes_schema_id?: string | null;
  writer_min_reader_version: string;
  allowed_upgrade_kinds: SchemaBundleAllowedUpgradeKind[];
};

const ALLOWED_UPGRADE_KIND_ORDER: SchemaBundleAllowedUpgradeKind[] = [
  "PATCH_BACKWARD",
  "MINOR_BACKWARD",
  "MAJOR_BREAKING",
];

type SchemaBundleEntryErrorCode =
  | "SCHEMA_BUNDLE_ENTRY_DUPLICATE"
  | "SCHEMA_BUNDLE_ENTRY_FIELD_REQUIRED";

export class SchemaBundleEntryModelError extends Error {
  readonly code: SchemaBundleEntryErrorCode;

  constructor(code: SchemaBundleEntryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaBundleEntryModelError";
    this.code = code;
  }
}

function normalizeOptionalString(label: string, value: string | null | undefined) {
  return value == null ? null : requireTrimmedString(label, value);
}

function normalizeAllowedUpgradeKinds(values: readonly SchemaBundleAllowedUpgradeKind[]) {
  const present = new Set(values);
  const normalized = ALLOWED_UPGRADE_KIND_ORDER.filter((kind) => present.has(kind));
  if (normalized.length === 0) {
    throw new SchemaBundleEntryModelError(
      "SCHEMA_BUNDLE_ENTRY_FIELD_REQUIRED",
      "allowed_upgrade_kinds must contain at least one upgrade kind",
    );
  }
  return normalized;
}

export function normalizeSchemaBundleEntryRecord(
  entry: SchemaBundleEntryRecord,
): SchemaBundleEntryRecord {
  return {
    schema_id: requireTrimmedString("schema_bundle_entry.schema_id", entry.schema_id),
    artifact_type: requireTrimmedString("schema_bundle_entry.artifact_type", entry.artifact_type),
    semantic_version: requireTrimmedString(
      "schema_bundle_entry.semantic_version",
      entry.semantic_version,
    ),
    content_hash: requireTrimmedString("schema_bundle_entry.content_hash", entry.content_hash),
    dialect_ref: requireTrimmedString("schema_bundle_entry.dialect_ref", entry.dialect_ref),
    compatibility_class: requireTrimmedString(
      "schema_bundle_entry.compatibility_class",
      entry.compatibility_class,
    ),
    supersedes_schema_id: normalizeOptionalString(
      "schema_bundle_entry.supersedes_schema_id",
      entry.supersedes_schema_id,
    ),
    writer_min_reader_version: requireTrimmedString(
      "schema_bundle_entry.writer_min_reader_version",
      entry.writer_min_reader_version,
    ),
    allowed_upgrade_kinds: normalizeAllowedUpgradeKinds(entry.allowed_upgrade_kinds),
  };
}

export function orderSchemaBundleEntries(entries: readonly SchemaBundleEntryRecord[]) {
  return [...entries].sort((left, right) => {
    const schemaCompare = left.schema_id.localeCompare(right.schema_id);
    if (schemaCompare !== 0) {
      return schemaCompare;
    }
    return left.artifact_type.localeCompare(right.artifact_type);
  });
}

export function normalizeSchemaBundleEntries(entries: readonly SchemaBundleEntryRecord[]) {
  const normalized = orderSchemaBundleEntries(entries.map(normalizeSchemaBundleEntryRecord));
  const seen = new Set<string>();
  for (const entry of normalized) {
    const key = `${entry.schema_id}::${entry.artifact_type}`;
    if (seen.has(key)) {
      throw new SchemaBundleEntryModelError(
        "SCHEMA_BUNDLE_ENTRY_DUPLICATE",
        `duplicate schema bundle entry for ${key}`,
      );
    }
    seen.add(key);
  }
  if (normalized.length === 0) {
    throw new SchemaBundleEntryModelError(
      "SCHEMA_BUNDLE_ENTRY_FIELD_REQUIRED",
      "schema bundles must contain at least one entry",
    );
  }
  return normalized;
}

export function cloneSchemaBundleEntryRecord(entry: SchemaBundleEntryRecord) {
  return structuredClone(entry);
}
