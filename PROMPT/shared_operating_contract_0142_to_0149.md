# Shared Operating Contract for `pc_0142` to `pc_0149`

This block completes the first authority follow-up loop and establishes the durable workflow / collaboration substrate.
The implementation agent must preserve two hard boundaries:

1. `SubmissionRecord` plus `TemporalPropagationEvent` carry post-seal legal-truth change and its propagation basis.
2. `WorkflowItem`, `Collaboration*`, `RequestInfoRecord`, `WorkItemParticipant`, and `WorkItemNotification` are coordination and projection artifacts only.
   They may react to authority truth, but they must never manufacture it.

## Mandatory source order

Read and obey sources in this order before making any implementation decision:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed cards `pc_0001` through `pc_0141`.
   Reuse earlier decisions for package boundaries, schema binding generation, deterministic ids, stable hashing, exact-decimal handling, reference grammar, idempotent command handling, replay discipline, cross-device continuity, focus restoration, notification foundation, authority transport, packet/filing models, calculation confirmation flow, and the first authority settlement layer.

2. Core Taxat corpus:
   - `README.md`
   - `core_engine.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `constraint_coverage_index.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `error_model_and_remediation_model.md`
   - `observability_and_audit_contract.md`

3. Task-specific contracts for this tranche:
   - `authority_interaction_protocol.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `late_data_authority_correction_and_replay_propagation_contract.md`
   - `amendment_and_drift_semantics.md`
   - `authority_calculation_contract.md`
   - `compute_parity_and_trust_formulas.md`
   - `collaboration_workspace_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `low_noise_experience_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `admin_governance_console_architecture.md`
   - `UIUX_DESIGN_SKILL.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`

4. Authoritative executable artifacts:
   - every relevant file under `Algorithm/schemas/`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema constraints and validator-enforced invariants as authoritative.
   Human-readable docs, query routes, charts, and helper DTOs are downstream only.

5. Official platform guidance for browser verification and provider-specific implementation technique.
   Use current Playwright guidance for semantic locators, auto-waiting, actionability, traces, and resilient browser automation.
   Use current HMRC documentation only where the Taxat corpus intentionally leaves provider-specific operational detail open, especially around obligations visibility, fraud-prevention headers, and forward-compatible correction visibility.
   Use current Apple HIG and Material guidance for typography hierarchy, readable layout width, accessible color roles, and restrained motion when this block introduces browser-visible surfaces.
   External sources may sharpen technique, but they never override Taxat semantics.

## Package and implementation placement rules

- `pc_0142`, `pc_0143`, and `pc_0144` belong inside the authority-domain backend package chosen by `pc_0028`.
  If that package does not exist, create `packages/backend-authority` and emit `ASSUMPTION_BACKEND_AUTHORITY_PACKAGE_CREATED`.

- `pc_0143` extends the existing client-portal approvals flow from `pc_0141`.
  Place backend services in `packages/backend-authority`.
  Place shared presentational primitives in `packages/shared-ui` if they do not already exist.
  Place portal route and component updates in `apps/client-portal-web`.
  Place browser verification in `tests/playwright/client_portal`.

- `pc_0144` is primarily backend authority work, but it MAY and SHOULD include one read-only internal operator surface for verifying the aggregated analytics model.
  Place backend services in `packages/backend-authority`.
  Place any internal browser route in `apps/admin-console-web`.
  Place any shared UI primitives in `packages/shared-ui`.
  Place browser verification in `tests/playwright/admin_console`.

- `pc_0145` through `pc_0149` belong inside the workflow-domain backend package chosen by `pc_0028`.
  If that package does not exist, create `packages/backend-workflow` and emit `ASSUMPTION_BACKEND_WORKFLOW_PACKAGE_CREATED`.

- `pc_0149` may create a thin internal notification-preview / contract harness if needed for deterministic notification-open verification.
  Do not widen that into a general notification center product in this tranche.

- Reuse generated schema bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and continue to validate against the canonical schemas before persistence.

- Reuse earlier shared helpers from `pc_0058`, `pc_0060`, `pc_0061`, `pc_0064` through `pc_0069`, `pc_0071` through `pc_0077`, `pc_0086` through `pc_0093`, `pc_0094` through `pc_0109`, `pc_0118` through `pc_0127`, `pc_0133`, and `pc_0134` through `pc_0141` whenever those outputs exist.
  There must be one canonical implementation for deterministic ordering, hashing, id generation, schema validation, route stability, access-binding comparison, focus restoration, replay fixtures, authority truth packets, packet lifecycle checks, and semantic selector registration.

- Respect tranche boundaries.
  This block may complete:
  - post-seal authority correction / out-of-band propagation;
  - packet-local notice resolution;
  - reconciliation analytics aggregation and insight queries;
  - workflow aggregate, routing, collaboration, request, attachment, participant, and notification foundations.
  It must not silently absorb later workspace/projector tasks (`pc_0150+`) except for narrowly-scoped seed artifacts or harnesses required to keep these tasks executable.

## Shared design contract for browser-visible surfaces in this block

This tranche is mostly backend-first.
Mandatory browser-visible work is limited to:
- packet-local notice rendering refinements in `pc_0143`;
- a read-only reconciliation-insights surface in `pc_0144`;
- optionally, a thin notification contract harness in `pc_0149` if needed for deterministic open-target verification.

### Visual language

- Overall posture: minimalist premium, calm, precise, no generic analytics-dashboard styling
- Background: `#F7F5F0`
- Primary surface: `#FFFFFF`
- Secondary surface: `#F1F5F3`
- Primary ink: `#171717`
- Secondary text: `#667085`
- Accent / action: `#0F766E`
- Informational accent: `#1D4ED8`
- Warning: `#B7791F`
- Danger: `#C2410C`
- Borders: `rgba(23,23,23,0.08)`
- Shadow: low amplitude only, e.g. `0 8px 24px rgba(23,23,23,0.06)`
- Typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- Monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace

