# ADR-004: Authority Integration Boundary

- Status: Accepted
- Date: 2026-04-17
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already specifies the hard parts of authority integration in detail: authority layers and delegation remain separate from legal truth, request identity is frozen before send, fraud headers are protocol validity rather than metadata, callbacks must checkpoint before mutation, and recovery must never blind-resend live authority actions. What the corpus did not do centrally was choose one architectural boundary that holds those rules together.

The prior analysis packs normalized `10` authority operation families, `9` canonical response classes, `6` governed truth surfaces, and `5` typed protocol gaps. ADR-004 closes the remaining architecture gap by selecting where provider transport lives, where credentials live, where ingress is checkpointed, where settlement truth is allowed to change, and how recovery resumes without mutating legal state from broker memory or optimistic UI signals.

## Decision

Adopt a **dedicated controlled authority gateway boundary** paired with **vault-mediated credential isolation** and a **separate command-side reconciliation control path**:

- Browser, portal, native, and machine callers may express authority intent only through the northbound command surface; they never call providers directly.
- The manifest and workflow control plane owns request identity, PrincipalContext, AuthorityBinding, submission lineage, response history, resend legality, reconciliation budgets, and all legal-state mutation of `SubmissionRecord`.
- The controlled authority gateway owns provider-specific transport, fraud-header composition, callback authentication, provider-delivery dedupe, and first persistence of `AuthorityIngressReceipt`.
- Raw authority tokens and client-secret material remain inside the token vault and KMS/HSM boundary; the gateway accesses them only by opaque reference.
- `AuthorityIngressReceipt` remains checkpoint truth only. Settlement truth changes only after normalization, merge, and where required reconciliation update the command-side `SubmissionRecord`.
- Recovery after queue loss, restart, or rollback resumes from persisted request lineage, ingress proof, response history, and `reconciliation_control_contract` rather than replaying transport attempts blind.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Authority-of-record truth preservation | HARD_REQUIREMENT | 14 | The boundary must preserve the distinct roles of checkpoint, runtime ledger, settlement ledger, workflow coordination, and customer-safe projection so no internal optimism or transport artifact can masquerade as confirmed authority truth. |
| Raw credential and token isolation | HARD_REQUIREMENT | 12 | Raw authority credentials, client secrets, and signing material must remain behind a governed vault boundary rather than leaking into browser, native, queue, cache, or read-model paths. |
| Send-time revalidation and client-binding fidelity | HARD_REQUIREMENT | 10 | Every live send must stay bound to the frozen authority lineage, client, subject, environment, access binding, and step-up or approval evidence that originally authorized it, with fail-closed behavior on drift. |
| Callback and inbound ingress safety | HARD_REQUIREMENT | 9 | Every callback, poll payload, or recovered provider response must be authenticated, deduped, checkpointed, and strongly correlated before mutation, with weak or ambiguous evidence quarantined instead of promoted. |
| Idempotency and duplicate suppression integrity | HARD_REQUIREMENT | 8 | The architecture must keep request-hash identity, duplicate meaning, idempotency keys, delivery dedupe, and canonical receipt refs as durable control data rather than transient worker memory. |
| Reconciliation and out-of-band correction support | HARD_REQUIREMENT | 10 | The boundary must keep reconciliation as a first-class control path with persisted budget, ambiguity posture, and reopening semantics so late authority truth or contradictory evidence can safely supersede internal projections. |
| No-blind-resend recovery posture | HARD_REQUIREMENT | 10 | Queue loss, worker restart, replay, restore, and rollback must recover from persisted ingress, request lineage, and reconciliation control instead of blindly resending live authority mutations. |
| Multi-provider evolvability and sandbox or production separation | HARD_REQUIREMENT | 7 | Provider transports, profile bindings, callback hosts, and sandbox versus production credentials need one stable boundary that can evolve per provider without collapsing the core control plane or mixing environments. |
| Observability and audit quality | STRONG_PREFERENCE | 7 | The chosen boundary should produce one explainable audit lineage from initiating actor through request hashing, gateway send, ingress checkpoint, normalization, reconciliation, and downstream projection. |
| Operability, testability, and failure isolation | STRONG_PREFERENCE | 7 | The design should make provider failure, ingress quarantine, token rotation, and release gating isolatable and testable without turning every northbound request path into provider-coupled runtime logic. |
| Browser, native, and machine-actor trust-boundary clarity | HARD_REQUIREMENT | 4 | The architecture must keep browser, native, and machine callers away from direct provider traffic so human sessions, service principals, and authority tokens do not collapse into one ambiguous transport edge. |
| Implementation complexity versus safety payoff | TRADEOFF | 2 | The chosen option should add only the complexity needed to protect legal truth, token isolation, and recovery correctness; convenience alone does not justify boundary collapse. |

