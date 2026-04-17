# Provenance Graph Semantics

## Provenance graph semantics

The engine SHALL maintain a manifest-scoped provenance graph for every materially significant run. The
graph is the formal structure that explains how raw source material, evidence, canonical facts,
derived values, decisions, submissions, overrides, and later drift/amendment conclusions relate to one
another.

The provenance graph is a directed, labelled multigraph with domain-specific node and edge types. It
is conceptually aligned to the PROV model of entities, activities, and agents, but specialized for
the regulated-reporting engine described in this corpus. [1]

## 11.1 Purpose

The provenance graph SHALL allow the engine to answer all of the following deterministically:

1. Which evidence and facts contributed to this output?
2. Which transformations, rules, and configs were applied?
3. Which human or service actors influenced the result?
4. Which authority interactions changed legal state?
5. Which overrides or limitations affected interpretation?
6. Which historical baseline was used for parity, filing, or amendment comparison?

No filing-capable or trust-capable artifact SHALL exist without a graph address and graph lineage
path.

## 11.2 Graph model

The graph SHALL be a logical model, not a storage prescription. It may be materialized in:

- a graph database,
- relational adjacency tables,
- append-only provenance events projected into graph form,
- or a hybrid model.

Regardless of storage, the graph SHALL expose stable node identifiers, stable edge identifiers,
replay-safe timestamps, and deterministic traversal semantics.

The machine-readable contracts for this layer SHALL validate against dedicated schemas in `schemas/`
for `ProvenanceNode`, `ProvenanceEdge`, `ProvenancePath`, `EvidenceGraph`, and `EnquiryPack` so the
graph topology, critical-path ranking, and exported explanation bundles remain consistent across
stores, query surfaces, and investigation clients.

## 11.3 Top-level provenance classes

The graph SHALL distinguish three top-level classes.

### A. Entity nodes

Entity nodes represent durable facts or artifacts.

Minimum entity node families:

- `EN_SOURCE_RECORD`
- `EN_EVIDENCE_ITEM`
- `EN_CANDIDATE_FACT`
- `EN_CANONICAL_FACT`
- `EN_DERIVED_VALUE`
- `EN_SNAPSHOT`
- `EN_CONFIG_FREEZE`
- `EN_RUN_MANIFEST`
- `EN_COMPUTE_RESULT`
- `EN_PARITY_RESULT`
- `EN_GATE_DECISION`
- `EN_TRUST_SUMMARY`
- `EN_EVIDENCE_GRAPH`
- `EN_TWIN_VIEW`
- `EN_WORKFLOW_ITEM`
- `EN_FILING_PACKET`
- `EN_FILING_FIELD`
- `EN_SUBMISSION_RECORD`
- `EN_PROOF_BUNDLE`
- `EN_DRIFT_RECORD`
- `EN_ERROR_RECORD`
- `EN_COMPENSATION_RECORD`
- `EN_AUDIT_EVENT`
- `EN_OVERRIDE`
- `EN_RETENTION_ACTION`
- `EN_AUTHORITY_RESPONSE`

### B. Activity nodes

Activity nodes represent things the engine or an actor did.

Minimum activity node families:

- `AC_COLLECT_SOURCE_DATA`
- `AC_NORMALIZE`
- `AC_VALIDATE`
- `AC_PROMOTE_FACT`
- `AC_AGGREGATE`
- `AC_ADJUST`
- `AC_COMPUTE`
- `AC_COMPARE_PARITY`
- `AC_EVALUATE_GATE`
- `AC_SYNTHESIZE_TRUST`
- `AC_BUILD_GRAPH`
- `AC_VALIDATE_GRAPH`
- `AC_RECONSTRUCT_PROOF`
- `AC_RENDER_EXPLANATION`
- `AC_BUILD_TWIN`
- `AC_RESOLVE_CONTINUATION`
- `AC_PREPARE_FILING`
- `AC_SUBMIT_TO_AUTHORITY`
- `AC_RECONCILE_AUTHORITY_STATE`
- `AC_DETECT_DRIFT`
- `AC_EVALUATE_AMENDMENT`
- `AC_RECORD_AUDIT_EVENT`
- `AC_HANDLE_ERROR`
- `AC_APPLY_COMPENSATION`
- `AC_APPLY_OVERRIDE`
- `AC_APPLY_RETENTION`
- `AC_EXECUTE_ERASURE`

