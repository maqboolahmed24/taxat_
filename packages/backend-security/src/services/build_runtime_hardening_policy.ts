import {
  assertNonEmptySecretString,
  assertSecretVersion,
  uniqueSortedSecretStrings,
} from "../models/secret_version.ts";

export const RUNTIME_ROUTE_FAMILIES = [
  "API_READ",
  "API_COMMAND",
  "APPROVAL_COMMAND",
  "STEP_UP_COMMAND",
  "AUTHORITY_TRANSMIT",
  "DOWNLOAD_EXPORT",
  "UPLOAD_IMPORT",
  "EMBEDDED_CONTENT",
  "APP_SHELL",
] as const;

export type RuntimeRouteFamily = (typeof RUNTIME_ROUTE_FAMILIES)[number];

export type RuntimeRateLimitProfile = {
  dimensions: ("PRINCIPAL" | "SESSION")[];
  max_requests: number;
  profile_code:
    | "READ_STANDARD"
    | "COMMAND_STANDARD"
    | "APPROVAL_STRICT"
    | "STEP_UP_STRICT"
    | "TRANSMIT_STRICT"
    | "UPLOAD_IMPORT";
  window_ms: number;
};

export type RuntimeCorsProfile = {
  allowed_headers: string[];
  allowed_methods: string[];
  allowed_origins: string[];
  allow_credentials: boolean;
  enabled_route_families: RuntimeRouteFamily[];
  max_age_seconds: number;
};

export type RuntimeContentSecurityPolicy = {
  approved_frame_ancestors: string[];
  connect_src: string[];
  default_src: string[];
  frame_ancestors: string[];
  img_src: string[];
  object_src: string[];
  script_src: string[];
  style_src: string[];
};

export type RuntimeSafeDeliveryPolicy = {
  cache_control: string;
  content_disposition_mode: "ATTACHMENT_ONLY";
  direct_object_store_url_policy: "FORBIDDEN";
  export_masking_policy: "INHERIT_EXTERNALIZATION_GOVERNANCE";
};

export type RuntimeOriginValidationPolicy = {
  allowed_deep_link_origins: string[];
  allowed_embedded_origins: string[];
  allowed_upload_content_types: string[];
  allowed_upload_origins: string[];
  tenant_binding_policy: "EXACT_MATCH_BEFORE_ADOPTION";
};

export type RuntimeHardeningRoutePolicy = {
  cors_enabled: boolean;
  csrf_required_for_browser_write: boolean;
  rate_limit_profile: RuntimeRateLimitProfile["profile_code"];
  route_family: RuntimeRouteFamily;
  safe_download_headers_required: boolean;
  stale_view_guard_required: boolean;
};

export type RuntimeHardeningPolicy = {
  anti_clickjacking_policy: "DENY_BY_DEFAULT";
  anti_content_sniffing_policy: "NOSNIFF";
  contract_version: "RUNTIME_HARDENING_POLICY_V1";
  cors: RuntimeCorsProfile;
  csp: RuntimeContentSecurityPolicy;
  hsts: {
    enabled: true;
    include_subdomains: true;
    max_age_seconds: number;
  };
  origin_validation: RuntimeOriginValidationPolicy;
  rate_limits: Record<RuntimeRateLimitProfile["profile_code"], RuntimeRateLimitProfile>;
  referrer_policy: "no-referrer";
  route_policies: Record<RuntimeRouteFamily, RuntimeHardeningRoutePolicy>;
  safe_delivery: RuntimeSafeDeliveryPolicy;
  x_frame_options: "DENY";
};

export type BuildRuntimeHardeningPolicyInput = {
  allowed_cors_origins?: readonly string[];
  allowed_deep_link_origins?: readonly string[];
  allowed_embedded_origins?: readonly string[];
  allowed_upload_content_types?: readonly string[];
  allowed_upload_origins?: readonly string[];
  cors_enabled_route_families?: readonly RuntimeRouteFamily[];
};

function normalizeRouteFamily(value: unknown) {
  assertSecretVersion(
    typeof value === "string" && RUNTIME_ROUTE_FAMILIES.includes(value as RuntimeRouteFamily),
    "SECRET_VERSION_FIELD_INVALID",
    `route_family must be one of ${RUNTIME_ROUTE_FAMILIES.join(", ")}`,
  );
  return value as RuntimeRouteFamily;
}

