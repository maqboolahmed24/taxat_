# Defensible Filing Graph Contract

## Purpose

This contract hardens the provenance layer into a filing-grade proof system. It closes the gap
between generic provenance and a legally defensible filing graph by making proof-path closure,
admissibility, contradiction handling, replayability, and explanation output explicit and
machine-verifiable.

No filing-capable output may rely on a graph that is only visually rich. The graph SHALL be able to
prove, deterministically, whether a target is supported, partially supported, contradicted, stale, or
unsupported, and SHALL bind that posture to retained evidence, frozen decision logic, and
authority-relevant basis.

## 1. Filing-proof target model

A filing-proof target is any object whose meaning can influence filing readiness, transmitted content,
authority state, or amendment posture. At minimum the model SHALL support these target classes:

- `FIGURE`
- `TOTAL`
- `FILING_FIELD`
- `DECISION`
- `LEGAL_STATE`

Every filing-proof target SHALL produce exactly one current target assessment per graph version.
Historical target assessments MAY remain reachable through superseded graph versions but SHALL NOT be
reused as current posture after decisive supersession.

## 2. Admissible support path grammar

A support path `p = (v0, e1, v1, ..., en, vn)` for target `τ` is admissible only if all of the
following hold:

1. `v0 = τ` and `vn` is an admissible anchor class.
2. Each decisive edge belongs to the allowed filing-proof grammar:
   - evidence extraction or support
   - fact promotion
   - derivation, aggregation, or adjustment
   - reporting-as or filing-field binding
   - acknowledgement or reconciliation for authority-linked state
3. No decisive edge has `admissibility_state = INADMISSIBLE`.
4. No decisive edge relies solely on inferred support where direct support is required by policy.
5. Every cross-manifest traversal uses an explicit lineage edge.
6. The path remains reconstructible from retained artifacts or lawful tombstones.

Admissible anchor classes SHALL include at minimum:

- `EVIDENCE_ITEM`
- `SOURCE_RECORD`
- `AUTHORITY_RESPONSE`
- `AUDIT_EVENT` for pure legal-state proof where audit is itself the deciding artifact

## 3. Closure formula

For target `τ`, define:

- `support_closed(τ) = 1` iff at least one admissible support path exists;
- `authority_closed(τ) = 1` iff every authority-sensitive target includes an authority-linked decisive segment;
- `contradiction_isolated(τ) = 1` iff every unresolved decisive contradiction is surfaced and excluded from the selected decisive path set;
- `replay_closed(τ) = 1` iff the proof bundle can be reconstructed from retained artifacts, frozen config refs, and deterministic ranking rules.

Then:

`proof_closure(τ) = support_closed(τ) * authority_closed(τ) * contradiction_isolated(τ) * replay_closed(τ)`

`closure_state(τ) = CLOSED` iff `proof_closure(τ) = 1`; otherwise `OPEN`.

Support state SHALL map deterministically:

| support_state | required condition |
| --- | --- |
| `SUPPORTED` | `closure_state = CLOSED`, `admissibility_state = ADMISSIBLE`, and no decisive path segment carries silent limitation ambiguity |
| `PARTIALLY_SUPPORTED` | `closure_state = CLOSED`, `admissibility_state = LIMITED`, and every decisive limitation is explicit |
| `UNSUPPORTED` | no admissible support path exists, or a decisive path depends on silent limitation ambiguity |
| `CONTRADICTED` | unresolved decisive contradiction remains |
| `STALE` | decisive support invalidated by late data, amendment, authority correction, or supersession |

## 4. Primary-path and rejected-path selection

A proof-capable implementation SHALL not keep only the winning path. It SHALL preserve:

- the selected primary path;
- every materially different rejected decisive path;
- the deterministic ranking basis used to choose the primary path; and
- the explicit reason each rejected path lost.

Ranking order SHALL be:

1. admissible and contradiction-free over limited or contradicted paths;
2. paths that satisfy authority-linked prerequisites without inferred decisive support;
3. highest weakest decisive-edge confidence;
4. fewest limitation codes;
5. fewest stale or tombstoned decisive segments;
6. shortest hop count;
7. lexical `path_id` as final tie-break.

## 5. Contradiction isolation

Contradictions SHALL be isolated, not absorbed.

A contradiction becomes decisive when any of the following is true:

- it changes the value or legal meaning of a filing-critical target;
- it invalidates the authority-linked basis for a target;
- it changes whether the target is admissible or replayable.

Decisive contradictions SHALL:

- appear in `ConflictRecord` with target refs;
- appear on the graph via `ED_CONTRADICTS` or equivalent contradiction edges;
- be listed in the controlling target assessment and proof bundle;
- degrade support state to `CONTRADICTED` unless explicitly resolved or superseded.

## 6. ProofBundle contract

`ProofBundle` is the durable filing-proof artifact. It SHALL contain, at minimum:

- target identity and class;
- bundle purpose;
- lifecycle, support, admissibility, and closure state;
- primary decisive path;
- rejected materially distinct paths;
- decisive evidence refs;
- authority and config basis refs;
- contradiction refs;
- replay recipe;
- render refs;
- limitation notes;
- retention-limited explainability contract;
- retention binding;
- deterministic `bundle_hash`;
- supersession linkage.

