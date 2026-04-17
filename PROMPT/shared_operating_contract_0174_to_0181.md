# Shared Operating Contract for `pc_0174` to `pc_0181`

## Governing sources and precedence

1. Coordination authority:
   - `PROMPT/AGENT.md`
   - `PROMPT/Checklist.md`
   - this tranche contract
   - cards `pc_0174` through `pc_0181`

2. Taxat source-of-truth documents you SHALL read before changing code:
   - `low_noise_experience_contract.md`
   - `dominant_question_and_single_action_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_shell_design_token_and_interaction_layer_foundation_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `compute_parity_and_trust_formulas.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts and validators:
   - `schemas/shell_state_taxonomy_contract.schema.json`
   - `schemas/shell_dominance_contract.schema.json`
   - `schemas/interaction_layer_foundation_contract.schema.json`
   - `schemas/operator_interaction_layer.schema.json`
   - `schemas/portal_interaction_layer.schema.json`
   - `schemas/semantic_accessibility_contract.schema.json`
   - `schemas/semantic_accessibility_regression_pack.schema.json`
   - `schemas/focus_restore_return_target_harness.schema.json`
   - `schemas/focus_restoration_contract.schema.json`
   - `schemas/cross_device_continuity_contract.schema.json`
   - `schemas/cache_isolation_contract.schema.json`
   - `schemas/client_portal_workspace.schema.json`
   - `schemas/client_document_request.schema.json`
   - `schemas/client_upload_session.schema.json`
   - `schemas/upload_request_binding_contract.schema.json`
   - `schemas/upload_session_recovery_harness.schema.json`
   - `schemas/portal_language_contract.schema.json`
   - `schemas/artifact_selection_contract.schema.json`
   - `schemas/artifact_affordance_contract.schema.json`
   - `schemas/externalization_governance_contract.schema.json`
   - `schemas/problem_envelope.schema.json`
   - `schemas/low_noise_experience_frame.schema.json`
   - `schemas/context_bar_state.schema.json`
   - `schemas/decision_summary_state.schema.json`
   - `schemas/action_strip_state.schema.json`
   - `schemas/detail_drawer_state.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema and validator behavior as more authoritative than prose examples when they conflict.

4. External implementation guidance may sharpen technique but never override Taxat semantics:
   - Playwright locator-first testing, auto-waiting, actionability checks, APIRequestContext coverage, and trace capture
   - Apple guidance for typography, layout discipline, and restrained motion
   - Material guidance for structure, hierarchy, and accessibility-friendly composition

## Package and implementation placement rules

- `pc_0174` through `pc_0178` belong in `packages/backend-low-noise`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_LOW_NOISE_PACKAGE_CREATED`.

- `pc_0179` through `pc_0181` belong in `packages/backend-portal`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_PORTAL_PACKAGE_CREATED`.

- When northbound routes from `pc_0158` through `pc_0165` already exist, patch them only as thin adapters so they consume the new projector and service layer rather than re-encoding portal or shell semantics locally.

- Reuse prior foundations instead of cloning semantics:
  - low-noise frame and surface builders from `pc_0169` through `pc_0173`
  - portal northbound route/query edges from `pc_0163` through `pc_0165`
  - continuity, cache-isolation, stale-guard, and recovery primitives from `pc_0070` through `pc_0077` and `pc_0094` through `pc_0101`
  - authority/portal groundwork from `pc_0134` through `pc_0149`

- Organize code by boundary:
  - `packages/backend-low-noise/src/services`, `src/projectors`, `src/semantics`, `src/tests`
  - `packages/backend-portal/src/projectors`, `src/services`, `src/tests`
  - optional browser-visible verification labs belong in `apps/admin-console-web` for staff-only diagnostics or `apps/client-portal-web/src/routes/debug` for customer-safe preview labs

- Respect tranche boundaries.
  This block MAY complete:
  - reusable shell taxonomy and dominance publication
  - operator and portal interaction-layer projection
  - focus restoration, return-target, and semantic accessibility data publication
  - client portal workspace, document-request, and upload-session projection logic
  It MUST NOT silently absorb:
  - `pc_0182` upload-session recovery harness generation
  - `pc_0183` approval-pack projection and stale-signoff logic
  - `pc_0184` onboarding journey projection
  - `pc_0185` client timeline projection
  - `pc_0186` help-request projection
  - `pc_0187` portal language-contract projection
  - `pc_0188` full artifact-affordance / preview-export-print-handoff projection
  - `pc_0189+` governance snapshot work
  If a current card needs one of those future abstractions, introduce the smallest schema-valid adapter seam and mark it clearly as replaceable.

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first. Any preview, atlas, or lab you add MUST remain read-only and must mirror server-authored truth instead of becoming a second product implementation.

### Common visual language

- posture: minimalist premium, typography-led, quiet surfaces, no KPI wall, no dashboard ornament
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- outer width: `1280px` portal labs, `1440px` internal low-noise labs
- outer padding: `24px` mobile / `32px` desktop
- gutters: `20px`
- radius: `18px` to `20px`
- borders: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`, reduced-motion mandatory

