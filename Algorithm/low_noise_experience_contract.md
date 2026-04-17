# Low-Noise Experience Contract - Taxat Production Profile

## Purpose
This contract evaluates the current Decision Observatory specification and defines the default production UX profile for staff/operator interfaces built on the Taxat engine.
The goal is not to remove semantic depth. The goal is to remove unnecessary visual, navigational, and cognitive noise while preserving legal precision, evidence traceability, and route-stable investigation.

This contract governs the default decision workspace used for run composition, posture review, evidence investigation, filing, and amendment work.
`frontend_shell_and_interaction_law.md` remains authoritative for cross-platform shell ownership, same-object continuity, artifact handling, accessibility, and UI disclosure fencing; this contract tightens those rules for the staff low-noise shell.
Every `LowNoiseExperienceFrame` SHALL additionally publish one grouped `cross_device_continuity_contract` pinned to `continuity_scope = MANIFEST_ROUTE` so browser refresh, narrow-screen collapse, native restoration, and deep-link reopen reuse the same manifest id, focus anchor, dominant action posture, and grouped stability guard instead of inventing a second manifest shell.
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
`LIMITED` SHALL never be a catch-all: the published machine reason set SHALL distinguish at minimum
masking, retention, permission, partial-evidence-loss, and projection minimisation, and a limited
state with no typed reason is invalid.
`LowNoiseExperienceFrame.state_taxonomy_contract` SHALL mirror the active summary or detail-drawer
empty-state posture; `DecisionSummaryState` and `DetailDrawerState.entry_points[]` SHALL retain
typed reason bindings so `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, and `NOT_APPLICABLE` never share
one fallback explanation path.
`LowNoiseExperienceFrame.semantic_accessibility_contract` SHALL freeze calm-shell semantic anchors,
browser/native identifier parity, focus order, live-update announcement posture, and current-vs-
history artifact handoff anchors so accessibility and automation remain aligned through resize,
native restoration, and recovery.

### 13. One dominant question per frame
Every published calm-shell frame SHALL serialize the single dominant question the screen is
answering. That question anchors summary copy, action posture, automation selectors, and recovery
messaging. It SHALL change only when truth or actionability meaningfully changes, not merely
because a background refresh completed.

### 14. Settlement-aware feedback
The shell SHALL distinguish steady, receipt-pending, freshening, stale-review-required,
degraded-read-only, and recovery-required posture without remounting or introducing a competing
top-level loader. Settlement posture is part of the shell contract, not an implementation detail.

---

## Default visible shell
The production shell SHALL reduce the first-view experience to four persistent surfaces:

### `CONTEXT_BAR`
A compact strip containing manifest identity, period, scope, phase, freshness, truth origin, connection state, and current owner or handoff posture.
This replaces simultaneous dependence on a ribbon, pulse object, and handoff artifact for primary orientation.
In machine-readable form it SHALL remain explicitly grounded in `MANIFEST_RIBBON`; the default
shell compresses ribbon semantics into one stable context strip rather than remounting a separate
lineage rail beside the shell.

### `DECISION_SUMMARY`
The primary posture object.
It answers: what the system believes, why, and what limits or uncertainty still apply.
It SHALL show at most one primary issue and at most three supporting reasons before expansion. When
visible explanation confidence is lower than retained decision confidence because masking, expiry,
pseudonymisation, or erasure narrowed the projection, that distinction SHALL be stated explicitly
instead of reusing the higher internal confidence as user-facing certainty.
In machine-readable form it SHALL preserve the ordered source lineage
`DECISION_CONSTELLATION -> GATE_LATTICE -> TRUST_PRISM`; those observatory modules remain valid, but
their first-view embodiment is one bounded summary surface rather than three peer canvases.

### `ACTION_STRIP`
A single dominant safe next action plus any subordinate secondary actions.
If no safe action exists, the strip SHALL say so plainly and route the user into the most relevant investigation path.
It SHALL also preserve explicit ownership language, machine-stable reason codes, ordered available/blocked action inventories, the suggested investigation surface, and any still-valid mounted detail focus.
In machine-readable form it SHALL remain explicitly grounded in `WORKFLOW_CHOREOGRAPHER`; workflow,
remediation, and consequence orchestration stay visible through one dominant safe next move rather
than a detached operator queue panel inside the same shell.

### `DETAIL_DRAWER`
A collapsed on-demand container for expert modules such as lineage, evidence, authority transport, drift, packet preparation, compare, and audit.
Only one detail module may be expanded by default at a time.

The default low-noise drawer SHALL preserve the following user-facing module embodiments:

- `EVIDENCE_TIDE` -> `Evidence Prism`
- `PACKET_FORGE` -> `Packet Forge`
- `AUTHORITY_TUNNEL` -> `Authority Handshake Tunnel`
- `DRIFT_FIELD` -> `Drift Ripple Field`
- `FOCUS_LENS` -> `Audit Echo Panel`
- `TWIN_PANEL` -> `Twin Lens`

Each mounted module SHALL publish one plain-language interpretation summary before any graph,
timeline, tunnel, ripple, or trace-heavy rendering.
That summary SHALL explain the current posture, the causal nucleus, and why the module matters for
the safe next move.
Decorative or topology-first rendering without that companion interpretation is not a lawful
low-noise embodiment.

The published low-noise frame and these four persistent surfaces SHALL validate against dedicated JSON
schemas in `schemas/low_noise_experience_frame.schema.json`, `schemas/context_bar_state.schema.json`,
`schemas/decision_summary_state.schema.json`, `schemas/action_strip_state.schema.json`, and
`schemas/detail_drawer_state.schema.json`.
Every published `LowNoiseExperienceFrame` SHALL also freeze `shell_family = CALM_SHELL`,
`object_anchor_ref`, `dominant_question`, `dominance_contract`, `settlement_state`, `recovery_posture`, `decision_bundle_hash`,
and one grouped `stability_contract{{ publication_generation, guard_vector_hash, guard_vector_components{{ decision_bundle_hash_or_null, shell_stability_token_or_null, frame_epoch_or_null, ... }}, last_published_sequence_or_null, resume_token_or_null, resume_capability }}` so the
mounted shell's governing question, mutation basis, reconnect markers, and recovery posture remain deterministic
across browser, native, and automation clients.
The same frame, every `ExperienceStreamEvent`, and every persisted `ExperienceCursor` SHALL also
publish one grouped `stream_recovery_contract` so resume binding, session/access/masking lineage,
publication generation, epoch, published frontier, and compaction-floor semantics remain
authoritative server truth rather than being inferred from the raw `resume_token`.

---

## Settlement-state contract
`LowNoiseExperienceFrame.settlement_state` SHALL be one of:

- `STEADY`
- `RECEIPT_PENDING`
- `FRESHENING`
- `STALE_REVIEW_REQUIRED`
- `DEGRADED_READ_ONLY`
- `RECOVERY_REQUIRED`

Rules:

- after first meaningful paint, no global loader SHALL replace the mounted shell; freshening and
  receipt-pending posture update inline inside the existing surfaces
- `RECEIPT_PENDING` SHALL preserve the prior dominant question and action context while clearly
  separating accepted local intent from durable server settlement
- `STALE_REVIEW_REQUIRED`, `DEGRADED_READ_ONLY`, and `RECOVERY_REQUIRED` SHALL fail closed for
  unsafe mutation-capable actions unless the only remaining safe primary action is refresh,
  reconnect, or rebase
- recovery posture SHALL preserve `focus_anchor_ref`, the active detail module, and reading order
  whenever the underlying object still exists

---

## Shell continuity, constrained layouts, and artifact handoff

The low-noise experience SHALL obey the cross-platform law of same object, same shell.
Deep links, notification opens, compare entry, audit entry, stale-view rebase, reconnect recovery,
and route restores SHALL keep the same four-surface hierarchy mounted for the same manifest rather
than remount a different layout metaphor.

Rules:

- the default shell MAY promote only one support region at a time: `DETAIL_DRAWER`; compare and
  audit modes MAY introduce a second promoted region only when the user explicitly enters those
  modes
- blocker, stale, limitation, and pending-propagation posture SHALL render inside `CONTEXT_BAR`,
  `DECISION_SUMMARY`, `ACTION_STRIP`, or the active drawer module instead of spawning a second
  persistent rail or replacing the shell with a global loading state
- every published `LowNoiseExperienceFrame` SHALL emit `cross_device_continuity_contract` with
  `continuity_scope = MANIFEST_ROUTE`, `compatibility_basis_class = ROUTE_GUARD_ONLY`, allowed
  browser-plus-native calm-shell embodiments, and `secondary_window_policy = SUPPORT_ONLY_PARENT_BOUND`
  so browser, narrow, and native calm-shell restorations preserve one manifest identity and one
  server-authored action posture
- on narrow, embedded, or otherwise constrained layouts, `CONTEXT_BAR`, `DECISION_SUMMARY`, and
  `ACTION_STRIP` SHALL remain stacked in the canonical reading order while `DETAIL_DRAWER` collapses
  into an inline section or focus-preserving sheet that preserves the same module order,
  `expanded_module_code`, and `focus_anchor_ref`
- collaboration work-item routes that share the calm shell SHALL keep their summary structured as:
  issue -> next actor -> due posture -> optional customer/internal state divergence; freshness and
  reconnect notices stay inline in the context bar rather than being re-expressed as audit-heavy
  summary prose
- command receipts, pending propagation, awaiting approval, refresh required, and equivalent
  settlement-aware feedback SHALL keep the mounted summary and action context visible; the product
  SHALL NOT replace the dominant question with a full-screen spinner or celebratory completion pane
- packet, evidence, authority, export, download, and print handoff flows SHALL start with a
  summary-first artifact header showing current status, governing identity, and current-versus-
  historical lineage before the full preview, download, or print surface opens
- superseded, historical, masked, or limited artifacts SHALL remain explicitly available where
  policy allows, but SHALL never silently replace the current default handoff target

### Manifest stream recovery and catch-up

The low-noise shell SHALL keep reconnect safety explicit.
Manifest frames, manifest stream events, and persisted `ExperienceCursor` artifacts SHALL obey one
shared `stream_recovery_contract`.

Rules:

- the grouped contract, not the raw `resume_token`, is authoritative for `shell_route_key`,
  `manifest_id`, `shell_stability_token`, `session_ref`, `session_binding_hash`,
  `access_binding_hash`, `masking_posture_hash`, `publication_generation`, `frame_epoch`,
  `last_published_sequence`, and `compaction_floor_sequence_or_null`
- event application SHALL remain strictly monotonic and gap-free within one epoch; clients SHALL not
  reconstruct current order from arrival time, event timestamp, or payload subtype
- duplicate manifest delivery SHALL remain idempotent by
  `(MANIFEST_EXPERIENCE, manifest_id, frame_epoch, experience_sequence)`
- catch-up delivery SHALL complete before live delivery is treated as current, so a newly arrived
  live delta cannot outrank an earlier missing catch-up gap
- `REBASE_REQUIRED` is mandatory on `frame_epoch` advance, shell-stability drift, route-context
  drift, or history compaction; `ACCESS_REBIND_REQUIRED` is mandatory on session-binding drift,
  access-binding drift, masking drift, or schema incompatibility
- if `compaction_floor_sequence_or_null` is non-null and a persisted cursor last acknowledged an
  earlier sequence, the shell SHALL preserve the mounted manifest but fail closed into explicit
  rebase posture rather than synthesizing missed transitions

### Operator interaction layer

Every published `LowNoiseExperienceFrame` SHALL serialize one machine-readable
`interaction_layer` contract in addition to its shell and surface payloads.
That layer freezes the calm shell's refresh, rebase, delta, notification, preview, history, and
motion posture so browser, native, and automation clients cannot reintroduce route-wide spinners,
full remount refresh, or unsafe degraded-state actions through implementation-local behavior.
It SHALL additionally carry `foundation_contract = InteractionLayerFoundationContract` so the
calm-shell density, spacing, detail-drawer support spacing, responsive redock behavior, and motion
token bindings remain explicit instead of hiding in route-local presentation defaults.

Rules:

- `mounted_content_policy` SHALL remain `KEEP_MOUNTED_CONTENT`
- `refresh_presentation` SHALL remain `INLINE_STATUS_ONLY`
- `recovery_presentation` SHALL remain `INLINE_EXPLICIT_REBASE`
- `recovery_notice_surface` SHALL remain `CONTEXT_BAR` for calm-shell frames
- `delta_promotion_mode` SHALL remain `COALESCE_BEFORE_PROMOTION`
- `selector_profile` SHALL remain `OPERATOR_SEMANTIC_SELECTORS_V1`
- `shell_continuity_policy` SHALL remain `SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`
- `activity_partition_policy` SHALL remain
  `VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS`
- `investigation_presentation_policy` SHALL remain
  `SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES`
- `secondary_window_policy` SHALL remain
  `SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS`
- `notification_surface` SHALL remain `CONTEXT_BAR`
- `artifact_preview_surface` SHALL remain `DETAIL_DRAWER`
- `history_presentation` SHALL remain `CURRENT_PRIMARY_HISTORY_SECONDARY`
- `motion_profile` SHALL remain `SUBTLE_CAUSAL_ONLY`
- `unsafe_action_policy` SHALL remain `FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY`
- `feedback_truth_policy` SHALL remain `DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so pending
  settlement, refresh-required, and rebase-required feedback remains sourced from durable
  `ApiCommandReceipt` or typed `ProblemEnvelope` truth instead of shell-local inference
