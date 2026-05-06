# Artifact Contract Gate and Frozen Bundle Validation

`pc_0120` validates the authoritative pre-seal intake pack against the manifest's
frozen schema bundle and emits the narrow `ARTIFACT_CONTRACT_GATE`
`GateDecisionRecord`.

## Frozen Resolution

Validation is keyed by `schema_bundle_hash` and the bundle's
`schema_reader_window_contract`. `resolveFrozenSchemaEntry` selects exactly one
entry by `artifact_type`. Zero entries is `ARTIFACT_SCHEMA_MISSING`; more than
one entry for the same authoritative artifact type is treated as bundle
corruption and also fails closed. A live-compatible schema outside the frozen
bundle is never consulted.

The required pre-seal schema set is:

- `SourcePlan`
- `SourceWindow`
- `CollectionBoundary`
- `NormalizationContext`
- `SourceRecordSet`
- `EvidenceItemSet`
- `CandidateFactSet`
- `ConflictSet`
- `CanonicalFactSet`
- `Snapshot`
- `InputFreeze`

## Envelope Checks

Each artifact must carry a `contract` with non-empty `schema_id`,
`semantic_version`, `dialect_ref`, `schema_bundle_hash`,
`artifact_content_hash`, and `writer_build_id`. The contract must match the
resolved frozen bundle entry for schema id, artifact type, semantic version,
schema content hash, dialect, compatibility class, reader version, and allowed
upgrade kinds. Set artifacts also verify their top-level
`artifact_contract_hash` against the canonical digest of the embedded contract.

Structural JSON Schema validation is an injected validator seam. The collection
package does not implement a second JSON Schema engine; tests and callers can
bind the existing contracts-core Python validator or an equivalent deterministic
adapter. Any validator issue maps to `ARTIFACT_SCHEMA_VALIDATION_FAILED`.

## Reader-Window Notices

Deprecated schema entries are allowed only while the frozen reader window still
supports the bundle. That posture emits `PASS_WITH_NOTICE` with
`ARTIFACT_SCHEMA_DEPRECATED_ALLOWED`. If the window is closed, deprecated usage
is `ARTIFACT_VERSION_INCOMPATIBLE` and hard-blocks.

Backward-compatible minor-version skew across independent artifact families also
emits `PASS_WITH_NOTICE`; mixed major versions hard-block.

## Contract Refs and Hashes

`InputFreeze.artifact_contract_refs[]` must use the canonical `pc_0119` URI
grammar and include the refs for the four intake-boundary artifacts plus the five
set artifacts and `Snapshot`. Extra refs may be present, but the recorded
`artifact_contract_hash` must equal the ordered digest of the full recorded ref
set. Compliance-capable runs hard-block when the hash is absent or mismatched.
Analysis-only runs with a missing hash emit `PASS_WITH_NOTICE`; they remain
blocked from filing-capable progression until a complete contract hash is
recorded.

## Gate Interop

`buildArtifactContractGateRecord` emits only the local
`ARTIFACT_CONTRACT_GATE` record using the manifest package's existing
`GateDecisionRecord` builder. It does not persist, order, or assemble the full
pre-seal gate tape; later generic gate-engine work owns that orchestration.
