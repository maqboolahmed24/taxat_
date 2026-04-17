# Shared Operating Contract for Tasks `pc_0070` to `pc_0077`

This block turns the foundational storage, messaging, config, and contract work from earlier cards into the first governed runtime fabrics that later application features will depend on directly.
The output of these eight cards must let a later implementation agent dispatch async work safely, stream low-noise state over resumable SSE, move upload bytes without corrupting request meaning, isolate caches by exact security and preview posture, resolve frozen configuration and feature-flag truth lawfully, propagate telemetry correlation without collapsing audit into logs, persist append-only audit evidence, and generate deterministic synthetic examples that prove the corpus end to end.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed prior cards `pc_0001` through `pc_0069`.
   Earlier ADRs, provider selections, package boundaries, policy files, and runtime abstractions win over fresh convenience choices.
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
   - `pc_0031` environment / tenant / provider catalog
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0051` object-store taxonomy
   - `pc_0052` queue / broker baseline
   - `pc_0053` cache and stream-resume store baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0059` monorepo bootstrap
   - `pc_0060` imported contracts / samples / validators bundle
   - `pc_0061` generated language bindings
   - `pc_0063` runtime config / secret loader abstraction
   - `pc_0064` canonical primitives
   - `pc_0065` reference / locator grammar
   - `pc_0066` migration framework
   - `pc_0067` inbox / outbox / idempotency foundation
   - `pc_0068` northbound command / problem / receipt scaffold
   - `pc_0069` object-storage abstraction

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `modules.md`
   - `data_model.md`
   - `contract_integrity_requirements.md`

3. This block's task-specific contracts:
   - `core_engine.md`
   - `deployment_and_resilience_contract.md`
   - `manifest_and_config_freeze_contract.md`
   - `config_freeze_inheritance_and_consumption_contract.md`
   - `manifest_start_claim_protocol.md`
   - `authority_interaction_protocol.md`
   - `error_model_and_remediation_model.md`
   - `northbound_api_and_session_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `upload_session_request_binding_and_rebase_contract.md`
   - `upload_session_recovery_harness_contract.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `native_cache_hydration_purge_and_rebase_contract.md`
   - `observability_and_audit_contract.md`
   - `audit_and_provenance.md`
   - `retention_error_and_observability_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `embodiments_and_examples.md`
   - `security_and_runtime_hardening_contract.md`
   - `retention_and_privacy.md`

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Runtime helpers, viewers, and provider adapters are downstream only.

5. Current official documentation for the adopted tooling and web standards.
   Use official docs for protocol mechanics, browser behavior, and current recommended practices only.
   They never override Taxat semantics.
   For this block, that includes:
   Playwright,
   MDN / WHATWG guidance for `EventSource` and SSE framing,
   the selected HTTP resumable-upload profile,
   the chosen feature-flag provider abstraction,
   OpenTelemetry propagation and signal guidance,
   and official Apple / Material guidance for browser-visible internal surfaces.

## Provider and tool resolution rules

- Never silently override a prior ADR or earlier completed card.
  When an earlier decision exists, obey it and emit a typed marker such as `PROVIDER_OVERRIDE_APPLIED`.
- If no earlier provider selection exists:
  - use Playwright for every browser-owned viewer and browser-facing development harness in this block
  - keep SSE as the default streaming transport profile
  - use a provider abstraction for feature-flag evaluation rather than coupling business logic directly to one SaaS SDK
  - use OpenTelemetry APIs / SDKs / propagators for telemetry bootstrap and context propagation
  - prefer resumable-upload semantics that preserve explicit upload session identity, checksum verification, and resume offset truth
- If a prior ADR or provider limitation blocks a default assumption, adapt the implementation while preserving corpus semantics and emit `PROVIDER_OVERRIDE_APPLIED`, `BLOCKED_BY_PROVIDER_SELECTION`, or the relevant `ASSUMPTION_*` marker.

## Non-negotiable interpretation rules

- The queue or broker is delivery fabric, not legal or operational system-of-record truth.
  Durable truth remains in manifests, control-store objects, inbox/outbox records, authority interaction records, receipts, and audit evidence.
  Broker loss must remain recoverable from durable stores.
- Ordering is lawful only within the declared ordering scope.
  No global FIFO, no tenant-wide serialization, and no queue partition rule that blocks unrelated manifests.
- Every worker in this block must consume manifest-bound identities and frozen execution inputs.
  Queue state, worker memory, and live provider config SHALL NOT replace `ConfigFreeze`, request-binding contracts, or persisted duplicate-truth lineage.
- `stream_recovery_contract{...}` is authoritative stream recovery truth.
  The raw `resume_token` is transport material only.
  Delivery must remain strictly monotonic and gap-free within one `frame_epoch`, with duplicate delivery idempotent by the corpus' scope/epoch/sequence rules.
- Rebase and access-rebind are fail-closed events.
  When epoch, route, session, access, masking, or schema truth drifts beyond lawful reuse, the runtime SHALL emit a typed rebase or rebind posture rather than improvising continuity.
- Upload transfer is not the same as request satisfaction.
  A successful byte transfer SHALL NOT imply attachment, current-request satisfaction, or customer-visible completion.
  The governed upload session, `storage_ref`, checksum posture, request-binding posture, and next-action posture remain distinct first-class truths.
- Cache reuse must be exact on tenant, client, principal/session, access binding, masking posture, route identity, canonical object identity, projection version, and preview selection.
  When drift occurs, broader or incompatible variants must purge immediately, including temp exports and preview residues.
- `ConfigFreeze` is execution truth.
  Feature-flag evaluation after seal must resolve to a governed snapshot or exact frozen reuse; no downstream worker may quietly re-resolve live flag state.
- Telemetry and audit are separate systems with shared correlation, not a merged bucket.
  Sampling, retention, and redaction rules for traces / metrics / logs SHALL NOT weaken append-only audit evidence.
- Canonical audit order is `audit_stream_ref + stream_sequence`, not wall-clock order.
  Audit writers must preserve append-only posture, tamper-evident linkage, and explicit visibility / retention classes.
- Synthetic fixtures are governed evidence artifacts, not disposable test data.
  Seeds, scenario bundles, golden packs, and embodiment mappings must remain deterministic, privacy-safe, and schema-valid.
- Browser-owned viewers in this block must be premium, low-noise, and evidence-led.
  No generic cloud dashboard styling, rainbow KPI grids, or vendor-console imitation.
  Prefer atlases, ledgers, ribbons, topology panes, and scenario cabinets implemented with inline SVG / CSS / semantic HTML.
- Playwright is mandatory for every browser-visible surface in this block.
  Favor role-, label-, text-, and accessible-name locators.
  Add stable `data-testid` anchors only when semantic locators need augmentation.
  Use actionability-safe interactions, trace-on-failure, and reduced-motion-aware assertions.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable hashes, sequences, fixture identities, viewer datasets, and policy records.
- Idempotency first.
  Detect-or-adopt, compare-and-swap, append-only sequencing, and explicit no-op outcomes are preferred over blind recreation or hidden retries.
- Every machine-readable record must retain:
  `source_file`,
  `source_heading_or_logical_block`,
  rationale,
  and any source hash / version required for lineage.
- Surface unresolved points explicitly with typed markers:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `PROVIDER_DEFAULT_APPLIED`, `PROVIDER_OVERRIDE_APPLIED`, `BLOCKED_BY_PROVIDER_SELECTION`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`, `SCHEMA_GAP_*`, `NOT_SELECTED`.
- Runtime code must be typed, fail-closed, resumable, and correlation-safe.
  No secret logging, no hidden payload dumping, no live re-resolution of frozen identities, no unsigned audit rewrites, and no viewer route that mutates state silently.
