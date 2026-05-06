import { expect, test } from "@playwright/test";

import {
  AuthorityRequestEnvelopeRepository,
  applyFraudHeaderBindingToRequestBuildInput,
  bindFraudHeadersToRequestIdentity,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  buildFraudHeaderProfile,
  captureHmrcFraudPreventionContext,
  FraudHeaderCaptureRepository,
  FraudHeaderProfileRepository,
  FraudHeaderValidationRepository,
  validateHmrcFraudHeaders,
} from "../../../packages/backend-authority/src/index.ts";

const headers = {
  "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
  "Gov-Client-Device-ID": "device-flow-0138",
  "Gov-Client-Public-IP": "192.0.2.44",
  "Gov-Client-Public-Port": "443",
};

function operation() {
  return buildAuthorityOperation({
    access_binding_hash: "hash.access.fph-flow.0138",
    acting_party_ref: "client://fph-flow-0138",
    authority_binding_ref: "authority-binding://fph-flow-0138",
    authority_link_ref: "authority-link://fph-flow-0138",
    binding_lineage_ref: "authority-binding-lineage://fph-flow-0138",
    business_partitions: ["business-partition://fph-flow/2026-q1"],
    client_id: "client-fph-flow-0138",
    manifest_id: "manifest-fph-flow-0138",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-fph-flow-0138",
    policy_snapshot_hash: "hash.policy.fph-flow.0138",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://fph-flow-0138",
    target_obligation_ref: "obligation://fph-flow/2026-q1",
    tenant_id: "tenant-fph-flow-0138",
    token_binding_ref: "authority-token-binding://fph-flow-0138",
  });
}

test("persists fraud-header profile, capture, validation, and sealed request refs", async () => {
  const op = operation();
  const profile = buildFraudHeaderProfile({
    created_at: "2026-04-29T11:00:00Z",
    profile_id: "hmrc-fph-flow-0138",
  });
  const profileRepository = new FraudHeaderProfileRepository();
  const captureRepository = new FraudHeaderCaptureRepository();
  const validationRepository = new FraudHeaderValidationRepository();
  const requestRepository = new AuthorityRequestEnvelopeRepository();

  await profileRepository.upsertFraudHeaderProfile({ profile });
  const capture = captureHmrcFraudPreventionContext({
    context: {
      authority_product_profile: op.authority_product_profile,
      captured_at: "2026-04-29T11:05:00Z",
      client_id: op.client_id,
      manifest_id: op.manifest_id,
      operation_family: op.operation_family,
      operation_profile: op.operation_profile_ref,
      provider_environment: "SANDBOX",
      raw_headers: headers,
      secure_payload_ref_or_null: "secure-fraud-header-payload://flow-0138",
      subject_ref: op.subject_ref,
      tenant_id: op.tenant_id,
    },
    profile,
  });
  await captureRepository.upsertFraudHeaderCapture({ capture });
  const validation = await validateHmrcFraudHeaders({
    capture,
    mode: "OFFLINE_CONTRACT",
    profile,
    raw_headers: headers,
    validated_at: "2026-04-29T11:06:00Z",
  });
  await validationRepository.upsertFraudHeaderValidation({ validation });

  const binding = bindFraudHeadersToRequestIdentity({
    capture,
    context: {
      acting_party_ref: op.acting_party_ref,
      authority_name: op.authority_name,
      authority_product_profile: op.authority_product_profile,
      client_id: op.client_id,
      manifest_id: op.manifest_id,
      operation_family: op.operation_family,
      operation_profile: op.operation_profile_ref,
      provider_environment: "SANDBOX",
      subject_ref: op.subject_ref,
      tenant_id: op.tenant_id,
    },
    profile,
    sealed_at: "2026-04-29T11:07:00Z",
    validation,
  });
  const request = buildAuthorityRequestEnvelope(
    applyFraudHeaderBindingToRequestBuildInput(
      {
        client_id: op.client_id,
        http_method: "POST",
        manifest_id: op.manifest_id,
        operation: op,
        operation_family: op.operation_family,
        operation_id: op.operation_id,
        payload: { period: "2026-Q1" },
        payload_ref: "payload://fph-flow/q1",
        query_params: { period: "2026-Q1" },
        request_id: "request-fph-flow-0138",
        resolved_path_params: { clientId: op.client_id, period: "2026-Q1" },
        resource_template: "/clients/{clientId}/periods/{period}/updates",
        tenant_id: op.tenant_id,
      },
      binding,
    ),
  );
  const stored = await requestRepository.persistAuthorityRequestEnvelope({ envelope: request });

  expect(stored.record.fraud_header_profile_ref).toBe(profile.fraud_header_profile_ref);
  expect(stored.record.fraud_header_capture_ref).toBe(capture.capture_ref);
  expect(stored.record.fraud_header_validation_ref).toBe(validation.validation_ref);
  expect(stored.record.fraud_header_exemption_reason).toBeNull();
  expect(JSON.stringify(stored.record)).not.toContain("192.0.2.44");
});

