# Shared Operating Contract for tasks 0230–0249

## Scope

This tranche fills the next twenty unwritten phase-05 prompt cards after `pc_0229`.
It continues the browser-first frontend wave that was opened by `pc_0229`, covering:

- `pc_0230` through `pc_0240`: shared frontend shell foundations, contract-bound state, command/stream clients, artifact/auth/cache utilities, focus/live-region utilities, and responsive continuity helpers.
- `pc_0241` through `pc_0249`: the first low-noise `CALM_SHELL` implementation prompts, including the four persistent surfaces, dominance behavior, inline recovery, support modules, and artifact handoff semantics.

Use this shared contract before executing any individual card. The card-level prompt adds task-specific requirements; this file defines the invariant interpretation that must hold across the tranche.

## Source-of-truth priority

The attached algorithm corpus remains the definitive source of truth. External design inspiration, browser tooling documentation, and UI trends are subordinate to the algorithm, schemas, validators, and previously written cards.

Read and honor these sources first:

- `PROMPT/AGENT.md` and `PROMPT/Checklist.md` for claim and status protocol.
- `PROMPT/CARDS/pc_0229.md` for the previously authored browser workspace scaffold and route-contract baseline.
- `Algorithm/frontend_shell_and_interaction_law.md`, especially shell families, route continuity, stable route keys, support-region promotion, artifact handling, accessibility/focus/motion, and semantic selectors.
- `Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md`, end to end.
- `Algorithm/low_noise_experience_contract.md`, especially the four-surface calm shell, interaction layer, cognitive budget, edge-case handling, semantic selectors, and Playwright minimums.
- `Algorithm/low_noise_surface_compression_and_noise_budget_audit_contract.md`, end to end.
- `Algorithm/dominant_question_and_single_action_contract.md`, end to end.
- `Algorithm/semantic_selector_and_accessibility_contract.md` and `Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md`, end to end.
- `Algorithm/focus_restoration_and_return_target_harness_contract.md`, end to end.
- `Algorithm/cross_device_continuity_and_restoration_contract.md`, end to end.
- `Algorithm/northbound_api_and_session_contract.md`, especially command envelopes, durable receipts, typed problem envelopes, stale-view guards, stream/reconnect, and session rules.
- `Algorithm/stream_resume_and_catch_up_ordering_contract.md`, end to end.
- `Algorithm/cache_isolation_and_secure_reuse_contract.md`, end to end.
- `Algorithm/customer_client_portal_experience_contract.md` and `Algorithm/admin_governance_console_architecture.md` only where shared foundations must remain compatible with portal and governance shell families.
- `Algorithm/UIUX_DESIGN_SKILL.md`, especially production profile precedence, core design language, signature module low-noise binding, selector strategy, and Playwright-first design expectations.

## Schema and validator inventory for this tranche

At minimum, preserve and actively validate against:

- `Algorithm/schemas/interaction_layer_foundation_contract.schema.json`
- `Algorithm/schemas/operator_interaction_layer.schema.json`
- `Algorithm/schemas/portal_interaction_layer.schema.json`
- `Algorithm/schemas/governance_interaction_layer.schema.json`
- `Algorithm/schemas/route_stability_contract.schema.json`
- `Algorithm/schemas/semantic_accessibility_contract.schema.json`
- `Algorithm/schemas/semantic_accessibility_regression_pack.schema.json`
- `Algorithm/schemas/focus_restoration_contract.schema.json`
- `Algorithm/schemas/focus_restore_return_target_harness.schema.json`
- `Algorithm/schemas/cross_device_continuity_contract.schema.json`
- `Algorithm/schemas/cache_isolation_contract.schema.json`
- `Algorithm/schemas/command_envelope.schema.json`
- `Algorithm/schemas/api_command_receipt.schema.json`
- `Algorithm/schemas/command_truth_boundary_contract.schema.json`
- `Algorithm/schemas/stream_recovery_contract.schema.json`
- `Algorithm/schemas/low_noise_experience_frame.schema.json`
- `Algorithm/schemas/context_bar_state.schema.json`
- `Algorithm/schemas/decision_summary_state.schema.json`
- `Algorithm/schemas/action_strip_state.schema.json`
- `Algorithm/schemas/detail_drawer_state.schema.json`
- `Algorithm/schemas/low_noise_budget_audit.schema.json`
- `Algorithm/schemas/low_noise_budget_audit_pack.schema.json`
- `Algorithm/schemas/artifact_affordance_contract.schema.json`
- `Algorithm/scripts/validate_contracts.py`
- `Algorithm/tools/forensic_contract_guard.py`

## Shared package and route placement rules

Follow the package topology established in `pc_0229` and any actual ADRs or package names already present in the repository. If package names differ, obey the repository and record an explicit assumption/override note in the card.

Default placement for this tranche:

- shared runtime: `packages/frontend-shell-core/src/**`
- shared visual components: `packages/shared-ui/src/**`
- operator browser app: `apps/operator-web/src/**`
- client portal app compatibility adapters only where shared foundations require portal coverage: `apps/client-portal-web/src/**`
- Playwright helpers: `packages/playwright-kit/src/**`
- browser tests: `tests/playwright/frontend/**`
- shared docs: `docs/frontend/**`

