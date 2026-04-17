# Shared Operating Contract for Tasks `pc_0062` to `pc_0069`

This block turns the imported contract corpus and monorepo bootstrap into executable developer-experience and runtime-boundary foundations.
The output of these eight cards must let a later implementation agent enforce quality, load runtime environment safely, preserve canonical hashing/decimal/time behavior, name and locate artifacts consistently, migrate storage safely, move messages idempotently, expose a lawful northbound command boundary, and govern object lifecycles without re-inventing semantics from memory.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed prior cards `pc_0001` through `pc_0061`.
   Earlier ADRs, provider selections, and machine-readable inventories win over fresh convenience choices.
   Especially consume:
   - `pc_0019` stack ADR
   - `pc_0020` storage / eventing ADR
   - `pc_0021` identity / session ADR
   - `pc_0028` repo and package ownership map
   - `pc_0029` execution DAG / agent protocol
   - `pc_0031` environment and tenant/provider catalog
   - `pc_0038` vaulted credential lineage
   - `pc_0048` secret-root topology
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0051` bucket / object-store taxonomy
   - `pc_0052` message-fabric contract pack
   - `pc_0053` cache and secure-reuse policy
   - `pc_0059` monorepo bootstrap
   - `pc_0060` imported schema / sample / validator bundle
   - `pc_0061` generated language bindings

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `modules.md`
   - `data_model.md`
   - `contract_integrity_requirements.md`

3. This block's task-specific contracts:
   - `manifest_and_config_freeze_contract.md`
   - `config_freeze_inheritance_and_consumption_contract.md`
   - `authority_interaction_protocol.md`
   - `northbound_api_and_session_contract.md`
   - `deployment_and_resilience_contract.md`
   - `security_and_runtime_hardening_contract.md`
   - `retention_and_privacy.md`
   - `observability_and_audit_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `customer_client_portal_experience_contract.md`
   - `collaboration_workspace_contract.md`
   - `upload_session_recovery_harness_contract.md`
   - `upload_session_request_binding_and_rebase_contract.md`

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Generated runtime code, helper libraries, or UI conveniences are downstream only.

5. Current official documentation for the adopted tooling.
   Use official docs for tool mechanics, current limits, and current recommended patterns only.
   They never override Taxat semantics.
   For this block, that includes:
   Playwright,
   Biome,
   Ruff,
   pre-commit,
   the selected Python type checker,
   the selected migration/runtime tooling,
   PostgreSQL or the ADR-approved datastore,
   and official Apple / Material design guidance for browser-visible internal surfaces.

## Provider and tool resolution rules

- Never silently override a prior ADR or earlier completed card.
  When an earlier decision exists, obey it and emit a typed marker such as `PROVIDER_OVERRIDE_APPLIED`.
- If no earlier decision exists, the defaults for this block are:
  - Biome for JS/TS formatting + linting
  - Ruff plus one explicit Python type checker for Python quality gates
  - pre-commit as the outer commit-hook orchestrator
  - Playwright for browser-owned automation and browser-visible internal surfaces
  - datastore-native migrations aligned to the control-store ADR
  - SHA-256 over the project's canonical serialization profile for canonical hash helpers
- If the datastore or provider chosen earlier does not support a default assumption,
  adapt the implementation while preserving the corpus semantics and emit `PROVIDER_OVERRIDE_APPLIED` or `ASSUMPTION_*`.

## Non-negotiable interpretation rules

- Tooling exists to protect corpus truth, not replace it.
  Formatter / linter / type-checker choices SHALL NOT mutate normative schema or runtime semantics.
- `ConfigFreeze` is execution truth.
  Live environment variables are only bootstrap inputs to loaders, not a substitute execution basis.
  No worker may silently fall back from missing frozen config to fresh environment reads.
- Deterministic serialization is a legal boundary, not a convenience helper.
  Canonical hashes SHALL preserve the corpus' rules for key ordering, Unicode normalization, array-order semantics, null handling, and timezone normalization.
- Exact decimals remain exact strings at persistence, contract, and replay boundaries.
  No helper, generated model, or convenience API may coerce a canonical exact-decimal string into a lossy float.
