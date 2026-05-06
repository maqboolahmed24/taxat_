import {
  asTaxatHash,
  asTaxatId,
  asTaxatRef,
  type IdentifierKind,
  type TaxatHash,
  type TaxatId,
  type TaxatRef,
} from "../primitives/index.ts";
import { asReferenceRouteToken, type ReferenceRouteToken } from "./route_token.ts";

export type ReferenceFamilyRef =
  | "IDENTITY"
  | "REFERENCE"
  | "HASH"
  | "TARGET_REF"
  | "STORAGE_REF"
  | "DELIVERY_BINDING"
  | "ROUTE_TOKEN";

export type ReferenceKeyLiteral =
  | TaxatHash<string>
  | TaxatId<string>
  | TaxatRef<string>
  | ReferenceRouteToken<string>;

export type ReferenceDurabilityPosture =
  | "DURABLE"
  | "DURABLE_WITH_CONTEXT"
  | "INTERNAL_ONLY_DURABLE"
  | "INVOCATION_ONLY"
  | "SESSION_SCOPED";

export type ReferenceExposurePosture =
  | "CONTRACT_SCOPED"
  | "CROSS_BOUNDARY_SAFE"
  | "CUSTOMER_VISIBLE"
  | "INTERNAL_ONLY"
  | "SECURITY_CONTEXT_BOUND";

export type ReferenceFamilyCatalogRow = {
  family_ref: ReferenceFamilyRef;
  rail_label: "ID" | "REF" | "HASH" | "TARGET" | "STORAGE" | "DELIVERY" | "ROUTE";
  display_name: string;
  semantic_role: string;
  durability_posture: ReferenceDurabilityPosture;
  exposure_posture: ReferenceExposurePosture;
  lawful_examples: string[];
  forbidden_family_refs: ReferenceFamilyRef[];
};

export type ReferenceFieldMatch = {
  classification_reason: string;
  display_name: string;
  durability_posture: ReferenceDurabilityPosture;
  exposure_posture: ReferenceExposurePosture;
  family_ref: ReferenceFamilyRef;
  field_name: string;
  normalized_field_name: string;
  rail_label: ReferenceFamilyCatalogRow["rail_label"];
  semantic_role: string;
  string_kind: IdentifierKind;
};

type ReferenceFieldPattern = {
  display_name: string;
  durability_posture: ReferenceDurabilityPosture;
  exposure_posture: ReferenceExposurePosture;
  family_ref: ReferenceFamilyRef;
  match_type: "EXACT" | "SUFFIX";
  semantic_role: string;
  string_kind: IdentifierKind;
  token: string;
};

type ReferenceKeyErrorCode = "REFERENCE_FAMILY_MISMATCH" | "REFERENCE_FIELD_UNKNOWN";

type ReferenceKeyErrorInit = {
  code: ReferenceKeyErrorCode;
  detail: string;
};

export class ReferenceKeyError extends Error {
  readonly code: ReferenceKeyErrorCode;

  constructor(init: ReferenceKeyErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "ReferenceKeyError";
    this.code = init.code;
  }
}

export const REFERENCE_FAMILY_ORDER: readonly ReferenceFamilyRef[] = [
  "IDENTITY",
  "REFERENCE",
  "HASH",
  "TARGET_REF",
  "STORAGE_REF",
  "DELIVERY_BINDING",
  "ROUTE_TOKEN",
] as const;

