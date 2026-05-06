import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, request as playwrightRequest, test } from "@playwright/test";

import { createRuntimeHardeningGuard } from "../../../../apps/api/src/http/register_runtime_hardening_guards.ts";
import {
  buildRuntimeHardeningPolicy,
  enforceCommandRateLimits,
  RuntimeRateLimitStore,
  validateCorsOrigin,
  validateDeepLinkAndUploadOrigin,
  type HeaderMap,
  type RuntimeHardeningPolicy,
  type RuntimeRouteFamily,
} from "../index.ts";

const allowedOrigin = "https://operator.taxat.example";

function policy() {
  return buildRuntimeHardeningPolicy({
    allowed_cors_origins: [allowedOrigin],
    allowed_deep_link_origins: [allowedOrigin],
    allowed_upload_origins: [allowedOrigin],
  });
}

function requestHeaders(request: IncomingMessage): HeaderMap {
  const headers: HeaderMap = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = Array.isArray(value) ? value.join(", ") : value ?? "";
  }
  return headers;
}

function routeFamilyFromPath(url: string | undefined): RuntimeRouteFamily {
  if (url?.startsWith("/download")) {
    return "DOWNLOAD_EXPORT";
  }
  if (url?.startsWith("/transmit")) {
    return "AUTHORITY_TRANSMIT";
  }
  return "API_COMMAND";
}

async function writeResponse(response: ServerResponse, result: { body?: string; headers: HeaderMap; status: number }) {
  response.writeHead(result.status, result.headers);
  response.end(result.body ?? "");
}