Do not introduce a fourth shell family. Browser, native, governance, portal, and low-noise surfaces must all speak through the same three canonical families: `CALM_SHELL`, `CLIENT_PORTAL_SHELL`, and `GOVERNANCE_DENSITY_SHELL`.

## Cross-tranche interpretation rules

- The renderer is a consumer of server-authored or contract-authored truth, not a second domain engine.
- Shell identity, route keys, stability contracts, semantic selectors, interaction-layer foundation, cache isolation, stream recovery, command receipt truth, and low-noise budget posture must be explicit data, not inferred from CSS, component names, local flags, or route folder structure.
- `CALM_SHELL` must preserve the ordered reading path `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
- Only one default promoted support region is lawful in the calm shell: `DETAIL_DRAWER`. Compare and audit modes can add explicit special modes only when the user enters those modes deliberately.
- `CLIENT_PORTAL_SHELL` must stay task-first, plain-language, and customer-safe. Shared foundations must not leak internal vocabulary or staff payload assumptions into portal helpers.
- `GOVERNANCE_DENSITY_SHELL` can be denser but must keep one promoted auxiliary surface, non-modal ordinary inspectors, canonical filter grammar, and typed mutation basis.
- Commands must use `POST /v1/commands`, client-generated `command_id`, stable idempotency keys, exact stale-view guards, durable `ApiCommandReceipt` polling, and typed `ProblemEnvelope` handling.
- Streams must resume only through exact-route `stream_recovery_contract` bindings. Gap-free monotonic apply, duplicate idempotence, catch-up-before-live, `REBASE_REQUIRED`, and `ACCESS_REBIND_REQUIRED` must be enforced in the frontend runtime.
- Cache reuse is lawful only for exact tenant/principal/session/access/masking/route/object/projection/preview bindings. Local persistence must purge on narrowing or drift.
- UI telemetry and test logging must never capture regulated free text, upload bytes, screenshots of regulated content, keystroke streams, hidden internal notes, raw authority tokens, or masked values.

## Shared visual direction

Every frontend card in this tranche must produce a minimalist premium result, not a generic AI dashboard, not a starter-template SPA, and not a chart wall.

Use this visual language unless a card adds a stricter one:

- background `#F7F5F1`
- primary surface `#FFFFFF`
- secondary surface `#F1F3F0`
- tertiary wash `#ECE8DF`
- primary ink `#171717`
- secondary ink `#667085`
- quiet border `rgba(17, 24, 39, 0.08)`
- elevated shadow ceiling `0 10px 28px rgba(17, 24, 39, 0.06)`
- operator accent `#1D4ED8`
- portal accent `#0F766E`
- governance accent `#6D28D9`
- caution `#B7791F`
- danger `#C2410C`
- verified completion `#166534` only when durable truth confirms progression
- typography: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`
- mono: `ui-monospace, "SFMono-Regular", Consolas, monospace`
- type ramp: `12 / 14 / 16 / 20 / 28 / 36px`
- spacing base `8px`; section spacing `24–32px` desktop and `16–24px` compact
- radii `18–20px` for cards and primary containers, `999px` for chips only
- motion `140–180ms`, opacity/translate/height only, no ambient loops, no decorative pulses, no parallax, no animation dependency for meaning
- reduced-motion parity is mandatory and must be Playwright-tested

Appropriate diagrams are encouraged when they clarify contracts. They must be contract diagrams, lineage ribbons, shell maps, focus-order maps, stream tapes, or current/history artifact rails. Avoid generic KPI charts, donut charts, gauges, and decorative hero graphs.

## Shared Playwright and accessibility requirements

Use Playwright from development day one, not as a late QA add-on.

- Use locator-first tests with roles, labels, text, and stable semantic `data-testid` anchors.
- Use Playwright’s auto-waiting/actionability behavior rather than fixed sleeps.
- Capture traces on CI failure.
- Add keyboard-only, reduced-motion, responsive, stale/rebase, and semantic-anchor assertions for every browser-visible surface.
- Use `APIRequestContext` where command, receipt, stream, or route-contract behavior can be verified without relying only on DOM inspection.
- Keep semantic anchors domain-meaningful. Do not name selectors after visual position or styling.
- For accessibility, implement stable landmarks/headings, visible focus, focus restoration, live region policy, keyboard completion, and screen-reader-visible state meaning. Reduced motion must preserve the same semantics.

## Cross-card gap closure mandate

Each card must close both its named implementation gap and any adjacent gap revealed by the source algorithm, especially:

- foundations being retrofitted after generic shells already exist
- route-local styling drifting from shell-family token contracts
- local frontend heuristics inventing recovery, actionability, currentness, or artifact-history posture
- command acceptance being confused with durable completion
- stream reconnection applying deltas out of order or across stale session/access/masking bindings
- hidden data being implied as absent instead of explicitly limited
- focus and return anchors being lost on route change, support-surface collapse, handoff return, reconnect, or viewport restack
- responsive layouts becoming alternate products with different shell meaning

## Validation baseline

Unless a card explicitly narrows this for a non-implementation-only reason, verify with:

- relevant unit/component tests
- relevant Playwright browser or API tests
- `python3 Algorithm/scripts/validate_contracts.py --self-test`
- `python3 Algorithm/tools/forensic_contract_guard.py`

Record assumptions, changed paths, and verification evidence in the card. Do not mark a checklist item complete until the implementation and verification pass.
