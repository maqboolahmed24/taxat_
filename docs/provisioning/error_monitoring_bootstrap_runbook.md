# Error Monitoring Bootstrap Runbook

## Scope

This pack freezes Taxat's current error-monitoring control-plane posture for runtime failure triage, release-regression detection, and signal-governance inspection.

It covers:

- environment-scoped monitoring workspaces
- per-deployable project inventory for backend, gateway, web, and native surfaces
- vault-safe DSN and automation-token lineage
- scrub rules, inbound filters, and disabled capture modes
- alert and release-mapping posture
- the provisioning viewer route `signal-governance-board`

It does **not** cover:

- product audit truth
- privacy-ledger truth
- authority protocol truth
- workflow-state truth
- raw vendor secrets, replay payloads, DOM snapshots, or request-body capture

## Source Gap

`shared_operating_contract_0038_to_0045.md` was absent at execution time. This runbook therefore grounds itself directly in:

- `Algorithm/observability_and_audit_contract.md`
- `Algorithm/retention_error_and_observability_contract.md`
- `Algorithm/retention_and_privacy.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- `Algorithm/release_candidate_identity_and_promotion_evidence_contract.md`
- `Algorithm/verification_and_release_gates.md`
- `Algorithm/data_model.md`
- prior outputs from `pc_0017`, `pc_0018`, `pc_0028`, `pc_0031`, and `pc_0033`
- current official Sentry documentation

## Provider Posture

The current implementation uses a Sentry-compatible recipe while keeping persisted contracts vendor-neutral.

Current governed files:

- [error_monitoring_project_catalog.json](/Users/test/Code/taxat_/config/observability/error_monitoring_project_catalog.json)
- [error_monitoring_scrub_rules.json](/Users/test/Code/taxat_/config/observability/error_monitoring_scrub_rules.json)
- [error_monitoring_alert_policy.json](/Users/test/Code/taxat_/config/observability/error_monitoring_alert_policy.json)
- [error_monitoring_release_mapping.json](/Users/test/Code/taxat_/config/observability/error_monitoring_release_mapping.json)
- [telemetry_vs_audit_boundary.json](/Users/test/Code/taxat_/config/observability/telemetry_vs_audit_boundary.json)
- [error_monitoring_workspace.template.json](/Users/test/Code/taxat_/data/provisioning/error_monitoring_workspace.template.json)

Current project split:

- `1` local fixture project
- `5` sandbox projects
- `5` pre-production projects
- `5` production projects

The real-environment project families are:

- `BACKEND_RUNTIME`
- `AUTHORITY_GATEWAY`
- `OPERATOR_WEB`
- `CLIENT_PORTAL_WEB`
- `NATIVE_MACOS_OPERATOR`

## Truth Boundary

Vendor monitoring remains secondary to first-party telemetry and audit.

- Runtime exceptions, sampled traces, release markers, and tightly bounded anomaly overlays may be vendor-visible.
- Append-only audit events, privacy ledgers, authority protocol records, failure-lifecycle truth, and release-promotion evidence remain first-party only.
- Shared correlation keys are required.
- Shared payload truth is forbidden.
- Vendor outages may degrade convenience triage only; they may not become a dependency for lawful runtime, audit capture, or release admissibility.

The authoritative boundary pack is [telemetry_vs_audit_boundary.json](/Users/test/Code/taxat_/config/observability/telemetry_vs_audit_boundary.json).

## Scrub Doctrine

The authoritative scrub pack is [error_monitoring_scrub_rules.json](/Users/test/Code/taxat_/config/observability/error_monitoring_scrub_rules.json).

Required blocked or minimized classes include:

- `RAW_SECRETS`
- `FULL_TOKENS`
- `AUTHORITY_CREDENTIALS`
- `CUSTOMER_PERSONAL_IDENTIFIERS`
- `GOVERNMENT_TAX_IDENTIFIERS`
- `DECLARATION_TEXT`
- `EVIDENCE_TEXT`
- `MASKED_OR_MINIMIZED_FIELDS`

Current disabled capture modes:

- `SESSION_REPLAY`
- `ATTACHMENTS`
- `DOM_CAPTURE`
- `RAW_REQUEST_BODY_CAPTURE`
- `PROFILE_PAYLOAD_COLLECTION`

Current posture relies on server-side scrubbing plus disabled high-risk capture modes. Relay or equivalent pre-ingest enforcement remains an explicit future tightening option, not an implicit assumption.

## Filter And Alert Doctrine

The authoritative filter and alert packs are:

- [error_monitoring_scrub_rules.json](/Users/test/Code/taxat_/config/observability/error_monitoring_scrub_rules.json)
- [error_monitoring_alert_policy.json](/Users/test/Code/taxat_/config/observability/error_monitoring_alert_policy.json)

Current inbound filters explicitly cover:

- browser extensions
- web crawlers
- localhost
- healthcheck or filtered transactions
- legacy-browser noise
- fixture-only local isolation

Current alert families are intentionally narrow:

- backend exception regression
- worker failure cluster
- authority gateway auth failure
- authority gateway error spike
- operator web release regression
- portal web release regression
- native macOS crash spike

Alerts are environment-scoped and release-bound. No customer-behavior or vanity alerting is included.

## Release Doctrine

The authoritative release pack is [error_monitoring_release_mapping.json](/Users/test/Code/taxat_/config/observability/error_monitoring_release_mapping.json).

Current tracks:

- `backend-runtime`
- `authority-gateway`
- `operator-web`
- `client-portal-web`
- `native-macos-operator`

Rules:

- release names remain deployable-specific
- environment aliases remain explicit for sandbox, pre-production, and production
- release markers map back to first-party release-candidate and deployment lineage
- release health is enabled only where the deployable posture justifies it

## Operational Sequence

1. Reconcile the checked-in workspace template and observability config pack.
2. Open the provider control plane and verify semantic selectors still resolve.
3. Create or adopt the environment-scoped workspace and project inventory.
4. Reconcile vault-safe DSN and automation-token refs only.
5. Verify scrub rules, inbound filters, and disabled capture modes still match the governed boundary.
6. Verify alert posture and release tracks still match the checked-in machine-readable pack.
7. Fail closed on scrub drift or any provider configuration that would widen vendor-visible payload scope.
8. Use the viewer board to inspect project topology, token refs, source refs, and policy notes before later runtime instrumentation.

## Viewer

The low-noise inspection surface is `signal-governance-board` in the provisioning viewer. It is backed by the checked-in sample payload in [sample_run.json](/Users/test/Code/taxat_/automation/provisioning/report_viewer/data/sample_run.json).

Use it to inspect:

- project topology by environment and deployable
- scrub posture
- inbound filters
- alert and release mapping
- vault-safe token refs
- source refs and governance notes

## Revalidated Provider Sources

Revalidated on `2026-04-18` against current official Sentry documentation:

- [Authentication](https://docs.sentry.io/hosted/api/auth/)
- [Tutorial: Create a Sentry Authentication Token](https://docs.sentry.io/api/guides/create-auth-token/)
- [Create a New Project](https://docs.sentry.io/api/projects/create-a-new-project/)
- [Create a New Client Key](https://docs.sentry.io/api/projects/create-a-new-client-key/)
- [List a Project's Data Filters](https://docs.sentry.io/api/projects/list-a-projects-data-filters/)
- [Update an Inbound Data Filter](https://docs.sentry.io/api/projects/update-an-inbound-data-filter/)
- [Alerts & Notifications](https://docs.sentry.io/api/alerts/)
- [Create a Metric Alert Rule for an Organization](https://docs.sentry.io/api/alerts/create-a-metric-alert-rule-for-an-organization/)
- [Create an Issue Alert Rule for a Project](https://docs.sentry.io/api/alerts/create-an-issue-alert-rule-for-a-project/)
- [Releases](https://docs.sentry.io/api/releases/)
- [Retrieve Release Health Session Statistics](https://docs.sentry.io/api/releases/retrieve-release-health-session-statistics/)
- [Data Scrubbing](https://docs.sentry.io/product/data-management-settings/scrubbing/)
- [PII and Data Scrubbing in Relay Static Mode](https://docs.sentry.io/product/relay/modes/pii-and-data-scrubbing/)
- [Update an Organization](https://docs.sentry.io/api/organizations/update-an-organization/)
