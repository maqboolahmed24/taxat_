# Shared Operating Contract for Tasks `pc_0118` to `pc_0125`

This block converts the frozen intake pack into authoritative snapshot and first-wave decision artifacts.

The output of these eight cards must let later agents take a schema-valid `InputFreeze` and its authoritative intake artifacts, build a governed `Snapshot`, wrap intake families into deterministic set artifacts, prove the full intake pack against the frozen schema bundle, and then compute, forecast, score risk, evaluate parity, and synthesize trust without consulting fresher connector or authority state than the frozen basis permits.

The work in this block is backend-first.
Do not invent decorative customer UI.
Only add browser-visible surfaces when they materially improve operator verification of snapshot lineage, artifact-contract integrity, or trust-threshold introspection.
Any such surface must remain internal or read-only, must preserve semantic HTML and keyboard truth, must use a low-noise premium visual language, and must be developed and verified with Playwright-first workflows.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed earlier cards `pc_0001` through `pc_0117`.
   Earlier ADRs, package boundaries, schema rules, hashing posture, queue/outbox rules, state-machine choices, and manifest/config-freeze decisions win over convenience.
   Especially consume:
   - `pc_0010` core engine and module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0016` state-machine catalog
   - `pc_0017` deterministic hashing posture
   - `pc_0028` monorepo package boundary map
   - `pc_0030` definition-of-done and evidence map
   - `pc_0031` environment / tenant / provider-profile catalog
   - `pc_0033` secret lineage policy
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0051` storage bucket taxonomy
   - `pc_0052` queue and message-fabric baseline
   - `pc_0053` cache and resume isolation baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0059` monorepo and package bootstrap
   - `pc_0060` imported contracts, samples, and validator bundle
   - `pc_0061` generated language bindings
   - `pc_0064` canonical primitive semantics
   - `pc_0065` reference and locator grammar
   - `pc_0066` migration framework
   - `pc_0067` inbox, outbox, and idempotency foundation
   - `pc_0069` object-lifecycle and quarantine hooks
   - `pc_0070` queue truth
   - `pc_0074` config-freeze and feature-flag resolution
   - `pc_0075` telemetry correlation and propagation
   - `pc_0076` append-only audit stream foundation
   - `pc_0077` deterministic seed and fixture pack
   - `pc_0078` local/runtime topology
   - `pc_0079` ephemeral environment and reset lifecycle
   - `pc_0080` schema-drift and migration-readiness automation
   - `pc_0081` generated contract observatory
   - `pc_0085` tenant, user, and actor-session persistence models
   - `pc_0086` through `pc_0093` access-control core, approval, and hashing services
   - `pc_0097` through `pc_0101` manifest repository, lineage trace, config freeze, schema bundle, and config-resolution modules
   - `pc_0102` through `pc_0108` manifest branch/start/pre-seal/replay foundations
   - `pc_0109` source plan / source window / collection boundary models
   - `pc_0110` through `pc_0117` collection orchestration, connector dispatch, source/evidence persistence, declarations, candidate/conflict/canonical handling, late-data posture, and `InputFreeze`

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
   - `canonical_source_and_evidence_taxonomy.md`
   - `input_boundary_and_cutoff_contract.md`
   - `late_data_policy_contract.md`
   - `audit_and_provenance.md`
   - `observability_and_audit_contract.md`
   - `error_model_and_remediation_model.md`
   - `deployment_and_resilience_contract.md`
   - `exact_gate_logic_and_decision_tables.md`
   - `compute_parity_and_trust_formulas.md`
   - `trust_sensitivity_and_threshold_stability_contract.md`
   - `authority_calculation_contract.md`
   - `authority_interaction_protocol.md`
   - `test_vectors.md`
   - `frontend_shell_and_interaction_law.md` only when an internal browser surface is introduced
   - `low_noise_experience_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an internal browser surface is introduced
   - `UIUX_DESIGN_SKILL.md` only when an internal browser surface is introduced

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, repositories, read models, preview routes, or policy summaries are downstream only.

