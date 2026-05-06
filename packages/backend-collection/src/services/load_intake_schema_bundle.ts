import type {
  LoadedSchemaBundleContext,
  SchemaBundleLoader,
} from "../../../backend-manifest/src/services/schema_bundle_loader.ts";
import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import { normalizeSchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";

export type IntakeSchemaBundleContext = Pick<
  LoadedSchemaBundleContext,
  "schema_bundle" | "schema_reader_window_contract"
>;

export type LoadIntakeSchemaBundleErrorCode =
  | "INTAKE_SCHEMA_BUNDLE_INPUT_REQUIRED"
  | "INTAKE_SCHEMA_BUNDLE_HASH_MISMATCH";

export class LoadIntakeSchemaBundleError extends Error {
  readonly code: LoadIntakeSchemaBundleErrorCode;

  constructor(code: LoadIntakeSchemaBundleErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LoadIntakeSchemaBundleError";
    this.code = code;
  }
}

export async function loadIntakeSchemaBundle(input: {
  loader?: Pick<SchemaBundleLoader, "requireBundleContext">;
  schema_bundle?: SchemaBundleRecord;
  schema_bundle_hash: string;
}): Promise<IntakeSchemaBundleContext> {
  const schemaBundleHash = normalizeCollectionString(
    "intake_schema_bundle.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const loaded =
    input.schema_bundle === undefined
      ? await input.loader?.requireBundleContext(schemaBundleHash)
      : {
          schema_bundle: normalizeSchemaBundleRecord(input.schema_bundle),
          schema_reader_window_contract: normalizeSchemaBundleRecord(input.schema_bundle)
            .schema_reader_window_contract,
        };

  if (loaded === undefined) {
    throw new LoadIntakeSchemaBundleError(
      "INTAKE_SCHEMA_BUNDLE_INPUT_REQUIRED",
      "schema bundle validation requires a direct bundle or loader",
    );
  }
  if (loaded.schema_bundle.schema_bundle_hash !== schemaBundleHash) {
    throw new LoadIntakeSchemaBundleError(
      "INTAKE_SCHEMA_BUNDLE_HASH_MISMATCH",
      "loaded schema bundle must match the requested frozen schema_bundle_hash",
    );
  }

  return {
    schema_bundle: loaded.schema_bundle,
    schema_reader_window_contract: loaded.schema_reader_window_contract,
  };
}