### Type scale

- page title: `32/38`, semibold
- section title: `20/28`, semibold
- panel title: `16/24`, semibold
- label / eyebrow: `12/16`, medium, letter spacing `0.04em`
- body: `14/22`, regular
- small helper text: `12/18`, regular
- code / ids / hashes: `12/18`, medium monospace

### Layout rules

- page max width: `1280px` for portal routes, `1440px` for internal operator routes
- outer padding: `24px` mobile, `32px` desktop
- gutters: `20px`
- panel radius: `18px` to `20px`
- use one dominant column and at most one restrained contextual rail
- avoid chart walls, KPI mosaics, or three-column dashboards

### Motion and interaction

- only opacity / translate / height disclosure motion
- duration: `140ms` to `180ms`
- no bounce, parallax, looping decoration, or semantic-priority-changing motion
- reduced-motion support is mandatory
- headings, landmarks, and focus order must follow visible semantic order
- sticky notices may exist, but must not obscure the dominant action or current legal explanation

### Charts / diagrams / logos

- Include a diagram only when it clarifies reconciliation posture, packet-local notice order, or notification-open routing better than prose.
- Preferred forms:
  - one restrained horizontal state band;
  - one compact sparkline / latency strip;
  - one reason matrix or ordered table;
  - one lineage ribbon.
- No donut charts, no speedometer gauges, no decorative logos, no heatmaps without explicit numeric legends.

## Non-negotiable interpretation rules

- `SubmissionRecord` remains the legal settlement ledger.
  `TemporalPropagationEvent` is the authoritative post-seal propagation packet.
  `WorkflowItem` and client-safe projections are downstream only.

- The corpus prose mentions authority-corrected truth, but the persisted `SubmissionRecord.lifecycle_state` schema does not allow an `AUTHORITY_CORRECTED` state.
  Do not invent one.
  Model correction through lawful schema fields such as `baseline_type = AUTHORITY_CORRECTED`, the authoritative submission chain, and a typed `TemporalPropagationEvent`.

- `OUT_OF_BAND` is not a generic synonym for “we saw something weird.”
  It means legal truth exists outside the current packet lineage or is not yet safely reconciled into that lineage.
  It must remain explicit, non-flattened, and reconciliation-owned.

- Packet-local notices are packet blockers, not trust-band inputs.
  `FilingNoticeStep` and `FilingNoticeResolution` may constrain packet promotion, but they do not reopen or override upstream trust semantics on their own.

- `WorkflowItem.lifecycle_state`, `customer_status_projection`, and `authority_truth_state` are separate.
  Internal completion or customer resolution copy must never imply authority confirmation while authority truth is `UNKNOWN`, `PENDING_ACK`, `PARTIAL_ACK`, or `OUT_OF_BAND`.

- Collaboration lanes are dual and append-only.
  `CUSTOMER_VISIBLE` and `INTERNAL_ONLY` chronology must remain separate.
  Redaction is a new event, not a rewrite.

- `RequestInfoRecord` is exact-request identity.
  Customer replies, closures, attachments, and notifications must bind to the exact request version, not to a floating “open request” concept.

- `WorkItemNotification` is same-object continuity evidence, not just delivery metadata.
  Route, shell, focus, fallback, return target, access binding, masking posture, and visibility partition must remain machine-authored and replay-safe.

- Routing, assignment, escalation, and queue priority must come from the frozen formulas and persisted routing contracts.
  Browser arrival order, websocket timing, or ad hoc operator heuristics must never outrank the persisted routing basis.
