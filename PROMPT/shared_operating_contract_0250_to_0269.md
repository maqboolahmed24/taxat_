# Shared Operating Contract for tasks 0250–0269

## Scope

This tranche fills the next twenty unwritten phase-05 prompt cards after `pc_0249`.
It continues the browser-first frontend wave and covers three related bands:

- `pc_0250` through `pc_0252`: completion of the `CALM_SHELL` low-noise browser surface with budget diagnostics, same-object route continuity, and operator interaction-layer quick actions/stale guard affordances.
- `pc_0253` through `pc_0266`: the `CLIENT_PORTAL_SHELL` browser experience, including app scaffold, home, documents, resumable uploads, approval sign-off, onboarding, activity, contextual request-detail routes, help handoff, language contract, current/history artifacts, responsive continuity, accessibility, and stale/rebase recovery.
- `pc_0267` through `pc_0269`: the first collaboration workspace browser prompts, covering staff work inbox, staff dual-lane workspace, and customer-safe collaboration workspace projection.

Use this shared contract before executing any individual card. The card-level prompt adds task-specific requirements; this file defines the invariant interpretation that must hold across the tranche.

## Source-of-truth priority

The attached algorithm corpus remains the definitive source of truth. External design inspiration, browser tooling documentation, and UI trends are subordinate to the algorithm, schemas, validators, and previously written cards.

Read and honor these sources first:

- `PROMPT/AGENT.md` and `PROMPT/Checklist.md` for claim and status protocol.
- `PROMPT/CARDS/pc_0229.md` through `PROMPT/CARDS/pc_0249.md` for the browser workspace, shared frontend foundation, and first low-noise shell prompts.
- `Algorithm/frontend_shell_and_interaction_law.md`, especially shell families, route continuity, back/return behavior, artifact handoff, accessibility/focus/motion, and automation anchors.
- `Algorithm/low_noise_experience_contract.md`, especially the four-surface calm shell, operator interaction layer, cognitive budget, omission rules, edge cases, semantic selectors, validation additions, and FE-25 cache isolation notes.
- `Algorithm/low_noise_surface_compression_and_noise_budget_audit_contract.md`, end to end.
- `Algorithm/dominant_question_and_single_action_contract.md`, end to end.
- `Algorithm/focus_restoration_and_return_target_harness_contract.md`, end to end.
- `Algorithm/cross_device_continuity_and_restoration_contract.md`, end to end.
- `Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md`, end to end.
- `Algorithm/semantic_selector_and_accessibility_contract.md` and `Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md`, end to end.
- `Algorithm/northbound_api_and_session_contract.md`, especially command envelopes, durable receipts, typed problem envelopes, stale-view guards, stream/reconnect, and session rules.
- `Algorithm/stream_resume_and_catch_up_ordering_contract.md`, end to end.
- `Algorithm/cache_isolation_and_secure_reuse_contract.md`, end to end.
- `Algorithm/customer_client_portal_experience_contract.md`, end to end.
- `Algorithm/upload_session_request_binding_and_rebase_contract.md` and `Algorithm/upload_session_recovery_harness_contract.md`, end to end.
- `Algorithm/collaboration_workspace_contract.md`, especially lane separation, staff/customer shell continuity, queue routing, composers, file modules, stale-view rules, stream recovery, and Playwright scenarios.
- `Algorithm/UIUX_DESIGN_SKILL.md`, especially profile boundaries, portal selector strategy, staff/collaboration architecture, Playwright-first design expectation, and anti-patterns.

## Research-informed but subordinate UI/testing cues

Use these external references only as supporting implementation craft, never as product truth:

- Playwright locator-first tests, actionability auto-waiting, and trace capture should shape the browser validation strategy: <https://playwright.dev/docs/locators>, <https://playwright.dev/docs/actionability>, <https://playwright.dev/docs/best-practices>.
- WCAG 2.2 should inform focus, target size, consistent help, redundant-entry, reduced-motion, and keyboard/screen-reader expectations: <https://www.w3.org/TR/WCAG22/>.
- GOV.UK and DWP upload research should inspire portal upload clarity: show requirements near the file control, explain file type/size limits early, allow reuse only when privacy-safe, and distinguish upload from submission: <https://design-system.service.gov.uk/components/file-upload/> and <https://design-system.dwp.gov.uk/research/file-upload/set-expectations>.
- Carbon design guidance should inspire restrained layering and purposeful data visualization: neutral layers carry most hierarchy, accent color is used sparingly, and charts/legends must not depend on color alone: <https://carbondesignsystem.com/elements/color/overview/> and <https://carbondesignsystem.com/data-visualization/color-palettes/>.