### C. Agent nodes

Agent nodes represent who or what acted.

Minimum agent node families:

- `AG_HUMAN_PRINCIPAL`
- `AG_SERVICE_PRINCIPAL`
- `AG_TENANT`
- `AG_REPORTING_SUBJECT`
- `AG_AUTHORITY_SYSTEM`
- `AG_EXTERNAL_PROVIDER`

## 11.4 Edge semantics

The graph SHALL support both generic provenance edges and engine-specific semantic edges.

### A. Generic provenance edges

These are the PROV-like backbone.

- `ED_USED`
- `ED_GENERATED`
- `ED_DERIVED_FROM`
- `ED_ATTRIBUTED_TO`
- `ED_ASSOCIATED_WITH`
- `ED_ACTED_ON_BEHALF_OF`

### B. Engine-specific semantic edges

These express regulated-reporting meaning.

- `ED_SUPPORTS`
- `ED_EXTRACTED_FROM`
- `ED_PROMOTED_FROM`
- `ED_AGGREGATES`
- `ED_ADJUSTS`
- `ED_COMPARED_AGAINST`
- `ED_GATED_BY`
- `ED_OVERRIDDEN_BY`
- `ED_ACKNOWLEDGED_BY`
- `ED_RECONCILED_WITH`
- `ED_AUDITED_BY`
- `ED_CAUSED_BY_ERROR`
- `ED_COMPENSATED_BY`
- `ED_CONTINUES`
- `ED_REPLAYS`
- `ED_RECOVERS`
- `ED_SUPERSEDES`
- `ED_BASELINES`
- `ED_LIMITED_BY_RETENTION`
- `ED_ERASED_UNDER`
- `ED_TRIGGERED_WORKFLOW`
- `ED_DEPENDS_ON_CONFIG`
- `ED_REPORTS_AS`
- `ED_CONTRADICTS`

### Edge rule

No edge may exist without:

- `edge_id`
- `from_node_id`
- `to_node_id`
- `edge_type`
- `manifest_id`
- `created_at`
- `originating_activity_ref`

## 11.5 Graph identity and partitioning

Every node and edge SHALL be partitioned by:

- `tenant_id`
- `client_id` where applicable
- `business_partition` where applicable
- `period_scope`
- `manifest_id`

The graph SHALL preserve cross-manifest lineage by explicit supersession and continuation edges, but
traversal results MUST respect tenant and client isolation.
Every durable provenance artifact derived from the graph SHALL therefore retain one shared
`partition_contract{ tenant_id, client_id, partition_scope_refs[], period_scope_ref_or_null,
cross_manifest_traversal_policy, scope_widening_policy }` so replay, enquiry, and proof review do
not widen scope from ambient caller context.

### Cross-manifest lineage rule

`manifest_id` remains the home manifest of the stored node or edge record. When an edge crosses a
manifest boundary, it SHALL additionally carry `from_manifest_id`, `to_manifest_id`, and a lineage
relation constrained to `ED_CONTINUES`, `ED_REPLAYS`, `ED_RECOVERS`, or `ED_SUPERSEDES`.
Query-level `lineage_boundaries[]` SHALL point at the exact `boundary_edge_ref`, repeat the same
tenant/client/scope partition contract, and distinguish all exposed vs decisive path hops so
cross-manifest proof never degrades into adjacency traversal.

Traversal may cross manifest boundaries only through these explicit lineage edges. Query results
SHALL surface each lineage hop so replay, recovery, amendment, and supersession never appear as one
flat single-manifest proof chain.

## 11.6 Construction rules

