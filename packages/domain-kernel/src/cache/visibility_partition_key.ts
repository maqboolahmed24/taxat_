import { NONE_SENTINEL, stableJsonHash, sortSetLikeStrings } from "../primitives/hash.ts";

export type VisibilityPartitionDerivationInput = {
  cacheScopeClass: string;
  canonicalDimensionFields: readonly string[];
  fieldValues: Record<string, boolean | number | string | null | undefined>;
  visibilityDimensionRefsOrNull?: readonly string[] | null;
};

type VisibilityPartitionKeyErrorInit = {
  code:
    | "VISIBILITY_DIMENSION_FIELD_EMPTY"
    | "VISIBILITY_DIMENSION_REF_EMPTY"
    | "VISIBILITY_SCOPE_REQUIRED";
  detail: string;
};

export class VisibilityPartitionKeyError extends Error {
  readonly code: VisibilityPartitionKeyErrorInit["code"];

  constructor(init: VisibilityPartitionKeyErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "VisibilityPartitionKeyError";
    this.code = init.code;
  }
}

function normalizeValue(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return NONE_SENTINEL;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function deriveVisibilityPartitionKey(input: VisibilityPartitionDerivationInput) {
  if (typeof input.cacheScopeClass !== "string" || input.cacheScopeClass.length === 0) {
    throw new VisibilityPartitionKeyError({
      code: "VISIBILITY_SCOPE_REQUIRED",
      detail: "cache scope class is required to derive visibility partition identity",
    });
  }

  for (const fieldName of input.canonicalDimensionFields) {
    if (typeof fieldName !== "string" || fieldName.length === 0) {
      throw new VisibilityPartitionKeyError({
        code: "VISIBILITY_DIMENSION_FIELD_EMPTY",
        detail: "visibility partition fields must remain non-empty strings",
      });
    }
  }

  for (const entry of input.visibilityDimensionRefsOrNull ?? []) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new VisibilityPartitionKeyError({
        code: "VISIBILITY_DIMENSION_REF_EMPTY",
        detail: "visibility dimension refs must remain non-empty strings",
      });
    }
  }

  const dimensions = Object.fromEntries(
    input.canonicalDimensionFields.map((fieldName) => [
      fieldName,
      normalizeValue(input.fieldValues[fieldName]),
    ]),
  );

  return stableJsonHash({
    cache_scope_class: input.cacheScopeClass,
    canonical_dimensions: dimensions,
    contract_version: "VISIBILITY_PARTITION_KEY_V1",
    visibility_dimension_refs: sortSetLikeStrings(input.visibilityDimensionRefsOrNull ?? []),
  });
}
