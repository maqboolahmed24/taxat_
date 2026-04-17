# Canonical Fact Promotion And Partition Isolation Contract

## Purpose

This contract governs the promotion boundary from frozen intake to authoritative canonical facts.
It closes the failure class where canonical truth is derived from unfrozen input, unresolved
blocking conflicts, cross-partition mixing, masked projections, incomplete lineage, or unstable set
identity.

## Governing model

`CandidateFact` is a normalized proposal. `CanonicalFact` is authoritative truth only for the exact
frozen manifest scope that produced it.

The promotion boundary SHALL preserve all of the following:

- exact `collection_boundary_ref`
- exact `normalization_context_ref`
- exact single-partition binding
- complete source-record and evidence lineage
- explicit conflict posture at promotion time
- explicit promotion activity lineage
- deterministic item identity and set deduplication keys

## Candidate facts

Every `CandidateFact` SHALL carry:

- `collection_boundary_ref`
- `normalization_context_ref`
- `source_record_refs[]`
- `source_record_lineage_hash`
- `supporting_evidence_refs[]`
- `evidence_lineage_hash`
- `partition_scope`
- `partition_scope_refs[]`
- `partition_isolation_state = EXACT_SINGLE_PARTITION`
- `visibility_basis = UNMASKED_AUTHORITATIVE_ONLY`
- `candidate_identity_hash`
- `dedupe_key`
- `conflict_membership_refs[]`
- `promotion_readiness{...}`

`promotion_readiness{...}` SHALL declare:

- `readiness_state`
- `conflict_set_ref`
- `resolution_frontier`
- `blocking_conflict_ids[]`
- `blocking_conflict_count`
- `promotion_rule_ref`
- `approved_override_ref_or_null`
- `frozen_collection_boundary_required = true`
- `evidence_lineage_complete = true`
- `visibility_safe_for_authority = true`

Candidate facts are never authoritative merely because they exist. They must not collapse into
canonical truth by state-label drift or by wrapper-set inference.

## Canonical facts

Every `CanonicalFact` SHALL carry the same exact intake, lineage, partition, visibility, and
identity bindings as its candidate inputs, plus:

- `promoted_from_candidate_fact_refs[]`
- `canonical_identity_hash`
- `promotion_record{...}`

`promotion_record{...}` SHALL declare:

- `promotion_activity_ref`
- `conflict_set_ref`
- `resolution_frontier_at_promotion`
- `blocking_conflict_ids_at_promotion[]`
- `blocking_conflict_count_at_promotion`
- `promotion_rule_ref`
- `approved_override_ref_or_null`
- `promoted_at`
- `frozen_collection_boundary_required = true`
- `evidence_lineage_complete = true`
- `visibility_safe_for_authority = true`

If `promotion_state = CANONICAL`, then:

- `blocking_conflict_count_at_promotion = 0`
- `resolution_frontier_at_promotion ∈ {CLEAR, MONITORING_ONLY}`
- `visibility_basis = UNMASKED_AUTHORITATIVE_ONLY`
- `partition_isolation_state = EXACT_SINGLE_PARTITION`

## Partition isolation

Canonical truth SHALL be exact-partition only.

- one `CandidateFact` or `CanonicalFact` SHALL bind exactly one partition scope
- cross-partition inconsistencies SHALL surface as `ConflictRecord` artifacts, not as widened fact
  scope
- canonicalization SHALL not merge evidence, source records, or candidate lineage from different
  business partitions to fabricate completeness

## Visibility boundary

Masked, redacted, customer-safe, or otherwise visibility-limited projections SHALL never be source
truth for canonical promotion.

Authoritative promotion input SHALL remain:

- frozen
- unmasked
- replayable
- manifest-bound

## Set identity

`CandidateFactSet` and `CanonicalFactSet` SHALL deduplicate and order items by stable fact identity,
not by incidental storage order. At minimum the set boundary SHALL remain stable across:

- exact replays
- retry after interruption
- conflict-only posture changes
- cross-partition duplicate source bodies

Duplicate logical facts within the same partition and fact family SHALL be detected by identity key
rather than by opaque artifact id alone.

## Regression cases closed

- promotion from unfrozen intake
- canonical promotion while blocking conflicts remain unresolved
- partition scope dropped, widened, or merged during normalization or promotion
- masked or hidden projections influencing canonical truth
- incomplete source/evidence lineage at promotion time
- candidate/canonical set dedupe errors caused by id-only uniqueness
