# ADR-006: Web Frontend Topology

- Status: Accepted
- Date: 2026-04-18
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already defines the browser contract in enough detail to make a topology choice now: three shell families, stable route grammar, interaction-layer bindings, customer-safe projection law, selector law, continuity law, and Playwright-oriented validation obligations. What the corpus had not yet selected was the deployable shape that should embody those contracts.

The existing analysis outputs normalized `24` browser routes, `3` shell families, `6` continuity scenarios used for browser validation, and one shared route/projection map from ADR-005. ADR-006 closes the remaining gap by choosing how browser surfaces are partitioned, how shared packages are owned, how local/browser state domains are fenced, and how the shell atlas proves the choice in code.

## Decision

Adopt a **shared TypeScript/React browser platform with two deployables**:

- `operator-web` owns `CALM_SHELL` and `GOVERNANCE_DENSITY_SHELL`.
- `client-portal-web` owns `CLIENT_PORTAL_SHELL`, including the customer-safe request-context routes.
- Both deployables share one contract spine for route ownership, interaction-layer bindings, selector grammar, design tokens, northbound API clients, continuity runtime, and Playwright fixtures.
- Route-level micro-frontend seams are rejected; route groups stay inside one deployable runtime so shell continuity, focus restore, and selector grammar remain exact.
- The browser visual system is deliberately light, quiet, and typographic, with restrained shell accents and no generic enterprise dashboard chrome.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Shell-law fidelity | HARD_REQUIREMENT | 14 | The topology must preserve the three shell families and their distinct layout grammars without collapsing them into one generic dashboard. |
| Cross-shell code sharing without semantic drift | HARD_REQUIREMENT | 10 | The shared web platform must reuse contracts, tokens, selector grammar, and continuity logic without forcing one shell grammar onto another. |
| Deployable isolation between operator/governance and portal surfaces | HARD_REQUIREMENT | 12 | Internal operator/governance code and customer portal code need clear deployable boundaries for audience safety, bundle isolation, and blast-radius control. |
| Route continuity and deep-link stability | HARD_REQUIREMENT | 10 | Refresh, deep link, back/return, and notification open must preserve the same owned shell and object context where the corpus requires it. |
| Auth/session integration fit | HARD_REQUIREMENT | 8 | Browser handoff, step-up, and session posture must map cleanly to the chosen deployable split. |
| Customer-safe separation | HARD_REQUIREMENT | 12 | Portal surfaces must remain physically and semantically isolated from staff-only semantics and hidden internal context. |
| Performance and bundle isolation | STRONG_PREFERENCE | 9 | The browser topology should allow route-level code splitting and avoid shipping internal operator/governance code to portal users. |
| Design-token and selector reuse | HARD_REQUIREMENT | 8 | Shared tokens, semantic selectors, and interaction-layer bindings need one platform spine so later implementation does not drift. |
| Testability with Playwright | HARD_REQUIREMENT | 7 | The topology should encourage semantic locators, deterministic shells, and stable browser automation contracts. |
| Evolvability for later phase-05 implementation tasks | STRONG_PREFERENCE | 5 | The chosen topology must give later web implementation tasks stable package seams, deployable seams, and testing seams. |
| Operational simplicity and blast-radius control | TRADEOFF | 5 | The deployable split should stay operationally coherent while still limiting blast radius between internal and portal surfaces. |

## Deployable Topology

| Deployable | Owned Shell Families | Browser Routes | Why It Exists |
| --- | --- | --- | --- |
| Operator Web | CALM_SHELL, GOVERNANCE_DENSITY_SHELL | 17 | Keep calm-shell and governance code in one internal deployable with route-level code splitting so internal session and selector grammar stay unified without exposing portal bundles. |
| Client Portal Web | CLIENT_PORTAL_SHELL | 7 | Portal deployable excludes governance and internal operator modules entirely, and ships only portal-safe selectors, copy, and route families. |

This split is the core architectural choice. Internal operator/governance routes share one deployable because they share internal session posture and internal route runtime. The portal stays separate because customer-safe copy, bundle contents, and blast radius must stay separate by default rather than by runtime discipline alone.

## Shared Package Boundaries

