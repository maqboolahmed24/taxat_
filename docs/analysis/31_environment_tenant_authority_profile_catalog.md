# Environment, Tenant, and Authority Profile Catalog

Generated on `2026-04-18`. This pack normalizes the canonical environment, tenant, callback, secret, and HMRC authority-profile vocabulary that later provisioning and implementation work must consume mechanically.

## Summary

- Environments: `8` accepted from `9` evaluated candidates.
- Tenants: `5` with `8` explicit audience classes.
- Provider profiles: `45` across `5` HMRC API families, `3` live product environments, and `3` connection methods.
- Callback profiles: `13`.
- Secret namespaces: `18`.

## Environment Inventory

| Environment | Family | Provider Env Binding | Authority Posture | Secret Namespaces | Callback Profiles |
| --- | --- | --- | --- | --- | --- |
| env_local_authoring | LOCAL_AUTHORING | NONE | NO_LIVE_PROVIDER_TRAFFIC | sec_local_authoring |  |
| env_local_provisioning_workstation | LOCAL_PROVISIONING | HMRC_SANDBOX_BOOTSTRAP_ONLY | BOOTSTRAP_ONLY_NO_CANONICAL_OPERATION_FAMILY_EXECUTION | sec_local_provisioning_sandbox | cb_local_browser_loopback_sandbox, cb_local_native_loopback_sandbox |
| env_ci_ephemeral_validation | CI_EPHEMERAL | NONE | NO_LIVE_PROVIDER_TRAFFIC | sec_ci_ephemeral |  |
| env_ephemeral_review_preview | EPHEMERAL_REVIEW | NONE | NO_LIVE_PROVIDER_TRAFFIC_UNSTABLE_CALLBACK_HOST | sec_ephemeral_review | cb_ephemeral_review_disallowed |
| env_shared_sandbox_integration | SHARED_SANDBOX | HMRC_SANDBOX | CANONICAL_SANDBOX_OPERATION_FAMILY_EXECUTION | sec_sandbox_runtime, sec_sandbox_web_authority, sec_sandbox_desktop_authority, sec_sandbox_batch_authority | cb_sandbox_web, cb_sandbox_desktop, cb_sandbox_batch |
| env_preproduction_verification | PREPRODUCTION | HMRC_SANDBOX | PRODUCTION_LIKE_INTERNALS_SANDBOX_PROVIDER | sec_preprod_runtime, sec_preprod_web_authority, sec_preprod_desktop_authority, sec_preprod_batch_authority | cb_preprod_web, cb_preprod_desktop, cb_preprod_batch |
| env_production | PRODUCTION | HMRC_PRODUCTION | CANONICAL_LIVE_OPERATION_FAMILY_EXECUTION | sec_production_runtime, sec_production_web_authority, sec_production_desktop_authority, sec_production_batch_authority | cb_production_web, cb_production_desktop, cb_production_batch |
| env_disaster_recovery_drill | DRILL | NONE_BY_DEFAULT | NO_LIVE_PROVIDER_TRAFFIC_UNLESS_SEPARATE_DRILL_PROFILE_APPROVED | sec_drill_runtime, sec_drill_restore_material | cb_drill_disabled |

## Tenant Inventory

| Tenant | Class | Environments | Audience Classes | Purpose |
| --- | --- | --- | --- | --- |
| tenant_internal_engineering_automation | INTERNAL_ENGINEERING | env_local_authoring, env_local_provisioning_workstation, env_ci_ephemeral_validation, env_ephemeral_review_preview, env_shared_sandbox_integration | INTERNAL_ENGINEERING_AUTOMATION, MACHINE_SERVICE_PRINCIPAL | Build, provision, validate, and maintain non-production surfaces. |
| tenant_internal_operator_governance | INTERNAL_RUNTIME | env_shared_sandbox_integration, env_preproduction_verification, env_production, env_disaster_recovery_drill | INTERNAL_OPERATOR_GOVERNANCE, BROWSER_HUMAN_VIA_SERVER, DESKTOP_HUMAN_VIA_SERVER | Operate, review, approve, and govern runtime work across operator and governance surfaces. |
| tenant_customer_runtime_isolation | CUSTOMER_RUNTIME | env_production | CUSTOMER_PORTAL_HUMAN | Production customer and delegated-client isolation for portal and submission workflows. |
| tenant_provider_sandbox_test_identity_pool | SANDBOX_FIXTURE | env_local_provisioning_workstation, env_shared_sandbox_integration, env_preproduction_verification | HMRC_SANDBOX_FIXTURE, INTERNAL_ENGINEERING_AUTOMATION | Own HMRC sandbox test users, enrolments, and stateful/dynamic seed data for provider verification. |
| tenant_break_glass_security_admin | BREAK_GLASS | env_preproduction_verification, env_production, env_disaster_recovery_drill | BREAK_GLASS_SECURITY_ADMIN, MACHINE_SERVICE_PRINCIPAL | Manage emergency rotation, lockdown, restore, and exceptional authority controls. |

## Provider Profile Families

