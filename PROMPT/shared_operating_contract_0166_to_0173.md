# Shared Operating Contract for `pc_0166` to `pc_0173`

This contract governs the tranche that closes the remaining northbound recovery and investigation surfaces for phase 03 and then starts the phase 04 calm-shell backend read side.
This block is where manifest audit slices, enquiry packs, and governance investigation frames become stable read surfaces; where stale-view and conditional-request failures stop being ad hoc endpoint behavior and become one canonical `ProblemEnvelope` mapping; where resume-token, shell-stability, and access-rebind failure paths become grouped recovery logic instead of transport folklore; and where the first server-authored low-noise shell artifacts become deterministic backend products rather than renderer-local layout decisions.

## Read this first

1. Re-read `../AGENT.md` and the exact checklist rows for `pc_0166` through `pc_0173`.
2. Consume the already-authored cards that this tranche depends on, especially `pc_0118` through `pc_0165`.
3. Treat the Taxat algorithm corpus as the only source of truth. Route handlers, projectors, debug explorers, cache keys, and tests are downstream only.
4. Keep legal truth, durable audit evidence, provenance closure, command receipts, grouped stability contracts, stream cursors, and low-noise read models separate. Do not collapse them into one convenience DTO.
5. Every persisted or published artifact introduced in this tranche MUST validate against its canonical JSON schema before it is accepted, cached, or exposed.

## Canonical reading order for this tranche

1. Prior dependency cards already produced in earlier waves:
   - `pc_0064` through `pc_0069` for ids, locator grammar, schema/migration rules, outbox/inbox idempotency, and object lifecycle law
   - `pc_0070` through `pc_0077` for queues, upload continuity, audit continuity, stream ordering, cache partitions, and golden fixture discipline
   - `pc_0086` through `pc_0093` for access control, delegation, runtime scope binding, governance basis, step-up policy, and replay-safe hashing
   - `pc_0094` through `pc_0101` for session revocation, policy snapshots, run lineage, schema bundle windows, and frozen-config resolution
   - `pc_0102` through `pc_0133` for prior-manifest logic, collection, snapshot assembly, exact compute, gating, proof/provenance, enquiry-pack prerequisites, and authority packet foundations
   - `pc_0134` through `pc_0149` for authority transport, request identity, binding drift, ingress normalization, reconciliation budgets, workflow/collaboration artifacts, and notification continuity
   - `pc_0150` through `pc_0157` for workflow projectors, customer-safe visibility partitions, remediation/failure lineage substrates, queue health, and the `POST /v1/commands` northbound edge
   - `pc_0158` through `pc_0165` for command-receipt recovery, manifest read/stream surfaces, governance reads, portal reads, upload-session reads, and collaboration snapshot/stream/activity/attachment surfaces

2. Core Taxat corpus for this block:
   - `README.md`
   - `northbound_api_and_session_contract.md`
   - `observability_and_audit_contract.md`
   - `retention_limited_explainability_and_audit_sufficiency_contract.md`
   - `provenance_graph_semantics.md`
   - `stream_resume_and_catch_up_ordering_contract.md`
   - `collaboration_workspace_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `low_noise_experience_contract.md`
   - `low_noise_surface_compression_and_noise_budget_audit_contract.md`
   - `dominant_question_and_single_action_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `data_model.md`
   - `state_machines.md`
   - `modules.md`
   - `invariants_and_gates.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts:
   - `schemas/audit_investigation_frame.schema.json`
   - `schemas/enquiry_pack.schema.json`
   - `schemas/problem_envelope.schema.json`
   - `schemas/stream_recovery_contract.schema.json`
   - `schemas/experience_cursor.schema.json`
   - `schemas/workspace_cursor.schema.json`
   - `schemas/low_noise_experience_frame.schema.json`
   - `schemas/context_bar_state.schema.json`
   - `schemas/decision_summary_state.schema.json`
   - `schemas/action_strip_state.schema.json`
   - `schemas/detail_drawer_state.schema.json`
   - `schemas/low_noise_budget_audit.schema.json`
   - `schemas/low_noise_budget_audit_pack.schema.json`
   - `schemas/experience_delta.schema.json`
   - `schemas/shell_state_taxonomy_contract.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat validator-enforced constraints and schema invariants as authoritative. Human-readable examples and mock UI sketches are secondary.

