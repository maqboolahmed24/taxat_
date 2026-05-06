# Native Cache Hydration Automation Pack And Compatibility Checks

`pc_0204` adds deterministic generation for
`native_cache_hydration_automation_pack`. The pack is generated from one frozen FE-75 case matrix
instead of hand-authored native test notes, so release and regression logic can inspect the same
machine-readable artifact.

The canonical ordering is:

1. compatible cold start on a native primary scene
2. schema-incompatible cold start through a native persistence fixture
3. tenant switch on a native primary scene
4. privilege downgrade through a workspace cursor persistence fixture
5. session revocation on a native primary scene
6. cache-only restore that requires live rebase before mutation
7. secondary-window masking purge

The pack always uses `run_mode = DETERMINISTIC_SEEDED_ENUMERATION` and the default deterministic
seed `7501`. Both harness classes are represented:

- `XCUITEST` proves user-visible native scene and first-paint behavior.
- `NATIVE_PERSISTENCE_FIXTURE` proves structured cache and local derivative invalidation.

Every case pins `compatibility_check_completed_before_render = true`,
`incompatible_content_rendered = false`, `resume_lineage_reused_illegally = false`, and
`restoration_reopened_stale_context = false`.

Purge-triggered cases must clear the full regulated inventory in the frozen order:

- `STRUCTURED_CACHE`
- `RESUME_METADATA`
- `SCENE_RESTORATION_PAYLOAD`
- `NSUSERACTIVITY`
- `PREVIEW_CACHE`
- `TEMP_EXPORT_FILE`
- `LOCAL_SEARCH_INDEX`

The compatible cold-start case may render cached content only after compatibility verification. The
cache-only restore case can first paint compatible cached content, but action posture stays
`MUTATION_BLOCKED_PENDING_REBASE`; filing-capable or mutation-capable actions cannot become live
until live rebase or access rebind establishes current legality.
