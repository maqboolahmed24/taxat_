# Shared Operating Contract for `pc_0182` to `pc_0189`

## Governing sources and precedence

1. Coordination authority:
   - `PROMPT/AGENT.md`
   - `PROMPT/Checklist.md`
   - this tranche contract
   - cards `pc_0182` through `pc_0189`

2. Taxat source-of-truth documents you SHALL read before changing code:
   - `customer_client_portal_experience_contract.md`
   - `upload_session_recovery_harness_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `northbound_api_and_session_contract.md`
   - `admin_governance_console_architecture.md`
   - `dominant_question_and_single_action_contract.md`
   - `cross_shell_design_token_and_interaction_layer_foundation_contract.md`
   - `low_noise_experience_contract.md`
   - `data_model.md`
   - `modules.md`
   - `state_machines.md`
   - `compute_parity_and_trust_formulas.md`
   - `retention_and_privacy.md`
   - `error_model_and_remediation_model.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `architecture_coherence_guardrails.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts and validators:
   - `schemas/client_upload_session.schema.json`
   - `schemas/upload_request_binding_contract.schema.json`
   - `schemas/upload_session_recovery_harness.schema.json`
   - `schemas/client_approval_pack.schema.json`
   - `schemas/client_onboarding_journey.schema.json`
   - `schemas/client_timeline_event.schema.json`
   - `schemas/portal_help_request.schema.json`
   - `schemas/portal_language_contract.schema.json`
   - `schemas/artifact_selection_contract.schema.json`
   - `schemas/artifact_affordance_contract.schema.json`
   - `schemas/externalization_governance_contract.schema.json`
   - `schemas/client_portal_workspace.schema.json`
   - `schemas/problem_envelope.schema.json`
   - `schemas/tenant_governance_snapshot.schema.json`
   - `schemas/governance_interaction_layer.schema.json`
   - `schemas/shell_dominance_contract.schema.json`
   - `schemas/shell_state_taxonomy_contract.schema.json`
   - `schemas/cross_device_continuity_contract.schema.json`
   - `schemas/semantic_accessibility_contract.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema and validator behavior as more authoritative than prose examples when they conflict.

4. External implementation guidance may sharpen technique but never override Taxat semantics:
   - Playwright locator-first testing, auto-waiting, actionability checks, APIRequestContext coverage, and trace capture
   - Apple guidance for typography, readable layout width, icon restraint, and reduced-motion-safe transitions
   - Material guidance for hierarchy, structure, color roles, and accessibility-friendly composition

## Package and implementation placement rules

- `pc_0182` through `pc_0188` belong in `packages/backend-portal`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_PORTAL_PACKAGE_CREATED`.

- `pc_0189` belongs in `packages/backend-governance`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_GOVERNANCE_PACKAGE_CREATED`.

- Reuse the prior foundations instead of cloning semantics:
  - upload-session identity freeze and request-binding services from `pc_0180` and `pc_0181`
  - portal read routes and receipt/problem boundaries from `pc_0158` through `pc_0168`
  - low-noise shell/projector foundations from `pc_0169` through `pc_0178`
  - portal workspace, document request, and upload-session baseline projection from `pc_0179` through `pc_0181`
  - continuity, stale-guard, recovery, and session policy work from `pc_0070` through `pc_0077` and `pc_0094` through `pc_0101`
  - authority / settlement / correction groundwork from `pc_0134` through `pc_0149`
  - governance authority and principal-context groundwork from `pc_0086` through `pc_0093`

- Organize code by boundary rather than by page name:
  - `packages/backend-portal/src/projectors`, `src/services`, `src/contracts`, `src/tests`
  - `packages/backend-governance/src/projectors`, `src/services`, `src/tests`
  - docs under `docs/portal/` or `docs/governance/`
  - optional browser-visible preview labs under `apps/client-portal-web/src/routes/debug/portal/` or `apps/admin-console-web/src/routes/debug/governance/`

- If shipped northbound routes already exist, patch them as thin adapters over these new projector/service layers instead of re-encoding portal or governance semantics in controllers.

- Respect tranche boundaries.
  This block MAY complete:
  - deterministic upload recovery-harness generation and cross-device continuation proof
  - client approval-pack projection and stale-signoff read-side truth
  - guided onboarding projection with explicit resume / reconfirm / stale-review posture
  - client timeline compression and customer-safe activity projection
  - portal help-request projection and support-boundary handoff tracking
  - shared portal language contract publication and banned-vocabulary filtering
  - artifact affordance and externalization alignment for preview / export / print / handoff
  - governance overview snapshot and dominant-attention projection
  It MUST NOT silently absorb:
  - `pc_0190+` governance policy, access simulation, authority-link inventory, retention, audit, or other later governance routes
  - a second client-portal shell, alternate mobile-only route grammar, or detached preview product
  - ad hoc renderer-owned copy heuristics, stale-guard logic, or export target selection
  If a current card needs a future abstraction, introduce the smallest schema-valid seam and mark it explicitly as replaceable.

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first. Any preview, atlas, or lab you add MUST remain read-only and MUST mirror server-authored truth instead of becoming a second implementation.