### Rule A - Raw-source entry rule

Every retained `SourceRecord` SHALL enter the graph as `EN_SOURCE_RECORD`.

### Rule B - Evidence attachment rule

Every retained `EvidenceItem` SHALL link to its originating source record via `ED_EXTRACTED_FROM` or
`ED_SUPPORTS`.

### Rule C - Candidate promotion rule

Every `CandidateFact` promoted to `CanonicalFact` SHALL preserve the exact promotion activity through:

- `EN_CANDIDATE_FACT --ED_PROMOTED_FROM--> EN_CANONICAL_FACT`
- and the promotion activity node SHALL link the contributing evidence and validation context.

### Rule D - Derivation rule

Every `DerivedValue` used in compute, parity, trust, or filing SHALL have a derivation path back to
canonical facts through `ED_AGGREGATES`, `ED_ADJUSTS`, or `ED_DERIVED_FROM`.

### Rule E - Decision rule

Every `ParityResult`, `TrustSummary`, gate decision, filing packet, submission record, and
drift/amendment decision SHALL have:

- at least one inbound edge from its supporting activity node,
- and at least one traversable path back to either canonical facts or authority responses.

### Rule E1 - Gate and audit anchoring rule

Every `GateDecisionRecord` SHALL enter the graph as `EN_GATE_DECISION`, SHALL be generated by
`AC_EVALUATE_GATE`, and SHALL preserve links to the evidence, rules, and upstream artifacts that
caused the gate outcome.

Every compliance-significant decision, filing packet, submission record, override, retention action,
and legal-state transition SHALL have at least one `ED_AUDITED_BY` edge to an `EN_AUDIT_EVENT` node
so provenance and audit proof remain traversable in one graph.

### Rule E2 - Failure and remediation rule

Every `ErrorRecord` SHALL enter the graph as `EN_ERROR_RECORD` and SHALL link to the affected object
through `ED_CAUSED_BY_ERROR`.

Every `CompensationRecord` or remediation outcome that changes system posture SHALL enter the graph as
`EN_COMPENSATION_RECORD` and SHALL link to the corrected or neutralized object through
`ED_COMPENSATED_BY`.

### Rule F - Config rule

Every compliance-significant activity node SHALL link to the relevant frozen config entity through
`ED_DEPENDS_ON_CONFIG`.

### Rule G - Actor rule

Every activity node SHALL link to at least one agent node through `ED_ASSOCIATED_WITH` or
`ED_ATTRIBUTED_TO`.

### Rule H - Filing-field continuity rule

Every filing-capable field, line, box, obligation-scope total, or transmitted payload value SHALL
have a continuous proof chain:

- `EN_EVIDENCE_ITEM` or `EN_AUTHORITY_RESPONSE`
- to `EN_CANONICAL_FACT`
- to `EN_DERIVED_VALUE` or reportable total
- to `EN_FILING_FIELD` or `EN_FILING_PACKET`
- to `EN_SUBMISSION_RECORD` where legal-state or transmit posture is claimed.

Where the target is a legal-state claim rather than a numeric value, the final decisive segment SHALL
also traverse an authority-linked path such as `ED_ACKNOWLEDGED_BY`, `ED_RECONCILED_WITH`, or
`ED_REPORTS_AS` to an authority-grounded anchor.

### Rule I - Admissible support-path rule

For a filing-capable target `τ`, an admissible support path `p` is a directed path from `τ` to an
admissible anchor such that:

1. every decisive edge in `p` has `admissibility_state != INADMISSIBLE`;
2. every decisive edge in `p` is retention-visible, even if limited or tombstoned;
3. any `support_type = INFERRED` segment is non-decisive for legal-state creation and non-substituting
   for required direct evidence;
4. any cross-manifest hop is explicit through a permitted lineage edge; and
5. the path terminates in `EN_EVIDENCE_ITEM`, `EN_SOURCE_RECORD`, `EN_AUTHORITY_RESPONSE`, or another
   contractually permitted anchor class.

