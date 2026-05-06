import { NormalizationContextSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";

export type NormalizationContextRecord = {
  artifact_type: "NormalizationContext";
  contract: SchemaBundleArtifactContract;
  evidence_rules_ref: string;
  manifest_id: string;
  mapping_rules_ref: string;
  normalization_context_hash: string;
  normalization_context_id: string;
  normalization_rules_ref: string;
  produced_at: string;
  promotion_rules_ref: string;
  transformation_version_set: string[];
};

export type NormalizationContextDraft = Omit<
  NormalizationContextRecord,
  "contract" | "normalization_context_hash"
>;

export type NormalizationContextModelErrorCode =
  | "NORMALIZATION_CONTEXT_ARTIFACT_TYPE_INVALID"
  | "NORMALIZATION_CONTEXT_HASH_MISMATCH";

export class NormalizationContextModelError extends Error {
  readonly code: NormalizationContextModelErrorCode;

  constructor(code: NormalizationContextModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "NormalizationContextModelError";
    this.code = code;
  }
}

export function normalizationContextRef(
  context: Pick<NormalizationContextRecord, "normalization_context_id">,
) {
  return `normalization-context://${context.normalization_context_id}`;
}

export function normalizeNormalizationContextDraft(
  input: NormalizationContextDraft,
): NormalizationContextDraft {
  if (input.artifact_type !== "NormalizationContext") {
    throw new NormalizationContextModelError(
      "NORMALIZATION_CONTEXT_ARTIFACT_TYPE_INVALID",
      "normalization contexts must carry artifact_type NormalizationContext",
    );
  }

  return {
    artifact_type: "NormalizationContext",
    evidence_rules_ref: normalizeCollectionString(
      "normalization_context.evidence_rules_ref",
      input.evidence_rules_ref,
    ),
    manifest_id: normalizeCollectionString("normalization_context.manifest_id", input.manifest_id),
    mapping_rules_ref: normalizeCollectionString(
      "normalization_context.mapping_rules_ref",
      input.mapping_rules_ref,
    ),
    normalization_context_id: normalizeCollectionString(
      "normalization_context.normalization_context_id",
      input.normalization_context_id,
    ),
    normalization_rules_ref: normalizeCollectionString(
      "normalization_context.normalization_rules_ref",
      input.normalization_rules_ref,
    ),
    produced_at: normalizeUtcInstantString(input.produced_at),
    promotion_rules_ref: normalizeCollectionString(
      "normalization_context.promotion_rules_ref",
      input.promotion_rules_ref,
    ),
    transformation_version_set: normalizeCollectionStringSet(
      "normalization_context.transformation_version_set",
      input.transformation_version_set,
      { minItems: 1 },
    ),
  };
}

export function deriveNormalizationContextHash(input: NormalizationContextDraft) {
  return `normalization-context-hash://${deriveCollectionControlHash({
    artifact_family: "NORMALIZATION_CONTEXT",
    payload: normalizeNormalizationContextDraft(input),
  })}`;
}

export function buildNormalizationContextContract(input: {
  normalization_context_hash: string;
  normalization_context_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.normalization_context_hash,
    artifact_id: normalizationContextRef({
      normalization_context_id: input.normalization_context_id,
    }),
    artifact_type: "NormalizationContext",
    schema_bundle_hash: input.schema_bundle_hash,
    schema_id: NormalizationContextSchemaLineage.schemaId,
    schema_source_hash: NormalizationContextSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id,
  });
}

export function normalizeNormalizationContextRecord(
  input: NormalizationContextRecord,
): NormalizationContextRecord {
  const draft = normalizeNormalizationContextDraft(input);
  const expectedHash = deriveNormalizationContextHash(draft);
  if (input.normalization_context_hash !== expectedHash) {
    throw new NormalizationContextModelError(
      "NORMALIZATION_CONTEXT_HASH_MISMATCH",
      "normalization_context_hash must match the canonical normalization context payload",
    );
  }
  return {
    ...draft,
    contract: structuredClone(input.contract),
    normalization_context_hash: expectedHash,
  };
}

export function cloneNormalizationContextRecord(record: NormalizationContextRecord) {
  return structuredClone(record);
}
