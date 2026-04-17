# Twin View Contract

This contract defines the deterministic artifact surface for the Twin Lens comparison layer.

The Twin Lens exists to compare internal computed posture with authority-facing posture without
forcing callers to reconstruct paired timelines, delta bridges, readiness semantics, or reconciliation
meaning from prose.

## Design principles

The compliance twin SHALL preserve five hard properties.

1. **Mirrored-state assembly**: the internal lane and the authority lane SHALL each be built as a
   first-class state snapshot before any cross-lane comparison occurs.
2. **Authority-aware truth precedence**: the authority lane may cap or contradict internal posture for
   legal-state interpretation, but the twin SHALL never fabricate authority truth from internal
   assumptions.
3. **One subject, one terminal delta**: each normalized comparison subject SHALL produce exactly one
   terminal delta classification so operators never see duplicate or competing explanations for the
   same difference.
4. **Explicit non-comparability**: missing baseline, stale truth, partial acknowledgement, limited
   visibility, out-of-band state, and replay-only posture SHALL be modeled as typed comparison states
   rather than being collapsed into generic difference or silent absence.
5. **Low-noise actionability**: the default twin view SHALL rank and summarize only the mismatches
   that change operator action, waiting posture, or legal interpretation; exact matches remain.
   The ranking model is a delta precedence rule, and the summary surface SHALL explain the top
   ranked mismatches before lower-priority deltas.
   available for audit but SHALL collapse by default.

## Root artifact

`TwinView` is the manifest-scoped root artifact.

It SHALL validate against `schemas/twin_view.schema.json` and SHALL freeze:

- lifecycle state
- `comparison_key_profile_code = TWIN_KEY_V1_SHA256`
- `delta_precedence_profile_code = TWIN_DELTA_PRECEDENCE_V1`
- `mismatch_ranking_profile_code = TWIN_MISMATCH_SORT_V1`
- comparison-basis linkage when a basis exists
- internal-state snapshot linkage
- authority-state snapshot linkage
- paired timeline linkage
- cross-source delta-arc linkage
- mismatch-summary linkage
- readiness linkage
- reconciliation-state linkage
- interpretation-state linkage
- parity linkage

A built twin SHALL therefore be a comparison bundle, not a renderer-local reconstruction.
For any built, stale, or superseded twin, `internal_state_ref` and `authority_state_ref` SHALL be
distinct, subordinate root refs SHALL remain distinct object identities, and `built_at`,
`stale_at`, and `superseded_at` SHALL preserve monotonic lifecycle order.

When a twin is opened in a native detached compare window, that window SHALL remain a
support-only embodiment of the parent manifest or work-item shell rather than a second authoritative
workspace. The native scene SHALL serialize as `NativeOperatorSecondaryWindowScene` with
`secondary_window_kind = TWIN_COMPARE`, SHALL preserve the parent object identity header, SHALL
open on a summary-first current mismatch card before any historical lane or raw delta detail, and
SHALL return focus to the parent launch anchor when the window closes unless restoration has been
explicitly invalidated. Its shared `interaction_layer` SHALL therefore remain
`SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS` and `SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES`, not a
detached authoritative compare shell.

## Mirrored state snapshots

`TwinStateSnapshot` SHALL validate against `schemas/twin_state_snapshot.schema.json`.

Exactly two state snapshots SHALL exist for a built manifest-scoped twin:

- one `INTERNAL_COMPUTED` snapshot with `snapshot_role = WORKING_STATE`
- one `AUTHORITY` snapshot with `snapshot_role = AUTHORITY_OBSERVED`

Each snapshot SHALL freeze at minimum:

- the lane identity and assembly state
- `comparison_key_profile_code = TWIN_KEY_V1_SHA256`
- the comparison basis and selected baseline reference
- the component refs used to assemble the lane
- subject-count and comparable-subject-count summaries
- subject-key collision refs
- freshness and confidence posture
- limitation codes
- authority-truth posture
- baseline posture
- amendment position
- replay or analysis authoritativeness
- `as_of`, `stale_after`, and `generated_at`

### Snapshot assembly rules

The `INTERNAL_COMPUTED` snapshot MAY be assembled from engine-owned artifacts such as compute,
parity, trust, filing-case, submission-record, drift, amendment, decision-bundle, and late-data
artifacts.

