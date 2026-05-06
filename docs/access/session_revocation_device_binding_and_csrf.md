# Session Revocation, Device Binding, And CSRF

`pc_0094` turns `ActorSession` into the runtime boundary for browser-write admission, native device posture, and revocation fan-out.

## Source Of Truth

The authoritative session facts stay on `ActorSession`:

- `session_binding_hash`
- `csrf_ref`
- `device_binding_state`
- `issued_at`
- `step_up_completed_at`
- `last_seen_at`
- `revoked_at`
- `expires_at`

`SessionLifecycleService` remains the only component that mutates those durable facts. The new services consume that session truth instead of keeping parallel framework-local session state.

## Browser CSRF Model

The browser model is an explicit synchronizer-token design:

- the session cookie remains secure, `HttpOnly`, same-site, and origin/path scoped
- state-changing requests still require a separate anti-CSRF token
- the browser token is issued against one `ActorSession.csrf_ref`
- raw CSRF secrets are returned to the caller once, but only a stable fingerprint hash is retained in service state
- the stored token record also binds to the current `session_binding_hash`

That means browser writes require both:

1. current server-side session truth
2. explicit CSRF proof that is independent from the raw cookie value

`SameSite` alone is intentionally not treated as a complete defense.

## `csrf_ref` Mapping

`csrf_ref` is the durable namespace for browser anti-CSRF posture. It does not store the raw token.

- `ActorSession.csrf_ref` says the browser session is CSRF-governed.
- `CsrfTokenService` issues client token material from that ref.
- the service stores only `token_fingerprint_hash`, `issued_at`, `expires_at`, `invalidated_at`, and the binding hash the token was minted under.
- revocation invalidates all tokens for the targeted session.
- step-up does not need a bespoke token-revocation table mutation because the stored token record remains bound to the pre-rotation `session_binding_hash`; validation therefore fails closed as `BROWSER_CSRF_BINDING_STALE`.

The result is replay-safe and audit-friendly without persisting raw CSRF secrets as ordinary domain state.

## Session Binding

This implementation treats `session_binding_hash` as the strong runtime proof for all session classes.

The policy catalogs define the canonical field families that feed that hash:

- browser: `tenant_id`, `session_id`, `principal_ref`, `session_client_class`, `csrf_ref`, `issued_at`, `step_up_completed_at_or_null`
- native: `tenant_id`, `session_id`, `principal_ref`, `session_client_class`, `device_binding_state`, `issued_at`, `step_up_completed_at_or_null`

The hash is expected to rotate when the challenge lineage changes, especially after successful step-up. It is not widened by heuristic drift.

## Strong Device Binding Vs Heuristics

`DeviceBindingService` keeps the trust split explicit:

- strong proof: presented `session_binding_hash` matching the durable `ActorSession` row
- durable native state: `BOUND`, `UNVERIFIED`, or `INVALIDATED`
- heuristics: network, user-agent family, timezone, and client-instance drift

Heuristics are never the sole authority for acceptance. They can only produce typed escalation:

- browser drift => `CHALLENGE_REQUIRED`
- native `UNVERIFIED` => `CHALLENGE_REQUIRED`
- native strong-binding mismatch => `REVOCATION_RECOMMENDED`

An invalidated native binding remains first-class session truth and surfaces immediately as an unusable session.

## Revocation Propagation

`SessionRevocationService` and `RevocationPropagationService` invalidate the full session lineage on revocation:

- future command acceptance
- registered command tokens
- resume tokens
- stream-resume artifacts
- upload-control artifacts
- cached continuation artifacts
- browser CSRF tokens for the revoked session

Propagation is session-lineage scoped, not principal scoped, so one user may keep another live concurrent session while the targeted session is revoked.

Artifact re-use also fails when the session is still live but the `session_binding_hash` has rotated underneath the artifact.

## Browser, Native, And Automation Differences

- browser sessions require `csrf_ref`, same-origin cookie posture, and anti-CSRF proof for state-changing requests
- native sessions do not use CSRF, but they do require explicit binding posture and fail closed on invalidated device state
- automation sessions are not interactive browser/native sessions and do not masquerade as human product sessions; device binding is `NOT_APPLICABLE`, while optional binding proof still may be checked if presented

## Monotonic Timestamp Rules

The session model keeps chronology fail-closed:

- `issued_at` is the floor
- `step_up_completed_at` cannot predate `issued_at`
- `last_seen_at` is `GREATEST_ONLY`
- `revoked_at` cannot predate the most recent `last_seen_at` or `step_up_completed_at`
- `expires_at` is never moved backward by runtime observation
- `recordLastSeen(...)` becomes a no-op for revoked, expired, or device-invalidated sessions so late heartbeats do not resurrect them

## Failure Surface

The typed failure families exposed by the new services are:

- browser session not usable
- browser session binding rejected
- browser session CSRF rejected
- browser session revalidation required
- session not usable for command admission
- session-bound artifact invalidated or stale

Those codes are intentionally narrow enough for future northbound problem-envelope mapping without re-deriving browser, native, or revocation posture from middleware-local booleans.
