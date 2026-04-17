# Shared Operating Contract for Tasks `pc_0102` to `pc_0109`

This block finishes the manifest branch/start/seal decision spine and opens the frozen collection-boundary foundation.
The output of these eight cards must let later agents compare an incoming request against prior manifest truth, choose the right continuation branch without ambiguity, claim or reclaim start in one atomic protocol, seal manifests against a canonical pre-start gate tape, persist release-candidate and replay outcome identity with deterministic hashing, and then begin collection work from explicit `SourcePlan`, `SourceWindow`, and `CollectionBoundary` control objects instead of ad hoc connector state.

The work in this block is backend-first.
Do not invent decorative customer UI.
Only add browser-visible surfaces when they materially improve verification or operator inspection of a governed trace, lineage artifact, or boundary record.
Any such surface must remain internal or read-only, must preserve semantic HTML and keyboard truth, must use a low-noise premium visual language, and must be developed and verified with Playwright-first workflows.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed earlier cards `pc_0001` through `pc_0101`.
   Earlier ADRs, package boundaries, validator choices, generated-binding rules, schema/migration rules, hashing posture, queue/outbox rules, manifest persistence decisions, and config-freeze semantics win over fresh convenience choices.
   Especially consume:
   - `pc_0010` core engine and module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0016` state-machine catalog
   - `pc_0017` formulas and deterministic hashing posture
   - `pc_0021` identity/session ADR
   - `pc_0022` authority integration boundary ADR
   - `pc_0023` authority truth versus internal projection ADR
   - `pc_0027` release evidence and migration posture
   - `pc_0028` monorepo package boundary map
   - `pc_0029` autonomous execution DAG
   - `pc_0030` definition-of-done and evidence map
   - `pc_0031` environment / tenant / provider-profile catalog
   - `pc_0033` secret lineage policy
   - `pc_0043` telemetry / audit boundary baseline
   - `pc_0049` secret-root and KMS topology
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0052` queue and message-fabric baseline
   - `pc_0053` cache and resume-store isolation baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0058` preview and environment smoke posture
   - `pc_0059` monorepo and package bootstrap
   - `pc_0060` imported contracts, samples, and validator bundle
   - `pc_0061` generated language bindings
   - `pc_0064` canonical primitive semantics
   - `pc_0065` reference and locator grammar
   - `pc_0066` migration framework
   - `pc_0067` inbox, outbox, and idempotency foundation
   - `pc_0068` northbound command, problem, and receipt scaffold
   - `pc_0073` cache-isolation implementation
   - `pc_0074` config-freeze and feature-flag resolution
   - `pc_0075` telemetry correlation and propagation
   - `pc_0076` append-only audit stream foundation
   - `pc_0077` deterministic seed and fixture pack
   - `pc_0078` local/runtime topology
   - `pc_0079` ephemeral environment and reset lifecycle
   - `pc_0080` schema-drift and migration-readiness automation
   - `pc_0081` generated contract observatory
   - `pc_0084` release naming and artifact identity conventions
   - `pc_0085` tenant, user, and actor-session persistence models
   - `pc_0086` through `pc_0093` access-control core, approval, and hashing services
   - `pc_0094` through `pc_0101` manifest repository, lineage trace, config freeze, schema bundle, and config-resolution modules

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `core_engine.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `constraint_coverage_index.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`

3. This block's task-specific contracts:
   - `manifest_and_config_freeze_contract.md`
   - `config_freeze_inheritance_and_consumption_contract.md`
   - `manifest_branch_selection_contract.md`
   - `manifest_lineage_explorer_and_reuse_decision_tracer_contract.md`
   - `manifest_start_claim_protocol.md`
   - `release_candidate_identity_and_promotion_evidence_contract.md`
   - `verification_and_release_gates.md`
   - `deployment_and_resilience_contract.md`
   - `input_boundary_and_cutoff_contract.md`
   - `canonical_source_and_evidence_taxonomy.md`
   - `late_data_policy_contract.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `actor_and_authority_model.md`
   - `northbound_api_and_session_contract.md`
   - `frontend_shell_and_interaction_law.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an internal browser surface is introduced

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, repositories, read models, preview routes, and policies are downstream only.

5. Current official documentation for adopted testing and browser-session practices.
   Use official Playwright guidance for locator strategy, actionability, retries, trace capture, and accessibility assertions.
   Use current Apple HIG guidance for typography, hierarchy, layout, and motion when an internal browser-visible inspection surface is introduced.
   These sources never override Taxat semantics.

## Package and implementation placement rules

- Keep manifest and replay/release work in the package selected for manifest orchestration by `pc_0028`.
  If that package does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Keep source-plan / source-window / collection-boundary work in the package selected for collection orchestration by `pc_0028`.
  If it does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Reuse canonical hash, ordering, null-normalization, and serializer utilities from earlier cards instead of introducing a parallel hashing stack inside this block.
- Keep persistence, hashing, state-machine evaluation, and canonical serialization provider-neutral.
  Storage-specific optimizations are allowed only behind abstractions that preserve the corpus semantics.
