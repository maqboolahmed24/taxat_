# Candidate Fact Extraction Pipeline

`pc_0114` adds the deterministic extraction layer that turns retained `SourceRecord` and `EvidenceItem` artifacts into schema-valid `CandidateFact` records.

## Identity and Dedupe

The candidate dedupe preimage is:

- manifest id
- execution mode
- collection boundary ref
- normalization context ref
- fact family
- exact partition scope
- value payload ref
- adjustment binding, when present

The candidate identity preimage adds source-record lineage hash and evidence lineage hash to that logical key. This means repeated equivalent drafts in one partition collapse into one persisted candidate, while changed support lineage produces a new candidate identity.

## Extraction Semantics

Extraction consumes retained evidence and its referenced source records. It does not re-read raw payloads and does not accept source-free evidence. Each emitted candidate carries:

- at least one `source_record_ref`
- at least one `supporting_evidence_ref`
- source and evidence lineage hashes
- the frozen collection boundary ref
- the frozen normalization context ref
- one exact partition scope
- `visibility_basis = UNMASKED_AUTHORITATIVE_ONLY`

Value payload refs are content-addressable `candidate-value://...` refs derived from the evidence content ref, fact family, and normalization context hash, unless the caller supplies a schema-governed normalized value ref.

## Fact Family Classification

Callers may provide an explicit fact-family hint for normalized extractor outputs. Without a hint, the classifier maps source/evidence posture conservatively:

- authority acknowledgements -> `SUBMISSION_STATE_FACT`
- authority references -> `OBLIGATION_FACT`
- structured external or books-of-entry sources -> `RECORD_FACT`
- declared assertion evidence -> `PROFILE_FACT`
- governance evidence -> `WORKFLOW_CONTEXT_FACT`
- probabilistic inference -> `RISK_FEATURE_FACT`
- documentary/default retained evidence -> `RECORD_FACT`

Adjustment facts are explicit: either the fact-family hint is `ADJUSTMENT_FACT` or the value payload ref carries an adjustment namespace. Adjustment candidates require an adjustment binding.

## Execution Mode

Compliance candidates are machine-enforced as:

- `execution_mode = COMPLIANCE`
- `analysis_only = false`
- empty `non_compliance_config_refs`
- `counterfactual_basis = null`

Analysis candidates are machine-enforced as:

- `execution_mode = ANALYSIS`
- `analysis_only = true`
- non-null `counterfactual_basis`
- optional non-compliance config refs

Analysis-only candidates can be stored for review but cannot masquerade as compliance-ready facts.

## Promotion Readiness

Conflict detection lands in the next roadmap card, so this task uses an explicit bootstrap seam. If no conflict frontier is supplied, candidates use a manifest-scoped bootstrap conflict set ref, `resolution_frontier = CLEAR`, `blocking_conflict_count = 0`, and `readiness_state = CANDIDATE_ONLY`. This is schema-valid but not canonical-ready.

When a conflict frontier is injected, blocking ids mark candidates as `CONTESTED` with `readiness_state = CONFLICT_BLOCKED` and `resolution_frontier = BLOCKING_PRESENT`.

## Partition Integrity

Candidate extraction fails closed when source or evidence support spans more than one partition, or when an expected partition is supplied and the support does not match it. `partition_scope_refs[]` always contains exactly the scalar `partition_scope`.
