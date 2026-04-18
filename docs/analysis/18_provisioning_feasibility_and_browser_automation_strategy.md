# Provisioning Feasibility and Browser Automation Strategy

This document turns the dependency register into a machine-followable provisioning order and an environment-specific browser automation posture.

## Provisioning DAG Layers

### Layer 0

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX | ROADMAP_IMPLIED | ControlPlaneProvisioning | Freeze the canonical environment, tenant, authority-profile, callback-host, and partition matrix that all later registrations consume. |
| KMS_HSM_ROOT_OF_TRUST | ALGORITHM_EXPLICIT | PlatformSecurity | Provide the root cryptographic trust boundary for envelope encryption, secret protection, and signing-key custody. |

### Layer 1

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| APPEND_ONLY_AUDIT_STORE | ALGORITHM_EXPLICIT | AuditAndEvidence | Persist immutable compliance-significant events and audit evidence outside disposable telemetry streams. |
| BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS | ROADMAP_IMPLIED | PlatformAutomation | Provide a headed browser automation harness for third-party provisioning, evidence capture, and repeatable console operations. |
| CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION | ALGORITHM_EXPLICIT | ReleaseEngineering | Store deployable artifacts and provide vulnerability scanning, signing, provenance attestation, and release-admission evidence. |
| DNS_TLS_WAF_AND_EDGE_DELIVERY | ROADMAP_IMPLIED | PlatformNetworking | Provide public DNS, TLS termination or certificate automation, callback host stability, and protective edge controls for exposed endpoints. |
| OBJECT_STORAGE_AND_QUARANTINE_BUCKETS | ALGORITHM_EXPLICIT | ArtifactStorage | Store evidence artifacts, uploads, exports, quarantined files, and other large binary or retained objects. |
| OPENTELEMETRY_COLLECTION_AND_BACKEND | ALGORITHM_EXPLICIT | Observability | Collect and persist traces, metrics, and logs with mandatory correlation keys and controlled access boundaries. |
| PRIMARY_TRANSACTIONAL_CONTROL_STORE | ALGORITHM_EXPLICIT | ControlPlaneRuntime | Persist manifests, workflow truth, authority state, and control-plane records with transactional guarantees. |
| SECRETS_MANAGER_OR_TOKEN_VAULT | ALGORITHM_EXPLICIT | PlatformSecurity | Hold raw authority tokens, app secrets, and integration credentials behind audited policy and rotation boundaries. |

### Layer 2

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| AUTHORITY_DEVELOPER_HUB_WORKSPACE | ROADMAP_IMPLIED | AuthorityGateway | Establish the authority provider account and project workspace used to manage application registrations and provider-side settings. |
| CACHE_AND_STREAM_RESUME_STORE | ALGORITHM_EXPLICIT | ReadModelDelivery | Hold resumable stream cursors, disposable caches, and other rebuildable acceleration state without widening security or truth boundaries. |
| CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW | ROADMAP_IMPLIED | ReleaseEngineering | Provide isolated automation runners, gated secret injection, and preview environments for repeatable delivery and provisioning verification. |
| EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN | ROADMAP_IMPLIED | Notifications | Provision the optional external email channel used for customer notifications and support communication where the product elects to send email. |
| EXTERNAL_IDENTITY_PROVIDER_FEDERATION | ALGORITHM_EXPLICIT | IdentityAndAccess | Provide external identity federation, short-lived sessions, and step-up-capable authentication for browser and native surfaces. |
| HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION | OPTIONAL_VENDOR_SELECTED | SupportOperations | Optionally sync contextual help or operator-assist workflows into an external helpdesk or CRM system. |
| OCR_DOCUMENT_EXTRACTION_CAPABILITY | OPTIONAL_VENDOR_SELECTED | DocumentIntake | Optionally provide document text extraction when the chosen implementation uses OCR to assist intake or evidence review. |
| PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT | ROADMAP_IMPLIED | Notifications | Provision external device-messaging credentials if the chosen native or multi-device embodiment needs remote push delivery. |
| QUEUE_OR_BROKER_COORDINATION_FABRIC | ALGORITHM_EXPLICIT | AsyncRuntime | Coordinate worker execution, inbox/outbox delivery, and asynchronous integration flows without becoming durable legal truth. |
| SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE | OPTIONAL_VENDOR_SELECTED | Observability | Provide a convenience layer for grouped error triage, release markers, and client-surface crash capture beyond the mandatory telemetry baseline. |

### Layer 3

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| AUTHORITY_PRODUCTION_APP_REGISTRATION | ROADMAP_IMPLIED | AuthorityGateway | Register the production authority client and approval boundary used for live obligations, filings, and reconciliations. |
| AUTHORITY_SANDBOX_APP_REGISTRATION | ROADMAP_IMPLIED | AuthorityGateway | Register the sandbox authority client used for non-production obligations, calculation, and submission flows. |
| EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION | ROADMAP_IMPLIED | Notifications | Configure message templates, delivery event webhooks, and callback authentication for the selected email provider. |
| IDP_TENANT_AND_APPLICATION_CLIENTS | ROADMAP_IMPLIED | IdentityAndAccess | Provision concrete IdP tenants and client registrations for web, native, and service-principal surfaces. |
| MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN | ALGORITHM_EXPLICIT | DesktopPlatform | Provide the Apple-side signing, notarization, and local-trust chain needed to ship the native macOS operator workspace safely. |
| MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY | ALGORITHM_EXPLICIT | DocumentIntake | Scan uploaded files before download or customer-visible publication, quarantine unsafe content, and preserve typed scan-state evidence. |