| Environment | Connection Method | Profile Count | API Families | Allowed Operation Families |
| --- | --- | --- | --- | --- |
| env_preproduction_verification | BATCH_PROCESS_DIRECT | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_RECONCILE_STATUS, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION |
| env_preproduction_verification | DESKTOP_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |
| env_preproduction_verification | WEB_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |
| env_production | BATCH_PROCESS_DIRECT | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_RECONCILE_STATUS, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION |
| env_production | DESKTOP_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |
| env_production | WEB_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |
| env_shared_sandbox_integration | BATCH_PROCESS_DIRECT | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_RECONCILE_STATUS, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION |
| env_shared_sandbox_integration | DESKTOP_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |
| env_shared_sandbox_integration | WEB_APP_VIA_SERVER | 5 | business_details, obligations, individual_calculations, self_employment_business, property_business | AUTH_READ_REFERENCE, AUTH_READ_OBLIGATIONS, AUTH_READ_CALCULATION, AUTH_TRIGGER_CALCULATION, AUTH_SUBMIT_FINAL_DECLARATION, AUTH_RECONCILE_STATUS, AUTH_CREATE_OR_AMEND_DATA, AUTH_DELETE_DATA, AUTH_SUBMIT_PERIODIC_UPDATE, AUTH_SUBMIT_POST_FINALISATION_AMENDMENT |

## Operation Family Bindings

| Operation Family | Sandbox Profiles | Preprod Profiles | Production Profiles |
| --- | --- | --- | --- |
| AUTH_READ_REFERENCE | profile_sandbox_business_details_batch, profile_sandbox_business_details_desktop, profile_sandbox_business_details_web | profile_preprod_business_details_batch, profile_preprod_business_details_desktop, profile_preprod_business_details_web | profile_production_business_details_batch, profile_production_business_details_desktop, profile_production_business_details_web |
| AUTH_READ_OBLIGATIONS | profile_sandbox_obligations_batch, profile_sandbox_obligations_desktop, profile_sandbox_obligations_web | profile_preprod_obligations_batch, profile_preprod_obligations_desktop, profile_preprod_obligations_web | profile_production_obligations_batch, profile_production_obligations_desktop, profile_production_obligations_web |
| AUTH_READ_CALCULATION | profile_sandbox_individual_calculations_batch, profile_sandbox_individual_calculations_desktop, profile_sandbox_individual_calculations_web | profile_preprod_individual_calculations_batch, profile_preprod_individual_calculations_desktop, profile_preprod_individual_calculations_web | profile_production_individual_calculations_batch, profile_production_individual_calculations_desktop, profile_production_individual_calculations_web |
| AUTH_CREATE_OR_AMEND_DATA | profile_sandbox_property_business_desktop, profile_sandbox_property_business_web, profile_sandbox_self_employment_business_desktop, profile_sandbox_self_employment_business_web | profile_preprod_property_business_desktop, profile_preprod_property_business_web, profile_preprod_self_employment_business_desktop, profile_preprod_self_employment_business_web | profile_production_property_business_desktop, profile_production_property_business_web, profile_production_self_employment_business_desktop, profile_production_self_employment_business_web |
| AUTH_DELETE_DATA | profile_sandbox_property_business_desktop, profile_sandbox_property_business_web, profile_sandbox_self_employment_business_desktop, profile_sandbox_self_employment_business_web | profile_preprod_property_business_desktop, profile_preprod_property_business_web, profile_preprod_self_employment_business_desktop, profile_preprod_self_employment_business_web | profile_production_property_business_desktop, profile_production_property_business_web, profile_production_self_employment_business_desktop, profile_production_self_employment_business_web |
| AUTH_TRIGGER_CALCULATION | profile_sandbox_individual_calculations_desktop, profile_sandbox_individual_calculations_web | profile_preprod_individual_calculations_desktop, profile_preprod_individual_calculations_web | profile_production_individual_calculations_desktop, profile_production_individual_calculations_web |
| AUTH_SUBMIT_FINAL_DECLARATION | profile_sandbox_individual_calculations_desktop, profile_sandbox_individual_calculations_web | profile_preprod_individual_calculations_desktop, profile_preprod_individual_calculations_web | profile_production_individual_calculations_desktop, profile_production_individual_calculations_web |
| AUTH_SUBMIT_PERIODIC_UPDATE | profile_sandbox_property_business_desktop, profile_sandbox_property_business_web, profile_sandbox_self_employment_business_desktop, profile_sandbox_self_employment_business_web | profile_preprod_property_business_desktop, profile_preprod_property_business_web, profile_preprod_self_employment_business_desktop, profile_preprod_self_employment_business_web | profile_production_property_business_desktop, profile_production_property_business_web, profile_production_self_employment_business_desktop, profile_production_self_employment_business_web |
| AUTH_SUBMIT_POST_FINALISATION_AMENDMENT | profile_sandbox_property_business_desktop, profile_sandbox_property_business_web, profile_sandbox_self_employment_business_desktop, profile_sandbox_self_employment_business_web | profile_preprod_property_business_desktop, profile_preprod_property_business_web, profile_preprod_self_employment_business_desktop, profile_preprod_self_employment_business_web | profile_production_property_business_desktop, profile_production_property_business_web, profile_production_self_employment_business_desktop, profile_production_self_employment_business_web |
| AUTH_RECONCILE_STATUS | profile_sandbox_business_details_batch, profile_sandbox_individual_calculations_batch, profile_sandbox_individual_calculations_desktop, profile_sandbox_individual_calculations_web, profile_sandbox_obligations_batch, profile_sandbox_property_business_batch, profile_sandbox_property_business_desktop, profile_sandbox_property_business_web, profile_sandbox_self_employment_business_batch, profile_sandbox_self_employment_business_desktop, profile_sandbox_self_employment_business_web | profile_preprod_business_details_batch, profile_preprod_individual_calculations_batch, profile_preprod_individual_calculations_desktop, profile_preprod_individual_calculations_web, profile_preprod_obligations_batch, profile_preprod_property_business_batch, profile_preprod_property_business_desktop, profile_preprod_property_business_web, profile_preprod_self_employment_business_batch, profile_preprod_self_employment_business_desktop, profile_preprod_self_employment_business_web | profile_production_business_details_batch, profile_production_individual_calculations_batch, profile_production_individual_calculations_desktop, profile_production_individual_calculations_web, profile_production_obligations_batch, profile_production_property_business_batch, profile_production_property_business_desktop, profile_production_property_business_web, profile_production_self_employment_business_batch, profile_production_self_employment_business_desktop, profile_production_self_employment_business_web |

