# Late Data Bindings And Input Freeze Persistence

`pc_0117` adds the backend collection slice that freezes late-data policy selection and the final pre-seal input population.

## Binding Precedence

`projectCollectionLateDataBindings` projects bindings from the frozen `CollectionBoundary` in this order:

1. `RUNTIME_SCOPED`
2. `PARTITION_SCOPED`
3. `SOURCE_CLASS`
4. `DOMAIN_WIDE`

Lower `precedence_rank` is more specific. Same-selector policy ties fail closed instead of selecting an arbitrary binding.

## Late Data Classification

Collection drift signals map to indicators as follows:

- `POST_CUTOFF_RECORD_OBSERVED` -> `POST_CUTOFF_RECORD` / `SOURCE_RECORD_TIMESTAMP`
- `CURSOR_ADVANCED_AFTER_CUTOFF` -> `CURSOR_ADVANCED` / `CURSOR_CHECKPOINT`
- `REVISION_ADVANCED_AFTER_CUTOFF` -> `REVISION_ADVANCED` / `REVISION_MARKER`
- `SCHEMA_VERSION_ADVANCED_AFTER_CUTOFF` -> `SCHEMA_VERSION_ADVANCED` / `PROVIDER_SCHEMA_SIGNAL`
- `FRESHNESS_SLO_BREACH_AT_CUTOFF` -> `FRESHNESS_SLO_BREACH` / `FRESHNESS_EVALUATION`

`classifyCollectionLateData` always builds a `LateDataIndicatorSet`. If observations exist, it also builds policy-resolved `LateDataFinding` records and a `LateDataMonitorResult`. `EXCLUDE_LATE` becomes notice-only exclusion, `REVIEW_IF_LATE` creates a workflow ref, and `SPAWN_CHILD_MANIFEST` creates a child-manifest ref.

## Input Freeze

`freezeInputSet` requires injected `artifact_contract_refs[]` and `artifact_contract_hash`; it will not persist a weakened runtime shape. The `input_set_hash` preimage includes frozen boundary entries, provider versions, cursor/revision/audit refs, source/evidence/fact/conflict identities, declaration posture flags, normalization context hash, and artifact contract hash.

`source_domain_postures[]` are assembled in canonical source-domain order. Every non-collected source domain must have a matching declaration artifact, while the persisted declaration arrays mirror posture source domains to satisfy the current contract guard.