- any calm-shell file, receipt, or declaration surface that distinguishes current versus historical
  targets SHALL additionally publish `artifact_affordance{...}` so header labels and default
  preview/download/print targets stay server-authored instead of UI-local

`OperatorInteractionLayer` is the contract boundary between server-authored calm-shell semantics
and platform-specific rendering. Browser, native, and automation embodiments MAY only vary the
wrapper surfaces already named by the owning read model or native scene wrapper; they SHALL NOT
reintroduce route-wide loaders, detached authoritative recovery flows, or a second current-vs-history
grammar for the same mounted object.

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
- `visibility_budget_units = 12`
- `prominent_motion_limit = 1`
- `issue_dominance_min_margin = 12`
- `action_dominance_min_margin = 15`
- `primary_rank_hysteresis = 8`
- `non_material_rank_swap_limit = 1`
- `non_material_continuity_cost_limit = 6`
- `refresh_coalescing_window_ms = 1500`
- `refresh_burst_visible_change_limit = 2`

For any published default frame `F`, define:

```text
scan_load(F) =
  1.00 * persistent_surface_count(F) +
  1.25 * concurrent_primary_count(F) +
  0.75 * visible_reason_count(F) +
  1.00 * visible_warning_count(F) +
  0.75 * visible_action_count(F) +
  0.50 * visible_detail_entry_count(F) +
  0.25 * ceil(visible_shell_char_count(F) / 80) +
  1.50 * prominent_motion_count(F)
```

