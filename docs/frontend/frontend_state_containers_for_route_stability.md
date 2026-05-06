# Frontend State Containers For Route Stability

`pc_0233` adds frontend-only state containers for route currentness and command guard formation. The containers mirror the authoritative grouped contracts; they do not compute legal state or create local substitutes for server decisions.

## Verified Contract Inputs

The implementation was cross-checked against:

- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/stream_resume_and_catch_up_ordering_contract.md`
- `Algorithm/cache_isolation_and_secure_reuse_contract.md`
- `Algorithm/schemas/route_stability_contract.schema.json`
- `Algorithm/schemas/stream_recovery_contract.schema.json`
- `Algorithm/schemas/cache_isolation_contract.schema.json`

## Containers

- `packages/frontend-shell-core/src/state/route_stability_store.ts` stores route identity, ETag refs, publication generation, grouped guard vectors, cache isolation summaries, and stream recovery summaries.
- `packages/frontend-shell-core/src/state/currentness_evaluator.ts` classifies `CURRENT`, `STALE`, `REBASE_REQUIRED`, `ACCESS_REBIND_REQUIRED`, `SNAPSHOT_ONLY`, and `ILLEGAL_MIXED_GENERATION_BASIS`.
- `packages/frontend-shell-core/src/state/view_guard_store.ts` builds route-scope-specific command guard snapshots for manifest, workspace, portal, and governance mutation families.
- `packages/frontend-shell-core/src/state/stale_guard_snapshot.ts` blocks command formation when a required guard is absent.
- `packages/frontend-shell-core/src/state/shell_token_store.ts` tracks shell stability tokens by route identity and route-scope family.
- `packages/shared-ui/src/state/StabilityDebugPill.tsx` publishes internal debug-pill snapshots using opaque refs only.

## Guard Rules

Guard-vector comparison uses both `guard_vector_hash` and every component field. A hash match with changed components, changed hash with identical components, or newer frame epoch with the old shell token is treated as an illegal mixed-generation basis.

Route-scope contamination fails closed. Manifest command snapshots cannot be selected from client portal routes, portal approval guards cannot be selected from workspace routes, and missing required guards are returned as typed blocked snapshots instead of fabricated placeholders.

Snapshot-only route state never exposes stream resume controls. Session, access, and masking drift produce access-rebind posture plus purge cues for local caches.

## Internal Harness

The browser harness at `apps/operator-web/public/internal/view-guard-state-containers/index.html` mocks current, stale, rebase, access-rebind, and snapshot-only states. Its Playwright coverage verifies primary-action posture changes, opaque stability-pill refs, reduced-motion mode, keyboard focus preservation, and snapshot-only stream resume suppression.
