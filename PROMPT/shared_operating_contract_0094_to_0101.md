# Shared Operating Contract for Tasks `pc_0094` to `pc_0101`

This block finishes the first secure session-boundary tranche and opens the manifest/config-freeze spine.
The output of these eight cards must let later agents enforce browser and native session safety, project governance access read models from authoritative policy truth, and then build manifest branching, config freezing, replay, and release evidence on top of durable manifest control objects instead of controller-local guesses.

The work in this block is backend-first.
Do not invent decorative product UI.
Only add browser-visible surfaces when they materially improve verification or operator inspection of a governed read model or trace artifact.
Any such surface must remain internal or read-only, must preserve semantic HTML and keyboard truth, must use a low-noise premium visual language, and must be developed and verified with Playwright-first workflows.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed earlier cards `pc_0001` through `pc_0093`.
   Earlier ADRs, package boundaries, validator choices, generated-binding rules, schema/migration rules, session baselines, and deterministic hashing decisions win over fresh convenience choices.
   Especially consume:
   - `pc_0010` core engine and domain module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0017` formulas, deterministic math, and hashing posture
   - `pc_0021` identity and session ADR
   - `pc_0022` authority integration boundary ADR
   - `pc_0023` authority truth versus internal projection ADR
   - `pc_0027` release evidence and migration posture
   - `pc_0028` monorepo package boundary map
   - `pc_0029` autonomous execution DAG
   - `pc_0030` definition-of-done and evidence map
   - `pc_0031` environment / tenant / provider-profile catalog
   - `pc_0033` secret lineage policy
   - `pc_0040` step-up and session policy baseline
   - `pc_0043` telemetry / audit boundary baseline
   - `pc_0049` secret-root and KMS topology
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0052` queue and message-fabric baseline
   - `pc_0053` cache and resume-store isolation baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0059` monorepo and package bootstrap
   - `pc_0060` imported contracts, samples, and validator bundle
   - `pc_0061` generated language bindings
   - `pc_0063` frozen config versus runtime-env abstraction
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
   - `pc_0078` governed local stack contract
   - `pc_0079` ephemeral environment and reset lifecycle
   - `pc_0080` schema-drift and migration-readiness automation
   - `pc_0081` generated contract observatory
   - `pc_0082` canonical human/agent task surface
   - `pc_0083` baseline layered-access matrix and role seeds
   - `pc_0084` release naming and artifact identity conventions
   - `pc_0085` tenant, user, and actor-session persistence models
   - `pc_0086` through `pc_0093` access-control core, simulation basis, approval, and hashing services

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`

3. This block's task-specific contracts:
   - `actor_and_authority_model.md`
   - `northbound_api_and_session_contract.md`
   - `security_and_runtime_hardening_contract.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `admin_governance_console_architecture.md`
   - `frontend_shell_and_interaction_law.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an internal browser surface is introduced
   - `manifest_and_config_freeze_contract.md`
   - `config_freeze_inheritance_and_consumption_contract.md`
   - `manifest_branch_selection_contract.md`
   - `manifest_lineage_explorer_and_reuse_decision_tracer_contract.md`
   - `manifest_start_claim_protocol.md` as a future-boundary reference only; do not silently pull card `pc_0103` scope into `pc_0097`-`pc_0101`
   - `deployment_and_resilience_contract.md`
   - `verification_and_release_gates.md`
   - `release_candidate_identity_and_promotion_evidence_contract.md`

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, repositories, read models, preview routes, and policies are downstream only.

5. Current official documentation for adopted testing and browser-session practices.
   Use official Playwright guidance for locator strategy, actionability, retries, trace capture, and accessibility assertions.
   Use current OWASP guidance for cookie-based session hardening, CSRF mitigation, and cookie-scope hygiene.
   These sources never override Taxat semantics.

## Package and implementation placement rules

- Keep backend access work in the package selected for access control by `pc_0028`.
  If that package does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Keep manifest/config-freeze work in the package selected for manifest orchestration by `pc_0028`.
  If it does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Keep persistence, hashing, state-machine evaluation, and canonical serialization provider-neutral.
  Storage-specific optimizations are allowed only behind abstractions that preserve the corpus semantics.
- Respect phase boundaries.
  `pc_0097`-`pc_0101` may create models, validators, repositories, and service hooks needed by later cards, but they must not silently absorb the full scope of `pc_0102+` (prior-manifest reuse decision orchestration, full start-claim execution, pre-seal gate evaluation, release candidate hashing, or terminal replay attestation flows).
- Any browser-visible surface introduced by this block must be internal or read-only, must rely on Playwright with user-facing locators, must prefer role / label / text / accessible-name selectors, must capture traces on retry, and must verify reduced-motion behavior.

## Non-negotiable interpretation rules

- `ActorSession` is a first-class governed control object.
  Revocation, expiry, device-binding state, anti-CSRF posture, and step-up rotation state are durable truth, not middleware side effects.
