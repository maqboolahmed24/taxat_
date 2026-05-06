# Cache Isolation Secure Reuse And Native Cache Hydration Contract Support

`pc_0203` adds backend-recovery builders for the two cache legality packets that protect
governed read models and native hydration:

- `buildCacheIsolationContract` emits the schema-valid `CACHE_ISOLATION_V1` envelope.
- `computeCacheDeliveryBindingHash` derives the canonical delivery-binding hash from tenant,
  client, principal, session, access, masking, route, object, shell, projection, partition,
  customer-safe, and preview-subject fields.
- `buildNativeCacheHydrationContract` emits the schema-valid `NATIVE_CACHE_HYDRATION_V1`
  envelope.
- `classifyNativeHydrationCompatibility` and `buildNativeLocalArtifactPurgePlan` make native
  pre-paint legality, resume reuse, mutation gating, and local artifact purge reasons explicit.

Scope rules are fail-closed. Customer portal workspaces and customer request lists are always
customer-safe and visibility-partition bound, with `cache_partition_ref` mirroring
`visibility_cache_partition_key_or_null`. Governance cache scopes clear access, masking, visibility,
and preview fields while retaining tenant, principal, session, route, object, and projection identity.
Native secondary-window cache scopes require `preview_subject_ref_or_null`; all non-secondary cache
scopes clear it.

Native hydration keeps the FE-75 ordered compatibility dimensions and purge trigger reason set:
tenant switch, principal class change, privilege downgrade, session revoked, session binding change,
access binding change, masking change, schema incompatibility, and route or object drift. Cache-only
restoration can pass first paint only after compatibility is verified, and mutation-capable or
filing-capable actions remain blocked until a live rebase or fresh access rebind re-establishes
legality.

The existing low-noise, workflow snapshot, portal workspace, and northbound cursor publishers now
call the shared builders instead of carrying local delivery-hash or native-hydration packet assembly.
This keeps preview reuse, route identity, visibility partitioning, and native restore legality on one
machine-checkable boundary for later automation-pack work.