## Schema and validator inventory for this tranche

At minimum, preserve and actively validate against:

- `Algorithm/schemas/low_noise_experience_frame.schema.json`
- `Algorithm/schemas/low_noise_budget_audit.schema.json`
- `Algorithm/schemas/low_noise_budget_audit_pack.schema.json`
- `Algorithm/schemas/operator_interaction_layer.schema.json`
- `Algorithm/schemas/portal_interaction_layer.schema.json`
- `Algorithm/schemas/interaction_layer_foundation_contract.schema.json`
- `Algorithm/schemas/cross_device_continuity_contract.schema.json`
- `Algorithm/schemas/focus_restoration_contract.schema.json`
- `Algorithm/schemas/focus_restore_return_target_harness.schema.json`
- `Algorithm/schemas/semantic_accessibility_contract.schema.json`
- `Algorithm/schemas/semantic_accessibility_regression_pack.schema.json`
- `Algorithm/schemas/cache_isolation_contract.schema.json`
- `Algorithm/schemas/command_envelope.schema.json`
- `Algorithm/schemas/api_command_receipt.schema.json`
- `Algorithm/schemas/problem_envelope.schema.json`
- `Algorithm/schemas/stream_recovery_contract.schema.json`
- `Algorithm/schemas/client_portal_workspace.schema.json`
- `Algorithm/schemas/client_document_request.schema.json`
- `Algorithm/schemas/client_upload_session.schema.json`
- `Algorithm/schemas/client_approval_pack.schema.json`
- `Algorithm/schemas/client_onboarding_journey.schema.json`
- `Algorithm/schemas/client_timeline_event.schema.json`
- `Algorithm/schemas/portal_help_request.schema.json`
- `Algorithm/schemas/portal_language_contract.schema.json`
- `Algorithm/schemas/customer_request_list_snapshot.schema.json`
- `Algorithm/schemas/customer_safe_projection_contract.schema.json`
- `Algorithm/schemas/upload_request_binding_contract.schema.json`
- `Algorithm/schemas/upload_session_recovery_harness.schema.json`
- `Algorithm/schemas/artifact_selection_contract.schema.json`
- `Algorithm/schemas/artifact_affordance_contract.schema.json`
- `Algorithm/schemas/collaboration_queue_projection_contract.schema.json`
- `Algorithm/schemas/collaboration_routing_contract.schema.json`
- `Algorithm/schemas/collaboration_activity_slice.schema.json`
- `Algorithm/schemas/collaboration_attachment_slice.schema.json`
- `Algorithm/schemas/collaboration_thread.schema.json`
- `Algorithm/schemas/collaboration_entry.schema.json`
- `Algorithm/schemas/collaboration_attachment.schema.json`
- `Algorithm/schemas/workspace_stream_event.schema.json`
- `Algorithm/scripts/validate_contracts.py`
- `Algorithm/tools/forensic_contract_guard.py`

## Shared package and route placement rules

Follow the package topology established in `pc_0229` and any actual ADRs or package names already present in the repository. If package names differ, obey the repository and record an explicit assumption/override note in the card.

Default placement for this tranche:

- shared runtime: `packages/frontend-shell-core/src/**`
- shared visual components: `packages/shared-ui/src/**`
- operator browser app: `apps/operator-web/src/**`
- client portal browser app: `apps/client-portal-web/src/**`
- Playwright helpers: `packages/playwright-kit/src/**`
- browser tests: `tests/playwright/frontend/**`
- accessibility fixtures: `tests/playwright/accessibility/**` or the repository's existing browser-a11y location
- documentation: `docs/frontend/**`

Do not introduce a fourth shell family. Browser, native, governance, portal, collaboration, and low-noise surfaces must all speak through the same three canonical families: `CALM_SHELL`, `CLIENT_PORTAL_SHELL`, and `GOVERNANCE_DENSITY_SHELL`.

## Cross-tranche interpretation rules

