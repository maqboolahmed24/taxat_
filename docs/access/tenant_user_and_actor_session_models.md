## Status
Accepted foundation for `pc_0085`.

## Purpose
This boundary makes `Tenant`, `User`, and `ActorSession` durable control-plane facts instead of transient framework state.

## Package Boundary
- Workspace: `packages/backend-access`
- Owner: `@taxat/engine-core`
- Assumption: `pc_0028` mapped the seam conceptually to an access/session package, but no concrete workspace existed. This card creates `packages/backend-access` as the first executable boundary for that seam.

## Core Models
- `Tenant` freezes `tenant_id`, display name, policy profile, retention default, and explicit disable posture.
- `User` freezes tenant-scoped role sets, lightweight attributes, MFA posture, and explicit disable posture.
- `ActorSession` remains the canonical authenticated product-session record. It preserves browser anti-CSRF posture, native device-binding posture, step-up completion, revocation lineage, and monotonic `last_seen_at`.

## Persistence Decisions
- Primary keys are globally unique string ids: `tenant_id`, `user_id`, and `session_id`.
- `ActorSession.principal_ref` remains generic so later service and external principals are representable without backfilling fake user rows.
- Human sessions still bind to `principal_user_id_or_null` with a tenant-scoped foreign key so interactive operator sessions cannot drift away from the durable `User` record.
- Tenant disable posture and user disable posture are soft-state controls rather than hard deletes. Historical sessions remain queryable after disablement.
- Revocation, expiry, and step-up posture live directly on the session row because request-path checks need one hot read. Lifecycle lineage is additionally recorded in `actor_session_transition_log` so later audit work does not have to infer state changes from overwritten columns.

## Session Lifecycle
- Surface states are `ISSUED`, `ACTIVE`, `STEPPED_UP`, `EXPIRED`, `REVOKED`, and `DEVICE_INVALIDATED`.
- Effective precedence is fixed: `DEVICE_INVALIDATED` outranks `REVOKED`, which outranks `EXPIRED`. This means a revoked session still surfaces as revoked even when looked up after its nominal expiry window.
- Browser sessions require `csrf_ref` and may not carry device-binding state.
- Native sessions require durable device-binding state and may not carry `csrf_ref`.
- Invalidated device bindings persist as `device_binding_state = INVALIDATED` and surface as a revoked session with the stronger `DEVICE_INVALIDATED` posture.
- Step-up completion requires a rotated `session_binding_hash`. The old challenge posture is not silently reused after privilege elevation.
- `last_seen_at` writes are `GREATEST_ONLY` and cadence-bound so racey request bursts cannot move the timestamp backwards.

## Sensitive Material Rules
- Raw refresh tokens, raw authority credentials, and opaque refresh secrets are forbidden inside `ActorSession`.
- The model scanner rejects suspicious field names before persistence, and the policy contract documents the prohibited patterns.
- The session row keeps hashes, refs, posture, and reason lineage only.

## SQL Contract
- Migration: `db/migrations/phase03_0001_tenant_user_actor_session.sql`
- Schema: `control_access`
- Hot-path indexes:
  - `(tenant_id, session_binding_hash)` for request-path binding lookups
  - `(tenant_id, principal_user_id_or_null, lifecycle_state)` for user session fan-out
  - `expires_at` partial sweep for non-revoked expiry work
  - `(tenant_id, revoked_at DESC)` for revocation and incident review
  - `(tenant_id, last_seen_at DESC)` for active-session hygiene sweeps
- RLS binds every table to `control_support.require_tenant_context()`.

## Future Fit
- `pc_0086` can build `PrincipalContext` from these rows without re-deriving session posture from cookies or bearer claims.
- Later revocation, stream invalidation, upload continuity, and authority flows can query one durable session source instead of probing ad hoc framework state.
- Service and external principals can land later without rewriting the session schema because `principal_ref` and `principal_class` are already explicit.
