# Budget Audit And Pack Generation

`packages/backend-low-noise/src/audit` is the canonical low-noise budget evidence layer.

The per-frame audit is computed from the published shell payload:

- `visible_shell_char_count` counts rendered context, summary, action, and detail-entry copy only. Full-text references and hidden disclosure targets are excluded.
- `scan_load` uses the frozen formula from the low-noise contract and is shared by publication and regression pack generation.
- `rendered_surface_order` must remain `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
- Published audits require four persistent surfaces, one concurrent primary, no secondary mutation actions, and no duplicate posture codes.
- `FIRST_VIEW` clears refresh-only fields. `NON_MATERIAL_REFRESH` and `RECOVERY_RECONNECT` keep rank-swap, continuity-cost, visible-change, and coalesced-change accounting.

The deterministic audit pack uses seed `172` by default and run mode `DETERMINISTIC_SEEDED_ENUMERATION`. Case order is sorted by stable case id, and `pack_id` is derived from a stable hash of the seed, run mode, suite profile, and case payloads.

Default pack coverage includes first view, reason pressure, no-safe-action, non-material refresh coalescing, reconnect/catch-up, and detail fallback cases for preserved, first-valid, suggested, and collapsed-root fallback states. Detail fallback cases use `RECOVERY_RECONNECT` audit scope because the validator treats fallback pressure as recovery evidence. Each case binds back to a concrete frame id and reuses the same per-frame audit builder, so regression evidence and publication evidence cannot drift.
