# Provisioning Credential Capture, Rotation, and Secret Storage Policy

Generated on `2026-04-18` for `pc_0033`.

This policy defines the canonical handling model for provisioning credentials used by the governed browser-automation workspace under [`automation/provisioning/`](../../automation/provisioning/README.md). It closes the remaining gap between the repository's existing secret law and the concrete provisioning actions that later cards will perform.

## Scope

This policy governs how Taxat provisioning obtains, enters, stores, rotates, attests, redacts, retires, and audits:

- HMRC Developer Hub account aliases and password references
- activation inbox or mail-channel references used for account verification
- MFA and recovery-material references
- HMRC sandbox client IDs and client-secret versions
- callback secret or callback-signing key references
- manual-checkpoint artifacts created during secret-entry steps
- sandbox test-user credential bundles
- browser `storageState` references if persistence is explicitly allowed
- vault bootstrap roles or bootstrap tokens used by provisioning agents
- redaction dictionaries and detection patterns
- break-glass recovery credentials

The policy does **not** permit raw authority access or refresh tokens outside the governed vault boundary, and it does **not** authorize product-runtime sign-in automation.

## Canonical Security Law

This policy is subordinate to the repository's existing algorithm contracts:

- [`Algorithm/security_and_runtime_hardening_contract.md`](../../Algorithm/security_and_runtime_hardening_contract.md)
- [`Algorithm/deployment_and_resilience_contract.md`](../../Algorithm/deployment_and_resilience_contract.md)
- [`Algorithm/authority_interaction_protocol.md`](../../Algorithm/authority_interaction_protocol.md)
- [`Algorithm/northbound_api_and_session_contract.md`](../../Algorithm/northbound_api_and_session_contract.md)
- [`Algorithm/data_model.md`](../../Algorithm/data_model.md)
- [`Algorithm/schemas/secret_version.schema.json`](../../Algorithm/schemas/secret_version.schema.json)
- [`docs/analysis/31_environment_tenant_authority_profile_catalog.md`](../analysis/31_environment_tenant_authority_profile_catalog.md)
- [`automation/provisioning/docs/run_evidence_contract.md`](../../automation/provisioning/docs/run_evidence_contract.md)

The referenced shared operating contract `shared_operating_contract_0030_to_0037.md` is still absent, so this task grounded itself directly in the named contracts above plus the official HMRC and OWASP references listed below.

## Current Official External Guidance

Checked on `2026-04-18`:

- HMRC credentials guidance: the Developer Hub credentials page states that the client secret is equivalent to a password, should not be stored in plain text, should be rotated regularly, and that an application may hold up to `5` active client secrets at a time.
  Source: [HMRC Credentials](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/credentials)
