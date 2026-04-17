# Shared Operating Contract for Tasks `pc_0078` to `pc_0085`

This block turns the previously defined runtime abstractions into a runnable engineering platform.
The output of these eight cards must let later implementation agents boot a governed local stack, create disposable test environments safely, detect schema drift before migrations become dangerous, publish a trustworthy contract observatory, operate the repo through one canonical task surface, establish the first authoritative access matrix, bind release naming to promotion evidence, and enter Phase 03 with durable tenant / user / session persistence that matches the actor model.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed prior cards `pc_0001` through `pc_0077`.
   Earlier ADRs, provider selections, package boundaries, catalogs, abstractions, and machine-readable policies win over fresh convenience choices.
   Especially consume:
   - `pc_0019` primary stack ADR
   - `pc_0020` storage and eventing ADR
   - `pc_0021` identity / session ADR
   - `pc_0022` authority integration boundary ADR
   - `pc_0023` projection strategy ADR
   - `pc_0024` web frontend topology ADR
   - `pc_0026` deterministic testing / replay ADR
   - `pc_0027` release evidence and migration ADR
   - `pc_0028` monorepo package boundary map
   - `pc_0029` autonomous execution DAG
   - `pc_0030` definition-of-done matrix
   - `pc_0031` environment / tenant / provider catalog
   - `pc_0032` provisioning automation workspace
   - `pc_0033` secret lineage policy
   - `pc_0034` HMRC sandbox bootstrap baseline
   - `pc_0038` credential-vault lineage baseline
   - `pc_0039` identity provider tenant / client inventory
   - `pc_0040` step-up and session policy pack
   - `pc_0041` transactional email baseline
   - `pc_0042` push and cross-device baseline
   - `pc_0043` telemetry / monitoring boundary baseline
   - `pc_0044` contextual help and support boundary
   - `pc_0046` OCR/document-understanding boundary
   - `pc_0047` malware scan and quarantine baseline
   - `pc_0048` manual-checkpoint evidence model
   - `pc_0049` secret-root and KMS topology
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0051` object-store taxonomy
   - `pc_0052` queue / broker baseline
   - `pc_0053` cache and stream-resume store baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0055` release supply-chain truth
   - `pc_0056` edge and cache boundary law
   - `pc_0057` preview / CI environment isolation
   - `pc_0058` credential-smoke and bootstrap evidence
   - `pc_0059` monorepo bootstrap
   - `pc_0060` imported contracts / samples / validators bundle
   - `pc_0061` generated language bindings
   - `pc_0062` repo quality enforcement
   - `pc_0063` frozen config versus runtime-env abstraction
   - `pc_0064` canonical primitive semantics
   - `pc_0065` reference / locator grammar
   - `pc_0066` migration framework
   - `pc_0067` inbox / outbox / idempotency foundation
   - `pc_0068` northbound command / problem / receipt scaffold
   - `pc_0069` object-storage abstraction
   - `pc_0070` queue abstraction
   - `pc_0071` streaming abstraction
   - `pc_0072` resumable upload abstraction
   - `pc_0073` cache isolation implementation
   - `pc_0074` config freeze and feature-flag resolution
   - `pc_0075` telemetry correlation and propagation
   - `pc_0076` append-only audit stream foundation
   - `pc_0077` deterministic seed and embodiment fixture pack

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `modules.md`
   - `data_model.md`
   - `contract_integrity_requirements.md`

