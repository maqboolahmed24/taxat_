# Source Record and Evidence Item Materialization

`pc_0112` adds the collection materialization layer that turns normalized controlled-gateway fetch results into first-class `SourceRecord` and `EvidenceItem` artifacts.

## Artifact Boundary

`SourceRecord` preserves raw origin. It stores provider identity, provider account reference, the exact planned business partition, raw payload reference, derived raw hash, collection boundary reference, ingestion run reference, retention tag, erasure posture, strength tier, and freshness state.

`EvidenceItem` preserves evidential attachment. It points back to one source record, stores a derived content reference, extraction method and confidence, strength and freshness inherited from the source, period partition, business partition, retention tag, erasure posture, and stable lineage references.

Raw payloads are never promoted directly into canonical facts. Candidate extraction and provenance graph tasks must consume retained evidence artifacts instead of re-reading transport payloads ad hoc.

## Strength and Freshness

The canonical source-class mapping is:

| Source class | Strength tier |
| --- | --- |
| `AUTHORITY_ACKNOWLEDGEMENT` | `TIER_1_AUTHORITY_FINAL` |
| `AUTHORITY_REFERENCE` | `TIER_2_AUTHORITY_REFERENCE` |
| `INSTITUTIONAL_FEED` | `TIER_3_STRUCTURED_EXTERNAL` |
| `BOOKS_OF_ENTRY` | `TIER_4_STRUCTURED_INTERNAL` |
| `DOCUMENTARY_EVIDENCE` | `TIER_5_DOCUMENT_SUPPORT` |
| `DECLARED_ASSERTION` | `TIER_6_DECLARED_ONLY` |
| `DETERMINISTIC_DERIVATION` | `TIER_4_STRUCTURED_INTERNAL` |
| `PROBABILISTIC_INFERENCE` | `TIER_7_INFERRED` |
| `GOVERNANCE_ARTIFACT` | `TIER_8_GOVERNANCE_ONLY` |

Default freshness is `CURRENT`, except schema or revision drift fetch gaps become `STALE`, and probabilistic inference defaults to `UNKNOWN`.

## Closed Materialization Vocabulary

Source capture methods:

- `CONTROLLED_GATEWAY_FETCH`
- `MANUAL_UPLOAD`
- `OPERATOR_DECLARATION`
- `SYSTEM_DERIVATION`
- `QUARANTINED_GATEWAY_CAPTURE`

Evidence kinds:

- `STRUCTURED_PROVIDER_PAYLOAD`
- `DOCUMENTARY_RAW_PAYLOAD`
- `DECLARED_ASSERTION_TEXT`
- `GOVERNANCE_CONTROL_RECORD`
- `EXTRACTION_REVIEW_REQUIRED`
- `QUARANTINED_CONTENT`

Extraction methods:

- `STRUCTURED_PAYLOAD_DIRECT`
- `OCR_TEXT_EXTRACTION`
- `MANUAL_REVIEW_REQUIRED`
- `DECLARED_TEXT_DIRECT`
- `NO_TEXT_EXTRACTION_RETAINED`
- `QUARANTINE_BLOCKED_EXTRACTION`

Documentary evidence without successful extraction remains explicit as `EXTRACTION_REVIEW_REQUIRED` with `NO_TEXT_EXTRACTION_RETAINED` and confidence `0`. Quarantined or malware-blocked content becomes `QUARANTINED_CONTENT` with `QUARANTINE_BLOCKED_EXTRACTION`, confidence `0`, `LIMITED` erasure posture, and limitation notes in the retention tag.

## References and Replay

`raw_payload_ref` is the exact object-store or gateway reference returned by dispatch. `raw_hash` is a deterministic `raw-hash://` reference derived from that raw payload reference. `content_ref` is a deterministic `content-ref://` reference derived from source record id, evidence kind, and raw payload basis.

Evidence lineage always includes:

- the `source-record://...` ref,
- the raw payload ref,
- the ingestion run ref,
- any caller-provided additional lineage refs.

The materializers do not include raw payload bodies in returned records, logs, or errors.

## Partition and Dedupe Policy

`business_partition` is derived from the planned partition scope. A caller may pass it explicitly, but it must exactly match the frozen planned scope. If a planned source has multiple partitions, the caller must supply the partition to avoid ambiguous attribution.

`period_partition` on evidence is copied from the source record effective period.

Source record ids include manifest id, collection boundary ref, provider, provider account ref, business partition, source class, raw hash, and raw payload ref. Replaying the same normalized fetch is idempotent, but identical raw payload bytes from different provider accounts, partitions, or manifest scopes produce distinct source records.

## Persistence

`SourceRecordRepository` and `EvidenceItemRepository` normalize and persist schema-shaped artifacts idempotently. They expose indexes by manifest, partition, source class, collection boundary, source record, and evidence kind. The SQL migration defines matching durable registers with row-level security enabled and checks for the closed vocabularies, non-empty raw lineage, non-empty evidence lineage, weak extraction posture, and quarantine posture.
