import { hashObject } from "../models/authority_common.ts";
import type { FraudHeaderStoredValue } from "../models/fraud_header_capture.ts";
import type { FraudHeaderProfile } from "../models/fraud_header_profile.ts";
import type { NormalizedHmrcFraudHeaders } from "./normalize_hmrc_fraud_headers.ts";

function redactedValue(headerName: string, value: string) {
  return `<REDACTED:${hashObject("HMRC_FRAUD_HEADER_VALUE_V1", [headerName, value]).slice(0, 16)}>`;
}

export function redactHmrcFraudHeaderStorage(input: {
  normalized: NormalizedHmrcFraudHeaders;
  profile: FraudHeaderProfile;
}): FraudHeaderStoredValue[] {
  const values: FraudHeaderStoredValue[] = [];
  const profileByHeader = new Map(input.profile.fields.map((field) => [field.header_name, field]));
  const allNames = [...new Set([...input.normalized.ordered_header_names, ...input.profile.fields.map((field) => field.header_name)])].sort();

  for (const headerName of allNames) {
    const rawValue = input.normalized.normalized_headers[headerName];
    const profileField = profileByHeader.get(headerName);
    const valuePresent = rawValue !== undefined;
    const valueHash = valuePresent
      ? hashObject("HMRC_FRAUD_HEADER_VALUE_V1", [headerName, rawValue])
      : null;
    const suppressRaw =
      profileField?.sensitive_value_policy !== "SUMMARY_ONLY_REPO_SAFE" || headerName === "Gov-Client-Public-IP";

    values.push({
      header_name: headerName,
      raw_value_or_null: valuePresent && !suppressRaw ? rawValue : null,
      redacted_value: valuePresent
        ? suppressRaw
          ? redactedValue(headerName, rawValue)
          : rawValue
        : "<MISSING>",
      storage_policy: valuePresent
        ? suppressRaw
          ? "HASH_ONLY_HIGH_RISK"
          : "RAW_RETAINED_REPO_SAFE"
        : "SECURE_REF_ONLY",
      value_hash_or_null: valueHash,
      value_present: valuePresent,
    });
  }

  return values;
}
