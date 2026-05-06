import { createHash } from "node:crypto";

import { asTaxatHash, type TaxatHash } from "./identifier.ts";
import { normalizeUtcInstantString } from "./time.ts";

export const NONE_SENTINEL = "<NONE>";
export const AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION = "AUTHORITY_REQUEST_IDENTITY_V2";

export type CanonicalJsonValue =
  | boolean
  | null
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

type CanonicalHashErrorInit = {
  code:
    | "HASH_DUPLICATE_NORMALIZED_KEY"
    | "HASH_NEGATIVE_ZERO_NUMBER"
    | "HASH_NON_FINITE_NUMBER"
    | "HASH_PATH_PARAMETER_MISSING"
    | "HASH_UNDEFINED_FORBIDDEN"
    | "HASH_UNSUPPORTED_VALUE";
  detail: string;
  path?: string;
};

export type HashDigest = TaxatHash<"sha256">;

export class CanonicalHashError extends Error {
  readonly code: CanonicalHashErrorInit["code"];
  readonly path?: string;

  constructor(init: CanonicalHashErrorInit) {
    super(`${init.code}: ${init.detail}${init.path ? ` [path=${init.path}]` : ""}`);
    this.name = "CanonicalHashError";
    this.code = init.code;
    this.path = init.path;
  }
}

const PATH_TEMPLATE_PARAM_PATTERN = /\{([^{}]+)\}/g;

function compareLexicographic(left: string, right: string) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function appendUnicodeEscape(parts: string[], codePoint: number) {
  if (codePoint <= 0xffff) {
    parts.push(`\\u${codePoint.toString(16).padStart(4, "0")}`);
    return;
  }

  const normalizedCodePoint = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (normalizedCodePoint >> 10);
  const lowSurrogate = 0xdc00 + (normalizedCodePoint & 0x3ff);
  parts.push(`\\u${highSurrogate.toString(16).padStart(4, "0")}`);
  parts.push(`\\u${lowSurrogate.toString(16).padStart(4, "0")}`);
}

function escapeAsciiJsonString(value: string) {
  const parts = ['"'];

  for (const character of value.normalize("NFC")) {
    switch (character) {
      case '"':
        parts.push('\\"');
        continue;
      case "\\":
        parts.push("\\\\");
        continue;
      case "\b":
        parts.push("\\b");
        continue;
      case "\f":
        parts.push("\\f");
        continue;
      case "\n":
        parts.push("\\n");
        continue;
      case "\r":
        parts.push("\\r");
        continue;
      case "\t":
        parts.push("\\t");
        continue;
      default:
        break;
    }

    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x1f || codePoint > 0x7e) {
      appendUnicodeEscape(parts, codePoint);
      continue;
    }

    parts.push(character);
  }

  parts.push('"');
  return parts.join("");
}

function normalizeCanonicalValue(value: unknown, path = "$"): CanonicalJsonValue {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case "string":
      return value.normalize("NFC");
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        throw new CanonicalHashError({
          code: "HASH_NON_FINITE_NUMBER",
          detail: "canonical JSON rejects NaN and infinite numbers",
          path,
        });
      }
      if (Object.is(value, -0)) {
        throw new CanonicalHashError({
          code: "HASH_NEGATIVE_ZERO_NUMBER",
          detail: "canonical JSON rejects negative zero numbers",
          path,
        });
      }
      return value;
    case "undefined":
      throw new CanonicalHashError({
        code: "HASH_UNDEFINED_FORBIDDEN",
        detail: "canonical JSON requires explicit null rather than undefined",
        path,
      });
    case "bigint":
    case "function":
    case "symbol":
      throw new CanonicalHashError({
        code: "HASH_UNSUPPORTED_VALUE",
        detail: `canonical JSON does not support ${typeof value} values`,
        path,
      });
    case "object":
      break;
  }

  if (value instanceof Date) {
    return normalizeUtcInstantString(value.toISOString());
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => normalizeCanonicalValue(entry, `${path}[${index}]`));
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalHashError({
      code: "HASH_UNSUPPORTED_VALUE",
      detail: "canonical JSON accepts only plain objects, arrays, and scalar JSON values",
      path,
    });
  }

  const normalizedEntries = new Map<string, CanonicalJsonValue>();
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.normalize("NFC");
    if (normalizedEntries.has(normalizedKey)) {
      throw new CanonicalHashError({
        code: "HASH_DUPLICATE_NORMALIZED_KEY",
        detail: `multiple object keys normalize to ${normalizedKey}`,
        path,
      });
    }
    normalizedEntries.set(
      normalizedKey,
      normalizeCanonicalValue(entry, `${path}.${normalizedKey}`),
    );
  }

  const normalizedObject: Record<string, CanonicalJsonValue> = {};
  for (const key of [...normalizedEntries.keys()].sort(compareLexicographic)) {
    normalizedObject[key] = normalizedEntries.get(key)!;
  }
  return normalizedObject;
}

