import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  normalizeSchemaBundleEntries,
  type SchemaBundleEntryRecord,
} from "./schema_bundle_entry.ts";
import {
  normalizeSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "./schema_reader_window_contract.ts";

export type SchemaBundleRecord = {
  schema_bundle_hash: string;
  published_at?: string | null;
  compatibility_profile_ref: string;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  entries: SchemaBundleEntryRecord[];
};

export const SCHEMA_BUNDLE_SCHEMA_ID = "https://taxat.dev/schemas/schema_bundle.schema.json";

type SchemaBundleModelErrorCode =
  | "SCHEMA_BUNDLE_ENTRY_SET_INVALID"
  | "SCHEMA_BUNDLE_HASH_MISMATCH"
  | "SCHEMA_BUNDLE_READER_WINDOW_MISMATCH";

export class SchemaBundleModelError extends Error {
  readonly code: SchemaBundleModelErrorCode;

  constructor(code: SchemaBundleModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaBundleModelError";
    this.code = code;
  }
}

function assertBundle(
  condition: unknown,
  code: SchemaBundleModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaBundleModelError(code, detail);
  }
}

function normalizeOptionalInstant(value: string | null | undefined) {
  return value == null ? null : normalizeUtcInstantString(value);
}

export function computeSchemaBundleHash(input: {
  compatibility_profile_ref: string;
  entries: readonly SchemaBundleEntryRecord[];
}) {
  return stableJsonHash({
    profile: "SCHEMA_BUNDLE_CONTENT_V1",
    compatibility_profile_ref: requireTrimmedString(
      "schema_bundle.compatibility_profile_ref",
      input.compatibility_profile_ref,
    ),
    entries: normalizeSchemaBundleEntries(input.entries),
  });
}

export function buildSchemaBundleRecord(input: {
  compatibility_profile_ref: string;
  entries: SchemaBundleEntryRecord[];
  published_at?: string | null;
  schema_reader_window_contract: Omit<
    SchemaReaderWindowContractRecord,
    "writer_schema_bundle_hash"
  > & {
    writer_schema_bundle_hash?: string;
  };
}): SchemaBundleRecord {
  const entries = normalizeSchemaBundleEntries(input.entries);
  const schemaBundleHash = computeSchemaBundleHash({
    compatibility_profile_ref: input.compatibility_profile_ref,
    entries,
  });
  return normalizeSchemaBundleRecord({
    schema_bundle_hash: schemaBundleHash,
    compatibility_profile_ref: input.compatibility_profile_ref,
    published_at: input.published_at ?? null,
    entries,
    schema_reader_window_contract: {
      ...input.schema_reader_window_contract,
      writer_schema_bundle_hash: schemaBundleHash,
      supported_reader_schema_bundle_hashes: [
        schemaBundleHash,
        ...input.schema_reader_window_contract.supported_reader_schema_bundle_hashes.filter(
          (hash) => hash !== schemaBundleHash,
        ),
      ],
    },
  });
}

export function normalizeSchemaBundleRecord(record: SchemaBundleRecord): SchemaBundleRecord {
  const entries = normalizeSchemaBundleEntries(record.entries);
  assertBundle(
    entries.length > 0,
    "SCHEMA_BUNDLE_ENTRY_SET_INVALID",
    "schema bundle entry set must not be empty",
  );
  const schemaBundleHash = requireTrimmedString(
    "schema_bundle.schema_bundle_hash",
    record.schema_bundle_hash,
  );
  const expectedHash = computeSchemaBundleHash({
    compatibility_profile_ref: record.compatibility_profile_ref,
    entries,
  });
  assertBundle(
    schemaBundleHash === expectedHash,
    "SCHEMA_BUNDLE_HASH_MISMATCH",
    "schema_bundle_hash must match normalized schema bundle entries and compatibility profile",
  );

  const readerWindow = normalizeSchemaReaderWindowContract(
    record.schema_reader_window_contract,
  );
  assertBundle(
    readerWindow.writer_schema_bundle_hash === schemaBundleHash,
    "SCHEMA_BUNDLE_READER_WINDOW_MISMATCH",
    "schema_reader_window_contract.writer_schema_bundle_hash must mirror schema_bundle_hash",
  );

  return {
    schema_bundle_hash: schemaBundleHash,
    published_at: normalizeOptionalInstant(record.published_at),
    compatibility_profile_ref: requireTrimmedString(
      "schema_bundle.compatibility_profile_ref",
      record.compatibility_profile_ref,
    ),
    schema_reader_window_contract: readerWindow,
    entries,
  };
}

export function cloneSchemaBundleRecord(record: SchemaBundleRecord) {
  return structuredClone(record);
}
