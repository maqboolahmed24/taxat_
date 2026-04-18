# Shared Operating Contract for pc_0206 to pc_0213

This contract governs roadmap cards `pc_0206` through `pc_0213`.
Read it before acting on any card in this tranche.
Each card inherits these rules and adds task-specific deliverables.

## Tranche scope

This tranche covers two tightly coupled domains:

1. **Nightly recovery and autopilot control truth**
   - frozen nightly batch identity
   - persisted per-candidate selection dispositions
   - stable shard planning, heartbeat, stale reclaim, and successor lineage
   - operator-morning digest derivation from persisted truth only
   - non-mutating nightly portfolio counterfactual simulation

2. **Retention, privacy, runtime hardening, and authority-ingress control truth**
   - canonical retention tagging and typed artifact-retention lifecycle
   - erasure proof, legal hold, and privacy-minimization workflows
   - governed secret version lineage, rotation, cutover, and attestation
   - runtime HTTP/network/browser hardening guards
   - authenticated authority-ingress proof, correlation, quarantine, dedupe, and reconciliation control binding

## Canonical algorithm sources

Use the algorithm archive as the definitive source of truth.
For this tranche, the most important sources are:

- `nightly_selection_disposition_and_batch_isolation_contract.md`
- `nightly_autopilot_contract.md`
- `retention_and_privacy.md`
- `security_and_runtime_hardening_contract.md`
- `modules.md`
- `data_model.md`
- `northbound_api_and_session_contract.md`
- `PATCH_RESOLUTION_INDEX.md`
- `test_vectors.md`
- `scripts/validate_contracts.py`
- `tools/forensic_contract_guard.py`

You MUST also validate all emitted model shapes against the canonical JSON schemas in `Algorithm/schemas/`.
Treat schema, prose contract, module law, and validator expectations as one integrated source, not competing hints.

## Mandatory predecessor context

When implementing any card in this tranche, consume outputs from earlier roadmap cards if they exist, especially:

- `pc_0038` through `pc_0045` for HMRC credential lineage, IdP/session posture, notification topology, and support/help boundaries
- `pc_0046` through `pc_0053` for OCR/malware/manual-checkpoint/object-store/message-fabric/cache-resume foundations
- `pc_0054` through `pc_0061` for telemetry topology, release supply-chain truth, edge/cache law, monorepo/package bootstrap, contract-import discipline, and generated bindings
- `pc_0066` through `pc_0069` for schema migrations, idempotent inbox/outbox substrate, northbound command truth, and governed object lifecycle
- `pc_0070` through `pc_0077` for queue truth, resumable streams, cache isolation, config-plus-flag resolution, signal correlation, and append-only audit continuity
- `pc_0086` through `pc_0093` for principal context, layered authority packets, runtime scope binding, governance simulation, approval policy, and replay-safe hash calculators
- `pc_0094` through `pc_0101` for session revocation/device binding/CSRF, policy snapshot persistence, run-manifest lineage, and frozen-config materialization
- `pc_0102` through `pc_0109` for prior-manifest validation, start-claim/reclaim, pre-seal gating, release-candidate identity, replay attestation, and collection boundary control objects
- `pc_0110` through `pc_0117` for source collection orchestration, evidence/source persistence, normalization, candidate fact extraction, conflict detection, and `InputFreeze`
- `pc_0118` through `pc_0127` for snapshot assembly, exact-decimal compute, forecast/risk/parity/trust, ordered gate evaluation, and terminal decision finalization
- `pc_0134` through `pc_0141` for authority settlement truth, sealed transport models, exact request identity, duplicate buckets, send-time drift protection, ingress-first normalization, and portal-native calculation confirmation
- `pc_0142` through `pc_0157` for authority correction/workflow/collaboration, projector/read-model truth, customer-safe visibility boundaries, remediation/failure-lineage artifacts, continuity metadata, queue health, and command receipt foundations
- `pc_0158` through `pc_0169` for recovery anchor rules, manifest reads/streams, governance/portal/collaboration read packs, audit/enquiry/recovery boundary, stale-view handling, and low-noise frame/surface budgets
- `pc_0174` through `pc_0189` for shell taxonomy/accessibility/portal/document request/upload identity, approval/onboarding/timeline/help/language/preview governance, and dominant-attention formulas
- `pc_0190` through `pc_0205` for governance policy snapshots, access simulation, retention-governance frames, audit investigation frames, manifest-lineage explorer, explainability, checkpoints, restore-privacy reconciliation, replay, golden packs, cache isolation, native hydration, and cross-device continuity

## Package and boundary expectations

Organize code by durable boundary, not by page name.
Use or create the following package seams if they are missing:

- `packages/backend-recovery`
- `packages/backend-retention`
- `packages/backend-security`
- `packages/backend-authority`
- optional read-only diagnostics under `apps/admin-console-web/src/routes/debug/recovery/`, `debug/retention/`, `debug/security/`, or `debug/authority/`
- docs under `docs/recovery/`, `docs/retention/`, `docs/security/`, and `docs/authority/`

If a required package does not exist, create it deliberately and record an explicit assumption note such as:

- `ASSUMPTION_BACKEND_RETENTION_PACKAGE_CREATED`
- `ASSUMPTION_BACKEND_SECURITY_PACKAGE_CREATED`
- `ASSUMPTION_RECOVERY_DEBUG_ROUTE_CREATED`

Do not scatter core law across controllers, queues, or UI-only helpers.
The canonical service that evaluates or persists one contract must live in a backend package and be reused by route handlers, workers, and diagnostics.

## Tranche boundaries

This tranche MAY complete:

- nightly batch identity persistence and per-candidate selection disposition truth
- nightly shard planning, batch heartbeat, stale reclaim, successor linkage, and operator morning digest derivation
- nightly non-mutating portfolio counterfactual simulation
- retention-tag derivation, artifact-retention lifecycle, expiry propagation, limitation propagation, and lineage binding to error/remediation objects
- erasure proof, legal hold, privacy-minimization workflows, and lawful surviving-derived-artifact posture
- secret-version lineage, rotation, cutover, retirement, revocation, and attestation rules
- runtime hardening guards for headers, CSP, CORS, anti-clickjacking, anti-content-sniffing, origin validation, and rate limits
- authority ingress receipt proof, correlation contract binding, duplicate suppression, quarantine posture, normalization eligibility, and reconciliation control persistence

This tranche MUST NOT silently absorb:

- observability model work reserved for `pc_0214` through `pc_0218`
- release-resilience artifacts reserved for `pc_0219+`
- UI-local reinterpretation of nightly dispositions, retention legality, or ingress correlation status
- speculative live re-query inside counterfactual simulation or exact replay-like nightly analysis
- generic platform hardening that is not bound to the algorithm’s named control objects and policies

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first.
Any browser-visible lab, atlas, or read-only diagnostic you add MUST remain a reflection of server-authored truth, never a second implementation.

### Shared visual language

- posture: minimalist premium, quiet control-plane surfaces, not dashboard walls
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced motion mandatory
- no donut charts, no pie charts, no gauge walls, no generic KPI cards

### Palette

- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- accent: `#0F766E`
- info accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`
- max content width: `1440px`
- outer padding: `28px` mobile / `36px` desktop

Shared layout rules:

- one context strip, one primary canvas, and one narrow supporting sidecar at most
- one promoted support surface maximum
- preserve selected object, active context, and focus anchor through compaction, reconnect, resize, and stale recovery whenever the same object remains lawful
- diagrams are allowed only when they clarify lineage or causality; prefer ladders, rails, ribbons, matrices, ordered ledgers, and step timelines

Preferred optional read-only lab forms by card:

- `pc_0206`: batch-identity ribbon + selection-disposition ledger + shard-eligibility coverage strip
- `pc_0207`: shard/reclaim timeline + heartbeat lineage rail + digest publication state strip
- `pc_0208`: counterfactual diff matrix + backlog/tail-risk rails + highlight-movement ladder
- `pc_0209`: retention clock lattice + survivability/limitation matrix + expiry lineage ledger
- `pc_0210`: hold/erasure state rail + surviving-artifact minimization ledger + proof sidecar
- `pc_0211`: secret lineage ladder + cutover/retire/revoke timeline + attestation status rail
- `pc_0212`: hardening policy atlas with header/CORS/rate-limit cards and explicit exception registry
- `pc_0213`: ingress correlation neighborhood table + quarantine/duplicate state band + safe-next-action ladder

## Non-negotiable interpretation rules

- `NightlyBatchRun.identity_contract{...}` is the frozen nightly batch-identity envelope. `selection_entries[]` is the authoritative persisted per-candidate disposition set. `shard_plan[]` is the authoritative execution-only shard map. Every candidate in the frozen nightly universe SHALL materialize exactly one persisted selection row. `REUSE_EXISTING_TERMINAL_RESULT` wins before new manifest allocation.

- Duplicate scheduler deliveries SHALL reuse the same active batch or return a typed terminal response; a second active batch for the same tenant and `nightly_window_key` SHALL NOT exist unless the earlier batch is lawfully abandoned by successor reclamation.

- Only execution-capable nightly rows belong in shards. Reuse, defer, escalate, and skip dispositions remain off-shard with null fairness/shard keys.

- `OperatorMorningDigest` SHALL be derived only from persisted `NightlyBatchRun`, `RunManifest`, `DecisionBundle`, workflow, notification, and error/remediation truth. It SHALL NOT be reconstructed from logs, queue residue, or operator memory.

- `NightlyPortfolioWhatIfSimulation` is a non-mutating artifact. It SHALL replay persisted batch-selection truth for one nightly window or one lawful successor chain, and SHALL preserve blocking semantics for authority ambiguity, approval, step-up, and non-execution boundaries.

- `RetentionTag` is the canonical retained privacy/expiry tag. `ArtifactRetention` is the live lifecycle control object bound to that tag. Expiry, legal hold, erasure eligibility, pseudonymisation, and limitation behavior SHALL stay typed and machine-readable.

- `ErasureProof` is append-only proof preservation. No erasure path may destroy the proof of request, basis, action, or outcome. Surviving lawful derived artifacts SHALL remain explicit and limited.

- `SecretVersion` is the governed secret/key-version contract. Rotation, attestation, activation, retirement, revocation, and historical-read windows SHALL remain chronologically valid and lineage-safe. No queued authority send may silently rebind to a different token/client/subject lineage.

- Runtime hardening is a product control boundary, not a UI preference. CSP, frame-ancestor, CORS, anti-clickjacking, anti-content-sniffing, safe download/export headers, origin validation, and rate limits SHALL be explicit, typed, and stable across routes.

- `AuthorityIngressReceipt` MUST be persisted before response normalization or legal-state mutation. `authority_ingress_proof_contract{...}` and `AuthorityIngressCorrelationContract` MUST preserve authenticated ingress, dedupe, comparison-set truth, weak-vs-exact binding, duplicate suppression, quarantine, and reconciliation-owner posture. A lone authority-reference match is not sufficient for exact legal correlation.

## Validator expectations to preserve

Treat the following validator expectations as non-negotiable when you patch fixtures, services, projector outputs, or contracts:

- nightly batch identity / selection / shard isolation:
  - `nightly_batch_run_recovery_and_accounting_alignment`
  - `nightly_batch_run_identity_contract_mirror`
  - `nightly_batch_run_reuse_precedence_before_new_allocation`
  - `nightly_batch_run_shard_plan_must_cover_execution_entries`
  - `nightly_batch_run_terminal_batches_require_explicit_outcomes`
  - `nightly_batch_run_reader_window_mirror`
- operator digest / autopilot:
  - `operator_morning_digest_initial_publication_complete_unresolved_handoff`
  - `operator_morning_digest_recovery_supersession_complete`
  - `operator_morning_digest_workflow_publication_and_summary_alignment`
  - `operator_morning_digest_recovery_supersession_lineage`
  - `operator_morning_digest_publication_qa_queue_partition_hash_mirror`
  - `operator_morning_digest_publication_qa_requires_settled_publication`
  - `nightly_batch_run_digest_publication_requires_contract_and_ref`
  - `nightly_batch_run_digest_publication_requires_quiescence_safe_state`
- nightly simulation:
  - `nightly_portfolio_what_if_simulation_digest_impact_comparison`
  - `nightly_portfolio_what_if_simulation_retry_budget_reason_binding`
  - `nightly_portfolio_what_if_simulation_authority_ambiguity_stays_blocking`
  - `nightly_portfolio_what_if_simulation_highlight_diff_partition`
- retention / erasure:
  - `retention_tag_chronology_and_blocking_basis_posture`
  - `artifact_retention_state_reverse_and_expiry_chronology`
- secret lineage:
  - `secret_version_rotation_state_and_chronology_posture`
- authority ingress:
  - `authority_ingress_receipt_binding_and_state_posture`
  - `authority_ingress_receipt_partial_bind_must_quarantine`
  - `authority_ingress_receipt_duplicate_suppressed_requires_canonical`
  - `authority_ingress_correlation_contract_ambiguous_requires_multiple_candidates`
  - `authority_ingress_correlation_contract_missing_provider_keys_distinct_from_no_match`
  - `authority_ingress_investigation_snapshot_duplicate_requires_distinct_canonical`
  - `authority_ingress_investigation_snapshot_requires_safe_reconciliation_action`

## Common validation and test rules

- Validate every newly emitted model, contract packet, read model, and worker payload against its canonical JSON schema before persistence or response emission.
- Add deterministic unit and repository tests for every newly introduced state machine, hash calculation, and lineage-binding rule.
- If you expose or patch northbound/admin routes, add Playwright `APIRequestContext` tests for the route contract.
- If you add any browser-visible diagnostic route, test it with Playwright using semantic or user-facing locators only. No CSS chains, no coordinate clicks, no fixed sleeps.
- Capture traces or equivalent serialized payload evidence on failure.
- Prefer deterministic fixtures, seeded enumeration, canonical sample artifacts, and append-only evidence over timing-dependent mocks.
- Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the tranche changes land.