The `AUTHORITY` snapshot SHALL be assembled only from authority-originated or
reconciliation-proven artifacts such as authority responses, obligation mirrors, authority
calculation results, submission confirmations, out-of-band discoveries, or authority-correction
records. Internal inference MAY annotate the authority lane, but SHALL NOT create legal authority
truth by itself.

Contradictory components inside one lane SHALL NOT be silently merged. The snapshot SHALL instead set
`assembly_state = CONTRADICTORY`, persist `contradictory_component_refs[]`, and force the twin to
surface an explicit limitation or reconciliation posture.
`comparable_subject_count` SHALL never exceed `subject_count`, and
`contradictory_component_refs[]` SHALL always remain a subset of `component_refs[]` so contradiction
posture stays anchored to the serialized lane inputs rather than inferred client-side. Any snapshot
whose `assembly_state` is not `UNAVAILABLE` SHALL retain a non-null `comparison_basis_ref` and
non-empty `component_refs[]` so the twin never compares renderer-local placeholders.

`UNAVAILABLE`, `NOT_REQUESTED`, and `NOT_APPLICABLE` are distinct states:

- `UNAVAILABLE` means the lane was expected but could not be assembled
- `NOT_REQUESTED` means the current scope did not require authority retrieval
- `NOT_APPLICABLE` means the current scope has no legal authority comparison meaning

For any built, stale, or superseded `TwinView`, `cross_source_delta_refs[]` SHALL remain non-empty.
Even exact or equivalent subjects SHALL persist terminal delta arcs so the twin root remains a
first-class comparison artifact rather than a summary with missing subject topology.

## Subject normalization and comparison-key contract

The twin SHALL compare normalized subjects rather than raw heterogeneous artifacts.

For every candidate comparison subject, the engine SHALL construct a canonical tuple:

- `subject_class`
- `subject_identity_code`
- `reporting_scope`
- `authority_scope`
- `business_partition_ref or <NONE>`
- `period_ref or <NONE>`
- `basis_type or <NONE>`
- `lineage_anchor_ref or <NONE>`
- `value_normal_form`
- `status_normal_form`
- `observed_at`
- `freshness_state`
- `confidence_state`

The canonical comparison key SHALL be derived only from the frozen identity-and-scope tuple. Value
normal forms, status normal forms, freshness state, confidence state, and observed timestamps affect
comparison and classification, but they SHALL NOT change the subject key itself.

The canonical comparison key SHALL be:

```text
comparison_key_profile_code = TWIN_KEY_V1_SHA256

comparison_key = "twin:" + SHA256(JSON_CANONICAL_ARRAY(
  comparison_key_profile_code,
  subject_class,
  reporting_scope_ref_or_<NONE>,
  authority_scope_ref_or_<NONE>,
  business_partition_ref_or_<NONE>,
  period_ref_or_<NONE>,
  basis_type_or_<NONE>,
  subject_identity_code,
  lineage_anchor_ref_or_<NONE>
))
```

The engine SHALL take the ordered union of internal and authority keys. Each key SHALL be compared at
most once in a twin build. If multiple lane components normalize to the same key but remain
semantically incompatible, the lane snapshot SHALL populate `subject_key_collision_refs[]` and set
`assembly_state = CONTRADICTORY` rather than silently picking one winner.

### Normal-form rules

Numeric totals SHALL use exact decimal values and the frozen parity threshold profile already bound to
the run. Enumerated authority statuses SHALL first map through the frozen status-normalization table
for the bound authority profile. Filing and acknowledgement subjects SHALL compare semantic packet or
submission identity, declared basis, and legal status; they SHALL NOT compare raw transport
metadata-only fields as if those fields were legal truth.

Equivalent-but-not-byte-identical values MAY classify as `MATCH_EQUIVALENT` only when the frozen
normalization profile declares them equivalent. Otherwise the subject SHALL remain a mismatch.

## Delta-arc contract

`TwinDeltaArc` SHALL validate against `schemas/twin_delta_arc.schema.json`.

Every normalized comparison key SHALL yield exactly one terminal `TwinDeltaArc` with:

- `comparison_key`
- `comparison_key_profile_code = TWIN_KEY_V1_SHA256`
- the persisted canonical key components (`subject_identity_code`, reporting scope, authority scope,
  partition, period, basis type, lineage anchor)
