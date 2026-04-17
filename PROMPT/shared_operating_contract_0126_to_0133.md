# Shared Operating Contract for Tasks `pc_0126` to `pc_0133`

This block converts the frozen compute, gate, and authority context into durable decision, proof, explainability, twin, and authority-state artifacts.

The output of these eight cards must let later agents take the already-frozen intake, snapshot, compute, forecast, risk, parity, and trust artifacts, then:
- emit the canonical ordered gate tape;
- finalize one replay-safe terminal `DecisionBundle`;
- build a manifest-scoped provenance graph, proof bundle, and enquiry pack that stay defensible under replay and retention limits;
- materialize twin snapshots, mismatches, reconciliation posture, and portfolio rollups without blurring internal projection into authority truth; and
- seed the first authoritative authority-domain artifacts (`ObligationMirror`, `FilingCase`, `FilingPacket`) without prematurely absorbing later submission transport, ingress normalization, or settlement-projection work.

The work in this block is backend-first.
Do not invent decorative customer UI.
Only add browser-visible surfaces when they materially improve operator verification of gate order, decision explainability, proof closure, twin mismatch posture, or authority-state lineage.
Any such surface must remain internal or read-only, must preserve semantic HTML and keyboard truth, must use a low-noise premium visual language, and must be developed and verified with Playwright-first workflows.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed earlier cards `pc_0001` through `pc_0125`.
   Earlier ADRs, package boundaries, schema rules, hashing posture, queue/outbox rules, state-machine choices, manifest/config-freeze decisions, collection semantics, snapshot rules, compute semantics, parity, and trust posture win over convenience.
   Especially consume:
   - `pc_0010` core engine and module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0016` state-machine catalog
   - `pc_0017` deterministic hashing posture
   - `pc_0028` monorepo package boundary map
   - `pc_0030` definition-of-done and evidence map
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
   - `pc_0086` through `pc_0093` access-control core, approval, authority, and hashing services
   - `pc_0094` through `pc_0101` session security, run-manifest lineage, config versioning, schema bundle, and frozen-config resolution
   - `pc_0102` through `pc_0108` prior-manifest, branch/start, pre-seal, seal, release-candidate, and replay-attestation foundations
   - `pc_0109` source-plan / source-window / collection-boundary models
   - `pc_0110` through `pc_0117` collection orchestration, connector dispatch, source/evidence persistence, declarations, candidate/conflict/canonical handling, late-data posture, and `InputFreeze`
   - `pc_0118` through `pc_0125` snapshot assembly, exact compute, forecast, risk, parity, and trust synthesis

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
   - `exact_gate_logic_and_decision_tables.md`
   - `gate_decision_explainability_and_reason_code_compression_contract.md`
   - `provenance_graph_semantics.md`
   - `defensible_filing_graph_contract.md`
   - `retention_limited_explainability_and_audit_sufficiency_contract.md`
   - `twin_view_contract.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `authority_interaction_protocol.md`
   - `authority_calculation_contract.md`
   - `audit_and_provenance.md`
   - `observability_and_audit_contract.md`
   - `error_model_and_remediation_model.md`
   - `deployment_and_resilience_contract.md`
   - `test_vectors.md`
   - `AUDIT_FINDINGS.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `frontend_shell_and_interaction_law.md` only when an internal browser surface is introduced
   - `low_noise_experience_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an internal browser surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an internal browser surface is introduced
   - `UIUX_DESIGN_SKILL.md` only when an internal browser surface is introduced

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, repositories, read models, preview routes, or policy summaries are downstream only.

5. Current official documentation for adopted browser-verification and low-noise interface practice.
   Use official Playwright guidance for locator strategy, actionability, auto-waiting, retries, trace capture, and resilient interaction design when an internal browser-visible surface is introduced.
   Use current Apple HIG and Material guidance for typography hierarchy, layout alignment, color-role discipline, accessibility, and restrained motion when an internal browser-visible surface is introduced.
   These sources never override Taxat semantics.

## Package and implementation placement rules

- Keep `pc_0126` and `pc_0127` inside the compute / decision package selected by `pc_0028`.
  If no dedicated package exists, create `packages/backend-compute` and emit `ASSUMPTION_DECISION_PACKAGE_CREATED`.