| Package | Responsibility | Must Not Hold |
| --- | --- | --- |
| packages/contracts | Generated and hand-authored route, shell, projection, selector, and stale-guard contracts shared by both deployables. | framework-specific page composition or branded copy |
| packages/route-runtime | Shell ownership, route grammar, deep-link restore, browser handoff return, and same-object continuity helpers. | audience-specific page chrome |
| packages/design-tokens | Light premium browser token system, shell accents, spacing scales, typography stacks, and motion timing constants. | route business logic |
| packages/interaction-layers | Operator, portal, and governance interaction-layer bindings mapped from the shell foundation contract. | raw API fetching or cache adapters |
| packages/selector-grammar | Semantic selector helpers and accessibility anchor exports for Playwright-first validation. | visual-only classes or CSS selectors as test contracts |
| packages/northbound-clients | Typed API clients, command envelope helpers, receipt polling, upload-session clients, and stream adapters. | route-local composition or customer-safe copy decisions |
| packages/state-runtime | Shared cache keys, continuity store utilities, stale/rebase posture state, and session-bound storage guards. | durable business truth |
| packages/test-harness | Playwright fixtures, semantic locator helpers, contract-driven mocks, and screenshot harness utilities. | production runtime side effects |

The platform is shared, not merged. Shared packages carry the browser contract spine; each deployable still owns its shell-specific composition, copy, and route-local behavior.

## State-Domain Boundaries

| State Domain | Allowed Storage | First Forbidden Move |
| --- | --- | --- |
| server_projection_state | in-memory query cache only; optional persistent cache only for route-safe replay and never as legal truth | Do not derive new legal posture in the client or persist these projections as durable truth. |
| continuity_and_stale_guard_state | URL, history.state, and tiny session-bound restore records only | Do not hide continuity state behind local component-only memory when the route contract requires cross-refresh restore. |
| local_draft_state | memory first; session-bound browser storage only when the contract publishes draft-resume semantics | Do not silently replay drafts after a stale-view rejection or scope downgrade without explicit user-visible rebasing. |
| ephemeral_ui_state | memory only | Do not encode business truth, customer-safe visibility, or settlement semantics here. |
| auth_and_session_state | httpOnly cookies and server-side session state; no raw tokens in browser-managed JavaScript storage | Do not collapse operator and portal sessions into one mega-app ambient login state. |
| browser_cache_and_transfer_state | session-bound storage or IndexedDB only for transfer/resume metadata that the route contract explicitly allows | Do not store raw authority credentials, legal truth, hidden staff context, or customer-safe widened caches here. |

The non-negotiable rule is that browser state may preserve continuity, drafts, and local UX posture, but it may not become legal truth. Route projections, stale guards, and customer-safe fences remain server-authored contracts.

## Design Token And Interaction-Layer Binding

| Shell Family | Deployable | Interaction Layer | Selector Profile | Accent |
| --- | --- | --- | --- | --- |
| CALM_SHELL | operator-web | OperatorInteractionLayer | OPERATOR_SEMANTIC_SELECTORS_V1 | #3158C7 |
| CLIENT_PORTAL_SHELL | client-portal-web | PortalInteractionLayer | PORTAL_SEMANTIC_SELECTORS_V1 | #19796C |
| GOVERNANCE_DENSITY_SHELL | operator-web | GovernanceInteractionLayer | GOVERNANCE_SEMANTIC_SELECTORS_V1 | #7C4E8E |

ADR-006 intentionally selects a restrained light browser system: background `#F6F7F9`, primary surface `#FFFFFF`, secondary surface `#EEF1F4`, ink `#111318`, muted text `#5B6472`, and only sparse shell accents. The shells share typography and motion discipline, but they do not share one layout grammar blindly.

## Atlas And Playwright Proof

- The atlas lives in [web-shell-atlas](/Users/test/Code/taxat_/prototypes/analysis/web-shell-atlas) and demonstrates one calm-shell route, one portal route, one governance route, plus a verification lab.
- The Playwright pack lives in [web-shell-atlas.spec.ts](/Users/test/Code/taxat_/tests/playwright/analysis/web-shell-atlas.spec.ts) and validates semantic anchors, keyboard flow, same-shell continuity, focus return, reduced motion, and stale/recovery behavior.
- Locator strategy remains Playwright-first: role/label/text first, semantic `data-testid` only for contract anchors, no CSS/XPath dependency.

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| 1 | Shared TypeScript/React web platform with two deployables | 91.4 |
| 2 | One single mega web application containing all shell families and audiences | 61.2 |
| 3 | Micro-frontend decomposition by route family, shell, or feature slice | 56.3 |