A path that is merely traversable but violates any rule above SHALL remain queryable yet SHALL NOT be
counted as admissible filing proof.

### Rule J - Target assessment and proof-bundle rule

Every filing-capable target SHALL have a target-level support assessment carrying at minimum:

- `target_ref`
- `target_class`
- `filing_critical`
- `support_state ∈ {SUPPORTED, PARTIALLY_SUPPORTED, UNSUPPORTED, CONTRADICTED, STALE}`
- `admissibility_state ∈ {ADMISSIBLE, LIMITED, INADMISSIBLE}`
- `closure_state ∈ {CLOSED, OPEN}`
- `proof_closure_contract{closure_profile_code = PROOF_CLOSURE_V1, path_ranking_profile_code = PROOF_PATH_SELECTION_V1, ...}`
- `primary_path_ref`
- `proof_bundle_ref`
- `rejected_path_refs[]`
- `replayable`
- `explanation_status ∈ {AVAILABLE, LIMITED, FAILED}`
- `contradiction_refs[]`
- `stale_reason_codes[]`
- `closure_failure_reason_codes[]`

Every filing-capable target with `support_state in {SUPPORTED, PARTIALLY_SUPPORTED, STALE, CONTRADICTED}`
SHALL also produce a durable `ProofBundle` that captures the selected decisive path, rejected
competing paths, contradiction refs, replay recipe, and render refs.

## 11.7 Graph validity constraints

The graph SHALL satisfy these validity rules.

### A. No orphan decision rule

No decision-class node may exist without:

- one generating activity,
- one responsible agent or service,
- and at least one evidence or upstream artifact path.

### B. No silent derivation rule

No numeric field used in filing, trust, or amendment classification may appear as an entity node
unless its derivation path is representable.

### C. No legal-state fabrication rule

`EN_SUBMISSION_RECORD` may only enter a legal state through an authority-linked activity or authority
response path.

### D. No hidden override rule

If an override changes interpretation or gate progression, the affected downstream node SHALL have an
`ED_OVERRIDDEN_BY` path.

### E. No impossible chronology rule

A generated node cannot precede its generating activity, and a generating activity cannot precede the
entities it used in a way that violates causal order.

### F. No cross-partition contamination rule

A canonical fact or derived value from one business partition SHALL not support a reportable total in
another partition without an explicit reallocation activity.

These validity expectations are intentionally in line with the spirit of PROV constraints, which are
designed to make provenance instances represent a consistent history that is safe for reasoning and
analysis. [2]

## 11.8 Critical-path semantics

The graph SHALL distinguish ordinary provenance from critical provenance.

A critical path is the minimum path set necessary to explain any one of:

- a filing-critical figure,
- a parity-critical difference,
- a trust-blocking reason,
- an amendment-triggering delta,
- a legal-state change.

Every filing-capable run SHALL be able to produce:

- at least one critical path per filing-critical figure,
- at least one critical path for any blocking parity result,
- and at least one critical path for any amendment-required conclusion.

## 11.9 Path classes

The graph SHALL support at least these path classes.

- `PATH_DERIVATION`
- `PATH_FILING_PROOF`
- `PATH_EVIDENCE_SUPPORT`
- `PATH_AUDIT_PROOF`
- `PATH_AUTHORITY_STATE`
- `PATH_PARITY_EXPLANATION`
- `PATH_TRUST_EXPLANATION`
- `PATH_DRIFT_BASELINE`
- `PATH_AMENDMENT_JUSTIFICATION`
- `PATH_REMEDIATION_CHAIN`
- `PATH_CONTINUATION_LINEAGE`
- `PATH_RETENTION_LIMITATION`

A single node may appear in more than one path class.

## 11.10 Confidence and support semantics

Each edge used for explanation SHALL carry support metadata where relevant:

- `support_type in {DIRECT, EXTRACTED, DECLARED, INFERRED, AUTHORITY_CONFIRMED, GOVERNANCE_ONLY}`
- `support_confidence in [0,1]`
- `support_strength_tier`
- `limitation_codes[]`

