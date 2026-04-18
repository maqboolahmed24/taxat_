# Observability, Audit, and Failure Management

This pack turns the Taxat observability, audit, failure-lineage, remediation, and closure corpus
into one implementation-grade boundary. The governing rule is simple: audit evidence proves what
happened; telemetry explains runtime; typed failure objects control resolution; and the
`FailureLifecycleDashboard` is the only lawful dashboard truth for a governed lineage.

## Coverage Snapshot

| artifact | count | notes |
| --- | --- | --- |
| Signal rows | 12 | Audit, telemetry, failure objects, and dashboard truth remain separated by design. |
| Mandatory audit events | 112 | All audit event families from the schema-backed corpus are normalized into one registry. |
| Query contracts | 12 | Includes audit, run, filing, privacy, replay, and provenance investigation surfaces. |
| Error families | 19 | Retry, remediation, ownership, compensation, and accepted-risk posture are closed sets. |
| Dashboard projection rules | 9 | Projection truth is persisted and explicitly rejects log-only reconstruction. |
| Retention and visibility rules | 9 | Visibility fences and lawful limitation remain explicit per domain. |

## Signal and Failure Surfaces

| canonical_name | domain | producer_or_owner | query_contract_or_projection |
| --- | --- | --- | --- |
| AUDIT_EVENTS | AUDIT | Compliance-significant decision and lifecycle boundaries | get_audit_trail(root_ref, options); get_filing_evidence_ledger(submission_record_id); get_privacy_action_ledger(client_id, options); get_replay_attestation(manifest_id) |
| TRACES | OPS | Run-engine orchestration and service runtime instrumentation | get_run_timeline(manifest_id) |
| METRICS | OPS | Runtime analytics, release governance, and privacy-safe aggregates | get_operator_morning_digest(tenant_id, coverage_date); ops dashboards |
| LOGS | OPS | Structured runtime logging with secure access tiers | get_run_timeline(manifest_id) as secondary explanation only |
| SECURITY_TELEMETRY | SECURITY | Access control, session security, and authority-binding anomaly surfaces | Correlated through get_audit_trail(root_ref, options) and security investigations |
| PRIVACY_TELEMETRY | PRIVACY | Retention and privacy control plane | get_privacy_action_ledger(client_id, options); get_retention_limitation_path(object_id) |
| ErrorRecord | FAILURE | Structured failure boundary | Failure lifecycle dashboard projection; get_run_timeline(manifest_id) |
| RemediationTask | REMEDIATION | Tracked remediation and follow-up work boundary | Failure lifecycle dashboard projection |
| FailureInvestigation | REMEDIATION | Durable forensic branch for unresolved ambiguity | Failure lifecycle dashboard projection; get_provenance(object_type, object_id, options) |
| CompensationRecord | REMEDIATION | Settlement and compensation branch | Failure lifecycle dashboard projection |
| AcceptedRiskApproval | RISK | Bounded exception and approval boundary | Failure lifecycle dashboard projection |
| FailureLifecycleDashboard | FAILURE | Authoritative persisted read-side projection | BUILD_FAILURE_LIFECYCLE_DASHBOARD(...) |

## Contract Laws

- Audit evidence, operational telemetry, security telemetry, and privacy telemetry remain distinct even when implemented on one backend stack.
- Typed failures, remediation, compensation, investigations, and accepted-risk approvals are first-class lifecycle objects, not log-derived summaries.
- The failure dashboard is a persisted read model that may consume only typed lifecycle objects, workflow state, audit refs, and provenance refs.
- Retention-limited visibility must remain explicit. A missing payload is not allowed to masquerade as lawful closure, lawful erasure, or lack of evidence.
- Replay comparison and attestation keep their own query surface, audit events, hashes, and failure codes.

## Gap Closure

- Closed the signal-separation gap by normalizing audit, ops, security, privacy, and failure objects into `signal_catalog.json`.
- Closed the correlation gap by publishing explicit topology edges, closed-set correlation keys, and query contracts in `correlation_topology_and_query_contracts.json`.
- Closed the failure-dashboard gap by extracting the persisted projection rules and the forbidden log-only reconstruction inputs into `failure_lifecycle_dashboard_projection_rules.json`.
- Closed the owner, closure, compensation, and accepted-risk scattering gap by consolidating them into `failure_owner_closure_and_risk_matrix.json`.

## Source Grounding

- `Algorithm/observability_and_audit_contract.md`
- `Algorithm/retention_error_and_observability_contract.md`
- `Algorithm/error_model_and_remediation_model.md`
- `Algorithm/failure_lifecycle_dashboard_and_lineage_contract.md`
- `Algorithm/failure_resolution_ownership_and_closure_contract.md`
- `Algorithm/provenance_graph_semantics.md`
- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/admin_governance_console_architecture.md`
- `Algorithm/empty_state_limitation_and_recovery_taxonomy_contract.md`