function normalizeOrigins(label: string, values: readonly string[]) {
  const origins = uniqueSortedSecretStrings(label, [...values]);
  for (const origin of origins) {
    if (origin === "*") {
      continue;
    }
    try {
      const parsed = new URL(origin);
      assertSecretVersion(
        parsed.origin === origin && (parsed.protocol === "https:" || parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost"),
        "SECRET_VERSION_FIELD_INVALID",
        `${label} entries must be exact origins and use https except local test origins`,
      );
    } catch (error) {
      throw new Error(`${label} contains invalid origin ${origin}: ${String(error)}`);
    }
  }
  return origins;
}

function normalizeContentTypes(values: readonly string[]) {
  const contentTypes = uniqueSortedSecretStrings("allowed_upload_content_types", [...values], {
    allow_empty: false,
  });
  for (const contentType of contentTypes) {
    assertSecretVersion(
      /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType),
      "SECRET_VERSION_FIELD_INVALID",
      `upload content type ${contentType} is not a media type`,
    );
  }
  return contentTypes;
}

function routePolicy(
  routeFamily: RuntimeRouteFamily,
  rateLimitProfile: RuntimeRateLimitProfile["profile_code"],
  options: Partial<RuntimeHardeningRoutePolicy> = {},
): RuntimeHardeningRoutePolicy {
  return {
    cors_enabled: false,
    csrf_required_for_browser_write: routeFamily !== "API_READ" && routeFamily !== "APP_SHELL",
    rate_limit_profile: rateLimitProfile,
    route_family: routeFamily,
    safe_download_headers_required: routeFamily === "DOWNLOAD_EXPORT",
    stale_view_guard_required:
      routeFamily === "API_COMMAND" ||
      routeFamily === "APPROVAL_COMMAND" ||
      routeFamily === "STEP_UP_COMMAND" ||
      routeFamily === "AUTHORITY_TRANSMIT",
    ...options,
  };
}

function buildRoutePolicies(
  corsEnabledRouteFamilies: readonly RuntimeRouteFamily[],
): RuntimeHardeningPolicy["route_policies"] {
  const corsEnabled = new Set(corsEnabledRouteFamilies.map(normalizeRouteFamily));
  return {
    API_READ: routePolicy("API_READ", "READ_STANDARD", {
      cors_enabled: corsEnabled.has("API_READ"),
      csrf_required_for_browser_write: false,
      stale_view_guard_required: false,
    }),
    API_COMMAND: routePolicy("API_COMMAND", "COMMAND_STANDARD", {
      cors_enabled: corsEnabled.has("API_COMMAND"),
    }),
    APPROVAL_COMMAND: routePolicy("APPROVAL_COMMAND", "APPROVAL_STRICT", {
      cors_enabled: corsEnabled.has("APPROVAL_COMMAND"),
    }),
    STEP_UP_COMMAND: routePolicy("STEP_UP_COMMAND", "STEP_UP_STRICT", {
      cors_enabled: corsEnabled.has("STEP_UP_COMMAND"),
    }),
    AUTHORITY_TRANSMIT: routePolicy("AUTHORITY_TRANSMIT", "TRANSMIT_STRICT", {
      cors_enabled: corsEnabled.has("AUTHORITY_TRANSMIT"),
    }),
    DOWNLOAD_EXPORT: routePolicy("DOWNLOAD_EXPORT", "READ_STANDARD", {
      cors_enabled: corsEnabled.has("DOWNLOAD_EXPORT"),
      csrf_required_for_browser_write: false,
      safe_download_headers_required: true,
      stale_view_guard_required: false,
    }),
    UPLOAD_IMPORT: routePolicy("UPLOAD_IMPORT", "UPLOAD_IMPORT", {
      cors_enabled: corsEnabled.has("UPLOAD_IMPORT"),
    }),
    EMBEDDED_CONTENT: routePolicy("EMBEDDED_CONTENT", "READ_STANDARD", {
      cors_enabled: corsEnabled.has("EMBEDDED_CONTENT"),
      csrf_required_for_browser_write: false,
      stale_view_guard_required: false,
    }),
    APP_SHELL: routePolicy("APP_SHELL", "READ_STANDARD", {
      cors_enabled: corsEnabled.has("APP_SHELL"),
      csrf_required_for_browser_write: false,
      stale_view_guard_required: false,
    }),
  };
}

function validateCorsProfile(profile: RuntimeCorsProfile) {
  if (profile.allow_credentials) {
    assertSecretVersion(
      !profile.allowed_origins.includes("*"),
      "SECRET_VERSION_FIELD_INVALID",
      "credentialed CORS must not use wildcard origins",
    );
  }
  profile.allowed_methods.forEach((method) => assertNonEmptySecretString("cors method", method));
  profile.allowed_headers.forEach((header) => assertNonEmptySecretString("cors header", header));
}