- the compared subject and subject class
- one terminal `delta_class`
- one explicit `comparability_state`
- one explicit `comparability_reason_code`
- one explicit `delta_precedence_rank`
- `materiality_class`
- `resolution_class`
- `priority_rank`
- baseline posture
- confidence and freshness posture
- explanation linkage
- parity linkage when a parity item explains the delta
- equivalence-reason codes when semantic equivalence, rather than exact equality, wins
- left and right subject refs
- contradiction component refs when contradiction, rather than absence, explains the delta
- blocking and limitation rationale
- left and right observation timestamps

### Delta-class precedence

Classification SHALL be deterministic and SHALL follow this precedence order so the same subject
cannot be emitted twice under different names:

1. baseline or comparison context cannot be proved -> `BASELINE_MISSING`
2. twin or lane is stale beyond the safe comparison horizon -> `STALE_COMPARISON`
3. visibility, retention, or masking prevents defensible comparison -> `LIMITED_VISIBILITY`
4. current run is replay or analysis-only for that subject -> `REPLAY_NON_AUTHORITATIVE`
5. subject exists only on one side -> `INTERNAL_ONLY` or `AUTHORITY_ONLY`
6. acknowledgement-specific outcomes -> `ACK_PENDING`, `ACK_PARTIAL`, `ACK_CONTRADICTORY`,
   `REJECTED_OR_REVERSED`
7. external authority state is materially outside the tracked chain -> `OUT_OF_BAND`
8. timeline-only displacement without semantic contradiction -> `TIMELINE_LAG` or `TIMELINE_GAP`
9. semantic contradiction -> `STATUS_MISMATCH`, `BASIS_MISMATCH`, `TOTAL_MISMATCH`, or
   `VALUE_MISMATCH`
10. semantic equivalence -> `MATCH_EQUIVALENT`
11. exact equivalence -> `MATCH_EXACT`

`INTERNAL_ONLY` SHALL retain only `left_subject_refs[]`; `AUTHORITY_ONLY` SHALL retain only
`right_subject_refs[]`. Every other terminal delta SHALL retain both lane subject sets so replay,
ranking, and forensic review can reopen the exact comparison pair. Any
`contradiction_component_refs[]` SHALL resolve back to persisted lane subject refs.

`comparability_state` and `comparability_reason_code` SHALL also freeze whether the subject is
ordinarily comparable, waiting on authority, partially comparable, non-comparable, out-of-band, or
contradictory so low-noise summaries do not have to infer that meaning from `delta_class` alone.

### Delta taxonomy and default resolution posture

The minimum production delta taxonomy SHALL be:

- `MATCH_EXACT` -> no action, no materiality
- `MATCH_EQUIVALENT` -> no action, no materiality
- `VALUE_MISMATCH` -> open review; escalate if the fact is filing-critical
- `TOTAL_MISMATCH` -> parity-linked review or amendment preparation depending baseline and scope
- `STATUS_MISMATCH` -> reconciliation-required because legal interpretation differs
- `BASIS_MISMATCH` -> review or reconciliation depending whether authority semantics are involved
- `TIMELINE_LAG` -> wait or refresh when the semantic state is expected to catch up
- `TIMELINE_GAP` -> review because the expected paired event was never observed
- `INTERNAL_ONLY` -> review or amendment depending baseline timing
- `AUTHORITY_ONLY` -> reconciliation-required because the authority knows something the lineage does
  not
- `ACK_PENDING` -> waiting-on-authority state until the profile deadline is reached
- `ACK_PARTIAL` -> reconciliation-required because the authority acknowledged only part of the
  expected state
- `ACK_CONTRADICTORY` -> reconciliation-required and usually blocking
- `REJECTED_OR_REVERSED` -> blocking or reconciliation-required depending the legal path
- `OUT_OF_BAND` -> reconciliation-required and never auto-absorbed into the current packet chain
- `BASELINE_MISSING` -> blocking for decision-useful comparison
- `STALE_COMPARISON` -> refresh-required before mutation-capable action
- `LIMITED_VISIBILITY` -> review because the twin cannot prove equivalence safely
- `REPLAY_NON_AUTHORITATIVE` -> never treated as live authority mismatch

## Timeline semantics and alignment formulas

