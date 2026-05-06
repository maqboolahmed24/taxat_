import {
  canonicalJsonStringify,
  stableJsonHash,
  sortSetLikeStrings,
  type CanonicalJsonValue,
  type HashDigest,
} from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export const BACKEND_ACCESS_HASH_SERIALIZER_PROFILE =
  "BACKEND_ACCESS_CANONICAL_HASH_V1" as const;

export type BackendAccessCanonicalHashVector<
  Payload extends CanonicalJsonValue = CanonicalJsonValue,
> = {
  digest: HashDigest;
  payload: Payload;
  profile: typeof BACKEND_ACCESS_HASH_SERIALIZER_PROFILE;
  serialized: string;
};

export type BackendAccessHashFixture<
  Payload extends CanonicalJsonValue = CanonicalJsonValue,
> = {
  description: string;
  expected_digest: HashDigest;
  vector: Payload;
};

export function requireCanonicalString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

export function normalizeCanonicalNullableString(
  label: string,
  value: string | null | undefined,
) {
  return value === null || value === undefined
    ? null
    : requireCanonicalString(label, value);
}

export function normalizeCanonicalStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options?: {
    minItems?: number;
  },
) {
  const normalizedValues = [...new Set((values ?? []).map((value) => requireCanonicalString(label, value)))];
  const sorted = sortSetLikeStrings(normalizedValues);

  if ((options?.minItems ?? 0) > 0 && sorted.length < (options?.minItems ?? 0)) {
    throw new Error(`${label} must contain at least ${options?.minItems} item(s)`);
  }

  return sorted;
}

export function normalizeCanonicalInstant(label: string, value: string) {
  return normalizeUtcInstantString(requireCanonicalString(label, value));
}

export function normalizeCanonicalHashValue(value: unknown): CanonicalJsonValue {
  return JSON.parse(canonicalJsonStringify(value)) as CanonicalJsonValue;
}

export function buildCanonicalHashVector<Payload extends CanonicalJsonValue>(
  payload: unknown,
): BackendAccessCanonicalHashVector<Payload> {
  const serialized = canonicalJsonStringify(payload);
  const normalizedPayload = JSON.parse(serialized) as Payload;
  return {
    profile: BACKEND_ACCESS_HASH_SERIALIZER_PROFILE,
    payload: normalizedPayload,
    serialized,
    digest: stableJsonHash(normalizedPayload),
  };
}

export function canonicalHashDigest(payload: unknown): HashDigest {
  return stableJsonHash(payload);
}

export { canonicalJsonStringify, sortSetLikeStrings };
