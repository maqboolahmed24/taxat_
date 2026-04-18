# Retention, Privacy, Security, and Runtime Hardening

## Pack Summary

- Governed artifact rows: 32
- Quantitative privacy rows: 13
- Threat map rows: 11
- Security control rows: 17
- Cache and purge rows: 15
- Session, secret, and token storage rows: 8
- Restore privacy rows: 8
- Security release-gate rows: 9

## Quantitative Privacy Model

| artifact_or_control_id | survivability_or_fidelity_formula | notes | source_ref |
| --- | --- | --- | --- |
| FORMULA_DECISION_INFORMATION_RATIO | decision_information_ratio(o) in [0,1] | This is the retained fraction of original decision-relevant information. | Algorithm/retention_and_privacy.md::L121[decision_information_ratio] |
| FORMULA_PROJECTION_INFORMATION_RATIO | projection_information_ratio(o) in [0,1] and projection_information_ratio(o) <= decision_information_ratio(o) | Emit PRIVACY_PROJECTION_RATIO_INVALID when the projection ratio exceeds retained decision-side information. | Algorithm/retention_and_privacy.md::L122[projection_information_ratio] |
| FORMULA_LIMITATION_EXPLICITNESS | limitation_explicitness(o) in [0,1] | Silent ambiguity is measured as the inverse of limitation explicitness. | Algorithm/retention_and_privacy.md::L124[limitation_explicitness] |
| FORMULA_SILENT_AMBIGUITY | silent_ambiguity(o) = 1 - limitation_explicitness(o) | Silent ambiguity is a structural defect, not a soft warning. | Algorithm/retention_and_privacy.md::L125[silent_ambiguity] |
| FORMULA_SURVIVABILITY | survivability(o) = clamp01(decision_information_ratio(o) * limitation_explicitness(o)) | Survivability governs controlling proof, review-only, and audit-only posture. | Algorithm/retention_and_privacy.md::L126[survivability] |
| FORMULA_PROJECTION_FIDELITY | projection_fidelity(o) = 0 if decision_information_ratio(o) = 0 else clamp01(projection_information_ratio(o) / decision_information_ratio(o)) | User-visible confidence cues degrade by projection_fidelity(o). | Algorithm/retention_and_privacy.md::L127[projection_fidelity] |
| THRESHOLD_SUBMIT | τ_submit = 0.80 | Controls filing-capable and authority-facing proof posture. | Algorithm/retention_and_privacy.md::L131[tau_submit] |
| THRESHOLD_REVIEW | τ_review = 0.45 | Separates review-capable non-automating posture from audit-only posture. | Algorithm/retention_and_privacy.md::L132[tau_review] |
| THRESHOLD_AUDIT | τ_audit = 0.15 | Defines the final audit/tombstone survival floor. | Algorithm/retention_and_privacy.md::L133[tau_audit] |

## Threat Classes to Concrete Controls

