# External Services, APIs, and Control-Plane Dependencies

This pack closes the corpus gap where capability requirements, third-party control planes, and internal-only northbound APIs were previously scattered across runtime, security, authority, and roadmap materials.

## Summary

- Total dependency rows: `33`
- `ALGORITHM_EXPLICIT`: `14`
- `ROADMAP_IMPLIED`: `14`
- `OPTIONAL_VENDOR_SELECTED`: `3`
- `INTERNAL_ONLY`: `2`
- Dependencies with governed credentials or secrets: `25`

## Classification Law

- `ALGORITHM_EXPLICIT`: the corpus names the capability boundary directly.
- `ROADMAP_IMPLIED`: the provisioning checklist turns a real control-plane prerequisite into a concrete setup task.
- `OPTIONAL_VENDOR_SELECTED`: the roadmap or corpus allows the capability to be selected or omitted depending on embodiment or procurement.
- `INTERNAL_ONLY`: the surface is part of Taxat's own product API and must not be mistaken for a third-party dependency.

## Algorithm-Explicit Capabilities

| Dependency | Category | MVP | Owner | Automation | Candidate Service Types |
| --- | --- | --- | --- | --- | --- |
| AUTHORITY_API_PROVIDER_INTERFACE | EXTERNAL_AUTHORITY_API | MVP_REQUIRED | AuthorityGateway | PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS | government tax API, authority OAuth API, authority callback ingress boundary |
| EXTERNAL_IDENTITY_PROVIDER_FEDERATION | IDENTITY_AND_ACCESS | MVP_REQUIRED | IdentityAndAccess | FULLY_AUTOMATABLE | OIDC provider, enterprise identity tenant, federation service |
| MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY | DOCUMENT_PROCESSING | MVP_REQUIRED | DocumentIntake | MANUAL_OR_PROCUREMENT_GATED | managed malware scanning API, self-hosted antivirus scanner, object-event-driven scanning worker |
| SECRETS_MANAGER_OR_TOKEN_VAULT | SECRETS_AND_KEYS | MVP_REQUIRED | PlatformSecurity | FULLY_AUTOMATABLE | secret manager, token vault |
| KMS_HSM_ROOT_OF_TRUST | SECRETS_AND_KEYS | MVP_REQUIRED | PlatformSecurity | FULLY_AUTOMATABLE | cloud KMS, managed HSM, platform key-management service |
| PRIMARY_TRANSACTIONAL_CONTROL_STORE | DATASTORE | MVP_REQUIRED | ControlPlaneRuntime | FULLY_AUTOMATABLE | managed PostgreSQL, self-hosted PostgreSQL |
| APPEND_ONLY_AUDIT_STORE | DATASTORE | MVP_REQUIRED | AuditAndEvidence | FULLY_AUTOMATABLE | append-only audit table or store, immutable evidence ledger |
| OBJECT_STORAGE_AND_QUARANTINE_BUCKETS | STORAGE | MVP_REQUIRED | ArtifactStorage | FULLY_AUTOMATABLE | object storage bucket service, blob storage service |
| QUEUE_OR_BROKER_COORDINATION_FABRIC | MESSAGE_COORDINATION | MVP_REQUIRED | AsyncRuntime | FULLY_AUTOMATABLE | message broker, queue service |
| CACHE_AND_STREAM_RESUME_STORE | CACHE_AND_RESUME | MVP_REQUIRED | ReadModelDelivery | FULLY_AUTOMATABLE | cache service, stream resume store |
| OPENTELEMETRY_COLLECTION_AND_BACKEND | OBSERVABILITY | MVP_REQUIRED | Observability | FULLY_AUTOMATABLE | OpenTelemetry collector, trace backend, metric backend, log backend |
| CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION | SUPPLY_CHAIN | MVP_REQUIRED | ReleaseEngineering | FULLY_AUTOMATABLE | container registry, artifact signing service, provenance attestation service |
| MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN | NATIVE_DELIVERY | MVP_REQUIRED | DesktopPlatform | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | Apple developer signing program, notarization service, certificate-management boundary |
| DESKTOP_RELEASE_AND_UPDATE_CHANNEL | NATIVE_DELIVERY | MVP_REQUIRED | DesktopPlatform | PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS | desktop update feed, signed package repository, artifact CDN |

## Roadmap-Implied Provisioning Surfaces

