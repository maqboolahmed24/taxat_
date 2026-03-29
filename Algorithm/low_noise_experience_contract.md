# Low-Noise Experience Contract - Taxat Production Profile

## Purpose
This contract evaluates the current Decision Observatory specification and defines the default production UX profile for staff/operator interfaces built on the Taxat engine.
The goal is not to remove semantic depth. The goal is to remove unnecessary visual, navigational, and cognitive noise while preserving legal precision, evidence traceability, and route-stable investigation.

This contract governs the default decision workspace used for run composition, posture review, evidence investigation, filing, and amendment work.
It SHALL NOT be treated as the layout contract for the Admin/Governance Console, which requires denser inventory, comparison, policy-edit, and audit investigation patterns; that control-plane surface is defined separately in `admin_governance_console_architecture.md`.
This contract does **not** govern the customer-facing portal.
Client journeys SHALL use `customer_client_portal_experience_contract.md`, which replaces expert investigation surfaces with task-centric status, secure upload, approval, and onboarding flows.
No client-facing route SHALL surface observatory modules as first-view peer regions merely because they exist in the staff shell.

---

## Evaluation of the current project
The current project is strong where many enterprise products fail:

- it preserves the distinction between internal truth, authority truth, and transport truth
- it treats uncertainty, review posture, and provenance as first-class concepts
- it protects narrative continuity across long-running and stateful workflows

Those strengths should remain.
The main usability risk is not lack of meaning; it is **overexpression of meaning**.
The current observatory profile introduces too many concurrent surfaces, too many bespoke metaphors, and too much simultaneous semantic motion for the default path.
That creates four failure modes:

1. **Split attention** - the user must scan ribbon, canvas, rail, dock, and overlays before knowing what matters most.
2. **Metaphor overhead** - every new visual grammar adds learning cost even when the underlying decision is simple.
3. **Priority ambiguity** - primary decision, uncertainty, workflow, and forensic detail can appear visually co-equal.
4. **Operational drag** - repeated expert use becomes slower because the interface keeps presenting investigative power even when the user only needs the next safe action.

The redesign direction is therefore: **keep the observatory as the semantic engine, but compress the visible experience into a calm, low-noise workspace**.

---

## Production experience thesis
At default zoom and default navigation depth, the user should be able to answer within one short scan cycle:

1. what the system believes now
2. why that posture exists
3. what the safest next move is

Everything else is progressive disclosure.
The product should feel exact, quiet, and deliberate rather than theatrical.

---

## Design principles

### 1. Progressive disclosure with a hard surface budget
No more than four persistent visible regions SHALL compete for attention in the default shell.
Complex read models remain available, but open only when directly relevant or explicitly requested.

### 2. Primary-action singularity
The interface SHALL present one dominant safe next action at a time.
Secondary actions may exist, but they must remain visually subordinate and clearly lower-risk.

### 3. Exception-first hierarchy
When a hard block, review requirement, masking limit, or authority contradiction exists, the interface SHALL elevate that condition above neutral progress indicators and routine metadata.

### 4. Semantic compression
The default summary SHALL compress many machine facts into a short human-readable posture statement, a bounded reason list, and a bounded uncertainty or limit statement.
Raw detail stays linked, not foregrounded.

### 5. Stable context, movable detail
Manifest identity, scope, phase, truth origin, and freshness remain pinned.
Evidence, lineage, authority detail, drift detail, and compare tools move into on-demand drawers or focus states.

### 6. Quiet-by-default motion
Motion is reserved for causality and state change, never ambience.
In the default profile, only the object that changed may animate prominently; all other refreshes degrade to low-amplitude motion or no motion.

### 7. Edge-tolerant object permanence
On reconnect, stale data, projection lag, masking, or late data, the shell keeps the last valid mental model mounted and labels its limits explicitly instead of clearing or reshuffling the layout.

### 8. Text-first accessibility
No critical meaning may depend on color, hover, topology, or animation.
The shell must remain fully legible in reduced-motion, keyboard-only, screen-reader, and zoomed modes.

### 9. Recognition over recall
The default shell SHALL expose current posture, next safe action, and active limitations through direct labels and bounded summaries.
The user SHALL NOT need to remember earlier rail content, decode hover-only states, or infer status from decorative topology.

### 10. Omission over disabled clutter
Controls that are illegal, unavailable, or non-material for the current posture SHALL be omitted from the default shell rather than rendered as disabled buttons, gray chips, or inert cards.
Visible controls should communicate possibility, not tease unavailable branches.

