# Gate Explainability and Reason-Code Usage

## Shared Explainability Contract

- `reason_order_policy = DOMINANT_REASON_FIRST_CANONICAL_PRIORITY`
- `compression_reason_cap = 3`
- Semantic qualifier order: `AUTHORITY_STATE, LIMITATION_STATE, OVERRIDE_STATE, ACTIONABILITY_STATE`

## Reason-Code Families

| Family | Registered Count | Notes |
| --- | --- | --- |
| `ACCESS_*` | `0` | No explicit gate-level codes were enumerated in the primary source. |
| `MANIFEST_*` | `14` | Explicitly enumerated. |
| `ARTIFACT_*` | `8` | Explicitly enumerated. |
| `INPUT_*` | `7` | Explicitly enumerated. |
| `DQ_*` | `7` | Explicitly enumerated. |
| `RETENTION_*` | `15` | Explicitly enumerated. |
| `PARITY_*` | `7` | Explicitly enumerated. |
| `TRUST_*` | `17` | Explicitly enumerated. |
| `FILING_*` | `32` | Explicitly enumerated. |
| `SUBMISSION_*` | `12` | Explicitly enumerated. |
| `AMENDMENT_*` | `15` | Explicitly enumerated. |

## Per-Gate Reason Codes

### ACCESS_GATE

- No explicit reason-code list was enumerated in the gate section.

### MANIFEST_GATE

- `MANIFEST_NOT_FROZEN_FOR_PRESEAL`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_CONFIG_FREEZE_MISSING`: family `MANIFEST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `MANIFEST_CONFIG_FREEZE_INCOMPLETE`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_INPUT_FREEZE_MISSING`: family `MANIFEST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `MANIFEST_EXECUTION_BASIS_HASH_MISSING`: family `MANIFEST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `MANIFEST_BUILD_CONTEXT_INCOMPLETE`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_REQUIRED_CONFIG_TYPES_MISSING`: family `MANIFEST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `MANIFEST_NON_COMPLIANCE_CONFIG`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_REPLAY_SCOPE_NONLIVE_CONFIG_CONFLICT`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_REPLAY_CONFIG_BASIS_INVALID`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_REPLAY_INPUT_BASIS_INVALID`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_RECOVERY_BASIS_INVALID`: family `MANIFEST_*`, decision applicability `context-dependent`
- `MANIFEST_REPLAY_NONLIVE_CONFIG_NOTICE`: family `MANIFEST_*`, decision applicability `PASS_WITH_NOTICE`
- `MANIFEST_REQUIRED_APPROVAL_MISSING`: family `MANIFEST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`

### ARTIFACT_CONTRACT_GATE

- `ARTIFACT_SCHEMA_MISSING`: family `ARTIFACT_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `ARTIFACT_SCHEMA_NOT_IN_BUNDLE`: family `ARTIFACT_*`, decision applicability `context-dependent`
- `ARTIFACT_SCHEMA_VALIDATION_FAILED`: family `ARTIFACT_*`, decision applicability `context-dependent`
- `ARTIFACT_VERSION_INCOMPATIBLE`: family `ARTIFACT_*`, decision applicability `context-dependent`
- `ARTIFACT_ENVELOPE_INCOMPLETE`: family `ARTIFACT_*`, decision applicability `context-dependent`
- `ARTIFACT_CONTRACT_REF_MISSING`: family `ARTIFACT_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `ARTIFACT_CONTRACT_HASH_MISMATCH`: family `ARTIFACT_*`, decision applicability `context-dependent`
- `ARTIFACT_SCHEMA_DEPRECATED_ALLOWED`: family `ARTIFACT_*`, decision applicability `context-dependent`

### INPUT_BOUNDARY_GATE

- `INPUT_BOUNDARY_UNFROZEN`: family `INPUT_*`, decision applicability `context-dependent`
- `INPUT_POST_BOUNDARY_SOURCE_MUTATION`: family `INPUT_*`, decision applicability `context-dependent`
- `INPUT_CRITICAL_SOURCE_EXCLUDED`: family `INPUT_*`, decision applicability `context-dependent`
- `INPUT_CRITICAL_SOURCE_STALE`: family `INPUT_*`, decision applicability `context-dependent`
- `INPUT_NONCRITICAL_SOURCE_EXCLUDED`: family `INPUT_*`, decision applicability `PASS_WITH_NOTICE`
- `INPUT_NONCRITICAL_SOURCE_CONFIRMED_EMPTY`: family `INPUT_*`, decision applicability `PASS_WITH_NOTICE`
- `INPUT_NONCRITICAL_SOURCE_STALE`: family `INPUT_*`, decision applicability `PASS_WITH_NOTICE`

### DATA_QUALITY_GATE

- `DQ_CRITICAL_DOMAIN_MISSING`: family `DQ_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `DQ_BLOCKING_CONFLICT`: family `DQ_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `DQ_COMPLETENESS_BELOW_MINIMUM`: family `DQ_*`, decision applicability `context-dependent`
- `DQ_DATA_QUALITY_BELOW_MINIMUM`: family `DQ_*`, decision applicability `context-dependent`
- `DQ_STALE_CRITICAL_DOMAIN`: family `DQ_*`, decision applicability `context-dependent`
- `DQ_PROVISIONAL_CRITICAL_FACT`: family `DQ_*`, decision applicability `context-dependent`
- `DQ_NONCRITICAL_WARNING_PRESENT`: family `DQ_*`, decision applicability `PASS_WITH_NOTICE`

### RETENTION_EVIDENCE_GATE

- `RETENTION_CRITICAL_EVIDENCE_ERASED`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_CRITICAL_PATH_MISSING`: family `RETENTION_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `RETENTION_GRAPH_QUALITY_BELOW_MINIMUM`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_CRITICAL_LIMITATION`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_SILENT_LIMITATION_AMBIGUITY`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_SURVIVABILITY_BELOW_AUDIT_MINIMUM`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_SURVIVABILITY_BELOW_SUBMIT_MINIMUM`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_INFERRED_PATH_RATIO_HIGH`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_PROOF_BUNDLE_MISSING`: family `RETENTION_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `RETENTION_TARGET_UNSUPPORTED`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_TARGET_CONTRADICTED`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_PROOF_CLOSURE_OPEN`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_REPLAY_FAILURE`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_EXPLANATION_FAILURE`: family `RETENTION_*`, decision applicability `context-dependent`
- `RETENTION_NONCRITICAL_LIMITATION`: family `RETENTION_*`, decision applicability `PASS_WITH_NOTICE`

