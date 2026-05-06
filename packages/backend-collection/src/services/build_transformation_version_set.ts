import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export type TransformationVersionSetInput = {
  additional_transformation_refs?: readonly string[];
  connector_build_refs?: readonly string[];
  evidence_rules_ref: string;
  extractor_build_refs?: readonly string[];
  mapping_rules_ref: string;
  normalization_rules_ref: string;
  promotion_rules_ref: string;
  schema_bundle_hash?: string;
};

type TransformationVersionKind =
  | "additional"
  | "connector-build"
  | "evidence-rules"
  | "extractor-build"
  | "mapping-rules"
  | "normalization-rules"
  | "promotion-rules"
  | "schema-bundle";

export function transformationVersionRef(input: {
  kind: TransformationVersionKind;
  ref: string;
}) {
  const ref = normalizeCollectionString(`transformation_version.${input.kind}`, input.ref);
  return `transformation-version://${input.kind}/${deriveCollectionControlHash({
    artifact_family: "TRANSFORMATION_VERSION_REF",
    payload: {
      kind: input.kind,
      ref,
    },
  })}`;
}

function addRefs(
  output: string[],
  kind: TransformationVersionKind,
  refs: readonly string[] | undefined,
) {
  const normalized = normalizeCollectionStringSet(`transformation_version.${kind}`, refs ?? []);
  for (const ref of normalized) {
    output.push(transformationVersionRef({ kind, ref }));
  }
}

export function buildTransformationVersionSet(input: TransformationVersionSetInput) {
  const versions = [
    transformationVersionRef({ kind: "mapping-rules", ref: input.mapping_rules_ref }),
    transformationVersionRef({ kind: "evidence-rules", ref: input.evidence_rules_ref }),
    transformationVersionRef({ kind: "promotion-rules", ref: input.promotion_rules_ref }),
    transformationVersionRef({
      kind: "normalization-rules",
      ref: input.normalization_rules_ref,
    }),
  ];

  if (input.schema_bundle_hash !== undefined) {
    versions.push(transformationVersionRef({ kind: "schema-bundle", ref: input.schema_bundle_hash }));
  }
  addRefs(versions, "connector-build", input.connector_build_refs);
  addRefs(versions, "extractor-build", input.extractor_build_refs);
  addRefs(versions, "additional", input.additional_transformation_refs);

  return normalizeCollectionStringSet("normalization_context.transformation_version_set", versions, {
    minItems: 1,
  });
}