function serializeCanonicalJson(value: CanonicalJsonValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return escapeAsciiJsonString(value);
  }
  if (typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeCanonicalJson(entry)).join(",")}]`;
  }

  const keys = Object.keys(value).sort(compareLexicographic);
  return `{${keys.map((key) => `${escapeAsciiJsonString(key)}:${serializeCanonicalJson(value[key])}`).join(",")}}`;
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function canonicalJsonStringify(value: unknown) {
  return serializeCanonicalJson(normalizeCanonicalValue(value));
}

export function sha256HexUtf8(value: string): HashDigest {
  return asTaxatHash(createHash("sha256").update(value, "utf8").digest("hex"), "sha256");
}

export function stableJsonHash(value: unknown): HashDigest {
  return sha256HexUtf8(canonicalJsonStringify(value));
}

export function sortSetLikeStrings(values: readonly string[]) {
  return [...values].map((entry) => entry.normalize("NFC")).sort(compareLexicographic);
}

export function stableQueryString(queryParams: Record<string, unknown>) {
  const pairs: string[] = [];

  for (const key of Object.keys(queryParams).sort(compareLexicographic)) {
    const rawValue = queryParams[key];
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const encodedKey = encodeRfc3986(String(key));

    for (const value of values) {
      pairs.push(`${encodedKey}=${encodeRfc3986(String(value))}`);
    }
  }

  return pairs.join("&");
}

export function stablePath(resourceTemplate: unknown, resolvedPathParams: unknown) {
  if (typeof resourceTemplate !== "string" || resourceTemplate.length === 0) {
    return null;
  }
  if (
    resolvedPathParams === null ||
    typeof resolvedPathParams !== "object" ||
    Array.isArray(resolvedPathParams)
  ) {
    return null;
  }

  let missingKeys = false;
  const canonicalPath = resourceTemplate.replace(PATH_TEMPLATE_PARAM_PATTERN, (_, key: string) => {
    const rawValue = (resolvedPathParams as Record<string, unknown>)[key];
    if (typeof rawValue !== "string" || rawValue.length === 0) {
      missingKeys = true;
      return `{${key}}`;
    }
    return encodeRfc3986(rawValue);
  });

  if (missingKeys || canonicalPath.includes("{") || canonicalPath.includes("}")) {
    return null;
  }
  return canonicalPath;
}

export function normalizedOptionalIdentityValue(value: unknown) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return NONE_SENTINEL;
}

export function normalizedStringSequence(values: unknown): unknown[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [NONE_SENTINEL];
  }
  return [...values];
}

export type AuthorityHashPayload = Record<string, unknown>;

export function deriveAuthorityIdentityNamespaceHash(payload: AuthorityHashPayload) {
  return stableJsonHash({
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    authority_name: payload.authority_name,
    authority_product_profile: payload.authority_product_profile,
    provider_environment: payload.provider_environment,
    authority_scope: payload.authority_scope,
    operation_family: payload.operation_family,
    operation_profile: payload.operation_profile,
    provider_api_version: payload.provider_api_version,
    binding_lineage_ref: payload.binding_lineage_ref,
  });
}

export function deriveAuthorityDuplicateMeaningKey(
  payload: AuthorityHashPayload,
  canonicalPath: string,
  canonicalQuery: string,
  normalizedObligationRef: string,
  normalizedBasisType: string,
) {
  return stableJsonHash({
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    identity_namespace_hash: deriveAuthorityIdentityNamespaceHash(payload),
    tenant_id: payload.tenant_id,
    client_id: payload.client_id,
    attempt_lineage_manifest_id: payload.attempt_lineage_manifest_id,
    business_partition_refs: normalizedStringSequence(payload.business_partition_refs),
    normalized_obligation_ref: normalizedObligationRef,
    normalized_basis_type: normalizedBasisType,
    http_method: payload.http_method,
    canonical_path: canonicalPath,
    canonical_query: canonicalQuery,
    request_body_hash: payload.request_body_hash,
    access_binding_hash: payload.access_binding_hash,
  });
}

export function deriveAuthorityRequestHash(
  payload: AuthorityHashPayload,
  duplicateMeaningKey: string,
) {
  return stableJsonHash({
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    identity_namespace_hash: deriveAuthorityIdentityNamespaceHash(payload),
    duplicate_meaning_key: duplicateMeaningKey,
    header_profile_refs: payload.header_profile_refs,
    token_binding_ref: payload.token_binding_ref,
    authority_binding_ref: payload.authority_binding_ref,
    authority_link_ref: payload.authority_link_ref,
    delegation_grant_ref: normalizedOptionalIdentityValue(payload.delegation_grant_ref),
    subject_ref: payload.subject_ref,
    acting_party_ref: payload.acting_party_ref,
    policy_snapshot_hash: payload.policy_snapshot_hash,
  });
}

export function deriveAuthorityIdempotencyKey(duplicateMeaningKey: string) {
  return stableJsonHash({
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    duplicate_meaning_key: duplicateMeaningKey,
  });
}
