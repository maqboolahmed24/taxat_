# Canonical Source and Evidence Taxonomy

## Canonical source and evidence taxonomy

The engine SHALL distinguish clearly between raw source material, retained evidence, candidate facts,
canonical facts, derived values, inferences, and governance artifacts. No source record becomes
canonical merely because it was received. Canonical status is achieved only through normalization,
validation, scoping, lineage binding, and conflict handling.

In the current tax embodiment, this taxonomy is grounded in HMRC's digital-record model, including
digital record creation and correction, per-business separation, quarterly-update derivation from
digital records, retention expectations, and operation across one product or multiple linked products.

## 4.1 Purpose

The purpose of the source and evidence taxonomy is to ensure that the engine can answer all four of the
following questions deterministically:

1. **Where did this fact originate?**
2. **What evidence supports it?**
3. **How strong, fresh, and direct is that support?**
4. **What transformations occurred before the fact became canonical?**

## 4.2 Core objects

The taxonomy SHALL use the following core objects.

**SourceRecord**
The raw, provider-specific or user-originated payload exactly as received or captured.

**EvidenceItem**
A retained, addressable artifact supporting one or more candidate or canonical facts. An evidence item
may be structured, semi-structured, or unstructured.

**CandidateFact**
A normalized statement extracted from source material but not yet promoted to canonical status.

**CanonicalFact**
A normalized statement accepted by the engine for computation, parity, trust, graphing, or filing.

**DerivedValue**
A deterministic value produced from one or more canonical facts, such as a category total, adjusted
subtotal, or comparison delta.

**InferenceRecord**
A non-primary linkage or imputed conclusion produced by matching or inference logic and always
accompanied by confidence and explanation.

**GovernanceArtifact**
A human or system control artifact such as an override, rationale, approval note, or retention action.
Governance artifacts affect interpretation but are not themselves source truth for transactional facts.

## 4.3 Source classes by origin

Every `SourceRecord` SHALL carry exactly one `source_class` from the following set.

### Class A - `AUTHORITY_ACKNOWLEDGEMENT`

A record issued by the authority of record confirming, rejecting, pending, or otherwise defining the
legal state of an obligation or submission.

Use for:

- submission confirmations
- submission rejections
- obligation status returned by authority
- amendment acceptance/rejection state

### Class B - `AUTHORITY_REFERENCE`

Authority-originated informational or comparison data that is not itself the legal acknowledgement of a
submission state.

Use for:

- authority-returned calculation data
- prior figures held by authority
- obligations metadata used for comparison

### Class C - `INSTITUTIONAL_FEED`

Structured data pulled from an institution or system-of-record provider through a connector.

Use for:

- bank feeds
- bookkeeping ledger API data
- property platform data
- payroll or other structured third-party feeds

### Class D - `BOOKS_OF_ENTRY`

Structured records actively maintained by the reporting subject or their operator inside a bookkeeping,
spreadsheet, or bridging workflow.

Use for:

- manually entered income lines
- manually entered expense lines
- spreadsheet-backed source rows
- category mappings maintained in record-keeping software

### Class E - `DOCUMENTARY_EVIDENCE`

Documents or media that support a fact but require extraction or human review before becoming
structured facts.

Use for:

- receipts
- invoices
- bank statement PDFs
- leases
- scanned correspondence
- screenshots or uploaded images

### Class F - `DECLARED_ASSERTION`

A human-entered statement that may be required for completion but is not yet corroborated by stronger
evidence.

Use for:

- answers in a client questionnaire
- manual classification answers
- declarative flags such as "this expense was wholly business"

### Class G - `DETERMINISTIC_DERIVATION`

A machine-produced, deterministic transformation of canonical facts.

Use for:

- category totals
- period totals
- adjusted totals
- parity deltas
- risk feature values derived by fixed rules

### Class H - `PROBABILISTIC_INFERENCE`

A machine-produced but non-certain linkage or imputation.

Use for:

- probable receipt-to-transaction matches
- likely duplicate identification
- likely category suggestions
- inferred evidence chains

### Class I - `GOVERNANCE_ARTIFACT`

A control artifact that changes interpretation, gating, or retention but is not evidence of the
underlying transaction fact.

Use for:

- override rationale
- approval memo
- retention exception
- legal-hold note

## 4.4 Canonical fact families

The engine SHALL classify canonical facts into families so that raw record facts, adjustments, and
legal-state facts never become confused.

At minimum:

