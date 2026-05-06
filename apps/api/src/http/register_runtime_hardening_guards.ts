import {
  applyHttpSecurityHeaders,
  buildRuntimeHardeningPolicy,
  enforceCommandRateLimits,
  RuntimeRateLimitStore,
  validateCorsOrigin,
  validateDeepLinkAndUploadOrigin,
  type HeaderMap,
  type RuntimeHardeningPolicy,
  type RuntimeRouteFamily,
} from "../../../../packages/backend-security/src/index.ts";

export type RuntimeHardeningHttpRequest = {
  body_content_type?: string | null;
  expected_tenant_id?: string | null;
  headers: HeaderMap;
  method: string;
  now_ms: number;
  principal_ref?: string | null;
  route_family: RuntimeRouteFamily;
  session_ref?: string | null;
  tenant_id?: string | null;
  url: string;
};

export type RuntimeHardeningHttpResponse = {
  body?: string;
  headers: HeaderMap;
  status: number;
};

export type RuntimeHardeningNext = (
  request: RuntimeHardeningHttpRequest,
) => RuntimeHardeningHttpResponse | Promise<RuntimeHardeningHttpResponse>;

export type RuntimeHardeningGuardOptions = {
  policy?: RuntimeHardeningPolicy;
  rate_limit_store?: RuntimeRateLimitStore;
};

export type RuntimeHardeningAdapter = {
  use: (
    handler: (
      request: RuntimeHardeningHttpRequest,
      next: RuntimeHardeningNext,
    ) => Promise<RuntimeHardeningHttpResponse>,
  ) => void;
};

function lowerHeaderMap(headers: HeaderMap) {
  const lowered: HeaderMap = {};
  for (const [key, value] of Object.entries(headers)) {
    lowered[key.toLowerCase()] = value;
  }
  return lowered;
}

function requestedCorsHeaders(headers: HeaderMap) {
  const raw = headers["access-control-request-headers"];
  if (raw === undefined || raw.length === 0) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function originMode(routeFamily: RuntimeRouteFamily) {
  if (routeFamily === "UPLOAD_IMPORT") {
    return "UPLOAD_IMPORT" as const;
  }
  if (routeFamily === "EMBEDDED_CONTENT") {
    return "EMBEDDED_CONTENT" as const;
  }
  return "DEEP_LINK" as const;
}

function isWriteMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function requiresRateLimit(routeFamily: RuntimeRouteFamily, method: string) {
  return (
    isWriteMethod(method) ||
    routeFamily === "APPROVAL_COMMAND" ||
    routeFamily === "STEP_UP_COMMAND" ||
    routeFamily === "AUTHORITY_TRANSMIT"
  );
}

export function createRuntimeHardeningGuard(options: RuntimeHardeningGuardOptions = {}) {
  const policy = options.policy ?? buildRuntimeHardeningPolicy();
  const rateLimitStore = options.rate_limit_store ?? new RuntimeRateLimitStore();

  return async function runtimeHardeningGuard(
    request: RuntimeHardeningHttpRequest,
    next: RuntimeHardeningNext,
  ): Promise<RuntimeHardeningHttpResponse> {
    const headers = lowerHeaderMap(request.headers);
    const origin = headers.origin ?? null;
    const routePolicy = policy.route_policies[request.route_family];
    const securityHeaders = applyHttpSecurityHeaders({
      policy,
      route_family: request.route_family,
    });
    const cors = validateCorsOrigin({
      credentials_requested: headers.cookie !== undefined || headers.authorization !== undefined,
      method: headers["access-control-request-method"] ?? request.method,
      origin,
      policy,
      preflight: request.method.toUpperCase() === "OPTIONS",
      request_headers: requestedCorsHeaders(headers),
      route_family: request.route_family,
    });

    if (origin !== null && request.tenant_id !== null && request.tenant_id !== undefined) {
      validateDeepLinkAndUploadOrigin({
        content_type: request.body_content_type ?? headers["content-type"] ?? null,
        expected_tenant_id: request.expected_tenant_id ?? request.tenant_id,
        mode: originMode(request.route_family),
        origin,
        policy,
        tenant_id: request.tenant_id,
      });
    }

    if (routePolicy.csrf_required_for_browser_write && isWriteMethod(request.method)) {
      if (headers.cookie !== undefined && headers["x-csrf-token"] === undefined) {
        return {
          body: "CSRF token required",
          headers: {
            ...securityHeaders,
            ...cors.cors_headers,
          },
          status: 403,
        };
      }
    }

    if (requiresRateLimit(request.route_family, request.method)) {
      enforceCommandRateLimits({
        at_ms: request.now_ms,
        policy,
        principal_ref: request.principal_ref ?? "principal://anonymous",
        route_family: request.route_family,
        session_ref: request.session_ref ?? "session://anonymous",
        store: rateLimitStore,
      });
    }

    if (cors.preflight) {
      return {
        headers: {
          ...securityHeaders,
          ...cors.cors_headers,
        },
        status: 204,
      };
    }

    const response = await next(request);
    return {
      ...response,
      headers: {
        ...response.headers,
        ...securityHeaders,
        ...cors.cors_headers,
      },
    };
  };
}

export function registerRuntimeHardeningGuards(
  adapter: RuntimeHardeningAdapter,
  options: RuntimeHardeningGuardOptions = {},
) {
  const guard = createRuntimeHardeningGuard(options);
  adapter.use(guard);
  return {
    guard,
    policy: options.policy ?? buildRuntimeHardeningPolicy(),
  };
}
