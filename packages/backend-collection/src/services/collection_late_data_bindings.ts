import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
  type CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import {
  deriveLateDataPolicyBindingId,
  lateDataPolicyBindingRef,
  normalizeLateDataPolicyBinding,
  type LateDataBindingScope,
  type LateDataPolicyBindingRecord,
} from "../models/late_data_indicator.ts";
import {
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  type CollectionSourceClassOrNull,
} from "../models/collection_control_common.ts";

export type CollectionLateDataBindingPrecedence =
  | "RUNTIME_SCOPED"
  | "PARTITION_SCOPED"
  | "SOURCE_CLASS"
  | "DOMAIN_WIDE";

export const LATE_DATA_BINDING_PRECEDENCE: Record<CollectionLateDataBindingPrecedence, number> = {
  RUNTIME_SCOPED: 1,
  PARTITION_SCOPED: 2,
  SOURCE_CLASS: 3,
  DOMAIN_WIDE: 4,
};

export type CollectionLateDataBindingErrorCode =
  | "LATE_DATA_BINDING_AMBIGUOUS"
  | "LATE_DATA_BINDING_NOT_FOUND";

export class CollectionLateDataBindingError extends Error {
  readonly code: CollectionLateDataBindingErrorCode;

  constructor(code: CollectionLateDataBindingErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionLateDataBindingError";
    this.code = code;
  }
}

function bindingSortKey(binding: LateDataPolicyBindingRecord) {
  return [
    String(binding.precedence_rank).padStart(3, "0"),
    binding.source_domain,
    binding.source_class ?? "<null>",
    binding.partition_scope_refs.join("\u001f"),
    binding.runtime_scope_refs.join("\u001f"),
    binding.late_data_policy_ref,
  ].join("\u001e");
}

function selectorKey(binding: Omit<LateDataPolicyBindingRecord, "binding_id" | "precedence_rank">) {
  return [
    binding.binding_scope,
    binding.source_domain,
    binding.source_class ?? "<null>",
    binding.partition_scope_refs.join("\u001f"),
    binding.runtime_scope_refs.join("\u001f"),
  ].join("\u001e");
}

function buildBinding(
  input: Omit<LateDataPolicyBindingRecord, "binding_id" | "precedence_rank">,
): LateDataPolicyBindingRecord {
  return normalizeLateDataPolicyBinding({
    ...input,
    binding_id: deriveLateDataPolicyBindingId(input),
    precedence_rank: LATE_DATA_BINDING_PRECEDENCE[input.binding_scope],
  });
}