### Layer 4

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION | ROADMAP_IMPLIED | AuthorityGateway | Bind authority apps to the exact redirect URIs, callback endpoints, and granted scopes required by the controlled authority gateway. |
| DESKTOP_RELEASE_AND_UPDATE_CHANNEL | ALGORITHM_EXPLICIT | DesktopPlatform | Distribute signed desktop builds, segment update channels, and support revocation or kill-switch behavior for the macOS operator workspace. |
| IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES | ROADMAP_IMPLIED | IdentityAndAccess | Bind product authorization semantics to the concrete IdP configuration for scopes, MFA, step-up, session lifetime, and role posture. |
| INTERNAL_PRODUCT_READ_MODELS_STREAMS_AND_UPLOAD_APIS | INTERNAL_ONLY | ReadModelDelivery | Expose governed internal read surfaces, stream/reconnect flows, and upload-session APIs to browser and native clients. |

### Layer 5

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS | ROADMAP_IMPLIED | AuthorityGateway | Bind provider-required fraud-prevention and environment-profile metadata to each authority client and execution environment. |
| INTERNAL_NORTHBOUND_COMMAND_AND_SESSION_APIS | INTERNAL_ONLY | ProductAPI | Expose internal command ingress, session continuity, anti-CSRF posture, and browser/native state coordination for product clients. |

### Layer 6

| Dependency | Classification | Owner | Why It Lives Here |
| --- | --- | --- | --- |
| AUTHORITY_API_PROVIDER_INTERFACE | ALGORITHM_EXPLICIT | AuthorityGateway | Support live authority calculation, submission, duplicate handling, reconciliation, and callback ingress against the external authority of record. |

## Browser Automation Environment Profiles

| Environment | Overall Feasibility | Tooling | Secret Source | Recommended Use |
| --- | --- | --- | --- | --- |
| local-dev | SUPPORTED_WITH_MANUAL_CHECKPOINTS | headed Playwright with operator-attended sessions | vault-synced local env or operator-injected short-lived secrets | first-pass sandbox provisioning, manual checkpoint capture, callback flow debugging with tunnels or temporary hosts |
| ci | LIMITED | headless or virtual-display Playwright runners | CI-injected short-lived vault material | repeatable smoke checks against already-provisioned sandboxes, non-interactive provider console drift detection where MFA is bypassed by service account |
| ephemeral-review | NOT_RECOMMENDED | preview-host browser automation only when third-party host stability is irrelevant | review-app secrets with strict scope limits | internal product smoke tests only, never the canonical target for provider callback registration |
| staging | SUPPORTED | headed and headless Playwright against stable long-lived domains | staging vault scopes and environment-specific service accounts | primary host for stable callback registration, repeatable full provisioning smoke, authority and IdP console confirmation after production-like config changes |

## Dependency-Specific Browser Automation Feasibility

| Dependency | Local Dev | CI | Ephemeral Review | Staging | Blocking Classes |
| --- | --- | --- | --- | --- | --- |
| AUTHORITY_DEVELOPER_HUB_WORKSPACE | SUPPORTED_WITH_MANUAL_CHECKPOINTS | LIMITED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | MFA_OR_CAPTCHA_CHECKPOINT |
| AUTHORITY_SANDBOX_APP_REGISTRATION | SUPPORTED_WITH_MANUAL_CHECKPOINTS | LIMITED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | MFA_OR_CAPTCHA_CHECKPOINT |
| AUTHORITY_PRODUCTION_APP_REGISTRATION | NOT_RECOMMENDED | NOT_RECOMMENDED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | MFA_OR_CAPTCHA_CHECKPOINT, STABLE_CALLBACK_HOST_REQUIRED |
| AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION | LIMITED | LIMITED | NOT_RECOMMENDED | SUPPORTED | STABLE_CALLBACK_HOST_REQUIRED |
| IDP_TENANT_AND_APPLICATION_CLIENTS | SUPPORTED_WITH_MANUAL_CHECKPOINTS | LIMITED | LIMITED | SUPPORTED | MFA_OR_CAPTCHA_CHECKPOINT |
| EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN | LIMITED | NOT_RECOMMENDED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | STABLE_CALLBACK_HOST_REQUIRED |
| EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION | LIMITED | LIMITED | NOT_RECOMMENDED | SUPPORTED | STABLE_CALLBACK_HOST_REQUIRED |
| PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT | LIMITED | NOT_RECOMMENDED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | MFA_OR_CAPTCHA_CHECKPOINT |
| SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |  |
| HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION | SUPPORTED_WITH_MANUAL_CHECKPOINTS | LIMITED | NOT_RECOMMENDED | SUPPORTED_WITH_MANUAL_CHECKPOINTS | MFA_OR_CAPTCHA_CHECKPOINT |
| OCR_DOCUMENT_EXTRACTION_CAPABILITY | SUPPORTED | SUPPORTED | LIMITED | SUPPORTED |  |
| MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY | SUPPORTED | SUPPORTED | LIMITED | SUPPORTED |  |