- `TRANSACTION_FACT`
- `RECORD_FACT`
- `CATEGORY_TOTAL_FACT`
- `ADJUSTMENT_FACT`
- `PROFILE_FACT`
- `OBLIGATION_FACT`
- `SUBMISSION_STATE_FACT`
- `AUTHORITY_COMPARISON_FACT`
- `RISK_FEATURE_FACT`
- `WORKFLOW_CONTEXT_FACT`

This separation matters in the current HMRC embodiment because quarterly updates are category totals
derived from digital records every 3 months, while accounting or tax adjustments are not required
before those quarterly updates are sent. That means the engine must preserve a hard distinction between
record-layer facts and adjustment-layer facts. [6]

Every `ADJUSTMENT_FACT` SHALL also carry an explicit schema-backed adjustment binding that freezes:

- `applicable_reporting_scopes[]`
- `quarterly_basis_profile`
- `time_window_basis`
- `partition_application = EXACT_PARTITION_ONLY`
- `analysis_mode_treatment`

This binding exists so compute, parity, amendment, and replay paths do not have to infer whether an
adjustment belongs to quarterly, year-end, estimate-only, or counterfactual analysis posture from a
free-form payload.

## 4.5 Strength tiers

Each `SourceRecord`, `EvidenceItem`, `CandidateFact`, and `CanonicalFact` SHALL carry a `source_strength_tier`.

Canonical closed vocabulary:

- `TIER_1_AUTHORITY_FINAL`
- `TIER_2_AUTHORITY_REFERENCE`
- `TIER_3_STRUCTURED_EXTERNAL`
- `TIER_4_STRUCTURED_INTERNAL`
- `TIER_5_DOCUMENT_SUPPORT`
- `TIER_6_DECLARED_ONLY`
- `TIER_7_INFERRED`
- `TIER_8_GOVERNANCE_ONLY`

These tiers are not legal conclusions. They are internal evidential ordering primitives, and the schema contracts SHALL treat them as a closed enum so ordering, parity pressure, and trust synthesis cannot drift across implementations.

## 4.6 Confidence model

The engine SHALL maintain `evidence_confidence` separately from `source_strength_tier`.

Recommended default posture:

- `AUTHORITY_ACKNOWLEDGEMENT` -> `CONFIRMED`
- `AUTHORITY_REFERENCE` -> `STRONG`
- `INSTITUTIONAL_FEED` -> `STRONG`
- `BOOKS_OF_ENTRY` -> `SUPPORTED`
- `DOCUMENTARY_EVIDENCE` -> `SUPPORTED` or `DECLARED_ONLY` depending on extraction quality
- `DECLARED_ASSERTION` -> `DECLARED_ONLY`
- `PROBABILISTIC_INFERENCE` -> `INFERRED`
- `GOVERNANCE_ARTIFACT` -> not applicable as primary evidential confidence

The engine SHALL allow numeric confidence for machine processing, but SHALL also preserve a categorical
label for human review.

## 4.7 Freshness model

Each `SourceRecord` and derived `EvidenceItem` SHALL carry a freshness state:

- `CURRENT`
- `STALE`
- `EXPIRED`
- `UNKNOWN`
- `SUPERSEDED`

Freshness SHALL be evaluated relative to source class, tax period, run time, and policy profile. A
stale source may still remain canonical for historical explanation, but may be insufficient for a
current filing gate.

## 4.8 Required raw-source metadata

Every `SourceRecord` SHALL carry, at minimum:

- `source_record_id`
- `source_class`
- `provider`
- `provider_account_ref` or equivalent
- `capture_method`
- `captured_at`
- `effective_period`
- `tenant_id`
- `client_id`
- `business_partition`
- `raw_hash`
- `raw_payload_ref`
- `ingestion_run_ref`
- `retention_tag`
- `erasure_state`

For the current MTD embodiment, the engine SHALL preserve the fields needed to support digital records
with amount, date, and category, and SHALL preserve per-business partitioning because separate
businesses require separate records and separate quarterly updates. [5]

`retention_tag` SHALL carry the first-class persisted `RetentionTag` object. `erasure_state` SHALL
remain aligned with `ArtifactRetention.lifecycle_state` so raw-source retention posture does not
drift from the canonical privacy-control plane.

## 4.9 Evidence-item metadata

Every `EvidenceItem` SHALL carry:

- `evidence_item_id`
- `source_record_id`
- `evidence_kind`
- `content_ref`
- `extraction_method`
- `extraction_confidence`
- `lineage_refs[]`
- `retention_tag`
- `erasure_state`
- `business_partition`
- `period_partition`

