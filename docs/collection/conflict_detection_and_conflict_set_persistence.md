# Conflict Detection and Conflict Set Persistence

`pc_0115` adds the conflict frontier between candidate extraction and canonical promotion.
The implementation keeps detection pure, persists schema-shaped conflict artifacts, and rebinds
candidate promotion readiness to the resulting `ConflictSet`.

## Identity and Dedupe

`conflict_identity_hash` is derived from:

- `conflict_detection_policy_ref`
- `manifest_id`
- `conflict_type`
- sorted `involved_fact_refs[]`
- `contradiction_class`
- sorted `reason_codes[]`
- sorted `decisive_target_refs[]`

`conflict_id` is derived from that identity hash. Records with the same type and involved refs are
merged by deterministic reason-code union before persistence when cross-partition detectors discover
the same contamination through more than one lineage path.

## Detector Matrix

The same-partition detector emits:

- `DUPLICATE_CANDIDATE`: same candidate `dedupe_key`; monitoring-only, non-blocking.
- `LOW_CONFIDENCE_EXTRACTION`: confidence below policy threshold; monitoring-only, non-blocking.
- `MISSING_REQUIRED_FIELD`: semantic projection declares missing required fields; blocks automation.
- `OUT_OF_PERIOD_RECORD`: semantic period differs from frozen expected period; blocks automation.
- `AMOUNT_MISMATCH`: same logical subject but different amount values; decisive, blocks filing.
- `DATE_CONFLICT`: same logical subject but different dates; decisive, blocks automation.
- `CATEGORY_CONFLICT`: same logical subject but different category refs; decisive, blocks review.
- `AUTHORITY_DIFFERENCE`: divergent authority position refs; authority divergence, blocks authority calls.
- `SOURCE_PRECEDENCE_CONFLICT`: explicit precedence issue group; blocks review.

Cross-partition detection emits `BUSINESS_PARTITION_CONFLICT` when the same source lineage,
evidence lineage, value-payload identity, or injected semantic cross-partition group appears in more
than one exact partition. Candidate `partition_scope` and `partition_scope_refs[]` are never mutated.

## Frontier Semantics

`ConflictSet` computes its frontier from unresolved records:

- `CLEAR`: no unresolved conflicts.
- `MONITORING_ONLY`: unresolved conflicts exist, but all are `NON_BLOCKING`.
- `BLOCKING_PRESENT`: at least one unresolved conflict has a blocking class.

`open_conflict_ids[]`, `blocking_conflict_ids[]`, counts, `resolution_frontier`, and
`dominant_blocking_class` are projected from items and validated in the model so they cannot drift.

## Candidate Rebinding

`rebindCandidateConflictMembership` keeps `candidate_fact_id`, `candidate_identity_hash`, and
`dedupe_key` stable, then refreshes:

- `conflict_membership_refs[]`
- `promotion_readiness.conflict_set_ref`
- `promotion_readiness.blocking_conflict_ids[]`
- `promotion_readiness.resolution_frontier`
- `promotion_readiness.readiness_state`
- `promotion_state`

Blocking candidate conflicts become `CONTESTED`. Monitoring-only candidate conflicts become
`PROVISIONAL`. Candidates with no unresolved membership become `READY_FOR_CANONICAL` while remaining
candidate artifacts until the canonical promotion task runs.

## Artifact Set Boundary

This task implements a conflict-specific set wrapper now because gate evaluation already needs the
frozen frontier. The later generic artifact-set task can reuse the same item identity,
unresolved-frontier hash, and set-hash rules without changing conflict semantics.