test("persists explicit exemption as explicit lineage without fake capture or validation", async () => {
  const op = operation();
  const profile = buildFraudHeaderProfile({
    created_at: "2026-04-29T11:10:00Z",
    profile_id: "hmrc-fph-exemption-0138",
  });
  const binding = bindFraudHeadersToRequestIdentity({
    context: {
      acting_party_ref: op.acting_party_ref,
      authority_name: op.authority_name,
      authority_product_profile: op.authority_product_profile,
      client_id: op.client_id,
      manifest_id: op.manifest_id,
      operation_family: op.operation_family,
      operation_profile: op.operation_profile_ref,
      provider_environment: "SANDBOX",
      subject_ref: op.subject_ref,
      tenant_id: op.tenant_id,
    },
    exemption_reason: "HMRC_AGREED_DEVICE_RESTRICTION_PUBLIC_PORT_UNAVAILABLE",
    profile,
    sealed_at: "2026-04-29T11:11:00Z",
  });
  const request = buildAuthorityRequestEnvelope(
    applyFraudHeaderBindingToRequestBuildInput(
      {
        client_id: op.client_id,
        http_method: "POST",
        manifest_id: op.manifest_id,
        operation: op,
        operation_family: op.operation_family,
        operation_id: op.operation_id,
        payload: { period: "2026-Q1" },
        payload_ref: "payload://fph-exemption/q1",
        request_id: "request-fph-exemption-0138",
        resolved_path_params: { clientId: op.client_id },
        resource_template: "/clients/{clientId}/updates",
        tenant_id: op.tenant_id,
      },
      binding,
    ),
  );

  expect(request.fraud_header_profile_ref).toBe(profile.fraud_header_profile_ref);
  expect(request.fraud_header_capture_ref).toBeNull();
  expect(request.fraud_header_validation_ref).toBeNull();
  expect(request.fraud_header_exemption_reason).toBe(
    "HMRC_AGREED_DEVICE_RESTRICTION_PUBLIC_PORT_UNAVAILABLE",
  );
});

test("blocks invalid or missing fraud-header posture before request build binding", async () => {
  const op = operation();
  const profile = buildFraudHeaderProfile({
    created_at: "2026-04-29T11:20:00Z",
    profile_id: "hmrc-fph-block-0138",
  });
  const capture = captureHmrcFraudPreventionContext({
    context: {
      authority_product_profile: op.authority_product_profile,
      captured_at: "2026-04-29T11:21:00Z",
      client_id: op.client_id,
      manifest_id: op.manifest_id,
      operation_family: op.operation_family,
      operation_profile: op.operation_profile_ref,
      provider_environment: "SANDBOX",
      raw_headers: { ...headers, "Gov-Client-Public-IP": undefined },
      subject_ref: op.subject_ref,
      tenant_id: op.tenant_id,
    },
    profile,
  });
  const validation = await validateHmrcFraudHeaders({
    capture,
    profile,
    raw_headers: { ...headers, "Gov-Client-Public-IP": undefined },
    validated_at: "2026-04-29T11:22:00Z",
  });
  const context = {
    acting_party_ref: op.acting_party_ref,
    authority_name: op.authority_name,
    authority_product_profile: op.authority_product_profile,
    client_id: op.client_id,
    manifest_id: op.manifest_id,
    operation_family: op.operation_family,
    operation_profile: op.operation_profile_ref,
    provider_environment: "SANDBOX",
    subject_ref: op.subject_ref,
    tenant_id: op.tenant_id,
  } as const;

  expect(() =>
    bindFraudHeadersToRequestIdentity({
      capture,
      context,
      profile,
      sealed_at: "2026-04-29T11:23:00Z",
      validation,
    }),
  ).toThrow(/incomplete fraud-header captures/);

  expect(() =>
    bindFraudHeadersToRequestIdentity({
      context,
      profile,
      sealed_at: "2026-04-29T11:24:00Z",
    }),
  ).toThrow(/requires fraud header capture and validation/);

  expect(() =>
    buildAuthorityRequestEnvelope({
      client_id: op.client_id,
      fraud_header_profile_ref: profile.fraud_header_profile_ref,
      http_method: "POST",
      manifest_id: op.manifest_id,
      operation: op,
      operation_family: op.operation_family,
      operation_id: op.operation_id,
      payload: { period: "2026-Q1" },
      payload_ref: "payload://fph-profile-only/q1",
      request_id: "request-fph-profile-only-0138",
      resolved_path_params: { clientId: op.client_id },
      resource_template: "/clients/{clientId}/updates",
      tenant_id: op.tenant_id,
    }),
  ).toThrow(/capture\+validation refs or an explicit exemption/);
});