The default first-view shell SHALL satisfy `scan_load(F) <= visibility_budget_units`.

The shell SHALL also obey these compression rules:

- non-legal, unavailable, or non-material actions are omitted rather than rendered as disabled clutter
- the default shell exposes no more than one dominant call to action and no more than two subordinate secondary actions
- non-live or analysis-only posture is stated once in `CONTEXT_BAR` unless the user explicitly opens a deeper audit or compare module
- expert entry points are ordered by investigation value rather than alphabetically or by implementation convenience
- the action strip SHALL preserve `ownership_label`, `waiting_on_label`, `machine_reason_codes[]`, bounded `available_action_codes[]`, bounded `blocked_action_codes[]`, `suggested_detail_surface_code`, and any still-valid `active_detail_surface_code` / `focus_anchor_ref` so reconnect never reconstructs action posture heuristically

For any visible issue candidate `i`, let:

- `severity_weight(i) ∈ {0,1,2,3,4}` where `4` is a hard block or contradiction, `3` is review-required material divergence, `2` is a waiting/limited state that caps safe action, `1` is a notice-only issue, and `0` is calm
- `action_constraint_weight(i) ∈ {0,1,2,3}` where `3` means no safe live mutation remains, `2` means review or wait is required before mutation, `1` means advisory constraint, and `0` means unconstrained
- `urgency_weight(i) ∈ {0,1,2,3}` from frozen deadline and queue-age policy
- `authority_grounding_weight(i) ∈ {0,1}` where `1` means legal or authority truth directly grounds the issue
- `focus_locality_weight(i) ∈ {0,1}` where `1` means the issue is attached to the current object anchor or active detail focus
- `context_switch_cost(i) ∈ {0,1}` where `1` means surfacing the issue would displace the current valid locus of work
- `noise_cost(i) ∈ {0,1}` where `1` means the issue would widen the visible shell or introduce duplicate prominence

