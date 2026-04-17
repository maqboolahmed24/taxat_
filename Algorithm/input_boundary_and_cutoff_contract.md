# Input Boundary And Cutoff Contract

This contract defines the authoritative pre-canonicalization evidentiary perimeter. A manifest does
not merely "finish collection" and continue. It freezes one replayable intake boundary that later
stages must consume without consulting fresher connector state.

## 1. Governing artifacts

The intake perimeter is frozen through four linked artifacts:

- `SourcePlan`: the required-domain plan plus `source_plan_hash`
- `SourceWindow`: the collection interval, `read_cutoff_at`, `source_window_hash`, and hard-cutoff
  posture (`cutoff_enforcement_state = HARD_CLOSED_AT_READ_CUTOFF`,
  `post_cutoff_observation_mode = LATE_DATA_ONLY`)
- `CollectionBoundary`: the per-domain/provider/cursor/revision boundary plus
  `collection_boundary_hash` and explicit `boundary_disposition`
- `InputFreeze`: the downstream execution carrier that binds the three boundary hashes, exact
  intake refs, per-domain postures, and `input_consumption_mode = FROZEN_INPUT_ONLY`

## 2. Per-domain accounting rule

Every planned source domain SHALL end in exactly one frozen boundary disposition:

- `IN_SCOPE_COLLECTED`
- `NO_DATA_CONFIRMED_AT_CUTOFF`
- `EXCLUDED_BY_POLICY`
- `MISSING_AT_CUTOFF`
- `STALE_AT_CUTOFF`

That distinction is not optional. `InputFreeze` therefore persists both:

- domain-level declarations (`exclusion_refs[]`, `no_data_confirmed_declarations[]`,
  `missing_source_declarations[]`, `stale_source_declarations[]`)
- `source_domain_postures[]` with the typed disposition, late-data policy, scope narrowing, and
  artifact counts that later gates and canonicalization must consume

No required domain may disappear into an implied "empty set" interpretation.

## 3. Cutoff rule

`read_cutoff_at` is the last legal read boundary for the active manifest. Data becoming visible
after that point SHALL NOT be silently adopted into the same manifest. Post-cutoff observations are
legal only through persisted late-data handling:

- exclude and continue
- review and continue
- spawn a child manifest

The active manifest SHALL NOT infer legality from worker-local freshness, queue timing, or a fresh
connector poll after cutoff.

## 4. Downstream consumption rule

After `InputFreeze` exists, downstream stages SHALL consume:

- `InputFreeze`
- authoritative intake artifact sets referenced by it
- `frozen_execution_binding{ source_plan_ref/hash, source_window_ref/hash,
  collection_boundary_ref/hash, normalization_context_ref/hash, input_set_hash,
  input_consumption_mode }`

They SHALL NOT reason from raw connector deltas, ad hoc recollection, or a newer boundary snapshot.

## 5. Leakage classes closed by this contract

- continued source collection after cutoff now conflicts with hard-cutoff `SourceWindow` posture
- canonical promotion from implicitly absent domains now fails unless the domain is explicitly
  collected or explicitly classified as no-data/excluded/missing/stale
- gate logic can no longer treat raw connector drift as active-manifest truth because the frozen
  execution binding carries manifest-bound boundary refs and hashes
- replay and same-attempt recovery can no longer recollect input implicitly because historical reuse
  must bind the persisted boundary hashes and `FROZEN_INPUT_ONLY` posture
