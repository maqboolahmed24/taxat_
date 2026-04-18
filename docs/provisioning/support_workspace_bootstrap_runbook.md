# Support Workspace Bootstrap Runbook

## Scope

This pack freezes Taxat's current customer-support integration posture for contextual portal help, external field mapping, and bounded mirror or webhook behavior.

It covers:

- the explicit `NOT_SELECTED` or `SELECTED_WITH_GAPS` decision record
- contextual help, general help, and product-owned acknowledgement as separate scenarios
- field-level mapping from `PortalHelpRequest` context into future external ticket fields
- webhook and mirror rules that keep external support secondary to product truth
- the provisioning viewer route `support-context-mapping-board`

It does **not** cover:

- provider-owned support truth
- raw support transcripts, raw free-text internal notes, or privileged evidence payloads
- helpdesk tokens, webhook secrets, browser storage state, or cookies
- any assumption that an external helpdesk already exists

## Source Gap

`shared_operating_contract_0038_to_0045.md` was absent at execution time. This runbook therefore grounds itself directly in:

- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/customer_client_portal_experience_contract.md`
- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/collaboration_workspace_contract.md`
- `Algorithm/data_model.md`
- `Algorithm/retention_and_privacy.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- prior outputs from `pc_0018`, `pc_0031`, `pc_0033`, `pc_0041`, and `pc_0042`
- current official Zendesk-compatible support-platform documentation

## Current Posture

The current canonical posture is `NOT_SELECTED`.

That means:

- `PortalHelpRequest` remains fully first-party and canonical.
- No external support vendor is active in the current machine-readable pack.
- The future-safe default adapter remains `ZENDESK_COMPATIBLE_BASELINE` so later selection work has one stable baseline.
- The mapping pack exists now so later portal-help implementation does not need to rediscover field boundaries.

The governed files are:

- [support_channel_policy.json](/Users/test/Code/taxat_/config/support/support_channel_policy.json)
- [portal_help_to_external_ticket_mapping.json](/Users/test/Code/taxat_/config/support/portal_help_to_external_ticket_mapping.json)
- [support_webhook_endpoint_contract.json](/Users/test/Code/taxat_/config/support/support_webhook_endpoint_contract.json)
- [support_workspace_selection_record.template.json](/Users/test/Code/taxat_/data/provisioning/support_workspace_selection_record.template.json)
- [support_field_mapping.template.json](/Users/test/Code/taxat_/data/provisioning/support_field_mapping.template.json)

## Truth Boundary

External support is support infrastructure only.

- `PortalHelpRequest` remains the canonical product artifact.
- External tickets or conversations may mirror customer-safe context only.
- External callbacks may append references or status metadata only.
- External systems may **not** mutate help reason, route, focus anchor, request-info lineage, manifest truth, item truth, or response truth.

## Channel Doctrine

The authoritative scenario split is [support_channel_policy.json](/Users/test/Code/taxat_/config/support/support_channel_policy.json).

The current pack freezes exactly three scenarios:

- contextual request help
- general help route
- support acknowledgement

Rules:

- contextual help and general help remain distinct
- `restate_required = false` remains product law
- product-owned acknowledgement remains distinct from any provider-authored mail or thread
- customer-safe summaries may be exported later; internal-only notes may not

## Mapping Doctrine

The authoritative mapping pack is [portal_help_to_external_ticket_mapping.json](/Users/test/Code/taxat_/config/support/portal_help_to_external_ticket_mapping.json).

Required preserved fields include:

- `help_request_id`
- `reason_family`
- `source_route`
- `source_focus_anchor_ref`
- `request_info_ref` when linked request context exists
- `manifest_id`
- `item_id`
- bounded case-context summaries

Blocked fields include:

- `body_ref`
- `masked_evidence_refs`
- `internal_note_refs`
- `authority_payload_refs`
- `privileged_audit_refs`

If a later provider forces a generic free-text intake, Taxat must preserve structured context separately and record the provider limitation as a typed integration gap instead of asking the customer to restate governed context.

## Mirror And Webhook Doctrine

The authoritative callback pack is [support_webhook_endpoint_contract.json](/Users/test/Code/taxat_/config/support/support_webhook_endpoint_contract.json).

Rules:

- duplicates must deduplicate on `external_ticket_id`, `external_event_id`, and `help_request_id`
- webhook secrets remain vault-bound only
- callback URLs stay null while support remains `NOT_SELECTED`
- mirror-back is metadata-only for contextual or general help
- support acknowledgement stays `NO_EXTERNAL_WRITE`

## Operational Sequence

1. Reconcile the checked-in decision record and mapping pack.
2. Confirm whether support remains `NOT_SELECTED` or has moved to an explicit selected posture.
3. If still `NOT_SELECTED`, stop cleanly after verifying the pack and viewer.
4. If selected later, bind vendor workspace, custom fields, and callback secrets without changing the truth boundary.
5. Fail closed on any mapping that would leak internal-only or masked content.
6. Fail closed on any callback behavior that would mutate product truth.

## Viewer

The low-noise inspection surface is `support-context-mapping-board` in the provisioning viewer. It is backed by the checked-in sample payload in [sample_run.json](/Users/test/Code/taxat_/automation/provisioning/report_viewer/data/sample_run.json).

Use it to inspect:

- portal context carriage by scenario
- external field bindings and blocked fields
- mirror and return rules
- privacy notes
- webhook posture
- source refs and inspector notes

## Revalidated Provider Sources

Revalidated on `2026-04-18` against current official Zendesk documentation:

- [Tickets API](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/)
- [Ticket Fields API](https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/)
- [Creating and Updating Tickets](https://developer.zendesk.com/documentation/ticketing/managing-tickets/creating-and-updating-tickets/)
- [Webhooks API](https://developer.zendesk.com/api-reference/webhooks/webhooks-api/webhooks/)
- [Webhook Security and Authentication](https://developer.zendesk.com/documentation/webhooks/webhook-security-and-authentication/)
- [Verifying Webhook Signatures](https://developer.zendesk.com/documentation/event-connectors/webhooks/verifying/)
- [Triggers API](https://developer.zendesk.com/api-reference/ticketing/business-rules/triggers/)