### 11. Continuity over remount
Reconnect, catch-up, projection lag, and non-destructive refresh SHALL update inline within the mounted shell.
Layout identity, reading order, and focus anchor remain stable unless the user explicitly changes mode.

### 12. Explicit limitation taxonomy
The shell SHALL distinguish `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE`.
Absence, latency, policy hiding, and irrelevance SHALL never share one empty-state treatment.

---

## Default visible shell
The production shell SHALL reduce the first-view experience to four persistent surfaces:

### `CONTEXT_BAR`
A compact strip containing manifest identity, period, scope, phase, freshness, truth origin, connection state, and current owner or handoff posture.
This replaces simultaneous dependence on a ribbon, pulse object, and handoff artifact for primary orientation.

### `DECISION_SUMMARY`
The primary posture object.
It answers: what the system believes, why, and what limits or uncertainty still apply.
It SHALL show at most one primary issue and at most three supporting reasons before expansion.

### `ACTION_STRIP`
A single dominant safe next action plus any subordinate secondary actions.
If no safe action exists, the strip SHALL say so plainly and route the user into the most relevant investigation path.

### `DETAIL_DRAWER`
A collapsed on-demand container for expert modules such as lineage, evidence, authority transport, drift, packet preparation, compare, and audit.
Only one detail module may be expanded by default at a time.

---

## Cognitive budget and omission rules
The low-noise production profile SHALL freeze the following defaults:

- `persistent_surface_limit = 4`
- `concurrent_primary_limit = 1`
- `primary_reason_limit = 3`
- `secondary_action_limit = 2`
- `visible_warning_limit = 1`
- `detail_entry_point_limit = 5`
- `expanded_detail_module_limit = 1`

The shell SHALL also obey these compression rules:

- non-legal, unavailable, or non-material actions are omitted rather than rendered as disabled clutter
- the default shell exposes no more than one dominant call to action and no more than two subordinate secondary actions
- non-live or analysis-only posture is stated once in `CONTEXT_BAR` unless the user explicitly opens a deeper audit or compare module
- expert entry points are ordered by investigation value rather than alphabetically or by implementation convenience

## Copy budget and visual restraint rules
The calm-shell guarantee requires brevity as well as surface reduction.
The production profile SHALL freeze the following microcopy budgets for default persistent surfaces:

- context labels SHOULD remain within 48 visible characters, with `manifest_label` allowed up to 64
- `DECISION_SUMMARY.headline` SHOULD remain within 96 visible characters
- each visible reason label SHOULD remain within 120 visible characters
- `plain_explanation` SHOULD remain within 240 visible characters
- primary and secondary action labels SHOULD remain within 40 visible characters
- `blocking_reason` and `uncertainty_statement` SHOULD remain within 160 visible characters
- detail entry labels SHOULD remain within 48 visible characters and detail entry reasons within 120 visible characters

These are shell budgets, not legal-truth budgets.
When source material exceeds the default shell budget, the renderer SHALL preserve the legal nucleus in the shell and route the remainder into the relevant detail module.

The default shell SHALL also obey these restraint rules:

- only the four composite shell surfaces may be emitted as peer top-level surfaces when `experience_profile = LOW_NOISE`
- the shell reading order SHALL remain `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` unless the user explicitly enters compare or audit mode
- status language SHALL be literal and machine-stable; the shell SHALL prefer `WAITING_ON_AUTHORITY`-style clarity over decorative prose
- analysis-only posture, masking posture, and limitation posture SHALL each appear once in the default shell unless deeper investigation is explicitly opened

---

## Surface reduction map
The rich observatory read models remain valid, but are remapped for default presentation:

- `PULSE_SPINE` + `MANIFEST_RIBBON` + `HANDOFF_BATON` -> `CONTEXT_BAR`
- `DECISION_STAGE` + gate or trust rollups -> `DECISION_SUMMARY`
- `CONSEQUENCE_RAIL` + workflow implications -> `ACTION_STRIP`
- `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` -> `DETAIL_DRAWER` modules

This preserves algorithmic fidelity while eliminating the need to show multiple large semantic surfaces concurrently.

---

## Edge-case handling contract

### Masking, permission limits, retention limits
The user must see that the view is limited.
Hidden information SHALL never masquerade as absence.
The summary should say what kind of limit exists and whether it affects actionability.

### Projection lag or long-running workers
Keep the last stable posture mounted.
Show freshness and checkpoint state inline.
Never blank the main shell or replace the primary summary with a global loader.