## Responsibility Split

| Boundary | Class | Primary Artifact | First Forbidden Move |
| --- | --- | --- | --- |
| Browser and portal surfaces | INTERACTIVE_PRESENTATION_EDGE | customer-safe projections only | Call authority providers directly. |
| Native operator workspace | INTERACTIVE_PRESENTATION_EDGE | local session and resume metadata only | Hold raw authority access or refresh tokens on device. |
| Machine automation clients | NON_HUMAN_CALLER | command envelopes and receipts only | Masquerade as a human signatory or approval actor. |
| Northbound API and session gateway | SESSION_AND_COMMAND_EDGE | CommandEnvelope | Perform direct provider transport. |
| Manifest and workflow control plane | DURABLE_COMMAND_CORE | AuthorityBinding | Silently rebind requests to a new client, subject, or authority link. |
| Controlled authority gateway | PROVIDER_TRANSPORT_EDGE | transport-level send witness | Expose raw credentials to browser, native, queue, or read-model paths. |
| Token vault and KMS/HSM | SECRET_ISOLATION_BOUNDARY | SecretVersion | Write raw tokens into queues, logs, read models, browser storage, or device caches. |
| Primary control store | DURABLE_STATE_BOUNDARY | SubmissionRecord | Treat queues or projections as the source of legal truth. |
| Queue and broker | DELIVERY_FABRIC | none; transport-only | Act as a bearer credential by itself. |
| Read-side projector and stream broker | DISPOSABLE_PROJECTION_BOUNDARY | ObligationMirror projection | Upgrade authority truth from cached projection state. |
| Append-only audit store | FORENSIC_EVIDENCE_BOUNDARY | AuthorityOperationPlanned | Overwrite or hide already-persisted authority evidence. |
| Authority provider | EXTERNAL_LEGAL_SYSTEM | external authority truth only | Be treated as an internal projection boundary. |

The responsibility matrix covers `12` explicit boundaries. The core split is intentional: callers stop at the session and command edge, provider transport stops at the controlled gateway, raw secrets stop at the vault, settlement truth stops at `SubmissionRecord`, and customer-safe rendering stops at projections derived from durable truth.

## Authority Operation Map

| Operation | Initiators | Step-Up Posture | Truth Settlement Surface |
| --- | --- | --- | --- |
| AUTH_READ_REFERENCE | PREPARER, APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR, SERVICE_INTEGRATION | STEP_UP_IF_POLICY_OR_BINDING_REQUIRES | AuthorityInteractionRecord by default; SubmissionRecord only when reconciliation lawfully upgrades external truth |
| AUTH_READ_OBLIGATIONS | PREPARER, APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR, SERVICE_INTEGRATION | STEP_UP_IF_POLICY_OR_BINDING_REQUIRES | SubmissionRecord or ObligationMirror only through reconciliation-owned paths; customer-safe projection stays typed |
| AUTH_READ_CALCULATION | PREPARER, APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR, SERVICE_INTEGRATION | STEP_UP_IF_POLICY_OR_BINDING_REQUIRES | AuthorityInteractionRecord by default; SubmissionRecord only when reconciliation lawfully upgrades external truth |
| AUTH_CREATE_OR_AMEND_DATA | PREPARER, APPROVER, TENANT_ADMIN | STEP_UP_OR_APPROVAL_IF_POLICY_REQUIRES | AuthorityInteractionRecord for draft or mutation evidence; no customer-safe confirmation without bound authority evidence |
| AUTH_DELETE_DATA | PREPARER, APPROVER, TENANT_ADMIN | STEP_UP_OR_APPROVAL_IF_POLICY_REQUIRES | AuthorityInteractionRecord for draft or mutation evidence; no customer-safe confirmation without bound authority evidence |
| AUTH_TRIGGER_CALCULATION | PREPARER, APPROVER, TENANT_ADMIN, SERVICE_INTEGRATION | STEP_UP_OR_APPROVAL_IF_POLICY_REQUIRES | AuthorityInteractionRecord and calculation artifacts only; filing settlement remains separate |
| AUTH_SUBMIT_FINAL_DECLARATION | APPROVER, CLIENT_SIGNATORY, TENANT_ADMIN | HUMAN_STEP_UP_OR_APPROVED_EQUIVALENT_REQUIRED | SubmissionRecord only, with ObligationMirror and ClientTimelineEvent reopened or updated downstream |
| AUTH_SUBMIT_PERIODIC_UPDATE | APPROVER, CLIENT_SIGNATORY, TENANT_ADMIN | HUMAN_STEP_UP_OR_APPROVED_EQUIVALENT_REQUIRED | SubmissionRecord only, with ObligationMirror and ClientTimelineEvent reopened or updated downstream |
| AUTH_SUBMIT_POST_FINALISATION_AMENDMENT | APPROVER, CLIENT_SIGNATORY, TENANT_ADMIN | HUMAN_STEP_UP_OR_APPROVED_EQUIVALENT_REQUIRED | SubmissionRecord only, with ObligationMirror and ClientTimelineEvent reopened or updated downstream |
| AUTH_RECONCILE_STATUS | APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR, SERVICE_INTEGRATION | STEP_UP_IF_ESCALATION_OR_OVERRIDE_PATH_REQUIRES | SubmissionRecord after reconciliation resolves ambiguity or out-of-band correction |