The ranked issue score SHALL be:

```text
issue_score(i) =
  40 * severity_weight(i) +
  20 * action_constraint_weight(i) +
  10 * urgency_weight(i) +
   8 * authority_grounding_weight(i) +
   6 * focus_locality_weight(i) +
   primary_rank_hysteresis * 1[i = previous_primary_issue] -
   6 * context_switch_cost(i) -
   4 * noise_cost(i)
```

Let `s1 >= s2` be the top two surviving issue scores after deterministic tie-break.
The shell SHALL expose one dominant visible issue only when `s1 - s2 >= issue_dominance_min_margin`.
If that inequality fails, the prior primary SHALL persist when it is still valid; otherwise the ambiguous set SHALL collapse into secondary notices and the least-destructive review posture SHALL win.

For any action candidate `a` that survives legality, policy, freshness, and mode-safety filtering, let:

- `completion_gain(a) ∈ {0,1,2}`
- `risk_reduction(a) ∈ {0,1,2}`
- `deadline_pressure(a) ∈ {0,1}`
- `ownership_clarity(a) ∈ {0,1}`
- `focus_locality(a) ∈ {0,1}`
- `continuity_bonus(a) ∈ {0,1}`
- `reversibility_cost(a) ∈ {0,1,2}`
- `context_switch_cost(a) ∈ {0,1,2}`

The ranked action score SHALL be:

```text
action_score(a) =
  30 * completion_gain(a) +
  25 * risk_reduction(a) +
  15 * deadline_pressure(a) +
  10 * ownership_clarity(a) +
   8 * focus_locality(a) +
   6 * continuity_bonus(a) -
  20 * reversibility_cost(a) -
  12 * context_switch_cost(a)
```

Let `a1 >= a2` be the top two surviving action scores.
A mutation-capable action SHALL occupy the primary slot only when `a1 >= 60` and `a1 - a2 >= action_dominance_min_margin`.
Otherwise the shell SHALL promote the least-destructive inspect, review, or refresh action when one exists, or SHALL emit explicit `NO_SAFE_ACTION`.

For any non-material refresh `R : F_t -> F_(t+1)`, define:

```text
continuity_cost(R) =
  5 * 1[dominant_question changes] +
  4 * 1[primary_action_code changes] +
  3 * 1[focus_anchor_ref is lost] +
  2 * rank_swap_count(R) +
  2 * prominent_motion_count(R)
```

Non-material refreshes SHALL satisfy all of:

- `rank_swap_count(R) <= non_material_rank_swap_limit`
- `prominent_motion_count(R) <= prominent_motion_limit`
- `continuity_cost(R) <= non_material_continuity_cost_limit`

Updates that would violate those bounds SHALL be coalesced for up to `refresh_coalescing_window_ms` or demoted to counts, freshness indicators, or drawer-local changes until a material state transition exists.
Within any rolling `refresh_coalescing_window_ms` window, at most `refresh_burst_visible_change_limit` non-material visible changes may be promoted.

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

For any shell projection `v` of canonical semantic set `C`, define `decisive_atoms(C)` as the frozen tuple of:

- `dominant_question`
- `attention_state`
- `primary_issue_ref` when one exists
- the visible prefix of `machine_reason_codes[]` up to `primary_reason_limit`
- `limitation_state`
- `actionability_state`
- exactly one of `primary_action_code` or `no_safe_action_reason_code`

Let `visible_atoms(v)` be the machine-stable atoms either rendered directly in the shell or exposed through a route-stable disclosure target referenced by the mounted shell.
`TRIM_LOW_NOISE_COPY(...)` SHALL minimize `scan_load(v)` subject to:

```text
semantic_coverage(v) = |decisive_atoms(C) ∩ visible_atoms(v)| / |decisive_atoms(C)| = 1
```

This is a lossless semantic-compression constraint.
Visible brevity is allowed; omission of decisive meaning is not.

