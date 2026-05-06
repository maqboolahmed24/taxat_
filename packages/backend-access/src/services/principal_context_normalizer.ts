import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";

export const CANONICAL_SCOPE_TOKENS = [
  "year_end",
  "quarterly_update",
  "estimate_only",
  "prepare_submission",
  "submit",
  "amendment_intent",
  "amendment_submit",
] as const;

export type CanonicalScopeToken = (typeof CANONICAL_SCOPE_TOKENS)[number];
export type ScopeExecutionBindingScopeFamily =
  | "READ_ONLY"
  | "PREPARE_ONLY"
  | "PREPARE_AND_SUBMIT"
  | "AMENDMENT_INTENT"
  | "AMENDMENT_SUBMIT";
export type ScopeMutationAtomicity = "ATOMIC_REQUIRED" | "NARROWING_ALLOWED";

const canonicalScopeTokenSet = new Set<string>(CANONICAL_SCOPE_TOKENS);
const canonicalScopeOrder = new Map(
  CANONICAL_SCOPE_TOKENS.map((token, index) => [token, index] as const),
);
const REPORTING_SCOPE_TOKENS = new Set<string>([
  "year_end",
  "quarterly_update",
  "estimate_only",
]);

export const LIVE_MUTATION_SCOPE_TOKENS = new Set<string>([
  "prepare_submission",
  "submit",
  "amendment_intent",
  "amendment_submit",
]);

export function requireTrimmedString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

export function normalizeStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options?: {
    minItems?: number;
  },
) {
  const normalizedValues = [...new Set((values ?? []).map((value) => requireTrimmedString(label, value)))];
  const sorted = sortSetLikeStrings(normalizedValues);

  if ((options?.minItems ?? 0) > 0 && sorted.length < (options?.minItems ?? 0)) {
    throw new Error(`${label} must contain at least ${options?.minItems} item(s)`);
  }

  return sorted;
}

export function normalizeScopeSequence(
  label: string,
  values: readonly string[] | null | undefined,
  options?: {
    allowEmpty?: boolean;
  },
) {
  const normalizedValues = [...new Set((values ?? []).map((value) => requireTrimmedString(label, value)))];

  for (const token of normalizedValues) {
    if (!canonicalScopeTokenSet.has(token)) {
      throw new Error(`${label} contains unsupported scope token ${token}`);
    }
  }

  const validatedValues = normalizedValues as CanonicalScopeToken[];
  const sorted = [...validatedValues].sort((left, right) => {
    const leftOrder = canonicalScopeOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = canonicalScopeOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right);
  }) as CanonicalScopeToken[];

  if (!options?.allowEmpty && sorted.length === 0) {
    throw new Error(`${label} must contain at least one scope token`);
  }

  return sorted;
}

export function assertStringSubset(
  label: string,
  subset: readonly string[],
  superset: readonly string[],
) {
  const supersetSet = new Set(superset);
  for (const value of subset) {
    if (!supersetSet.has(value)) {
      throw new Error(`${label} cannot widen beyond the frozen parent set`);
    }
  }
}

export function isStringSubset(subset: readonly string[], superset: readonly string[]) {
  const supersetSet = new Set(superset);
  return subset.every((value) => supersetSet.has(value));
}

export function deriveScopeFamily(
  scope: readonly string[] | null | undefined,
): ScopeExecutionBindingScopeFamily | null {
  if (!Array.isArray(scope) || scope.length === 0) {
    return null;
  }

  const normalizedScope = normalizeScopeSequence("scope_family", scope);
  const reportingToken = normalizedScope.find((token) => REPORTING_SCOPE_TOKENS.has(token));
  const actionTokens = normalizedScope.filter((token) => !REPORTING_SCOPE_TOKENS.has(token));

  if (!reportingToken) {
    return null;
  }

  if (actionTokens.length === 0) {
    return "READ_ONLY";
  }

  if (actionTokens.length === 1 && actionTokens[0] === "prepare_submission") {
    return "PREPARE_ONLY";
  }

  if (
    actionTokens.length === 2 &&
    actionTokens[0] === "prepare_submission" &&
    actionTokens[1] === "submit"
  ) {
    return "PREPARE_AND_SUBMIT";
  }

  if (
    reportingToken === "year_end" &&
    actionTokens.length === 1 &&
    actionTokens[0] === "amendment_intent"
  ) {
    return "AMENDMENT_INTENT";
  }

  if (
    reportingToken === "year_end" &&
    actionTokens.length === 1 &&
    actionTokens[0] === "amendment_submit"
  ) {
    return "AMENDMENT_SUBMIT";
  }

  return null;
}

export function expectedScopeMutationAtomicity(
  scope: readonly string[] | null | undefined,
): ScopeMutationAtomicity | null {
  if (!Array.isArray(scope) || scope.length === 0) {
    return null;
  }
  const normalizedScope = normalizeScopeSequence("mutation_atomicity", scope);
  return normalizedScope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token))
    ? "ATOMIC_REQUIRED"
    : "NARROWING_ALLOWED";
}

export function buildAuthorizationDecisionId(input: {
  access_binding_hash: string;
  action_family: string;
  decision: string;
  evaluated_at: string;
  principal_context_ref: string;
  resource_class: string;
}) {
  return `authorization-decision.${stableJsonHash({
    principal_context_ref: input.principal_context_ref,
    resource_class: input.resource_class,
    action_family: input.action_family,
    decision: input.decision,
    access_binding_hash: input.access_binding_hash,
    evaluated_at: input.evaluated_at,
  })}`;
}
