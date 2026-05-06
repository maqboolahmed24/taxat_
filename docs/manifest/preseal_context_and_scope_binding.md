# Preseal Context And Scope Binding

`scope_execution_binding` is the manifest-local authority for raw requested scope versus executable runtime scope. `materializeScopeExecutionBinding` consumes an access decision, canonicalizes scope ordering, preserves masking rules, and returns either a runnable `RUN_MANIFEST` binding or a pre-start boundary outcome for `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, or `DENY`.

`buildFrozenExecutionBinding` publishes the worker-facing frozen packet from canonical manifest, `ConfigFreeze`, `InputFreeze`, and scope binding sources. It derives `execution_basis_hash` from access binding, config freeze hash, input set hash, and deterministic seed, then derives `manifest_hash` from manifest identity, continuation basis, and execution basis. The frozen binding mirrors lineage and worker convenience fields, but those mirrors remain subordinate to `RunManifest`, `continuation_set`, `ConfigFreeze`, `InputFreeze`, and `hash_set`.

`syncManifestPresealMirrors` and `validateManifestLineageProjection` keep top-level lineage, `continuation_set`, manifest-local branch decision, and frozen binding mirrors byte-identical. Drift fails closed instead of being silently normalized.

`updateManifestPresealContext` is the repository mutation path. It rejects sealed or post-start manifests, rejects non-runnable access decisions, rejects partial config/input freeze patches, and commits config freeze, input freeze, hash set, append-only projection placeholder, and frozen execution binding in one compare-and-swap write.