### PARITY_GATE

- `PARITY_MATCH`: family `PARITY_*`, decision applicability `PASS`
- `PARITY_MINOR_DIFFERENCE`: family `PARITY_*`, decision applicability `context-dependent`
- `PARITY_MATERIAL_DIFFERENCE`: family `PARITY_*`, decision applicability `context-dependent`
- `PARITY_BLOCKING_DIFFERENCE`: family `PARITY_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `PARITY_NOT_COMPARABLE`: family `PARITY_*`, decision applicability `context-dependent`
- `PARITY_OVERRIDE_REQUIRED`: family `PARITY_*`, decision applicability `OVERRIDABLE_BLOCK`
- `PARITY_OVERRIDE_ACTIVE`: family `PARITY_*`, decision applicability `PASS_WITH_NOTICE`

### TRUST_GATE

- `TRUST_GREEN`: family `TRUST_*`, decision applicability `PASS`
- `TRUST_AMBER`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_RED`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_INSUFFICIENT_DATA`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_INPUT_INCOMPLETE`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_INPUT_STALE`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_INPUT_CONTRADICTION`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_AUTHORITY_STATE_UNRESOLVED`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_THRESHOLD_EDGE_REVIEW`: family `TRUST_*`, decision applicability `MANUAL_REVIEW`
- `TRUST_AUTOMATION_LIMITED`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_REQUIRED_HUMAN_STEPS`: family `TRUST_*`, decision applicability `MANUAL_REVIEW`
- `TRUST_OVERRIDE_DEPENDENT_PROGRESS`: family `TRUST_*`, decision applicability `context-dependent`
- `TRUST_OVERRIDE_ACTIVE_NOTICE`: family `TRUST_*`, decision applicability `PASS_WITH_NOTICE`
- `TRUST_UPSTREAM_GATE_BLOCK`: family `TRUST_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`: family `TRUST_*`, decision applicability `MANUAL_REVIEW`
- `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`: family `TRUST_*`, decision applicability `PASS_WITH_NOTICE`
- `TRUST_ARTIFACT_INCONSISTENT`: family `TRUST_*`, decision applicability `context-dependent`

### AMENDMENT_GATE

- `AMENDMENT_MANIFEST_MODE_ANALYSIS`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_NO_CONFIRMED_FINAL_DECLARATION`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_BASELINE_UNPROVEN`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_WINDOW_CLOSED`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_DRIFT_NOT_MATERIAL`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_INTENT_TO_AMEND_REQUIRED`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_INTENT_TO_AMEND_VALIDATION_FAILED`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_INTENT_TO_AMEND_OVERRIDE_REQUIRED`: family `AMENDMENT_*`, decision applicability `OVERRIDABLE_BLOCK`
- `AMENDMENT_INTENT_TO_AMEND_REVIEW_REQUIRED`: family `AMENDMENT_*`, decision applicability `MANUAL_REVIEW`
- `AMENDMENT_OUT_OF_BAND_BASELINE_UNRESOLVED`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_RETROACTIVE_REPLAY_REQUIRED`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_READINESS_STALE`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_CONTRADICTORY_DRIFT_SOURCES`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_SUPERSEDES_PRIOR_ACTIVE_CHAIN`: family `AMENDMENT_*`, decision applicability `context-dependent`
- `AMENDMENT_ELIGIBLE`: family `AMENDMENT_*`, decision applicability `PASS`