The winning option is **Shared TypeScript/React web platform with two deployables** with a weighted score of `91.4`.

## Why This Option Wins

- It is the only option that gives the portal a real deployable boundary while still keeping one shared contract spine for shells, selectors, tokens, and stale/continuity logic.
- It preserves shell-law fidelity by keeping route groups inside one deployable runtime instead of introducing micro-frontend seams that would fracture focus and return behavior.
- It keeps customer-safe separation structural: portal code, copy, and bundle contents are isolated from internal operator/governance surfaces.
- It supports later phase-05 web tasks cleanly because the app seams, package seams, and test seams are explicit now.

## Guardrails On The Decision

- The portal deployable SHALL NOT ship governance or internal operator modules.
- Internal operator/governance surfaces SHALL NOT share one generic shell grammar with portal routes.
- Route-level micro-frontend seams SHALL NOT be introduced unless they can prove exact shell continuity, selector reuse, and focus-return parity.
- Semantic selectors SHALL remain stable across wide and compact layouts.
- Reduced-motion mode SHALL preserve meaning, ordering, and state language without relying on spatial choreography.
- Support regions SHALL remain support-only and SHALL NOT become competing primary-action surfaces.

## Consequences

Positive consequences:

- Browser implementation gets clean seams: two apps, one platform spine, explicit shared packages, and explicit state domains.
- Portal safety improves because customer-facing bundles, copy, and selectors are isolated by build boundary rather than only by route guards.
- Playwright coverage becomes easier to scale because selector grammar and continuity contracts live in one shared harness layer.

Negative consequences and tradeoffs:

- Two deployables require more deployment and environment coordination than a single mega app.
- Shared-package governance must stay strict so shell-specific design decisions do not leak across deployables.
- Internal calm/governance surfaces still need route-level code splitting and disciplined ownership to avoid becoming a noisy internal mega app.

## Rollback And Deploy Posture

- `operator-web` and `client-portal-web` may roll independently when their shared contract package versions remain compatible.
- Shared package releases that change route grammar, selector contracts, or interaction-layer bindings require synchronized compatibility review before either deployable rolls forward.
- If one deployable must roll back, browser continuity and cache/runtime guards fail closed by invalidating incompatible route state rather than attempting best-effort replay.

## Deferred Decisions

- PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED: The portal contract fully enumerates route semantics and read models, but does not publish every literal northbound path per route.
- PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE: Portal flow documents describe upload, approval, onboarding, and support action families more strongly than a literal complete command enum.
- GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE: Governance routes define staged mutations, basis hashes, and approval posture explicitly, but not a complete per-route mutation enum.
- MANIFEST_FOCUS_ROUTE_NORMALIZED: The collaboration contract explicitly names `/manifests/{manifest_id}?focus=workflow:{item_id}`, but other manifest route literals are distributed across the corpus rather than centralized.

- Exact router, query-cache, SSR/ISR, and CDN adapter choices are deferred; ADR-006 chooses topology and boundaries, not every implementation adapter.

## References

- Surface topology map: [web_surface_topology_and_deployable_map.json](/Users/test/Code/taxat_/data/analysis/web_surface_topology_and_deployable_map.json)
- Route-group ownership map: [web_route_group_and_shell_ownership_map.json](/Users/test/Code/taxat_/data/analysis/web_route_group_and_shell_ownership_map.json)
- State-domain map: [web_state_domain_and_data_boundary_map.json](/Users/test/Code/taxat_/data/analysis/web_state_domain_and_data_boundary_map.json)
- Design-token binding: [web_design_token_and_interaction_layer_binding.json](/Users/test/Code/taxat_/data/analysis/web_design_token_and_interaction_layer_binding.json)
- Playwright strategy: [web_playwright_strategy.json](/Users/test/Code/taxat_/data/analysis/web_playwright_strategy.json)
- Scorecard: [ADR-006-web-frontend-topology-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-006-web-frontend-topology-scorecard.json)
- Comparison notes: [ADR-006-web-frontend-topology-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-006-web-frontend-topology-comparison.md)
- Diagram: [ADR-006-web-frontend-topology.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-006-web-frontend-topology.mmd)