## Practical Automation Rules

- Use `staging` as the canonical host for authority and IdP callback registrations. It is the only listed environment that is both stable and safely non-production.
- Treat `ephemeral-review` as unsuitable for third-party callback registration. Review environments are for internal smoke and UI verification, not authority-control-plane truth.
- When a provider console forces MFA, CAPTCHA, or human review, stop and capture evidence instead of forcing a partial automation through brittle hacks.
- Vault-injected secrets or short-lived sessions are the only acceptable inputs for automation. Browser profiles may persist transient state but must not become the source of truth for raw credentials.

## Parallelization Notes

- Storage, queue, cache, observability, and key-management infrastructure can be provisioned largely in parallel after the environment matrix is frozen.
- Authority, IdP, email, and support integrations share browser-automation and secret-boundary prerequisites but can fan out once those prerequisites exist.
- macOS signing and the desktop update channel stay late in the DAG because they depend on CI, key custody, and distribution hosts.
- Internal northbound APIs appear as downstream consumers in the DAG only to make clear what external prerequisites they rely on; they are not third-party procurement items.

## Remaining Decision Pressure

| Dependency | Why Decision Is Still Open |
| --- | --- |
| EXTERNAL_IDENTITY_PROVIDER_FEDERATION | Federated product identity through OIDC/OAuth 2.0 or equivalent is an explicit runtime-security requirement. |
| IDP_TENANT_AND_APPLICATION_CLIENTS | The roadmap explicitly schedules creation of the IdP tenant and application clients as a distinct provisioning step. |
| IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES | The roadmap separately schedules roles, scopes, MFA, step-up, and session-policy configuration inside the chosen IdP. |
| EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN | The roadmap explicitly calls for a delivery-provider account and sender-domain setup, while the collaboration contract only makes email optional. |
| EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION | The roadmap separately schedules template, webhook, and delivery-callback configuration after the account exists. |
| PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT | The roadmap explicitly names push or device messaging, but the algorithm corpus treats external push as an embodiment-dependent extension rather than a universal requirement. |
| SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE | The algorithm explicitly requires OpenTelemetry-compatible telemetry, but the checklist's separate error-monitoring workspace is an optional overlay rather than the core observability truth store. |
| HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION | The roadmap marks the helpdesk workspace as conditional ('if selected'), and the algorithm models help as a product capability rather than a required external vendor. |
| OCR_DOCUMENT_EXTRACTION_CAPABILITY | The corpus keeps generic OCR outside the core invention boundary and the roadmap explicitly allows either a managed OCR project or a self-hosted decision. |
| MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY | The upload and collaboration contracts make scan/quarantine gating mandatory even though the final vendor or self-host strategy is left open. |
| SECRETS_MANAGER_OR_TOKEN_VAULT | The runtime topology and hardening contract explicitly require a governed token vault or secret store for raw authority credentials. |
| KMS_HSM_ROOT_OF_TRUST | The hardening contract explicitly roots envelope keys and protected secrets in KMS/HSM-class controls. |
| PRIMARY_TRANSACTIONAL_CONTROL_STORE | The deployment topology explicitly requires a primary control store as the durable system of record. |
| APPEND_ONLY_AUDIT_STORE | The deployment topology and observability contract explicitly separate append-only audit evidence from mutable operational telemetry. |
| OBJECT_STORAGE_AND_QUARANTINE_BUCKETS | The runtime topology explicitly requires an object store, and the upload contracts require quarantine-aware artifact segregation. |
| QUEUE_OR_BROKER_COORDINATION_FABRIC | The runtime topology explicitly requires a queue/broker for outbox, inbox, and worker coordination, even though it may never be the system of record. |
| CACHE_AND_STREAM_RESUME_STORE | Disposable caches and resume stores are explicit runtime components, with strict cache-isolation and rebuild rules. |
| OPENTELEMETRY_COLLECTION_AND_BACKEND | The observability contract explicitly grounds telemetry in OpenTelemetry-style traces, metrics, and logs while separating them from audit evidence. |
| CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION | Build signing, SBOMs, provenance attestations, and release admission checks are explicit hardening requirements. |
| DNS_TLS_WAF_AND_EDGE_DELIVERY | TLS for external traffic is explicit, while the checklist packages DNS, WAF, and edge delivery into the practical provisioning surface. |
| CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW | The roadmap explicitly schedules CI/CD runners, environment secrets, and ephemeral preview accounts as a combined control-plane dependency. |
| MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN | The native blueprint, deployment contract, and security gates all explicitly require code signing, notarization, hardened runtime, and Keychain-safe storage for shipped macOS builds. |
| DESKTOP_RELEASE_AND_UPDATE_CHANNEL | The deployment topology explicitly names a desktop release/update channel with staged distribution and emergency revocation. |
