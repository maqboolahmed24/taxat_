# Shared Operating Contract for Tasks `pc_0110` to `pc_0117`

This block completes the collection-to-frozen-intake spine.
The output of these eight cards must let later agents run one governed collection execution from a sealed `SourcePlan`, resolve the correct connector binding through a controlled gateway, materialize raw source and retained evidence artifacts, freeze normalization and explicit omission posture, extract replay-safe candidate facts, persist first-class conflicts, promote canonical facts without partition leakage, and assemble a fully governed `InputFreeze` that downstream snapshot, set-wrapping, contract-gate, compute, trust, filing, replay, and amendment work can consume without consulting fresher connector state.

The work in this block is backend-first.
Do not invent decorative customer UI.
Only add browser-visible surfaces when they materially improve operator verification of collection lineage, omission posture, conflict frontier, or frozen-input integrity.
Any such surface must remain internal or read-only, must preserve semantic HTML and keyboard truth, must use a low-noise premium visual language, and must be developed and verified with Playwright-first workflows.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed earlier cards `pc_0001` through `pc_0109`.
   Earlier ADRs, package boundaries, persistence choices, generated-binding rules, schema/migration rules, hashing posture, queue/outbox rules, object-lifecycle posture, connector-security choices, and manifest/config-freeze decisions win over fresh convenience choices.
   Especially consume:
   - `pc_0010` core engine and module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0016` state-machine catalog
   - `pc_0017` deterministic hashing posture
   - `pc_0023` authority truth versus internal projection boundary
   - `pc_0028` monorepo package boundary map
   - `pc_0030` definition-of-done and evidence map
   - `pc_0031` environment / tenant / provider-profile catalog
   - `pc_0033` secret lineage policy
   - `pc_0046` OCR and extraction-provider selection boundary
   - `pc_0047` malware-scan and quarantine baseline
   - `pc_0048` manual-checkpoint evidence baseline
   - `pc_0049` secret-root and KMS topology
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
   - `canonical_fact_promotion_and_partition_isolation_contract.md`
   - `provenance_graph_semantics.md`
   - `audit_and_provenance.md`
   - `observability_and_audit_contract.md`
   - `retention_and_privacy.md`
   - `error_model_and_remediation_model.md`
   - `deployment_and_resilience_contract.md`
   - `exact_gate_logic_and_decision_tables.md`
   - `amendment_and_drift_semantics.md`
   - `frontend_shell_and_interaction_law.md` only when an internal browser surface is introduced
   - `low_noise_experience_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an internal browser surface is introduced
   - `UIUX_DESIGN_SKILL.md` only when an internal browser surface is introduced

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, repositories, read models, preview routes, and policies are downstream only.

5. Current official documentation for adopted browser-verification practices.
   Use official Playwright guidance for locator strategy, actionability, retries, trace capture, and reduced-flake interaction.
   Use current Apple HIG and Material guidance for typography, color-role hierarchy, accessible layout, and restrained motion when an internal browser-visible inspection surface is introduced.
   These sources never override Taxat semantics.

## Package and implementation placement rules

- Keep collection orchestration, frozen intake artifacts, repositories, and validators in the package selected for collection orchestration by `pc_0028`.
  If that package does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Keep controlled provider/gateway adapters in the gateway/integration package chosen by `pc_0028`.
  If no such package exists, create a narrow helper package such as `packages/backend-collection-gateway` instead of pushing provider transport logic into manifest, session, or UI packages.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Reuse canonical hashing, ordering, null-normalization, id generation, and serializer utilities from earlier cards instead of introducing a parallel stack inside this block.
- Reuse the queue/outbox substrate from `pc_0067` / `pc_0070` rather than inventing collection-only retry tables.
- Reuse object-lifecycle and quarantine hooks from `pc_0069` for raw payloads, extracted evidence, malware-blocked binaries, and retention-limited records.
- Respect phase boundaries.
  `pc_0110` through `pc_0117` may complete collection execution and frozen-intake foundations, but they must not silently absorb snapshot lifecycle, generic artifact-set wrapping across all families, artifact-contract gate orchestration, compute/parity/trust, authority submission, or customer-facing UI.
- If you introduce an internal browser-visible explorer, keep it read-only and operator-facing.
  Develop and test it with Playwright using role / label / text / accessible-name locators, trace capture on retry, keyboard coverage, and reduced-motion assertions.

## Non-negotiable interpretation rules

- `SourceCollectionRun` is a first-class governed object.
  Collection lifecycle must be driven by `state_transition_contract{...}` and typed reason/gap refs, never inferred from worker logs, queue rows, or partially written fetch tables.
- `SourceCollectionRun.source_window_ref` is authoritative even before `SourceWindow` is fully materialized.
  Because the schema requires a non-null ref before collection completes, allocate a stable source-window anchor at run creation and force later `SourceWindow` materialization to reuse it byte-for-byte.
- No provider access may bypass the controlled gateway.
  Application code must never call providers directly.
  Resolver/dispatcher logic may select a binding and build a request, but transport must happen through the governed gateway abstraction.
- `read_cutoff_at` is the hard last legal read boundary for the active manifest.
  Post-cutoff observations cannot silently expand the active intake set; they become explicit late-data artifacts only.