- HMRC sandbox guidance: sandbox credentials are environment-specific, the sandbox base URL is `https://test-api.service.hmrc.gov.uk`, sandbox applications are deleted after `30` days if unused since creation or `6` months after later inactivity, and sandbox user-restricted flows rely on test users.
  Source: [HMRC Testing in the Sandbox](https://developer.service.hmrc.gov.uk/api-documentation/docs/testing)
- HMRC test-user guidance: test users are unique, reusable, may be shared across applications, and are automatically deleted after `3` months / `90` days of inactivity.
  Source: [HMRC Test Users, Test Data and Stateful Behaviour](https://developer.service.hmrc.gov.uk/api-documentation/docs/testing/test-users-test-data-stateful-behaviour)
- HMRC user-restricted authorisation guidance: user-restricted access tokens last `4` hours, refresh tokens are single-use, the refresh window ends after `18` months, the journey must not be altered, and the client secret must not be sent in the authorisation request.
  Source: [HMRC User-Restricted Endpoints](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints)
- HMRC application-restricted guidance: the token request body carries `client_secret`, the access token lifetime is `4` hours, and HMRC explicitly warns that the `client_secret` is embedded in source code and may be discoverable unless it is managed carefully.
  Source: [HMRC Application-Restricted Endpoints](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/application-restricted-endpoints)
- HMRC fraud-prevention guidance: the fraud-prevention guide version currently exposed by HMRC is `3.3`, issued `27 January 2025`, and still states that required header data is mandatory for MTD VAT and MTD ITSA APIs, with fines or API blocking possible after continued incorrect or missing submission.
  Sources: [HMRC Fraud Prevention Guide](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/), [HMRC Web Application via Server Header Set](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/)
- OWASP guidance: secrets should be centralized, lifecycle-managed, least-privilege scoped, attributable, rotated, and kept out of pipeline output; logs should exclude passwords, session IDs, access tokens, encryption keys, and high-sensitivity personal data.
  Sources: [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html), [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Policy Summary

### 1. Storage Boundary

- Raw provisioning secrets SHALL live only in a governed secret manager or token vault rooted in the later `pc_0049` KMS/HSM boundary.
- Repo-tracked files SHALL contain only aliases, vault references, hashes, IDs, lineage refs, policy-profile refs, attestation refs, and cutover evidence IDs.
- No raw secret value may be written to:
  - repo-tracked source files
  - markdown docs or JSON artifacts
  - Playwright traces
  - screenshots
  - DOM snapshots
  - HTML reports
  - CI stdout or stderr
  - shell history
  - browser `localStorage`, `sessionStorage`, or uncontrolled cookies
- Browser `storageState` is treated as secret material. If persisted at all, it SHALL be stored only as a vault-governed opaque ref with explicit retention and purge controls.

### 2. Classification

The provisioning pack uses these classifications:

- `LOW`: metadata or detection material whose disclosure is undesirable but not equivalent to a bearer secret
- `SENSITIVE`: credential-adjacent metadata or sandbox-only credentials with bounded blast radius
- `HIGHLY_SENSITIVE`: values that can directly unlock provider or runtime operations if misused
- `CRITICAL`: break-glass, bootstrap, or multi-environment credentials that can bypass or rebind established safety boundaries

### 3. Capture Channels

Allowed capture channels are explicit and finite:

- `VAULT_SEEDING_BY_BOOTSTRAP_ROLE`
- `MANUAL_SECURE_ENTRY_AT_CHECKPOINT`
- `PROVIDER_ONE_TIME_REVEAL_CAPTURE`
- `API_GENERATED_SECRET_INGEST`
- `SANDBOX_TEST_USER_API_RESPONSE_CAPTURE`
- `BREAK_GLASS_DUAL_CONTROL_ENTRY`
- `GENERATED_LOCAL_REDACTION_RULESET`

Everything else is prohibited by default. In particular:

- pasting raw secrets into repo files is prohibited
- copying raw secrets into chat, tickets, or email summaries is prohibited
- recovering a secret from a screenshot or Playwright trace is prohibited
- using preview or CI environments as stable capture channels is prohibited

### 4. Manual Checkpoint Rule

Manual secret entry SHALL happen only through an explicit checkpoint step in the provisioning workspace.

At such a checkpoint:

- screenshot capture SHALL be `SUPPRESS`
- Playwright trace capture SHALL be `SUPPRESS`
- DOM snapshot capture SHALL be `SUPPRESS`
- general logs SHALL be `METADATA_ONLY`
- clipboard or download artifacts SHALL be treated as contaminated until purged
- the resumed run SHALL record only the checkpoint ID, operator alias, timestamp, and post-entry verification evidence

### 5. Rotation Rule

All rotatable provisioning secrets SHALL follow a `SecretVersion`-compatible lifecycle:

1. issue or ingest new version
2. attest lineage, owner, and namespace
3. activate only after verification
4. begin cutover
5. verify dependent systems on the new version
6. retire the old version with explicit historical-read posture if applicable
7. revoke immediately on incident

For HMRC client secrets specifically:

- HMRC currently permits up to `5` active client secrets
- Taxat policy is stricter:
  - steady state target is `1`
  - planned cutover maximum is `2`
  - emergency overlap above `2` requires Security approval and explicit evidence
- the lawful cutover order is:
  - generate new secret
  - vault the new version
  - update dependent secret refs
  - verify token exchange or callback validation
  - attest cutover completion
  - retire the old version

### 6. Audit and Evidence Rule

Every provisioning secret action SHALL emit evidence that proves the action occurred without persisting the raw value:

- `vault_write_receipt_ref`
- `secret_version_ref`
- `attestation_ref`
- `operator_alias`
- `environment_ref`
- `namespace_ref`
- `cutover_verification_ref`
- `revocation_or_retirement_ref`

Evidence is admissible only if it is sanitized and lineage-bound.

## Required Secret Classes

The canonical machine-readable inventory is in [`data/security/provisioning_secret_inventory.json`](../../data/security/provisioning_secret_inventory.json). The required classes are:

| Secret Class | Classification | Default Owner | Versioned |
| --- | --- | --- | --- |
| `developer_hub_account_alias` | `SENSITIVE` | `ENGINEERING` | No |
| `developer_hub_password_ref` | `HIGHLY_SENSITIVE` | `ENGINEERING` | Yes |
| `developer_hub_activation_channel_ref` | `HIGHLY_SENSITIVE` | `ENGINEERING` | Yes |
| `developer_hub_mfa_recovery_material_ref` | `HIGHLY_SENSITIVE` | `SECURITY_AND_AUTHORITY_OPERATIONS` | Yes |
| `hmrc_sandbox_client_id_ref` | `SENSITIVE` | `SECURITY_AND_AUTHORITY_OPERATIONS` | No |
| `hmrc_sandbox_client_secret_version_ref` | `HIGHLY_SENSITIVE` | `SECURITY_AND_AUTHORITY_OPERATIONS` | Yes |
| `hmrc_callback_binding_secret_ref` | `HIGHLY_SENSITIVE` | `SECURITY_AND_AUTHORITY_OPERATIONS` | Yes |
| `manual_checkpoint_secret_entry_artifact_ref` | `SENSITIVE` | `ENGINEERING` | No |
| `provisioning_browser_storage_state_ref` | `HIGHLY_SENSITIVE` | `ENGINEERING` | Yes |
| `sandbox_test_user_credential_bundle_ref` | `SENSITIVE` | `ENGINEERING` | Yes |
| `vault_bootstrap_role_or_token_ref` | `CRITICAL` | `PLATFORM_SECURITY` | Yes |
| `provisioning_redaction_dictionary_ref` | `LOW` | `PLATFORM_SECURITY` | No |
| `break_glass_recovery_credential_ref` | `CRITICAL` | `BREAK_GLASS_SECURITY_ADMIN` | Yes |

## Environment and Namespace Binding

This policy reuses the namespace vocabulary created by `pc_0031`:

- local provisioning capture: `sec_local_provisioning_sandbox`
- sandbox authority namespaces: `sec_sandbox_web_authority`, `sec_sandbox_desktop_authority`, `sec_sandbox_batch_authority`
- production-like or live authority namespaces remain separate by environment and connection method
- CI and review namespaces are explicitly non-provider-trusted and SHALL NOT hold provisioning secrets with live or reusable blast radius

The unresolved roadmap ordering tension remains explicit:

- `pc_0038` exports HMRC credentials into vault-ready records
- `pc_0049` provisions the secrets-manager and KMS/HSM root

Until `pc_0049` exists, the only lawful posture is:

- use this policy to predeclare namespaces, naming, evidence, and cutover law
- allow local provisioning only through checkpointed operator entry and ephemeral secure handling
- forbid any repo-local or CI-local plaintext fallback

## Redaction and Artifact Suppression

The provisioning workspace SHALL use the rule pack in [`data/security/redaction_and_log_sanitization_rules.json`](../../data/security/redaction_and_log_sanitization_rules.json).

Minimum mandatory behavior:

- redact or suppress:
  - passwords
  - client secrets
  - callback shared secrets
  - OAuth authorization codes
  - access tokens
  - refresh tokens
  - cookies and session identifiers
  - one-time passcodes and recovery codes
  - test-user passwords
  - inbox activation links
- general logs may retain:
  - class IDs
  - secret-version refs
  - vault refs
  - operator aliases
  - rotation state
  - sanitized correlation IDs
- screenshot or DOM capture on secret-entry or one-time-reveal steps defaults to `SUPPRESS`, not `REDACT`

## Bootstrap Seeding Contract

The bootstrap model is declared in [`data/security/bootstrap_secret_seeding_contract.json`](../../data/security/bootstrap_secret_seeding_contract.json).

The core rule is simple:

- environments receive only the minimum secret material they need
- provisioning captures and runtime consumption are separate concerns
- local authoring, CI, and preview environments SHALL NOT receive reusable provider credentials
- bootstrap roles must be short-lived, attributable, and namespace-scoped

## Incident and Revocation Posture

Any suspected disclosure or unsafe artifact capture SHALL trigger:

1. checkpoint stop or run abort
2. secret-version revocation or forced reset where relevant
3. artifact quarantine and purge from local reports or downloads
4. rotation evidence with explicit supersession
5. audit documentation naming the affected namespace, lineage, operator alias, and incident ref

Revoked versions remain auditable but not usable.

## One-Sentence Summary

Provisioning secrets are never treated as casual setup data: they enter only through governed channels, live only behind namespace-scoped vault boundaries, rotate through `SecretVersion`-compatible cutover, and leave behind only sanitized lineage and attestation evidence.
