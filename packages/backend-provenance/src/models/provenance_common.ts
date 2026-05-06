import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type AdmissibilityState = "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";

export type ProvenancePartitionContract = {
  contract_version: "PROVENANCE_PARTITION_V1";
  tenant_id: string;
  client_id: string | null;
  partition_scope_refs: string[];
  period_scope_ref_or_null: string | null;
  cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY";
  scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING";
};

export type ProvenancePartitionInput = {
  tenant_id: string;
  client_id?: string | null;
  partition_scope_refs?: readonly string[];
  period_scope_ref_or_null?: string | null;
};

export class ProvenanceModelError extends Error {
  readonly code:
    | "PROVENANCE_CONTRACT_INVALID"
    | "PROVENANCE_FIELD_INVALID"
    | "PROVENANCE_FIELD_REQUIRED"
    | "PROVENANCE_GRAPH_INTEGRITY_INVALID"
    | "PROVENANCE_PARTITION_INVALID";

  constructor(code: ProvenanceModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ProvenanceModelError";
    this.code = code;
  }
}

export function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeNullableString(label: string, value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return requireString(label, value);
}

export function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `${label} must be an ISO-8601 instant with timezone: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function normalizeSortedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  let normalized: string[];
  try {
    normalized = normalizeStringSet(
      label,
      values ?? [],
      options.minItems === undefined ? undefined : { minItems: options.minItems },
    );
  } catch (error) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a sorted string set`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function normalizeOrderedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  const seen = new Set<string>();
  const normalized = (values ?? []).map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new ProvenanceModelError("PROVENANCE_FIELD_INVALID", `${label} must not contain duplicates`);
    }
    seen.add(value);
    return true;
  });
  if (normalized.length < (options.minItems ?? 0)) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `${label} must contain at least ${options.minItems} item(s)`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function normalizeManifestRefSpine(manifestId: string, manifestRefs?: readonly string[] | null) {
  const home = requireString("manifest_id", manifestId);
  const refs = manifestRefs?.length
    ? normalizeOrderedStringSet("manifest_refs", manifestRefs, { minItems: 1 })
    : [home];
  if (!refs.includes(home)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "manifest_refs must include the owning manifest_id",
    );
  }
  const tail = sortSetLikeStrings(refs.filter((ref) => ref !== home));
  return [home, ...tail];
}

export function buildProvenancePartitionContract(
  input: ProvenancePartitionInput | ProvenancePartitionContract,
): ProvenancePartitionContract {
  const contract = {
    contract_version: "PROVENANCE_PARTITION_V1" as const,
    tenant_id: requireString("partition_contract.tenant_id", input.tenant_id),
    client_id: normalizeNullableString("partition_contract.client_id", input.client_id),
    partition_scope_refs: normalizeSortedStringSet(
      "partition_contract.partition_scope_refs",
      input.partition_scope_refs ?? [],
    ),
    period_scope_ref_or_null: normalizeNullableString(
      "partition_contract.period_scope_ref_or_null",
      input.period_scope_ref_or_null,
    ),
    cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
    scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
  };

  if (
    "contract_version" in input &&
    input.contract_version !== "PROVENANCE_PARTITION_V1"
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_PARTITION_INVALID",
      "partition contract_version must be PROVENANCE_PARTITION_V1",
    );
  }
  if (
    "cross_manifest_traversal_policy" in input &&
    input.cross_manifest_traversal_policy !== "EXPLICIT_BOUNDARY_EDGES_ONLY"
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_PARTITION_INVALID",
      "cross-manifest traversal must use EXPLICIT_BOUNDARY_EDGES_ONLY",
    );
  }
  if (
    "scope_widening_policy" in input &&
    input.scope_widening_policy !== "NO_TENANT_CLIENT_OR_SCOPE_WIDENING"
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_PARTITION_INVALID",
      "scope widening policy must use NO_TENANT_CLIENT_OR_SCOPE_WIDENING",
    );
  }
  return contract;
}

export function assertConfidence(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ProvenanceModelError("PROVENANCE_FIELD_INVALID", `${label} must be a number from 0 to 1`);
  }
  return value;
}

export function assertNonNegativeInteger(label: string, value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ProvenanceModelError("PROVENANCE_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return Number(value);
}

export function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

export function cloneRecord<T>(record: T): T {
  return structuredClone(record);
}

export function refFromId(prefix: string, id: string) {
  return `${prefix}://${requireString(`${prefix}_id`, id)}`;
}