### Low-noise diagnostic labs

Use a paper-like internal grammar:
- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- accent: `#0F766E`
- audit accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`

Layout rules:
- one dominant evidence column plus one restrained context rail at most
- if showing low-noise shell previews, peer order MUST remain `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`
- no third telemetry column, no donut charts, no decorative counters

### Portal preview labs

Use a calmer client-safe grammar:
- background: `#F6F4EE`
- primary surface: `#FFFFFF`
- supporting surface: `#F3F4F6`
- primary ink: `#111827`
- secondary ink: `#6B7280`
- trust accent: `#0F766E`
- action accent: `#1D4ED8`
- warning: `#B7791F`
- danger: `#C2410C`

Layout rules:
- one primary content column only; support/history/help stack below the primary task instead of beside it
- first-view hierarchy MUST make the dominant CTA obvious in one glance
- history stays visually secondary and explicitly labeled; it must never visually compete with the current task
- use one slim icon language only when it clarifies meaning; no brand logos or illustration filler

### Diagrams and visual explainers

Preferred diagram forms in this tranche:
- one dominance ladder showing question/action/support alignment
- one shell taxonomy matrix showing settlement and recovery posture
- one continuity ladder for focus-return and fallback order
- one request card lineage strip showing current upload versus historical uploads
- one upload binding/rebase strip showing frozen request version, live request version, and allowed next action

## Non-negotiable interpretation rules

- `ShellStateTaxonomyContract` and `ShellDominanceContract` are server-authored truth. Renderers SHALL NOT infer empty-state meaning, recovery posture, or dominant-action hierarchy from layout order, copy heuristics, or local component state.

- `InteractionLayerFoundationContract` is the grouped cross-shell semantic foundation. Shell-specific interaction layers SHALL inherit it instead of duplicating token or continuity rules in route-local config.

- `CALM_SHELL` and `CLIENT_PORTAL_SHELL` are different semantic products. Do not leak calm-shell module grammar into the portal, and do not let portal hero/queue semantics leak back into low-noise staff surfaces.

- `semantic_accessibility_contract` is authoritative for selector profile, anchor inventory, focus order, live-announcement kinds, and reduced-motion semantics. Automation anchors and accessibility labels must be derived from it, not invented ad hoc.

- Focus restore and return-target behavior is governed data, not browser-history folklore. When the exact target is gone, fallback order SHALL remain: same object remap -> same object summary -> serialized parent return -> narrowest surviving list target.

- `ClientPortalWorkspace.route` is the active top-level portal tab. Contextual request, approval, onboarding, and help detail must preserve that parent tab while switching `object_anchor_ref` to the focused contextual object.

- `latest_upload_ref` is chronology only. `current_request_upload_ref_or_null` is the sole request-satisfaction pointer. Current client-facing artifact selection and current request satisfaction MUST stay distinct.

- `ClientUploadSession.upload_request_binding_contract` freezes tenant, client, request identity, frozen/live request versions, duplicate-session posture, duplicate-file reuse posture, in-flight rebase policy, and attachment authority. Reconnect or cross-device resume SHALL reuse the existing governed session whenever the contract says it is lawful.

- Do not claim full regression closure for focus-harness or semantic-accessibility packs in this tranche. Publish the authoritative data and narrow case-seed helpers only as needed; the dedicated testing tasks own the full suites.

## Common validation and test rules

- Validate every newly published contract or projection against the canonical JSON schema before persistence or response emission.
- If you touch shipped northbound routes, add or patch Playwright APIRequestContext tests against those routes.
- If you add any browser-visible lab, test it with Playwright using semantic/user-facing locators only. No CSS-chain selectors, no coordinate clicks, no fixed sleeps.
- Capture traces or equivalent serialized request/response payloads on failure.
- Prefer deterministic fixtures and seeded artifacts over timing-dependent data.
- Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the tranche changes land.