4. External implementation guidance that may sharpen technique but never override Taxat semantics:
   - current Playwright guidance for semantic locators, auto-waiting, actionability-safe interactions, trace capture, and APIRequestContext testing
   - current Apple guidance for readable typography, restrained motion, and layout-width discipline
   - current Material guidance for color-role layering, hierarchy, and coherent motion
   - current HTTP conditional-request semantics for strong `ETag` / `If-Match` use on stale-write prevention

## Package and implementation placement rules

- `pc_0166` through `pc_0168` belong in the northbound/control-plane package selected by `pc_0028` and exercised by `pc_0158` through `pc_0165`.
  If it does not exist, create `packages/backend-northbound` and emit `ASSUMPTION_BACKEND_NORTHBOUND_PACKAGE_CREATED`.

- `pc_0169` through `pc_0173` belong in a dedicated low-noise backend read-side package.
  If an earlier card has not already created one, create `packages/backend-low-noise` and emit `ASSUMPTION_BACKEND_LOW_NOISE_PACKAGE_CREATED`.
  Keep low-noise projectors, budget audits, and delta publication logic out of renderer packages and out of mutable workflow/authority write paths.

- Reuse prior foundations instead of cloning semantics:
  - northbound route/stability/publication helpers from `pc_0158` through `pc_0165`
  - proof/provenance and enquiry prerequisites from `pc_0126` through `pc_0130`
  - queue/workflow/remediation read models from `pc_0150` through `pc_0156`
  - shell continuity, cache isolation, and stream ordering primitives from `pc_0070` through `pc_0077` and `pc_0094` through `pc_0101`

- Organize code by boundary:
  - northbound: `src/http`, `src/query`, `src/services`, `src/repositories`, `src/streams`
  - backend-low-noise: `src/projectors`, `src/audit`, `src/deltas`, `src/services`, `src/fixtures`
  - shared schema-backed transport/domain objects only in `src/models` or the canonical contract package selected earlier

- Optional preview or explorer surfaces MAY be added only when they materially accelerate verification.
  Use `apps/admin-console-web` for staff-only explorers.
  Keep them read-only, diagnostic, and subordinate to the backend work.

- Respect tranche boundaries.
  This block may complete:
  - manifest audit-trail, enquiry-pack, and governance audit-investigation reads
  - canonical stale-view / `If-Match` / `ProblemEnvelope` mapping
  - access-rebind / resume-token / shell-stability failure helpers
  - the first low-noise frame, surface, budget-audit, and delta-projector backend artifacts
  It MUST NOT silently absorb later dedicated tasks such as the full shell-state-taxonomy and dominant-question projector wave beyond the smallest schema-valid adapter needed to keep this tranche executable.

## Shared design contract for any browser-visible explorer introduced in this block

Most cards here are backend-first. If you add a diagnostic explorer, it must feel like a precise instrument panel rather than a generic dashboard.

### Explorer families in scope

- manifest audit and enquiry explorer
- governance investigation slice explorer
- stale-view / conditional-request problem explorer
- resume-token and shell-stability recovery lab
- low-noise frame lab, surface lab, budget-audit lab, or delta inspector

### Visual language

