# Cache Isolation And Secure Reuse Contract

## Purpose

`cache_isolation_contract` is the authoritative cache identity envelope for read-side shells, route snapshots, portal workspaces, governance surfaces, and native scene hydration. Reuse is lawful only when tenant, principal/session binding, access binding, masking posture, route identity, canonical object identity, projection version, and preview selection all remain exactly aligned with the mounted surface.

## Eliminated Leakage Classes

1. Masking-posture drift where a weaker cache key replays broader or unmasked content into a narrower view.
2. Cross-tenant or cross-client reuse keyed only by broad object identifiers.
3. Browser or native local cache reuse after tenant, role, session, access-binding, or route changes.
4. Preview or export reuse outside the currently mounted route and selected artifact context.
5. Stream or scene hydration from stale identity envelopes after projection-version, route, or preview drift.
6. Partial invalidation that leaves broader cached variants live after access narrowing or masking tightening.

## Contract Fields

The contract freezes:

- scope class
- tenant and optional client binding
- principal class and session binding
- access binding and masking fingerprint
- optional shell-stability ref
- route identity and canonical object ref
- shell family and projection version
- cache partition ref plus visibility cache partition key when visibility partitioning applies
- customer-safe projection posture
- preview subject ref for secondary-window preview surfaces only

## Reuse Law

- Shared caches: exact security-context match only.
- Shared layers or proxies: no reuse without identical context.
- Local persistence: purge on tenant, principal, session, access, masking, or route drift.
- Hydration: reject on context, route, projection-version, or preview mismatch.
- Scope narrowing: purge broader cached variants immediately.
- Preview and export reuse: bound to the current mounted route and selected subject only.

## Scope Rules

- `WORKSPACE_SNAPSHOT`, `WORK_INBOX_SNAPSHOT`, `CLIENT_PORTAL_WORKSPACE`, and `CUSTOMER_REQUEST_LIST` must carry a visibility cache partition key.
- `CLIENT_PORTAL_WORKSPACE` and `CUSTOMER_REQUEST_LIST` are always customer-safe.
- Governance surfaces clear access, masking, and visibility cache bindings.
- Native secondary windows require a non-null preview subject ref.
- All non-secondary scopes clear `preview_subject_ref_or_null`.

## Cross-Layer Enforcement

The contract is enforced in:

- schema bindings on each governed read model and native scene
- `validate_contracts.py` custom invariants
- `forensic_contract_guard.py` schema guardrails

The resulting system fails closed on cache-key broadening, stale hydration, preview replay across route context, and reuse across masking or access posture changes.

## FE-75 Native Hydration Composition

`cache_isolation_contract` freezes who a cached native row or blob belongs to.
`native_cache_hydration_contract` freezes when that cached state may lawfully render, restore, or
reuse resume lineage.

For native cursors and native scenes, the combined rule is:

- cache identity must still match tenant, session, access, masking, route, object, and preview
  scope
- schema compatibility and projection guard must still match before first paint or scene restore
- purge of structured cache SHALL also clear `NSUserActivity`, preview caches, temporary exports,
  and local search indices when FE-75 invalidation triggers fire
