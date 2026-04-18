# 12 Authority Sequence And Boundary Matrix

## Sequence Ledger

| Step | Stage | Module | Purpose |
| --- | --- | --- | --- |
| `AUTHORITY_PREFLIGHT` | `preflight` | `AUTHORITY_PREFLIGHT` | Re-authorize the action, check manifest state, and require a live authority-safe control posture before any canonical request work begins. |
| `RESOLVE_AUTHORITY_OPERATION` | `preflight` | `RESOLVE_AUTHORITY_OPERATION` | Freeze AuthorityOperation with requested_scope[], runtime_scope[], attempt lineage, provider contract, and executable partition scope. |
| `RESOLVE_AUTHORITY_BINDING` | `preflight` | `RESOLVE_AUTHORITY_BINDING` | Resolve one concrete connector, delegation, authority-link, and token lineage that exactly matches the operation tuple. |
| `CANONICALIZE_REQUEST` | `request_identity` | `CANONICALIZE_AUTHORITY_REQUEST` | Render canonical path, query, payload bytes, and header profile refs from the frozen operation and binding. |
| `DERIVE_REQUEST_HASHES` | `request_identity` | `DERIVE_AUTHORITY_REQUEST_HASHES` | Compute request_body_hash, identity_namespace_hash, duplicate_meaning_key, request_hash, and idempotency_key. |
| `BUILD_REQUEST_ENVELOPE` | `request_identity` | `BUILD_AUTHORITY_REQUEST_ENVELOPE` | Create AuthorityRequestEnvelope and grouped request_identity_contract only after identity completion and human-gate satisfaction. |
| `BEGIN_REQUEST_LINEAGE` | `settlement_pre_send` | `BEGIN_SUBMISSION_RECORD` | Persist initial SubmissionRecord in INTENT_RECORDED before the request leaves the process. |
| `CHECK_DUPLICATE_PENDING_BUCKET` | `settlement_pre_send` | `EXISTING_SUBMISSIONS` | Load existing submission lineage for the same duplicate_meaning_key and route resend-versus-reconcile decisions before transmit. |
| `SUBMISSION_GATE` | `settlement_pre_send` | `SUBMISSION_GATE` | Block malformed, duplicate, pending, amendment-ineligible, or legally unsafe sends before transport mutation. |
| `SEND_TIME_REVALIDATION` | `transmit` | `SUBMIT_TO_AUTHORITY` | Take the exclusive send claim and re-check binding lineage, duplicate truth, approvals, and provider contract immediately before bytes leave the process. |
| `SUBMIT_TO_AUTHORITY` | `transmit` | `SUBMIT_TO_AUTHORITY` | Transmit the sealed request through the controlled gateway and move resend posture into recovery-only or follow-up-read-only as appropriate. |
| `CHECKPOINT_AUTHORITY_INGRESS` | `ingress` | `CHECKPOINT_AUTHORITY_INGRESS` | Authenticate callback, poll, inbox, or recovery payloads, dedupe them, and persist AuthorityIngressReceipt before any legal-state mutation. |
| `PROJECT_AUTHORITY_INGRESS_INVESTIGATION` | `ingress` | `PROJECT_AUTHORITY_INGRESS_INVESTIGATION` | Build a read-only investigation snapshot for quarantined or duplicate-suppressed ingress without mutating legal truth. |
| `NORMALIZE_AUTHORITY_RESPONSE` | `normalization` | `NORMALIZE_AUTHORITY_RESPONSE` | Normalize inline and async provider observations into protocol response classes with explicit correlation and legal-effect posture. |
| `MERGE_AUTHORITY_RESPONSE_OBSERVATION` | `normalization` | `MERGE_AUTHORITY_RESPONSE_OBSERVATION` | Append every normalized response to history, classify its derivation posture, and update active meaning only when legally admissible. |
| `RECORD_AUTHORITY_INTERACTION` | `runtime_ledger` | `RECORD_AUTHORITY_INTERACTION` | Persist the runtime ledger linking operation, request, responses, submission lineage, drift sentinel, and reconciliation posture. |
| `PERSIST_RECONCILIATION_CONTROL` | `reconciliation` | `PERSIST_AUTHORITY_RECONCILIATION_CONTROL` | Persist grouped reconciliation budget, resend legality, deadline, escalation ownership, and analytics outcome class. |
| `RECOVER_SUBMISSION_ATTEMPT` | `reconciliation` | `RECOVER_SUBMISSION_ATTEMPT` | Reuse exact request/response lineage for safe idempotent recovery while honoring resend_legality_state and resend_control_reason_codes[]. |
| `RECONCILE_AUTHORITY_STATE` | `reconciliation` | `RECONCILE_AUTHORITY_STATE` | Resolve pending, unknown, out-of-band, and conflicting states from authenticated evidence, preserved response history, and quantitative thresholds. |
| `UPSERT_OBLIGATION_MIRROR` | `projection` | `UPSERT_OBLIGATION_MIRROR` | Persist authority-grounded mirror state without collapsing pending, confirmed, unknown, rejected, or out-of-band posture into one anchor. |
| `EMIT_RECONCILIATION_ANALYTICS` | `analytics` | `EMIT_AUTHORITY_RECONCILIATION_ANALYTICS` | Emit replay-safe tuning and escalation analytics only from persisted reconciliation control contracts. |

## Truth And Projection Boundaries

| Surface role | Artifact | Allowed authority states | Forbidden promotion |
| --- | --- | --- | --- |
| `AUTHORITY_RUNTIME_LEDGER` | `AuthorityInteractionRecord` | `NOT_REQUESTED`, `UNKNOWN`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `OUT_OF_BAND` | must not be rendered as confirmed customer truth merely because a response exists |
| `AUTHORITY_INGRESS_CHECKPOINT` | `AuthorityIngressReceipt` | `NOT_APPLICABLE`, `UNKNOWN` | cannot settle legal truth before strong binding and normalization complete |
| `AUTHORITY_SETTLEMENT_LEDGER` | `SubmissionRecord` | `UNKNOWN`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `OUT_OF_BAND` | no internal optimism or workflow completion may write CONFIRMED |
| `INTERNAL_OBLIGATION_MIRROR` | `ObligationMirror` | `NOT_REQUESTED`, `UNKNOWN`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `OUT_OF_BAND` | cannot reuse confirmed anchors for unknown, rejected, or out-of-band posture |
| `INTERNAL_WORKFLOW_COORDINATION` | `WorkflowItem` | `NOT_APPLICABLE`, `UNKNOWN`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `OUT_OF_BAND` | workflow DONE may not imply resolved authority truth while settlement remains pending, unknown, or out-of-band |
| `CUSTOMER_SAFE_STATUS_PROJECTION` | `ClientTimelineEvent` | `NOT_APPLICABLE`, `UNKNOWN`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `OUT_OF_BAND` | cannot render pending, unknown, or out-of-band posture as resolved reassurance |

## Northbound Guardrails

- Commands do not carry authority tokens, raw audit signatures, or client-derived legal-state flags.
- Recovery and retry semantics stay bound to durable ids and receipts, not read-side projection identity.
- Customer-safe surfaces may only render confirmed authority state from the settlement ledger or a downstream authority-grounded mirror update.