export const REFERENCE_FAMILY_CATALOG: readonly ReferenceFamilyCatalogRow[] = [
  {
    family_ref: "IDENTITY",
    rail_label: "ID",
    display_name: "identity key",
    semantic_role:
      "Stable business or workflow identity that survives replay, joins, and migration.",
    durability_posture: "DURABLE",
    exposure_posture: "CROSS_BOUNDARY_SAFE",
    lawful_examples: ["manifest_id", "tenant_id", "upload_session_id"],
    forbidden_family_refs: [
      "REFERENCE",
      "TARGET_REF",
      "STORAGE_REF",
      "DELIVERY_BINDING",
      "ROUTE_TOKEN",
    ],
  },
  {
    family_ref: "REFERENCE",
    rail_label: "REF",
    display_name: "durable artifact ref",
    semantic_role:
      "Durable lineage, content, or object reference resolved through control truth rather than route or storage shortcuts.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
    lawful_examples: ["artifact_ref", "content_ref", "raw_payload_ref"],
    forbidden_family_refs: [
      "IDENTITY",
      "TARGET_REF",
      "STORAGE_REF",
      "DELIVERY_BINDING",
      "ROUTE_TOKEN",
    ],
  },
  {
    family_ref: "HASH",
    rail_label: "HASH",
    display_name: "integrity hash",
    semantic_role: "Derived integrity, cache, or security binding value over canonical input.",
    durability_posture: "DURABLE_WITH_CONTEXT",
    exposure_posture: "CONTRACT_SCOPED",
    lawful_examples: ["content_hash", "request_binding_hash", "delivery_binding_hash"],
    forbidden_family_refs: ["IDENTITY", "REFERENCE", "TARGET_REF", "STORAGE_REF", "ROUTE_TOKEN"],
  },
  {
    family_ref: "TARGET_REF",
    rail_label: "TARGET",
    display_name: "experience target ref",
    semantic_role:
      "Durable preview, print, or governance target selection for a specific artifact view.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
    lawful_examples: ["preview_target_ref", "target_ref", "default_download_target_ref_or_null"],
    forbidden_family_refs: [
      "IDENTITY",
      "REFERENCE",
      "STORAGE_REF",
      "DELIVERY_BINDING",
      "ROUTE_TOKEN",
    ],
  },
  {
    family_ref: "STORAGE_REF",
    rail_label: "STORAGE",
    display_name: "storage ref",
    semantic_role:
      "Opaque internal object-storage backing handle whose continuity can outlive request-version drift but not become UI truth.",
    durability_posture: "INTERNAL_ONLY_DURABLE",
    exposure_posture: "INTERNAL_ONLY",
    lawful_examples: ["storage_ref", "quarantine_storage_ref", "retained_evidence_storage_ref"],
    forbidden_family_refs: [
      "IDENTITY",
      "REFERENCE",
      "TARGET_REF",
      "DELIVERY_BINDING",
      "ROUTE_TOKEN",
    ],
  },
  {
    family_ref: "DELIVERY_BINDING",
    rail_label: "DELIVERY",
    display_name: "delivery affordance",
    semantic_role:
      "Customer or external handoff handle bound to invocation-time route, access, masking, and object context.",
    durability_posture: "INVOCATION_ONLY",
    exposure_posture: "SECURITY_CONTEXT_BOUND",
    lawful_examples: ["download_ref", "delivery_binding_hash"],
    forbidden_family_refs: ["IDENTITY", "REFERENCE", "TARGET_REF", "STORAGE_REF", "ROUTE_TOKEN"],
  },
  {
    family_ref: "ROUTE_TOKEN",
    rail_label: "ROUTE",
    display_name: "route token",
    semantic_role:
      "Route-identity or scene token used for shell continuity, cache partitioning, and lawful restoration only.",
    durability_posture: "SESSION_SCOPED",
    exposure_posture: "CONTRACT_SCOPED",
    lawful_examples: ["route_identity_ref", "internal_route_token", "preview_route_token"],
    forbidden_family_refs: [
      "IDENTITY",
      "REFERENCE",
      "TARGET_REF",
      "STORAGE_REF",
      "DELIVERY_BINDING",
    ],
  },
] as const;

const FAMILY_BY_REF = new Map(
  REFERENCE_FAMILY_CATALOG.map(
    (row) => [row.family_ref, row] satisfies [ReferenceFamilyRef, ReferenceFamilyCatalogRow],
  ),
);

