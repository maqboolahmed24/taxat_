import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type CandidateIdentityArrayNormalizationErrorCode =
  | "RELEASE_CANDIDATE_ARRAY_NOT_ARRAY"
  | "RELEASE_CANDIDATE_ARRAY_EMPTY_REF"
  | "RELEASE_CANDIDATE_ARRAY_DUPLICATE_REF"
  | "RELEASE_CANDIDATE_ARRAY_MIN_ITEMS"
  | "RELEASE_CANDIDATE_ARRAY_ORDER_DRIFT";

export class CandidateIdentityArrayNormalizationError extends Error {
  readonly code: CandidateIdentityArrayNormalizationErrorCode;

  constructor(code: CandidateIdentityArrayNormalizationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CandidateIdentityArrayNormalizationError";
    this.code = code;
  }
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function normalizeCandidateIdentityStringSet(
  label: string,
  values: unknown,
  options?: {
    minItems?: number;
  },
) {
  if (!Array.isArray(values)) {
    throw new CandidateIdentityArrayNormalizationError(
      "RELEASE_CANDIDATE_ARRAY_NOT_ARRAY",
      `${label} must be an array`,
    );
  }

  const normalizedValues = values.map((value) => {
    try {
      return requireTrimmedString(label, value);
    } catch {
      throw new CandidateIdentityArrayNormalizationError(
        "RELEASE_CANDIDATE_ARRAY_EMPTY_REF",
        `${label} entries must be non-empty strings`,
      );
    }
  });

  const seen = new Set<string>();
  const duplicateRefs = new Set<string>();
  for (const value of normalizedValues) {
    if (seen.has(value)) {
      duplicateRefs.add(value);
      continue;
    }
    seen.add(value);
  }

  if (duplicateRefs.size > 0) {
    throw new CandidateIdentityArrayNormalizationError(
      "RELEASE_CANDIDATE_ARRAY_DUPLICATE_REF",
      `${label} must not repeat refs: ${[...duplicateRefs].sort().join(", ")}`,
    );
  }

  const sortedValues = sortSetLikeStrings(normalizedValues);
  const minItems = options?.minItems ?? 0;
  if (sortedValues.length < minItems) {
    throw new CandidateIdentityArrayNormalizationError(
      "RELEASE_CANDIDATE_ARRAY_MIN_ITEMS",
      `${label} must contain at least ${minItems} item(s)`,
    );
  }

  return sortedValues;
}

export function normalizeCandidateIdentityArrays(input: {
  enabled_provider_profile_refs: unknown;
}) {
  return {
    enabled_provider_profile_refs: normalizeCandidateIdentityStringSet(
      "release_candidate_identity.enabled_provider_profile_refs",
      input.enabled_provider_profile_refs,
    ),
  };
}

export function assertCanonicalCandidateIdentityStringSet(
  label: string,
  values: readonly string[],
) {
  const normalizedValues = normalizeCandidateIdentityStringSet(label, values);
  if (!arraysEqual(values, normalizedValues)) {
    throw new CandidateIdentityArrayNormalizationError(
      "RELEASE_CANDIDATE_ARRAY_ORDER_DRIFT",
      `${label} must already be sorted and normalized`,
    );
  }
  return normalizedValues;
}

export function isCanonicalCandidateIdentityStringSet(values: readonly string[]) {
  try {
    return arraysEqual(
      values,
      normalizeCandidateIdentityStringSet("release_candidate_identity.array", values),
    );
  } catch {
    return false;
  }
}
