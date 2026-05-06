# Cache Isolation, Masking, and Purge Runbook

## Purpose

`pc_0073` establishes one reusable cache-isolation boundary for browser snapshots, shared projection
caches, preview/export reuse, and native scene restoration.

The canonical runtime lives under `packages/domain-kernel/src/cache`.

## What the boundary governs

- `cache_isolation_contract` is the authoritative cache identity envelope.
- `cache_scope_matrix.json` freezes which fields participate in the cache key for each scope
  class.
- `visibility_partition_policy.json` decides when `visibility_cache_partition_key_or_null` is
  required and which dimensions feed it.
- `preview_export_reuse_policy.json` keeps preview/export reuse bound to the current mounted route
  and the current selected subject only.
- `cache_purge_trigger_matrix.json` defines which local and shared artifacts purge on each drift
  class.

## Runtime entrypoints

- `createCacheIsolationContract(...)`
  Builds the canonical envelope, derives masking posture and visibility partition identity when
  needed, enforces governance and native-secondary invariants, and computes the canonical cache
  delivery binding hash.
- `buildCacheIsolationKey(contract)`
  Materializes the final cache key from the scope-specific key segments.
- `assessCacheReuseGuard(...)`
  Decides between exact reuse, read-only restore, and reject-and-purge.
- `buildCachePurgePlan(...)`
  Projects drifted fields into purge triggers and artifact classes.
- `assessPreviewExportReuse(...)`
  Keeps preview/export reuse route- and selection-bound and blocks it while live legality is still
  pending.

## Operational rules

- Treat `delivery_binding_hash` inside the cache contract as canonical cache affinity, not as a
  raw provider URL or bearer capability.
- Purge broader variants immediately on access-binding, masking, or visibility-partition drift.
- Native secondary windows must always bind `preview_subject_ref_or_null`.
- Governance scopes must always clear access, masking, and visibility partition bindings.
- Cache-only restoration may render read-only continuity, but mutation and filing remain blocked
  until live legality returns.

## Generate and verify

- Emit the atlas payload:
  `node --experimental-strip-types ./packages/domain-kernel/src/cache/build_cache_isolation_atlas.ts --emit`
- Verify generator sync:
  `node --experimental-strip-types ./packages/domain-kernel/src/cache/build_cache_isolation_atlas.ts --check`
- Repo-level coverage check:
  `node --experimental-strip-types ./tools/repository/verify_code_quality_coverage.ts --check`

## Browser atlas

The internal review surface is:

- `apps/operator-web/src/routes/internal/cache-isolation-atlas.tsx`
- `apps/operator-web/public/internal/cache-isolation-atlas/index.html`

Use it to inspect:

- per-scope key segments
- read-only restore posture
- mismatch fields and purge triggers
- temp-artifact purge scope for preview/export drift
