# 14 Surface UIUX And Interaction Spec

The atlas visual direction is intentionally premium, quiet, and operational rather than dashboard-generic.
The semantic truth still comes only from the Taxat algorithm corpus. Current web research was used only to tune the visual restraint and composition of the browser-viewable atlas.

## Visual Thesis

- Mood: calm mission-control field guide with low-noise chrome and evidence-first hierarchy.
- Material: dark structured planes, soft borders, tight typographic rhythm, and one family accent per surface.
- Motion: causal fades and short vertical lifts only; no ornamental animation survives reduced-motion mode.

## Current Visual Research Inputs

| Reference | Source | Retrieved | Design takeaway |
| --- | --- | --- | --- |
| A calmer interface for a product in motion | [link](https://linear.app/now/behind-the-latest-design-refresh) | 2026-04-17 | Let navigation recede so the working surface carries the strongest visual weight, and soften structure until it is felt rather than loudly seen. |
| Vercel Design | [link](https://vercel.com/design) | 2026-04-17 | Systemize craft: restrained typography, consistent spacing, and a design-language spine strong enough to support multiple interface embodiments. |
| Raycast User Interface API | [link](https://developers.raycast.com/api-reference/user-interface) | 2026-04-17 | Keep native operator flows keyboard-first, with a list-detail-action-panel mental model and fast scene rendering under loading or reconnect. |

## Token Direction

- Background: `#090C11`
- Surface ladder: `#10151D`, `#171E28`, `#1D2531`
- Border: `rgba(255,255,255,0.08)`
- Primary text: `#F5F7FB`
- Secondary text: `#9AA5B3`
- Collaboration accent: `#76A9FF`
- Portal accent: `#99D2FF`
- Governance accent: `#E7C37A`
- Native accent: `#7FE0C8`
- Success / warning / danger: `#78D7A6`, `#F2C66D`, `#FF8E80`

## Spatial System

- Desktop grid: `12` columns, `max-width: 1520px`
- Page padding: `32px` desktop, `24px` tablet, `16px` mobile
- Sticky left rail: `280px`
- Sticky evidence inspector: `360px`
- Collapse inspector below `1180px`; stack all sections below `820px`
- Outer radius: `22px`
- Panel radius: `18px`
- Inset card radius: `14px`

## Family-Specific Composition

| Family | Visual responsibility | Interaction signature | Support-region law |
| --- | --- | --- | --- |
| Collaboration Workspace | A shared work object exposes distinct staff and customer views without ever crossing visibility lanes or losing queue continuity. | Queue -> workspace -> thread/module focus with inline rebase and append-only activity. | DETAIL_DRAWER in staff surfaces; contextual support panel in customer-safe request views. |
| Client Portal | A task-first, customer-safe portal keeps language plain, support subordinate, and trust moments explicit across upload, approval, onboarding, and help routes. | Single-column primary task flow with contextual history, help, and artifact handoff kept subordinate. | Exactly one support region outside Help; help route itself may foreground support context. |
| Governance Console | Dense control-plane work stays diff-first, basis-hash-aware, and audit-visible without collapsing into noisy admin chrome. | Context bar + section nav + inventory rail + workspace canvas + audit sidecar, with staged mutation baskets and approval posture. | AUDIT_SIDECAR is the default promoted support region unless a route-local support window temporarily supersedes it. |
| macOS Operator Workspace | The native client turns calm-shell law into multi-window operator depth, keyboard surfaces, and scene restoration without inventing new product semantics. | Primary split view scenes, parent-bound secondary windows, command-surface shortcuts, and cache-backed resume with fail-closed legality checks. | Trailing inspector in primary scenes; parent-bound secondary windows for compare, audit, packet, and authority review. |

## Atlas Page Composition

1. `Overview` uses a hero thesis, a four-bar monochrome glyph, a `2x2` family matrix, and a right-column law stack.
2. `Collaboration` foregrounds queue/workspace/request continuity, internal-vs-customer lanes, and current-vs-history artifact posture.
3. `Portal` stays mobile-first with one task column, an upload-state ribbon, approvals digest, and subordinate help continuity.
4. `Governance` uses denser side-by-side inventory, basket, approval, and audit framing without inheriting calm-shell aesthetics.
5. `Native` shows the split-view primary scene, detached support windows, command surfaces, auth handoff, and restore envelope.
6. `Continuity & Recovery` surfaces route restoration, focus return, state taxonomy, and stream resume ordering across all families.

## Atlas Harness Expectations

- The atlas renders `30` route or scene records from one generated data source.
- Semantic selector chips are visible for every selector profile rendered by the harness.
- Reduced-motion mode changes only animation posture; it does not change ordering, selector anchors, or focus return law.