### Confidence propagation rule

A path's effective confidence SHALL be derived from its weakest decisive support segment, not from the
strongest segment.

### Path-shape integrity rule

Every persisted `ProvenancePath` SHALL preserve one deterministic traversal shape:

- `node_refs[]` SHALL list each traversed node exactly once in path order
- `edge_refs[]` SHALL list each traversed edge exactly once in path order
- `hop_count = |edge_refs[]|`
- `|node_refs[]| = hop_count + 1`
- `anchor_ref` SHALL name one of the listed `node_refs[]`
- every `decisive_edge_refs[]` member SHALL also appear in `edge_refs[]`

These rules close the replay gap where a path could validate structurally yet still describe an
impossible or ambiguous traversal.

### Inference limitation rule

An inferred segment may help explain classification or linkage, but it SHALL not, by itself, create
legal submission state or replace required direct support for a filing-critical conclusion.

### Primary path selection rule

When more than one candidate critical path satisfies the query target, implementations SHALL rank
paths deterministically in the following order:

1. paths that satisfy all legal-state prerequisites without inferred decisive segments
2. paths with the highest weakest-segment `support_confidence`
3. paths with the fewest unresolved `limitation_codes[]`
4. paths with the fewest retention-limited or tombstoned decisive segments
5. paths with the shortest hop count
6. lexical `path_id` order as the stable final tie-break

Storage order, traversal nondeterminism, or incidental parallelism SHALL NOT decide which path is
returned as primary.

## 11.11 Query contract

The graph SHALL expose, at minimum, these engine-level query contracts.

### `get_provenance(object_type, object_id, options)`

Returns the full provenance graph projection for the object, including any explicit lineage-boundary
hops needed to explain cross-manifest continuation.

### `get_defence_path(target_ref, options)`

Returns the primary and optional alternative critical paths for a filing-critical or parity-critical
target.

### `get_authority_state_path(submission_record_id)`

Returns the chain from filing packet and authority interaction through reconciliation into current
legal state.

### `get_drift_path(drift_id)`

Returns the baseline, comparison manifest, changed facts, and materiality activities used to classify
drift.

### `get_retention_limitation_path(object_id)`

Returns all retention or erasure events that limit present-day interpretability.

## 11.12 Output shape

Every graph query SHALL return:

- `root_ref`
- `graph_version`
- `manifest_refs[]`
- `partition_contract`
- `nodes[]`
- `edges[]`
- `critical_paths[]`
- `primary_path_ref`
- `path_ranking_basis[]`
- `lineage_boundaries[]`
- `limitation_notes[]`
- `confidence_summary`
- `supersession_summary`

The query response MAY include a reduced projection for UI use, but the full logical content SHALL
remain reproducible.

The durable artifact that preserves this query-level output shape SHALL be `EvidenceGraph`,
including the selected `primary_path_ref`, `path_ranking_basis[]`, `lineage_boundaries[]`, and
`limitation_notes[]` that make the graph replay-safe and scrutiny-safe outside transient query
execution. `manifest_refs[]` SHALL begin with the owning `manifest_id`, and every additional
manifest ref SHALL be justified by at least one serialized lineage boundary.

## 11.13 Enquiry-pack semantics

The graph SHALL support deterministic enquiry-pack generation.

An enquiry pack SHALL contain, at minimum:

- target figure or decision
- primary critical derivation path
- alternative critical paths when a materially different explanation exists
- supporting evidence list
- transformation steps
- config/version refs
- override refs
- authority refs
- retention/limitation notes
- audit refs

The pack SHALL be renderable in both human-readable and machine-readable form.