### Budget audit artifacts
Every published `LowNoiseExperienceFrame` SHALL serialize one `low_noise_budget_audit` object that
freezes rendered surface order, surface-count accounting, visible reason or warning or action
counts, detail-entry count, aggregate visible shell copy count, computed `scan_load`, duplicate
posture detection, and typed non-material refresh or reconnect coalescing posture.

Every release or regression suite that claims calm-shell compression closure SHALL also serialize
one `low_noise_budget_audit_pack`.
That pack SHALL cover at minimum first view, high reason pressure, `NO_SAFE_ACTION`,
non-material refresh, reconnect or catch-up, and typed detail fallback.

The default shell SHALL also obey these restraint rules:

- only the four composite shell surfaces may be emitted as peer top-level surfaces when `experience_profile = LOW_NOISE`
- the shell reading order SHALL remain `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` unless the user explicitly enters compare or audit mode
- status language SHALL be literal and machine-stable; the shell SHALL prefer `WAITING_ON_AUTHORITY`-style clarity over decorative prose
- analysis-only posture, masking posture, and limitation posture SHALL each appear once in the default shell unless deeper investigation is explicitly opened
- published calm-shell frames SHALL therefore keep `duplicate_posture_codes[] = []` on
  `low_noise_budget_audit`; repeated limitation or blocking posture is a contract failure, not a
  copy-editing preference

### Determinism and compression invariants
The calm-shell guarantee is also a stability guarantee.
Given the same command-side truth, the same low-noise frame inputs SHALL produce the same:

- primary issue selection
- reason ordering
- action ordering
- detail-entry ordering
- active drawer fallback target

`attention_policy` ranking SHALL first sort by `issue_score desc` and SHALL use tie-break only when scores are exactly equal.
When two candidate primaries have the same frozen score, the renderer SHALL prefer, in order:

1. authority-grounded or legal-truth-affecting posture over derived or advisory posture
2. the posture that most constrains safe actionability
3. the currently focused object, if it still exists and remains relevant
4. the lexicographically stable object or issue reference order frozen by the read side

Action ranking SHALL first sort by `action_score desc` and SHALL use tie-break only when scores are exactly equal.
When two action candidates tie, the renderer SHALL prefer, in order:

1. lower `reversibility_cost`
2. lower `context_switch_cost`
3. higher `focus_locality`
4. the lexicographically stable action-code order frozen by the read side

The published shell convenience fields and `attention_policy` SHALL also remain exact mirrors for:

- `attention_state`
- `primary_object_ref`
- `actionability_state`
- `primary_action_code`
- `no_safe_action_reason_code`
- `secondary_notice_count`
- `detail_entry_points[]`
- `suggested_detail_surface_code`
- frame-level `connection_state` <-> `CONTEXT_BAR.connection_state`
- frame-level `truth_origin` <-> `CONTEXT_BAR.truth_origin`
- `attention_policy.attention_state` <-> `DECISION_SUMMARY.attention_state`
- frame-level `active_detail_surface_code` / `focus_anchor_ref` <-> `ACTION_STRIP` and `DETAIL_DRAWER`

Read-side producers SHALL update those pairs atomically so reconnect-safe renderers never reconcile
two competing action or posture stories from the same `ExperienceDelta`.

Copy compression SHALL also be lossless at the semantic level.
Whenever visible shell text is trimmed to fit the low-noise copy budget, the full canonical wording
SHALL remain accessible through the active detail module, an explicit expansion affordance, or an
equivalent route-stable accessible disclosure path.
Trimming SHALL NOT silently remove:

- legal qualifiers
- authority state distinctions
- blocking reasons
- machine-stable codes needed for exact explanation
- the difference between hidden, unavailable, and not-applicable content

---

## Surface reduction map
The rich observatory read models remain valid, but are remapped for default presentation:

- `SCOPE_COMPOSER` -> explicit pre-manifest composition route only; once a manifest exists, its
  frozen scope result SHALL remain embodied through `CONTEXT_BAR.scope_label`,
  `object_anchor_ref`, and the mounted action posture rather than reopening as a fifth peer surface
- `PULSE_SPINE` + `MANIFEST_RIBBON` + `HANDOFF_BATON` -> `CONTEXT_BAR`
- `DECISION_STAGE` + `DECISION_CONSTELLATION` + `GATE_LATTICE` + `TRUST_PRISM` -> `DECISION_SUMMARY`
- `CONSEQUENCE_RAIL` + `WORKFLOW_CHOREOGRAPHER` + workflow implications -> `ACTION_STRIP`
- `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` -> `DETAIL_DRAWER` modules

This preserves algorithmic fidelity while eliminating the need to show multiple large semantic surfaces concurrently.

### Evidence/comparison module embodiment rules

The low-noise drawer SHALL treat the six expert modules as semantic tools rather than ornamental
visualization surfaces.

- `Evidence Prism` SHALL keep one plain-language `why this matters` companion summary ahead of any
  concentric evidence layering or path tracing.
- `Twin Lens` SHALL keep one plain-language comparison interpretation ahead of delta arcs or paired
  timelines.
- `Drift Ripple Field` SHALL keep one plain-language baseline-versus-current explanation ahead of
  ripple-field rendering.
- `Packet Forge` SHALL keep one plain-language packet-binding and approval explanation ahead of seal
  or forge-sequence rendering.
- `Authority Handshake Tunnel` SHALL keep one plain-language handshake and reconciliation summary
  ahead of tunnel-state rendering.