| threat_class | mapped_control_ids | release_gate_dependency | source_ref |
| --- | --- | --- | --- |
| CROSS_TENANT_OR_CROSS_CLIENT_DATA_EXPOSURE | CACHE_ISOLATION_CONTRACT_ENFORCEMENT<br>PER_TENANT_ENVELOPE_ENCRYPTION<br>SESSION_BOUND_COMMAND_VALIDATION | CROSS_TENANT_CACHE_ISOLATION_GATE | Algorithm/cache_isolation_and_secure_reuse_contract.md::L7[CROSS_TENANT_OR_CROSS_CLIENT_DATA_EXPOSURE] |
| STALE_OR_REPLAYED_USER_COMMANDS | SESSION_BOUND_COMMAND_VALIDATION<br>STEP_UP_AND_SESSION_ROTATION<br>RETENTION_ERROR_AND_GATE_COUPLING | STALE_VIEW_AND_IDEMPOTENCY_GATE<br>SESSION_AND_ANTI_CSRF_GATE | Algorithm/northbound_api_and_session_contract.md::L15[STALE_OR_REPLAYED_USER_COMMANDS] |
| AUTHORITY_TOKEN_MISUSE_OR_WRONG_CLIENT_TOKEN_BINDING | TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION<br>AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE | AUTHORITY_SANDBOX_BINDING_GATE<br>SECRET_ROTATION_ATTESTATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L50[AUTHORITY_TOKEN_MISUSE_OR_WRONG_CLIENT_TOKEN_BINDING] |
| QUEUE_CALLBACK_OR_WORKER_RESULT_INJECTION | AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE<br>SIGNED_BUILD_SBOM_AND_PROVENANCE | AUTHORITY_SANDBOX_BINDING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L99[QUEUE_CALLBACK_OR_WORKER_RESULT_INJECTION] |
| UNSAFE_LOG_EXPORT_CACHE_OR_ANALYTICS_LEAKAGE | LOG_REDACTION_AND_MASKED_EXPORT_POLICY<br>CACHE_ISOLATION_CONTRACT_ENFORCEMENT | CROSS_TENANT_CACHE_ISOLATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L130[UNSAFE_LOG_EXPORT_CACHE_OR_ANALYTICS_LEAKAGE] |
| BROWSER_ORIGIN_ATTACKS | ANTI_CSRF_AND_SECURE_COOKIE_POSTURE<br>SESSION_BOUND_COMMAND_VALIDATION | SESSION_AND_ANTI_CSRF_GATE | Algorithm/security_and_runtime_hardening_contract.md::L78[BROWSER_ORIGIN_ATTACKS] |
| SSRF_OR_UNCONTROLLED_CONNECTOR_EGRESS | SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS<br>AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE | AUTHORITY_SANDBOX_BINDING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L99[SSRF_OR_UNCONTROLLED_CONNECTOR_EGRESS] |
| COMPROMISED_BUILD_DEPENDENCY_OR_RELEASE_ARTIFACT | SIGNED_BUILD_SBOM_AND_PROVENANCE<br>NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME | BUILD_SIGNATURE_AND_PROVENANCE_GATE<br>CRITICAL_VULNERABILITY_CLEARANCE_GATE<br>NATIVE_DESKTOP_HARDENING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L143[COMPROMISED_BUILD_DEPENDENCY_OR_RELEASE_ARTIFACT] |
| RESTORE_TIME_RESURRECTION_OF_ERASED_OR_MASKED_DATA | RESTORE_PRIVACY_RECONCILIATION<br>RETENTION_LIMITED_EXPLAINABILITY | SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[RESTORE_TIME_RESURRECTION_OF_ERASED_OR_MASKED_DATA] |
| PRIVILEGED_OPERATOR_OVERREACH_WITHOUT_STEP_UP_APPROVAL_OR_AUDIT | STEP_UP_AND_SESSION_ROTATION<br>SESSION_BOUND_COMMAND_VALIDATION<br>RETENTION_ERROR_AND_GATE_COUPLING | SESSION_AND_ANTI_CSRF_GATE<br>STALE_VIEW_AND_IDEMPOTENCY_GATE | Algorithm/security_and_runtime_hardening_contract.md::L30[PRIVILEGED_OPERATOR_OVERREACH_WITHOUT_STEP_UP_APPROVAL_OR_AUDIT] |
| DESKTOP_CLIENT_COMPROMISE_OR_UNSAFE_LOCAL_CACHE_EXPOSURE | NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME<br>NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE<br>CACHE_ISOLATION_CONTRACT_ENFORCEMENT | NATIVE_DESKTOP_HARDENING_GATE<br>CROSS_TENANT_CACHE_ISOLATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L78[DESKTOP_CLIENT_COMPROMISE_OR_UNSAFE_LOCAL_CACHE_EXPOSURE] |

## Core Security Controls

