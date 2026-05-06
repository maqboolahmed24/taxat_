# Config Freeze And Feature Flag Resolution Runbook

`ConfigFreeze` is the post-seal execution basis.
This scaffold resolves approved config versions and provider-neutral feature-flag truth once, then
forces replay, recovery, and worker execution to consume the frozen packet instead of live provider
state.

## Inputs

- Required approved `ConfigVersion` records for every mandatory config type in
  `config/configuration/config_type_catalog.json`.
- An explicit feature-flag snapshot posture:
  `GOVERNED_FLAG_SURFACE_PRESENT` with a provider-neutral snapshot hash, or
  `NO_GOVERNED_FLAG_SURFACE` with a deliberate null hash.
- A typed config inheritance mode from continuation selection:
  root / fresh child, replay exact, recovery exact, or historical explicit reuse.

## Resolution Modes

- `DIRECT_REQUEST_RESOLUTION`
  Freshly selects approved config versions, builds a provider-neutral feature-flag snapshot, computes
  `config_freeze_hash`, and then computes `config_surface_hash`.
- `REPLAY_EXACT_REUSE`
  Rebinds to a historical `ConfigFreeze` and preserves exact hash equality and source lineage.
- `RECOVERY_EXACT_REUSE`
  Rebinds to the interrupted attempt's `ConfigFreeze` and permits provider outage because no fresh
  provider read occurs.
- `HISTORICAL_EXPLICIT_REUSE`
  Reuses a historical frozen config basis intentionally, while remaining distinct from fresh
  resolution even if the bytes still match.

## Completeness Barrier

The scaffold fails closed before any compliance-capable artifact persists unless all of the following
hold:

- `required_config_types_present[]` matches the canonical required type order.
- Every top-level frozen config ref is present.
- `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`.
- `config_consumption_mode = FROZEN_CONFIG_ONLY`.
- Governed feature-flag surfaces produce a non-null `feature_flag_snapshot_hash`.

## Worker Consumption

- Load manifest-bound config only through the frozen config packet.
- Reject live provider or environment fallback when a `ConfigFreeze` exists.
- Treat `config_surface_hash` as the reproducibility hash for the whole frozen config surface, not
  for `entries[]` alone.
- Preserve `source_config_freeze_ref`, `source_config_freeze_hash`, and
  `source_config_surface_hash` on exact or historical reuse paths.

## Atlas

`apps/operator-web/public/internal/config-resolution-atlas` is a read-only review surface.
It shows:

- required config version selection
- feature-flag snapshot posture
- inheritance basis and lineage
- completeness barrier state
- frozen config identity
- the exact `config_surface_hash` vector

It must never act as a live config or feature-flag dashboard.