`TwinTimeline` SHALL validate against `schemas/twin_timeline.schema.json`.

The timeline SHALL compare aligned anchors, not merely raw event order. Each lane SHALL therefore
freeze its comparable anchor events and the twin SHALL compute one alignment score for the paired
window.

Let `A` be the union of comparable timeline anchors across both lanes for the chosen window. Let
`w_a` be the frozen anchor weight for anchor `a`, derived from the authority-operation profile and
anchor family. If no profile defines a family-specific weight, `w_a = 1`.

For each anchor `a`:

- `present_both_a = 1` when both lanes carry the same normalized anchor key
- `contradictory_a = 1` when both lanes carry the anchor but the semantic state differs
- `lagged_a = 1` when both lanes carry the anchor, the semantic state is still compatible, but
  `|t_internal - t_authority|` exceeds the frozen allowed lag for that anchor family
- `unpaired_a = 1` when only one lane contains the anchor

Define:

```text
W = Σ(w_a)
overlap = Σ(w_a * present_both_a)
contradiction = Σ(w_a * contradictory_a)
lag = Σ(w_a * lagged_a)

alignment_score = 1                                 if W = 0
alignment_score = max(0, (overlap - 0.5*lag - contradiction) / W)  otherwise
```

Then:

- `LOCKED` means `alignment_score >= 0.90` and `contradiction = 0`
- `DRIFTING` means `0.60 <= alignment_score < 0.90` and contradictions do not dominate the window
- `DIVERGED` means `alignment_score < 0.60` or any blocking contradiction is present

A timeline SHALL also freeze:

- window bounds
- aligned, contradictory, and unpaired anchor counts
- per-lane coverage state
- explicit alignment reason codes

## Mismatch severity and prioritization

A production twin SHALL rank mismatches deterministically.

Define the base weights:

- `materiality_weight(NONE)=0`
- `materiality_weight(INFORMATIONAL)=1`
- `materiality_weight(REVIEW)=2`
- `materiality_weight(MATERIAL)=3`
- `materiality_weight(BLOCKING)=4`

- `resolution_weight(NONE)=0`
- `resolution_weight(REFRESH_TWIN)=1`
- `resolution_weight(WAIT_FOR_AUTHORITY)=1`
- `resolution_weight(OPEN_REVIEW)=2`
- `resolution_weight(RUN_RECONCILIATION)=3`
- `resolution_weight(PREPARE_AMENDMENT)=4`

- `subject_weight(FACT)=1`
- `subject_weight(TOTAL)=2`
- `subject_weight(STATUS)=2`
- `subject_weight(OBLIGATION)=2`
- `subject_weight(FILING)=3`
- `subject_weight(ACKNOWLEDGEMENT)=3`
- `subject_weight(DECLARED_BASIS)=3`

- `authority_escalation = 1` for `STATUS_MISMATCH`, `ACK_PARTIAL`, `ACK_CONTRADICTORY`,
  `REJECTED_OR_REVERSED`, `OUT_OF_BAND`, or `AUTHORITY_ONLY`; else `0`
- `freshness_escalation = 1` when `freshness_state in {STALE, LIMITED}`; else `0`
- `confidence_escalation = 1` when `confidence_state in {LOW, LIMITED}`; else `0`

The rank formula SHALL be:

```text
priority_rank =
  100 * materiality_weight(materiality_class) +
   15 * resolution_weight(resolution_class) +
   10 * subject_weight(subject_class) +
    5 * authority_escalation +
    2 * freshness_escalation +
        confidence_escalation
```

Sort order SHALL be:

1. `priority_rank desc`
2. `last_compared_at desc`
3. `comparison_key asc`

This ranking SHALL drive both `TwinMismatchSummary.top_mismatch_refs[]` and the default
`TwinInterpretationState.default_sort_mode`. The summary SHALL also persist
`ranking_profile_code = TWIN_MISMATCH_SORT_V1` plus an ordered `top_ranked_mismatches[]` projection
containing, at minimum, `{delta_arc_ref, comparison_key, comparability_state,
comparability_reason_code, priority_rank, last_compared_at, materiality_class}`.

## Mismatch summary contract

`TwinMismatchSummary` SHALL validate against `schemas/twin_mismatch_summary.schema.json`.

