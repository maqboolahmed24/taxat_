# Retention Error And Observability Bindings

`packages/backend-failure` is the canonical retention/privacy failure binding package.

Assumption recorded for `pc_0216`: `ASSUMPTION_BACKEND_FAILURE_PACKAGE_CREATED`. The shared
operating contract names `packages/backend-failure`; that package did not exist, so the task creates
it rather than placing retention/privacy failure code in a neighboring package.

## Mapping

| Condition | Error family | Blocking class | Follow-up object |
| --- | --- | --- | --- |
| `BLOCKED_LEGAL_HOLD` | `RETENTION_ERROR` | `BLOCKS_ERASURE` | `RemediationTask` with `task_type=CHECK_RETENTION_HOLD` |
| `BLOCKED_PROOF_PRESERVATION` | `RETENTION_ERROR` | `BLOCKS_ERASURE` | `FailureInvestigation` with `RETENTION_PRIVACY_EXCEPTION` |
| `BLOCKED_AUTHORITY_AMBIGUITY` | `PRIVACY_ERROR` | `BLOCKS_AUTHORITY_CALL` | `FailureInvestigation`; authority state is reconciled, never deleted |
| `RETENTION_LIMITED_SURVIVAL` | `RETENTION_ERROR` | `BLOCKS_REVIEW_PROGRESS` | `CompensationRecord` with `PRESERVE_AND_LIMIT` |
| `ERASURE_PENDING_CHECKPOINT` | `PRIVACY_ERROR` | `BLOCKS_ERASURE` | workflow-backed follow-up |
| `PRIVACY_MINIMIZATION_DIAGNOSTIC_BLOCK` | `PRIVACY_ERROR` | `BLOCKS_RUN` | `FailureInvestigation` |

Every `RETENTION_ERROR` or `PRIVACY_ERROR` produced by `openRetentionOrPrivacyError` carries
`manifest_id`, `root_manifest_id`, `error_id`, `artifact_retention_ref`, `retention_class`,
`affected_object_refs[]`, `originating_activity_ref`, `reason_codes[]`, and either
`workflow_item_id` or `remediation_task_ref`.

## Linkage

`assertRetentionAnchorLinkage` normalizes the `RetentionTag` and `ArtifactRetention`, verifies tag
and artifact alignment, and selects the lawful retained basis ref. Proof-preservation and
authority-ambiguity blockers must retain `proof_preservation_basis_ref` and `authority_ambiguity_ref`
respectively; other conditions default to `retention_basis_ref`.

`bindRetentionFollowUpObjects` builds the companion objects with the same manifest/root lineage and
the exact same `artifact_retention_ref` and `retention_class`. It rejects mismatches between the
`ErrorRecord` refs and the built remediation, compensation, investigation, or accepted-risk objects.

## Evidence

`emitRetentionErrorCorrelationEvidence` emits the correlated triad:

- `GateEvaluated`
- `ErrorRecorded`
- the retention/privacy audit event (`LegalHoldApplied`, `RetentionLimited`, or `ErasureRequested`)

It also records a retained trace span and one `PRIVACY_RETENTION` log record. Diagnostic structured
fields are bounded to stable refs: `artifact_retention_ref`, `retention_class`, `reason_code`,
`limitation_reason_code`, and `opaque_object_ref`. Raw payloads, personal data, authority secrets,
tokens, and cookies are not accepted by the log model.
