# Resolve And Materialize Frozen Config

`pc_0101` adds the backend-manifest service layer that turns governed
`ConfigVersion` records into the executable, manifest-bound runtime config
surface consumed by workers.

## Required Catalog

The manifest-facing catalog is recorded in
`config/manifest/required_config_types_catalog.json`. It mirrors the canonical
required config order and freeze-ref projection used by `ConfigFreeze`:

- every freeze must contain exactly one entry for each required config type;
- every top-level profile ref must be present, including
  `approval_snapshot_ref`;
- runtime consumption mode is always `FROZEN_CONFIG_ONLY`;
- worker packets compare `config_freeze_hash`, `config_surface_hash`,
  `schema_bundle_hash`, `feature_flag_snapshot_hash`, resolution basis, and
  consumption mode against the frozen artifact.

## Basis Mapping

`config_basis_mapper.ts` is the typed boundary between continuation intent and
`ConfigFreeze.config_resolution_basis`:

| inheritance mode | basis | source lineage |
| --- | --- | --- |
| `null` | `DIRECT_REQUEST_RESOLUTION` | none |
| `FRESH_CHILD_RESOLUTION` | `DIRECT_REQUEST_RESOLUTION` | none |
| `REPLAY_EXACT` | `REPLAY_EXACT_REUSE` | required |
| `RECOVERY_EXACT` | `RECOVERY_EXACT_REUSE` | required |
| `HISTORICAL_EXPLICIT` | `HISTORICAL_EXPLICIT_REUSE` | required |

This keeps fresh child resolution distinguishable from exact reuse even when a
fresh child resolves to the same hashes as an earlier freeze.

## Fresh Resolution

`resolve_config.ts` selects one legal version for every required config type.
For new compliance-capable runs, only `APPROVED` versions with approval and
verification posture are legal. Compliance replay can consume previously frozen
`APPROVED`, `DEPRECATED`, or `REVOKED` entries. Analysis mode can consume
non-revoked pre-approval states for non-compliance paths.

Fresh resolution also requires an explicit feature-flag snapshot posture.
Governed flag surfaces require a non-null snapshot hash and cannot fresh-resolve
while the provider is in outage. `NO_GOVERNED_FLAG_SURFACE` is explicit and
materializes as a null `feature_flag_snapshot_hash`.

## Freeze And Reuse

`freeze_config.ts` builds a `ConfigFreeze` through the existing model so the
canonical entry order, profile refs, `config_freeze_hash`, and
`config_surface_hash` are recomputed and checked. Exact reuse paths rebuild a
new manifest-bound freeze from the source freeze, preserve the exact
freeze/surface hashes, and record source freeze lineage.

## Runtime `cfg`

`materialize_cfg_from_freeze.ts` returns:

- `runtime_config_source: "CONFIG_FREEZE"`;
- frozen ids, hashes, source lineage, and resolution basis;
- entries indexed by config type;
- top-level profile refs and config refs by type;
- schema bundle hash plus schema-reader window contract;
- feature flag snapshot hash;
- a worker packet contract for stale/drift checks.

The materializer never reads live config. It rejects incomplete freezes,
non-`FROZEN_CONFIG_ONLY` payloads, missing schema-reader window posture, and
worker packet drift.

## Orchestration

`resolve_config_for_request.ts` is deliberately narrow. It chooses between
fresh resolution and typed exact reuse, optionally persists the resulting
freeze, loads the frozen packet, and materializes runtime `cfg`. Broader prior
manifest branch decisions remain for later cards.