The durable artifact that preserves this export contract SHALL be `EnquiryPack`, which MUST also
declare masking, omission, and lineage-boundary posture explicitly so no reviewer receives a package
that appears complete while silently excluding material proof. `EnquiryPack.primary_path_ref` SHALL
always appear inside `critical_path_refs[]`, every exposed lineage boundary SHALL point only at
serialized critical paths in the pack, every decisive cross-manifest hop SHALL appear in
`decisive_in_path_refs[]`, and `explanation_status` SHALL stay render-aligned:
`AVAILABLE` means all render refs are present, `FAILED` means none are, and `LIMITED` means the pack
retains at least one surviving render surface.

## 11.14 Retention interaction

The graph SHALL never be "broken" by retention. When upstream evidence expires or is erased:

- the node may become a tombstone or placeholder,
- the edge may be retained with a limitation marker,
- the path SHALL continue to resolve structurally,
- but the path SHALL declare that direct evidence is no longer available.

This matches the design requirement already visible in the pack that downstream artifacts remain
explainable even when upstream evidence is no longer fully present. A limited, expired, masked, or
erased decisive segment with no typed limitation or tombstone semantics is not a valid limited path;
it is a structural integrity defect that SHALL surface as silent limitation ambiguity.

## 11.14A Proof-path closure semantics

Define, for a filing-capable target `τ`:

- `support_closed(τ) = 1` iff there exists at least one admissible support path from `τ` to an
  admissible anchor;
- `authority_closed(τ) = 1` iff every target class that asserts legal state or authority-relevant
  filing meaning includes an authority-linked decisive segment;
- `contradiction_isolated(τ) = 1` iff no unresolved decisive contradiction remains inside the chosen
  decisive path set;
- `replay_closed(τ) = 1` iff the selected proof bundle can be reconstructed from retained artifacts,
  deterministic ranking rules, and frozen config refs without live connector access.

Then:

- `proof_closure(τ) = support_closed(τ) * authority_closed(τ) * contradiction_isolated(τ) * replay_closed(τ)`
- `closure_state(τ) = CLOSED` iff `proof_closure(τ) = 1`; otherwise `OPEN`

Support-state mapping SHALL be deterministic:

- `SUPPORTED` iff `closure_state = CLOSED`, `admissibility_state = ADMISSIBLE`, and no decisive path segment carries silent limitation ambiguity
- `PARTIALLY_SUPPORTED` iff `closure_state = CLOSED`, `admissibility_state = LIMITED`, and every decisive limitation is explicit
- `UNSUPPORTED` iff `support_closed = 0` or a decisive path depends on silent limitation ambiguity
- `CONTRADICTED` iff an unresolved decisive contradiction remains
- `STALE` iff a decisive segment has been invalidated by late data, amendment, drift, or authority correction

## 11.14B Contradiction and supersession semantics

Conflicting evidence, superseded facts, and authority divergence SHALL remain first-class graph facts.

- `ED_CONTRADICTS` SHALL identify contradiction topology directly in the graph;
- `ConflictRecord` SHALL identify affected decisive targets and whether the contradiction is merely
  informational, filing-blocking, or authority-divergent;
- a superseded fact MAY remain reachable for historical replay but SHALL NOT remain part of a current
  decisive filing path unless the proof bundle purpose is historical reconstruction.

Where two admissible paths reach the same target but imply materially different filing meaning, the
engine SHALL record one selected primary path and preserve the other as an explicit rejected path in
`ProofBundle.rejected_path_refs[]` and `ProofBundle.rejected_path_entries[]` with the rejection
basis, deterministic `path_rank`, and rejection class. The replay recipe SHALL also persist
`path_ref_order[] = [primary_path_ref] + rejected_path_refs[]`.

## 11.14C Graph integrity invariants

In addition to the earlier validity constraints, every production-grade filing graph SHALL satisfy all
of the following:

1. every filing-critical target has exactly one current target assessment per graph version;
2. every `primary_path_ref` on a filing-critical target resolves to a path whose `target_ref` matches
   the target assessment;
3. every filing-critical target with `support_state != UNSUPPORTED` has a `proof_bundle_ref`;
3a. `EvidenceGraph.proof_bundle_refs[]` SHALL equal the non-null set of current
    `target_assessments[].proof_bundle_ref`, not an independently curated summary list;
