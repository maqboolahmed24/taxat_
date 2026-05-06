# Out-of-Band Authority Correction and Temporal Propagation

`pc_0142` implements the post-seal propagation boundary for authority correction,
out-of-band discovery, late-data invalidation, and temporal uncertainty.

## Schema Gap Resolution

The corpus prose names authority-corrected submission truth, but
`Algorithm/schemas/submission_record.schema.json` does not permit
`lifecycle_state = AUTHORITY_CORRECTED`. The implementation therefore keeps the
legal state schema-shaped:

- authority-corrected truth uses `SubmissionRecord.lifecycle_state = CONFIRMED`
  with `baseline_type = AUTHORITY_CORRECTED`;
- out-of-band truth uses `SubmissionRecord.lifecycle_state = OUT_OF_BAND` with
  `baseline_type = OUT_OF_BAND`;
- `TemporalPropagationEvent.event_class` records whether the trigger was
  `AUTHORITY_CORRECTION`, `OUT_OF_BAND_DISCOVERY`, `LATE_DATA_INVALIDATION`, or
  `TEMPORAL_UNCERTAINTY_BLOCK`.

No service invents an `AUTHORITY_CORRECTED` lifecycle state.

## Trigger Matrix

- `AUTHORITY_CORRECTION`: authority-grounded evidence changes an already
  confirmed position. The successor submission remains `CONFIRMED` and carries
  `baseline_type = AUTHORITY_CORRECTED`.
- `OUT_OF_BAND_DISCOVERY`: authority truth exists outside the active packet
  lineage or the observed authority lineage cannot be proven to belong to the
  current packet chain. The successor submission becomes `OUT_OF_BAND`.
- `TEMPORAL_UNCERTAINTY_BLOCK`: evidence is authenticated enough to block reuse
  but not correlated enough to create a confirmed legal state.
- `LATE_DATA_INVALIDATION`: late-data monitor or finding refs invalidate
  post-seal trust and replay posture.

## Scope Derivation

`affected_scope_refs[]` is sorted and unique. If a caller does not provide
`active_exact_scope_key`, the model derives it as:

```text
exact-scope:<sorted affected_scope_refs joined by "|">
```

This keeps partial-scope corrections from tainting sibling obligations or
partitions.

## Propagation Order

1. Classify authority-grounded submission truth.
2. Persist one canonical `TemporalPropagationEvent`.
3. Rebuild or block exact-scope baselines.
4. Demote filing-case and packet reuse.
5. Mark proof, trust, parity, and graph projections stale.
6. Reopen workflow and customer-safe projection state.
7. Enforce exact replay from persisted temporal event lineage.

`historical_reuse_policy` is always `NO_FRESH_RECLASSIFICATION`; exact replay
must reuse historical temporal-event refs or fail closed / explicitly downgrade.

## Durable Artifacts

- `TemporalPropagationEvent` model:
  [packages/backend-authority/src/models/temporal_propagation_event.ts](/Users/test/Code/taxat_/packages/backend-authority/src/models/temporal_propagation_event.ts)
- Repository:
  [packages/backend-authority/src/repositories/temporal_propagation_event_repository.ts](/Users/test/Code/taxat_/packages/backend-authority/src/repositories/temporal_propagation_event_repository.ts)
- Migration:
  [db/migrations/phase03_0142_temporal_propagation_and_authority_correction.sql](/Users/test/Code/taxat_/db/migrations/phase03_0142_temporal_propagation_and_authority_correction.sql)

## Replay Rule

`enforceTemporalReplayBasisIntegrity` rejects exact replay when required
temporal events are missing or when replay claims `NOT_MATERIAL` while
historical temporal propagation affected the run. Counterfactual replay may
downgrade explicitly, but it cannot silently substitute live reclassification.