- `Audit Echo Panel` SHALL keep one plain-language event-neighborhood explanation ahead of append-only
  tape or audit-neighborhood rendering.

Mode posture is also frozen:

- compare mode SHALL be explicit and limited to `Twin Lens` or `Drift Ripple Field`
- audit mode SHALL be explicit and limited to `Audit Echo Panel`
- `Evidence Prism`, `Packet Forge`, and `Authority Handshake Tunnel` MAY expand in the same drawer
  without forcing compare or audit mode

`TWIN_PANEL` SHALL materialize from the typed twin-view artifacts (`TwinView`,
`TwinStateSnapshot`, `TwinTimeline`, `TwinDeltaArc`, `TwinMismatchSummary`,
`TwinReadinessState`, `TwinReconciliationState`, and `TwinInterpretationState`) rather than from
client-local comparison reconstruction.

### Twin-panel low-noise rules

The default twin panel SHALL optimize for operator actionability rather than exhaustive side-by-side
listing.

It SHALL therefore:

- derive its headline from `TwinReadinessState.twin_readiness_class`, `safe_action_state`, and
  `authority_posture`
- order visible mismatches from `TwinMismatchSummary.top_mismatch_refs[]` and
  `TwinInterpretationState.default_sort_mode` rather than from renderer-local heuristics
- default `default_noise_filter = ACTIONABLE_ONLY` for the production profile unless the operator
  explicitly expands scope
- collapse `MATCH_EXACT`, `MATCH_EQUIVALENT`, and suppressed informational deltas into counts while
  any review-or-higher mismatch remains visible
- keep stale, limited, missing-baseline, out-of-band, and waiting-on-authority semantics visually
  distinct; they SHALL NOT be merged under one generic difference label
- render each visible mismatch as a bounded tuple of subject, delta class, why-it-matters copy, and
  next-action copy
- preserve pinned object, active delta, sort mode, and noise filter across reconnect and catch-up
- use `TwinReconciliationState` to explain whether the system is waiting, reconciling, escalated, or
  resolved rather than inferring that posture from button availability

This keeps the twin low-noise while preserving exact machine meaning.

---

## Edge-case handling contract

### Masking, permission limits, retention limits
The user must see that the view is limited.
Hidden information SHALL never masquerade as absence.
The summary SHALL say whether the limit comes from masking, retention, permission, or partial
evidence loss, and whether the limitation changes actionability or only detail visibility. Where
projection-limited confidence is lower than retained decision confidence, the shell SHALL present the
lower visible confidence and keep the higher internal confidence out of plain-language certainty
claims.

### Projection lag or long-running workers
Keep the last stable posture mounted.
Show freshness and checkpoint state inline.
Never blank the main shell or replace the primary summary with a global loader.
If freshness or truth recency is insufficient to prove that a mutation-capable action is still safe,
the shell SHALL fail closed for that action.
It SHALL NOT continue to present filing, approval, override, or authority-affecting actions as the
dominant next step based only on stale read-side state.
Instead it SHALL render explicit `NO_SAFE_ACTION` with a stale-truth or revalidation reason unless a
strictly safer refresh/reconnect action is already defined and legal.

### Reconnect, stale connection, catch-up delivery
Preserve object positions and scroll or focus anchors where possible.
Mark the shell stale or catching up without re-staging the original event theatrically.
The read-side contract SHALL also preserve the active detail module, `focus_anchor_ref`, and
explicit actionability posture so reconnect never has to guess whether the prior screen meant
`NO_SAFE_ACTION` or simply lacked a hydrated primary action.
If the preserved detail module or `focus_anchor_ref` is no longer valid after catch-up, the shell
SHALL degrade deterministically rather than jumping to an unrelated module.
Fallback order SHALL be:

1. the same active module with a null or remapped `focus_anchor_ref` if the module still exists
2. the first still-valid entry in ordered `detail_entry_points[]`
3. `suggested_detail_surface_code` if it remains valid
4. a collapsed `DETAIL_DRAWER` root with explicit reason copy

This fallback SHALL preserve reading order and SHALL NOT silently switch the user into compare, audit,
or a higher-noise surface mode.

### Multiple simultaneous problems
Show the highest-impact issue as the primary summary.
Collapse the rest into an additional-issues count with direct detail entry points.
When additional issues are collapsed, the shell SHALL preserve the highest remaining severity or
limitation class in visible summary copy so a count-only affordance does not hide the fact that a
non-primary issue still constrains review, retention, or actionability.

### Human review, approval, or step-up required
The action strip must switch from automation language to explicit ownership language.
The user should know who must act, what is blocked, and what remains safe to inspect.
Pre-manifest step-up or approval exits SHALL reuse the same summary/action grammar as the mounted
low-noise shell so the user does not have to learn a different interaction model at launch time.
`ownership_posture` alone is insufficient for this; the published strip SHALL carry explicit ownership and waiting labels, not require the renderer to infer them from enum names.

### Authority pending, unknown, rejected, or out-of-band
The shell must distinguish waiting, ambiguous, rejected, and externally discovered states.
No success styling or completion language may appear until authority-confirmed truth exists.

