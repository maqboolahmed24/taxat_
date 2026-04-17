# Shared Operating Contract For Cards pc_0054 To pc_0061

```text
You are an autonomous coding agent operating on the Taxat Core Engine corpus extracted from the attached archive.
Treat the full `Algorithm/` tree as the definitive source algorithm and the `PROMPT/` tree as the execution scaffold.

This eight-card block closes the runtime-foundation tranche and starts the executable repository/bootstrap tranche.
It covers:
- OpenTelemetry collection plus trace / metric / log backends,
- container registry, build signing, SBOM, provenance, and artifact attestation,
- DNS, TLS, WAF, edge, cache, and callback-origin delivery controls,
- CI/CD runners, environment-secret resolution, and ephemeral preview-account policy,
- a safe end-to-end smoke-validation matrix for all acquired external credentials,
- monorepo bootstrap for backend, browser, native, and shared packages,
- import of the authoritative JSON schemas, sample payloads, and Python validators into a shared-contracts package,
- and generated language bindings/types that remain strictly downstream of the canonical schema bundle.

This block is allowed to provision provider control planes, registries, collectors, edge services, CI systems, and developer tooling,
and it is allowed to shape premium browser-visible internal viewers.
It is NOT allowed to let any provider or tool redefine Taxat truth, audit law, release evidence, delivery-binding law,
cache-isolation law, schema semantics, or the canonical source order.

Authoritative source order you must honor:
1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and prior outputs from cards `pc_0001` through `pc_0053`,
   especially:
   - `pc_0018` external dependency / self-host register,
   - `pc_0019` stack ADR,
   - `pc_0020` storage / eventing ADR,
   - `pc_0021` identity / session ADR,
   - `pc_0028` repo / package boundary map,
   - `pc_0029` agent execution DAG,
   - `pc_0030` through `pc_0037` environment catalog, provisioning workspace, acceptance map, and HMRC bootstrap outputs,
   - `pc_0038` through `pc_0045` vault, IdP, email, push, monitoring, and support-provider outputs,
   - and `pc_0046` through `pc_0053` OCR, malware scan, secret-root, datastore, object-store, broker, and cache outputs.
2. `README.md`, `invention_and_system_boundary.md`, `architecture_coherence_guardrails.md`,
   `implementation_conventions.md`, `modules.md`, `core_engine.md`, and `data_model.md`
   for system truth, repo discipline, replay-safe implementation rules, package boundaries, and canonical artifact semantics.
3. `observability_and_audit_contract.md`,
   `security_and_runtime_hardening_contract.md`,
   `deployment_and_resilience_contract.md`,
   `verification_and_release_gates.md`,
   `release_candidate_identity_and_promotion_evidence_contract.md`,
   `manifest_and_config_freeze_contract.md`,
   and `retention_and_privacy.md`
   for telemetry-vs-audit separation, supply-chain requirements, runtime topology, promotion evidence, schema compatibility,
   restore/recovery expectations, secret boundaries, and privacy/retention constraints.
4. `northbound_api_and_session_contract.md`,
   `customer_client_portal_experience_contract.md`,
   `frontend_shell_and_interaction_law.md`,
   `cache_isolation_and_secure_reuse_contract.md`,
   `macos_native_operator_workspace_blueprint.md`,
   and `native_cache_hydration_purge_and_rebase_contract.md`
   for browser/native shell ownership, premium internal-surface behavior, route continuity, preview/download legality,
   cache/isolation rules, and signed native workspace posture.
5. The authoritative contracts under `Algorithm/schemas/`,
   all bundled `sample_*.json` payloads,
   `scripts/validate_contracts.py`,
   and `tools/forensic_contract_guard.py`.
   These are the executable source-of-truth artifacts for schema semantics and validator behavior.
6. Current official documentation for the chosen providers and tooling stack:
   OpenTelemetry,
   container registry / signing / attestation tooling,
   edge / DNS / WAF provider,
   CI provider,
   package manager / task graph tooling,
   and any code-generation tooling selected for schema bindings.
   Official docs are authoritative for provider mechanics and current limits only; they never override Taxat semantics.
7. Current official Playwright guidance plus official Apple HIG and Material guidance for browser-owned internal surfaces.
   Use them to shape locator strategy, reduced-motion behavior, accessibility, typography, layout, and restrained interaction craft.

Provider and tool resolution rules:
- Honor prior ADRs, inventories, and provider decisions first. Never switch vendors silently.
  When an earlier card fixed a provider or repo host, emit `PROVIDER_OVERRIDE_APPLIED` with source refs and obey it.
- Observability:
  - Honor any earlier monitoring-provider choice from `pc_0044`.
  - OpenTelemetry is the canonical collection/interchange layer for traces, metrics, and logs.
  - Vendor backends and monitoring tools are downstream sinks, not a replacement for first-party audit or durable operational evidence.
- Registry / signing / CI:
  - If a source-control / CI host was already fixed, use its native registry, artifact, OIDC, and attestation capabilities where they satisfy the security contract.
  - If unresolved, prefer a cohesive combination that supports immutable artifacts, workload identity, provenance attestations, SBOM retention,
    and release-evidence export without long-lived secrets.
  - If no lawful default exists, emit `BLOCKED_BY_PROVIDER_SELECTION` and still author portable contracts, schemas, and gap markers.
- Edge / DNS / WAF:
  - Use the already-selected DNS/edge provider if available.
  - If unresolved, prefer one platform that can hold DNS, TLS termination, WAF, rate limits, cache rules, and preview-domain separation together,
    but serialize the choice as `PROVIDER_DEFAULT_APPLIED` with rationale.
- Monorepo / build tooling:
  - Follow the stack ADR from `pc_0019` and the package map from `pc_0028`.
  - TypeScript is the primary product/application language, Python remains first-class for validators/tooling, and Swift remains first-class for the signed macOS workspace.
  - If no prior override exists, prefer a pnpm-workspace plus Turborepo style monorepo with explicit package boundaries and deterministic task graphing.
- Shared contracts and bindings:
  - The imported JSON schemas, sample payloads, and Python validator scripts remain authoritative.
  - Generated TypeScript/Python/Swift bindings are downstream artifacts only.
  - If a generator cannot faithfully express a schema family, emit `GENERATOR_GAP_*` and route through a typed adapter/manual gap record;
    do not silently hand-edit generated semantics.

Non-negotiable interpretation rules:
- Telemetry is not audit.
  Traces, metrics, and logs help explain runtime behavior.
  Append-only audit evidence proves compliance-significant facts.
  No collector, backend, vendor dashboard, or alert stream may stand in for required audit evidence.
- Release truth is not a CI dashboard.
  Promotion evidence SHALL bind to canonical release artifacts, compatibility gates, signatures, digests, SBOMs, provenance,
  sandbox coverage, and verification manifests.
- Immutable digests beat mutable tags.
  Registry tags are convenience pointers, not release truth.
  The durable identity of shipped artifacts remains digest-bound and candidate-bound.
- No build may be promotable without the supply-chain posture required by the corpus:
  signature / signing lineage,
  provenance or equivalent attestation,
  SBOM retention,
  vulnerability-gate posture,
  and macOS notarization whenever the signed desktop client is shipped.
- Edge, CDN, WAF, and preview tooling SHALL NOT widen Taxat visibility or caching law.
  Tenant/client partitioning, masking posture, route legality, preview binding, `delivery_binding_hash`,
  signed-download requirements, and callback-origin allowlists remain explicit and fail closed.
- Preview environments and preview accounts are not mini-production.
  They must remain environment-scoped, synthetic-data-safe, secret-minimized, and easy to tear down.
- Canonical schema semantics live in the imported source bundle and validator scripts, not in ad hoc generated code.
  `$id`, `$ref`, sample lineage, and custom validator invariants must remain preserved and traceable.
- Generated bindings may improve ergonomics, but they SHALL NOT invent missing fields, coerce exact-decimal strings into lossy floats,
  blur nullability, or erase schema version/hash lineage.
- Browser-visible internal surfaces in this block must be premium, minimal, and highly legible.
  Do not build generic admin dashboards, KPI walls, or “AI-ish” card grids.
  Prefer typography-led atlases, ledgers, topologies, and inspection panes.
- Playwright is mandatory for browser-owned work in this block:
  internal viewers, topology explorers, and any provider-browser provisioning flow that remains lawful.
  Use role-, label-, text-, and accessible-name locators first.
  Use stable `data-testid` anchors only where semantic locators need augmentation.
  Avoid brittle CSS selectors except as wrapped provider-fallback manifests with drift detection.
- Accessibility and reduced motion are mandatory.
  Every browser-owned viewer must expose landmarks, heading hierarchy, visible focus,
  keyboard order, and a reduced-motion mode that preserves meaning without large animated movement.

Engineering and delivery standards:
- Determinism first.
  Re-running against unchanged inputs must produce stable ordering, stable IDs, stable hashes where applicable,
  and stable machine-readable outputs.
- Idempotency first.
  Every provisioning or import flow must prefer detect-or-adopt, create-if-missing, update-if-drifted, and explicit no-op outcomes.
- Every machine-readable output must retain:
  `source_file`,
  `source_heading_or_logical_block`,
  concise rationale,
  and any upstream hash/version needed to prove lineage.
- Emit every unresolved point as a typed marker:
  `GAP_*`, `CONFLICT_*`, `ASSUMPTION_*`, `RISK_*`, `PROVIDER_DEFAULT_APPLIED`, `PROVIDER_OVERRIDE_APPLIED`,
  `BLOCKED_BY_PROVIDER_SELECTION`, `MANUAL_CHECKPOINT_REQUIRED`, `SELF_HOST_DECISION_REQUIRED`, `NOT_SELECTED`,
  `GENERATOR_GAP_*`, or `UPSTREAM_SCHEMA_DRIFT_DETECTED`.
  Never bury ambiguity in prose.
- Backend-oriented code must be typed, explicit, resumable, and safe by default:
  no unsafe shell execution,
  no hidden retries,
  no side effects before preconditions are validated,
  no raw secret or bearer-token persistence outside the governed vault boundary,
  and no control-plane actions hidden in browser viewers.
- Prefer pure-data policy files for topology, routing, retention, rate limits, preview policy, schema catalogs,
  coverage reports, generation matrices, and release admission criteria.
  Runtime code should consume those files instead of scattering product semantics across ad hoc conditionals.
- Treat every viewer as an evidence and inspection tool, not a substitute control plane.
  Viewers may explain topology, lineage, coverage, or policy, but they must not silently mutate infrastructure.

Cross-card evidence requirements across all eight cards:
- Persist one machine-readable topology, policy, or inventory record per provider/environment/topic family.
- Preserve strict separation between:
  durable truth records,
  operational telemetry,
  release-evidence artifacts,
  sanitized viewer data,
  and provider-local state.
- For provider-control-plane operations, store sanitized action receipts, selector-manifest version where relevant,
  vault refs instead of secrets, and concise operator/automation attestation.
- Where later implementation work depends on this block, serialize a machine-readable bridge artifact
  rather than assuming engineers will remember portal clicks or one-off terminal commands.

Cross-card validation you must perform:
- Validate JSON policy and inventory files against their schemas.
- Use unit/integration tests to prove forbidden shortcuts remain impossible:
  audit delegated to telemetry,
  tag-only release truth,
  preview environments reusing production secrets,
  edge caching widening access/masking context,
  imported schema drift going undetected,
  or generated bindings silently changing schema semantics.
- Use Playwright for every browser-owned viewer or browser-automation path in this block.
  Capture traces/screenshots/videos on failure or in explicit debug mode only, with redaction-safe defaults.
- Keep live-provider execution opt-in and environment-gated.
  CI/default local runs should use dry runs, fixtures, mocks, or masked provider stubs.
- Preserve the ability to run `python3 Algorithm/scripts/validate_contracts.py --self-test`
  and `python3 Algorithm/tools/forensic_contract_guard.py` as authoritative validation oracles after schema-import work.

Success posture for this block:
- A later implementation agent can stand up observability, supply-chain, edge, CI, and credential-smoke foundations
  without re-inventing release or runtime law from memory.
- The repository gains an executable monorepo skeleton aligned to the algorithm's package boundaries and shell ownership.
- The authoritative schema corpus becomes importable, testable, and reusable inside the repo without semantic drift.
- Language bindings become ergonomic downstream artifacts while canonical contract truth remains anchored to the original schemas and validators.
```
