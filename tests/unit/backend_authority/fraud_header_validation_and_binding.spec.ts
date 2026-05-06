import { expect, test } from "@playwright/test";

import {
  applyFraudHeaderBindingToRequestBuildInput,
  bindFraudHeadersToRequestIdentity,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  buildFraudHeaderProfile,
  captureHmrcFraudPreventionContext,
  createOfflineHmrcFraudHeaderValidatorAdapter,
  type FraudHeaderCapture,
  validateHmrcFraudHeaders,
} from "../../../packages/backend-authority/src/index.ts";

function operation() {
  return buildAuthorityOperation({
    access_binding_hash: "hash.access.fph.0138",
    acting_party_ref: "client://0138",
    authority_binding_ref: "authority-binding://fph-0138",
    authority_link_ref: "authority-link://fph-0138",
    binding_lineage_ref: "authority-binding-lineage://fph-0138",
    business_partitions: ["business-partition://fph/2026-q1"],
    client_id: "client-0138",
    manifest_id: "manifest-fph-0138",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-fph-0138",
    policy_snapshot_hash: "hash.policy.fph.0138",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://0138",
    target_obligation_ref: "obligation://fph/2026-q1",
    tenant_id: "tenant-0138",
    token_binding_ref: "authority-token-binding://fph-0138",
  });
}

function profile() {
  return buildFraudHeaderProfile({
    created_at: "2026-04-29T10:00:00Z",
    profile_id: "hmrc-fph-binding-0138",
  });
}

const headers = {
  "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
  "Gov-Client-Device-ID": "device-binding-0138",
  "Gov-Client-Public-IP": "198.51.100.9",
  "Gov-Client-Public-Port": "8443",
};

function captureFor(op = operation()) {
  return captureHmrcFraudPreventionContext({
    context: {
      authority_product_profile: op.authority_product_profile,
      captured_at: "2026-04-29T10:05:00Z",
      client_id: op.client_id,
      manifest_id: op.manifest_id,
      operation_family: op.operation_family,
      operation_profile: op.operation_profile_ref,
      provider_environment: "SANDBOX",
      raw_headers: headers,
      subject_ref: op.subject_ref,
      tenant_id: op.tenant_id,
    },
    profile: profile(),
  });
}

test("binds a valid capture and offline validation to sealed request identity refs", async () => {
  const op = operation();
  const fphProfile = profile();
  const capture = captureFor(op);
  const validation = await validateHmrcFraudHeaders({
    capture,
    mode: "OFFLINE_CONTRACT",
    profile: fphProfile,
    raw_headers: headers,
    validated_at: "2026-04-29T10:06:00Z",
  });

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
    profile: fphProfile,
    sealed_at: "2026-04-29T10:07:00Z",
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
        payload_ref: "payload://fph/q1",
        request_id: "request-fph-0138",
        resolved_path_params: { clientId: op.client_id },
        resource_template: "/clients/{clientId}/fph",
        tenant_id: op.tenant_id,
      },
      binding,
    ),
  );

  expect(binding.bind_reason_code).toBe("VALIDATED_CAPTURE_BOUND");
  expect(request.fraud_header_profile_ref).toBe(fphProfile.fraud_header_profile_ref);
  expect(request.fraud_header_capture_ref).toBe(capture.capture_ref);
  expect(request.fraud_header_validation_ref).toBe(validation.validation_ref);
  expect(request.header_profile_refs).toEqual([fphProfile.fraud_header_profile_ref]);
});

test("keeps explicit exemption separate from synthetic capture or validation artifacts", () => {
  const op = operation();
  const fphProfile = profile();
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
    exemption_reason: "HMRC_AGREED_PLATFORM_RESTRICTION_PUBLIC_IP_UNAVAILABLE",
    profile: fphProfile,
    sealed_at: "2026-04-29T10:10:00Z",
  });

  expect(binding.bind_reason_code).toBe("EXPLICIT_EXEMPTION_BOUND");
  expect(binding.fraud_header_capture_ref).toBeNull();
  expect(binding.fraud_header_validation_ref).toBeNull();
  expect(binding.fraud_header_exemption_reason).toBe(
    "HMRC_AGREED_PLATFORM_RESTRICTION_PUBLIC_IP_UNAVAILABLE",
  );
});

test("blocks missing profile, tuple drift, expired validation, and invalid validation", async () => {
  const op = operation();
  const fphProfile = profile();
  const capture = captureFor(op);
  const validation = await validateHmrcFraudHeaders({
    capture,
    profile: fphProfile,
    raw_headers: headers,
    validated_at: "2026-04-29T10:15:00Z",
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
      profile: null,
      sealed_at: "2026-04-29T10:16:00Z",
      validation,
    }),
  ).toThrow(/missing required fraud_header_profile_ref/);

  expect(() =>
    bindFraudHeadersToRequestIdentity({
      capture: { ...capture, subject_ref: "client://other" } satisfies FraudHeaderCapture,
      context,
      profile: fphProfile,
      sealed_at: "2026-04-29T10:16:00Z",
      validation,
    }),
  ).toThrow(/tenant\/client\/subject\/environment/);

  expect(() =>
    bindFraudHeadersToRequestIdentity({
      capture,
      context,
      profile: fphProfile,
      sealed_at: "2026-04-29T10:31:00Z",
      validation,
    }),
  ).toThrow(/expired/);

  const invalidValidation = await validateHmrcFraudHeaders({
    capture,
    profile: fphProfile,
    raw_headers: { ...headers, "Gov-Client-Public-IP": undefined },
    validated_at: "2026-04-29T10:17:00Z",
  });
  expect(() =>
    bindFraudHeadersToRequestIdentity({
      capture,
      context,
      profile: fphProfile,
      sealed_at: "2026-04-29T10:18:00Z",
      validation: invalidValidation,
    }),
  ).toThrow(/exact captured header set/);
});

test("keeps offline and sandbox validator modes distinguishable", async () => {
  const fphProfile = profile();
  const capture = captureFor();
  const sandbox = await validateHmrcFraudHeaders({
    adapter: createOfflineHmrcFraudHeaderValidatorAdapter({
      code: "POTENTIALLY_INVALID_HEADERS",
      warnings: [
        { code: "ADVISORY", headers: ["Gov-Client-Public-IP"], message: "Review IP source." },
      ],
    }),
    capture,
    mode: "FIXTURE_SANDBOX_VALIDATOR",
    profile: fphProfile,
    raw_headers: headers,
    validated_at: "2026-04-29T10:20:00Z",
  });
  const offline = await validateHmrcFraudHeaders({
    capture,
    mode: "OFFLINE_CONTRACT",
    profile: fphProfile,
    raw_headers: headers,
    validated_at: "2026-04-29T10:21:00Z",
  });

  expect(sandbox.validation_mode).toBe("FIXTURE_SANDBOX_VALIDATOR");
  expect(sandbox.result_code).toBe("WARNINGS");
  expect(offline.validation_mode).toBe("OFFLINE_CONTRACT");
  expect(offline.result_code).toBe("VALID");
});