It SHALL summarize the full delta set into deterministic, low-noise counts and top refs, including at
minimum:

- total subject count
- matched count
- mismatch count
- comparable mismatch count
- waiting count
- partial-ack count
- non-comparable count
- contradictory count
- blocking, material, review, and informational counts
- limited, stale, and out-of-band counts
- highest priority rank
- highest materiality class
- top mismatch refs
- top ranked mismatch entries
- suppressed-match count

The summary SHALL be computed from the persisted delta set, not by the client.

Summary integrity rules:

- `total_subject_count = matched_count + mismatch_count`
- `mismatch_count = comparable_mismatch_count + waiting_count + partial_ack_count +
  non_comparable_count + contradictory_count + out_of_band_count`
- `mismatch_count = blocking_count + material_count + review_count + informational_count`
- `suppressed_match_count <= matched_count`
- `highest_materiality_class` SHALL be derived from the highest non-zero mismatch bucket in priority
  order `BLOCKING > MATERIAL > REVIEW > INFORMATIONAL`, else `NONE`
- `highest_priority_rank` SHALL equal the first ranked mismatch entry's `priority_rank`, else `0`
- `top_ranked_mismatches[]` SHALL be ordered by the frozen mismatch sort profile
- `top_mismatch_refs[]` SHALL exactly mirror the ordered `delta_arc_ref` projection from
  `top_ranked_mismatches[]`
- `top_mismatch_refs[]` SHALL never exceed `mismatch_count`

## Readiness semantics

`TwinReadinessState` SHALL validate against `schemas/twin_readiness_state.schema.json`.

Twin readiness SHALL not be inferred from filing readiness alone. It SHALL combine trust/gate posture
with delta posture, baseline posture, freshness posture, and active reconciliation posture.

Let:

- `B` = blocking mismatches
- `R` = reconciliation-required mismatches
- `W` = waiting mismatches (`ACK_PENDING`, `TIMELINE_LAG`)
- `L` = limited or stale mismatches (`LIMITED_VISIBILITY`, `STALE_COMPARISON`)
- `M` = review or material mismatches not already counted in `B` or `R`

Then the twin-specific readiness class SHALL be:

- `BLOCKED` if `filing_readiness = NOT_READY` or `|B| > 0` or `baseline_state = MISSING`
- `RECONCILIATION_REQUIRED` if `|R| > 0` and the twin is not already `BLOCKED`
- `WAITING_ON_AUTHORITY` if `|W| > 0` and `|B| = 0` and `|R| = 0`
- `REVIEW_REQUIRED` if `|M| > 0` or `|L| > 0` or `filing_readiness = READY_REVIEW`
- `READY` only if `filing_readiness = READY_TO_SUBMIT` and `|B| = |R| = |W| = |M| = |L| = 0`

The safe-action posture SHALL also be explicit:

- `SAFE_TO_ACT`
- `REVIEW_BEFORE_ACT`
- `WAIT_ONLY`
- `REFRESH_REQUIRED`
- `NO_SAFE_ACTION`

`REFRESH_REQUIRED` or `NO_SAFE_ACTION` SHALL be used whenever stale truth, missing baseline, or
contradictory snapshots make mutation-capable action unsafe even if the internal trust or filing
posture looks strong.

`TwinReadinessState` SHALL also persist `usefulness_cap_reason_codes[]` plus explicit
`contradictory_mismatch_refs[]`, `non_comparable_mismatch_refs[]`, and
`out_of_band_mismatch_refs[]` so authority-first limits survive beyond a generic review label.
Authority posture `PARTIAL`, `STALE`, `UNKNOWN`, or `OUT_OF_BAND` SHALL cap
`decision_usefulness <= LOW`.

`no_safe_action_reason_codes[]` SHALL be populated only when `safe_action_state = NO_SAFE_ACTION`.
All other safe-action states SHALL keep that array empty so clients do not surface contradictory
"safe to act" and "no safe action" posture simultaneously.

## Reconciliation contract

`TwinReconciliationState` SHALL validate against `schemas/twin_reconciliation_state.schema.json`.

A twin SHALL not leave reconciliation behavior implicit. It SHALL freeze:

- lifecycle state
- target mismatch refs
- blocking mismatch refs
- recommended action code
- workflow refs
- automatic attempt counters
- reconciliation budget posture
- reconciliation deadline
- next-action owner and due time
- primary workflow ownership when escalation leaves the automatic lane
- last-attempted and resolved timestamps
- terminal resolution state
- reason codes

### Reconciliation triggers

The twin SHALL trigger or advance reconciliation as follows:

- `ACK_PENDING` within budget -> `WAITING_ON_AUTHORITY`
- `ACK_PENDING` beyond budget -> escalate to workflow and `WAITING_ON_OPERATOR`
- `ACK_PARTIAL`, `ACK_CONTRADICTORY`, `STATUS_MISMATCH`, `OUT_OF_BAND`, `AUTHORITY_ONLY`,
  `REJECTED_OR_REVERSED` -> immediate `QUEUED` or `IN_PROGRESS` reconciliation
- `BASELINE_MISSING` -> open review and block mutation-capable action
- `STALE_COMPARISON` -> refresh before any live authority mutation
- post-finalisation `TOTAL_MISMATCH` or filing-critical `VALUE_MISMATCH` against a proved baseline ->
  route into drift or amendment evaluation, not ad hoc operator guessing

No reconciliation flow may silently resend a live authority mutation after the profile-defined
automatic budget is exhausted.

Reconciliation integrity rules:

- `blocking_mismatch_refs[]` SHALL always be a subset of `target_mismatch_refs[]`
- `auto_attempt_count <= max_auto_attempts`
- resolved or superseded reconciliation state SHALL preserve explicit resolution timing rather than
  silently disappearing from the twin history

## Lifecycle edge cases

### Partial authority acknowledgement

A partial acknowledgement SHALL produce `ACK_PARTIAL`, not `MATCH`, even when some downstream
authority state appears compatible. The unresolved portion SHALL remain visible until a later
authority read or operator-reviewed closure proves equivalence.

### Stale twin snapshots

A stale lane or stale timeline SHALL produce `STALE_COMPARISON` and SHALL cap safe actions at
`REFRESH_REQUIRED` or `NO_SAFE_ACTION`. Staleness SHALL never be treated as a weak form of match.

### Contradictory twin components

If an authority acknowledgement says "confirmed" while an obligation mirror or authority read still
reports an incompatible state, the authority snapshot SHALL enter `CONTRADICTORY` and the twin SHALL
emit `ACK_CONTRADICTORY` or `STATUS_MISMATCH` rather than picking one component heuristically.

### Missing comparison baseline

If a filing or amendment comparison requires a legal baseline and that baseline cannot be proved,
`baseline_state = MISSING` and at least one `BASELINE_MISSING` delta SHALL be emitted. The twin may
still render informational surfaces, but SHALL NOT claim decision-useful equivalence.

### Amendment, late data, replay, and continuation

- a post-finalisation mismatch SHALL compare against the selected legal baseline, not the latest
  mutable working snapshot
- late-arriving data SHALL stale or supersede the internal snapshot and force delta recomputation
- replay or analysis-only runs SHALL set `replay_authoritativeness != LIVE` and SHALL emit
  `REPLAY_NON_AUTHORITATIVE` instead of pretending to be a current legal discrepancy
- continuation children SHALL inherit the comparison-key profile and baseline chain; they SHALL not
  restart the twin from an empty comparison universe
- once an amended baseline is confirmed, the old filed baseline becomes historical context and SHALL
  not continue to generate live twin mismatches for the same scope

`TwinView`, `TwinReadinessState`, and `TwinInterpretationState` SHALL each retain the shared
`execution_mode_boundary_contract`. Twin consumers SHALL therefore fail closed on
`legal_effect_boundary != COMPLIANCE_CAPABLE`: they SHALL not publish `SAFE_TO_ACT`,
`READY_TO_SUBMIT`, or equivalent live-authoritative affordances for replay-compliance or
counterfactual analysis posture, even when lane content otherwise resembles current compliance data.

## Interpretation-state contract

`TwinInterpretationState` SHALL validate against `schemas/twin_interpretation_state.schema.json`.

It freezes the operator-facing interpretation posture used by `TWIN_PANEL`, including:

- default and enabled view spaces
- compare mode
- pinned-object posture
- active delta-arc focus
- focus-anchor continuity across refresh
- confidence and freshness overlays
- default sort mode
- default noise filter
- summary-priority mode
- dominant attention state
- dominant delta or reconciliation refs
- collapse-matches posture
- informational-suppression posture
- authority-first summary posture

