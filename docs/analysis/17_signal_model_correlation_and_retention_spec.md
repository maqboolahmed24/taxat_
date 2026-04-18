# Signal Model, Correlation, and Retention Specification

The signal model keeps four observability lanes and a typed failure lane:
audit evidence, operational telemetry, security telemetry, privacy telemetry, and structured
failure/remediation objects. They are allowed to share identifiers, not identity.

## Mandatory Correlation Keys

- Core: tenant_id, client_id, manifest_id, trace_id, service_name, environment_ref
- Lineage: root_manifest_id, parent_manifest_id, continuation_of_manifest_id, replay_of_manifest_id, manifest_lineage_trace_ref, manifest_branch_decision
- Branch selection: idempotency_key, request_hash, identity_namespace_hash, duplicate_meaning_key, continuation_basis, access_binding_hash, policy_snapshot_hash
- Authority: authority_binding_ref, authority_link_ref, delegation_grant_ref, submission_record_id, authority_operation_id
- Nightly: nightly_batch_run_ref, nightly_window_key, selection_disposition
- Failure: error_id, workflow_item_id, task_id, investigation_id, compensation_id, accepted_risk_approval_id
- Retention: retention_class
- Replay: run_kind, mode, replay_class, comparison_mode, basis_validation_state, expected_execution_basis_hash, actual_execution_basis_hash, expected_deterministic_outcome_hash, actual_deterministic_outcome_hash, input_inheritance_mode, config_inheritance_mode, config_freeze_id

## Signal Catalog

| canonical_name | domain | retention_boundary | visibility_boundary |
| --- | --- | --- | --- |
| AUDIT_EVENTS | AUDIT | Durable append-only retention with explicit payload_availability_state and audit_sufficiency_state when payload bodies age out. | Append-only audit and investigation surfaces; customer-safe derivatives require explicit masking or separate projections. |
| TRACES | OPS | Potentially sampled, except filing-, retention-, authority-, and replay-critical spans which stay deterministic-retain or mandatory-forensic. | Operational investigation surfaces and run-timeline views; not the proof of record. |
| METRICS | OPS | Shorter-lived than audit evidence; no metric row becomes proof of record. | Aggregated operator and release-governance surfaces only. |
| LOGS | OPS | Operational logs may rotate quickly and are explicitly shorter-lived than append-only audit evidence. | Tiered by access_tier and never a substitute for audit truth. |
| SECURITY_TELEMETRY | SECURITY | Durable enough for investigation, but still distinct from append-only audit proof. | Security-restricted operational surfaces with explicit customer-safe redaction. |
| PRIVACY_TELEMETRY | PRIVACY | Retention-limited but explicit; lawful absence must remain distinguishable from corruption. | Privacy-restricted surfaces and dedicated customer-safe explanations only. |
| ErrorRecord | FAILURE | Governed by error retention class and companion artifact_retention_ref when retention/privacy is causal. | Operator-visible typed failure detail with customer and operator visibility classes. |
| RemediationTask | REMEDIATION | Persists as a typed lifecycle child object until effect on the source error is closed. | Operator and workflow coordination surfaces only. |
| FailureInvestigation | REMEDIATION | Persists through ambiguity, accepted risk, or supersession resolution. | Restricted operator and investigation surfaces. |
| CompensationRecord | REMEDIATION | Persists until compensation is verified, cancelled, superseded, or archived under policy. | Operator-visible settlement lineage, never customer-safe by default. |
| AcceptedRiskApproval | RISK | Retains approval lineage, scope, and expiry for the life of the exception. | Operator, approver, tenant-admin, or security-operator surfaces depending on scope. |
| FailureLifecycleDashboard | FAILURE | Persists as the read-side truth for one governed lineage until archival policy says otherwise. | Operator-facing failure inspection and downstream surface projections only. |

## Query Contract Catalog

| query_code | canonical_name | domain | ordering_basis |
| --- | --- | --- | --- |
| AUDIT_TRAIL | get_audit_trail(root_ref, options) | AUDIT | AUDIT_STREAM_SEQUENCE |
| RUN_TIMELINE | get_run_timeline(manifest_id) | OPS | RECORDED_AT_THEN_STREAM_SEQUENCE |
| NIGHTLY_BATCH_TIMELINE | get_nightly_batch_timeline(batch_run_id) | OPS | RECORDED_AT_THEN_STREAM_SEQUENCE |
| FILING_EVIDENCE_LEDGER | get_filing_evidence_ledger(submission_record_id) | AUDIT | AUDIT_STREAM_SEQUENCE |
| PRIVACY_ACTION_LEDGER | get_privacy_action_ledger(client_id, options) | PRIVACY | AUDIT_STREAM_SEQUENCE |
| OPERATOR_MORNING_DIGEST | get_operator_morning_digest(tenant_id, coverage_date) | OPS | RECORDED_AT_THEN_STREAM_SEQUENCE |
| REPLAY_ATTESTATION | get_replay_attestation(manifest_id) | AUDIT | AUDIT_STREAM_SEQUENCE |
| PROVENANCE_OBJECT | get_provenance(object_type, object_id, options) | FAILURE | PATH_ORDER |
| DEFENCE_PATH | get_defence_path(target_ref, options) | FAILURE | PATH_ORDER |
| AUTHORITY_STATE_PATH | get_authority_state_path(submission_record_id) | AUDIT | PATH_ORDER |
| DRIFT_PATH | get_drift_path(drift_id) | FAILURE | PATH_ORDER |
| RETENTION_LIMITATION_PATH | get_retention_limitation_path(object_id) | PRIVACY | PATH_ORDER |

## Retention and Visibility Binding

| canonical_name | domain | query_contract_or_projection | notes |
| --- | --- | --- | --- |
| AUDIT_EVENTS | AUDIT | get_audit_trail(root_ref, options); get_filing_evidence_ledger(submission_record_id) | Audit is never sampled away.<br>Deterministic ordering uses stream sequence, not event_time. |
| TRACES | OPS | get_run_timeline(manifest_id) | Error spans require typed failure detail.<br>Sampling may not remove mandatory audit history. |
| METRICS | OPS | Operational dashboards; get_operator_morning_digest(tenant_id, coverage_date) | Metrics summarize behavior and never become proof of record. |
| LOGS_RUNTIME | OPS | get_run_timeline(manifest_id) as secondary explanation only | Logs cannot reconstruct the failure dashboard or privacy ledger. |
| LOGS_SESSION_SECURITY | SECURITY | Security investigations correlated through audit and failure ids | Carries access decisions, step-up events, and session anomalies. |
| LOGS_PRIVACY_RETENTION | PRIVACY | get_privacy_action_ledger(client_id, options) | Missing rows may not silently imply lawful erasure. |
| ERROR_RECORD | FAILURE | BUILD_FAILURE_LIFECYCLE_DASHBOARD(...); get_run_timeline(manifest_id) | Material failure may not degrade into free text or logs only. |
| FAILURE_LIFECYCLE_DASHBOARD | FAILURE | Failure lifecycle dashboard projection | No log-only reconstruction.<br>Underlying error remains visible through compensation and accepted risk. |
| ACCEPTED_RISK_APPROVAL | RISK | Failure lifecycle dashboard projection | Accepted risk is explicit, not silent closure. |

## Invariants

- No compliance-significant event may exist without a path back to a manifest, submission record, authority operation, or frozen nightly batch identity.
- No sampled telemetry decision may remove mandatory audit history.
- Privacy and retention query slices keep deterministic audit order and only use logs or traces as secondary explanation.
- Replay-specific comparison outcomes require durable replay attestation or a typed failure reason.