| Dependency | Category | MVP | Owner | Automation | Candidate Service Types |
| --- | --- | --- | --- | --- | --- |
| ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX | CONTROL_PLANE_PREREQUISITE | PROVISIONING_REQUIRED | ControlPlaneProvisioning | FULLY_AUTOMATABLE | environment registry, tenant provisioning manifest, authority profile catalog |
| BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS | AUTOMATION_WORKSPACE | PROVISIONING_REQUIRED | PlatformAutomation | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | Playwright workspace, headed browser runner, automation artifact store |
| AUTHORITY_DEVELOPER_HUB_WORKSPACE | AUTHORITY_CONTROL_PLANE | PROVISIONING_REQUIRED | AuthorityGateway | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | developer portal account, authority app-management console |
| AUTHORITY_SANDBOX_APP_REGISTRATION | AUTHORITY_CONTROL_PLANE | PROVISIONING_REQUIRED | AuthorityGateway | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | authority sandbox app registration, provider-managed OAuth client |
| AUTHORITY_PRODUCTION_APP_REGISTRATION | AUTHORITY_CONTROL_PLANE | PROVISIONING_REQUIRED | AuthorityGateway | MANUAL_OR_PROCUREMENT_GATED | authority production app registration, provider go-live approval workflow |
| AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION | AUTHORITY_CONTROL_PLANE | PROVISIONING_REQUIRED | AuthorityGateway | PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS | authority callback registration, provider scope configuration |
| AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS | AUTHORITY_CONTROL_PLANE | PROVISIONING_REQUIRED | AuthorityGateway | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | authority fraud-prevention binding, provider environment profile validation |
| IDP_TENANT_AND_APPLICATION_CLIENTS | IDENTITY_AND_ACCESS | PROVISIONING_REQUIRED | IdentityAndAccess | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | IdP tenant, OIDC client registration, service-principal registration |
| IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES | IDENTITY_AND_ACCESS | PROVISIONING_REQUIRED | IdentityAndAccess | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | IdP authorization policy set, MFA and step-up policy configuration |
| EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN | NOTIFICATIONS_AND_DELIVERY | MVP_CONDITIONAL | Notifications | MANUAL_OR_PROCUREMENT_GATED | transactional email provider, managed SMTP relay |
| EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION | NOTIFICATIONS_AND_DELIVERY | MVP_CONDITIONAL | Notifications | FULLY_AUTOMATABLE | provider template configuration, delivery webhook configuration |
| PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT | NOTIFICATIONS_AND_DELIVERY | MVP_CONDITIONAL | Notifications | PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS | platform push notification service, device messaging gateway |
| DNS_TLS_WAF_AND_EDGE_DELIVERY | NETWORK_EDGE | PROVISIONING_REQUIRED | PlatformNetworking | PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS | DNS provider, TLS certificate manager, WAF or edge gateway |
| CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW | DELIVERY_AUTOMATION | PROVISIONING_REQUIRED | ReleaseEngineering | FULLY_AUTOMATABLE | CI runner fleet, preview environment platform, deployment orchestrator |

## Optional or Vendor-Selected Dependencies

| Dependency | Category | MVP | Owner | Automation | Candidate Service Types |
| --- | --- | --- | --- | --- | --- |
| SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE | OBSERVABILITY_OVERLAY | MVP_CONDITIONAL | Observability | FULLY_AUTOMATABLE | error-monitoring SaaS, self-hosted error aggregation workspace |
| HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION | SUPPORT_INTEGRATION | MVP_CONDITIONAL | SupportOperations | MANUAL_OR_PROCUREMENT_GATED | helpdesk SaaS, CRM case-management integration |
| OCR_DOCUMENT_EXTRACTION_CAPABILITY | DOCUMENT_PROCESSING | MVP_CONDITIONAL | DocumentIntake | MANUAL_OR_PROCUREMENT_GATED | managed OCR API, self-hosted OCR runtime |

## Internal-Only Surfaces That Must Stay Out of External Procurement

| Dependency | Category | MVP | Owner | Automation | Candidate Service Types |
| --- | --- | --- | --- | --- | --- |
| INTERNAL_NORTHBOUND_COMMAND_AND_SESSION_APIS | INTERNAL_PRODUCT_API | INTERNAL_SURFACE | ProductAPI | INTERNAL_DELIVERY_ONLY | internal HTTP API, internal command gateway, internal session service |
| INTERNAL_PRODUCT_READ_MODELS_STREAMS_AND_UPLOAD_APIS | INTERNAL_PRODUCT_API | INTERNAL_SURFACE | ReadModelDelivery | INTERNAL_DELIVERY_ONLY | internal read-model API, internal stream endpoint, internal upload-session service |

## Critical Distinctions

- Sandbox and production authority registrations are modeled separately. The provider environment is frozen in authority bindings, so later automation must not collapse live and non-live credentials into one record.
- Malware scanning is capability-mandatory because uploads cannot become downloadable or customer-visible until scan posture is explicit. The vendor remains open; the capability does not.
- OCR remains optional and pluggable. The corpus hardens OCR-like connectors when present but does not make them part of the core invention boundary.
- OpenTelemetry collection and backends are mandatory runtime capabilities. A branded error-monitoring workspace is only an optional overlay on top of that baseline.
- Northbound command APIs, read models, stream endpoints, and upload-session surfaces are `INTERNAL_ONLY` and should not appear in vendor procurement or external dependency acquisition plans.

## Open ADR or Procurement Queue

