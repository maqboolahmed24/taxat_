# Manifest Reuse, Recovery, Replay, and Supersession Decision Service

The manifest decision service is the authoritative request-to-decision boundary for manifest reuse and child allocation preparation. Callers use `decideManifestOrchestration` directly or the `ManifestReuseRecoveryReplaySupersessionService` wrapper when repository-backed prior-manifest loading is needed.

The service composes existing lower-level modules:

- `loadAndValidatePriorManifestContext` loads a direct or repository-backed prior manifest and computes the request identity once.
- `decideManifestReuseStrategy` applies canonical branch precedence and returns the exhaustive candidate evaluation set.
- `buildManifestDecisionBranchDecisionContract` validates and clones the selected branch contract.
- `guardReplayOrRecoveryPath` makes replay and recovery-only constraints explicit, including active-lease recovery blocking.
- `guardSupersessionDecision` prepares append-only supersession metadata for `NEW_REQUEST_CHILD`.
- `buildManifestDecisionLineageTrace` assembles lineage trace input for decisions that already have a selected manifest snapshot.

## Branch Precedence

The orchestrator preserves the lower-level branch precedence:

1. `NEW_MANIFEST` when no prior manifest exists.
2. Blocked decision when the prior context is invalid.
3. Blocked recovery when an active lease prevents reclaim.
4. `RETURN_EXISTING_BUNDLE` for exact terminal idempotent retries with a recorded decision bundle.
5. `REUSE_SEALED_MANIFEST` for exact same-request sealed pre-start reuse.
6. `REPLAY_CHILD` for replay requests over terminal or replayable historical basis.
7. `RECOVERY_CHILD` for stale reclaimable started attempts.
8. `CONTINUATION_CHILD` for explicit post-terminal continuation or nightly-window advancement.
9. `NEW_REQUEST_CHILD` for compatible request identity drift that must supersede the prior run append-only.

Exact same-request terminal manifests without `decision_bundle_hash` fail closed. The service does not fabricate a returnable bundle.

## Output Boundary

The decision result is side-effect aware but side-effect free. It returns:

- selected action, typed reason code, and request identity hash;
- schema-backed branch decision contract when a branch is selected;
- exhaustive candidate evaluations over the canonical branch action vocabulary;
- selected manifest snapshot for `RETURN_EXISTING_BUNDLE` and `REUSE_SEALED_MANIFEST`;
- child allocation preparation for manifest-producing branches;
- replay/recovery and supersession guard results;
- `lineage_trace_ready` only when the selected manifest already exists.

Actual child manifest allocation, collection, execution, terminal mutation, superseding lifecycle transition, and trace persistence remain delegated to later services. Supersession preparation is append-only: the decision result may carry `supersedes_manifest_id_or_null`, but it never rewrites the prior manifest truth.

## Trace Assembly

For return and sealed-reuse branches, `buildManifestDecisionLineageTrace` can build a trace immediately because the selected manifest snapshot is known. For manifest-producing child branches, callers must allocate the child manifest first and then provide it to the trace builder so selected-manifest lineage mirrors remain exact.

Nightly-window advancement remains distinct from generic request drift: it selects `CONTINUATION_CHILD` with reason `NIGHTLY_WINDOW_ADVANCED`, while compatible non-nightly drift selects `NEW_REQUEST_CHILD` and prepares supersession.