- The renderer is a consumer of server-authored or contract-authored truth, not a second domain engine.
- Shell identity, route keys, stability contracts, semantic selectors, interaction-layer foundation, cache isolation, stream recovery, command receipt truth, stale-view guards, upload binding, artifact selection, and customer-safe projection must be explicit data, not inferred from CSS, component names, local flags, tab labels, route path fragments, row ordering, or browser cache state.
- `CALM_SHELL` preserves the ordered reading path `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`; diagnostic overlays must not count as peer first-view surfaces.
- `CLIENT_PORTAL_SHELL` stays task-first, plain-language, current-primary/history-secondary, support-subordinate, and customer-safe. No portal view may leak staff-only fields, raw gate labels, assignment state, escalation logic, raw audit lineage, internal notes, hidden counts, or staff route context.
- Collaboration staff surfaces may show `CUSTOMER_VISIBLE` and `INTERNAL_ONLY` lanes together only when they remain physically and semantically separated. Customer surfaces receive customer-safe projections only; internal-only lane movement must not stale or perturb customer-visible routes.
- Commands must use `POST /v1/commands`, client-generated `command_id`, stable idempotency keys, exact stale-view guards, durable `ApiCommandReceipt` polling, and typed `ProblemEnvelope` handling.
- Streams must resume only through exact-route `stream_recovery_contract` bindings. Gap-free monotonic apply, duplicate idempotence, catch-up-before-live, `REBASE_REQUIRED`, and `ACCESS_REBIND_REQUIRED` must be enforced in the frontend runtime.
- Cache reuse is lawful only for exact tenant/principal/session/access/masking/route/object/projection/preview bindings. Local persistence must purge on narrowing or drift.
- Upload bytes can stage through upload transport, but legal attachment/finalization and any customer-visible publication remain command-driven and stale-guarded.
- UI telemetry and test logging must never capture regulated free text, upload bytes, raw authority tokens, hidden internal notes, masked values, screenshots of regulated content, keystroke streams, or DOM snapshots of regulated surfaces.

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

Calm-shell surfaces should feel like a quiet decision observatory: four explicit planes, restrained blue continuity accents, summary before diagram, and one support module at a time.

Portal surfaces should feel like a premium, plain-language service: one-column task-first flow, teal accent as a small rule or focus ring, generous card spacing, no expert jargon, no internal abbreviations, no dashboard metrics, and no decorative gamification. Use simple step rails, file requirement cards, current/history document rails, and receipt panels only when they clarify the task.

Collaboration staff surfaces should feel like a focused workbench: triage rows with identity/signal/action bands, customer/internal lane badges as text, dual-lane workspace modules, current-first files, and append-only audit linkage. Customer collaboration surfaces must remain portal-safe and should look like a focused request thread, not staff software with hidden columns.

Appropriate diagrams are encouraged when they clarify contracts. They must be contract diagrams, lineage ribbons, focus-order maps, upload-state rails, status step rails, current/history artifact rails, lane-separation maps, or stream tapes. Avoid generic KPI charts, donut charts, gauges, “AI sparkle” cards, and decorative hero graphs.

## Shared Playwright and accessibility requirements

Use Playwright from development day one, not as a late QA add-on.

- Use locator-first tests with roles, labels, text, and stable semantic `data-testid` anchors.
- Prefer `page.getByRole`, `getByLabel`, `getByText`, and explicit contract selectors over brittle CSS selectors.
- Use Playwright's auto-waiting/actionability behavior rather than fixed sleeps.
- Capture traces on CI failure.
- Add keyboard-only, reduced-motion, responsive, stale/rebase, stream resume, and semantic-anchor assertions for every browser-visible surface.
- Use `APIRequestContext` where command, receipt, stream, upload binding, route-contract, or stale-guard behavior can be verified without relying only on DOM inspection.
- Keep semantic anchors domain-meaningful. Do not name selectors after visual position or styling.
- For accessibility, implement stable landmarks/headings, visible focus, focus restoration, live region policy, keyboard completion, screen-reader-visible state meaning, target size, consistent help, and reduced-motion parity.
- For portal and collaboration upload/composer flows, include keyboard-only file selection/submission paths; drag-and-drop alone is never lawful.
- Browser tests must not store screenshots or traces containing regulated user content. Use deterministic redacted fixture data.

## Shared security, privacy, and performance requirements

- Do not log or persist regulated free text, upload bytes, raw authority tokens, hidden internal notes, masked values, screenshots of regulated content, keystroke streams, or DOM snapshots of regulated surfaces.
- Keep client code read/command separated: local UI state may describe focus, route, visibility, pending receipt posture, staged upload progress, and draft posture, but must not invent legal truth.
- Prefer deterministic pure adapters/builders around contract payloads so tests can exercise edge cases without live services.
- Fail closed on contract mismatch, stale guard drift, access/masking/session drift, route/context drift, upload binding mismatch, unsupported preview posture, or missing required semantic anchors.
- Avoid broad subscriptions, unnecessary remounts, layout churn, duplicate live-region announcements, polling loops, and row reorder behavior while focus is inside an action menu, composer, or file picker.

## Shared validation commands

Every card in this tranche must require the implementing agent to run, or explicitly document why the repository cannot yet run:

```bash
python3 Algorithm/scripts/validate_contracts.py --self-test
python3 Algorithm/tools/forensic_contract_guard.py
```