The operation map covers all `10` authority-facing operation families. Submission families settle only through `SubmissionRecord`; read, mutation, and calculation families may refresh authority observations but do not bypass the settlement ledger.

## Flow Handling

| Flow | Trigger | Settlement Rule | Quarantine Or Block Conditions |
| --- | --- | --- | --- |
| Live authority submission send | Human-approved submission command | SubmissionRecord only when bound authority evidence lawfully permits mutation | binding drift, step-up or approval expiry, duplicate occupancy, token-client mismatch |
| Inline acknowledgement observation | Synchronous provider response on the live send path | SubmissionRecord for direct bound mutations; otherwise AuthorityInteractionRecord until reconciliation resolves | ambiguous correlation, inconsistent state, timeout placeholder superseded by stronger evidence |
| Asynchronous callback or poll ingress | Provider callback, poll result, or recovered gateway response | AuthorityIngressReceipt is checkpoint only; SubmissionRecord remains the settlement ledger | weak authority-reference-only binding, unbound delivery, provider authentication failure |
| Duplicate or ambiguous ingress quarantine | Duplicate callback, reordered delivery, or weakly correlated provider payload | None until strong bound evidence exists | duplicate delivery, authority_reference-only match, ambiguous lineage, unbound payload |
| Reconciliation after pending, timeout, or conflicting evidence | PENDING_ACK, timeout placeholder, contradictory callback, or out-of-band discovery | SubmissionRecord after reconciliation; subordinate mirrors reopen downstream | budget exhausted, blocked by escalation, contradictory evidence below confidence threshold |
| Recovery after queue loss, worker restart, or rollback | Queue rebuild, worker reclaim, release rollback, or disaster recovery | Persisted command-side truth only; broker state is never authoritative | resend_legality_state blocks fresh transmit, authority_binding_revalidation not verified, authority_rebuild not verified |

The chosen boundary centralizes `6` critical send, ingress, reconciliation, and recovery flows and `7` callback or quarantine cases. This closes the earlier gap where send path, callback path, and reconciliation path were each explicit in prose but not collapsed into one architecture choice.

## Truth Surface Mapping

| Artifact | Truth Role | Owning Component | Settlement Role |
| --- | --- | --- | --- |
| AuthorityInteractionRecord | AUTHORITY_RUNTIME_LEDGER | MANIFEST_WORKFLOW_CONTROL_PLANE | runtime_control_only |
| AuthorityIngressReceipt | AUTHORITY_INGRESS_CHECKPOINT | CONTROLLED_AUTHORITY_GATEWAY | checkpoint_only |
| SubmissionRecord | AUTHORITY_SETTLEMENT_LEDGER | MANIFEST_WORKFLOW_CONTROL_PLANE | authority_settlement |
| ObligationMirror | INTERNAL_OBLIGATION_MIRROR | READ_SIDE_PROJECTOR_AND_STREAM_BROKER | subordinate_internal_mirror |
| WorkflowItem | INTERNAL_WORKFLOW_COORDINATION | MANIFEST_WORKFLOW_CONTROL_PLANE | coordination_only |
| ClientTimelineEvent | CUSTOMER_SAFE_STATUS_PROJECTION | READ_SIDE_PROJECTOR_AND_STREAM_BROKER | customer_safe_projection_only |

This mapping is the reason the gateway boundary wins. `AuthorityIngressReceipt` is preserved as checkpoint-only evidence, `AuthorityInteractionRecord` remains runtime control and history, `SubmissionRecord` remains the only durable settlement ledger, and projections remain subordinate to those command-side artifacts.

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 93.0 | 1 |
| Inline authority integration inside the main northbound API and orchestrator boundary | 61.7 | 2 |
| External managed integration or iPaaS boundary as the primary transport edge | 45.25 | 3 |

The winning option is **Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control** with a weighted score of `93.0`.

## Why This Option Wins

- It is the only option that preserves the corpus's checkpoint-versus-settlement split structurally rather than by convention.
- It gives raw credentials one narrow blast radius: the token vault and the controlled gateway.
- It lets provider-specific profile bindings, fraud headers, callback hosts, and sandbox-versus-production differences evolve without infecting the whole northbound surface.
- It matches the no-blind-resend recovery rules because resend legality, ingress proof, and response history remain durable command-side data instead of transport-local behavior.
- It keeps machine callers distinct from human sessions and still enforces the no-direct-provider rule across browser, native, and automation surfaces.

