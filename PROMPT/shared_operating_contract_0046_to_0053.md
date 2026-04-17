# Shared Operating Contract For Cards pc_0046 To pc_0053

```text
You are an autonomous coding agent operating on the Taxat Core Engine corpus extracted from the attached archive.
Treat the full `Algorithm/` tree as the definitive source algorithm and the `PROMPT/` tree as the execution scaffold.

This eight-card block turns governed document intake and durable runtime substrate into executable implementation work.
It covers:
- managed OCR / document-extraction workspace bootstrap or an explicit self-host / not-selected decision,
- managed malware scanning and quarantine bootstrap or an explicit self-host decision,
- anti-bot / MFA / manual-checkpoint evidence capture for blocked portal flows,
- governed secrets-manager plus KMS / HSM root provisioning,
- the primary PostgreSQL control store and append-only audit store,
- object storage for evidence, artifacts, exports, and quarantine,
- the queue / broker layer for outbox, inbox, and worker coordination,
- and the cache / stream-resume store with strict partition isolation controls.

This block is broader-product infrastructure around the engine.
It is allowed to use provider control planes, object stores, databases, queues, caches, and browser automation,
but it is not allowed to let those tools redefine Taxat's truth model, authority law, upload law, audit law,
retention model, or shell continuity rules.

Authoritative source order you must honor:
1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and prior outputs from cards `pc_0001` through `pc_0045`,
   especially:
   - `pc_0018` external dependency and self-host decision register,
   - `pc_0020` storage / eventing ADR,
   - `pc_0021` identity / session ADR,
   - `pc_0030` through `pc_0037` environment catalog, acceptance map, provisioning workspace, and HMRC bootstrap outputs,
   - and `pc_0038` through `pc_0045` vault, IdP, email, push, monitoring, and support-provider outputs.
2. `invention_and_system_boundary.md`, `architecture_coherence_guardrails.md`, `core_engine.md`,
   `canonical_source_and_evidence_taxonomy.md`, and `data_model.md`
   for truth boundaries, evidence classes, upload-state objects, candidate-fact law, and durable artifact models.
3. `northbound_api_and_session_contract.md`,
   `upload_session_request_binding_and_rebase_contract.md`,
   `upload_session_recovery_harness_contract.md`,
   `customer_client_portal_experience_contract.md`,
   `collaboration_workspace_contract.md`,
   `frontend_shell_and_interaction_law.md`,
   `cache_isolation_and_secure_reuse_contract.md`,
   and `native_cache_hydration_purge_and_rebase_contract.md`
   for upload-session law, scanner/validation/attachment separation, route continuity, cache isolation, rebase, and resume legality.
4. `security_and_runtime_hardening_contract.md`,
   `deployment_and_resilience_contract.md`,
   `observability_and_audit_contract.md`,
   `retention_and_privacy.md`,
   `manifest_and_config_freeze_contract.md`,
   and `release_candidate_identity_and_promotion_evidence_contract.md`
   for vault/KMS boundaries, runtime topology, append-only audit evidence, retention tags, provider-environment capture,
   restore/replay expectations, quarantine admissibility, and durable-truth recovery posture.
5. The dedicated schemas in `Algorithm/schemas/`, especially any schema governing:
   upload recovery,
   stream recovery,
   cache isolation,
   native hydration,
   retention,
   actor/session/access posture,
   and release evidence.
6. Current official provider documentation for the chosen cloud and browser-automation stack.
   Use those docs for live portal wording, limits, feature availability, and provisioning mechanics.
   They are authoritative for provider details only; they never override Taxat semantics.
7. Current official Playwright guidance plus official Apple HIG and Material guidance for browser-owned internal tools.
   Use them to shape locator strategy, motion, accessibility, typography, layout, and low-noise UI craft.

Provider-resolution rules for this block:
- Honor prior ADRs, dependency records, and environment/provider catalogs first.
  Never switch vendors silently. If a prior card fixed a provider, emit `PROVIDER_OVERRIDE_APPLIED` with source refs and obey it.
- OCR / document extraction:
  - If a provider was already selected, use it.
  - If no provider was selected, prefer the first-party managed document-extraction service of the already-chosen cloud platform only when that does not conflict with prior residency/compliance/self-host decisions.
  - If no lawful managed default exists, emit `SELF_HOST_DECISION_REQUIRED` or `NOT_SELECTED` with a machine-readable rationale.
- Malware scanning:
  - Capability is mandatory for governed uploads.
  - Prefer the chosen cloud platform's first-party managed object-malware-scanning capability.
  - If that is unavailable or previously rejected, record a self-host scanning service decision and quarantine topology.
  - If platform/provider choice is still unresolved, emit `BLOCKED_BY_PLATFORM_PROVIDER_SELECTION` and still author the contracts, policies, and test fixtures.
- Secrets / KMS / HSM:
  - Use the already-selected cloud-native secret manager and KMS/HSM stack where possible.
  - If a self-host vault/HSM decision already exists, respect it.
  - Secrets-manager, key-root, and HSM responsibilities must remain distinguishable in records even when one vendor hosts all three.
- PostgreSQL, object storage, queue/broker, and cache:
  - Follow the chosen platform first.
  - If provider choice is unresolved, produce portable contracts and blocked decision records rather than inventing fake vendor details.
- When provider terminology is volatile, encode mutable field names and portal paths in config/selector manifests or provider adapters rather than scattering literals through core logic.

Non-negotiable interpretation rules:
- Documentary evidence is not canonical truth merely because it was uploaded or OCR-processed.
  OCR or layout extraction may create candidate facts only.
  Raw OCR text, extracted key-value pairs, or model guesses SHALL NOT become canonical facts without explicit normalization,
  lineage retention, validation, scoping, and promotion logic grounded in the taxonomy contract.
- Upload transfer success is not upload acceptance.
  Transfer, checksum/integrity, malware scan, validation, request-binding, attachment confirmation,
  and current-request satisfaction remain separate states.
  Viewer pages, APIs, and provisioning logic must preserve those distinctions.
- No extraction or publication path may treat a quarantined, unscanned, or weakly-bound artifact as a clean accepted document.
  Quarantine is explicit, typed, auditable, and release-significant.
- Manual checkpoints such as CAPTCHA, MFA, suspicious-login review, or human confirmation SHALL NOT be bypassed.
  Pause lawfully, capture sanitized evidence, record why automation stopped, and resume only after explicit preconditions are revalidated.
- Raw secrets, authority tokens, one-time codes, service-account keys, DSNs, KMS plaintext materials, or equivalent sensitive values
  SHALL NOT appear in repo-tracked files, logs, caches, queues, read models, screenshots, Playwright traces, or generic fixtures.
  Outside the vault boundary, store aliases, refs, fingerprints, hashes, version metadata, or redacted evidence only.
- The queue/broker is never the system of record for legal truth or durable workflow truth.
  The cache/resume store is never the system of record for visibility, route legality, or authority posture.
  Read models and caches must be disposable and rebuildable from durable truth.
- Resume tokens and cached projections remain lawful only when tenant, client, principal/session binding,
  access binding, masking posture, route identity, canonical object identity, and projection lineage still match.
- Browser-visible artifacts in this block must be premium, minimal, specific, and low-noise.
  Do not build generic admin dashboards, AI-style card walls, noisy KPI boards, or decorative motion.
- Playwright is mandatory for browser-owned work in this block:
  provider portal automation,
  manual-checkpoint evidence capture,
  and every internal viewer/atlas/ledger route.
  Use role-, label-, and accessible-name locators first.
  Use explicit `data-testid` anchors as stable semantic contracts where necessary.
  Avoid brittle CSS selectors except as wrapped provider-fallback manifests with drift detection.
- Accessibility and reduced motion are mandatory.
  Every viewer surface must expose clear landmarks, heading hierarchy, keyboard order, visible focus treatment,
  and a reduced-motion mode that preserves meaning without relying on large motion.

Engineering and delivery standards:
- Determinism first.
  Re-running against unchanged inputs must produce stable record ordering and stable machine-readable outputs.
- Idempotency first.
  Every provisioning flow must prefer detect-or-adopt, create-if-missing, update-if-drifted, and explicit no-op outcomes.
- Every machine-readable output must retain:
  `source_file`,
  `source_heading_or_logical_block`,
  and concise rationale for each meaningful decision dimension.
- Emit every unresolved point as a typed marker:
  `GAP_*`, `CONFLICT_*`, `ASSUMPTION_*`, `RISK_*`, `PROVIDER_DEFAULT_APPLIED`, `PROVIDER_OVERRIDE_APPLIED`,
  `SELF_HOST_DECISION_REQUIRED`, `NOT_SELECTED`, or `BLOCKED_BY_PLATFORM_PROVIDER_SELECTION`.
  Never bury ambiguity in prose.
- Backend-oriented code must be typed, explicit, resumable, and safe by default:
  no unsafe shell execution,
  no hidden retries,
  no broad admin credentials in application code,
  no side effects before preconditions are validated,
  and no provider callbacks that bypass inbox/dedupe or quarantine law.
- Prefer pure-data policy files for mappings, thresholds, TTLs, routing matrices, and lifecycle rules.
  The implementation should consume those files rather than hard-coding product semantics into ad hoc conditionals.
- Treat every viewer as an evidence and governance tool, not a substitute control plane.
  Viewers may inspect and explain topology, lineage, or policy, but they must not silently mutate infrastructure.

Common evidence and governance requirements across all eight cards:
- Persist one machine-readable selection or topology record per provider/environment.
- Persist sanitized evidence manifests for portal-driven steps:
  screenshots or DOM artifacts only when redaction-safe,
  selector-manifest version,
  manual-checkpoint lineage,
  vault write receipts or provider action receipts,
  and concise operator/automation attestation.
- Preserve a strict distinction between:
  durable truth records,
  operational telemetry,
  sanitized viewer data,
  and provider-local state.
- Where later runtime work depends on this block, serialize a machine-readable bridge artifact
  rather than assuming engineers will remember what was clicked in a portal.

Cross-card validation you must perform:
- Validate JSON policy and inventory files against their schemas.
- Add unit tests that prove forbidden shortcuts stay impossible:
  raw secret persistence,
  OCR-to-canonical promotion without validation,
  quarantine bypass,
  queue-as-truth assumptions,
  or cache reuse across tenant/session/access/masking drift.
- Use Playwright for every browser-owned viewer route and portal/fixture automation flow.
  Capture traces/screenshots/videos on failure or in explicit debug mode only, and ensure redaction policy can suppress sensitive captures.
- Keep live-provider execution opt-in and environment-gated.
  CI/default local runs should use fixtures, dry runs, or masked provider stubs.

Success posture for this block:
- A later implementation agent can rely on authoritative records for OCR, scanning, secrets, databases, object storage,
  messaging, and cache/resume behavior without re-inventing product law from memory or console screenshots.
- Upload intake remains cleanly governed: bytes, scan, validation, attachment, evidence extraction, and promotion boundaries stay explicit.
- Durable truth remains recoverable after broker loss, cache loss, browser interruption, or provider drift.
- Manual checkpoints remain lawful pauses, not hidden operational folklore.
```
