# Config Freeze Inheritance And Consumption Contract

## Purpose

This contract closes the class of failures where child manifests silently fresh-resolve config,
historical reuse is mislabeled as fresh, config completeness is inferred instead of proven, or
downstream workers fall back to live policy/config lookup after seal.

`ConfigFreeze` is execution basis, not environment metadata.

## Governing model

`ConfigFreeze{...}` is the authoritative config artifact for one manifest. It SHALL be complete,
self-describing, and sufficient for deterministic re-execution without ambient config lookup.

The authoritative config lineage fields are:

- `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`
- `config_resolution_basis ∈ {DIRECT_REQUEST_RESOLUTION, REPLAY_EXACT_REUSE, RECOVERY_EXACT_REUSE, HISTORICAL_EXPLICIT_REUSE}`
- `source_config_freeze_ref`
- `source_config_freeze_hash`
- `source_config_surface_hash`
- `config_consumption_mode = FROZEN_CONFIG_ONLY`

## Basis mapping

`RunManifest.continuation_set.config_inheritance_mode` and `ConfigFreeze.config_resolution_basis`
SHALL map exactly:

- `null` on a root manifest -> `DIRECT_REQUEST_RESOLUTION`
- `FRESH_CHILD_RESOLUTION` -> `DIRECT_REQUEST_RESOLUTION`
- `REPLAY_EXACT` -> `REPLAY_EXACT_REUSE`
- `RECOVERY_EXACT` -> `RECOVERY_EXACT_REUSE`
- `HISTORICAL_EXPLICIT` -> `HISTORICAL_EXPLICIT_REUSE`

The mapping above is typed branch truth. The engine SHALL NOT infer exact reuse by comparing hashes
after the fact.

## Source-lineage rules

If `config_resolution_basis = DIRECT_REQUEST_RESOLUTION`:

- `source_config_freeze_ref = null`
- `source_config_freeze_hash = null`
- `source_config_surface_hash = null`

If `config_resolution_basis ∈ {REPLAY_EXACT_REUSE, RECOVERY_EXACT_REUSE, HISTORICAL_EXPLICIT_REUSE}`:

- all three `source_config_*` fields SHALL be non-null
- `source_config_freeze_ref` SHALL mirror `continuation_set.inherited_config_freeze_ref`
- `config_freeze_hash` SHALL equal `source_config_freeze_hash`
- `config_surface_hash` SHALL equal `source_config_surface_hash`

These rules separate exact frozen reuse from fresh resolution even when a fresh resolution happens
to yield byte-identical content.

## Cross-layer mirrors

The same config identity SHALL be mirrored into the sealed worker envelope:

- `frozen_execution_binding.config_freeze_ref = config_freeze.config_freeze_id`
- `frozen_execution_binding.config_freeze_hash = config_freeze.config_freeze_hash`
- `frozen_execution_binding.config_surface_hash = config_freeze.config_surface_hash`
- `frozen_execution_binding.config_resolution_basis = config_freeze.config_resolution_basis`
- `frozen_execution_binding.config_consumption_mode = config_freeze.config_consumption_mode`

`frozen_execution_binding{...}` is the only downstream config-consumption contract. Workers,
authority transport, retry handlers, and late-data monitors SHALL load config through the frozen
manifest-bound ref/hash packet and SHALL NOT re-resolve live config.

## Completeness barrier

No compliance-capable artifact may be persisted until `ConfigFreeze` proves all of the following at
once:

- mandatory config entries are present
- mandatory top-level profile refs are present
- `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`
- `config_consumption_mode = FROZEN_CONFIG_ONLY`

Persisting a partial config freeze and intending to fill it later is forbidden.

## Regression cases closed

- compliance artifacts persisted before config freeze completeness was proven
- replay or recovery children fresh-resolving config instead of reusing the frozen basis
- historical explicit reuse recorded as fresh-child resolution
- drift between `continuation_set{...}`, `ConfigFreeze{...}`, and `frozen_execution_binding{...}`
- downstream jobs reading live config instead of manifest-bound frozen config refs

## Minimum validation plan

- fresh child with `FRESH_CHILD_RESOLUTION` keeps `DIRECT_REQUEST_RESOLUTION` and null
  `source_config_*`
- replay child keeps `REPLAY_EXACT_REUSE` and exact source hash/surface equality
- recovery child keeps `RECOVERY_EXACT_REUSE` and exact source hash/surface equality
- historical explicit child keeps `HISTORICAL_EXPLICIT_REUSE` and cannot masquerade as fresh
- worker payloads fail closed if `config_surface_hash`, `config_resolution_basis`, or
  `config_consumption_mode` drift from the authoritative `ConfigFreeze`
