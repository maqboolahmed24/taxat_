# Source Collection Run Orchestrator And Fetch Audit Lineage

`SourceCollectionRun` is the governed control-plane object for one manifest-bound collection execution. The backend collection package persists exactly one run per `manifest_id` unless a later supersession model explicitly introduces successor lineage.

## Source Window Anchor

Run creation allocates a future `SourceWindow` anchor before collection starts:

- default `collection_run_id`: `source-collection-run.${manifest_id}`
- default `source_window_id`: `source-window.${manifest_id}`
- default `source_window_ref`: `source-window://source-window.${manifest_id}`

The anchor is a ref reservation only. It does not claim the `SourceWindow` artifact has been materialized. Later `SourceWindow` persistence must reuse the same `source_window_id`, so `sourceWindowRef(...)` produces the same byte-for-byte ref.

## Lifecycle Rules

Transitions follow `SOURCE_COLLECTION_RUN_LIFECYCLE_V1`:

- `NOT_STARTED --fetch_begin--> FETCHING`
- `FETCHING --all_sources_returned--> FETCHED`
- `FETCHING --some_sources_returned_with_gaps--> PARTIAL`
- `FETCHING --fatal_provider_failure--> FAILED`
- `PARTIAL --operator_abort--> ABANDONED`

Every transition rebuilds `state_transition_contract` with `object_family = SOURCE_COLLECTION_RUN`, `machine_code = SOURCE_COLLECTION_RUN_LIFECYCLE_V1`, `state_field_name = lifecycle_state`, and a retained transition audit ref.

## Fetch Rollup Policy

Dispatch remains provider-neutral. The orchestrator accepts normalized source-domain results and reduces them deterministically:

- no results: `FAILED` with `NO_FETCH_RESULTS`
- any `SOURCE_FATAL_FAILURE`: `FAILED`; fatal wins over successful pages and partial gaps
- any non-fatal partial gap: `PARTIAL`
- otherwise: `FETCHED`

`ABANDONED` is not inferred from provider transport. It is produced only by an explicit operator-abort transition over a persisted `PARTIAL` run.

## Audit And Gap Ordering

`fetch_audit_refs[]`, page audit refs, and `partial_gap_refs[]` are normalized through canonical string-set ordering: trim, NFC normalize, dedupe, and lexicographically sort. Missing partial gap refs are classified into deterministic refs shaped as:

`partial-gap://${source_domain}/${partial_gap_code}`

Failure reasons are limited to:

- `FATAL_PROVIDER_FAILURE`
- `DISPATCH_FATAL_FAILURE`
- `FETCH_ROLLUP_FATAL`
- `NO_FETCH_RESULTS`
- `READ_CUTOFF_VIOLATED`
- `SYSTEM_FAULT`

Abandonment reasons are limited to:

- `OPERATOR_ABORT`
- `SUPERSEDED_BY_MANIFEST`
- `STALE_COLLECTION_RUN`
- `MANUAL_CHECKPOINT_REQUIRED`

## Idempotent Resume

Repeated start attempts by the same `manifest_id` reuse the existing stored run. The repository also enforces uniqueness by `manifest_id` and `source_window_ref`, and lifecycle writes use compare-and-swap row versions so concurrent workers cannot both advance the same run.
