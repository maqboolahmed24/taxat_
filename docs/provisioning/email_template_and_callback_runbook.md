# Email Template And Callback Runbook

## Scope

This pack freezes the product-owned transactional email templates, authenticated callback posture, and delivery-event mapping for customer-safe notification families only.

It covers:

- new request-for-information email
- new staff customer-visible comment email
- customer due-date created or changed email
- resolved or closed item email
- contextual help acknowledgement email
- support-contact acknowledgement email

It does **not** cover provider-boundary identity, password-reset, or MFA mail. Those remain provider-owned and outside Taxat workflow truth.

## Source Gap

`shared_operating_contract_0038_to_0045.md` was absent at execution time. This runbook therefore grounds itself directly in:

- `Algorithm/collaboration_workspace_contract.md`
- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/customer_client_portal_experience_contract.md`
- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/data_model.md`
- prior outputs from `pc_0031`, `pc_0033`, `pc_0040`, and `pc_0041`
- current official Postmark-compatible template, webhook, and delivery-event documentation

## Truth Boundary

Email remains a delivery projection only.

- Product events decide whether customer email is lawful.
- `WorkItemNotification` and `PortalHelpRequest` remain the authoritative internal carriers.
- Provider delivery events may append delivery evidence, suppression posture, retry posture, and counters.
- Provider delivery events may **not** mutate work-item state, approval truth, authority truth, or portal-help lifecycle truth directly.

## Template Doctrine

The authoritative catalog is [email_template_catalog.json](/Users/test/Code/taxat_/config/notifications/email_template_catalog.json).

Rules:

- Every template must map to one explicit customer-visible family.
- Every template must use `customer_safe_projection`-compatible fields only.
- Every template must publish route continuity and focus-anchor continuity.
- Missing required merge variables fail closed as configuration errors.
- Internal-only notes, assignments, escalations, internal attachments, and audit-only events remain blocked.
- Open and click tracking remain disabled by default.

## Callback Doctrine

The callback contract is [email_webhook_endpoint_contract.json](/Users/test/Code/taxat_/config/notifications/email_webhook_endpoint_contract.json), and the event-effect matrix is [email_delivery_event_mapping.json](/Users/test/Code/taxat_/config/notifications/email_delivery_event_mapping.json).

Rules:

- Use HTTPS only.
- Use provider-supported equivalent authentication: Basic Auth plus a vault-bound custom header.
- Keep callback secrets in the governed vault only.
- Deduplicate on provider record type, message ID, stream, recipient, and Taxat metadata keys.
- Return success on duplicate delivery without creating duplicate internal evidence.
- Keep callback payload capture metadata-only or redacted-reason only.

Current enabled event families:

- `Delivery`
- `Bounce`
- `SpamComplaint`
- `SubscriptionChange`

Current disabled event families:

- `Open`
- `Click`

## Operational Sequence

1. Reconcile checked-in catalog and inventory files.
2. Reconcile provider template aliases per environment.
3. Reconcile authenticated callback endpoints per environment.
4. Verify telemetry defaults still keep open and click disabled.
5. Verify event mapping still forbids workflow-state mutation.
6. Rehearse rendering in sandbox or allowlist-only environments before production rollout.

## Inventory

The provider-ready inventory is [email_template_inventory.template.json](/Users/test/Code/taxat_/data/provisioning/email_template_inventory.template.json).

It freezes:

- provider-ready subject, HTML, and text bodies
- per-environment alias bindings
- sender identity and reply-to posture
- callback refs per environment

## Viewer

The low-noise inspection surface is `notification-copy-atlas` in the provisioning viewer. It is backed by the checked-in sample payload in [sample_run.json](/Users/test/Code/taxat_/automation/provisioning/report_viewer/data/sample_run.json).

Use it to inspect:

- literal customer copy
- continuity anchors
- merge-variable provenance
- lifecycle rail
- callback authentication posture
- privacy notes and disabled telemetry

## Revalidated Provider Sources

Revalidated on `2026-04-18` against official Postmark documentation:

- [Templates API](https://postmarkapp.com/developer/api/templates-api)
- [Templates](https://postmarkapp.com/developer/user-guide/content/templates)
- [Mustachio Syntax](https://postmarkapp.com/developer/user-guide/content/templates/mustachio-syntax)
- [Webhooks Overview](https://postmarkapp.com/developer/webhooks/webhooks-overview)
- [Delivery Webhook](https://postmarkapp.com/developer/webhooks/delivery-webhook)
- [Bounce Webhook](https://postmarkapp.com/developer/webhooks/bounce-webhook)
- [Spam Complaint Webhook](https://postmarkapp.com/developer/webhooks/spam-complaint-webhook)
- [Subscription Change Webhook](https://postmarkapp.com/developer/webhooks/subscription-change-webhook)
- [Open Webhook](https://postmarkapp.com/developer/webhooks/open-webhook)
- [Click Webhook](https://postmarkapp.com/developer/webhooks/click-webhook)
- [Tracking Opens Per Email](https://postmarkapp.com/developer/user-guide/tracking-opens/tracking-opens-per-email)
