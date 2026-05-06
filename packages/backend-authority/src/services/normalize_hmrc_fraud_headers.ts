import { AuthorityModelError, hashObject, requireString } from "../models/authority_common.ts";
import type {
  FraudHeaderFieldProfile,
  FraudHeaderProfile,
} from "../models/fraud_header_profile.ts";

export type NormalizedHmrcFraudHeaders = {
  header_set_hash: string;
  invalid_reason_codes: string[];
  missing_mandatory_header_names: string[];
  normalized_headers: Record<string, string>;
  ordered_header_names: string[];
};

function headerLookup(headers: Record<string, string | number | boolean | null | undefined>) {
  const lookup = new Map<string, { name: string; value: string }>();
  for (const [name, value] of Object.entries(headers)) {
    if (value == null) {
      continue;
    }
    const normalizedName = requireString("fraud_header_name", name);
    if (!/^Gov-[A-Za-z0-9-]+$/.test(normalizedName)) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        "HMRC fraud-prevention headers must use Gov-* names",
      );
    }
    lookup.set(normalizedName.toLowerCase(), {
      name: normalizedName,
      value: String(value).trim(),
    });
  }
  return lookup;
}

function isAscii(value: string) {
  return [...value].every((char) => {
    const code = char.codePointAt(0);
    return code !== undefined && code <= 0x7f;
  });
}

function isMissingValue(value: string | undefined, field: FraudHeaderFieldProfile) {
  if (value === undefined) {
    return true;
  }
  if (value.length > 0) {
    return false;
  }
  return field.missing_data_posture.serialization_when_missing === "FORBID";
}

export function normalizeHmrcFraudHeaders(input: {
  profile: FraudHeaderProfile;
  raw_headers: Record<string, string | number | boolean | null | undefined>;
}): NormalizedHmrcFraudHeaders {
  const lookup = headerLookup(input.raw_headers);
  const normalizedHeaders: Record<string, string> = {};
  const missingMandatory = new Set<string>();
  const invalidReasons = new Set<string>();

  for (const field of input.profile.fields) {
    const matched = lookup.get(field.header_name.toLowerCase());
    if (field.presence === "MANDATORY" && isMissingValue(matched?.value, field)) {
      missingMandatory.add(field.header_name);
      continue;
    }
    if (matched === undefined) {
      continue;
    }
    if (!isAscii(matched.value)) {
      invalidReasons.add("NON_ASCII_HEADER_VALUE");
    }
    if (field.value_kind === "LIST" && matched.value.split(",").some((part) => part.length === 0)) {
      invalidReasons.add("EMPTY_LIST_ITEM");
    }
    normalizedHeaders[field.header_name] = matched.value;
  }

  for (const entry of lookup.values()) {
    if (entry.name in normalizedHeaders) {
      continue;
    }
    if (!input.profile.fields.some((field) => field.header_name.toLowerCase() === entry.name.toLowerCase())) {
      normalizedHeaders[entry.name] = entry.value;
    }
  }

  const orderedHeaderNames = Object.keys(normalizedHeaders).sort();
  return {
    header_set_hash: hashObject(
      "HMRC_FRAUD_HEADER_SET_V1",
      orderedHeaderNames.map((name) => [name, normalizedHeaders[name]]),
    ),
    invalid_reason_codes: [...invalidReasons].sort(),
    missing_mandatory_header_names: [...missingMandatory].sort(),
    normalized_headers: Object.fromEntries(
      orderedHeaderNames.map((name) => [name, normalizedHeaders[name]]),
    ),
    ordered_header_names: orderedHeaderNames,
  };
}