| artifact_or_control_id | canonical_store_or_boundary | release_gate_dependency | source_ref |
| --- | --- | --- | --- |
| ANTI_CSRF_AND_SECURE_COOKIE_POSTURE | browser session boundary | SESSION_AND_ANTI_CSRF_GATE | Algorithm/security_and_runtime_hardening_contract.md::L39[ANTI_CSRF_AND_SECURE_COOKIE_POSTURE] |
| AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE | authority inbox and ingress checkpoint | AUTHORITY_SANDBOX_BINDING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L99[AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE] |
| CACHE_ISOLATION_CONTRACT_ENFORCEMENT | shared cache identity contract | CROSS_TENANT_CACHE_ISOLATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L195[CACHE_ISOLATION_CONTRACT_ENFORCEMENT] |
| LOG_REDACTION_AND_MASKED_EXPORT_POLICY | observability and export boundary | SESSION_AND_ANTI_CSRF_GATE<br>SECRET_ROTATION_ATTESTATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L130[LOG_REDACTION_AND_MASKED_EXPORT_POLICY] |
| NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE | native scene and cursor hydration boundary | NATIVE_DESKTOP_HARDENING_GATE<br>CROSS_TENANT_CACHE_ISOLATION_GATE | Algorithm/native_cache_hydration_purge_and_rebase_contract.md::L45[NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE] |
| NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME | native release and build boundary | NATIVE_DESKTOP_HARDENING_GATE<br>BUILD_SIGNATURE_AND_PROVENANCE_GATE | Algorithm/security_and_runtime_hardening_contract.md::L84[NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME] |
| PER_TENANT_ENVELOPE_ENCRYPTION | object store and regulated payload boundary | SECRET_ROTATION_ATTESTATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L65[PER_TENANT_ENVELOPE_ENCRYPTION] |
| RESTORE_PRIVACY_RECONCILIATION | restore privacy reconciliation boundary | SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[RESTORE_PRIVACY_RECONCILIATION] |
| RETENTION_ERROR_AND_GATE_COUPLING | error, remediation, and gate integration boundary | SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/retention_error_and_observability_contract.md::L122[RETENTION_ERROR_AND_GATE_COUPLING] |
| RETENTION_LIMITED_EXPLAINABILITY | retention-limited explainability contract boundary | SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/retention_limited_explainability_and_audit_sufficiency_contract.md::L52[RETENTION_LIMITED_EXPLAINABILITY] |
| RETENTION_TAG_AND_ARTIFACT_RETENTION | retention control store | SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/retention_and_privacy.md::L13[RETENTION_TAG_AND_ARTIFACT_RETENTION] |
| SECRET_VERSION_ROTATION_AND_ATTESTATION | secret metadata boundary | SECRET_ROTATION_ATTESTATION_GATE | Algorithm/security_and_runtime_hardening_contract.md::L68[SECRET_VERSION_ROTATION_AND_ATTESTATION] |
| SESSION_BOUND_COMMAND_VALIDATION | northbound session and command control plane | SESSION_AND_ANTI_CSRF_GATE<br>STALE_VIEW_AND_IDEMPOTENCY_GATE | Algorithm/security_and_runtime_hardening_contract.md::L30[SESSION_BOUND_COMMAND_VALIDATION] |
| SIGNED_BUILD_SBOM_AND_PROVENANCE | release verification and provenance boundary | BUILD_SIGNATURE_AND_PROVENANCE_GATE<br>CRITICAL_VULNERABILITY_CLEARANCE_GATE<br>SCHEMA_COMPATIBILITY_AND_RESTORE_GATE | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[SIGNED_BUILD_SBOM_AND_PROVENANCE] |
| SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS | connector, OCR, authority gateway network boundary | AUTHORITY_SANDBOX_BINDING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L105[SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS] |
| STEP_UP_AND_SESSION_ROTATION | session challenge state and approval boundary | SESSION_AND_ANTI_CSRF_GATE<br>STALE_VIEW_AND_IDEMPOTENCY_GATE | Algorithm/macos_native_operator_workspace_blueprint.md::L384[STEP_UP_AND_SESSION_ROTATION] |
| TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION | governed token vault or secret store | SECRET_ROTATION_ATTESTATION_GATE<br>AUTHORITY_SANDBOX_BINDING_GATE | Algorithm/security_and_runtime_hardening_contract.md::L50[TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION] |

## Explicit Gaps

- `artifact_specific_retention_windows_not_canonicalized` (medium): The corpus defines retention classes, expiry basis, and erasure blockers, but does not publish one canonical per-artifact duration matrix. [Algorithm/retention_and_privacy.md::L3[Retention_and_privacy]]
- `threat_class_enum_is_prose_only` (medium): Threat classes are normatively defined in prose in the runtime hardening contract, but no dedicated schema-backed enum exists in the current corpus. [Algorithm/security_and_runtime_hardening_contract.md::L13[1._Threat_classes]]
- `authority_login_credentials_have_no_schema_because_persistence_is_forbidden` (low): The corpus forbids stored authority login credentials by design, so there is no dedicated persisted schema artifact for that credential class. [Algorithm/retention_and_privacy.md::L184[authority_login_credentials_forbidden]]
- `restore_reopen_surface_specific_matrix_not_expanded_in_source` (medium): Restore privacy reconciliation states are defined, but the corpus does not separately publish a per-surface reopen matrix for each operator and customer route family. [Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law]]