5. Current official documentation for adopted browser-verification and low-noise interface practice.
   Use official Playwright guidance for locator strategy, actionability, auto-waiting, retries, trace capture, and isolation when an internal browser-visible surface is introduced.
   Use current Apple HIG and Material guidance for typography, layout hierarchy, color-role discipline, and restrained motion when an internal browser-visible surface is introduced.
   These sources never override Taxat semantics.

## Package and implementation placement rules

- Keep `pc_0118` through `pc_0120` in the collection package selected by `pc_0028`.
  If that package does not yet exist, create it and emit `ASSUMPTION_COLLECTION_PACKAGE_CREATED`.
  The default expected location is `packages/backend-collection`.
- Keep `pc_0121` through `pc_0125` in the compute/decision package selected by `pc_0028`.
  If no compute package exists, create `packages/backend-compute` and emit `ASSUMPTION_COMPUTE_PACKAGE_CREATED`.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Reuse canonical hashing, ordering, id generation, null-normalization, schema validation, deterministic seed, and state-transition helpers from earlier cards rather than creating per-task variants.
- Reuse `InputFreeze`, manifest, config-freeze, schema-bundle, and reference-grammar modules from earlier cards rather than duplicating frozen-basis logic inside compute code.
- Respect phase boundaries.
  This block may complete snapshot, artifact-set, contract-gate, compute, forecast, risk, parity, and trust foundations, but it must not silently absorb later generic ordered-gate orchestration, filing packet assembly, submission, amendment execution, or customer-facing UI.
- If an internal browser-visible explorer is introduced, keep it read-only and operator-facing.
  Develop and verify it with Playwright using role / label / text / accessible-name locators, actionability-safe interactions, keyboard coverage, reduced-motion assertions, and trace capture on retry.

## Non-negotiable interpretation rules

- `InputFreeze` is the authoritative downstream intake carrier.
  Snapshot, compute, forecast, risk, parity, trust, and replay consumers must derive from frozen intake artifacts and persisted gate/context inputs, not fresh connector reads.
- `Snapshot` is built from authoritative set artifacts, not raw provider payloads.
  Once the snapshot exists, downstream stages must rely on the snapshot and the set refs/hashes it binds.
- The first persisted snapshot enters `BUILT` through a named `snapshot_built` transition.
  Build progress before authoritative persistence is represented by stage execution or transient drafts, not by invented persisted pseudo-states such as `BUILDING`.
- The source corpus creates one real seam: `core_engine.md` shows `BUILD_SNAPSHOT(...)` first and then later mutates `snapshot.quality` / `snapshot.completeness`, while `snapshot.schema.json` requires both fields on the persisted artifact.
  Close that gap with a transactional draft-then-persist strategy or equivalent atomic builder.
  Do not persist a schema-invalid partial snapshot.
- Set-style envelopes (`SourceRecordSet`, `EvidenceItemSet`, `CandidateFactSet`, `ConflictSet`, `CanonicalFactSet`) must dedupe deterministically and preserve stable ordering.
  Duplicates must never survive into authoritative set hashes.
- `artifact_contract_refs[]` and `artifact_contract_hash` are part of the frozen intake basis.
  Validation and downstream decision code must consume them as first-class truth, not ignore them because contracts are “already validated somewhere else”.
- Contract validation must resolve only from the manifest’s frozen `schema_bundle_hash` plus the persisted reader-window compatibility posture.
  No live fallback to the newest schema bundle is allowed.
- Compliance compute uses only `CANONICAL` facts.
  Analysis compute may include `PROVISIONAL` facts only when the frozen analysis policy explicitly allows it and the resulting artifacts remain `analysis_only = true`.
- Exact decimal handling is mandatory for compute, forecast money values, parity deltas, threshold checks, and trust margins derived from those values.
  Binary floating-point is forbidden for money-bearing arithmetic, threshold-edge comparisons, and persisted decimal strings.