function samePolicy(boundaries: readonly CollectionBoundarySourceBoundaryRecord[]) {
  const policies = new Set(boundaries.map((boundary) => boundary.late_data_policy_ref));
  return policies.size === 1 ? [...policies][0] : null;
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function pushBinding(
  bindingsBySelector: Map<string, LateDataPolicyBindingRecord>,
  candidate: LateDataPolicyBindingRecord,
) {
  const selector = selectorKey(candidate);
  const existing = bindingsBySelector.get(selector);
  if (existing && existing.late_data_policy_ref !== candidate.late_data_policy_ref) {
    throw new CollectionLateDataBindingError(
      "LATE_DATA_BINDING_AMBIGUOUS",
      `conflicting late-data policies for selector ${selector}`,
    );
  }
  bindingsBySelector.set(selector, existing ?? candidate);
}

function runtimeScopesMatch(
  boundaryScopes: readonly string[],
  activeRuntimeScopes: readonly string[],
) {
  if (boundaryScopes.length === 0) {
    return false;
  }
  const active = new Set(activeRuntimeScopes);
  return boundaryScopes.some((scope) => active.has(scope));
}

export function projectCollectionLateDataBindings(input: {
  collection_boundary: CollectionBoundaryRecord;
  runtime_scope_refs: readonly string[];
}): LateDataPolicyBindingRecord[] {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const runtimeScopes = normalizeCollectionRuntimeScopes(
    "late_data_binding.runtime_scope_refs",
    input.runtime_scope_refs,
  );
  const boundaries = boundary.source_boundaries;
  const bindingsBySelector = new Map<string, LateDataPolicyBindingRecord>();

  for (const [sourceDomain, domainBoundaries] of groupBy(
    boundaries,
    (sourceBoundary) => sourceBoundary.source_domain,
  )) {
    const domainPolicy = samePolicy(domainBoundaries);
    if (domainPolicy !== null) {
      pushBinding(
        bindingsBySelector,
        buildBinding({
          binding_scope: "DOMAIN_WIDE",
          late_data_policy_ref: domainPolicy,
          partition_scope_refs: [],
          runtime_scope_refs: [],
          source_class: null,
          source_domain: sourceDomain,
        }),
      );
    }

    for (const [classKey, classBoundaries] of groupBy(
      domainBoundaries.filter((sourceBoundary) => sourceBoundary.source_class !== null),
      (sourceBoundary) => sourceBoundary.source_class ?? "<null>",
    )) {
      const classPolicy = samePolicy(classBoundaries);
      if (classPolicy !== null) {
        pushBinding(
          bindingsBySelector,
          buildBinding({
            binding_scope: "SOURCE_CLASS",
            late_data_policy_ref: classPolicy,
            partition_scope_refs: [],
            runtime_scope_refs: [],
            source_class: normalizeCollectionSourceClassOrNull(
              "late_data_binding.source_class",
              classKey,
            ),
            source_domain: sourceDomain,
          }),
        );
      }
    }
  }

  for (const sourceBoundary of boundaries) {
    if (sourceBoundary.partition_scope_refs.length > 0) {
      pushBinding(
        bindingsBySelector,
        buildBinding({
          binding_scope: "PARTITION_SCOPED",
          late_data_policy_ref: sourceBoundary.late_data_policy_ref,
          partition_scope_refs: sourceBoundary.partition_scope_refs,
          runtime_scope_refs: [],
          source_class: sourceBoundary.source_class,
          source_domain: sourceBoundary.source_domain,
        }),
      );
    }
    if (runtimeScopesMatch(sourceBoundary.runtime_scope_refs, runtimeScopes)) {
      pushBinding(
        bindingsBySelector,
        buildBinding({
          binding_scope: "RUNTIME_SCOPED",
          late_data_policy_ref: sourceBoundary.late_data_policy_ref,
          partition_scope_refs: sourceBoundary.partition_scope_refs,
          runtime_scope_refs: sourceBoundary.runtime_scope_refs,
          source_class: sourceBoundary.source_class,
          source_domain: sourceBoundary.source_domain,
        }),
      );
    }
  }

  const bindings = [...bindingsBySelector.values()].sort((left, right) =>
    bindingSortKey(left).localeCompare(bindingSortKey(right)),
  );
  if (bindings.length === 0) {
    throw new CollectionLateDataBindingError(
      "LATE_DATA_BINDING_NOT_FOUND",
      `no late-data bindings could be projected for ${collectionBoundaryRef(boundary)}`,
    );
  }
  return bindings;
}

function arrayContainsAll(haystack: readonly string[], needles: readonly string[]) {
  const set = new Set(haystack);
  return needles.every((needle) => set.has(needle));
}

function bindingMatches(input: {
  binding: LateDataPolicyBindingRecord;
  partition_scope_refs: readonly string[];
  runtime_scope_refs: readonly string[];
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
}) {
  if (input.binding.source_domain !== input.source_domain) {
    return false;
  }
  if (input.binding.binding_scope === "DOMAIN_WIDE") {
    return true;
  }
  if (input.binding.source_class !== null && input.binding.source_class !== input.source_class) {
    return false;
  }
  if (input.binding.binding_scope === "SOURCE_CLASS") {
    return true;
  }
  if (!arrayContainsAll(input.partition_scope_refs, input.binding.partition_scope_refs)) {
    return false;
  }
  if (input.binding.binding_scope === "PARTITION_SCOPED") {
    return true;
  }
  return arrayContainsAll(input.runtime_scope_refs, input.binding.runtime_scope_refs);
}

export function selectLateDataPolicyBinding(input: {
  bindings: readonly LateDataPolicyBindingRecord[];
  partition_scope_refs: readonly string[];
  runtime_scope_refs: readonly string[];
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
}) {
  const sourceDomain = normalizeCollectionString("late_data_binding.source_domain", input.source_domain);
  const partitionScopeRefs = normalizeCollectionStringSet(
    "late_data_binding.partition_scope_refs",
    input.partition_scope_refs,
  );
  const runtimeScopeRefs = normalizeCollectionRuntimeScopes(
    "late_data_binding.runtime_scope_refs",
    input.runtime_scope_refs,
  );
  const sourceClass = normalizeCollectionSourceClassOrNull(
    "late_data_binding.source_class",
    input.source_class,
  );
  const normalizedBindings = input.bindings
    .map((binding) => normalizeLateDataPolicyBinding(binding))
    .sort((left, right) => bindingSortKey(left).localeCompare(bindingSortKey(right)));
  const matches = normalizedBindings.filter((binding) =>
    bindingMatches({
      binding,
      partition_scope_refs: partitionScopeRefs,
      runtime_scope_refs: runtimeScopeRefs,
      source_class: sourceClass,
      source_domain: sourceDomain,
    }),
  );
  if (matches.length === 0) {
    throw new CollectionLateDataBindingError(
      "LATE_DATA_BINDING_NOT_FOUND",
      `no late-data binding matched source domain ${sourceDomain}`,
    );
  }
  const topRank = matches[0]!.precedence_rank;
  const topMatches = matches.filter((binding) => binding.precedence_rank === topRank);
  const topPolicies = new Set(topMatches.map((binding) => binding.late_data_policy_ref));
  if (topPolicies.size > 1) {
    throw new CollectionLateDataBindingError(
      "LATE_DATA_BINDING_AMBIGUOUS",
      `ambiguous same-precedence late-data policies for source domain ${sourceDomain}`,
    );
  }
  return topMatches[0]!;
}

export function lateDataBindingRefs(bindings: readonly LateDataPolicyBindingRecord[]) {
  return bindings.map((binding) => lateDataPolicyBindingRef(normalizeLateDataPolicyBinding(binding)));
}