A proof bundle SHALL remain queryable after supersession for historical replay, but only the current
non-superseded bundle may control filing readiness or submission posture.
For every non-`UNSUPPORTED` bundle posture, the contract SHALL retain one current decisive-path set:
`primary_path_ref` SHALL be non-null, `decisive_path_refs[]` SHALL be non-empty, and
both top-level `manifest_refs[]` and `replay_recipe.manifest_refs[]` SHALL begin with the owning
`manifest_id` so reconstruction lineage is never implied by caller context alone.
`lineage_boundary_refs[]` and `replay_recipe.lineage_boundary_refs[]` SHALL mirror the same explicit
cross-manifest hops, and `decisive_lineage_boundary_refs[]` SHALL call out the decisive subset so a
current proof path and a superseded predecessor never flatten into one apparent single-manifest
chain. `replay_recipe.required_artifact_refs[]` SHALL additionally retain the controlling `graph_ref`
and current `primary_path_ref` whenever a primary path exists so replayable proof reconstruction
stays anchored to the persisted graph topology, not to a caller's ambient query defaults.
If retention limits decisive proof, the bundle SHALL preserve explicit `limitation_notes[]` tied to
the affected decisive refs and SHALL degrade `explanation_status` away from `AVAILABLE`.

## 7. EvidenceGraph integrity summary

`EvidenceGraph.integrity_summary` SHALL quantify at least:

- unsupported critical target count;
- contradicted critical target count;
- stale critical target count;
- open critical target count;
- replay failure target count;
- missing proof-bundle target count;
- explanation failure count;
- whether rebuild is required.

This summary exists so gating does not have to infer graph health from one aggregate score.

Target assessments therefore SHALL preserve both `replayable` and `explanation_status` so
`replay_failure_target_count` and `explanation_failure_count` remain derivable from the persisted
graph instead of from transient renderer state.
The graph root SHALL additionally mirror target-level proof posture faithfully:
`proof_bundle_refs[]` SHALL be the non-null set of `target_assessments[].proof_bundle_ref`, and the
root `primary_path_ref` SHALL resolve to one current assessed target path rather than an
out-of-band query default. `manifest_refs[]` on both `EvidenceGraph` and `EnquiryPack` SHALL
include the owning `manifest_id` so cross-manifest lineage is always additive rather than replacing
the root manifest anchor. `partition_contract` SHALL be shared across `EvidenceGraph`,
`ProofBundle`, and `EnquiryPack`, and every lineage boundary SHALL preserve `boundary_edge_ref`
plus exact tenant/client/scope metadata so cross-manifest proof cannot widen isolation.
Critical retention-limited or erased posture SHALL remain typed through `limitation_notes[]` and a
degraded target `explanation_status`; decisive proof SHALL not appear whole after those counts go
non-zero.

## 8. Rebuild and staleness rules

The graph SHALL invalidate target posture deterministically.

A decisive late-data event, amendment decision, authority correction, or supersession affecting a
critical target SHALL immediately:

1. mark the affected target assessment as `STALE`;
2. mark the controlling proof bundle as `STALE` or `SUPERSEDED` as appropriate; and
3. mark the graph `STALE` or `REBUILD_REQUIRED` when any current filing-critical target remains stale.

No live filing progression may continue from stale decisive posture unless policy explicitly routes to
manual review and blocks automated submission.

## 9. Explanation surfaces

The same proof basis SHALL support three deterministic explanation surfaces:

- operator explanation: short, action-oriented posture summary;
- reviewer explanation: full decisive path, rejected alternatives, contradictions, and limitations;
- filing-artifact explanation: exact binding between a filing field or submission meaning and its
  evidence or authority basis.

Explanation rendering failure SHALL be explicit. The system SHALL preserve whether explanation is
`AVAILABLE`, `LIMITED`, or `FAILED` and SHALL never present a silently partial explanation as whole.

## 10. Replay-safe reconstruction procedure

An implementation SHALL expose a reconstruction procedure equivalent to:

```text
RECONSTRUCT_PROOF_BUNDLE(bundle_ref):
  load bundle, graph, and manifest lineage
  verify bundle_hash over normalized bundle body
  load primary_path and rejected_path set in recorded deterministic order
  verify decisive edges and anchor refs still resolve or tombstone lawfully
  verify replay_recipe.required_artifact_refs are present
  if any required artifact is missing, emit replay failure with explicit reason code
  else render stable machine-readable and human-readable outputs
```

## 11. Code-shape requirements

A production implementation SHOULD isolate the following components:

- `GraphBuilder.build_target_assessments(graph, critical_targets, conflicts)`
- `PathSelector.select_primary_path(target_ref, candidate_paths, ranking_profile)`
- `ProofBundleBuilder.build_bundle(target_assessment, paths, evidence_index, authority_index)`
- `ProofValidator.validate_bundle(bundle, graph, retention_state)`
- `ProofReconstructor.reconstruct(bundle_ref)`
- `ExplanationRenderer.render(bundle, audience)`

The validator SHALL be callable independently from rendering so audit, filing, and regulator export
flows can fail closed before user-facing explanation generation.