### No safe next action
The system SHALL state `NO_SAFE_ACTION` plainly, identify the blocking cause, and open the relevant detail module rather than presenting disabled button clutter.
For staff collaboration workspaces, the promoted detail module chosen for `NO_SAFE_ACTION`,
recovery, or stale-review posture SHALL remain one deterministic module rather than splitting the
user between summary prose, an audit rail, and a second competing support region.

### Empty or not-yet-materialized detail
Empty states must teach the model of the system.
The shell SHALL explicitly classify and message at least these states:

- `NOT_REQUESTED`
- `NOT_YET_MATERIALIZED`
- `LIMITED`
- `NOT_APPLICABLE`

For example, evidence detail should explain whether evidence is not collected yet, intentionally
hidden, limited by retention or erasure with a lawful tombstone, or simply not relevant for the
current path. Hidden or erased support SHALL never be used to imply non-occurrence.

### Analysis-only and non-live posture
Mode distinction is important, but repeated banner noise is not.
The default shell SHALL express non-live or analysis-only posture once in `CONTEXT_BAR` and then preserve that truth semantically in detail modules without duplicating the same warning across every persistent surface.
The low-noise action set SHALL also be mode-safe.
When the mounted posture is analysis-only, replay-only, masked-beyond-actionability, or otherwise
non-live for compliance mutation, `ACTION_STRIP` SHALL omit filing-capable, approval-capable,
override-capable, or authority-mutating actions from the default shell.
Mode-safe alternatives MAY include inspect, compare, export under policy, request review, or other
non-mutating investigation actions, but the shell SHALL never imply that a modeled or replay posture
is directly executable against live authority state.

### Responsive, embedded, and narrow-screen continuity
`LOW_NOISE` is one shell, not separate desktop, tablet, embedded, and mobile products.
Responsive adaptation MAY redock `DETAIL_DRAWER` as a bottom sheet, inline disclosure, or secondary
pane and MAY wrap `ACTION_STRIP` beneath `DECISION_SUMMARY`, but it SHALL preserve the same four
peer surfaces, the same dominant question, and the same dominant action.
Resize, split-view changes, virtual-keyboard raise, and embedded-container collapse SHALL NOT
trigger a route-family fork, wizard takeover, full-screen loader, or alternate mobile-summary
surface that changes the user's mental model mid-task.
When a drawer entry point or action opens temporary disclosure on narrow screens, collapsing that
disclosure SHALL restore focus to the invoking control unless the focused object no longer exists.

---

## Algorithm translation requirements
The read side SHALL derive a machine-readable `attention_policy{...}` object for every published frame.
That policy SHALL identify:

- the primary issue or posture object
- the primary action or explicit lack of safe action
- the set of collapsed secondary notices
- the ordered default detail-module entry points
- the ranked basis used to choose the dominant visible posture

The read side SHALL also freeze `dominant_question` and `settlement_state` for every published frame
so first-view purpose, trust-visible recovery, and native/browser parity do not depend on
renderer-local heuristics.

The read side SHALL also derive a frozen `cognitive_budget{...}` object for every published frame.
That object SHALL encode the production defaults for persistent surface count, primary count, visible reason count, visible warning count, secondary-action count, detail-entry-point count, expanded-detail count, visibility budget, dominance margins, hysteresis, rank-swap budget, continuity-cost limit, and refresh coalescing window.

The shell SHALL enforce these rules:

- one primary issue at a time, selected by the frozen `issue_score(...)` formula and accompanied by `primary_rank_score`, `runner_up_rank_score`, and `dominance_margin`
- one primary action at a time, or explicit `NO_SAFE_ACTION` with a machine-stable reason and deterministic investigation module; any visible primary action SHALL satisfy the frozen `action_score(...)` dominance test
- visible secondary actions in the default calm shell SHALL remain non-mutating so the shell never
  presents a second mutation-capable action story beside the dominant safe next move
- the published `dominance_contract` SHALL pin `DECISION_SUMMARY` as the dominant-question surface, `ACTION_STRIP` as the dominant-action surface, `DETAIL_DRAWER` as the only subordinate support surface, and compare/audit escalation as explicit rather than default
- one expanded detail module at a time unless compare or audit mode is explicit
- default summary bounded to three reasons before expansion
- default warnings bounded to one primary warning plus an additional-count affordance
- default secondary actions bounded to two
- default detail entry points bounded to five
- summary, context, and action copy trimmed to the frozen low-noise copy budget before schema serialization
- non-legal or non-material actions omitted rather than shown disabled
- empty and limited detail states normalized to `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, or `NOT_APPLICABLE`
- only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` emitted as peer top-level surfaces in the `LOW_NOISE` profile
- `MANIFEST_RIBBON`, `DECISION_CONSTELLATION`, `GATE_LATTICE`, `TRUST_PRISM`, and
  `WORKFLOW_CHOREOGRAPHER` SHALL remain explicit machine-readable source modules for those four
  surfaces; they may materialize as focus views or explicit investigation routes, but SHALL NOT
  appear as additional first-view peer regions in the calm shell
- ranking ties resolved deterministically using the frozen tie-break order above
- stale or insufficiently fresh truth SHALL downgrade unsafe mutation actions rather than leaving the prior dominant mutation visible
- before publishing any non-material refresh, the read side SHALL compute `scan_load(F)` and `continuity_cost(R)`; if either budget would be violated, the read side SHALL coalesce or collapse lower-ranked deltas instead of widening the visible shell
- before publication, the read side SHALL compute and serialize `low_noise_budget_audit{...}` from
  the actual shell payload rather than from upstream observatory prose or renderer heuristics
