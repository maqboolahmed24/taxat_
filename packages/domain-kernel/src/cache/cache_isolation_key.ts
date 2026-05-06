import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { NONE_SENTINEL, stableJsonHash } from "../primitives/hash.ts";
import { assertReferenceKeyLiteral } from "../references/reference_key.ts";
import { asReferenceRouteToken } from "../references/route_token.ts";
import { computeMaskingPostureFingerprint } from "./masking_posture_fingerprint.ts";
import { deriveVisibilityPartitionKey } from "./visibility_partition_key.ts";

export type CacheScopeClass = CacheIsolationContract["cache_scope_class"];
export type CacheIsolationComparableField =
  | "access_binding_hash_or_null"
  | "cache_partition_ref"
  | "cache_scope_class"
  | "canonical_object_ref"
  | "client_id_or_null"
  | "customer_safe_projection"
  | "delivery_binding_hash"
  | "masking_posture_fingerprint_or_null"
  | "preview_subject_ref_or_null"
  | "principal_class"
  | "projection_version_ref"
  | "route_identity_ref"
  | "session_binding_hash"
  | "shell_family"
  | "shell_stability_ref_or_null"
  | "tenant_id"
  | "visibility_cache_partition_key_or_null";

export type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

export type CustomerSafeProjectionMode = "CALLER_SELECTED" | "REQUIRED_FALSE" | "REQUIRED_TRUE";

export type CacheScopeMatrixRow = {
  cache_namespace_prefix: string;
  cache_scope_class: CacheScopeClass;
  customer_safe_projection_mode: CustomerSafeProjectionMode;
  display_name: string;
  governance_scope: boolean;
  key_segments: string[];
  notes: string[];
  rail_label: string;
  requires_access_and_masking: boolean;
  requires_preview_subject: boolean;
  requires_visibility_partition: boolean;
  restore_posture: "LIVE_ONLY" | "READ_ONLY_UNTIL_LIVE_LEGALITY";
};

export type CacheScopeMatrix = {
  basis_statement: string;
  contract_version: "CACHE_SCOPE_MATRIX_V1";
  matrix_id: string;
  scope_rows: CacheScopeMatrixRow[];
  source_lineage: SourceLineageEntry[];
};

export type VisibilityPartitionPolicyRow = {
  cache_scope_class: CacheScopeClass;
  canonical_dimension_fields: string[];
  notes: string[];
  partition_required: boolean;
};

export type VisibilityPartitionPolicy = {
  basis_statement: string;
  contract_version: "VISIBILITY_PARTITION_POLICY_V1";
  policy_id: string;
  scope_rows: VisibilityPartitionPolicyRow[];
  source_lineage: SourceLineageEntry[];
};

export type CacheScopePolicyBundle = {
  cacheScopeMatrix: CacheScopeMatrix;
  scopeRowsByClass: Map<CacheScopeClass, CacheScopeMatrixRow>;
  visibilityPartitionPolicy: VisibilityPartitionPolicy;
  visibilityRowsByClass: Map<CacheScopeClass, VisibilityPartitionPolicyRow>;
};

export type CreateCacheIsolationContractInput = {
  accessBindingHashOrNull?: string | null;
  cachePartitionRefOrNull?: string | null;
  cacheScopeClass: CacheScopeClass;
  canonicalObjectRef: string;
  clientIdOrNull?: string | null;
  customerSafeProjection?: boolean;
  maskingDimensionRefsOrNull?: readonly string[] | null;
  maskingPostureFingerprintOrNull?: string | null;
  maskingRuleRefsOrNull?: readonly string[] | null;
  previewSubjectRefOrNull?: string | null;
  principalClass: string;
  projectionVersionRef: string;
  redactionProfileRefOrNull?: string | null;
  routeIdentityRef: string;
  sessionBindingHash: string;
  shellFamily: string;
  shellStabilityRefOrNull?: string | null;
  tenantId: string;
  visibilityCachePartitionKeyOrNull?: string | null;
  visibilityDimensionRefsOrNull?: readonly string[] | null;
};

type CacheIsolationKeyErrorInit = {
  code:
    | "CACHE_BINDING_INVALID"
    | "CACHE_KEY_FIELD_UNKNOWN"
    | "CACHE_SCOPE_UNKNOWN"
    | "POLICY_VALIDATION_FAILED"
    | "STRING_FIELD_REQUIRED";
  detail: string;
};

export class CacheIsolationKeyError extends Error {
  readonly code: CacheIsolationKeyErrorInit["code"];