- Respect phase boundaries.
  `pc_0102`-`pc_0108` may finish manifest branching, start-claim, pre-seal, candidate identity, and replay-attestation foundations, but they must not silently absorb the full scope of later collection execution, extraction, staging, computation, authority emission, or submission cards.
  `pc_0109` may establish collection control models and repositories, but it must not silently implement all later fetch connectors or extraction pipelines.
- Any browser-visible surface introduced by this block must be internal or read-only, must rely on Playwright with user-facing locators, must prefer role / label / text / accessible-name selectors, must capture traces on retry, and must verify reduced-motion behavior.

## Non-negotiable interpretation rules

- Request-time branch action and the selected manifest's persisted `continuation_basis` are intentionally not the same concept.
  Never collapse `RETURN_EXISTING_BUNDLE` or `REUSE_SEALED_MANIFEST` into the selected manifest's own continuation basis.
- `RunManifest` lineage mirrors (`root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, `manifest_generation`) must remain byte-identical to the same meaning wherever it appears in `continuation_set{...}`, `manifest_branch_decision{...}`, `ManifestLineageTrace`, and `frozen_execution_binding{...}` when frozen.
  Divergence fails closed.
- `scope_execution_binding{...}` is the authoritative raw-versus-executable scope contract.
  Workers and downstream services must consume it, not re-derive executable scope from raw request arrays.
- `frozen_execution_binding{...}` is the authoritative worker-facing frozen envelope.
  Update it atomically with `ConfigFreeze`, `InputFreeze`, `hash_set.execution_basis_hash`, and mirrored continuation metadata.
- Same-manifest pre-start reuse is legal only for a truly pre-start sealed manifest.
  Any evidence of `opened_at`, outputs, submissions, drift refs, `decision_bundle_hash`, `deterministic_outcome_hash`, or `replay_attestation_ref` disqualifies sealed reuse and must surface a typed failure.
- `RECOVERY_CHILD` is legal only when the source attempt is stale and reclaimable.
  An active start lease blocks recovery-child allocation.
- Exact replay and same-attempt exact recovery must preserve frozen config/input basis and `execution_basis_hash`.
  They must not recollect sources, re-read live authority state, or refresh post-cutoff observations.
- `preseal_gate_evaluation` is a canonical, durable, pre-start gate tape.
  The gate order is fixed and later gates may append, but they may not rewrite or downgrade that pre-seal prefix.
- `candidate_identity_hash`, `execution_basis_hash`, `manifest_hash`, `decision_bundle_hash`, and `deterministic_outcome_hash` must be canonical, ordering-stable, and free of persistence-only ids, queue ids, and write-time noise.
- Every planned source domain must end in exactly one frozen boundary disposition.
  Omission is never interpreted as “no data”.
- `read_cutoff_at` is the hard last legal read for the active manifest.
  Post-cutoff observations route only through late-data handling and must not mutate the active collection boundary.
- Release/replay evidence must be append-only and auditable.
  A replay child or replay-visible result may not advertise replay posture until `ReplayAttestation` is durably persisted and referenced by the manifest.
- Missing, corrupt, retention-limited, schema-incompatible, or build-unavailable historical basis is fail-closed unless the contract explicitly allows a typed limited-comparison posture.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable branch decisions, hashes, pre-seal gates, candidate identities, replay attestations, source plans, and collection boundaries.
- Idempotency first.
  Prefer compare-and-swap, explicit no-op results, append-only evidence, and version checks over destructive rewrites or hidden retries.
- Every machine-readable record must retain `source_file`, `source_heading_or_logical_block`, rationale, and any source hash or version required for lineage.
- Surface unresolved points explicitly with typed markers such as:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `MANIFEST_BRANCH_GAP_*`, `START_CLAIM_GAP_*`, `PRESEAL_GAP_*`, `RELEASE_CANDIDATE_GAP_*`,
  `REPLAY_GAP_*`, `COLLECTION_BOUNDARY_GAP_*`, `MIRROR_DRIFT_*`, `UPSTREAM_SCHEMA_DRIFT_DETECTED`.
- Runtime code must be typed, fail-closed, resumable where appropriate, and secret-safe.
  No raw token logging, no ambient live-config fallback after seal, no mirroring drift normalized away, and no fallback-to-allow when a required policy, schema, or historical artifact is missing.
- Write tests close to the code and add integration coverage for persistence, concurrency-sensitive paths, and replay-safe reload behavior.
- When you add an internal browser surface, make it feel quiet and premium rather than dashboard-like: restrained color, strong typography, low-noise layout, keyboard truth, and reduced-motion-safe interaction.
  If a diagram helps, prefer a single elegant lineage ribbon, branch waterfall, or boundary-coverage strip over dense multi-panel charts.

## Validation expectations for every task

At minimum, every task in this block must do all of the following:

1. Validate any new or modified schema-backed artifacts against the imported contract bundle.
2. Add unit coverage for canonical ordering, null handling, typed fail-closed paths, and state transitions where relevant.
3. Add integration coverage for persistence, replay-safe reload, and concurrency-sensitive paths.
4. Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the implementation bundle is assembled.
5. If a browser-visible surface is added, add Playwright coverage for role-first locators, keyboard navigation, actionability-safe flows, trace capture, and reduced-motion behavior.
