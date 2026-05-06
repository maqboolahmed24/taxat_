# Snapshot Assembly and Lifecycle

`Snapshot` is the governed collection artifact that seals the authoritative set
refs and hashes for a manifest:

- `SourceRecordSet`
- `EvidenceItemSet`
- `CandidateFactSet`
- `ConflictSet`
- `CanonicalFactSet`

The builder accepts set bindings through `SnapshotAssemblySetBindings`. This is
deliberately a dependency interface: generic artifact-set wrapping is owned by
the next card, while this card requires exact refs and hashes to be bound before
snapshot persistence.

`buildSnapshotRecord` assembles the full payload in memory, computes populated
`quality` and `completeness` blocks, builds the `state_transition_contract`, and
only then normalizes the record. `buildSnapshot` persists through
`SnapshotRepository` only after that normalization succeeds, so partial or
schema-invalid snapshots are not written.

Lifecycle transitions are named events only:

- `snapshot_validation_passed`: `BUILT -> VALID`
- `snapshot_validation_warned`: `BUILT -> WARNED`
- `snapshot_validation_failed`: `BUILT -> INVALID`
- `snapshot_superseded`: `VALID|WARNED|INVALID -> SUPERSEDED`
- `snapshot_retention_limited`: `VALID|WARNED|INVALID -> RETENTION_LIMITED`
- `erasure_complete`: `RETENTION_LIMITED -> ERASED`

Validation transitions are posture-checked against quality and completeness.
Illegal transitions fail closed with typed errors and no repository write.
Repository updates use compare-and-swap row versions, retain payload version
history, and record every applied transition in `snapshot_transition_log`.
