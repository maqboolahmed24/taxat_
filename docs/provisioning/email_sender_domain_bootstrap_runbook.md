# Email Sender Domain Bootstrap Runbook

## Scope

This runbook freezes the delivery-foundation posture for Taxat transactional email:

- one governed provider account boundary
- one environment-bound server per runtime environment
- one sender domain per runtime environment
- one explicit DNS inventory for verification, DKIM, Return-Path, and DMARC
- one stream partitioning model for customer-visible transactional, operator/security, and non-production sink traffic

The active adapter is Postmark-compatible by default because no earlier ADR fixed a different vendor. Persistence remains vendor-neutral.

## Truth Boundary

Email delivery status, bounce posture, complaint posture, open or click telemetry, and suppression state remain transport or observability projections only. They never become workflow truth, authority truth, or notification legality on their own. `WorkItemNotification` and related product projections stay engine-authored.

## Workspace Strategy

- `email_ws_local_bootstrap`
  Local provisioning bootstrap only. Reuses sandbox posture for safe setup automation and never gets a production-trusted sender identity.
- `email_ws_sandbox`
  Shared sandbox integration. Sink-safe or allowlist-only.
- `email_ws_preprod`
  Preproduction verification. Live-capable provider posture, but Taxat keeps recipient delivery restricted until later callback and template work completes.
- `email_ws_production`
  Production. Only customer-safe transactional templates may reach live recipients.

Account token and per-server tokens are stored only by vault metadata ref and fingerprint. No raw provider tokens belong in repo artifacts, screenshots, or chat output.

## Sender Domains

- `notify.sandbox.taxat.example`
- `notify.preprod.taxat.example`
- `notify.production.taxat.example`

Each sender domain also carries:

- custom Return-Path `pm-bounces.<sender-domain>`
- DMARC host `_dmarc.<sender-domain>`
- domain-verified mailbox posture for `noreply@...` and `help@...`

The domain-verified posture is primary. Avoid one-off sender-signature sprawl unless a later provider requirement forces a narrow exception.

## DNS Inventory

Every sender domain must publish and track these records in `data/provisioning/email_dns_record_inventory.template.json`:

- domain verification TXT
- DKIM TXT
- Return-Path CNAME
- DMARC TXT

Every row carries:

- explicit environment binding
- explicit owner role
- exact purpose
- TTL
- readiness state

Manual checkpoints are required when provider verification remains pending after DNS publication or propagation.

## Stream Partitioning

The canonical stream families are:

- customer transactional
- operator/security
- test sink for local, sandbox, and preproduction only

Rules:

- customer-visible transactional mail must stay separate from internal-only operator/security traffic
- sink/test streams must never be promoted into production
- production may not host a sink stream
- suppressions remain per stream and require deliberate reactivation

## Current Official Provider Grounding

Revalidated on `2026-04-18` against official Postmark documentation:

- [Overview](https://postmarkapp.com/developer/api/overview)
- [Servers API](https://postmarkapp.com/developer/api/servers-api)
- [Domains API](https://postmarkapp.com/developer/api/domains-api)
- [Sender Signatures API](https://postmarkapp.com/developer/api/signatures-api)
- [Message Streams API](https://postmarkapp.com/developer/api/message-streams-api)
- [Suppressions API](https://postmarkapp.com/developer/api/suppressions-api)
- [Sandbox Mode](https://postmarkapp.com/developer/user-guide/sandbox-mode)
- [Bounce Webhook](https://postmarkapp.com/developer/webhooks/bounce-webhook)
- [Webhooks Overview](https://postmarkapp.com/developer/webhooks/webhooks-overview)

## Deferred To `pc_0042`

This card intentionally does not finalize:

- webhook URLs
- callback authentication
- template registration
- delivery-event ingestion

Those surfaces now have a stable workspace, sender-domain, DNS, and stream inventory to target in `pc_0042`.

## Source Gap

`shared_operating_contract_0038_to_0045.md` was absent during execution, so this runbook grounds itself directly in the named algorithm contracts, the environment catalog, the secret policy, and the current provider documentation.