async function withGuardedServer(
  runtimePolicy: RuntimeHardeningPolicy,
  run: (baseUrl: string) => Promise<void>,
) {
  const guard = createRuntimeHardeningGuard({ policy: runtimePolicy });
  const server = createServer((request, response) => {
    const headers = requestHeaders(request);
    guard(
      {
        body_content_type: headers["content-type"] ?? null,
        expected_tenant_id: "tenant-a",
        headers,
        method: request.method ?? "GET",
        now_ms: 1_000,
        principal_ref: "principal://pc0212/operator",
        route_family: routeFamilyFromPath(request.url),
        session_ref: "session://pc0212/operator",
        tenant_id: "tenant-a",
        url: request.url ?? "/",
      },
      async () => ({
        body: "ok",
        headers: { "Content-Type": "text/plain" },
        status: 200,
      }),
    )
      .then((result) => writeResponse(response, result))
      .catch((error) =>
        writeResponse(response, {
          body: String(error),
          headers: { "Content-Type": "text/plain" },
          status: 403,
        }),
      );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("allows explicit CORS origins and keeps preflight no broader than main requests", () => {
  const runtimePolicy = policy();
  const main = validateCorsOrigin({
    credentials_requested: true,
    method: "POST",
    origin: allowedOrigin,
    policy: runtimePolicy,
    request_headers: ["content-type", "x-csrf-token"],
    route_family: "API_COMMAND",
  });
  const preflight = validateCorsOrigin({
    credentials_requested: true,
    method: "POST",
    origin: allowedOrigin,
    policy: runtimePolicy,
    preflight: true,
    request_headers: ["content-type", "x-csrf-token"],
    route_family: "API_COMMAND",
  });

  expect(main.cors_headers["Access-Control-Allow-Origin"]).toBe(allowedOrigin);
  expect(preflight.cors_headers["Access-Control-Allow-Origin"]).toBe(allowedOrigin);
  expect(preflight.cors_headers["Access-Control-Allow-Headers"]).toContain("x-csrf-token");
  expect(() =>
    validateCorsOrigin({
      credentials_requested: true,
      method: "POST",
      origin: "https://evil.example",
      policy: runtimePolicy,
      route_family: "API_COMMAND",
    }),
  ).toThrow(/explicit CORS allowlist/i);
});

test("rejects wildcard credentialed CORS posture", () => {
  expect(() =>
    buildRuntimeHardeningPolicy({
      allowed_cors_origins: ["*"],
    }),
  ).toThrow(/credentialed CORS/i);
});

test("enforces stricter rate profiles for transmit and approval routes", () => {
  const runtimePolicy = policy();
  const store = new RuntimeRateLimitStore();
  enforceCommandRateLimits({
    at_ms: 1_000,
    policy: runtimePolicy,
    principal_ref: "principal://pc0212/operator",
    route_family: "AUTHORITY_TRANSMIT",
    session_ref: "session://pc0212/operator",
    store,
  });
  enforceCommandRateLimits({
    at_ms: 1_001,
    policy: runtimePolicy,
    principal_ref: "principal://pc0212/operator",
    route_family: "AUTHORITY_TRANSMIT",
    session_ref: "session://pc0212/operator",
    store,
  });
  expect(() =>
    enforceCommandRateLimits({
      at_ms: 1_002,
      policy: runtimePolicy,
      principal_ref: "principal://pc0212/operator",
      route_family: "AUTHORITY_TRANSMIT",
      session_ref: "session://pc0212/operator",
      store,
    }),
  ).toThrow(/rate limit exhausted/i);

  const approvalProfile =
    runtimePolicy.rate_limits[
      runtimePolicy.route_policies.APPROVAL_COMMAND.rate_limit_profile
    ];
  const readProfile =
    runtimePolicy.rate_limits[runtimePolicy.route_policies.API_READ.rate_limit_profile];
  expect(approvalProfile.max_requests).toBeLessThan(readProfile.max_requests);
});

test("validates deep-link, upload origin, content type, and tenant binding before adoption", () => {
  const runtimePolicy = policy();
  expect(
    validateDeepLinkAndUploadOrigin({
      content_type: "application/pdf; charset=utf-8",
      expected_tenant_id: "tenant-a",
      mode: "UPLOAD_IMPORT",
      origin: allowedOrigin,
      policy: runtimePolicy,
      tenant_id: "tenant-a",
    }).allowed,
  ).toBe(true);
  expect(() =>
    validateDeepLinkAndUploadOrigin({
      expected_tenant_id: "tenant-b",
      mode: "DEEP_LINK",
      origin: allowedOrigin,
      policy: runtimePolicy,
      tenant_id: "tenant-a",
    }),
  ).toThrow(/tenant binding drifted/i);
  expect(() =>
    validateDeepLinkAndUploadOrigin({
      content_type: "application/x-msdownload",
      expected_tenant_id: "tenant-a",
      mode: "UPLOAD_IMPORT",
      origin: allowedOrigin,
      policy: runtimePolicy,
      tenant_id: "tenant-a",
    }),
  ).toThrow(/content type/i);
});

test("covers preflight, main request, CSRF block, and disallowed origin through APIRequestContext", async () => {
  const runtimePolicy = policy();
  await withGuardedServer(runtimePolicy, async (baseUrl) => {
    const context = await playwrightRequest.newContext();
    const preflight = await context.fetch(`${baseUrl}/commands`, {
      headers: {
        "Access-Control-Request-Headers": "content-type, x-csrf-token",
        "Access-Control-Request-Method": "POST",
        Origin: allowedOrigin,
      },
      method: "OPTIONS",
    });
    expect(preflight.status()).toBe(204);
    expect(preflight.headers()["access-control-allow-origin"]).toBe(allowedOrigin);

    const main = await context.fetch(`${baseUrl}/commands`, {
      data: "{}",
      headers: {
        "Content-Type": "application/json",
        Origin: allowedOrigin,
        "X-CSRF-Token": "csrf-proof://pc0212",
      },
      method: "POST",
    });
    expect(main.status()).toBe(200);
    expect(main.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

    const csrfBlocked = await context.fetch(`${baseUrl}/commands`, {
      data: "{}",
      headers: {
        Cookie: "sid=browser-session",
        Origin: allowedOrigin,
      },
      method: "POST",
    });
    expect(csrfBlocked.status()).toBe(403);

    const blockedOrigin = await context.fetch(`${baseUrl}/commands`, {
      data: "{}",
      headers: {
        Origin: "https://evil.example",
        "X-CSRF-Token": "csrf-proof://pc0212",
      },
      method: "POST",
    });
    expect(blockedOrigin.status()).toBe(403);
    await context.dispose();
  });
});
