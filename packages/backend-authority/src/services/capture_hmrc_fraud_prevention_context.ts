import { buildFraudHeaderCapture, type FraudHeaderCapture } from "../models/fraud_header_capture.ts";
import type { FraudHeaderProfile } from "../models/fraud_header_profile.ts";
import { normalizeHmrcFraudHeaders } from "./normalize_hmrc_fraud_headers.ts";
import { redactHmrcFraudHeaderStorage } from "./redact_hmrc_fraud_header_storage.ts";

export type HmrcFraudHeaderCaptureContext = {
  acting_party_ref?: string;
  authority_name?: string;
  authority_product_profile: string;
  captured_at: string;
  client_id: string;
  expires_at?: string | null;
  manifest_id: string;
  operation_family: string;
  operation_profile: string;
  provider_environment: "SANDBOX" | "PRODUCTION";
  raw_headers: Record<string, string | number | boolean | null | undefined>;
  secure_payload_ref_or_null?: string | null;
  subject_ref: string;
  tenant_id: string;
};

function captureIdFromHash(headerSetHash: string, tenantId: string, capturedAt: string) {
  return `hmrc-fph-capture-${headerSetHash.slice(0, 16)}-${tenantId}-${capturedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

export function captureHmrcFraudPreventionContext(input: {
  context: HmrcFraudHeaderCaptureContext;
  profile: FraudHeaderProfile;
}): FraudHeaderCapture {
  const normalized = normalizeHmrcFraudHeaders({
    profile: input.profile,
    raw_headers: input.context.raw_headers,
  });
  return buildFraudHeaderCapture({
    acting_party_ref: input.context.acting_party_ref ?? input.context.subject_ref,
    authority_name: input.context.authority_name ?? input.profile.authority_name,
    authority_product_profile: input.context.authority_product_profile,
    capture_id: captureIdFromHash(
      normalized.header_set_hash,
      input.context.tenant_id,
      input.context.captured_at,
    ),
    capture_state:
      normalized.missing_mandatory_header_names.length === 0 &&
      normalized.invalid_reason_codes.length === 0
        ? "COMPLETE"
        : "INCOMPLETE",
    captured_at: input.context.captured_at,
    client_id: input.context.client_id,
    connection_method: input.profile.connection_method,
    expires_at: input.context.expires_at ?? null,
    fraud_header_profile_ref: input.profile.fraud_header_profile_ref,
    header_set_hash: normalized.header_set_hash,
    manifest_id: input.context.manifest_id,
    missing_header_names: normalized.missing_mandatory_header_names,
    normalized_header_names: normalized.ordered_header_names,
    operation_family: input.context.operation_family,
    operation_profile: input.context.operation_profile,
    provider_environment: input.context.provider_environment,
    redacted_header_values: redactHmrcFraudHeaderStorage({
      normalized,
      profile: input.profile,
    }),
    secure_payload_ref_or_null: input.context.secure_payload_ref_or_null ?? null,
    subject_ref: input.context.subject_ref,
    tenant_id: input.context.tenant_id,
  });
}