`retention_tag` SHALL carry the first-class persisted `RetentionTag` object rather than a free-form
string marker. `erasure_state` SHALL remain aligned with `ArtifactRetention.lifecycle_state` so
retention and evidence projections do not drift.
`extraction_method`, `extraction_confidence`, and `lineage_refs[]` SHALL remain non-null once the
evidence item is materialized; low confidence is lawful, but an evidence item SHALL NOT become a
support artifact whose extraction basis is structurally unknown.

## 4.10 Canonical promotion states

A fact SHALL move through the following states:

- `CANDIDATE`
- `CANONICAL`
- `PROVISIONAL`
- `CONTESTED`
- `SUPERSEDED`
- `RETIRED`

Promotion to `CANONICAL` SHALL require all of the following:

1. valid tenant/client/period partition
2. attached lineage to at least one retained evidence item or authority record
3. required fields present for that fact family
4. no unresolved blocking conflict
5. confidence at or above policy threshold, or explicit approved override

`CandidateFact` and `CanonicalFact` artifacts SHALL therefore preserve explicit confidence,
supporting evidence linkage, and freshness posture where applicable. The engine SHALL NOT promote a
fact across the compliance freeze boundary by implying support from collection context alone.

Canonical promotion SHALL also preserve:

- exact `collection_boundary_ref`
- exact `normalization_context_ref`
- exact single-partition binding
- replayable `source_record_refs[]`
- replayable `supporting_evidence_refs[]`
- deterministic lineage hashes for source-record and evidence membership
- explicit conflict posture at promotion time
- explicit promotion activity lineage

A fact SHALL remain `PROVISIONAL` where it is usable for analysis but not for compliance-grade filing.

## 4.11 Canonicalization rules

The following rules SHALL apply.

### Rule A - Raw-receipt rule

The engine may ingest any raw payload, but raw payload alone is never a canonical fact.

### Rule B - Structured-authority rule

`AUTHORITY_ACKNOWLEDGEMENT` may directly create canonical `SUBMISSION_STATE_FACT` records once
integrity and scope have been validated.

### Rule C - Structured-feed rule

`INSTITUTIONAL_FEED` and `BOOKS_OF_ENTRY` sources may create canonical `TRANSACTION_FACT` or
`RECORD_FACT` records once normalized, partitioned, deduplicated, and validated.

### Rule D - Documentary rule

`DOCUMENTARY_EVIDENCE` may support canonical facts, but extracted fields SHALL remain candidate facts
until extraction quality, partitioning, and validation are complete.

### Rule E - Declarative rule

`DECLARED_ASSERTION` may create canonical facts only when policy explicitly permits declaration-only
facts for that domain, or when an approved override elevates the assertion for a bounded purpose.

### Rule F - Inference rule

`PROBABILISTIC_INFERENCE` may create links and candidate classifications, but SHALL not independently
create legal submission state or replace stronger direct evidence.

### Rule G - Governance rule

`GOVERNANCE_ARTIFACT` may change gates, interpretation, or readiness, but SHALL not be treated as
transaction or authority source truth.

## 4.12 Partition rules

The engine SHALL maintain strict partitioning by:

- `tenant`
- `client`
- `business_partition`
- `income_source_partition`
- `period`

This is mandatory in the current tax embodiment because HMRC requires separate digital records and
separate quarterly updates for separate businesses and relevant income sources. [5]

`CandidateFact` and `CanonicalFact` SHALL therefore bind exactly one partition scope. Cross-partition
inconsistency is represented as conflict posture, never as widened canonical fact scope.

## 4.13 Conflict taxonomy

Every unresolved inconsistency SHALL be persisted as a `ConflictRecord` with one of the following
minimum types:

- `DUPLICATE_CANDIDATE`
- `AMOUNT_MISMATCH`
- `DATE_CONFLICT`
- `CATEGORY_CONFLICT`
- `BUSINESS_PARTITION_CONFLICT`
- `SOURCE_PRECEDENCE_CONFLICT`
- `AUTHORITY_DIFFERENCE`
- `MISSING_REQUIRED_FIELD`
- `LOW_CONFIDENCE_EXTRACTION`
- `OUT_OF_PERIOD_RECORD`

## 4.13A Conflict-set semantics

`ConflictSet` is the authoritative wrapper over the manifest-scoped conflict population used by
snapshotting, input freezing, and gate evaluation.

It SHALL preserve both:

- the full persisted conflict membership for replay and audit (`items[]`, `item_identity_hash`), and
- the unresolved frontier that still affects execution posture (`open_conflict_ids[]`,
  `blocking_conflict_ids[]`, `unresolved_conflict_hash`, `resolution_frontier`,
  `open_conflict_count`, `blocking_conflict_count`, `dominant_blocking_class`)

It SHALL also carry:

- `normalization_context_ref` so conflict outcomes remain tied to the exact frozen mapping,
  canonicalization, and promotion rules that produced them
- `conflict_detection_policy_ref` so threshold or rule-profile drift never masquerades as the same
  conflict frontier under a new policy basis
- `business_partition_refs[]` so cross-partition and same-partition conflicts can be replayed
  without inferring the affected business scope from item bodies alone

`resolution_frontier` SHALL mean:

- `CLEAR` - no unresolved conflicts remain
- `MONITORING_ONLY` - unresolved conflicts remain, but none currently block automated execution
- `BLOCKING_PRESENT` - at least one unresolved conflict currently blocks automation, review
  progression, filing, amendment, erasure, run completion, or authority interaction

## 4.14 Precedence rules

The engine SHALL apply the following precedence rules.

1. **Legal state precedence**
   `AUTHORITY_ACKNOWLEDGEMENT` outranks every other class for legal submission state.
2. **Comparison precedence**
   `AUTHORITY_REFERENCE` may outrank internal derived values for comparison purposes, but does not erase internal compute.
3. **Structured-record precedence**
   For transactional and record-layer facts, structured external or internal records outrank documentary or declarative-only evidence when the values conflict and no override exists.
4. **Document support precedence**
   Documentary evidence supports or challenges structured facts, but does not automatically outrank structured facts unless policy says the document is the stronger record for that fact family.
5. **Declared-only limitation**
   Declaration-only facts may satisfy workflow progression, but SHALL not satisfy filing readiness where policy requires stronger evidence.
6. **Inference limitation**
   Inference may suggest linkage or classification, but may not fabricate authority acknowledgement, legal status, or unreviewed filing-critical facts.

## 4.15 Aggregation rules

The engine SHALL treat aggregation as a first-class derivation step.

- `CATEGORY_TOTAL_FACT` SHALL be derived from canonical transaction or record facts.
- Quarterly-update totals SHALL be built from category totals for the relevant business partition.
- No accounting or tax adjustment SHALL be silently folded into a quarterly-update total unless policy and workflow explicitly model it in the correct stage.
- End-of-year adjustments SHALL remain separately typed as `ADJUSTMENT_FACT`.

This preserves the distinction HMRC makes between digital records, quarterly update totals, and later
year-end completion work. [6]

## 4.16 Multi-product chain rule

The engine SHALL support evidence and record chains that originate from more than one software product,
connector, or workflow component. This is necessary because HMRC-compatible operation may be achieved
either with one product or with multiple products working together, and source acquisition may come
from bank import, scanned receipts/invoices, manual entry, or bridging workflows. [1]

For every multi-product chain, the engine SHALL preserve:

- product/system of origin
- import pathway
- transformation steps
- raw record hashes
- cross-product linkage references

## 4.17 Retention-aware evidence rules

Every `SourceRecord`, `EvidenceItem`, `CandidateFact`, and `CanonicalFact` SHALL be born with a
retention tag or inherit one deterministically at canonicalization time. In the current HMRC
embodiment, digital records generally need to be kept at least 5 years after the relevant 31 January
deadline, so the taxonomy must be retention-aware from the moment evidence is created, not added later.
[5]

## 4.18 Prohibited promotions

The engine SHALL prohibit the following:

- promoting raw OCR text to canonical fact without retained source image/PDF linkage
- promoting UI display text to canonical source
- treating override rationale as source truth for transaction facts
- treating inference as authority acknowledgement
- mixing facts across business partitions to satisfy completeness artificially
- silently dropping lower-precedence evidence when conflicts exist
- promoting masked, redacted, or customer-safe projections into canonical truth
- promoting a candidate to `CANONICAL` while `blocking_conflict_count_at_promotion > 0`

## 4.19 One-sentence summary

The canonical source and evidence taxonomy ensures that every material figure in the engine can be
traced from raw origin to retained evidence to candidate fact to canonical fact to derived result, with
explicit strength, freshness, confidence, partitioning, and conflict semantics at every step.

[1]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html
[2]: https://csrc.nist.gov/files/pubs/sp/800/162/final/docs/nist.sp.800-162-201401.pdf
[3]: https://www.gov.uk/guidance/add-your-client-authorisations-for-making-tax-digital-for-income-tax?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[5]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records
[6]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