## Guardrails On The Decision

- Browser, native, and portal surfaces SHALL NOT call authority providers directly.
- Machine actors SHALL remain distinct from human sessions and SHALL NOT bypass human-only step-up or signatory requirements.
- Raw authority tokens and client secrets SHALL remain in the token vault and KMS/HSM boundary, never in browser storage, device caches, queues, or read models.
- Sandbox and production provider profiles, callback hosts, and credentials SHALL remain explicitly partitioned.
- `AuthorityIngressReceipt` SHALL remain checkpoint evidence only; it SHALL NOT settle legal truth by itself.
- Duplicate, reordered, weakly bound, or ambiguous callback deliveries SHALL dedupe, quarantine, or reconcile rather than silently overwrite active truth.
- Queue loss, replay, or restore SHALL NOT blind-resend live authority mutations without request-lineage comparison, idempotency verification, send-time binding revalidation, and persisted resend legality permitting that exact action.
- Late authority corrections SHALL reopen downstream mirrors, workflow coordination, and customer-safe projections where the truth-separation contract requires it.

## Consequences

Positive consequences:

- Future authority adapter work now has one fixed home: the controlled gateway, not the browser, not the northbound API, and not the projection layer.
- Security posture becomes easier to reason about because token use, callback authentication, and fraud-header composition happen inside one narrow edge.
- Recovery posture becomes explicit: restore resumes from primary truth artifacts and reconciliation control instead of guessing from broker or timeout state.

Negative consequences and tradeoffs:

- The runtime topology is more complex than an inline provider integration, because the gateway, vault, and command core must cooperate through durable contracts.
- Engineers must maintain sharper boundary discipline: the gateway cannot become a hidden settlement engine, and the control plane cannot become a direct provider client.
- Provider SDK convenience or hosted integration shortcuts are rejected when they conflict with checkpoint, lineage, or settlement semantics.

## Rollback And Recovery Posture

- Code rollback may occur only when schema and compatibility boundaries allow it; legal authority truth is never rolled back by deleting evidence.
- Outstanding authority work rebuilds from persisted `AuthorityIngressReceipt`, `AuthorityInteractionRecord`, `SubmissionRecord`, and inbox truth.
- Fresh resend after bytes have left process remains illegal unless request-lineage comparison, idempotency, binding revalidation, and persisted resend legality all permit it.
- Quarantined, duplicate-suppressed, and ambiguous ingress remains durable so recovery does not lose the reason a payload was blocked.

## Deferred Decisions

- GAP-AUTH-001: Instantiate authority product profiles per provider/environment and bind exact provider codes to the canonical response classes.
- GAP-AUTH-002: Define the manual investigation and approval workflow for promoting quarantined ingress after stronger evidence is gathered.
- GAP-AUTH-003: Bind reconciliation source-family weights to a versioned runtime policy artifact shared with the trust and authority uncertainty layers.
- GAP-AUTH-004: Define operator, client-visible, and replay behavior for each authority correction cause before live provider support is enabled.
- GAP-AUTH-005: Publish a dedicated authority reason-code registry covering send-time blocks, resend refusals, escalation triggers, and correction causes.

These are intentionally deferred because they concern concrete provider implementation data or operational workflow specifics, not the boundary choice itself.

## References

- Responsibility matrix: [authority_boundary_responsibility_matrix.json](/Users/test/Code/taxat_/data/analysis/authority_boundary_responsibility_matrix.json)
- Operation map: [authority_operation_to_boundary_map.json](/Users/test/Code/taxat_/data/analysis/authority_operation_to_boundary_map.json)
- Send, receive, and reconciliation flow: [authority_send_receive_reconciliation_flow.json](/Users/test/Code/taxat_/data/analysis/authority_send_receive_reconciliation_flow.json)
- Credential and token boundary: [authority_credential_and_token_boundary.json](/Users/test/Code/taxat_/data/analysis/authority_credential_and_token_boundary.json)
- Callback quarantine matrix: [authority_callback_ingress_and_quarantine_matrix.json](/Users/test/Code/taxat_/data/analysis/authority_callback_ingress_and_quarantine_matrix.json)
- Truth surface mapping: [authority_truth_surface_mapping.json](/Users/test/Code/taxat_/data/analysis/authority_truth_surface_mapping.json)
- Scorecard: [ADR-004-authority-integration-boundary-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-004-authority-integration-boundary-scorecard.json)
- Comparison notes: [ADR-004-authority-integration-boundary-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-004-authority-integration-boundary-comparison.md)
- Decision diagram: [ADR-004-authority-boundary.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-004-authority-boundary.mmd)