- Prefer machine-readable policy files and catalogs for queue families, retry budgets, event types, upload resume rules, cache scope matrices, config resolution bases, telemetry correlation keys, audit stream partitioning, and embodiment / fixture mappings.
  Runtime code should consume those files instead of scattering product semantics across conditionals.
- Internal viewers are inspection tools.
  They may simulate, explain, and verify, but they must not become ad hoc infrastructure control planes.

## Cross-card evidence and validation requirements

Across all eight cards, persist machine-readable records for:
- queue family topology, ordering scope, retry budget, and dead-letter posture
- stream scope classes, event types, rebase triggers, cursor states, and catch-up policy
- upload transfer checksum, resume, expiry, and completion-boundary rules
- cache identity dimensions, purge triggers, visibility partition keys, and preview/export reuse policy
- config-resolution basis, feature-flag snapshot posture, completeness barriers, and surface-hash derivation
- telemetry signal catalog, correlation-key matrix, sampling and retention classes, and log redaction policy
- audit event families, stream partitions, ordering policy, and tamper-evident continuity rules
- embodiment-to-fixture, fixture-to-test-vector, and fixture-to-constraint-traceability mappings

You must also:
- validate imported and newly added JSON artifacts against existing schemas where schemas exist
- create new schemas where the corpus exposes a first-class concept but no governed schema exists yet, and mark that as a `SCHEMA_GAP_*` closure
- preserve `python3 Algorithm/scripts/validate_contracts.py --self-test`
  and `python3 Algorithm/tools/forensic_contract_guard.py`
  as authoritative validation oracles after your changes
- use unit and integration tests to prove prohibited shortcuts stay impossible
- use Playwright for each internal viewer and for any lawful browser-facing test harness introduced by this block
- keep live provider or cloud actions opt-in and environment-gated
- capture traces, screenshots, and videos only on failure or explicit debug mode, with redaction-safe defaults
- verify reduced-motion behavior, keyboard traversal, heading hierarchy, and accessible names on every viewer page
- prove typed continuity under reconnect / retry / rebase / recovery cases rather than relying on screenshot approval only

## Success posture for this block

A later implementation agent should be able to:
- dispatch async work through a lawful queue abstraction without treating the broker as truth
- serve resumable SSE streams that obey epoch, sequence, and rebase semantics
- move upload bytes with checksum and resume support while preserving governed request meaning
- compute and enforce exact cache isolation and purge behavior across browser and native continuity paths
- resolve config versions and feature-flag snapshots into frozen execution truth without live drift
- bootstrap correlation-safe telemetry across HTTP, queue, stream, and browser boundaries
- persist append-only audit streams with stable sequencing and tamper-evident lineage
- run deterministic embodiment fixtures and golden packs that explain the corpus concretely without leaking real data