  constructor(init: CacheIsolationKeyErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "CacheIsolationKeyError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const cacheConfigDir = path.join(repoRoot, "config", "cache");
const jsonPaths = {
  cacheScopeMatrix: path.join(cacheConfigDir, "cache_scope_matrix.json"),
  visibilityPartitionPolicy: path.join(cacheConfigDir, "visibility_partition_policy.json"),
} as const;

const EXPECTED_SCOPE_CLASSES = [
  "LOW_NOISE_FRAME",
  "WORKSPACE_SNAPSHOT",
  "WORK_INBOX_SNAPSHOT",
  "CLIENT_PORTAL_WORKSPACE",
  "CUSTOMER_REQUEST_LIST",
  "TENANT_GOVERNANCE_SNAPSHOT",
  "GOVERNANCE_POLICY_SNAPSHOT",
  "PRINCIPAL_ACCESS_VIEW",
  "ROLE_TEMPLATE_MATRIX",
  "NATIVE_OPERATOR_WORKSPACE_SCENE",
  "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
] as const satisfies readonly CacheScopeClass[];

let cachedBundle: Promise<CacheScopePolicyBundle> | null = null;

function assertCondition(
  condition: unknown,
  code: CacheIsolationKeyErrorInit["code"],
  detail: string,
): asserts condition {
  if (!condition) {
    throw new CacheIsolationKeyError({
      code,
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function assertNonEmptyString(fieldName: string, value: string | null | undefined) {
  assertCondition(
    typeof value === "string" && value.length > 0,
    "STRING_FIELD_REQUIRED",
    `${fieldName} must remain a non-empty string`,
  );
  return value;
}

function normalizeOptional(value: string | null | undefined) {
  return value ?? NONE_SENTINEL;
}

function validateScopeMatrix(matrix: CacheScopeMatrix) {
  assertCondition(
    matrix.contract_version === "CACHE_SCOPE_MATRIX_V1",
    "POLICY_VALIDATION_FAILED",
    "cache scope matrix contract version drifted",
  );
  assertCondition(
    matrix.scope_rows.length === EXPECTED_SCOPE_CLASSES.length,
    "POLICY_VALIDATION_FAILED",
    "cache scope matrix must declare every governed cache scope class",
  );

  const seen = new Set<CacheScopeClass>();
  for (const row of matrix.scope_rows) {
    assertCondition(
      !seen.has(row.cache_scope_class),
      "POLICY_VALIDATION_FAILED",
      `duplicate cache scope row ${row.cache_scope_class}`,
    );
    seen.add(row.cache_scope_class);
    assertCondition(
      row.key_segments.length > 0,
      "POLICY_VALIDATION_FAILED",
      `cache scope row ${row.cache_scope_class} must declare at least one key segment`,
    );
    assertCondition(
      new Set(row.key_segments).size === row.key_segments.length,
      "POLICY_VALIDATION_FAILED",
      `cache scope row ${row.cache_scope_class} key segments must stay unique`,
    );
  }

  for (const scopeClass of EXPECTED_SCOPE_CLASSES) {
    assertCondition(
      seen.has(scopeClass),
      "POLICY_VALIDATION_FAILED",
      `cache scope matrix is missing ${scopeClass}`,
    );
  }
}

function validateVisibilityPolicy(policy: VisibilityPartitionPolicy) {
  assertCondition(
    policy.contract_version === "VISIBILITY_PARTITION_POLICY_V1",
    "POLICY_VALIDATION_FAILED",
    "visibility partition policy contract version drifted",
  );
  assertCondition(
    policy.scope_rows.length === EXPECTED_SCOPE_CLASSES.length,
    "POLICY_VALIDATION_FAILED",
    "visibility partition policy must cover every governed cache scope class",
  );

  const seen = new Set<CacheScopeClass>();
  for (const row of policy.scope_rows) {
    assertCondition(
      !seen.has(row.cache_scope_class),
      "POLICY_VALIDATION_FAILED",
      `duplicate visibility policy row ${row.cache_scope_class}`,
    );
    seen.add(row.cache_scope_class);
  }

  for (const scopeClass of EXPECTED_SCOPE_CLASSES) {
    assertCondition(
      seen.has(scopeClass),
      "POLICY_VALIDATION_FAILED",
      `visibility partition policy is missing ${scopeClass}`,
    );
  }
}

function resolvedCustomerSafeProjection(row: CacheScopeMatrixRow, requested: boolean | undefined) {
  switch (row.customer_safe_projection_mode) {
    case "REQUIRED_TRUE":
      return true;
    case "REQUIRED_FALSE":
      return false;
    default:
      return requested ?? false;
  }
}

function derivedPartitionRef(input: {
  accessBindingHashOrNull: string | null;
  cacheScopeClass: CacheScopeClass;
  canonicalObjectRef: string;
  clientIdOrNull: string | null;
  customerSafeProjection: boolean;
  maskingPostureFingerprintOrNull: string | null;
  previewSubjectRefOrNull: string | null;
  projectionVersionRef: string;
  routeIdentityRef: string;
  sessionBindingHash: string;
  shellStabilityRefOrNull: string | null;
  tenantId: string;
}) {
  return stableJsonHash({
    access_binding_hash_or_null: normalizeOptional(input.accessBindingHashOrNull),
    cache_scope_class: input.cacheScopeClass,
    canonical_object_ref: input.canonicalObjectRef,
    client_id_or_null: normalizeOptional(input.clientIdOrNull),
    contract_version: "CACHE_PARTITION_REF_V1",
    customer_safe_projection: input.customerSafeProjection,
    masking_posture_fingerprint_or_null: normalizeOptional(input.maskingPostureFingerprintOrNull),
    preview_subject_ref_or_null: normalizeOptional(input.previewSubjectRefOrNull),
    projection_version_ref: input.projectionVersionRef,
    route_identity_ref: input.routeIdentityRef,
    session_binding_hash: input.sessionBindingHash,
    shell_stability_ref_or_null: normalizeOptional(input.shellStabilityRefOrNull),
    tenant_id: input.tenantId,
  });
}

export async function loadCacheScopePolicyBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const [cacheScopeMatrix, visibilityPartitionPolicy] = await Promise.all([
        readJson<CacheScopeMatrix>(jsonPaths.cacheScopeMatrix),
        readJson<VisibilityPartitionPolicy>(jsonPaths.visibilityPartitionPolicy),
      ]);

      validateScopeMatrix(cacheScopeMatrix);
      validateVisibilityPolicy(visibilityPartitionPolicy);

      const scopeRowsByClass = new Map(
        cacheScopeMatrix.scope_rows.map((row) => [row.cache_scope_class, row] as const),
      );
      const visibilityRowsByClass = new Map(
        visibilityPartitionPolicy.scope_rows.map((row) => [row.cache_scope_class, row] as const),
      );

      return {
        cacheScopeMatrix,
        scopeRowsByClass,
        visibilityPartitionPolicy,
        visibilityRowsByClass,
      } satisfies CacheScopePolicyBundle;
    })();
  }

  return cachedBundle;
}

export function cacheScopeMatrixRow(
  bundle: CacheScopePolicyBundle,
  cacheScopeClass: CacheScopeClass,
) {
  const row = bundle.scopeRowsByClass.get(cacheScopeClass) ?? null;
  assertCondition(row !== null, "CACHE_SCOPE_UNKNOWN", `unknown cache scope ${cacheScopeClass}`);
  return row;
}

export function visibilityPartitionRow(
  bundle: CacheScopePolicyBundle,
  cacheScopeClass: CacheScopeClass,
) {
  const row = bundle.visibilityRowsByClass.get(cacheScopeClass) ?? null;
  assertCondition(
    row !== null,
    "CACHE_SCOPE_UNKNOWN",
    `unknown visibility policy cache scope ${cacheScopeClass}`,
  );
  return row;
}

export function stableCacheIsolationEnvelope(contract: {
  access_binding_hash_or_null: string | null;
  cache_partition_ref: string;
  cache_scope_class: CacheScopeClass;
  canonical_object_ref: string;
  client_id_or_null: string | null;
  customer_safe_projection: boolean;
  masking_posture_fingerprint_or_null: string | null;
  preview_subject_ref_or_null: string | null;
  principal_class: string;
  projection_version_ref: string;
  route_identity_ref: string;
  session_binding_hash: string;
  shell_family: string;
  shell_stability_ref_or_null: string | null;
  tenant_id: string;
  visibility_cache_partition_key_or_null: string | null;
}) {
  return {
    access_binding_hash_or_null: contract.access_binding_hash_or_null,
    cache_partition_ref: contract.cache_partition_ref,
    cache_scope_class: contract.cache_scope_class,
    canonical_object_ref: contract.canonical_object_ref,
    client_id_or_null: contract.client_id_or_null,
    customer_safe_projection: contract.customer_safe_projection,
    masking_posture_fingerprint_or_null: contract.masking_posture_fingerprint_or_null,
    preview_subject_ref_or_null: contract.preview_subject_ref_or_null,
    principal_class: contract.principal_class,
    projection_version_ref: contract.projection_version_ref,
    route_identity_ref: contract.route_identity_ref,
    session_binding_hash: contract.session_binding_hash,
    shell_family: contract.shell_family,
    shell_stability_ref_or_null: contract.shell_stability_ref_or_null,
    tenant_id: contract.tenant_id,
    visibility_cache_partition_key_or_null: contract.visibility_cache_partition_key_or_null,
  };
}

export function computeCacheDeliveryBindingHash(
  contract: Pick<
    CacheIsolationContract,
    | "access_binding_hash_or_null"
    | "cache_partition_ref"
    | "cache_scope_class"
    | "canonical_object_ref"
    | "client_id_or_null"
    | "customer_safe_projection"
    | "masking_posture_fingerprint_or_null"
    | "preview_subject_ref_or_null"
    | "principal_class"
    | "projection_version_ref"
    | "route_identity_ref"
    | "session_binding_hash"
    | "shell_family"
    | "shell_stability_ref_or_null"
    | "tenant_id"
    | "visibility_cache_partition_key_or_null"
  >,
) {
  return stableJsonHash(stableCacheIsolationEnvelope(contract));
}

export function isCanonicalCacheIsolationContract(contract: CacheIsolationContract) {
  return contract.delivery_binding_hash === computeCacheDeliveryBindingHash(contract);
}

export async function createCacheIsolationContract(
  input: CreateCacheIsolationContractInput,
  options?: { reload?: boolean },
) {
  const bundle = await loadCacheScopePolicyBundle(options);
  const scopeRow = cacheScopeMatrixRow(bundle, input.cacheScopeClass);
  const visibilityRow = visibilityPartitionRow(bundle, input.cacheScopeClass);

  const tenantId = assertNonEmptyString("tenant_id", input.tenantId);
  const principalClass = assertNonEmptyString("principal_class", input.principalClass);
  const shellFamily = assertNonEmptyString("shell_family", input.shellFamily);
  const sessionBindingHash = assertNonEmptyString("session_binding_hash", input.sessionBindingHash);
  const routeIdentityRef = assertNonEmptyString("route_identity_ref", input.routeIdentityRef);
  const canonicalObjectRef = assertNonEmptyString("canonical_object_ref", input.canonicalObjectRef);
  const projectionVersionRef = assertNonEmptyString(
    "projection_version_ref",
    input.projectionVersionRef,
  );

  assertReferenceKeyLiteral("tenant_id", tenantId);
  if (input.clientIdOrNull !== undefined && input.clientIdOrNull !== null) {
    assertReferenceKeyLiteral("client_id_or_null", input.clientIdOrNull);
  }
  assertReferenceKeyLiteral("session_binding_hash", sessionBindingHash);
  if (input.accessBindingHashOrNull !== undefined && input.accessBindingHashOrNull !== null) {
    assertReferenceKeyLiteral("access_binding_hash_or_null", input.accessBindingHashOrNull);
  }
  if (input.shellStabilityRefOrNull !== undefined && input.shellStabilityRefOrNull !== null) {
    assertReferenceKeyLiteral("shell_stability_ref_or_null", input.shellStabilityRefOrNull);
  }
  assertReferenceKeyLiteral("canonical_object_ref", canonicalObjectRef);
  assertReferenceKeyLiteral("projection_version_ref", projectionVersionRef);
  if (input.previewSubjectRefOrNull !== undefined && input.previewSubjectRefOrNull !== null) {
    assertReferenceKeyLiteral("preview_subject_ref_or_null", input.previewSubjectRefOrNull);
  }
  asReferenceRouteToken(routeIdentityRef, "route");

  const customerSafeProjection = resolvedCustomerSafeProjection(
    scopeRow,
    input.customerSafeProjection,
  );
  let accessBindingHashOrNull = input.accessBindingHashOrNull ?? null;
  let maskingPostureFingerprintOrNull = input.maskingPostureFingerprintOrNull ?? null;
  let previewSubjectRefOrNull = input.previewSubjectRefOrNull ?? null;
  const clientIdOrNull = input.clientIdOrNull ?? null;
  const shellStabilityRefOrNull = input.shellStabilityRefOrNull ?? null;

  if (scopeRow.governance_scope) {
    assertCondition(
      accessBindingHashOrNull === null &&
        maskingPostureFingerprintOrNull === null &&
        input.visibilityCachePartitionKeyOrNull == null,
      "CACHE_BINDING_INVALID",
      `${input.cacheScopeClass} must clear access, masking, and visibility partition bindings`,
    );
  }

  if (scopeRow.requires_preview_subject) {
    assertCondition(
      previewSubjectRefOrNull !== null,
      "CACHE_BINDING_INVALID",
      `${input.cacheScopeClass} requires a preview subject binding`,
    );
  } else {
    assertCondition(
      previewSubjectRefOrNull === null,
      "CACHE_BINDING_INVALID",
      `${input.cacheScopeClass} must clear preview subject binding`,
    );
  }

  if (
    !scopeRow.governance_scope &&
    (scopeRow.requires_access_and_masking || customerSafeProjection)
  ) {
    assertCondition(
      accessBindingHashOrNull !== null,
      "CACHE_BINDING_INVALID",
      `${input.cacheScopeClass} requires an access binding hash`,
    );
    if (maskingPostureFingerprintOrNull === null) {
      maskingPostureFingerprintOrNull = computeMaskingPostureFingerprint({
        accessBindingHashOrNull,
        customerSafeProjection,
        maskingDimensionRefsOrNull: input.maskingDimensionRefsOrNull,
        maskingRuleRefsOrNull: input.maskingRuleRefsOrNull,
        principalClass,
        redactionProfileRefOrNull: input.redactionProfileRefOrNull,
      });
    }
  } else {
    accessBindingHashOrNull = null;
    maskingPostureFingerprintOrNull = null;
  }

  if (maskingPostureFingerprintOrNull !== null) {
    maskingPostureFingerprintOrNull = assertNonEmptyString(
      "masking_posture_fingerprint_or_null",
      maskingPostureFingerprintOrNull,
    );
  }

  const visibilityRequired = visibilityRow.partition_required || customerSafeProjection;
  let visibilityCachePartitionKeyOrNull = input.visibilityCachePartitionKeyOrNull ?? null;
  if (scopeRow.governance_scope) {
    visibilityCachePartitionKeyOrNull = null;
  } else if (visibilityRequired) {
    visibilityCachePartitionKeyOrNull =
      visibilityCachePartitionKeyOrNull ??
      deriveVisibilityPartitionKey({
        cacheScopeClass: input.cacheScopeClass,
        canonicalDimensionFields: visibilityRow.canonical_dimension_fields,
        fieldValues: {
          access_binding_hash_or_null: accessBindingHashOrNull,
          cache_scope_class: input.cacheScopeClass,
          client_id_or_null: clientIdOrNull,
          customer_safe_projection: customerSafeProjection,
          masking_posture_fingerprint_or_null: maskingPostureFingerprintOrNull,
          principal_class: principalClass,
          route_identity_ref: routeIdentityRef,
          session_binding_hash: sessionBindingHash,
          shell_family: shellFamily,
          tenant_id: tenantId,
        },
        visibilityDimensionRefsOrNull: input.visibilityDimensionRefsOrNull,
      });
  } else {
    assertCondition(
      visibilityCachePartitionKeyOrNull === null,
      "CACHE_BINDING_INVALID",
      `${input.cacheScopeClass} must clear visibility partition binding`,
    );
  }

  if (visibilityCachePartitionKeyOrNull !== null) {
    visibilityCachePartitionKeyOrNull = assertNonEmptyString(
      "visibility_cache_partition_key_or_null",
      visibilityCachePartitionKeyOrNull,
    );
  }

  const cachePartitionRef =
    visibilityCachePartitionKeyOrNull ??
    input.cachePartitionRefOrNull ??
    derivedPartitionRef({
      accessBindingHashOrNull,
      cacheScopeClass: input.cacheScopeClass,
      canonicalObjectRef,
      clientIdOrNull,
      customerSafeProjection,
      maskingPostureFingerprintOrNull,
      previewSubjectRefOrNull,
      projectionVersionRef,
      routeIdentityRef,
      sessionBindingHash,
      shellStabilityRefOrNull,
      tenantId,
    });

  assertReferenceKeyLiteral("cache_partition_ref", cachePartitionRef);

  const contract = {
    access_binding_hash_or_null: accessBindingHashOrNull,
    cache_partition_ref: cachePartitionRef,
    cache_scope_class: input.cacheScopeClass,
    canonical_object_ref: canonicalObjectRef,
    client_id_or_null: clientIdOrNull,
    contract_version: "CACHE_ISOLATION_V1",
    customer_safe_projection: customerSafeProjection,
    delivery_binding_hash: "",
    delivery_revalidation_policy: "PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING",
    hydration_guard_policy: "REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH",
    local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
    masking_posture_fingerprint_or_null: maskingPostureFingerprintOrNull,
    preview_export_reuse_policy: "ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY",
    preview_subject_ref_or_null: previewSubjectRefOrNull,
    principal_class: principalClass,
    projection_version_ref: projectionVersionRef,
    route_identity_ref: routeIdentityRef,
    scope_narrowing_invalidation_policy: "PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING",
    session_binding_hash: sessionBindingHash,
    shared_cache_reuse_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    shared_layer_cache_policy: "NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT",
    shell_family: shellFamily,
    shell_stability_ref_or_null: shellStabilityRefOrNull,
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT",
    tenant_id: tenantId,
    visibility_cache_partition_key_or_null: visibilityCachePartitionKeyOrNull,
  } satisfies CacheIsolationContract;

  contract.delivery_binding_hash = computeCacheDeliveryBindingHash(contract);
  return contract;
}

export async function buildCacheIsolationKey(
  contract: CacheIsolationContract,
  options?: { reload?: boolean },
) {
  const bundle = await loadCacheScopePolicyBundle(options);
  const row = cacheScopeMatrixRow(bundle, contract.cache_scope_class);
  const contractValueMap: Record<string, boolean | string | null> = {
    access_binding_hash_or_null: contract.access_binding_hash_or_null,
    cache_partition_ref: contract.cache_partition_ref,
    cache_scope_class: contract.cache_scope_class,
    canonical_object_ref: contract.canonical_object_ref,
    client_id_or_null: contract.client_id_or_null,
    customer_safe_projection: contract.customer_safe_projection,
    delivery_binding_hash: contract.delivery_binding_hash,
    masking_posture_fingerprint_or_null: contract.masking_posture_fingerprint_or_null,
    preview_subject_ref_or_null: contract.preview_subject_ref_or_null,
    principal_class: contract.principal_class,
    projection_version_ref: contract.projection_version_ref,
    route_identity_ref: contract.route_identity_ref,
    session_binding_hash: contract.session_binding_hash,
    shell_family: contract.shell_family,
    shell_stability_ref_or_null: contract.shell_stability_ref_or_null,
    tenant_id: contract.tenant_id,
    visibility_cache_partition_key_or_null: contract.visibility_cache_partition_key_or_null,
  };

  const segments = row.key_segments.map((segment) => {
    if (!(segment in contractValueMap)) {
      throw new CacheIsolationKeyError({
        code: "CACHE_KEY_FIELD_UNKNOWN",
        detail: `unknown key segment ${segment} for ${contract.cache_scope_class}`,
      });
    }
    const value = contractValueMap[segment];
    if (value === null || value === undefined) {
      return NONE_SENTINEL;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return value;
  });

  return `${row.cache_namespace_prefix}:${segments.join(":")}`;
}

export function collectCacheIsolationMismatchFields(
  storedContract: CacheIsolationContract,
  requestedContract: CacheIsolationContract,
) {
  const mismatches: CacheIsolationComparableField[] = [];
  const comparableFields: CacheIsolationComparableField[] = [
    "cache_scope_class",
    "tenant_id",
    "client_id_or_null",
    "principal_class",
    "session_binding_hash",
    "access_binding_hash_or_null",
    "masking_posture_fingerprint_or_null",
    "shell_stability_ref_or_null",
    "route_identity_ref",
    "canonical_object_ref",
    "shell_family",
    "projection_version_ref",
    "cache_partition_ref",
    "visibility_cache_partition_key_or_null",
    "customer_safe_projection",
    "preview_subject_ref_or_null",
  ];

  for (const field of comparableFields) {
    if (storedContract[field] !== requestedContract[field]) {
      mismatches.push(field);
    }
  }

  if (
    storedContract.delivery_binding_hash !== computeCacheDeliveryBindingHash(storedContract) ||
    requestedContract.delivery_binding_hash !==
      computeCacheDeliveryBindingHash(requestedContract) ||
    storedContract.delivery_binding_hash !== requestedContract.delivery_binding_hash
  ) {
    mismatches.push("delivery_binding_hash");
  }

  return mismatches;
}