## HMRC Baseline Observations

| API | Observed Version | Sandbox Base URL | Production Base URL | Scopes | Verification |
| --- | --- | --- | --- | --- | --- |
| Business Details (MTD) | 2.0 | https://test-api.service.hmrc.gov.uk | https://api.service.hmrc.gov.uk | write:self-assessment, read:self-assessment | LIVE_VERIFIED |
| Obligations (MTD) | 3.0 | https://test-api.service.hmrc.gov.uk | https://api.service.hmrc.gov.uk | write:self-assessment, read:self-assessment | LIVE_VERIFIED |
| Individual Calculations (MTD) | 8.0 | https://test-api.service.hmrc.gov.uk | https://api.service.hmrc.gov.uk | write:self-assessment, read:self-assessment | LIVE_VERIFIED |
| Self Employment Business (MTD) | 5.0 | https://test-api.service.hmrc.gov.uk | https://api.service.hmrc.gov.uk | write:self-assessment, read:self-assessment | LIVE_VERIFIED |
| Property Business (MTD) | 6.0 | https://test-api.service.hmrc.gov.uk | https://api.service.hmrc.gov.uk | write:self-assessment, read:self-assessment | LIVE_VERIFIED |

## Environment Candidate Decisions

| Candidate | Disposition | Environment Ref | Rationale |
| --- | --- | --- | --- |
| local authoring / deterministic analysis | ADOPTED | env_local_authoring | The repository requires a non-runtime local analysis boundary for schema, replay, and documentation work. |
| local Playwright / provisioning workstation | ADOPTED | env_local_provisioning_workstation | Third-party app setup and browser automation need a separate local boundary from coding work. |
| CI ephemeral validation | ADOPTED | env_ci_ephemeral_validation | CI must exist as a distinct ephemeral environment with no stable provider trust. |
| ephemeral review preview | ADOPTED | env_ephemeral_review_preview | Dependency analysis explicitly identified review hosts as useful but unsuitable for provider callbacks. |
| shared sandbox integration | ADOPTED | env_shared_sandbox_integration | Sandbox is the first canonical provider-enabled environment and gates releases. |
| pre-production / production-like verification | ADOPTED | env_preproduction_verification | Pre-production is required for stable release-candidate verification without sharing production authority trust. |
| production | ADOPTED | env_production | Production is the live customer and provider boundary. |
| disaster-recovery or resilience drill | ADOPTED | env_disaster_recovery_drill | Recovery and drill work needs explicit separation from steady-state runtime environments. |
| native-client specific environment boundary | REJECTED_AS_STANDALONE | n/a | ADR-007 defines the native macOS operator workspace as a deployable and session boundary across shared server environments, not a separate provider environment. |

## Typed Gaps

- `gap_drill_live_provider_profile_not_defined`: Disaster-recovery drills do not yet have a separately approved live HMRC provider profile
- `gap_reference_surface_may_need_more_than_business_details`: Reference reads are currently anchored to Business Details in the canonical profile set
- `gap_post_finalisation_amendment_api_split_not_yet_exposed`: `AUTH_SUBMIT_POST_FINALISATION_AMENDMENT` still maps to the property and self-employment business APIs only
- `gap_missing_shared_operating_contract_0030_to_0037`: The referenced shared operating contract `shared_operating_contract_0030_to_0037.md` is absent
- `gap_reference_operation_family_overloads_multiple_hmrc_surfaces`: `AUTH_READ_REFERENCE` is broader than the current HMRC baseline list and may need narrower surface splits later
