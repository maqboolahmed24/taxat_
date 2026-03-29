# Provenance Graph Semantics

## Provenance graph semantics

The engine SHALL maintain a manifest-scoped provenance graph for every materially significant run. The
graph is the formal structure that explains how raw source material, evidence, canonical facts,
derived values, decisions, submissions, overrides, and later drift/amendment conclusions relate to one
another.

The provenance graph is a directed, labelled multigraph with domain-specific node and edge types. It
is conceptually aligned to the PROV model of entities, activities, and agents, but specialized for
the regulated-reporting engine described in the current pack. [1]

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
- `EN_TRUST_SUMMARY`
- `EN_EVIDENCE_GRAPH`
- `EN_TWIN_VIEW`
- `EN_WORKFLOW_ITEM`
- `EN_FILING_PACKET`
- `EN_SUBMISSION_RECORD`
- `EN_DRIFT_RECORD`
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
- `AC_SYNTHESIZE_TRUST`
- `AC_BUILD_GRAPH`
- `AC_BUILD_TWIN`
- `AC_PREPARE_FILING`
- `AC_SUBMIT_TO_AUTHORITY`
- `AC_RECONCILE_AUTHORITY_STATE`
- `AC_DETECT_DRIFT`
- `AC_EVALUATE_AMENDMENT`
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
- `ED_SUPERSEDES`
- `ED_BASELINES`
- `ED_LIMITED_BY_RETENTION`
- `ED_ERASED_UNDER`
- `ED_TRIGGERED_WORKFLOW`
- `ED_DEPENDS_ON_CONFIG`

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

### Rule F - Config rule

Every compliance-significant activity node SHALL link to the relevant frozen config entity through
`ED_DEPENDS_ON_CONFIG`.

### Rule G - Actor rule

Every activity node SHALL link to at least one agent node through `ED_ASSOCIATED_WITH` or
`ED_ATTRIBUTED_TO`.

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
- `PATH_EVIDENCE_SUPPORT`
- `PATH_AUTHORITY_STATE`
- `PATH_PARITY_EXPLANATION`
- `PATH_TRUST_EXPLANATION`
- `PATH_DRIFT_BASELINE`
- `PATH_AMENDMENT_JUSTIFICATION`
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

### Inference limitation rule

An inferred segment may help explain classification or linkage, but it SHALL not, by itself, create
legal submission state or replace required direct support for a filing-critical conclusion.

## 11.11 Query contract

The graph SHALL expose, at minimum, these engine-level query contracts.

### `get_provenance(object_type, object_id, options)`

Returns the full provenance graph projection for the object.

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
- `nodes[]`
- `edges[]`
- `critical_paths[]`
- `limitation_notes[]`
- `confidence_summary`
- `supersession_summary`

The query response MAY include a reduced projection for UI use, but the full logical content SHALL
remain reproducible.

## 11.13 Enquiry-pack semantics

The graph SHALL support deterministic enquiry-pack generation.

An enquiry pack SHALL contain, at minimum:

- target figure or decision
- critical derivation path
- supporting evidence list
- transformation steps
- config/version refs
- override refs
- authority refs
- retention/limitation notes
- audit refs

The pack SHALL be renderable in both human-readable and machine-readable form.

## 11.14 Retention interaction

The graph SHALL never be "broken" by retention. When upstream evidence expires or is erased:

- the node may become a tombstone or placeholder,
- the edge may be retained with a limitation marker,
- the path SHALL continue to resolve structurally,
- but the path SHALL declare that direct evidence is no longer available.

This matches the design requirement already visible in the pack that downstream artifacts remain
explainable even when upstream evidence is no longer fully present.

## 11.15 One-sentence summary

The provenance graph semantics make the engine explainable by requiring every important output to
exist inside a valid, partitioned, causally ordered graph of entities, activities, and agents, with
explicit derivation, authority, override, and retention semantics.

[1]: https://www.w3.org/TR/prov-overview/
[2]: https://www.w3.org/TR/prov-constraints/
