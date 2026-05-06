# Ephemeral Environment And Reset Workflows

## Purpose

Ephemeral environments are the governed test-shard runtime for CI, preview review, and local
high-fidelity suites. They reuse the same local runtime substrate from
`infra/local/local_runtime_topology.json`, but every lifecycle command requires an explicit
environment identity and derives isolated namespaces for control-store state, audit streams,
object prefixes, queues, caches, projections, upload sessions, and worker leases.

The unit of ephemerality is one `TEST_SHARD_INSTANCE`. A pull request or CI run may own multiple
ephemeral environments, but each shard must still receive its own identity hash and namespace hash.

## Identity And Namespace Rules

- Environment ids must match `^env-ephemeral-[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Scope classes are `CI_RUN_SHARD`, `PREVIEW_REVIEW_SHARD`, and `LOCAL_HIGH_FIDELITY_SHARD`.
- The namespace hash is the first 12 hex characters of the stable environment identity hash.
- Namespaces derive only from the explicit `environment_id` and `namespace_hash`; they are never
  inferred from broad defaults or ambient host state.
- Reset and destroy commands reject manifests whose `environment_ref` is not one of the approved
  ephemeral environment references from `infra/test/ephemeral_environment_catalog.json`.

## Seed And Fixture Basis

- `PROFILE_GOLDEN_PACK_ONLY` is the default seed profile for CI and preview review shards.
- `PROFILE_DETERMINISTIC_BASELINE` is the default seed profile for local high-fidelity shards.
- Seed material is written as `seed_material.json` and hashed into the environment manifest.
- Cleanliness verification compares the manifest seed-profile hash against the current reviewed seed
  profile contract. A changed seed profile after bootstrap is a hard failure, not a warning.

## Lifecycle Commands

### Bootstrap

`scripts/test/bootstrap_ephemeral_environment.py` provisions the manifest, records the schema
bundle basis, writes seed material, and verifies cleanliness before marking the environment
`READY`.

Bootstrap is resumable. If it halts after `MIGRATION_BASIS` or `SEED_LOAD`, rerun the same command
with the same explicit identity and seed inputs.

Example:

```bash
python3 ./scripts/test/bootstrap_ephemeral_environment.py \
  --environment-id env-ephemeral-ci-validate-001 \
  --scope-class CI_RUN_SHARD \
  --owner-ref ci.run.20260423.001 \
  --shard-ref shard-a \
  --runtime-profile local \
  --state-dir ./.tmp/ephemeral
```

### Load Seed Material

`scripts/test/load_ephemeral_seed_profile.py` regenerates deterministic seed material for a
previously declared environment identity. When a manifest already exists, it reuses that manifest's
locked identity rather than accepting partial overrides.

### Cleanliness Verification

`scripts/test/verify_ephemeral_cleanliness.py` proves the environment matches the declared basis.
It checks:

- lifecycle posture when `READY` is required
- queue, cache, upload-session, projection, and cursor emptiness
- object-prefix emptiness across staging, quarantine, and derived prefixes
- service availability for queue, cache, and object storage
- seed-profile-hash continuity

### Reset

`scripts/test/reset_ephemeral_environment.py` always begins with an explicit identity recheck.
It then applies one of two governed reset scopes:

- `FAST_DISPOSABLE_REUSE`
  Clears disposable acceleration only: queue, DLQ, cache, projections, stream cursors, and worker
  leases.
- `FULL_TEST_ISOLATION`
  Recreates deterministic truth rails as well: control schema, audit schema, object prefixes,
  upload sessions, and audit streams, then reloads the deterministic seed profile.

Reset halts rather than masking risk when:

- workers still hold live leases and `--force-fence-workers` is not supplied
- queue or cache service availability is false
- post-reset cleanliness verification detects residual drift

Every reset writes typed evidence under `evidence/`.

### Destroy

`scripts/test/destroy_ephemeral_environment.py` tears down the approved environment namespaces,
removes seed and cleanliness artifacts, and preserves only evidence files.

Destroy is blocked while `debug_retention_active` is true unless
`--override-debug-retention` is supplied. This keeps debugging posture explicit instead of letting a
cleanup command silently discard retained state.

## Browser And Playwright Attachment

Browser suites should attach through the environment manifest and its seed material, not through
hard-coded ids. The manifest exposes a `browser_attachment` block that includes:

- `environment_identity_chip`
- `session_fixture_alias`
- `route_identity_ref`
- `queue_flow_ref`
- `upload_object_ref`
- `cache_partition_ref`
- `retry_rebase_token`

Playwright suites must assert that the browser-visible journey uses those manifest-derived values.
Retry and rebase checks must fail closed when a token from another ephemeral environment is used.

## Evidence Layout

Each environment state directory stores:

- `environment_manifest.json`
- `seed_material.json`
- `cleanliness_report.json`
- `evidence/reset-*.json`
- `evidence/destroy-*.json`

Reset and destroy evidence stays redaction-safe. It captures chronology, resource counts, scope,
seed-profile hash, approved target pattern, outcome, and source lineage, but never raw customer or
secret payloads.