3b. `EvidenceGraph.primary_path_ref` SHALL resolve to one current
    `target_assessments[].primary_path_ref` so the graph root never points outside current target
    posture;
4. every proof bundle hash is deterministic over the bundle body and decisive path ordering;
5. every current filing-critical target with unresolved decisive contradiction forces graph lifecycle
   state at least `LIMITED`, and may force `REBUILD_REQUIRED` by policy;
6. explanation-render failure SHALL be surfaced in `integrity_summary` rather than silently omitted.
7. no target or bundle may claim `closure_state = CLOSED` unless the persisted proof-closure
   contract proves support closure, authority closure, contradiction isolation, replay closure, and
   current decisive-anchor presence simultaneously.

## 11.14D Replay-safe proof reconstruction

The graph layer SHALL expose a deterministic reconstruction procedure for each proof bundle:

`RECONSTRUCT_PROOF_BUNDLE(bundle_ref)`

Minimum steps:

1. load the recorded `ProofBundle`, referenced graph version, and manifest refs;
2. verify `bundle_hash` over the normalized bundle body;
3. load `primary_path_ref` and any `rejected_path_refs[]` in recorded lexical order;
4. verify that `replay_recipe.path_ref_order[]` still matches the persisted primary-plus-rejected
   ordering under `PROOF_PATH_SELECTION_V1`;
5. verify every `decisive_edge_ref` still resolves to the same edge body or an allowed tombstone;
6. verify every required config, authority, evidence, decisive-path, and rejected-path ref in
   `replay_recipe.required_artifact_refs[]` exists;
7. emit either a byte-stable reconstructed proof or a deterministic replay failure reason code.

Replay failure SHALL degrade the bundle or graph posture; it SHALL NOT be hidden behind a best-effort
render.

## 11.14E Explainability output contract

Every filing-capable target SHALL be explainable to at least three audiences from the same proof
basis:

- operator view: concise root cause, support state, and next action;
- reviewer view: full decisive path, rejected alternatives, contradiction refs, and retention notes;
- filing artifact view: the exact proof basis bound to the filing field, packet, or submission.

`EnquiryPack` and rendered explanation surfaces SHALL preserve whether the explanation is
`AVAILABLE`, `LIMITED`, or `FAILED`. A failed explanation render SHALL not erase the underlying proof
bundle; it SHALL instead produce an explicit limitation or error condition. The shared
`retention_limited_explainability_contract` SHALL bind `ProofBundle`, `EvidenceGraph`, and
`EnquiryPack` to the same rule: decisive retention loss stays present as typed limitation posture,
never as silent negative absence.

## 11.14F Recalculation under amendment, late data, and drift

Late data, amendment decisions, authority corrections, or any supersession touching a decisive node or
edge SHALL trigger target-scoped invalidation.

- if the affected segment is non-decisive, the graph MAY remain `BUILT` with refreshed limitation notes;
- if the affected segment is decisive for a filing-critical target, the target assessment SHALL move to
  `STALE` immediately;
- if one or more stale decisive targets remains filing-critical, the graph SHALL move to `STALE` or
  `REBUILD_REQUIRED` until recomputation completes;
- superseded proof bundles SHALL remain queryable for historical replay but SHALL NOT remain the
  controlling bundle for current filing posture.
- stale target assessments and stale proof bundles SHALL retain explicit `staleness_dependency_refs[]`
  so replay and forensic review consume the historical late-data artifact lineage that caused the
  invalidation, rather than refreshing the posture from live scans.

## 11.15 One-sentence summary

The provenance graph semantics make the engine explainable by requiring every important output to
exist inside a valid, partitioned, causally ordered graph of entities, activities, and agents, with
explicit derivation, authority, override, and retention semantics.

[1]: https://www.w3.org/TR/prov-overview/
[2]: https://www.w3.org/TR/prov-constraints/
