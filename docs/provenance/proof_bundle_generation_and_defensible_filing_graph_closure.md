# Proof Bundle Generation And Defensible Filing Graph Closure

`pc_0129` adds the backend-owned proof bundle layer on top of the provenance graph foundation from `pc_0128`.

## Target Assessment Contract

`buildTargetAssessment` binds one filing-capable target to:

- candidate persisted `ProvenancePathRecord` inputs for that target
- authority closure inputs and authority basis refs
- contradiction refs, stale reason codes, staleness dependencies, and temporal propagation refs
- limitation notes, retention binding, and render posture

The output freezes support state, admissibility state, closure state, primary path, rejected paths, closure factors, and controlling posture. Silent limitation ambiguity is converted into explicit unsupported/open posture with limitation notes; it is never persisted as `silent_limitation_ambiguity_present = true`.

## Primary Path Ranking

`selectPrimaryProofPath` ranks candidates with the exact deterministic ladder:

1. admissible and contradiction-free first
2. authority-linked prerequisite satisfaction without inferred decisive support
3. highest weakest decisive-edge confidence
4. fewest limitation codes
5. fewest stale or tombstoned decisive segments
6. shortest hop count
7. lexical `path_id`

Material duplicate paths are deduplicated by target, manifest spine, node refs, edge refs, decisive edges, anchor, and lineage boundary refs. Rejected materially distinct paths are persisted in rank order with contiguous `path_rank` values starting at 2.

## Closure Formula

`buildDefensibleProofClosureContract` computes closure from:

```text
support_closed
AND authority_closed
AND contradiction_isolated
AND replay_closed
AND NOT silent_limitation_ambiguity_present
AND current_decisive_anchor_present
AND NOT staleness_invalidated
```

When the formula is true, `closure_state = CLOSED`. Otherwise the bundle remains `OPEN` and records typed failure reason codes.

## Replay Recipe

`ProofBundle.replay_recipe` stores only bounded references:

- graph ref
- decisive and rejected path refs
- staleness and temporal invalidation refs
- deterministic order basis, including `PROOF_PATH_SELECTION_V1`
- manifest refs and lineage boundary refs

`reconstructProofBundleForReplay` verifies the hash, path order, graph binding, and required artifact availability without mutating the live graph or reading providers.

## Historical Versus Controlling

`isControllingProofBundle` returns true only for `GENERATED` or `LIMITED` bundles that are `SUPPORTED` or `PARTIALLY_SUPPORTED` and `CLOSED`.

`STALE` bundles keep their primary path and replay recipe for historical query, but remain open and non-controlling. `SUPERSEDED` bundles retain their historical hash and replacement ref without masquerading as current proof.
