# HMRC Fraud-Prevention Validation Runbook

This runbook governs the executable HMRC fraud-prevention profile work added for `pc_0037`.

## Scope

- lock the lawful HMRC fraud-prevention header sets for Taxat's active interactive sandbox paths
- bind every active sandbox and pre-production provider profile back to the correct fraud-header profile
- seed later `authority_sandbox_coverage_contract_or_null` evidence with exact profile and operation-family breadth
- validate profile shape safely in fixture mode now, and provide a live HMRC sandbox validator path for later cards

Out of scope:

- claiming full `TV-91` or `TV-91A` completion
- validating batch/direct HMRC traffic in this card
- exporting client IDs, client secrets, or application-restricted validator tokens
- persisting raw fraud-header values in repo-tracked data

## Current HMRC Baseline Revalidated On 2026-04-18

- HMRC still treats fraud-prevention headers as legally required for MTD Income Tax flows and can fine or block software that keeps sending incorrect or missing data.
- HMRC still chooses the required header set by connection method.
- HMRC's Test Fraud Prevention Headers API still exposes:
  - `GET /test/fraud-prevention-headers/validate`
  - `GET /test/fraud-prevention-headers/{api}/validation-feedback`
- The validator still runs only in sandbox at `https://test-api.service.hmrc.gov.uk`.
- Current Taxat architecture remains server-mediated for both interactive surfaces:
  - browser-originated HMRC traffic binds to `WEB_APP_VIA_SERVER`
  - native/macOS-originated HMRC traffic binds to `DESKTOP_APP_VIA_SERVER`

## Checked-In Executable Profiles

- Web via server: `config/authority/hmrc/fraud_profiles/hmrc_web_app_via_server.json`
- Desktop via server: `config/authority/hmrc/fraud_profiles/hmrc_desktop_app_via_server.json`
- Shared schema: `automation/provisioning/src/providers/hmrc/contracts/fraud_header_profile.schema.json`

Each profile records:

- exact header membership
- field-level encoding rules
- collection owner versus serialization owner
- stability expectations
- missing-data posture
- raw-value suppression policy

## Machine-Readable Outputs

- profile matrix: `data/provisioning/hmrc_fraud_prevention_profile_matrix.template.json`
- binding evidence: `data/provisioning/hmrc_sandbox_profile_binding_evidence.template.json`
- authority sandbox seed: `data/provisioning/hmrc_authority_sandbox_seed_matrix.json`

These artifacts intentionally prove only:

- executable profile law exists for the active interactive connection methods
- sandbox and pre-production provider profiles are bound back to those named profiles
- the `FRAUD_HEADER_VALIDATION` controlled edge is seeded now

They intentionally do not claim:

- live API traffic was already exercised for every enabled provider profile
- `validation-feedback` breadth exists yet for every subscribed HMRC API
- batch/direct controlled-edge coverage is complete

## Fixture Validation Doctrine

Default repo-tracked evidence uses fixture-mode synthetic captures.

That means:

- header law, percent encoding, and binding shape are exercised
- raw device or browser truth is not overclaimed
- validation artifacts remain safe to check in

Fixture captures must remain obviously synthetic and documentation-safe. They are not release evidence by themselves.

## Live Sandbox Validation Doctrine

Live HMRC validator calls remain opt-in only.

Before a live run:

1. Recheck HMRC fraud-prevention and connection-method guidance on the same day.
2. Confirm the selected Taxat runtime topology is still server-mediated for the surface you are validating.
3. Supply an application-restricted bearer token for the validator endpoint through a governed secret boundary.
4. Use real captured device/browser values or an explicit missing-data exemption posture. Never fabricate values to force a green result.
5. Keep raw values out of repo-tracked outputs; only sanitized summaries and evidence refs may persist.

## Current Taxat Binding Doctrine

Interactive browser/provider bindings:

- `fph_web_app_via_server`
- captures browser JS and gateway-edge context
- serializes at the controlled authority gateway

Interactive native/provider bindings:

- `fph_desktop_app_via_server`
- captures native runtime and gateway-edge context
- serializes at the controlled authority gateway

Deferred this card:

- `fph_batch_process_direct` stays mapped in the authority profile catalog and seed matrix, but executable batch/direct validation is deferred to later authority-sandbox work

## Later Carry-Forward

Later authority-sandbox work must extend, not replace, these artifacts.

Specifically it must add:

- live `validation-feedback` evidence where applicable
- exact request-identity namespace linkage
- token-rotation coverage
- binding-lineage invalidation coverage
- ambiguous-ingress quarantine coverage
- duplicate-bucket change coverage
- reconciliation-budget exhaustion coverage

## Required Sources

- HMRC fraud-prevention overview: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/>
- HMRC connection methods: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/>
- HMRC web app via server: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/>
- HMRC desktop app via server: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/desktop-app-via-server/>
- HMRC getting it right: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/>
- HMRC Test Fraud Prevention Headers API: <https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0>
- HMRC MTD end-to-end integration guide: <https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html>
