import { AuthorityModelError, hashObject, requireString } from "../models/authority_common.ts";
import type { AuthorityRequestEnvelopeBuildInput } from "../models/authority_request_envelope.ts";
import type { FraudHeaderCapture } from "../models/fraud_header_capture.ts";
import type { FraudHeaderProfile } from "../models/fraud_header_profile.ts";
import type { FraudHeaderValidation } from "../models/fraud_header_validation.ts";
import { assertFraudHeaderProfileApplicability } from "./assert_fraud_header_profile_applicability.ts";

export type FraudHeaderRequestBinding = {
  bind_reason_code: "VALIDATED_CAPTURE_BOUND" | "EXPLICIT_EXEMPTION_BOUND" | "NOT_REQUIRED";
  fraud_header_capture_ref: string | null;
  fraud_header_exemption_reason: string | null;
  fraud_header_profile_ref: string | null;
  fraud_header_validation_ref: string | null;
  header_profile_refs: string[];
  request_binding_hash: string;
};

export type FraudHeaderRequestBindingContext = {
  acting_party_ref: string;
  authority_name: string;
  authority_product_profile: string;
  client_id: string;
  manifest_id: string;
  operation_family: string;
  operation_profile: string;
  provider_environment: "SANDBOX" | "PRODUCTION";
  subject_ref: string;
  tenant_id: string;
};

function sameIdentity(
  context: FraudHeaderRequestBindingContext,
  artifact: Pick<
    FraudHeaderCapture | FraudHeaderValidation,
    "tenant_id" | "client_id" | "subject_ref" | "provider_environment"
  >,
) {
  return (
    artifact.tenant_id === context.tenant_id &&
    artifact.client_id === context.client_id &&
    artifact.subject_ref === context.subject_ref &&
    artifact.provider_environment === context.provider_environment
  );
}

function assertValidationUsable(input: {
  capture: FraudHeaderCapture;
  context: FraudHeaderRequestBindingContext;
  profile: FraudHeaderProfile;
  validation: FraudHeaderValidation;
  sealed_at: string;
}) {
  if (!sameIdentity(input.context, input.capture) || !sameIdentity(input.context, input.validation)) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header capture and validation must match the request tenant/client/subject/environment tuple",
    );
  }
  if (
    input.capture.operation_family !== input.context.operation_family ||
    input.capture.operation_profile !== input.context.operation_profile ||
    input.capture.authority_product_profile !== input.context.authority_product_profile
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header capture must match the request operation profile and authority product",
    );
  }
  if (input.capture.fraud_header_profile_ref !== input.profile.fraud_header_profile_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header capture must use the selected fraud header profile",
    );
  }
  if (
    input.validation.fraud_header_profile_ref !== input.profile.fraud_header_profile_ref ||
    input.validation.capture_ref !== input.capture.capture_ref ||
    input.validation.capture_fingerprint !== input.capture.capture_fingerprint ||
    input.validation.header_set_hash !== input.capture.header_set_hash
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header validation must bind to the exact captured header set",
    );
  }
  if (input.capture.capture_state !== "COMPLETE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "incomplete fraud-header captures require explicit exemption and cannot bind as validated capture",
    );
  }
  if (input.validation.result_code === "INVALID") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "invalid fraud-header validation cannot bind to a sealed request",
    );
  }
  if (input.validation.expires_at !== null && Date.parse(input.validation.expires_at) < Date.parse(input.sealed_at)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "expired fraud-header validation cannot bind to a new sealed request identity",
    );
  }
}

function bindingHash(binding: Omit<FraudHeaderRequestBinding, "request_binding_hash">) {
  return hashObject("FRAUD_HEADER_REQUEST_BINDING_V1", binding);
}

export function bindFraudHeadersToRequestIdentity(input: {
  capture?: FraudHeaderCapture | null;
  context: FraudHeaderRequestBindingContext;
  existing_header_profile_refs?: readonly string[];
  exemption_reason?: string | null;
  profile?: FraudHeaderProfile | null;
  sealed_at: string;
  validation?: FraudHeaderValidation | null;
}): FraudHeaderRequestBinding {
  if (input.profile === undefined || input.profile === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "missing required fraud_header_profile_ref for HMRC-bound request",
    );
  }
  const profile = input.profile;
  const exemptionReason = input.exemption_reason == null ? null : requireString("fraud_header_exemption_reason", input.exemption_reason);
  assertFraudHeaderProfileApplicability({
    authority_name: input.context.authority_name,
    authority_product_profile: input.context.authority_product_profile,
    connection_method: profile.connection_method,
    exemption_reason_or_null: exemptionReason,
    operation_family: input.context.operation_family,
    operation_profile: input.context.operation_profile,
    profile,
    provider_environment: input.context.provider_environment,
  });

  const profileRefs = [
    ...new Set([
      ...(input.existing_header_profile_refs ?? []),
      profile.fraud_header_profile_ref,
    ]),
  ].sort();

  if (exemptionReason !== null) {
    if (input.capture !== undefined && input.capture !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "explicit fraud-header exemption must not bind a synthetic capture artifact",
      );
    }
    if (input.validation !== undefined && input.validation !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "explicit fraud-header exemption must not bind a synthetic validation artifact",
      );
    }
    const withoutHash: Omit<FraudHeaderRequestBinding, "request_binding_hash"> = {
      bind_reason_code: "EXPLICIT_EXEMPTION_BOUND",
      fraud_header_capture_ref: null,
      fraud_header_exemption_reason: exemptionReason,
      fraud_header_profile_ref: profile.fraud_header_profile_ref,
      fraud_header_validation_ref: null,
      header_profile_refs: profileRefs,
    };
    return {
      ...withoutHash,
      request_binding_hash: bindingHash(withoutHash),
    };
  }

  if (input.capture === undefined || input.capture === null || input.validation === undefined || input.validation === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "HMRC-bound request requires fraud header capture and validation refs or an explicit exemption",
    );
  }
  assertValidationUsable({
    capture: input.capture,
    context: input.context,
    profile,
    sealed_at: input.sealed_at,
    validation: input.validation,
  });
  const withoutHash: Omit<FraudHeaderRequestBinding, "request_binding_hash"> = {
    bind_reason_code: "VALIDATED_CAPTURE_BOUND",
    fraud_header_capture_ref: input.capture.capture_ref,
    fraud_header_exemption_reason: null,
    fraud_header_profile_ref: profile.fraud_header_profile_ref,
    fraud_header_validation_ref: input.validation.validation_ref,
    header_profile_refs: profileRefs,
  };
  return {
    ...withoutHash,
    request_binding_hash: bindingHash(withoutHash),
  };
}

export function applyFraudHeaderBindingToRequestBuildInput<T extends AuthorityRequestEnvelopeBuildInput>(
  input: T,
  binding: FraudHeaderRequestBinding,
): T {
  return {
    ...input,
    fraud_header_capture_ref: binding.fraud_header_capture_ref,
    fraud_header_exemption_reason: binding.fraud_header_exemption_reason,
    fraud_header_profile_ref: binding.fraud_header_profile_ref,
    fraud_header_validation_ref: binding.fraud_header_validation_ref,
    header_profile_refs: binding.header_profile_refs,
  };
}
