import { expect, test } from "@playwright/test";

import {
  buildFraudHeaderProfile,
  captureHmrcFraudPreventionContext,
  FraudHeaderCaptureRepository,
  validateHmrcFraudHeaders,
} from "../../../packages/backend-authority/src/index.ts";

function profile() {
  return buildFraudHeaderProfile({
    created_at: "2026-04-29T09:00:00Z",
    profile_id: "hmrc-fph-web-0138",
  });
}

const completeHeaders = {
  "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
  "Gov-Client-Device-ID": "device-0138",
  "Gov-Client-Public-IP": "203.0.113.10",
  "Gov-Client-Public-Port": "443",
};

test("captures HMRC fraud headers with deterministic hash evidence and redacts high-risk values", async () => {
  const capture = captureHmrcFraudPreventionContext({
    context: {
      authority_product_profile: "HMRC_ITSA",
      captured_at: "2026-04-29T09:10:00Z",
      client_id: "client-0138",
      manifest_id: "manifest-0138",
      operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
      operation_profile: "authority-operation-profile://AUTH_SUBMIT_PERIODIC_UPDATE",
      provider_environment: "SANDBOX",
      raw_headers: completeHeaders,
      secure_payload_ref_or_null: "secure-fraud-header-payload://0138",
      subject_ref: "client://0138",
      tenant_id: "tenant-0138",
    },
    profile: profile(),
  });

  expect(capture.capture_state).toBe("COMPLETE");
  expect(capture.missing_header_names).toEqual([]);
  expect(capture.header_set_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(capture.redacted_header_values)).not.toContain("203.0.113.10");
  expect(
    capture.redacted_header_values.find((entry) => entry.header_name === "Gov-Client-Public-IP")
      ?.raw_value_or_null,
  ).toBeNull();
  expect(
    capture.redacted_header_values.find(
      (entry) => entry.header_name === "Gov-Client-Connection-Method",
    )?.raw_value_or_null,
  ).toBe("WEB_APP_VIA_SERVER");

  const repository = new FraudHeaderCaptureRepository();
  const stored = await repository.upsertFraudHeaderCapture({ capture });
  expect(stored.capture_fingerprint).toBe(capture.capture_fingerprint);
  await expect(
    repository.upsertFraudHeaderCapture({
      capture: { ...capture, subject_ref: "client://other" },
    }),
  ).rejects.toThrow(/capture_fingerprint/);
});

test("classifies incomplete capture without storing raw unavailable posture as a valid capture", async () => {
  const fphProfile = profile();
  const capture = captureHmrcFraudPreventionContext({
    context: {
      authority_product_profile: "HMRC_ITSA",
      captured_at: "2026-04-29T09:15:00Z",
      client_id: "client-0138",
      manifest_id: "manifest-0138",
      operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
      operation_profile: "authority-operation-profile://AUTH_SUBMIT_PERIODIC_UPDATE",
      provider_environment: "SANDBOX",
      raw_headers: {
        "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
        "Gov-Client-Device-ID": "device-0138",
        "Gov-Client-Public-Port": "443",
      },
      subject_ref: "client://0138",
      tenant_id: "tenant-0138",
    },
    profile: fphProfile,
  });

  expect(capture.capture_state).toBe("INCOMPLETE");
  expect(capture.missing_header_names).toEqual(["Gov-Client-Public-IP"]);

  const validation = await validateHmrcFraudHeaders({
    capture,
    profile: fphProfile,
    raw_headers: {
      "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
      "Gov-Client-Device-ID": "device-0138",
      "Gov-Client-Public-Port": "443",
    },
    validated_at: "2026-04-29T09:16:00Z",
  });
  expect(validation.result_code).toBe("INVALID");
  expect(validation.validation_errors[0]?.code).toBe("MISSING_MANDATORY_HEADER");
});