- Browser-origin write actions require both an authenticated session and anti-CSRF protection.
  `SameSite` alone is insufficient.
  Cookie scope must stay narrow enough that unrelated hosts or subdomains cannot inherit session authority accidentally.
- `session_binding_hash` and `csrf_ref` are durable references or hash-stable bindings.
  Raw CSRF secrets, raw session cookies, raw OIDC refresh secrets, and raw authority credentials must never become ordinary domain-object payloads or ordinary logs.
- Device binding is not a generic browser fingerprinting free-for-all.
  Strong, explicit, replay-safe bindings win over volatile heuristics.
  Any heuristic-only mismatch must surface as typed suspicion, challenge, or revocation posture rather than silently widening authority.
- `GovernancePolicySnapshot`, `RoleTemplateMatrix`, and `PrincipalAccessView` are authoritative read contracts for governance surfaces.
  They SHALL preserve exact decision vocabulary (`ALLOW`, `ALLOW_MASKED`, `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, `DENY`) and exact authority-layer ordering.
  They SHALL not collapse into UI-local permission enums.
- `policy_snapshot_hash` and read-model version hashes must be canonical, deterministic, and ordering-stable.
  Pending staged changes, focus anchors, or query-local selection state may be rendered by read models, but they must not contaminate the committed policy hash.
- `RunManifest`, `ManifestLineageTrace`, `ConfigVersion`, `ConfigChangeRequest`, `ConfigFreeze`, `SchemaBundle`, `SchemaMigrationLedger`, and `BackfillExecutionContract` are first-class control objects.
  They are not opaque JSON blobs with loosely interpreted status strings.
- The lineage mirrors on `RunManifest` (`root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, `manifest_generation`) must remain byte-identical to their mirrors inside `continuation_set{...}`, `manifest_branch_decision{...}`, and `frozen_execution_binding{...}` where applicable.
  Divergence fails closed.
- `ManifestLineageTrace` exists because request-time branch outcome and the selected manifest's own `continuation_basis` are intentionally not always the same concept.
  Never collapse `RETURN_EXISTING_BUNDLE` or `REUSE_SEALED_MANIFEST` into the selected manifest's persisted continuation basis.
- `ConfigFreeze` is execution basis, not environment metadata.
  Workers, replays, recoveries, and downstream transport components consume manifest-bound frozen config only.
  Fresh ambient config lookup after seal is forbidden.
- `config_inheritance_mode` and `ConfigFreeze.config_resolution_basis` map exactly.
  Exact reuse must be typed, not inferred from coincidental hash equality.
- `SchemaBundle` reader windows, migration phases, historical-manifest guards, replay-restore guards, and backfill contracts remain explicit machine state.
  Destructive schema changes are blocked until their compatibility window and migration chronology say otherwise.
- `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, and `DENY` are pre-manifest exits.
  No manifest allocation or manifest mutation may occur on those outcomes.
- Session revocation invalidates future command acceptance plus outstanding resume tokens, stream resumption, and upload-session control operations bound to that session lineage.
- Every revocation, session challenge rotation, policy snapshot publication, role-matrix publication, principal-access projection, manifest lifecycle transition, config lifecycle transition, config freeze creation, schema-bundle publication, and migration-ledger state change that matters to auditability must emit append-only lineage or audit evidence.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable hashes, read models, manifest projections, config freezes, and state-transition outcomes.
- Idempotency first.
  Prefer compare-and-swap, explicit no-op results, append-only evidence, and version checks over destructive rewrites or hidden retries.
- Every machine-readable record must retain `source_file`, `source_heading_or_logical_block`, rationale, and any source hash or version required for lineage.
- Surface unresolved points explicitly with typed markers such as:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `SESSION_GAP_*`, `ACCESS_READMODEL_GAP_*`, `MANIFEST_GAP_*`, `CONFIG_GAP_*`,
  `SCHEMA_WINDOW_GAP_*`, `MIRROR_DRIFT_*`, `POLICY_GAP_*`, `NOT_SELECTED`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`.
- Runtime code must be typed, fail-closed, resumable where appropriate, and secret-safe.
  No raw token logging, no ambient live-config fallback after seal, no mirroring drift normalized away, and no fallback-to-allow when a policy or schema artifact is missing.
- Write tests close to the code and add integration coverage for storage, state transitions, and replay-safe hash behavior.
- When you add an internal browser surface, make it feel quiet and premium rather than dashboard-like: restrained color, strong typography, low-noise layout, keyboard truth, and reduced-motion-safe interaction.

## Validation expectations for every task

At minimum, every task in this block must do all of the following:

1. Validate any new or modified schema-backed artifacts against the imported contract bundle.
2. Add unit coverage for canonical ordering, null handling, state transitions, and fail-closed error paths.
3. Add integration coverage for persistence, replay-safe reload, and concurrency-sensitive paths.
4. Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the implementation bundle is assembled.
5. If a browser-visible surface is added, add Playwright coverage for role-first locators, keyboard navigation, actionability-safe flows, and reduced-motion behavior.