- Keep `pc_0128`, `pc_0129`, and `pc_0130` inside the provenance package selected by `pc_0028`.
  If no provenance package exists, create `packages/backend-provenance` and emit `ASSUMPTION_PROVENANCE_PACKAGE_CREATED`.
- Keep `pc_0131` and `pc_0132` inside the twin / projection package selected by `pc_0028`.
  If no twin package exists, create `packages/backend-twin` and emit `ASSUMPTION_TWIN_PACKAGE_CREATED`.
- Keep `pc_0133` inside the authority-domain package selected by `pc_0028`.
  If no authority package exists, create `packages/backend-authority` and emit `ASSUMPTION_AUTHORITY_PACKAGE_CREATED`.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Reuse canonical hashing, ordering, id generation, null-normalization, schema validation, deterministic seed, state-transition, reference-grammar, and config-freeze helpers from earlier cards rather than creating per-task variants.
- Respect phase boundaries.
  This block may complete gate, decision, provenance, proof, enquiry, twin, and first authority-domain foundations, but it must not silently absorb later generic submission transport, authority callback normalization, packet approval UX, customer shell, or notification work.
- If an internal browser-visible explorer is introduced, keep it read-only and operator-facing.
  Develop and verify it with Playwright using role / label / text / accessible-name locators, actionability-safe interactions, keyboard coverage, reduced-motion assertions, trace capture on retry, and deterministic seed fixtures.

## Shared internal surface design system for any optional verification pages

If you add a browser-visible internal explorer in this block, use the following visual and interaction contract unless the task-specific prompt narrows it further:

- Visual language: editorial, sparse, premium utility surface rather than a dashboard.
- Background: warm paper `#F7F5F0`.
- Primary panel surfaces: `#FFFFFF`.
- Primary ink: `#171717`.
- Secondary text: `#667085`.
- Accent / active trace: `#2F6FED`.
- Positive / resolved: `#0F766E`.
- Warning / limited: `#B7791F`.
- Critical / contradiction: `#C23616`.
- Borders: `rgba(23,23,23,0.08)`.
- Typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif.
- Type scale:
  - page title `28/32`, semibold
  - section title `18/24`, semibold
  - panel label `12/16`, medium, letter-spacing `0.04em`
  - body `14/22`, regular
  - code / ids `12/18`, ui-monospace / SF Mono fallback
- Layout:
  - max content width `1440px`
  - outer padding `24px` mobile, `32px` desktop
  - column gutters `20px`
  - card radius `18px`
  - sticky top filter / identity rail allowed when it improves orientation
- Motion:
  - no decorative motion, parallax, or spring overshoot
  - use opacity / translate transitions only
  - enter / focus / disclosure duration `140ms` to `180ms`
  - full reduced-motion support is mandatory
- Charts / diagrams:
  - prefer one restrained diagram over many charts
  - use linework, labels, and semantic color role accents only
  - no gradient-heavy analytics dashboards, no donut charts, no noisy heatmaps
- Icons / logos:
  - use one monochrome lineage / path / state icon family only
  - do not add brand-style mascots or decorative illustrations

## Non-negotiable interpretation rules

- Ordered gate evaluation is canonical and append-only.
  `gate_stage_index` freezes the stage order.
  Later gates may append additional records when their inputs arise post-seal, but they may not mutate or silently reorder earlier gate records.
- `GateDecisionRecord` is a first-class sealed decision artifact.
  `dominant_reason_code` must be the first emitted decisive reason, `effective_scope[]` must persist canonical authorized scope, and override semantics must remain explicit through `gate_semantics_contract{...}` plus `override_resolution_state`.
- `DecisionBundle` is the only persisted terminal or review projection for same-manifest idempotent retries.
  Every blocked, review-required, or completed post-allocation exit must route through `FINALIZE_TERMINAL_OUTCOME(...)`.
  Review-required runs still use `RunManifest.lifecycle_state = COMPLETED`; review posture lives on the gate chain, workflow refs, and `DecisionBundle.decision_status`.
- `DecisionBundle` outcome-bridge fields are not presentation sugar.
  They are durable recovery truth for queue reload, notification, resume, and replay-safe UX continuity.
