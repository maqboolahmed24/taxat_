# Artifact Set Wrapping, Hashing, and Contract References

`pc_0119` promotes the five intake families into deterministic set artifacts:

- `SourceRecordSet`
- `EvidenceItemSet`
- `CandidateFactSet`
- `ConflictSet`
- `CanonicalFactSet`

All builders use `buildArtifactSet` followed by `wrapAndHashArtifactSet`. Family
builders only normalize records, choose the durable identity ref, and provide the
set schema lineage.

## Canonical Ordering

Every input item is normalized before identity or payload hashing. Identical
duplicate identities collapse when the canonical payload hash is identical. A
duplicate identity with a different canonical payload fails with
`ARTIFACT_SET_DUPLICATE_CONFLICT`.

Set item order is stable and independent of database row order:

- `SourceRecordSet`: `source_record_id`
- `EvidenceItemSet`: `evidence_item_id`
- `CandidateFactSet`: `candidate_fact_id`
- `ConflictSet`: `conflict_id`
- `CanonicalFactSet`: `canonical_fact_id`

The identity list uses durable refs such as `source-record://...` and
`candidate-fact://...`. The `item_identity_hash` preimage is the canonical string
set of those refs under an artifact-family namespace specific to the set type.

## Hash Preimages

All digests use the repo canonical JSON serializer through
`deriveCollectionControlHash`. Undefined values are rejected by the serializer,
so optional slots are either omitted before hashing or represented as explicit
`null` where the schema requires null-slot preservation.

`set_id` preimage:

- `artifact_type`
- `manifest_id`
- `item_identity_hash`
- `set_identity_components`

For the four simple set families, `set_identity_components` is `null`. For
`ConflictSet` it contains `conflict_detection_policy_ref`,
`normalization_context_ref`, and `unresolved_conflict_hash` so the same conflict
members under a different policy or normalization context cannot alias.

`artifact_contract_hash` is the digest of the artifact contract content. The
contract content contains the schema id/source hash, schema bundle hash, writer
build id, artifact id, artifact type, and the set artifact content hash. The set
artifact content hash is computed over the normalized base payload with the
computed `set_id`, `item_identity_hash`, and explicit pending placeholders for
self-referential hash fields.

`set_hash` preimage:

- normalized set payload fields, including ordered `items`
- final `artifact_contract_hash`
- `item_identity_hash`
- `set_id`

The final `set_hash` intentionally does not hash itself.

The intake-pack `artifact_contract_hash` used by `InputFreeze` is the ordered
digest of canonical `artifact_contract_ref` strings. This makes the later
artifact-contract gate recompute from the same recorded reference surface.

## Artifact Contract Ref Grammar

Each artifact contract ref is a percent-encoded URI with fixed query ordering:

```text
artifact-contract://{artifact_type}?artifact_id={artifact_id}&schema_id={schema_id}&schema_bundle_hash={schema_bundle_hash}&artifact_content_hash={artifact_content_hash}&artifact_contract_hash={artifact_contract_hash}
```

`recordArtifactContractRefs` records refs for boundary artifacts
(`SourcePlan`, `SourceWindow`, `CollectionBoundary`, `NormalizationContext`) and
set artifacts, sorts them by `artifact_type`, `artifact_id`, and
`artifact_contract_hash`, then computes the aggregate hash. Any change to an
authoritative contract ref or the contract content changes the aggregate hash.

## Conflict Frontier Semantics

`ConflictSet` computes frontier fields from normalized unresolved conflicts:

- `CLEAR`: zero open conflicts and zero blocking conflicts.
- `MONITORING_ONLY`: at least one open conflict and zero blocking conflicts.
- `BLOCKING_PRESENT`: at least one open conflict and at least one blocking
  conflict.

`open_conflict_ids` and `blocking_conflict_ids` are deterministic string sets.
`dominant_blocking_class` is `null` when there are no blocking conflicts and the
highest-priority blocking class otherwise. `unresolved_conflict_hash` is derived
from the projected frontier, so resolution-state changes affect the conflict set
identity and hash.

## Persistence

`phase03_0119_intake_artifact_sets.sql` adds registers for persisted set
envelopes, individual contract refs, and aggregate contract-ref packs. The
database checks mirror the builder contract: payload ids and hashes must match
the indexed columns, item counts must match the array size, and RLS is enabled
for all three registers.
