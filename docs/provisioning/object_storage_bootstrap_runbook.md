# Object Storage Bootstrap Runbook

## Purpose

This runbook freezes Taxat's object-storage topology for:

- upload staging bodies
- retained evidence bodies
- authority payload bodies
- derived previews
- masked exports
- restricted exports
- quarantine
- restore archive bundles

The object store is an immutable-body substrate. It is not the system of record for legal currentness, workflow truth, or admissibility. Durable refs live in the control store and point to bucket purpose, object key, and provider version metadata.

## Current Posture

- `selection_status`: `PROVIDER_SELECTION_REQUIRED`
- `managed_default_status`: `BLOCKED_BY_PLATFORM_PROVIDER_SELECTION`
- `namespace_strategy`: `ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE`
- `versioning_state`: `ENABLED_REQUIRED` for every purpose class
- `public_access_state`: `PUBLIC_ACCESS_BLOCKED` for every bucket

Platform choice is still unresolved. This runbook therefore freezes the logical topology and provider-agnostic controls without inventing cloud-account, region, or service-instance details.

## Canonical Namespace Strategy

Each environment gets its own bucket set, using a stable prefix:

- `taxat-local`
- `taxat-sbx`
- `taxat-pre`
- `taxat-prod`
- `taxat-drill`

Each bucket suffix is purpose-bound:

- `upload-staging`
- `retained-evidence`
- `authority-payloads`
- `derived-previews`
- `export-masked`
- `export-restricted`
- `quarantine`
- `restore-archive`

This closes the earlier gap where downstream work would otherwise invent bucket names ad hoc.

## Truth Boundary

- Upload success does not imply accepted, attachable, previewable, or customer-visible state.
- Bucket listings never define currentness.
- Direct object URLs never bypass access, masking, preview, or quarantine policy.
- Lifecycle expiry of source evidence must degrade surviving derivatives into limitation or omission posture rather than leaving them looking authoritative.

## Key Naming Rules

Keys are lineage-rich and immutable. Friendly filenames are not sufficient identity.

Required dimensions vary by family but include combinations of:

- `tenant_id`
- `client_id`
- `manifest_id`
- `request_id`
- `request_version_ref`
- `upload_session_id`
- `object_version_ref`
- `artifact_version_ref`
- `content_sha256`
- `delivery_binding_hash`
- `masking_posture`
- `derivation_run_ref`
- `quarantine_event_ref`
- `candidate_identity_hash`

Masked and restricted exports use separate key families so a customer-safe artifact cannot drift into an operator-restricted artifact by renaming or policy guesswork.

## Lifecycle and Retention

Retention bindings are machine-readable in `config/object_storage/lifecycle_retention_policy.json`.

- Retention classes are fixed now.
- Exact day-count duration windows remain an explicit source gap.
- Legal hold and restore admissibility can override ordinary delete/transition behavior.
- Staging stays hot-access until promotion, quarantine, or retirement.
- Quarantine never yields customer-facing derivatives.
- Restore bundles remain checkpoint-bound and candidate-bound.

## Event Routes

Event notifications are fixed logically now and remain queue-agnostic until `pc_0052`.

- Delivery posture: `AT_LEAST_ONCE`
- Ordering posture: `OUT_OF_ORDER_POSSIBLE`
- Downstream workers must dedupe using object identity plus event identity
- Overwrite or replacement flows must preserve version lineage rather than assuming in-order single delivery

Logical channels include:

- `channel.upload.scan.request`
- `channel.upload.validation.recheck`
- `channel.evidence.manifest.binding`
- `channel.authority.payload.normalization`
- `channel.preview.registration`
- `channel.export.delivery.attestation`
- `channel.export.delivery.attestation.restricted`
- `channel.quarantine.audit`
- `channel.restore.archive.index`
- `channel.retention.limitation.audit`

## Quarantine Law

Quarantine is a separate namespace boundary with strict no-open posture:

- no preview
- no download
- no direct URL
- metadata-only visibility for customer and default-operator surfaces
- no OCR or export processing from quarantine

Release uses copy/promote semantics:

1. preserve the quarantined source object and its immutable history
2. record a release decision attestation
3. create a new clean object version in the non-quarantine purpose bucket
4. bind the new clean ref in durable control truth

This prevents silent mutation of a quarantined object into a clean one.

## Checked-In Artifacts

- `/Users/test/Code/taxat_/config/object_storage/bucket_purpose_matrix.json`
- `/Users/test/Code/taxat_/config/object_storage/object_key_naming_contract.json`
- `/Users/test/Code/taxat_/config/object_storage/lifecycle_retention_policy.json`
- `/Users/test/Code/taxat_/config/object_storage/event_notification_contract.json`
- `/Users/test/Code/taxat_/config/object_storage/quarantine_isolation_policy.json`
- `/Users/test/Code/taxat_/data/provisioning/object_storage_inventory.template.json`
- `/Users/test/Code/taxat_/automation/provisioning/report_viewer/data/sample_run.json`

## Official Documentation Revalidated On 2026-04-18

- AWS S3 versioning: [docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- AWS S3 lifecycle notifications: [docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configure-notification.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configure-notification.html)
- AWS S3 presigned URLs: [docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- Google Cloud Storage versioning: [cloud.google.com/storage/docs/object-versioning](https://cloud.google.com/storage/docs/object-versioning)
- Google Cloud Storage lifecycle: [cloud.google.com/storage/docs/lifecycle](https://cloud.google.com/storage/docs/lifecycle)
- Google Cloud Storage Pub/Sub notifications: [docs.cloud.google.com/storage/docs/pubsub-notifications](https://docs.cloud.google.com/storage/docs/pubsub-notifications)
- Azure Blob Storage versioning: [learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- Azure Blob Storage lifecycle management: [learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- Azure Blob Storage Event Grid schema: [learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage](https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage)
- Azure SAS guidance: [learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)

## Operator Guidance

- Do not choose a provider implicitly.
- Do not expose raw bucket URLs in product surfaces.
- Do not read quarantine bodies directly in default tooling.
- Do not treat provider lifecycle delete as equivalent to product limitation law; durable truth must record limitation posture explicitly.