- Provenance is manifest-scoped, machine-traversable, and filing-defensible.
  Every decisive artifact must have a generating activity, stable object node, admissible support path, and replay-safe identity.
  Do not collapse provenance into view-local JSON blobs.
- `ProofBundle` is the decisive filing-proof artifact.
  A stale or superseded bundle remains queryable for history and replay but cannot remain the controlling filing proof.
  `primary_path_ref` must stay inside the assessed decisive path set, and rejected materially distinct paths must be retained with deterministic order and rejection basis.
- `EnquiryPack` must preserve retention limits explicitly.
  Omitted material, masking posture, limitation notes, externalization governance, and retention binding are first-class typed contracts, not reader-side heuristics.
- Twin work must preserve separate internal and authority lanes.
  Authority truth cannot be inferred from internal readiness, and internal completion cannot masquerade as authority confirmation.
  One comparison subject produces one terminal delta class.
- `TwinPortfolioSummary` must aggregate persisted twin artifacts; it must not recompute parity or mismatch logic differently from the per-twin builders.
- `ObligationMirror` is a normalized internal mirror, not the settlement ledger.
  `SubmissionRecord` remains the legal-settlement spine, and only later tasks may implement its full lifecycle and authority truth projection.
- `FilingCase` and `FilingPacket` in this block are foundation models plus guarded construction helpers.
  Do not absorb live transmit, request-envelope canonicalization, OAuth, fraud-header emission, callback normalization, or response reconciliation here.
- All artifacts in this block must be replay-safe, deterministic, and schema-valid before persistence.
  Fail closed on missing frozen basis, invalid refs, contradictory authority posture, invalid proof closure, or unresolved comparison scope.

## Cross-task gap closure requirements

You must explicitly close the seams the source corpus leaves open in this tranche:

- The gate corpus defines exact ordered semantics before a reusable ordered-gate engine exists.
  Build the shared ordering profile and append-only write discipline here rather than scattering them across downstream gates.
- `DecisionBundle` references many child artifacts and recovery fields that earlier tasks only partially materialize.
  Finalization must fail closed when required refs are absent and must not synthesize terminal posture from client-visible heuristics.
- `EvidenceGraph` and `ProofBundle` depend on target-level assessment, admissibility, contradiction isolation, and replay closure, but the corpus spreads those rules across graph, proof, and filing contracts.
  Create one deterministic topology builder plus one deterministic closure/bundle assembler rather than allowing later filing work to improvise proof structure.
- `EnquiryPack` depends on retention-limited explainability rules that can easily drift from proof selection.
  Build omission, masking, and externalization policy as explicit sub-services now.
- Twin tasks require one comparable-subject universe, one delta precedence profile, one mismatch ranking algorithm, and one reconciliation budget posture.
  Do not let renderers or portfolio aggregators recalculate those semantics independently.
- Authority-domain foundations appear before the full submission lifecycle card.
  Keep `ObligationMirror`, `FilingCase`, and `FilingPacket` strict about authority-truth boundaries and defer transport / settlement behavior to later tasks.

## Testing and evidence requirements

- Validate every persisted artifact against its authoritative schema.
- Reuse deterministic seed fixtures from `pc_0077` for repeatable ids, timestamps, and ranking ties.
- Add unit tests for every ranking, ordering, hash, and state-transition rule introduced in this tranche.
- Add integration tests for cross-artifact lineage:
  gate -> decision bundle, graph -> proof bundle -> enquiry pack, twin lane -> reconciliation -> portfolio summary, filing case -> packet.
- Where a browser-visible internal surface is introduced, verify it with Playwright using:
  - semantic locators first
  - no raw CSS selectors unless wrapped by stable contracts
  - actionability-safe interactions
  - reduced-motion assertions
  - keyboard traversal
  - trace capture on retry
- Re-run `scripts/validate_contracts.py --self-test` and `tools/forensic_contract_guard.py` after assembling the implementation bundle.

## Definition of done for this block

This block is complete only when later agents can consume one authoritative ordered gate tape, one durable terminal bundle, one replay-safe provenance / proof / enquiry stack, one deterministic twin stack, and one strict authority-domain foundation without reconstructing semantics from UI code, queue heuristics, or live provider reads.