### Shared visual language

- posture: minimalist premium, typography-led, quiet surfaces, explicit hierarchy, no dashboard wall
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced motion mandatory
- use a single restrained icon language only when it clarifies meaning; no illustration filler, no corporate-dashboard chrome

### Portal preview labs

Use a client-safe visual grammar:
- background: `#F6F4EE`
- primary surface: `#FFFFFF`
- supporting surface: `#F3F4F6`
- primary ink: `#111827`
- secondary ink: `#6B7280`
- trust accent: `#0F766E`
- action accent: `#1D4ED8`
- warning: `#B7791F`
- danger: `#C2410C`
- content width: `1180px` max for focused routes, `1240px` max for artifact labs
- outer padding: `24px` mobile / `32px` desktop

Portal layout rules:
- one dominant column plus at most one collapsible contextual tray
- preserve the canonical route orders from the algorithm instead of inventing a new mobile grammar
- current artifact or current task must always read as primary; history, help, and support remain explicitly subordinate
- no multi-panel hero stacks, no donut charts, no competing call-to-action bars

Preferred diagram forms in portal labs:
- one upload recovery ladder showing pre-session, post-session, and post-request projection
- one approval stale-guard strip showing current pack, rebase, step-up, and receipt posture
- one onboarding step rail with a single active step and bounded completed summaries
- one activity timeline compression strip with customer-safe event vocabulary only
- one help handoff strip showing route, focus anchor, request-info lineage, and return target
- one artifact affordance matrix showing visible primary subject, header posture, and default preview/download/print targets

### Governance preview labs

Use a quieter control-plane grammar:
- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- accent: `#0F766E`
- audit accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`
- content width: `1440px` max
- outer padding: `28px` mobile / `36px` desktop

Governance layout rules:
- top context bar, filter rail, one primary canvas, and one subordinate audit sidecar at most
- `ATTENTION_SUMMARY` is the only primary hero region; all ledgers and worklists are subordinate
- do not build a KPI dashboard, scorecard wall, or marketing-style overview
- if a chart is helpful, prefer one slim family-score ladder or one risk-ledger strip, never a decorative pie or donut

## Non-negotiable interpretation rules

- `UploadSessionRecoveryHarness` is a deterministic proof artifact, not an alternative runtime session model. It must prove that reconnect, reload, stale rebase, duplicate retry, attachment confirmation, and cross-device continuation preserve one frozen upload identity.

- `ClientUploadSession.upload_request_binding_contract` freezes tenant, client, request identity, frozen/live request versions, duplicate-session posture, duplicate-file posture, in-flight rebase policy, stale-completion policy, and attachment authority. Reconnect or cross-device resume SHALL reuse the existing governed session whenever that contract allows it.

- `ClientApprovalPack` signability is governed truth. A pack is not sign-complete unless the current `approval_pack_hash`, `view_guard_ref`, stale-protection posture, readiness score, acknowledgement lineage, and any required unexpired step-up proof all line up.

- `ClientOnboardingJourney` preserves one-primary-step semantics. Save-and-return, reconfirmation, stale-review, completion, expiry, and abandonment must remain explicit and route-stable rather than inferred from local UI state.

- `ClientTimelineEvent` is a bounded customer-safe event vocabulary. Authority-facing copy MUST stay aligned with `authority_truth_state`; unresolved, rejected, out-of-band, or correction-in-flight posture may not collapse into generic reassurance.

- `PortalHelpRequest` is not a generic ticket. It preserves exact source route, exact focus anchor, linked request-for-info lineage when relevant, and enough case context that the client never has to restate the case.

- `PortalLanguageContract` is an exact shared contract, not a guideline. All portal surfaces in scope must publish the same contract and must reject or rewrite forbidden portal vocabulary such as manifest/workflow language, stale/rebase jargon, operator or queue language, staff-role vocabulary, raw gate language, override language, escalation language, internal-only language, and similar internal terms.

- `ArtifactSelectionContract`, `ArtifactAffordanceContract`, and `ExternalizationGovernanceContract` must agree on what is visibly primary, what is historical, and which preview/download/print/handoff target is lawful right now. Renderers may not choose targets from row order or stale cache.

- `TenantGovernanceSnapshot` is a read-side control-plane projection only. It must publish one dominant question, one dominant queue, one promoted worklist, one explicit support-sidecar mode, and one stable selected object. It must not degrade into a badge-only KPI overview.

- `dominance_contract` is authoritative. Portal and governance surfaces may not promote a second competing hero, queue, or sidecar action just because the layout becomes wide, narrow, stale, or reconnecting.

## Common validation and test rules

- Validate every newly published contract or projection against the canonical JSON schema before persistence or response emission.
- If you touch shipped northbound routes, add or patch Playwright APIRequestContext tests against those routes.
- If you add any browser-visible lab, test it with Playwright using semantic or user-facing locators only. No CSS-chain selectors, no coordinate clicks, no fixed sleeps.
- Capture traces or equivalent serialized request/response payloads on failure.
- Prefer deterministic fixtures and seeded artifacts over timing-dependent data.
- Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the tranche changes land.