| Dependency | Decision Status | Reason |
| --- | --- | --- |
| EXTERNAL_IDENTITY_PROVIDER_FEDERATION | PROCUREMENT_OR_PLATFORM_CHOICE | Federated product identity through OIDC/OAuth 2.0 or equivalent is an explicit runtime-security requirement. |
| IDP_TENANT_AND_APPLICATION_CLIENTS | PROCUREMENT_OR_PLATFORM_CHOICE | The roadmap explicitly schedules creation of the IdP tenant and application clients as a distinct provisioning step. |
| IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES | PROCUREMENT_OR_PLATFORM_CHOICE | The roadmap separately schedules roles, scopes, MFA, step-up, and session-policy configuration inside the chosen IdP. |
| EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN | OPTIONAL_VENDOR_SELECTION | The roadmap explicitly calls for a delivery-provider account and sender-domain setup, while the collaboration contract only makes email optional. |
| EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION | OPTIONAL_VENDOR_SELECTION | The roadmap separately schedules template, webhook, and delivery-callback configuration after the account exists. |
| PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT | OPTIONAL_VENDOR_SELECTION | The roadmap explicitly names push or device messaging, but the algorithm corpus treats external push as an embodiment-dependent extension rather than a universal requirement. |
| SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE | OPTIONAL_VENDOR_SELECTION | The algorithm explicitly requires OpenTelemetry-compatible telemetry, but the checklist's separate error-monitoring workspace is an optional overlay rather than the core observability truth store. |
| HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION | OPTIONAL_VENDOR_SELECTION | The roadmap marks the helpdesk workspace as conditional ('if selected'), and the algorithm models help as a product capability rather than a required external vendor. |
| OCR_DOCUMENT_EXTRACTION_CAPABILITY | OPTIONAL_VENDOR_SELECTION | The corpus keeps generic OCR outside the core invention boundary and the roadmap explicitly allows either a managed OCR project or a self-hosted decision. |
| MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY | PROCUREMENT_OR_PLATFORM_CHOICE | The upload and collaboration contracts make scan/quarantine gating mandatory even though the final vendor or self-host strategy is left open. |
| SECRETS_MANAGER_OR_TOKEN_VAULT | PROCUREMENT_OR_PLATFORM_CHOICE | The runtime topology and hardening contract explicitly require a governed token vault or secret store for raw authority credentials. |
| KMS_HSM_ROOT_OF_TRUST | PROCUREMENT_OR_PLATFORM_CHOICE | The hardening contract explicitly roots envelope keys and protected secrets in KMS/HSM-class controls. |
| PRIMARY_TRANSACTIONAL_CONTROL_STORE | PROCUREMENT_OR_PLATFORM_CHOICE | The deployment topology explicitly requires a primary control store as the durable system of record. |
| APPEND_ONLY_AUDIT_STORE | PROCUREMENT_OR_PLATFORM_CHOICE | The deployment topology and observability contract explicitly separate append-only audit evidence from mutable operational telemetry. |
| OBJECT_STORAGE_AND_QUARANTINE_BUCKETS | PROCUREMENT_OR_PLATFORM_CHOICE | The runtime topology explicitly requires an object store, and the upload contracts require quarantine-aware artifact segregation. |
| QUEUE_OR_BROKER_COORDINATION_FABRIC | PROCUREMENT_OR_PLATFORM_CHOICE | The runtime topology explicitly requires a queue/broker for outbox, inbox, and worker coordination, even though it may never be the system of record. |
| CACHE_AND_STREAM_RESUME_STORE | PROCUREMENT_OR_PLATFORM_CHOICE | Disposable caches and resume stores are explicit runtime components, with strict cache-isolation and rebuild rules. |
| OPENTELEMETRY_COLLECTION_AND_BACKEND | PROCUREMENT_OR_PLATFORM_CHOICE | The observability contract explicitly grounds telemetry in OpenTelemetry-style traces, metrics, and logs while separating them from audit evidence. |
| CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION | PROCUREMENT_OR_PLATFORM_CHOICE | Build signing, SBOMs, provenance attestations, and release admission checks are explicit hardening requirements. |
| DNS_TLS_WAF_AND_EDGE_DELIVERY | PROCUREMENT_OR_PLATFORM_CHOICE | TLS for external traffic is explicit, while the checklist packages DNS, WAF, and edge delivery into the practical provisioning surface. |
| CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW | PROCUREMENT_OR_PLATFORM_CHOICE | The roadmap explicitly schedules CI/CD runners, environment secrets, and ephemeral preview accounts as a combined control-plane dependency. |
| MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN | PROCUREMENT_OR_PLATFORM_CHOICE | The native blueprint, deployment contract, and security gates all explicitly require code signing, notarization, hardened runtime, and Keychain-safe storage for shipped macOS builds. |
| DESKTOP_RELEASE_AND_UPDATE_CHANNEL | PROCUREMENT_OR_PLATFORM_CHOICE | The deployment topology explicitly names a desktop release/update channel with staged distribution and emergency revocation. |

## Source Quality Notes

- The card references `shared_operating_contract_0014_to_0021.md`, but that shared file is not present in the repository. This register therefore grounds itself directly in the named algorithm contracts and the checklist task block.
- The dependency register deliberately keeps vendor names out of the normative rows. Later ADR work can bind these capabilities to a concrete stack without changing the source-grounded classification law.