export function buildRuntimeHardeningPolicy(
  input: BuildRuntimeHardeningPolicyInput = {},
): RuntimeHardeningPolicy {
  const corsEnabledRouteFamilies = input.cors_enabled_route_families ?? [
    "API_READ",
    "API_COMMAND",
    "APPROVAL_COMMAND",
    "STEP_UP_COMMAND",
    "AUTHORITY_TRANSMIT",
    "UPLOAD_IMPORT",
    "DOWNLOAD_EXPORT",
  ];
  const cors: RuntimeCorsProfile = {
    allowed_headers: [
      "authorization",
      "content-type",
      "idempotency-key",
      "x-csrf-token",
      "x-taxat-command-id",
      "x-taxat-stale-guard",
    ],
    allowed_methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowed_origins: normalizeOrigins("allowed_cors_origins", input.allowed_cors_origins ?? []),
    allow_credentials: true,
    enabled_route_families: [...corsEnabledRouteFamilies].map(normalizeRouteFamily),
    max_age_seconds: 600,
  };
  validateCorsProfile(cors);

  const policy: RuntimeHardeningPolicy = {
    anti_clickjacking_policy: "DENY_BY_DEFAULT",
    anti_content_sniffing_policy: "NOSNIFF",
    contract_version: "RUNTIME_HARDENING_POLICY_V1",
    cors,
    csp: {
      approved_frame_ancestors: normalizeOrigins(
        "allowed_embedded_origins",
        input.allowed_embedded_origins ?? [],
      ),
      connect_src: ["'self'"],
      default_src: ["'self'"],
      frame_ancestors: ["'none'"],
      img_src: ["'self'", "data:"],
      object_src: ["'none'"],
      script_src: ["'self'"],
      style_src: ["'self'"],
    },
    hsts: {
      enabled: true,
      include_subdomains: true,
      max_age_seconds: 31_536_000,
    },
    origin_validation: {
      allowed_deep_link_origins: normalizeOrigins(
        "allowed_deep_link_origins",
        input.allowed_deep_link_origins ?? input.allowed_cors_origins ?? [],
      ),
      allowed_embedded_origins: normalizeOrigins(
        "allowed_embedded_origins",
        input.allowed_embedded_origins ?? [],
      ),
      allowed_upload_content_types: normalizeContentTypes(
        input.allowed_upload_content_types ?? [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "text/csv",
        ],
      ),
      allowed_upload_origins: normalizeOrigins(
        "allowed_upload_origins",
        input.allowed_upload_origins ?? input.allowed_cors_origins ?? [],
      ),
      tenant_binding_policy: "EXACT_MATCH_BEFORE_ADOPTION",
    },
    rate_limits: {
      APPROVAL_STRICT: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 4,
        profile_code: "APPROVAL_STRICT",
        window_ms: 60_000,
      },
      COMMAND_STANDARD: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 20,
        profile_code: "COMMAND_STANDARD",
        window_ms: 60_000,
      },
      READ_STANDARD: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 120,
        profile_code: "READ_STANDARD",
        window_ms: 60_000,
      },
      STEP_UP_STRICT: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 3,
        profile_code: "STEP_UP_STRICT",
        window_ms: 60_000,
      },
      TRANSMIT_STRICT: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 2,
        profile_code: "TRANSMIT_STRICT",
        window_ms: 60_000,
      },
      UPLOAD_IMPORT: {
        dimensions: ["SESSION", "PRINCIPAL"],
        max_requests: 10,
        profile_code: "UPLOAD_IMPORT",
        window_ms: 60_000,
      },
    },
    referrer_policy: "no-referrer",
    route_policies: buildRoutePolicies(corsEnabledRouteFamilies),
    safe_delivery: {
      cache_control: "no-store, max-age=0",
      content_disposition_mode: "ATTACHMENT_ONLY",
      direct_object_store_url_policy: "FORBIDDEN",
      export_masking_policy: "INHERIT_EXTERNALIZATION_GOVERNANCE",
    },
    x_frame_options: "DENY",
  };

  assertSecretVersion(
    policy.csp.script_src.includes("'self'") && !policy.csp.script_src.includes("*"),
    "SECRET_VERSION_FIELD_INVALID",
    "script-src must be deny-by-default and must not include wildcard script origins",
  );
  return policy;
}
