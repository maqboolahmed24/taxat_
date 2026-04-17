# Low-Noise Surface Compression and Noise-Budget Audit Contract

## Purpose
This contract turns calm-shell compression into a deterministic, persisted audit boundary instead of
an editorial convention.
It proves that every published `LowNoiseExperienceFrame` stays inside the frozen four-surface,
copy-budget, scan-load, dominance, and non-material refresh limits that define the low-noise
production profile.

## Authoritative artifacts
Every published `LowNoiseExperienceFrame` SHALL serialize one grouped `low_noise_budget_audit`
validated by `schemas/low_noise_budget_audit.schema.json`.

Every release or regression suite that claims calm-shell compression closure SHALL additionally
serialize one `low_noise_budget_audit_pack` validated by
`schemas/low_noise_budget_audit_pack.schema.json`.

The frame-level audit is authoritative for:

- the exact peer surface order used by the mounted calm shell
- the frozen surface, reason, warning, action, and detail-entry counts used by `scan_load(...)`
- the aggregate visible first-view copy footprint used by the shell-level budget calculation
- the proof that only one dominant issue story and one safe-next-move story remain visible
- the proof that analysis, masking, and limitation posture has been compressed instead of repeated
  across multiple visible regions
- the typed refresh/coalescing posture used for non-material refresh, reconnect, and catch-up

The audit-pack artifact is authoritative for:

- first view, high reason pressure, `NO_SAFE_ACTION`, non-material refresh, reconnect or catch-up,
  and typed detail-fallback coverage
- the scenario matrix that proves calm-shell outputs do not widen beyond the governed budgets under
  reconnect, rebase, or fallback pressure
- the explicit coalescing outcomes used when non-material deltas would otherwise reorder attention

## Required rules
- `LowNoiseExperienceFrame.surface_order[]` and `low_noise_budget_audit.rendered_surface_order[]`
  SHALL both remain exactly `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
- `persistent_surface_count` SHALL remain `4`, `concurrent_primary_count` SHALL remain `1`, and
  `scan_load` SHALL equal the frozen formula already defined by the low-noise contract.
- `visible_reason_count`, `visible_warning_count`, `visible_action_count`, and
  `visible_detail_entry_count` SHALL remain within the frozen low-noise cognitive budget.
- `secondary_mutation_action_count` SHALL remain `0`. The calm shell may surface one dominant safe
  next move, but it may not surface parallel mutation-capable secondary actions.
- `duplicate_posture_codes[]` SHALL be empty on every published frame. Repeated analysis-only,
  masking-limited, or limitation copy must collapse into one governed location before publication.
- `visible_shell_char_count` SHALL be computed from the actually rendered shell copy, not from
  source prose or hidden disclosure targets.
- `semantic_coverage_state` SHALL remain
  `LOSSLESS_DECISIVE_ATOMS_VISIBLE_OR_ROUTE_STABLE`; trimming copy is lawful only when decisive
  meaning remains visible or route-stably discoverable.
- `FIRST_VIEW` audits SHALL clear refresh-only fields. `NON_MATERIAL_REFRESH` and
  `RECOVERY_RECONNECT` audits SHALL retain explicit rank-swap, continuity-cost, visible-change, and
  coalesced-change accounting.
- `low_noise_budget_audit_pack` SHALL cover the full scenario matrix and SHALL include at least one
  case where non-material changes are explicitly coalesced and at least one case with typed detail
  fallback.

## Failure modes closed
- more than four peer first-view surfaces in a calm shell
- more than one dominant issue story or more than one mutation-capable action story
- copy drift that still passes per-field schema limits but exceeds the aggregate scan-load budget
- repeated analysis, masking, or limitation posture across multiple visible regions
- detail-entry expansion or warning expansion that silently pushes the shell past the visibility
  budget
- non-material refresh that reorders dominant attention instead of coalescing lower-ranked deltas
- reconnect or fallback flows that widen the shell or invent a different detail entry story than the
  mounted frame actually serialized
