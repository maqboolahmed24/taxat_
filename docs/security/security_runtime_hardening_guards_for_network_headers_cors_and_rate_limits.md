# Security Runtime Hardening Guards For Headers, CORS, And Rate Limits

Status: `pc_0212` implemented.

Assumptions recorded:

- `ASSUMPTION_BACKEND_SECURITY_PACKAGE_CREATED` was already recorded by `pc_0211`; this card extends that package.
- `ASSUMPTION_APPS_API_HTTP_GUARD_PATH_CREATED`: the exact requested deliverable path `apps/api/src/http/register_runtime_hardening_guards.ts` did not exist, so it was created as a framework-neutral guard adapter rather than scattering route-local middleware.

## Canonical Policy Object

`buildRuntimeHardeningPolicy` returns the single backend policy object for route families:

- `API_READ`
- `API_COMMAND`
- `APPROVAL_COMMAND`
- `STEP_UP_COMMAND`
- `AUTHORITY_TRANSMIT`
- `DOWNLOAD_EXPORT`
- `UPLOAD_IMPORT`
- `EMBEDDED_CONTENT`
- `APP_SHELL`

Each route family declares whether CORS is enabled, whether browser writes require CSRF, which rate-limit profile applies, whether stale-view guards are required, and whether safe download/export headers are mandatory.

## Header Posture

`applyHttpSecurityHeaders` emits:

- `Content-Security-Policy` with `script-src 'self'` and `frame-ancestors 'none'` by default.
- `X-Frame-Options: DENY` unless a route is explicitly `EMBEDDED_CONTENT` with approved frame ancestors in the policy registry.
- `X-Content-Type-Options: nosniff`.
- `Strict-Transport-Security` with subdomains.
- `Referrer-Policy: no-referrer`.
- `Permissions-Policy` disabling camera, microphone, geolocation, and payment.
- cross-origin isolation headers.

`DOWNLOAD_EXPORT` additionally gets `Cache-Control: no-store`, attachment-only `Content-Disposition`, `X-Download-Options: noopen`, and explicit Taxat headers stating that masking/export governance is inherited and direct object-store URL bypass is forbidden.

## CORS Model

`validateCorsOrigin` is deny-by-default:

- no CORS headers are emitted for same-origin/no-origin requests;
- credentialed CORS rejects wildcard origins;
- cross-origin access is legal only for route families registered in the policy;
- origins must match an explicit allowlist;
- preflight requests validate the requested method and headers against the same policy as the main request.

## Rate Limits

`enforceCommandRateLimits` keys on both session and principal. Profiles are intentionally stricter for mutation-sensitive route families:

- `READ_STANDARD`: 120/minute
- `COMMAND_STANDARD`: 20/minute
- `APPROVAL_STRICT`: 4/minute
- `STEP_UP_STRICT`: 3/minute
- `TRANSMIT_STRICT`: 2/minute
- `UPLOAD_IMPORT`: 10/minute

This closes the gap where rate limiting could be keyed only on IP address while ignoring session/principal identity.

## Origin And Tenant Adoption

`validateDeepLinkAndUploadOrigin` fails closed before adoption when:

- origin is outside the explicit registry;
- upload content type is not allowed;
- tenant binding differs from the expected tenant.

This covers deep links, drag/drop intake, imports, and embedded content without using route-local heuristics.

## API Registration Boundary

`apps/api/src/http/register_runtime_hardening_guards.ts` exposes:

- `createRuntimeHardeningGuard`
- `registerRuntimeHardeningGuards`

The adapter applies CORS, origin validation, browser-write CSRF checks, per-session/per-principal rate limits, and security headers in one central path. It preserves existing stale-view and idempotency semantics by enforcing hardening before calling the route handler rather than replacing command-envelope validation.

## Verification

Tests cover deny-by-default headers, CSP/frame posture, approved embedding exception registry, safe export/download headers, allowed and blocked CORS, credentialed wildcard rejection, preflight behavior through `APIRequestContext`, CSRF blocking, stricter rate-limit exhaustion, and tenant/content-type origin validation.
