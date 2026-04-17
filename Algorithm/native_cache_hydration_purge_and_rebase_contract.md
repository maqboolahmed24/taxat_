# Native Cache Hydration, Purge, and Rebase Contract

## Purpose
This contract turns native cache hydration from optimistic performance plumbing into a governed
state-reconstruction boundary.
It freezes the legality envelope that must match before cached native content may render, before
resume lineage may be reused, and before scene restoration may reopen a previously mounted object.

The contract exists to make one rule mechanically enforceable:

- native speed MAY reuse compatible state
- native speed SHALL NOT outrun tenant, session, masking, object, or contract-window legality

## Authoritative artifacts
Every native cursor or native scene that participates in local hydration SHALL serialize one
`native_cache_hydration_contract` validated by
`schemas/native_cache_hydration_contract.schema.json`.

Every release or regression suite that claims native hydration closure SHALL serialize one
`native_cache_hydration_automation_pack` validated by
`schemas/native_cache_hydration_automation_pack.schema.json`.

The shared contract is authoritative for:

- the exact compatibility envelope that must match before first paint or scene restoration
- the frozen binding between cached projections, resume lineage, session lineage, masking posture,
  canonical object identity, and supported contract window
- the rule that resume bindings and cached deltas never cross invalidated cursor lineage
- the rule that cache-only restoration does not reopen mutation-capable or filing-capable posture
  until a live rebase or fresh snapshot re-establishes legality
- the regulated local-artifact purge boundary for structured cache, resume metadata,
  scene-restoration payloads, `NSUserActivity`, preview caches, temporary exports, and local search
  indices

The automation pack is authoritative for:

- deterministic native cold-start, reconnect, tenant-switch, downgrade, revocation, restoration,
  and schema-drift coverage
- proof that compatibility checks complete before rendered content appears
- proof that incompatible envelopes purge immediately instead of rendering stale but plausible legal
  posture
- proof that action gating remains blocked after cache-only restoration until live legality is
  re-established

## Required rules
- Cached native content SHALL bind tenant, principal class, session binding, session lineage,
  masking posture, route identity, canonical object identity, projection guard, and supported
  contract window before first paint or restore.
- `resume_binding_ref_or_null` SHALL represent the current lawful resume lineage only. Revoked,
  expired, rebased, or otherwise incompatible lineage SHALL clear that binding instead of carrying a
  stale token forward.
- Native scenes SHALL reopen the same object in the same shell only when the full legality envelope
  still matches. Otherwise they SHALL surface explicit recovery or invalidation, never a silent root
  remount.
- Cache-only restoration SHALL block mutation-capable and filing-capable actions until a fresh
  snapshot or live rebase re-establishes current legality.
- Purge SHALL be selective and immediate. The client SHALL remove broader or incompatible cache
  variants and SHALL purge the local derivatives that could otherwise leak stale legal context:
  `NSUserActivity`, previews, temporary exports, and local indices.

## Coverage requirements
The automation suite SHALL include at minimum:

- one compatible cold-start cache hydration case
- one schema-incompatible cold-start purge case
- one tenant-switch purge case
- one privilege-downgrade purge case
- one session-revocation purge case
- one cache-only restoration case that renders only after compatibility check and still blocks
  mutation until live rebase
- one secondary-window masking or preview purge case

The suite SHALL also include both UI-level native coverage and lower persistence-fixture coverage so
scene restoration and underlying cache invalidation cannot drift apart.

## Failure modes closed
- cached envelopes reopening under the wrong tenant, session lineage, masking posture, object, or
  supported contract window
- native rendering stale projections before compatibility check or purge
- resume tokens or cached deltas surviving revoked, rebased, or incompatible cursor lineage
- scene restoration reopening stale objects after tenant switch, privilege downgrade, masking
  change, or revocation
- destructive or filing-capable actions proceeding after cache-only restoration without a required
  rebase
- `NSUserActivity`, preview caches, temporary exports, or local search indices surviving after
  revocation, masking change, or schema incompatibility