- Forecasting is analysis-only and non-mutating.
  `ForecastSet` must never change the compliance `ComputeResult` in place or widen legal posture.
- `RiskReport` is frozen-profile-driven.
  Missing or invalid risk-weight profiles fail closed rather than silently producing soft warnings.
- `ParityResult.comparison_set_state = INVALID` must force `parity_classification = NOT_COMPARABLE` and `parity_score = 0`.
  No local soft-match heuristic may override that posture.
- `TrustSummary` must persist `score_band`, `cap_band`, `trust_band`, `trust_input_basis_contract`, `trust_sensitivity_analysis_contract`, and the exact automation/readiness bridge.
  The final trust posture is the most restrictive lawful result, not merely the numeric trust score.
- `trust_sensitivity_analysis_contract.projected_case_results[]` must contain exactly the canonical six probes in canonical order.
  No extra local probes and no missing required probes are allowed.
- Evidence-graph quality is a real prerequisite for filing-capable trust.
  If the evidence graph or graph-quality basis is not yet implemented upstream, consume it through an explicit injected interface and fail closed with typed dependency gaps rather than synthesizing trust from guessed graph posture.
- Browser-visible inspection surfaces are never truth sources.
  They only render persisted artifacts and derived read models.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable set ordering, item-identity hashes, set hashes, contract refs, contract hashes, snapshot transitions, compute totals, forecast seeds, risk flags, parity classifications, trust bands, and sensitivity probe ordering.
- Idempotency first.
  Prefer compare-and-swap, append-only audit, explicit no-op results, and version checks over destructive rewrites or hidden retries.
- Every machine-readable record must retain enough lineage to explain where it came from:
  `source_file`, `source_heading_or_logical_block`, rationale, and any source hash/version needed for replay-safe interpretation.
- Surface unresolved points explicitly with typed markers such as:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`,
  `SNAPSHOT_GAP_*`, `ARTIFACT_SET_GAP_*`, `ARTIFACT_CONTRACT_GAP_*`,
  `COMPUTE_GAP_*`, `FORECAST_GAP_*`, `RISK_MODEL_GAP_*`, `PARITY_GAP_*`,
  `TRUST_GAP_*`, `GRAPH_QUALITY_DEPENDENCY_GAP_*`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`.
- Runtime code must be typed, fail-closed, resumable where appropriate, and secret-safe.
  No raw token logging, no connector-state reconsultation after freeze, no hidden schema upgrades, no float-based money math, and no fallback-to-allow when policy, schema, historical artifact, comparison basis, or graph-quality basis is missing.
- Write tests close to the code and add integration coverage for persistence, ordering, lifecycle legality, schema validation, exact-decimal stability, replay-safe reload behavior, and cross-module handoff integrity.
- When you add an internal browser-visible surface, make it feel quiet and premium rather than dashboard-like:
  use a 12-column grid, generous whitespace, max content width around 1440px, restrained palette (`#0F1115`, `#F6F3EE`, `#111318`, `#F5F7FA`, accent `#5B7CFA`, warning `#A06A00`, error `#C84B31`), strong typography hierarchy (Inter or SF Pro for UI text, mono only for ids/hashes), and subtle 120–180ms opacity/transform transitions with reduced-motion-safe fallbacks.
  Prefer one elegant snapshot lineage rail, contract matrix, threshold ladder, or six-probe sensitivity atlas over generic KPI dashboards.

## Validation expectations for every task

At minimum, every task in this block must do all of the following:

1. Validate new or modified schema-backed artifacts against the imported contract bundle.
2. Add unit coverage for canonical ordering, null handling, exact-decimal serialization, typed fail-closed paths, and state transitions where relevant.
3. Add integration coverage for persistence, replay-safe reload, idempotency, and dependency handoffs between this block’s artifacts.
4. Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the implementation bundle is assembled.
5. If a browser-visible surface is added, add Playwright coverage for user-facing locators, actionability-safe flows, keyboard navigation, trace capture, and reduced-motion behavior.
