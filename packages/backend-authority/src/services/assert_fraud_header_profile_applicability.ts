import { AuthorityModelError } from "../models/authority_common.ts";
import type { FraudHeaderProfile } from "../models/fraud_header_profile.ts";

export const FRAUD_HEADER_PROFILE_APPLICABILITY_BLOCK_REASONS = [
  "MISSING_REQUIRED_PROFILE",
  "PROFILE_NOT_APPLICABLE_TO_OPERATION",
  "PROVIDER_ENVIRONMENT_NOT_APPLICABLE",
  "CONNECTION_METHOD_DRIFT",
  "EXEMPTION_NOT_ALLOWED",
] as const;

export type FraudHeaderProfileApplicabilityBlockReason =
  (typeof FRAUD_HEADER_PROFILE_APPLICABILITY_BLOCK_REASONS)[number];

export function collectFraudHeaderProfileApplicabilityBlockReasons(input: {
  authority_name: string;
  authority_product_profile: string;
  connection_method?: string;
  exemption_reason_or_null?: string | null;
  operation_family: string;
  operation_profile: string;
  profile: FraudHeaderProfile | null;
  provider_environment: string;
}): FraudHeaderProfileApplicabilityBlockReason[] {
  if (input.profile === null) {
    return ["MISSING_REQUIRED_PROFILE"];
  }
  const profile = input.profile;
  const reasons = new Set<FraudHeaderProfileApplicabilityBlockReason>();
  if (
    profile.authority_name !== input.authority_name ||
    !profile.authority_product_profiles.includes(input.authority_product_profile) ||
    !profile.operation_families.includes(input.operation_family)
  ) {
    reasons.add("PROFILE_NOT_APPLICABLE_TO_OPERATION");
  }
  if (
    profile.operation_profile_refs.length > 0 &&
    !profile.operation_profile_refs.includes(input.operation_profile)
  ) {
    reasons.add("PROFILE_NOT_APPLICABLE_TO_OPERATION");
  }
  if (!profile.provider_environments.includes(input.provider_environment as "SANDBOX" | "PRODUCTION")) {
    reasons.add("PROVIDER_ENVIRONMENT_NOT_APPLICABLE");
  }
  if (input.connection_method !== undefined && profile.connection_method !== input.connection_method) {
    reasons.add("CONNECTION_METHOD_DRIFT");
  }
  if (input.exemption_reason_or_null !== null && input.exemption_reason_or_null !== undefined) {
    if (profile.exemption_policy === "NOT_ALLOWED") {
      reasons.add("EXEMPTION_NOT_ALLOWED");
    }
  }
  return [...reasons].sort();
}

export function assertFraudHeaderProfileApplicability(input: {
  authority_name: string;
  authority_product_profile: string;
  connection_method?: string;
  exemption_reason_or_null?: string | null;
  operation_family: string;
  operation_profile: string;
  profile: FraudHeaderProfile | null;
  provider_environment: string;
}) {
  const reasons = collectFraudHeaderProfileApplicabilityBlockReasons(input);
  if (reasons.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `fraud header profile is not applicable: ${reasons.join(",")}`,
    );
  }
  return true;
}