const REFERENCE_FIELD_PATTERNS: readonly ReferenceFieldPattern[] = [
  {
    match_type: "EXACT",
    token: "delivery_binding_hash",
    family_ref: "DELIVERY_BINDING",
    display_name: "delivery binding hash",
    string_kind: "HASH",
    semantic_role: "Invocation-time security binding for preview, print, or download reuse.",
    durability_posture: "INVOCATION_ONLY",
    exposure_posture: "SECURITY_CONTEXT_BOUND",
  },
  {
    match_type: "EXACT",
    token: "download_ref",
    family_ref: "DELIVERY_BINDING",
    display_name: "customer download ref",
    string_kind: "REF",
    semantic_role:
      "Gateway-bound customer delivery affordance that is unusable without binding context.",
    durability_posture: "INVOCATION_ONLY",
    exposure_posture: "SECURITY_CONTEXT_BOUND",
  },
  {
    match_type: "EXACT",
    token: "route_identity_ref",
    family_ref: "ROUTE_TOKEN",
    display_name: "route identity token",
    string_kind: "ROUTE_TOKEN",
    semantic_role: "Stable shell-identity token for cache partitioning and restoration.",
    durability_posture: "SESSION_SCOPED",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "storage_ref",
    family_ref: "STORAGE_REF",
    display_name: "storage ref",
    string_kind: "REF",
    semantic_role: "Opaque object-storage backing handle.",
    durability_posture: "INTERNAL_ONLY_DURABLE",
    exposure_posture: "INTERNAL_ONLY",
  },
  {
    match_type: "EXACT",
    token: "target_ref",
    family_ref: "TARGET_REF",
    display_name: "target ref",
    string_kind: "REF",
    semantic_role: "Durable target for preview, print, or experience routing.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "preview_target_ref",
    family_ref: "TARGET_REF",
    display_name: "preview target ref",
    string_kind: "REF",
    semantic_role: "Durable preview-target selection.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "print_target_ref",
    family_ref: "TARGET_REF",
    display_name: "print target ref",
    string_kind: "REF",
    semantic_role: "Durable print-target selection.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "governance_target_ref",
    family_ref: "TARGET_REF",
    display_name: "governance target ref",
    string_kind: "REF",
    semantic_role: "Durable governance-facing target selection.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "default_preview_target_ref",
    family_ref: "TARGET_REF",
    display_name: "default preview target ref",
    string_kind: "REF",
    semantic_role: "Default current-artifact preview target.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "default_download_target_ref",
    family_ref: "TARGET_REF",
    display_name: "default download target ref",
    string_kind: "REF",
    semantic_role: "Default current-artifact download target.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "default_print_target_ref",
    family_ref: "TARGET_REF",
    display_name: "default print target ref",
    string_kind: "REF",
    semantic_role: "Default current-artifact print target.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "EXACT",
    token: "artifact_ref",
    family_ref: "REFERENCE",
    display_name: "artifact ref",
    string_kind: "REF",
    semantic_role: "Durable artifact identity pointer.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "build_artifact_ref",
    family_ref: "REFERENCE",
    display_name: "build artifact ref",
    string_kind: "REF",
    semantic_role: "Durable build-output reference.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "raw_payload_ref",
    family_ref: "REFERENCE",
    display_name: "raw payload ref",
    string_kind: "REF",
    semantic_role: "Durable raw authority-payload reference.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "content_ref",
    family_ref: "REFERENCE",
    display_name: "content ref",
    string_kind: "REF",
    semantic_role: "Durable content-body reference.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "root_ref",
    family_ref: "REFERENCE",
    display_name: "root ref",
    string_kind: "REF",
    semantic_role: "Root lineage reference for provenance traversal.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "current_artifact_ref",
    family_ref: "REFERENCE",
    display_name: "current artifact ref",
    string_kind: "REF",
    semantic_role: "Current authoritative artifact selection ref.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "EXACT",
    token: "historical_artifact_refs",
    family_ref: "REFERENCE",
    display_name: "historical artifact refs",
    string_kind: "REF",
    semantic_role: "Historical artifact selection refs.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "SUFFIX",
    token: "_route_token",
    family_ref: "ROUTE_TOKEN",
    display_name: "route token",
    string_kind: "ROUTE_TOKEN",
    semantic_role: "Shell route token or scene token.",
    durability_posture: "SESSION_SCOPED",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "SUFFIX",
    token: "_download_ref",
    family_ref: "DELIVERY_BINDING",
    display_name: "download ref",
    string_kind: "REF",
    semantic_role: "Context-bound delivery affordance.",
    durability_posture: "INVOCATION_ONLY",
    exposure_posture: "SECURITY_CONTEXT_BOUND",
  },
  {
    match_type: "SUFFIX",
    token: "_storage_ref",
    family_ref: "STORAGE_REF",
    display_name: "storage ref",
    string_kind: "REF",
    semantic_role: "Opaque storage handle.",
    durability_posture: "INTERNAL_ONLY_DURABLE",
    exposure_posture: "INTERNAL_ONLY",
  },
  {
    match_type: "SUFFIX",
    token: "_target_ref",
    family_ref: "TARGET_REF",
    display_name: "target ref",
    string_kind: "REF",
    semantic_role: "Durable target selection.",
    durability_posture: "DURABLE",
    exposure_posture: "CUSTOMER_VISIBLE",
  },
  {
    match_type: "SUFFIX",
    token: "_hash",
    family_ref: "HASH",
    display_name: "integrity hash",
    string_kind: "HASH",
    semantic_role: "Canonical hash or binding hash.",
    durability_posture: "DURABLE_WITH_CONTEXT",
    exposure_posture: "CONTRACT_SCOPED",
  },
  {
    match_type: "SUFFIX",
    token: "_id",
    family_ref: "IDENTITY",
    display_name: "identity key",
    string_kind: "ID",
    semantic_role: "Stable business or workflow identity.",
    durability_posture: "DURABLE",
    exposure_posture: "CROSS_BOUNDARY_SAFE",
  },
  {
    match_type: "SUFFIX",
    token: "_ref",
    family_ref: "REFERENCE",
    display_name: "durable artifact ref",
    string_kind: "REF",
    semantic_role: "Durable reference resolved through control truth.",
    durability_posture: "DURABLE",
    exposure_posture: "CONTRACT_SCOPED",
  },
] as const;