- release and regression evidence for calm shells SHALL serialize `low_noise_budget_audit_pack`
  cases proving first-view, refresh, reconnect, and fallback compliance with the same frozen
  low-noise budget
- responsive or embedded renderers MAY redock surfaces, but SHALL preserve one shell identity, one
  dominant question, and the same peer surface set across breakpoints
- every published frame SHALL carry exactly one `dominant_question` that remains stable across
  non-material refresh
- `settlement_state` SHALL update inline without displacing the mounted shell after first meaningful
  paint
- visible copy trimming SHALL preserve a route-stable full-text disclosure path for assistive tech and expert investigation
- drawer fallback after object loss, masking, or module invalidation SHALL follow the deterministic fallback order above
- `DETAIL_DRAWER` SHALL remain the only promoted support region in the default profile unless
  compare or audit mode is explicitly entered
- `ACTION_STRIP` tokens SHALL carry target object or target module context plus live-freshness requirements for mutation-capable actions so a visible action is never just a label with implicit routing
- any visible mutation-capable primary action SHALL target the mounted `object_anchor_ref`
- when the primary action is mutation-capable, visible secondary actions SHALL remain non-mutating so
  the shell never presents parallel primary mutations
- compare and audit escalation are explicit support-region modes and SHALL be mutually exclusive for
  the same mounted shell state

The algorithm SHALL continue to generate rich semantic read models, but the default renderer SHALL treat them as internal source surfaces for a calmer composite shell.
They may populate detail modules or explicit compare/audit views, but they SHALL NOT reappear as additional peer top-level regions in the default shell.

---

## Minimum semantic selectors
Recommended `data-testid` values:

- `low-noise-shell`
- `shell-family`
- `object-anchor`
- `dominant-question`
- `settlement-posture`
- `recovery-posture`
- `context-bar`
- `decision-summary`
- `action-strip`
- `primary-action`
- `no-safe-action`
- `detail-drawer`
- `detail-entry-{module_code}`

---

## Validation additions
`LowNoiseExperienceFrame` SHALL additionally participate in
`semantic_accessibility_regression_pack` cases that bind the calm-shell selector inventory,
keyboard order, screen-reader path, live-update announcement posture, and reduced-motion recovery
parity to Playwright evidence instead of renderer-local heuristics.

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
16. identical ranked-input ties produce the same primary issue, reason ordering, and detail-entry ordering across reconnect and catch-up delivery
17. when shell freshness is insufficient for mutation safety, filing/approval/override actions are removed or downgraded to explicit `NO_SAFE_ACTION` rather than left visually live
18. analysis-only, replay-only, and other non-live postures never surface live authority-mutation actions in `ACTION_STRIP`
19. trimmed summary, reason, and blocking copy retains a route-stable full-text disclosure path and does not drop legal qualifiers or authority-state distinctions
20. if the active detail module or `focus_anchor_ref` becomes invalid after refresh, the drawer falls back in deterministic priority order and never jumps to an unrelated high-noise mode
21. governed artifact preview, export, and print paths preserve current vs historical labels, limitation notices, and settlement posture rather than silently upgrading or flattening them
22. any authority-owned or provider-owned external handoff returns to the same manifest or work-item shell context and never renders detached success before authoritative settlement exists
23. collapsing the same manifest from wide to narrow layout preserves the same four-surface order,
    dominant action, active detail module, and `focus_anchor_ref` while reducing support regions to
    one promoted drawer or sheet
24. the serialized shell preserves `MANIFEST_RIBBON`, `DECISION_CONSTELLATION`, `GATE_LATTICE`,
    `TRUST_PRISM`, and `WORKFLOW_CHOREOGRAPHER` as machine-readable source-module bindings for the
    mounted composite surfaces while keeping `SCOPE_COMPOSER` off the post-manifest first view
24. packet, evidence, authority, export, and print flows open on a current-artifact summary header
    and keep historical or superseded artifacts visually secondary rather than making history the
    default handoff target
25. receipt-pending, pending-propagation, and revalidation-required states keep the mounted summary
    and action context visible instead of replacing the shell with a global loading or completion
    screen
26. every published frame exposes one `dominant_question` and it remains stable across inline
    freshening that does not materially change truth or actionability
27. `settlement_state` transitions update inline without changing shell identity, surface order, or
    the active detail focus when the referenced object still exists
28. resizing between desktop, tablet, narrow, split-view, or embedded widths preserves the same four
    shell surfaces and the same dominant action without route substitution or extra peer regions
29. collapsing or redocking detail on narrow screens returns focus to the invoking entry point and
    never replaces the mounted shell with a full-screen loader, modal chain, or wizard takeover
30. any non-`NONE` `recovery_posture` fails closed for live mutation while keeping the same mounted
    manifest summary, dominant question, and object anchor visible
## FE-25 Cache Isolation

The low-noise manifest frame now binds `cache_isolation_contract` so calm-shell hydration, local persistence, and any shared reuse stay pinned to exact route, object, shell, projection-version, and shell-stability context. Narrower masking or route drift must invalidate the broader frame rather than silently rehydrate it.
