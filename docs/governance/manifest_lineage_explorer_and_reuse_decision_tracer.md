# Manifest Lineage Explorer And Reuse Decision Tracer

The manifest lineage explorer is a read-side projection over persisted
`ManifestLineageTrace` records. It does not infer lineage from adjacent
manifests, timestamps, or span ordering. The only durable inputs are the trace
record itself and the selected manifest's explicit `manifest_lineage_trace_refs`.

## Query Boundary

- `queryManifestLineageTraceById` requires an explicit lineage trace id.
- `queryManifestLineageTraceForSelectedManifest` lists persisted traces linked to
  a selected manifest. If no trace id is supplied, it selects the latest
  append-only trace by `persisted_at`, with `lineage_trace_id` as the
  deterministic tie-breaker.
- `queryManifestLineageTraceByRequestIdentity` uses the persisted
  request-identity index and can be narrowed by idempotency key and selected
  manifest id. It never scans neighboring manifests.

Every query reopens the selected manifest and verifies that its explicit
`manifest_lineage_trace_refs` contains the projected trace ref. Missing refs,
mirror drift, incomplete candidate coverage, or widened effective scope fail
closed.

## Projection Guarantees

`buildManifestLineageExplorer` preserves:

- `selected_branch_action` separately from the selected manifest's persisted
  `selected_manifest_continuation_basis`.
- prior manifest id, manifest hash at decision, and lifecycle state.
- returned bundle hash for `RETURN_EXISTING_BUNDLE`.
- replay and recovery inheritance modes.
- nightly predecessor batch, manifest, and hash context when the trace is
  nightly.
- branch-decision audit refs and trace span refs as evidence only.

Candidate coverage must include exactly the canonical branch actions:

`NEW_MANIFEST`, `RETURN_EXISTING_BUNDLE`, `REUSE_SEALED_MANIFEST`,
`REPLAY_CHILD`, `RECOVERY_CHILD`, `CONTINUATION_CHILD`, and
`NEW_REQUEST_CHILD`.

Exactly one candidate must be `SELECTED`; all rejected candidates must carry
typed disqualifier reason codes. The selected candidate must remain bound to the
persisted branch action target: no compared manifest for `NEW_MANIFEST`, the
selected manifest for same-manifest reuse, and the prior manifest for child
allocation.

## Mirror Policy

The explorer only renders traces whose persisted mirror state is
`ALL_MIRRORS_IN_SYNC`. Required mirror sources are:

- `RUN_MANIFEST_TOP_LEVEL`
- `CONTINUATION_SET`
- `MANIFEST_BRANCH_DECISION`

`FROZEN_EXECUTION_BINDING` is preserved when present. Mirror source ordering and
uniqueness are checked before projection.
