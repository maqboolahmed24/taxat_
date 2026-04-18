# Document Extraction Bootstrap Runbook

## Purpose

This runbook records the current lawful posture for OCR and document extraction.
As of `2026-04-18`, Taxat has not selected a cloud platform or managed OCR vendor, so the current posture is:

- `selection_status = SELF_HOST_DECISION_REQUIRED`
- `managed_default_status = BLOCKED_BY_PLATFORM_PROVIDER_SELECTION`

This is deliberate. The corpus allows documentary evidence extraction inside the broader product boundary, but it does not allow OCR output to become canonical truth or for a vendor to be chosen silently.

## Current Outputs

- Selection record: `data/provisioning/document_extraction_selection_record.template.json`
- Option matrix: `data/provisioning/document_extraction_provider_inventory.template.json`
- Profile catalog: `config/evidence/document_extraction_profile_catalog.json`
- Review thresholds: `config/evidence/document_extraction_review_thresholds.json`
- Candidate mapping: `config/evidence/ocr_output_to_candidate_fact_mapping.json`

## Non-Negotiable Boundary

The durable lineage is:

`source artifact -> retained evidence -> normalized extraction -> candidate facts -> later governed promotion`

Prohibited shortcut:

- raw OCR text to canonical facts
- provider key-values to filing fields
- statement rows to ledger truth
- screenshot text to workflow truth

## Upload Gate

Extraction is blocked unless all of the following are true:

- checksum/integrity is verified
- malware scan or equivalent lawful adoption gate has passed
- request binding is frozen
- attachment confirmation is complete

Extraction stays blocked when any of the following remain true:

- `TRANSFER_PENDING`
- `CHECKSUM_PENDING`
- `SCAN_PENDING`
- `QUARANTINED`
- `VALIDATION_FAILED`
- `ATTACHMENT_UNCONFIRMED`

## What This Card Chose

The card did not provision a managed OCR workspace because no earlier ADR or dependency decision selected a cloud platform.

Instead it froze:

- a machine-readable provider option matrix
- conservative initial document profiles
- deterministic review thresholds
- a candidate-only mapping contract
- a viewer surface for operator inspection

## Next Decision Needed

One of these must be selected explicitly in a later card:

1. a cloud platform plus its first-party managed OCR service
2. a self-host OCR/document-normalization runtime with:
   - model provenance
   - container/image digest pinning
   - patch and upgrade owner
   - isolated worker execution
   - separate raw-output storage
   - explicit retention and redaction policy

Until that happens, OCR remains policy-complete but runtime-blocked.