The default production interpretation SHALL be low-noise:

- sort by `PRIORITY_RANK`
- filter to `ACTIONABLE_ONLY` unless the operator expands scope
- collapse matches by default
- suppress informational deltas while any review-or-higher mismatch remains visible
- preserve focus anchor and active filter across reconnect and catch-up
- default to actionability-first or authority-first summary posture whenever waiting,
  reconciliation-required, non-comparable, out-of-band, or contradictory meaning dominates

## Portfolio aggregation

`TwinPortfolioSummary` SHALL validate against `schemas/twin_portfolio_summary.schema.json`.

Portfolio rollups SHALL aggregate manifest-level twins without re-running comparison logic on the fly.
The portfolio summary SHALL at minimum freeze:

- total twin count
- counts by `twin_readiness_class`
- stale and out-of-band counts
- highest attention rank in scope
- top twin refs
- top mismatch refs

The portfolio attention rank for twin `t` SHALL be derived from its readiness class and top mismatch:

```text
attention_rank(t) =
  1000 if twin_readiness_class = BLOCKED
   800 if twin_readiness_class = RECONCILIATION_REQUIRED
   600 if twin_readiness_class = WAITING_ON_AUTHORITY
   400 if twin_readiness_class = REVIEW_REQUIRED
   200 if twin_readiness_class = READY
     0 otherwise
  +  50 * 1[safe_action_state = NO_SAFE_ACTION]
  +  25 * 1[safe_action_state = REFRESH_REQUIRED]
  + highest_priority_rank(t)
```

Matched twins SHALL collapse into counts by default. A client or twin SHALL contribute at most once
to each aggregate bucket.

Portfolio integrity rules:

- `total_twin_count` SHALL equal the sum of the readiness-class buckets
- `top_twin_refs[]` SHALL be non-empty whenever `total_twin_count > 0`
- `highest_attention_rank = 0` iff `total_twin_count = 0`

## Low-noise detail-module binding

When the low-noise shell materializes `TWIN_PANEL` inside `DETAIL_DRAWER`, it SHALL do so from:

- `TwinView`
- `TwinStateSnapshot`
- `TwinTimeline`
- `TwinDeltaArc`
- `TwinMismatchSummary`
- `TwinReadinessState`
- `TwinReconciliationState`
- `TwinInterpretationState`

rather than from ad hoc client-local comparison state.

This keeps:

- state mirroring deterministic across reconnect
- focus anchoring deterministic across live refresh
- readiness language aligned with trust, gate, and reconciliation posture
- delta interpretation aligned with the authoritative comparison basis
- low-noise ranking aligned with persistent `priority_rank`
- stale, partial, and out-of-band semantics distinct instead of visually merged

The user-facing entry label for `TWIN_PANEL` SHALL be `Twin Lens`.
That embodiment SHALL publish one plain-language comparison interpretation before exposing paired
timelines, delta arcs, or source-space toggles so the operator does not have to decode visual
comparison topology before understanding what differs and why it matters.

## Implementation shape

A production implementation SHOULD follow this shape:

```text
internal = ASSEMBLE_TWIN_STATE_SNAPSHOT("INTERNAL_COMPUTED", ...)
authority = ASSEMBLE_TWIN_STATE_SNAPSHOT("AUTHORITY", ...)
timeline = BUILD_TWIN_TIMELINE(internal, authority, ...)
deltas = COMPUTE_TWIN_DELTA_SET(internal, authority, timeline, ...)
mismatch_summary = SUMMARIZE_TWIN_MISMATCHES(deltas, ...)
reconciliation = PLAN_TWIN_RECONCILIATION(deltas, ...)
readiness = DERIVE_TWIN_READINESS(trust, gates, deltas, reconciliation, ...)
interpretation = BUILD_TWIN_INTERPRETATION_STATE(readiness, mismatch_summary, ...)
twin = BUILD_TWIN_VIEW_ROOT(
  internal,
  authority,
  timeline,
  deltas,
  mismatch_summary,
  readiness,
  reconciliation,
  interpretation,
  parity
)
```

No client, report renderer, or operator shell may recompute these semantics differently.
