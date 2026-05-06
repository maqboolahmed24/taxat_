import {
  assertNonEmptySecretString,
  assertSecretVersion,
  uniqueSortedSecretStrings,
  SecretVersionModelError,
} from "../models/secret_version.ts";
import {
  buildRuntimeHardeningPolicy,
  type RuntimeHardeningPolicy,
  type RuntimeRouteFamily,
} from "./build_runtime_hardening_policy.ts";

export type CorsValidationDecision = {
  allowed: true;
  cors_headers: Record<string, string>;
  origin: string | null;
  preflight: boolean;
  route_family: RuntimeRouteFamily;
};

export type ValidateCorsOriginInput = {
  credentials_requested?: boolean;
  method: string;
  origin: string | null;
  policy?: RuntimeHardeningPolicy;
  preflight?: boolean;
  request_headers?: readonly string[];
  route_family: RuntimeRouteFamily;
};

function normalizeMethod(method: string) {
  return assertNonEmptySecretString("method", method).toUpperCase();
}

function normalizeHeaderNames(values: readonly string[]) {
  return uniqueSortedSecretStrings(
    "request_headers",
    values.map((value) => value.toLowerCase()),
  );
}

function assertCorsHeaderSubset(requested: readonly string[], allowed: readonly string[]) {
  const allowedSet = new Set(allowed.map((value) => value.toLowerCase()));
  for (const header of requested) {
    assertSecretVersion(
      allowedSet.has(header.toLowerCase()),
      "SECRET_VERSION_FIELD_INVALID",
      `CORS request header ${header} is not allowed`,
    );
  }
}

export function validateCorsOrigin(input: ValidateCorsOriginInput): CorsValidationDecision {
  const policy = input.policy ?? buildRuntimeHardeningPolicy();
  const routePolicy = policy.route_policies[input.route_family];
  const method = normalizeMethod(input.method);
  const preflight = input.preflight === true || method === "OPTIONS";

  if (input.origin === null) {
    return {
      allowed: true,
      cors_headers: {},
      origin: null,
      preflight,
      route_family: input.route_family,
    };
  }

  const origin = assertNonEmptySecretString("origin", input.origin);
  assertSecretVersion(
    routePolicy.cors_enabled,
    "SECRET_VERSION_RESOLUTION_INVALID",
    `CORS is not enabled for route family ${input.route_family}`,
  );
  assertSecretVersion(
    policy.cors.enabled_route_families.includes(input.route_family),
    "SECRET_VERSION_RESOLUTION_INVALID",
    `route family ${input.route_family} is not in the CORS enabled registry`,
  );
  if (input.credentials_requested === true && policy.cors.allowed_origins.includes("*")) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_FIELD_INVALID",
      "credentialed CORS must reject wildcard-origin posture",
    );
  }
  assertSecretVersion(
    policy.cors.allowed_origins.includes(origin),
    "SECRET_VERSION_RESOLUTION_INVALID",
    `origin ${origin} is not in the explicit CORS allowlist`,
  );
  assertSecretVersion(
    method === "OPTIONS" || policy.cors.allowed_methods.includes(method),
    "SECRET_VERSION_RESOLUTION_INVALID",
    `method ${method} is not allowed by CORS policy`,
  );

  const requestedHeaders = normalizeHeaderNames(input.request_headers ?? []);
  assertCorsHeaderSubset(requestedHeaders, policy.cors.allowed_headers);

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Credentials": policy.cors.allow_credentials ? "true" : "false",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
  };
  if (preflight) {
    corsHeaders["Access-Control-Allow-Headers"] = policy.cors.allowed_headers.join(", ");
    corsHeaders["Access-Control-Allow-Methods"] = policy.cors.allowed_methods.join(", ");
    corsHeaders["Access-Control-Max-Age"] = String(policy.cors.max_age_seconds);
  }

  return {
    allowed: true,
    cors_headers: corsHeaders,
    origin,
    preflight,
    route_family: input.route_family,
  };
}
