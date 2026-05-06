# External Credential Smoke Runbook

## Purpose

This runbook freezes Taxat's governed smoke-validation matrix for every canonical external credential family.
The matrix proves principal, scope, endpoint, and environment posture with masked evidence only.
It never performs destructive business operations and it never persists raw credential material.

## Execution Posture

- Default execution mode: `SIMULATED_SAFE_NOOP`
- Policy version: `1.0`
- Last verified at: `2026-04-22T22:45:00Z`
- Environments covered: `Local dev`, `CI`, `Preview`, `Sandbox`, `Staging`, `Production`

## Canonical Credential Families

- `authority-oauth-token-bundle`: User-granted HMRC access and refresh tokens remain vault-bound and may only be proved through masked lineage, never ad hoc taxpayer grant playback.
- `hmrc-sandbox-client-credentials`: Sandbox client identity and secret lineage stay attested, environment-bound, and safe for non-destructive token endpoint rehearsal only.
- `hmrc-production-client-credentials`: Production HMRC client material remains export-attested but disabled for unattended grant-bearing smoke execution.
- `idp-federation-signing-and-admin-material`: Tenant-admin and signing-key material must prove the intended control-plane tenant without widening runtime client credentials.
- `idp-application-client-secrets`: Application-client secrets must prove the intended browser and machine client boundaries without exposing raw client material.
- `email-provider-api-key-and-domain-proof`: Server-token and sender-domain proof stay environment-scoped, DNS-aware, and lawful for read-only verification only.
- `email-webhook-signing-secret`: Webhook authentication remains explicit, replay-aware, and bound to the expected ingress host instead of provider memory.
- `device-messaging-server-key`: Push control-plane material must prove the intended project, APNs bridge state, and internal-only delivery scope without sending a live device push.
- `error-monitoring-ingest-token`: Monitoring overlay credentials stay secondary to first-party telemetry law and may only prove org, project, and ingest posture with masked evidence.
- `helpdesk-api-token`: Support-provider credentials remain absent until a workspace is explicitly selected; the smoke matrix must preserve that gap instead of inventing a token.
- `ocr-service-credential`: Document-extraction credentials remain blocked until provider choice is explicit and safe metadata-only assertions can be tied to that choice.
- `scanner-service-credential`: Scanning credentials remain blocked until the platform or provider decision resolves and a harmless identity assertion can be made.
- `vault-admin-and-app-auth-boundary`: The secrets-manager admin and app auth boundary is frozen, but live provider choice remains unresolved and must fail closed in the smoke matrix.
- `kms-root-key-admin-role`: Root-key admin posture is serialized, but no live KMS provider is selected yet, so smoke validation must stop at the governed gap marker.
- `primary-db-app-and-migration-roles`: Database role law exists, but the platform provider is still unresolved, so smoke runs may only preserve alias and role expectations.
- `audit-store-write-role`: Append-only audit writer credentials remain explicit, but live datastore provider choice is still unresolved and must stay blocked.
- `object-storage-service-role`: Object-store role boundaries and bucket topology are frozen, but provider choice is unresolved and remains blocked in smoke execution.
- `broker-client-auth-credential`: Broker identity remains transport-only and provider-unresolved, so smoke validation must preserve the explicit gap instead of inventing connectivity.
- `cache-auth-token-or-mtls-identity`: Cache identity stays strictly non-authoritative and provider-unresolved, so smoke results must keep the block typed and environment-bound.
- `otel-ingest-identity`: Collector and backend identity law is machine-readable, but live platform selection remains open and must fail closed.
- `registry-and-signing-material`: The recommended registry and signing stack is encoded, but live provider selection remains pending and the smoke matrix must preserve that governance boundary.
- `dns-api-and-cert-automation-identity`: Edge control-plane identity is selected and may prove zone, certificate, and preview-domain posture through non-destructive metadata reads only.
- `ci-runner-and-preview-deploy-token`: CI and preview identities prove subject, audience, broker role, and environment scope without minting broad long-lived delivery secrets.
- `apple-signing-certificate-and-notary-key`: Apple signing and notarization credentials remain tightly controlled and disabled for unattended smoke execution outside a native release window.
- `desktop-update-publishing-identity`: Native update-publishing identity remains candidate-bound and disabled outside explicit release windows.

## Blocked Provider Families

- `ocr-service-credential`
- `scanner-service-credential`
- `vault-admin-and-app-auth-boundary`
- `kms-root-key-admin-role`
- `primary-db-app-and-migration-roles`
- `audit-store-write-role`
- `object-storage-service-role`
- `broker-client-auth-credential`
- `cache-auth-token-or-mtls-identity`
- `otel-ingest-identity`
- `registry-and-signing-material`

## Manual Checkpoints

- `CAPTCHA`: Anti-bot or CAPTCHA challenge detected. Resume rule: Require operator completion, re-read the page identity, and confirm session continuity before any later action.
- `MFA_REQUIRED`: A provider MFA or one-time-code challenge is active. Resume rule: Pause, capture the masked checkpoint state, and resume only after a fresh route and session revalidation.
- `STEP_UP_REQUIRED`: The provider requires higher-assurance identity for this path. Resume rule: Resume only after re-reading the exact post-step-up route and proving the same smoke target remains selected.
- `EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED`: Email or domain verification is pending before the control plane can proceed. Resume rule: Wait for provider-side verification to settle, then re-run the same non-destructive smoke assertion.
- `SUSPICIOUS_LOGIN_REVIEW`: The provider flagged the session for suspicious-login review. Resume rule: Require operator review and a new session before any later smoke action resumes.
- `OPERATOR_APPROVAL_REQUIRED`: A provider or release boundary requires explicit operator approval. Resume rule: Keep the smoke row open, capture the safe approval reference, and resume only during an approved window.

## Evidence Posture

- Retained safe fields: safe_credential_ref, vault_metadata_ref, credential_fingerprint_or_alias, principal_identity, scope_or_role_identity, endpoint_identifier, masked_http_status, masked_http_body_excerpt, checkpoint_reason_code, evidence_ref
- Forbidden persisted fields: raw_secret, raw_bearer_token, raw_refresh_token, raw_session_cookie, raw_authorization_header, raw_provider_page_html, raw_browser_storage, unredacted_screenshot
- Evidence root: `artifacts/smoke/external-credential-evidence`

## Operating Rules

- Never persist raw tokens, cookies, private keys, or provider page HTML.
- Keep production HMRC and native-release identities disabled unless an explicit release window opens.
- Treat provider-selection gaps as typed blocked outcomes, not silent omissions.
- Treat principal mismatch, scope mismatch, transient failure, and provider-environment mismatch as distinct outcomes.
- When a checkpoint appears, capture masked evidence, emit `MANUAL_CHECKPOINT_REQUIRED`, and stop.