function normalizeFieldName(fieldName: string) {
  let normalized = fieldName.normalize("NFC").trim();
  if (normalized.endsWith("[]")) {
    normalized = normalized.slice(0, -2);
  }
  if (normalized.endsWith("_or_null")) {
    normalized = normalized.slice(0, -8);
  }
  return normalized;
}

function findReferencePattern(normalizedFieldName: string) {
  const exact = REFERENCE_FIELD_PATTERNS.find(
    (pattern) => pattern.match_type === "EXACT" && pattern.token === normalizedFieldName,
  );
  if (exact) {
    return exact;
  }

  return [...REFERENCE_FIELD_PATTERNS]
    .filter((pattern) => pattern.match_type === "SUFFIX")
    .sort((left, right) => right.token.length - left.token.length)
    .find((pattern) => normalizedFieldName.endsWith(pattern.token));
}

export function classifyReferenceField(fieldName: string): ReferenceFieldMatch {
  const normalizedFieldName = normalizeFieldName(fieldName);
  const pattern = findReferencePattern(normalizedFieldName);
  if (!pattern) {
    throw new ReferenceKeyError({
      code: "REFERENCE_FIELD_UNKNOWN",
      detail: `No reference grammar rule matched field ${fieldName}`,
    });
  }

  const family = FAMILY_BY_REF.get(pattern.family_ref);
  if (!family) {
    throw new ReferenceKeyError({
      code: "REFERENCE_FIELD_UNKNOWN",
      detail: `Family catalog missing ${pattern.family_ref}`,
    });
  }

  return {
    classification_reason:
      pattern.match_type === "EXACT"
        ? `exact field match ${pattern.token}`
        : `suffix match ${pattern.token}`,
    display_name: pattern.display_name,
    durability_posture: pattern.durability_posture,
    exposure_posture: pattern.exposure_posture,
    family_ref: pattern.family_ref,
    field_name: fieldName,
    normalized_field_name: normalizedFieldName,
    rail_label: family.rail_label,
    semantic_role: pattern.semantic_role,
    string_kind: pattern.string_kind,
  };
}

function familyBrand(familyRef: ReferenceFamilyRef) {
  return familyRef.toLowerCase().replace(/_+/g, "-");
}

export function assertReferenceKeyLiteral(fieldName: string, value: unknown): ReferenceKeyLiteral {
  const match = classifyReferenceField(fieldName);
  const brand = familyBrand(match.family_ref);

  switch (match.string_kind) {
    case "ID":
      return asTaxatId(value, brand);
    case "HASH":
      return asTaxatHash(value, brand);
    case "ROUTE_TOKEN":
      return asReferenceRouteToken(value, brand);
    case "REF":
      return asTaxatRef(value, brand);
  }
}

export function assertReferenceFamily(
  fieldName: string,
  expectedFamily: ReferenceFamilyRef,
  value?: unknown,
) {
  const match = classifyReferenceField(fieldName);
  if (match.family_ref !== expectedFamily) {
    throw new ReferenceKeyError({
      code: "REFERENCE_FAMILY_MISMATCH",
      detail: `${fieldName} classified as ${match.family_ref} instead of ${expectedFamily}`,
    });
  }

  if (value === undefined) {
    return match;
  }

  return {
    match,
    value: assertReferenceKeyLiteral(fieldName, value),
  };
}

export function canSubstituteReferenceField(sourceFieldName: string, targetFieldName: string) {
  return normalizeFieldName(sourceFieldName) === normalizeFieldName(targetFieldName);
}

export function describeForbiddenSubstitution(sourceFieldName: string, targetFieldName: string) {
  const source = classifyReferenceField(sourceFieldName);
  const target = classifyReferenceField(targetFieldName);
  return `${source.display_name} cannot be used as ${target.display_name}`;
}