3. This block's task-specific contracts:
   - `deployment_and_resilience_contract.md`
   - `verification_and_release_gates.md`
   - `replay_and_reproducibility_contract.md`
   - `release_candidate_identity_and_promotion_evidence_contract.md`
   - `manifest_and_config_freeze_contract.md`
   - `manifest_start_claim_protocol.md`
   - `config_freeze_inheritance_and_consumption_contract.md`
   - `actor_and_authority_model.md`
   - `admin_governance_console_architecture.md`
   - `northbound_api_and_session_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `security_and_runtime_hardening_contract.md`
   - `observability_and_audit_contract.md`
   - `retention_error_and_observability_contract.md`
   - `audit_and_provenance.md`
   - `retention_and_privacy.md`
   - `UIUX_DESIGN_SKILL.md`

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, generated code, local-stack helpers, viewers, task runners, and policy wrappers are downstream only.

5. Current official documentation for the adopted tooling and browser/platform guidance.
   Use official docs for mechanics, APIs, browser testing practice, and current design-system guidance only.
   They never override Taxat semantics.
   For this block, that includes Playwright, official browser and accessibility guidance, and the chosen language/tooling package managers and build tools.

## Provider and tool resolution rules

- Never silently override a prior ADR or completed card.
  When an earlier decision exists, obey it and emit a typed marker such as `PROVIDER_OVERRIDE_APPLIED`, `BLOCKED_BY_PROVIDER_SELECTION`, or `ASSUMPTION_PREVIOUS_CARD_NOT_IMPLEMENTED`.
- If a prior card selected concrete providers for database, queue, cache, object storage, auth, email, or telemetry, reuse those selections for local and ephemeral environments unless the provider is impossible to run locally.
- When a production provider is not practical for local or ephemeral execution, create a governed compatibility layer that preserves the corpus semantics and emit `PROVIDER_LOCAL_EMULATION_ADOPTED`.
- Playwright is mandatory for every browser-visible surface in this block.
  Favor role-, label-, text-, and accessible-name locators.
  Add stable `data-testid` anchors only when semantic locators need augmentation.
  Use actionability-safe interactions, trace-on-failure, and reduced-motion-aware assertions.

## Non-negotiable interpretation rules

- Local development and ephemeral test stacks must mirror product semantics, not vendor admin consoles.
  Durable truth lives in control-store records, append-only audit records, object-store artifacts, manifests, inbox/outbox rows, and governed session/access objects.
  Queue, cache, search indexes, read models, generated docs bundles, and local emulators are disposable and rebuildable.
- Any stack bootstrap or reset flow must be namespace-aware, deterministic, and fail-closed.
  It must be impossible for a convenience reset command to touch shared staging or production resources without an explicit environment-gated override and a typed manual checkpoint.
- Migrations remain governed by `expand -> migrate/backfill -> verify -> contract`.
  Destructive changes are illegal while historical manifests, replay windows, supported client windows, or compatibility gates say otherwise.
- Generated documentation is not a free-form wiki.
  It must derive from the authoritative corpus, live schemas, examples, traceability, and machine-readable indexes.
  Broken cross-links, stale schema tokens, and undocumented support-doc dependencies are release-blocking defects.
- Access control must preserve the actor model's separate layers:
  internal tenant role,
  client delegation,
  external authority link,
  exceptional authority,
  and optional authority-of-record precedence.
  Do not collapse these into one generic permission table.
- Release branches, versions, and artifact names must bind to candidate identity, schema bundle, config bundle, compatibility posture, and channel semantics.
  Human-friendly names may exist, but the machine identity must stay canonical.
- `ActorSession` is a durable control object, not an implementation detail hidden in cookies or bearer tokens.
  Session revocation, device binding, anti-CSRF posture, step-up completion, and monotonic timestamps must remain explicit and queryable.
- Browser-visible surfaces in this block must be premium, low-noise, and evidence-led.
  Avoid generic cloud-console dashboards, colorful KPI walls, or documentation-site boilerplate that ignores the Taxat shell language.
  Prefer atlases, ledgers, cabinets, topology desks, matrices, and inspection rails built with semantic HTML, inline SVG, restrained color, and purposeful motion.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable environment manifests, drift reports, docs-site indexes, role matrices, release identities, and persistence migrations.
- Idempotency first.
  Detect-or-adopt, compare-and-swap, append-only evidence, and explicit no-op outcomes are preferred over blind recreation or hidden retries.
- Every machine-readable record must retain `source_file`, `source_heading_or_logical_block`, rationale, and any source hash / version required for lineage.
- Surface unresolved points explicitly with typed markers:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `PROVIDER_DEFAULT_APPLIED`, `PROVIDER_OVERRIDE_APPLIED`, `PROVIDER_LOCAL_EMULATION_ADOPTED`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`, `SCHEMA_GAP_*`, `NOT_SELECTED`.
- Runtime code must be typed, fail-closed, resumable, and secret-safe.
  No secret logging, no hidden payload dumping, no environment-local shortcuts that bypass corpus safety rules, no docs generator that silently swallows unresolved links, and no role seed that defaults to allow when source truth is missing.
- Prefer machine-readable catalogs for:
  local runtime topology,
  bootstrap order,
  reset scope,
  schema drift severities,
  docs navigation,
  repo tasks,
  role templates,
  approval and step-up policies,
  branching rules,
  release channels,
  artifact naming,
  and session lifecycle.
  Runtime code should consume those files instead of scattering policy across conditionals.

## Cross-card evidence and validation requirements

Across all eight cards, persist machine-readable records for:
- local service topology, health posture, seed profile, and disposable-versus-durable classification
- ephemeral environment identity, seeded fixture basis, reset scope, reset chronology, and cleanliness verification
- schema drift deltas, compatibility verdicts, reader-window posture, and migration-readiness reasons
- contract-doc navigation, search index, schema / prose / example cross-links, and source-to-heading lineage
- repository task namespaces, entrypoint contracts, agent-safe command wrappers, and dry-run behavior
- default roles, resource classes, action families, masking / approval / step-up posture, and simulator lineage
- branch families, release channels, version derivation, artifact naming templates, and candidate-identity bindings
- tenant / user / session schemas, migrations, indexes, revocation / expiry posture, and seeded reference data

You must also:
- validate imported and newly added JSON artifacts against existing schemas where schemas exist
- create new schemas where the corpus exposes a first-class concept but no governed schema exists yet, and mark that as a `SCHEMA_GAP_*` closure
- preserve `python3 Algorithm/scripts/validate_contracts.py --self-test`
  and `python3 Algorithm/tools/forensic_contract_guard.py`
  as authoritative validation oracles after your changes
- add unit and integration tests that prove prohibited shortcuts stay impossible
- use Playwright for each browser-visible viewer or internal route introduced by this block and for end-to-end flows that depend on ephemeral environments
- keep live cloud actions opt-in and environment-gated
- capture traces, screenshots, and videos only on failure or explicit debug mode, with redaction-safe defaults
- verify reduced-motion behavior, keyboard traversal, heading hierarchy, accessible names, and copy-safe redaction on every viewer page
- prove deterministic behavior under repeated bootstrap, reset, docs generation, drift analysis, role seeding, release-name derivation, and session lifecycle transitions

## Success posture for this block

A later implementation agent should be able to:
- start a faithful local Taxat runtime with database, audit store, object storage, queue, cache, and seed data using one governed bootstrap command
- create disposable, deterministic test environments and reset them safely between suites without touching forbidden scopes
- detect schema drift, migration danger, and compatibility-window violations before release evidence is assembled
- browse a generated contract observatory that links prose, schemas, examples, validators, and bindings without manual curation
- use one canonical task runner and one agent-entrypoint surface rather than memorizing ad hoc commands
- inspect and seed a first authoritative access matrix that preserves layered authority semantics
- derive release branches, versions, and artifact names that line up with candidate identity and promotion evidence
- persist tenants, users, and actor sessions in a form that later authorization, step-up, revocation, and cross-device continuity work can trust