- Every required source domain must end in one explicit posture.
  `NO_DATA_CONFIRMED_AT_CUTOFF`, `EXCLUDED_BY_POLICY`, `MISSING_AT_CUTOFF`, and `STALE_AT_CUTOFF` are materially different states.
  Omission is never interpreted as “empty”.
- The source corpus currently names `DECLARED_EXCLUSIONS(...)`, `DECLARE_MISSING_SOURCES(...)`, and `DECLARE_STALE_SOURCES(...)`, while `InputFreeze` also requires `no_data_confirmed_declarations[]`.
  You must close that gap by introducing one explicit schema-backed declaration family or equivalent typed artifact surface that keeps confirmed-empty distinct from excluded, missing, and stale posture.
- `SourceRecord` preserves raw origin exactly as captured; `EvidenceItem` preserves extracted/supporting material; `CandidateFact` is normalized but not authoritative; `CanonicalFact` is authoritative only after promotion rules and conflict posture permit it.
  Never collapse those layers.
- Every `EvidenceItem` must keep non-null `extraction_method`, `extraction_confidence`, and `lineage_refs[]`.
  A weak extraction is lawful; an un-attributed extraction is not.
- Every `CandidateFact` and `CanonicalFact` must keep exact `collection_boundary_ref`, `normalization_context_ref`, source/evidence lineage hashes, and exactly one partition binding.
  Cross-partition contamination must surface as explicit conflict posture rather than widened scope.
- Promotion input must remain `UNMASKED_AUTHORITATIVE_ONLY`.
  Masked, customer-safe, or other limited projections are never source truth for canonical promotion.
- `InputFreeze` is the authoritative downstream intake carrier.
  It must remain `input_consumption_mode = FROZEN_INPUT_ONLY` and `late_data_adoption_policy = CHILD_REVIEW_OR_EXCLUDE_ONLY`.
  Downstream compute, trust, filing, parity, and replay logic must consume it instead of consulting fresher connector state.
- `InputFreeze` requires `artifact_contract_refs[]` / `artifact_contract_hash` even though later roadmap cards formalize snapshot assembly and generalized set wrapping.
  Close that roadmap-ordering gap by implementing a dependency-injected final input-freeze assembler that refuses partial runtime persistence when required upstream artifacts are absent.
  Test with fixture contract refs if necessary, but do not weaken schema requirements.
- Candidate, conflict, and canonical set identity must be stable across replay, retry, and conflict-only posture changes.
  Deduplicate by logical identity inside exact partition scope, not by database row id.
- Audit and provenance are append-only.
  Fetch audit refs, page audit refs, lineage refs, promotion refs, and declaration refs must remain durable and traversable.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable source-window anchors, collection-run decisions, connector resolution, record/evidence materialization, declaration populations, candidate/canonical identity hashes, conflict frontiers, late-data bindings, source-domain postures, and input-freeze hashes.
- Idempotency first.
  Prefer compare-and-swap, explicit no-op results, append-only evidence, and version checks over destructive rewrites or hidden retries.
- Every machine-readable record must retain `source_file`, `source_heading_or_logical_block`, rationale, and any source hash or version needed for lineage.
- Surface unresolved points explicitly with typed markers such as:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `COLLECTION_GAP_*`, `FETCH_BINDING_GAP_*`, `SOURCE_WINDOW_ANCHOR_GAP_*`,
  `DECLARATION_GAP_*`, `CANDIDATE_GAP_*`, `CONFLICT_FRONTIER_GAP_*`,
  `CANONICAL_PROMOTION_GAP_*`, `LATE_DATA_GAP_*`, `INPUT_FREEZE_GAP_*`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`.
- Runtime code must be typed, fail-closed, resumable where appropriate, and secret-safe.
  No raw token logging, no hidden direct-provider retries, no mutation of frozen intake after cutoff, and no fallback-to-allow when policy, schema, historical artifact, or connector lineage is missing.
- Write tests close to the code and add integration coverage for persistence, ordering, idempotency, concurrency-sensitive paths, and replay-safe reload behavior.
- When you add an internal browser-visible surface, make it feel quiet and premium rather than dashboard-like:
  use a 12-column grid, generous whitespace, max content width around 1440px, restrained palette (`#0F1115`, `#F6F3EE`, `#111318`, `#F5F7FA`, accent `#5B7CFA`, warning `#A06A00`, error `#C84B31`), strong typography hierarchy (Inter or SF Pro for UI text, mono only for ids/hashes), subtle 120–180ms opacity/transform transitions, and reduced-motion-safe behavior.
  Prefer a single elegant lineage ribbon, collection timeline, posture matrix, or conflict frontier strip over generic KPI dashboards.

## Validation expectations for every task

At minimum, every task in this block must do all of the following:

1. Validate any new or modified schema-backed artifacts against the imported contract bundle.
2. Add unit coverage for canonical ordering, null handling, typed fail-closed paths, and state transitions where relevant.
3. Add integration coverage for persistence, replay-safe reload, idempotency, and concurrency-sensitive paths.
4. Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the implementation bundle is assembled.
5. If a browser-visible surface is added, add Playwright coverage for user-facing locators, actionability-safe flows, keyboard navigation, trace capture, and reduced-motion behavior.
