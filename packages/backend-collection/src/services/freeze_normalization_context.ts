import {
  buildNormalizationContextContract,
  deriveNormalizationContextHash,
  normalizeNormalizationContextRecord,
  type NormalizationContextDraft,
  type NormalizationContextRecord,
} from "../models/normalization_context.ts";
import { buildTransformationVersionSet, type TransformationVersionSetInput } from "./build_transformation_version_set.ts";

export type FreezeNormalizationContextInput = TransformationVersionSetInput & {
  manifest_id: string;
  normalization_context_id?: string;
  produced_at: string;
  schema_bundle_hash?: string;
  transformation_version_set?: readonly string[];
  writer_build_id?: string;
};

export function freezeNormalizationContext(
  input: FreezeNormalizationContextInput,
): NormalizationContextRecord {
  const draft: NormalizationContextDraft = {
    artifact_type: "NormalizationContext",
    evidence_rules_ref: input.evidence_rules_ref,
    manifest_id: input.manifest_id,
    mapping_rules_ref: input.mapping_rules_ref,
    normalization_context_id:
      input.normalization_context_id ?? `normalization-context.${input.manifest_id}`,
    normalization_rules_ref: input.normalization_rules_ref,
    produced_at: input.produced_at,
    promotion_rules_ref: input.promotion_rules_ref,
    transformation_version_set:
      input.transformation_version_set === undefined
        ? buildTransformationVersionSet(input)
        : [...input.transformation_version_set],
  };
  const normalizationContextHash = deriveNormalizationContextHash(draft);
  return normalizeNormalizationContextRecord({
    ...draft,
    contract: buildNormalizationContextContract({
      normalization_context_hash: normalizationContextHash,
      normalization_context_id: draft.normalization_context_id,
      ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
    normalization_context_hash: normalizationContextHash,
  });
}