- posture: minimalist premium, quiet, typography-led, no KPI wall, no marketing chrome
- app background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- elevated surface: `#FCFCFB`
- primary ink: `#171717`
- secondary ink: `#667085`
- calm accent: `#0F766E`
- audit accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`
- borders: `rgba(23,23,23,0.08)`
- shadow ceiling: `0 8px 24px rgba(23,23,23,0.06)`
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace

### Type scale

- page title: `32/38`, semibold
- section title: `20/28`, semibold
- panel title: `16/24`, semibold
- eyebrow / label: `12/16`, medium, `0.04em` tracking
- body: `14/22`, regular
- helper / status / timestamp: `12/18`, regular
- ids / hashes / tokens / refs: `12/18`, medium monospace

### Layout rules

- max width: `1440px`
- outer padding: `24px` mobile, `32px` desktop
- gutters: `20px`
- radius: `18px` to `20px`
- one dominant content column plus at most one restrained context rail
- no three-column telemetry walls, no donut charts, no decorative counters
- low-noise preview shells MUST preserve exact peer surface order:
  `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`
- detail content belongs inside the promoted support region, not as a competing peer panel

### Motion and interaction

- only opacity / translate / height disclosure motion
- duration band: `140ms` to `180ms`
- reduced-motion mode is mandatory
- no parallax, bounce, or animation that changes semantic priority
- live updates MUST NOT steal focus from active inputs or inspectors
- focus order MUST follow visible reading order and route continuity law

### Charts / diagrams / logos

Use diagrams only when they explain a contract faster than prose.
Preferred forms in this tranche:
- one ordered event-sequence ribbon for audit slices
- one proof/lineage path strip for enquiry packs
- one grouped stale-guard / stability-contract ladder
- one surface-order braid or continuity ladder for low-noise frames
- one delta before/after strip for coalesced refreshes

Do NOT add decorative logos, animated counters, or dashboard ornament.

## Non-negotiable interpretation rules

- Audit and enquiry-pack surfaces are read-only. Retrieval MUST NOT mutate workflow, compliance, or authority truth.

- `AuditInvestigationFrame`, `EnquiryPack`, `ProblemEnvelope`, `LowNoiseExperienceFrame`, `ContextBarState`, `DecisionSummaryState`, `ActionStripState`, `DetailDrawerState`, `LowNoiseBudgetAudit`, `LowNoiseBudgetAuditPack`, and `ExperienceDelta` are read-side or transport-side artifacts only. They MUST NOT be promoted back into legal truth.

- `ProblemEnvelope` SHALL publish the narrowest lawful recovery family and SHALL NOT mix manifest, collaboration, portal, or governance recovery anchors in one envelope. `latest_stability_contract_or_null` and any stale guard echo MUST stay generation-coherent.

- Raw `resume_token` is transport material only. The grouped `stream_recovery_contract` and route-stability primitives remain authoritative.

- `ACCESS_REBIND_REQUIRED` is for session/access-binding/masking/schema drift. `REBASE_REQUIRED` is for epoch advance, route drift, shell-stability drift, or history compaction. Do not blur them into one generic stale error.

- The low-noise calm shell is a four-surface contract. It SHALL keep one dominant question, one dominant safe action or explicit `NO_SAFE_ACTION`, and at most one promoted support region by default.

- The calm shell may not surface parallel mutation-capable secondaries. `secondary_mutation_action_count` MUST remain `0` on published frames.

- `duplicate_posture_codes[]` MUST be empty on published low-noise frames. Repeated limitation, masking, analysis-only, or blocking posture belongs in one governed location.

- Compare mode and audit mode are explicit. They may not quietly become the default calm-shell posture.

- Any adapter introduced because the next wave owns a deeper abstraction (for example full dominant-question projection or shell-state-taxonomy extraction) MUST be narrow, typed, and easy to replace. Do not hide future-card scope inside a vague helper.

## Common validation and test rules

- Validate every response or read artifact against its canonical JSON schema.
- Use Playwright APIRequestContext or equivalent HTTP-contract tooling for northbound endpoints.
- When an explorer or preview surface is added, test it with Playwright using semantic/user-facing locators and actionability-safe interactions.
- No fixed sleeps in stream, reconnect, rebase, or delta-coalescing tests.
- Capture traces or equivalent serialized request/response/event logs on failures.
- Prefer deterministic fixtures and seeded artifacts over timing-dependent live data.
- Re-run `scripts/validate_contracts.py --self-test` and `tools/forensic_contract_guard.py` after the tranche changes land.