- References and locators are contract objects, not ad hoc filenames.
  `*_id`, `*_ref`, `*_hash`, route tokens, signed download targets, preview targets, and storage refs SHALL remain distinguishable.
  No secret, bearer token, raw storage URL, or mutable UI breadcrumb may become authoritative locator truth.
- Expand → backfill → verify → contract is mandatory for schema evolution.
  In-flight manifests and compatibility windows must remain lawful throughout.
- Outbox / inbox infrastructure coordinates side effects.
  It is not the authoritative business record.
  Broker packets SHALL prefer opaque refs plus typed lineage over broad duplicated business truth.
- Northbound command handling must preserve the command truth boundary.
  Durable `ApiCommandReceipt` and typed `ProblemEnvelope` truth drive client explanations; local optimistic inference does not.
- Object storage is never the system of record by itself.
  Quarantine state, malware posture, delivery binding, signed-delivery policy, and retention lifecycle SHALL remain explicit and queryable.
- Browser-owned viewers in this block must be premium, low-noise, and evidence-led.
  No generic admin dashboard styling, rainbow KPI grids, or decorative charts.
  Prefer ledgers, atlases, topology panes, and semantic inspection surfaces.
- Playwright is mandatory for every browser-visible surface in this block.
  Favor role-, label-, text-, and accessible-name locators.
  Add stable `data-testid` anchors only when semantic locators need augmentation.
  Use actionability-safe interactions and redaction-safe traces on failure.

## Engineering and delivery standards

- Determinism first.
  Re-running against unchanged inputs must produce stable ordering, hashes, filenames, machine-readable records, and UI datasets.
- Idempotency first.
  Setups and bootstrap scripts must prefer detect-or-adopt, create-if-missing, and explicit no-op outcomes over blind recreation.
- Every machine-readable record must retain:
  `source_file`,
  `source_heading_or_logical_block`,
  rationale,
  and any source hash / version required for lineage.
- Surface all unresolved points explicitly using typed markers:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `PROVIDER_DEFAULT_APPLIED`, `PROVIDER_OVERRIDE_APPLIED`, `BLOCKED_BY_PROVIDER_SELECTION`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`, `GENERATOR_GAP_*`, `NOT_SELECTED`.
- Backend and runtime code must be typed, fail-closed, and resumable.
  No hidden retries, no unsafe shell-outs, no secret logging, no silent fallback to live mutable state, and no viewer routes with hidden side effects.
- Prefer machine-readable policy files and catalogs for quality matrices, naming grammar, migration windows, retry policy, retention hooks, and viewer data sources.
  Runtime code should consume those files instead of scattering product semantics across conditionals.
- Treat internal viewers as inspection and evidence tools, not substitute control planes.
  They may explain and verify, but they must not silently mutate infrastructure.

## Cross-card evidence and validation requirements

Across all eight cards, persist machine-readable records for:
- quality-gate coverage
- runtime environment / secret policy
- canonical primitive profiles
- reference / locator grammar
- migration compatibility windows
- outbox / inbox / idempotency policy
- northbound command family and stale-guard policy
- object lifecycle, quarantine, and retention hooks

You must also:
- validate new JSON policy files against their schemas where schemas exist, or create schemas where the repo has no prior shape
- preserve `python3 Algorithm/scripts/validate_contracts.py --self-test`
  and `python3 Algorithm/tools/forensic_contract_guard.py`
  as authoritative validation oracles after your changes
- use unit and integration tests to prove prohibited shortcuts stay impossible
- use Playwright for each internal viewer and for any lawful browser automation path introduced by this block
- keep live provider / live datastore actions opt-in and environment-gated
- capture traces, screenshots, and videos only on failure or explicit debug mode, with redaction-safe defaults
- verify reduced-motion behavior, keyboard traversal, heading hierarchy, and accessible names on every viewer page

## Success posture for this block

A later implementation agent should be able to:
- bootstrap repo quality gates without guessing tool ownership or scope
- load environment and secret material safely while preserving `ConfigFreeze` primacy
- reuse a canonical primitives library for IDs, hashes, decimals, and time
- name and locate artifacts consistently across runtime, storage, API, and UI surfaces
- evolve the control datastore safely under compatibility windows
- dispatch and ingest side effects idempotently
- expose a lawful command / receipt / problem boundary
- manage object storage lifecycle, quarantine, delivery, and retention hooks without inventing hidden rules
