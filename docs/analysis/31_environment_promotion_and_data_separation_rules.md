# Environment Promotion and Data Separation Rules

Generated on `2026-04-18`. These rules are the operational constraints that later provisioning work must follow when instantiating the environment and authority-profile catalog.

## Promotion Path

| From | To | Meaning | Control |
| --- | --- | --- | --- |
| Local authoring | Local provisioning | No promotion; separate local boundaries | No live provider traffic, no shared secrets. |
| Local provisioning | Shared sandbox | Provisioning and callback registration only | Sandbox bootstrap material stays sandbox scoped. |
| CI / Preview | Shared sandbox | Not a direct promotion path | Ephemeral hosts cannot own provider trust. |
| Shared sandbox | Pre-production | Candidate-bound release verification | Preprod keeps production-like controls but still uses HMRC sandbox. |
| Pre-production | Production | Governed release promotion | Production gets distinct callback hosts, secret namespaces, and HMRC production credentials. |
| Production | DR drill | No automatic promotion | Drill environments remain separate and do not inherit live provider trust by default. |

## Callback and Domain Matrix

| Domain Row | Environment | Host Pattern | Surface Kind | Owning Deployable | Provider Registration Allowed |
| --- | --- | --- | --- | --- | --- |
| dom_local_browser_loopback | env_local_provisioning_workstation | http://localhost:45080/oauth/hmrc/sandbox/browser-callback | LOOPBACK_REDIRECT | deployable_local_provisioning_workspace | True |
| dom_local_native_loopback | env_local_provisioning_workstation | http://localhost:45081/oauth/hmrc/sandbox/native-callback | LOOPBACK_REDIRECT | deployable_local_provisioning_workspace | True |
| dom_preview_operator_shell | env_ephemeral_review_preview | https://operator-preview-{preview_id}.review.taxat.example | WEB_UI | deployable_ephemeral_review_web_shell | False |
| dom_sandbox_operator_web | env_shared_sandbox_integration | https://operator.sandbox.taxat.example | WEB_UI | deployable_operator_web_app | False |
| dom_sandbox_portal_web | env_shared_sandbox_integration | https://portal.sandbox.taxat.example | WEB_UI | deployable_client_portal_web_app | False |
| dom_sandbox_auth_redirect | env_shared_sandbox_integration | https://auth.sandbox.taxat.example/oauth/hmrc/callback | OAUTH_REDIRECT | deployable_northbound_api_session_gateway | True |
| dom_sandbox_ingress | env_shared_sandbox_integration | https://authority-ingress.sandbox.taxat.example/hmrc/inbox | AUTHORITY_INGRESS | deployable_controlled_authority_gateway | True |
| dom_preprod_operator_web | env_preproduction_verification | https://operator.preprod.taxat.example | WEB_UI | deployable_operator_web_app | False |
| dom_preprod_portal_web | env_preproduction_verification | https://portal.preprod.taxat.example | WEB_UI | deployable_client_portal_web_app | False |
| dom_preprod_auth_redirect | env_preproduction_verification | https://auth.preprod.taxat.example/oauth/hmrc/callback | OAUTH_REDIRECT | deployable_northbound_api_session_gateway | True |
| dom_preprod_ingress | env_preproduction_verification | https://authority-ingress.preprod.taxat.example/hmrc/inbox | AUTHORITY_INGRESS | deployable_controlled_authority_gateway | True |
| dom_production_operator_web | env_production | https://operator.production.taxat.example | WEB_UI | deployable_operator_web_app | False |
| dom_production_portal_web | env_production | https://portal.production.taxat.example | WEB_UI | deployable_client_portal_web_app | False |
| dom_production_auth_redirect | env_production | https://auth.production.taxat.example/oauth/hmrc/callback | OAUTH_REDIRECT | deployable_northbound_api_session_gateway | True |
| dom_production_ingress | env_production | https://authority-ingress.production.taxat.example/hmrc/inbox | AUTHORITY_INGRESS | deployable_controlled_authority_gateway | True |
| dom_drill_callbacks_disabled | env_disaster_recovery_drill | NONE_BY_DEFAULT | DISABLED_CALLBACK_SURFACE | deployable_controlled_authority_gateway | False |

## Secret Namespace Plan

