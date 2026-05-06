# Source Plan, Source Window, and Collection Boundary Models

`SourcePlan`, `SourceWindow`, and `CollectionBoundary` are the first durable collection-control objects. They do not fetch provider data. They freeze what must be read, when the active read window closed, and how every planned source ended at cutoff.

## Storage Strategy

The migration stores each aggregate as one authoritative JSON payload plus queryable child rows:

- `source_plan_register` stores the canonical `SourcePlan` payload and hash.
- `source_plan_planned_source` indexes required source-domain, source-class, partition, provider binding, read model, schema, cursor, completeness, freshness, and late-data metadata.
- `source_window_register` stores collection start, completion, read cutoff, hard cutoff state, and post-cutoff mode.
- `collection_boundary_register` stores connector profile/build lineage, source-window linkage, read cutoff, coverage state, payload, and hash.
- `collection_boundary_source_boundary` indexes each explicit source disposition with provider environment/API/schema version, cursor, revision, audit refs, completeness, and late-data policy.

The repository layer mirrors this strategy with deterministic in-memory stores and indexes by id/ref, manifest id, source-plan ref, and source-window id.

## Ordering And Coverage

Factories canonicalize unordered sets before hashing:

- `required_domains[]` is sorted and unique.
- `partition_scope_refs[]`, `runtime_scope_refs[]`, request audit refs, page audit refs, schema refs, and source-class refs are sorted and unique.
- `planned_sources[]` is sorted by source domain, partition set, provider binding, and source class.
- `source_boundaries[]` is sorted by source domain, partition set, source class, provider environment, and cursor checkpoint.

`validatePlanCoverage` requires every required domain to have at least one planned source and rejects planned sources outside the required domain set. It also rejects ambiguous duplicate planned sources for the same source domain and partition set.

`validateBoundaryDisposition` requires every planned source domain/partition key to land in exactly one explicit disposition. Omission never means `NO_DATA_CONFIRMED_AT_CUTOFF`; that disposition must be recorded as a boundary row.

## Cutoff Truth

`SourceWindow` enforces:

- `collection_started_at <= collection_completed_at <= read_cutoff_at`
- `cutoff_enforcement_state = HARD_CLOSED_AT_READ_CUTOFF`
- `post_cutoff_observation_mode = LATE_DATA_ONLY`

Post-cutoff observations are not written back into the active collection boundary. Later late-data services must record them separately.

## Input Freeze Consumption

Later input-freeze code can consume:

- `sourcePlanRef(plan)` and `source_plan_hash`
- `sourceWindowRef(window)` and `source_window_hash`
- `collectionBoundaryRef(boundary)` and `collection_boundary_hash`

The objects carry provider/build/version/audit lineage without connector-specific interpretation, so later fetch and input-freeze cards can extend the pipeline without changing the control-object semantics.
