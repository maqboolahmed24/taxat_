# Manifest Lineage Trace And Branch Decision Contract

`ManifestBranchDecisionContract` and `ManifestLineageTrace` deliberately answer different questions.

- `RunManifest.manifest_branch_decision` remains embedded on the selected manifest and mirrors that manifest's own `continuation_basis`.
- `ManifestLineageTrace.selected_branch_action` records the request-time outcome, including `RETURN_EXISTING_BUNDLE` and `REUSE_SEALED_MANIFEST`, without mutating historical manifest lineage.

## Storage Decision

The write model does not add a second branch-decision table. Manifest-local branch truth stays embedded on `control_manifest.run_manifest_register.manifest_branch_decision`, because it is part of the manifest aggregate and must remain byte-identical with top-level lineage mirrors and `continuation_set`.

Request-time narration is stored separately in `control_manifest.manifest_lineage_trace_register`, with child rows for ordered candidate evaluations and a selected-manifest link row. This gives operators and auditors lookup paths for request identity, selected action, rejected candidates, and append-only manifest trace refs without turning branch decisions into independent truth.

## Canonical Ordering

`candidate_evaluations[]` use this exact order:

1. `NEW_MANIFEST`
2. `RETURN_EXISTING_BUNDLE`
3. `REUSE_SEALED_MANIFEST`
4. `REPLAY_CHILD`
5. `RECOVERY_CHILD`
6. `CONTINUATION_CHILD`
7. `NEW_REQUEST_CHILD`

Rejected candidate reason codes use the schema enum order. Mirror sources use:

1. `RUN_MANIFEST_TOP_LEVEL`
2. `CONTINUATION_SET`
3. `MANIFEST_BRANCH_DECISION`
4. `FROZEN_EXECUTION_BINDING` when present

## Validation Rules

Factories consume already-decided inputs. They do not implement prior-manifest search or the branch-selection engine planned for later cards.

The validator fails closed when:

- a canonical branch candidate is missing, duplicated, or out of order
- more than one candidate is selected
- a rejected candidate has no typed disqualifier reason
- returned bundle hash appears outside `RETURN_EXISTING_BUNDLE`
- nightly continuation omits predecessor batch, predecessor manifest, or predecessor hash context
- selected-manifest top-level lineage, `continuation_set`, `manifest_branch_decision`, or frozen execution binding mirrors diverge

`request_identity_hash` is represented as the stable digest of the frozen comparison vector. The factory validates it as a required decided input and exposes `deriveManifestRequestIdentityHash(...)` for callers that need the current deterministic placeholder before the full branch engine exists.

## Append-Only Linkage

Persisting a trace appends `manifest-lineage-trace://<lineage_trace_id>` to the selected manifest only if that ref is not already present. Existing refs are preserved in order, and the repository uses the selected manifest row version before and after append as linkage evidence.

`RETURN_EXISTING_BUNDLE` and `REUSE_SEALED_MANIFEST` traces can lawfully select a manifest whose own continuation basis remains `NEW_MANIFEST`; that divergence is the reason `ManifestLineageTrace` exists.