| Namespace | Environments | Provider Envs | Secret Classes | Mixing Rule |
| --- | --- | --- | --- | --- |
| sec_local_authoring | env_local_authoring | n/a | tooling-config, analysis-fixture-metadata | Local authoring may not contain sandbox or production provider secrets. |
| sec_local_provisioning_sandbox | env_local_provisioning_workstation | sandbox | developer-hub-account, sandbox-bootstrap-credentials | Local provisioning secrets remain sandbox only and never promote into shared runtimes. |
| sec_ci_ephemeral | env_ci_ephemeral_validation | n/a | ephemeral-build-token, temporary-test-config | CI namespaces are unique per run and cannot be reused as stable callback or provider namespaces. |
| sec_ephemeral_review | env_ephemeral_review_preview | n/a | preview-session-secret, preview-feature-flags | Preview secrets cannot contain provider credentials because preview hosts are not provider-trusted. |
| sec_sandbox_runtime | env_shared_sandbox_integration | sandbox | runtime-app-secrets, session-signing, queue-auth, db-auth | Sandbox runtime secrets remain separate from every production namespace. |
| sec_sandbox_web_authority | env_shared_sandbox_integration | sandbox | sandbox-web-client-secret, authority-token-lineage | Sandbox web authority secrets stay distinct from desktop, batch, and all production namespaces. |
| sec_sandbox_desktop_authority | env_shared_sandbox_integration | sandbox | sandbox-desktop-client-secret, authority-token-lineage | Sandbox native authority credentials use a dedicated namespace because their callback and fraud-header posture differs from web. |
| sec_sandbox_batch_authority | env_shared_sandbox_integration | sandbox | sandbox-batch-client-secret, reconciliation-token-lineage | Sandbox batch authority credentials remain distinct from interactive profiles. |
| sec_preprod_runtime | env_preproduction_verification | sandbox | runtime-app-secrets, session-signing, db-auth | Pre-production runtime secrets remain production-like but still cannot merge with production secrets. |
| sec_preprod_web_authority | env_preproduction_verification | sandbox | preprod-web-client-secret, authority-token-lineage | Pre-production web authority credentials remain sandbox-scoped and cannot share a namespace with sandbox shared-runtime or production web authority. |
| sec_preprod_desktop_authority | env_preproduction_verification | sandbox | preprod-desktop-client-secret, authority-token-lineage | Pre-production native authority credentials remain isolated from web and production. |
| sec_preprod_batch_authority | env_preproduction_verification | sandbox | preprod-batch-client-secret, reconciliation-token-lineage | Pre-production batch profiles remain distinct from interactive profiles and production batch credentials. |
| sec_production_runtime | env_production | production | runtime-app-secrets, session-signing, db-auth, audit-attestation | Production runtime secrets are the only live runtime namespace and never mix with sandbox or pre-production. |
| sec_production_web_authority | env_production | production | production-web-client-secret, authority-token-lineage | Production web authority credentials never share namespace with any sandbox, preprod, desktop, or batch credential set. |
| sec_production_desktop_authority | env_production | production | production-desktop-client-secret, authority-token-lineage | Production desktop authority credentials remain distinct from web because the fraud-header and callback posture differ. |
| sec_production_batch_authority | env_production | production | production-batch-client-secret, reconciliation-token-lineage | Production batch credentials are reserved for unattended reconciliation and never reused for interactive sends. |
| sec_drill_runtime | env_disaster_recovery_drill | n/a | drill-runtime-secrets, temporary-restore-access | Drill runtime material remains separate from steady-state production namespaces. |
| sec_drill_restore_material | env_disaster_recovery_drill | n/a | restore-snapshot-decryption, drill-attestation-material | Restore-material secrets stay in a dedicated drill namespace and cannot become the steady-state production runtime namespace. |

## Sandbox Test Users and Seed Data

| Plan | Environments | Asset Class | Owner Tenant | Retention / Expiry |
| --- | --- | --- | --- | --- |
| sandbox_application_registration_lifecycle | env_local_provisioning_workstation, env_shared_sandbox_integration, env_preproduction_verification | SANDBOX_APPLICATION | tenant_provider_sandbox_test_identity_pool | Deleted after 30 days without API calls; deleted after 6 months of inactivity after prior use. |
| sandbox_test_user_pool_individual | env_local_provisioning_workstation, env_shared_sandbox_integration, env_preproduction_verification | SANDBOX_TEST_USER_INDIVIDUAL | tenant_provider_sandbox_test_identity_pool | Unused users deleted by HMRC after 90 days. |
| sandbox_test_user_pool_agent | env_local_provisioning_workstation, env_shared_sandbox_integration, env_preproduction_verification | SANDBOX_TEST_USER_AGENT | tenant_provider_sandbox_test_identity_pool | Unused users deleted by HMRC after 90 days. |
| sandbox_stateful_api_seed_data | env_shared_sandbox_integration, env_preproduction_verification | SANDBOX_STATEFUL_SCENARIO_DATA | tenant_provider_sandbox_test_identity_pool | Retain only as long as needed for candidate-bound authority sandbox coverage. |
| sandbox_authorisation_journey | env_local_provisioning_workstation, env_shared_sandbox_integration, env_preproduction_verification | SANDBOX_AUTHORITY_GRANT_FLOW | tenant_provider_sandbox_test_identity_pool | Ephemeral per test run; retain only resulting evidence and inventory metadata. |
| production_no_seed_data | env_production | PRODUCTION_SEED_DATA | tenant_customer_runtime_isolation | Not applicable because production seed data is not allowed. |
| drill_restore_material | env_disaster_recovery_drill | DRILL_RESTORE_DATA | tenant_break_glass_security_admin | Per drill window and attestation policy. |

## Hard Separation Rules

- Sandbox and production never share callback hosts, secret namespaces, or implied trust.
- Native macOS uses installed-app style loopback callbacks where needed, but raw authority tokens remain server and vault bound.
- Preview and CI environments are explicitly non-provider environments even when web deployables exist there.
- Batch or unattended reconciliation does not inherit interactive fraud-header or token-binding posture.
- Production forbids sandbox test users, synthetic seed data, and sandbox callback registrations.