### Reconnect, stale connection, catch-up delivery
Preserve object positions and scroll or focus anchors where possible.
Mark the shell stale or catching up without re-staging the original event theatrically.
The read-side contract SHALL also preserve the active detail module, `focus_anchor_ref`, and
explicit actionability posture so reconnect never has to guess whether the prior screen meant
`NO_SAFE_ACTION` or simply lacked a hydrated primary action.

### Multiple simultaneous problems
Show the highest-impact issue as the primary summary.
Collapse the rest into an additional-issues count with direct detail entry points.

### Human review, approval, or step-up required
The action strip must switch from automation language to explicit ownership language.
The user should know who must act, what is blocked, and what remains safe to inspect.
Pre-manifest step-up or approval exits SHALL reuse the same summary/action grammar as the mounted
low-noise shell so the user does not have to learn a different interaction model at launch time.

### Authority pending, unknown, rejected, or out-of-band
The shell must distinguish waiting, ambiguous, rejected, and externally discovered states.
No success styling or completion language may appear until authority-confirmed truth exists.

### No safe next action
The system SHALL state `NO_SAFE_ACTION` plainly, identify the blocking cause, and open the relevant detail module rather than presenting disabled button clutter.

### Empty or not-yet-materialized detail
Empty states must teach the model of the system.
The shell SHALL explicitly classify and message at least these states:

- `NOT_REQUESTED`
- `NOT_YET_MATERIALIZED`
- `LIMITED`
- `NOT_APPLICABLE`

For example, evidence detail should explain whether evidence is not collected yet, intentionally hidden, or simply not relevant for the current path.

### Analysis-only and non-live posture
Mode distinction is important, but repeated banner noise is not.
The default shell SHALL express non-live or analysis-only posture once in `CONTEXT_BAR` and then preserve that truth semantically in detail modules without duplicating the same warning across every persistent surface.

---

## Algorithm translation requirements
The read side SHALL derive a machine-readable `attention_policy{...}` object for every published frame.
That policy SHALL identify:

- the primary issue or posture object
- the primary action or explicit lack of safe action
- the set of collapsed secondary notices
- the ordered default detail-module entry points
- the ranked basis used to choose the dominant visible posture

The read side SHALL also derive a frozen `cognitive_budget{...}` object for every published frame.
That object SHALL encode the production defaults for persistent surface count, primary count, visible reason count, visible warning count, secondary-action count, detail-entry-point count, and expanded-detail count.

The shell SHALL enforce these rules:

- one primary issue at a time
- one primary action at a time, or explicit `NO_SAFE_ACTION` with a machine-stable reason and deterministic investigation module
- one expanded detail module at a time unless compare or audit mode is explicit
- default summary bounded to three reasons before expansion
- default warnings bounded to one primary warning plus an additional-count affordance
- default secondary actions bounded to two
- default detail entry points bounded to five
- summary, context, and action copy trimmed to the frozen low-noise copy budget before schema serialization
- non-legal or non-material actions omitted rather than shown disabled
- empty and limited detail states normalized to `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, or `NOT_APPLICABLE`
- only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` emitted as peer top-level surfaces in the `LOW_NOISE` profile

The algorithm SHALL continue to generate rich semantic read models, but the default renderer SHALL treat them as internal source surfaces for a calmer composite shell.
They may populate detail modules or explicit compare/audit views, but they SHALL NOT reappear as additional peer top-level regions in the default shell.

---

## Validation additions
Playwright coverage for the production profile SHALL include at minimum:

1. only the four default shell surfaces are visible on first load
2. a `HARD_BLOCK` collapses secondary detail and elevates one primary issue
3. a masking-limited view states that the view is limited without implying missing data
4. authority-pending and authority-confirmed states never share the same completion treatment
5. reconnect and catch-up preserve focus anchor, the active detail module, and do not trigger high-amplitude re-animation
6. `NO_SAFE_ACTION` renders with a precise reason and a deterministic investigation entry point
7. pre-manifest step-up or approval exits reuse the same summary/action grammar as post-manifest shell states
8. keyboard-only navigation can reach summary, action strip, and the active detail module in semantic order
9. reduced-motion mode preserves all state meaning without dependence on animation
10. illegal or non-material actions are omitted rather than rendered as disabled controls
11. the default summary never renders more than three reasons, the action strip never renders more than two secondary actions, and the drawer never renders more than five entry points on first load
12. `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE` detail states render distinct copy
13. analysis-only or non-live posture appears once in `CONTEXT_BAR` on default load and does not duplicate across persistent surfaces
14. low-noise copy budgets are enforced so long reason chains, verbose authority payloads, or broad drift notes do not displace the primary action
15. the `LOW_NOISE` experience profile emits only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` as top-level peer surfaces
