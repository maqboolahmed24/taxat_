import {
  assertNonEmptySecretString,
  assertSecretVersion,
} from "../models/secret_version.ts";
import {
  buildRuntimeHardeningPolicy,
  type RuntimeHardeningPolicy,
} from "./build_runtime_hardening_policy.ts";

export type OriginValidationMode = "DEEP_LINK" | "EMBEDDED_CONTENT" | "UPLOAD_IMPORT";

export type ValidateDeepLinkAndUploadOriginInput = {
  content_type?: string | null;
  expected_tenant_id: string;
  mode: OriginValidationMode;
  origin: string;
  policy?: RuntimeHardeningPolicy;
  tenant_id: string;
};

export type OriginValidationDecision = {
  allowed: true;
  content_type: string | null;
  mode: OriginValidationMode;
  origin: string;
  tenant_id: string;
};

function allowedOrigins(policy: RuntimeHardeningPolicy, mode: OriginValidationMode) {
  if (mode === "UPLOAD_IMPORT") {
    return policy.origin_validation.allowed_upload_origins;
  }
  if (mode === "EMBEDDED_CONTENT") {
    return policy.origin_validation.allowed_embedded_origins;
  }
  return policy.origin_validation.allowed_deep_link_origins;
}

function normalizeContentType(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const [type] = value.toLowerCase().split(";", 1);
  return assertNonEmptySecretString("content_type", type.trim());
}

export function validateDeepLinkAndUploadOrigin(
  input: ValidateDeepLinkAndUploadOriginInput,
): OriginValidationDecision {
  const policy = input.policy ?? buildRuntimeHardeningPolicy();
  const origin = assertNonEmptySecretString("origin", input.origin);
  const tenantId = assertNonEmptySecretString("tenant_id", input.tenant_id);
  const expectedTenantId = assertNonEmptySecretString(
    "expected_tenant_id",
    input.expected_tenant_id,
  );
  assertSecretVersion(
    tenantId === expectedTenantId,
    "SECRET_VERSION_RESOLUTION_INVALID",
    "origin adoption failed closed because tenant binding drifted",
  );
  assertSecretVersion(
    allowedOrigins(policy, input.mode).includes(origin),
    "SECRET_VERSION_RESOLUTION_INVALID",
    `${input.mode} origin ${origin} is not explicitly allowed`,
  );
  const contentType = normalizeContentType(input.content_type);
  if (input.mode === "UPLOAD_IMPORT") {
    assertSecretVersion(
      contentType !== null &&
        policy.origin_validation.allowed_upload_content_types.includes(contentType),
      "SECRET_VERSION_RESOLUTION_INVALID",
      `upload content type ${contentType ?? "<missing>"} is not allowed`,
    );
  }
  return {
    allowed: true,
    content_type: contentType,
    mode: input.mode,
    origin,
    tenant_id: tenantId,
  };
}