### FILING_GATE

- `FILING_PACKET_UNAVAILABLE`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_MANIFEST_MODE_ANALYSIS`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_TRUST_MISSING`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_TRUST_SUPERSEDED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_TRUST_RECALCULATION_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_AUTHORITY_LINK_INACTIVE`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_OBLIGATION_NOT_OPEN`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_FINAL_DECLARATION_PRECONDITION_MISSING`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_AMENDMENT_BASELINE_MISSING`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_APPROVAL_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_APPROVAL_UNSATISFIABLE`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_OVERRIDE_REQUIRED`: family `FILING_*`, decision applicability `OVERRIDABLE_BLOCK`
- `FILING_OVERRIDE_ACTIVE_NOTICE`: family `FILING_*`, decision applicability `PASS_WITH_NOTICE`
- `FILING_OVERRIDE_AUDIT_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_DECLARED_BASIS_ACK_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_DECLARED_BASIS_ACK_UNSATISFIABLE`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_NOTICE_REQUIRED`: family `FILING_*`, decision applicability `PASS_WITH_NOTICE`
- `FILING_LATE_DATA_CHILD_MANIFEST_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_LATE_DATA_REVIEW_REQUIRED`: family `FILING_*`, decision applicability `MANUAL_REVIEW`
- `FILING_LATE_DATA_NONCRITICAL_EXCLUDED`: family `FILING_*`, decision applicability `PASS_WITH_NOTICE`
- `FILING_PROOF_BUNDLE_MISSING`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_TARGET_UNSUPPORTED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_TARGET_CONTRADICTED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_PROOF_CLOSURE_OPEN`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_GRAPH_REBUILD_REQUIRED`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_EXPLANATION_FAILURE`: family `FILING_*`, decision applicability `context-dependent`
- `FILING_PREPARATION_HARD_BLOCK`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_PREPARATION_OVERRIDE_REQUIRED`: family `FILING_*`, decision applicability `OVERRIDABLE_BLOCK`
- `FILING_PREPARATION_REVIEW_REQUIRED`: family `FILING_*`, decision applicability `MANUAL_REVIEW`
- `FILING_UPSTREAM_GATE_BLOCK`: family `FILING_*`, decision applicability `HARD_BLOCK, OVERRIDABLE_BLOCK`
- `FILING_UPSTREAM_GATE_REVIEW_REQUIRED`: family `FILING_*`, decision applicability `MANUAL_REVIEW`
- `FILING_UPSTREAM_GATE_NOTICE_ACTIVE`: family `FILING_*`, decision applicability `PASS_WITH_NOTICE`

### SUBMISSION_GATE

- `SUBMISSION_REAUTHORIZATION_FAILED`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_MANIFEST_NOT_READY`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_APPROVAL_INVALID`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_DECLARED_BASIS_ACK_INVALID`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_PACKET_MANIFEST_BINDING_MISMATCH`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_PACKET_NOT_APPROVED`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_IDEMPOTENCY_BODY_COLLISION`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_PRIOR_CONFIRMED_EXISTS`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_AMENDMENT_NOT_READY`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_AUTHORITY_TOKEN_INVALID`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_PENDING_ALREADY_EXISTS`: family `SUBMISSION_*`, decision applicability `context-dependent`
- `SUBMISSION_SAFE_IDEMPOTENT_RECOVERY`: family `SUBMISSION_*`, decision applicability `context-dependent`
