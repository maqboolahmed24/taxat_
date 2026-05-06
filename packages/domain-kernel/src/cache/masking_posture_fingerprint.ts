import { NONE_SENTINEL, stableJsonHash, sortSetLikeStrings } from "../primitives/hash.ts";

export type MaskingPostureFingerprintInput = {
  accessBindingHashOrNull?: string | null;
  customerSafeProjection: boolean;
  maskingDimensionRefsOrNull?: readonly string[] | null;
  maskingRuleRefsOrNull?: readonly string[] | null;
  principalClass: string;
  redactionProfileRefOrNull?: string | null;
  visibilityPartitionKeyOrNull?: string | null;
};

type MaskingPostureFingerprintErrorInit = {
  code: "MASKING_DIMENSION_EMPTY" | "MASKING_PRINCIPAL_CLASS_REQUIRED" | "MASKING_RULE_EMPTY";
  detail: string;
};

export class MaskingPostureFingerprintError extends Error {
  readonly code: MaskingPostureFingerprintErrorInit["code"];

  constructor(init: MaskingPostureFingerprintErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "MaskingPostureFingerprintError";
    this.code = init.code;
  }
}

function assertNonEmptyListEntries(
  values: readonly string[] | null | undefined,
  code: MaskingPostureFingerprintErrorInit["code"],
  label: string,
) {
  for (const value of values ?? []) {
    if (typeof value !== "string" || value.length === 0) {
      throw new MaskingPostureFingerprintError({
        code,
        detail: `${label} entries must remain non-empty strings`,
      });
    }
  }
}

function normalizeOptional(value: string | null | undefined) {
  return value ?? NONE_SENTINEL;
}

export function computeMaskingPostureFingerprint(input: MaskingPostureFingerprintInput) {
  if (typeof input.principalClass !== "string" || input.principalClass.length === 0) {
    throw new MaskingPostureFingerprintError({
      code: "MASKING_PRINCIPAL_CLASS_REQUIRED",
      detail: "principal class is required to derive masking posture deterministically",
    });
  }

  assertNonEmptyListEntries(
    input.maskingDimensionRefsOrNull,
    "MASKING_DIMENSION_EMPTY",
    "masking dimensions",
  );
  assertNonEmptyListEntries(input.maskingRuleRefsOrNull, "MASKING_RULE_EMPTY", "masking rules");

  return stableJsonHash({
    access_binding_hash_or_null: normalizeOptional(input.accessBindingHashOrNull),
    contract_version: "MASKING_POSTURE_FINGERPRINT_V1",
    customer_safe_projection: input.customerSafeProjection,
    masking_dimension_refs: sortSetLikeStrings(input.maskingDimensionRefsOrNull ?? []),
    masking_rule_refs: sortSetLikeStrings(input.maskingRuleRefsOrNull ?? []),
    principal_class: input.principalClass,
    redaction_profile_ref_or_null: normalizeOptional(input.redactionProfileRefOrNull),
    visibility_partition_key_or_null: normalizeOptional(input.visibilityPartitionKeyOrNull),
  });
}
