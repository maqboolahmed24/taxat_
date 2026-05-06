# Canonical Fact Promotion and Partition Isolation

`pc_0116` promotes schema-valid candidates into `CanonicalFact` artifacts without changing their
source/evidence lineage or widening partition scope.

## Promotion State Selection

Promotion is explicit rather than boolean:

- `CLEAR` frontier with zero blocking conflicts promotes to `CANONICAL`.
- `MONITORING_ONLY` promotes to `PROVISIONAL` by default. A caller may set
  `monitoring_only_canonical_allowed` when policy allows non-blocking monitoring conflicts to remain
  attached to canonical truth.
- `BLOCKING_PRESENT` promotes to `CONTESTED` by default, preserving conflict membership and blocking
  ids in the promotion record. A caller may set `contested_output_mode = FAIL_CLOSED` to reject those
  candidates instead of emitting contested artifacts.

`CANONICAL` is never emitted with blocking conflicts at promotion time.

## Identity and Dedupe

The canonical dedupe preimage is:

- `manifest_id`
- `execution_mode`
- `fact_family`
- `value_payload_ref`
- `collection_boundary_ref`
- `normalization_context_ref`
- exact `partition_scope`
- `adjustment_binding`

The canonical identity hash adds exact source/evidence lineage hashes and
`promoted_from_candidate_fact_refs[]`. Duplicate logical candidates in one partition collapse through
the dedupe key, while all source refs, evidence refs, lineage hashes, and promoted-from refs remain
on the single canonical artifact.

## Promotion Record

`promotion_record` preserves:

- deterministic `promotion_activity_ref`
- `conflict_set_ref`
- frontier at promotion
- blocking conflict ids and count at promotion
- promotion rule ref
- approved override ref
- promoted timestamp
- frozen boundary, complete evidence lineage, and unmasked-authoritative visibility flags

## Partition and Visibility Guard

Promotion fails closed if candidate, source, or evidence lineage spans more than one partition.
`partition_scope_refs[]` must contain exactly the scalar `partition_scope`, and the input visibility
must remain `UNMASKED_AUTHORITATIVE_ONLY`.

## Freshness and Retention

Freshness is inherited conservatively from source/evidence artifacts when provided. Missing source
state does not silently upgrade a promoted fact; it resolves to `UNKNOWN`. Retention metadata is
allocated as a derived canonical artifact and remains schema-shaped for later input-freeze wrapping.
