# Schema Bundle, Reader Window, and Migration Ledger Models

This card makes schema compatibility a persisted control-plane fact instead of a release-note or CI-only posture.

## Persistence Shape

Schema bundles are persisted as a hybrid:

- `schema_bundle_register` stores the immutable hash-addressed bundle root, compatibility profile, published timestamp, and the embedded `schema_reader_window_contract`.
- `schema_bundle_entry_register` stores one normalized entry row per schema/artifact pair for efficient lookup.
- the full bundle payload is retained so manifest allocation and config freezing can consume one exact contract packet.

`schema_bundle_hash` is computed from the normalized ordered entry set and `compatibility_profile_ref`. The reader-window contract mirrors that hash in `writer_schema_bundle_hash`.

## Reader Window Consumption

Manifest and config-freeze callers should load `SchemaBundle` by `schema_bundle_hash`, then consume the persisted `schema_reader_window_contract` directly. They should not recompute the active reader window from CI output or the currently live bundle.

The guard service classifies:

- destructive schema contraction as blocked until `CONTRACT_ELIGIBLE_WINDOW_CLOSED`
- rollback as `ROLLBACK_ALLOWED` before closure and `FAIL_FORWARD_ONLY` after closure
- historical manifest and replay/restore readability from `supported_reader_schema_bundle_hashes` and `protected_historical_schema_bundle_hashes`
- native client compatibility as an explicit blocking input, not a backend-only inference

## Migration Ledger and Backfill

`SchemaMigrationLedger` owns expand, apply/backfill, verify, contract, halt/failure, and supersession chronology. It embeds both the reader-window contract and `BackfillExecutionContract`.

Backfill policy is explicit:

- `NO_BACKFILL_REQUIRED` requires `NOT_APPLICABLE` and empty affected/audit lists.
- `IDEMPOTENT_BACKFILL_REQUIRED` requires affected artifact types.
- terminal backfill states require audit refs.
- verification and later migration phases require completed backfill when backfill is required.

Closed schema windows and contract phases require `FAIL_FORWARD_ONLY`. Optional contract phases cannot enter `CONTRACTING` or `CONTRACTED`.

## Historical and Replay Protection

Historical manifests remain protected while their bundle hash is either directly supported by the reader window or listed as a protected historical bundle. Replay restore is blocked unless the replay reader is supported or the runtime can load the exact historical bundle.

This is the compatibility substrate later release, replay, and manifest cards should reuse.
