# Shared Operating Contract for Tasks `pc_0086` to `pc_0093`

This block turns the freshly persisted `Tenant`, `User`, and `ActorSession` foundation into the first executable access-control core.
The output of these eight cards must let later implementation agents build access, delegation, authority-link, step-up, governance-mutation, session-revocation, and command-admission features on top of durable, hash-stable, schema-governed control objects instead of scattered framework conditionals.

The work in this block is backend-first.
Do not invent decorative product UI.
If an internal diagnostic, simulator, or inspection surface is added for developer or operator use, it must remain read-only or explicitly pre-commit, must use semantic HTML, low-noise premium styling, restrained motion, and Playwright-first validation.

## Mandatory source order

Treat sources in the following order of authority:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed prior cards `pc_0001` through `pc_0085`.
   Earlier ADRs, provider selections, package boundaries, generated-binding conventions, migration rules, access-matrix groundwork, and session policies win over fresh convenience choices.
   Especially consume:
   - `pc_0010` core engine and domain module graph
   - `pc_0011` entity and schema ownership map
   - `pc_0017` formulas, scoring, and deterministic math guidance
   - `pc_0021` identity and session ADR
   - `pc_0022` authority integration boundary ADR
   - `pc_0023` authority truth versus internal projection ADR
   - `pc_0027` release evidence and migration posture
   - `pc_0028` monorepo package boundary map
   - `pc_0029` autonomous execution DAG
   - `pc_0033` secret lineage policy
   - `pc_0034` HMRC sandbox bootstrap baseline
   - `pc_0038` vault lineage and connector credential baseline
   - `pc_0039` identity-provider tenant and client inventory
   - `pc_0040` step-up and session policy baseline
   - `pc_0043` telemetry and monitoring boundary baseline
   - `pc_0049` secret-root and KMS topology
   - `pc_0050` control-store versus audit-store baseline
   - `pc_0052` queue and message-fabric baseline
   - `pc_0053` cache and resume-store isolation baseline
   - `pc_0054` telemetry backend baseline
   - `pc_0060` imported contracts, examples, and validator bundle
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
   - `pc_0077` deterministic seed and embodiment fixture pack
   - `pc_0083` baseline access-control matrix and default role seeds
   - `pc_0084` release naming and artifact identity conventions
   - `pc_0085` tenant, user, and actor-session persistence models

2. Core corpus contracts:
   - `README.md`
   - `invention_and_system_boundary.md`
   - `architecture_coherence_guardrails.md`
   - `implementation_conventions.md`
   - `modules.md`
   - `data_model.md`
   - `contract_integrity_requirements.md`

3. This block's task-specific contracts:
   - `actor_and_authority_model.md`
   - `connector_delegation_contract.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `northbound_api_and_session_contract.md`
   - `admin_governance_console_architecture.md`
   - `security_and_runtime_hardening_contract.md`
   - `invariants_and_gates.md`
   - `audit_and_provenance.md`
   - `observability_and_audit_contract.md`
   - `retention_error_and_observability_contract.md`
   - `frontend_shell_and_interaction_law.md` only when an incidental internal surface is introduced
   - `semantic_selector_and_accessibility_contract.md` only when an incidental internal surface is introduced
   - `semantic_selector_and_accessibility_regression_pack_contract.md` only when an incidental internal surface is introduced

4. Authoritative executable artifacts under `Algorithm/schemas/`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py`.
   Schema semantics and validator-enforced invariants are authoritative.
   Human-readable docs, generated bindings, repositories, policies, and internal viewers are downstream only.

5. Current official documentation for adopted tools, security guidance, and HMRC workflow mechanics.
   Use official documentation for Playwright testing mechanics, browser-session hardening patterns, and current HMRC authorization terminology / constraints only.
   Those sources never override Taxat semantics.

## Provider and tool resolution rules

- Never silently override a prior ADR or completed card.
  When an earlier decision exists, obey it and emit a typed marker such as `PROVIDER_OVERRIDE_APPLIED`, `BLOCKED_BY_PROVIDER_SELECTION`, or `ASSUMPTION_PREVIOUS_CARD_NOT_IMPLEMENTED`.
- Place implementation in the package selected for backend access by `pc_0028`.
  If that package does not yet exist, create it and emit `ASSUMPTION_PACKAGE_BOUNDARY_CREATED`.
- Reuse generated bindings from `pc_0061` where they exist.
  Do not fork hand-written types that drift from schema truth unless you wrap them and preserve one generated source-of-truth layer.
- Keep persistence, hashing, and canonical serialization provider-neutral.
  Database- or cache-specific optimizations are allowed only behind abstractions that preserve the corpus semantics.
- Playwright is mandatory for every browser-visible surface introduced by this block, even if that surface is internal-only.
  Favor role-, label-, text-, and accessible-name locators, rely on actionability-safe interactions, capture traces on failure, and verify reduced-motion behavior.

## Non-negotiable interpretation rules

- `PrincipalContext`, `AuthorizationDecision`, `AuthorityLayerBoundaryContract`, `DelegationGrant`, `AuthorityLink`, `ExceptionalAuthorityGrant`, `GovernanceMutationHazardContract`, `GovernanceMutationBasisContract`, and `scope_execution_binding` are first-class governed control objects.
  They are not ad hoc request DTOs.
- Preserve layered authority as separate facts:
  internal tenant permission,
  client delegation,
  delegation freshness,
  authority-link readiness,
  exceptional authority,
  human-gate requirement / resolution,
  and authority-of-record precedence.
  Do not collapse these into one generic permission bitmask or one boolean "authorized" field.
- Preserve the distinction between:
  `requested_scope[]`,
  `effective_scope[]`,
  `effective_partition_scope_refs[]`,
  runtime `executable_scope[]`,
  and human-only masking posture.
  Downstream execution branches from executable or effective scope, never from raw caller intent.
- Masking affects only human-facing projections, exports, and presentation-safe views.
  Masking must never alter canonical facts, compute logic, authority packets, or authority-of-record bytes.
- Governance mutation legality requires both `AUTHORIZE(...)` and `SIMULATE_GOVERNANCE_MUTATION(...)` evaluated on the same frozen policy cut.
  Mixed policy snapshots, mixed dependency topologies, or mixed simulation bases must fail closed.
- `dependency_topology_hash` and `simulation_basis_hash` travel together.
  They are either both present or both absent.
  Mutation-capable governance decisions must preserve both.
- Service principals remain bound to the service rules in the corpus and schema bundle:
  `authn_level=BASIC`, `subject_identity_assurance_level=UNVERIFIED`, delegation basis only `TENANT_INTERNAL` or `SYSTEM_ASSIGNED`, no human approval capability sets, no client-portal capability sets, and no synthetic satisfaction of human-gate or step-up requirements.
- Imported or externalized delegation freshness is explicit.
  Anything stale, ambiguous, mismatched, or out of scope fails closed.
- Internally the algorithm may keep the basis name `DIGITAL_HANDSHAKE` because that is what the corpus uses.
  Any human-facing copy generated by implementation work must prefer HMRC's current user-facing term `authorisation link`.
- Main-agent versus supporting-agent constraints must be modeled as explicit capability and scope boundaries, not as scattered endpoint allowlists hidden in handlers.
- Browser session protections later in the wave must coexist with anti-CSRF tokens and secure cookie posture.
  Do not treat `SameSite` alone as a complete defense.
- Every revocation, authorization evaluation, step-up satisfaction, approval requirement, delegation refresh, authority-link change, exceptional-authority grant, and governance simulation that matters to decisioning must emit append-only audit lineage.

## Engineering and delivery standards

- Determinism first.
  Re-running unchanged inputs must produce stable principal-context payloads, authorization decisions, boundary contracts, simulation artifacts, hash values, migration outputs, and fixtures.
- Idempotency first.
  Compare-and-swap, detect-or-adopt, append-only evidence, version checks, and explicit no-op results are preferred over destructive rewrites or hidden retries.
- Every machine-readable record must retain `source_file`, `source_heading_or_logical_block`, rationale, and any source hash or version required for lineage.
- Surface unresolved points explicitly with typed markers:
  `GAP_*`, `ASSUMPTION_*`, `CONFLICT_*`, `RISK_*`, `MANUAL_CHECKPOINT_REQUIRED`,
  `UPSTREAM_SCHEMA_DRIFT_DETECTED`, `SCHEMA_GAP_*`, `NOT_SELECTED`, `POLICY_GAP_*`, `HMRC_CONSTRAINT_GAP_*`.
- Runtime code must be typed, fail-closed, resumable where appropriate, and secret-safe.
  No raw token logging, no authority-packet dumping, no fallback-to-allow when a policy artifact is missing, and no silently synthesized hashes from unordered data structures.
- Prefer machine-readable catalogs for:
  authn-level policy,
  approval requirement mapping,
  reason-code registries,
  authority-layer state interpretation,
  delegation freshness thresholds,
  exceptional-authority usage budgets,
  and hash-vector fixtures.
  Runtime services should consume those catalogs rather than scattering policy through conditionals.

## Cross-card evidence and validation requirements

Across all eight cards, persist machine-readable records for:
- principal-context construction inputs, canonical ordering decisions, snapshot refs, and resulting `policy_snapshot_hash` / `access_binding_hash`
- authorization decisions including reason-code lineage, masking posture, required approvals, required authn level, and pre-manifest exits
- authority-layer boundary packets and their layered state inputs
- delegation grants, authority links, exceptional-authority grants, lifecycle transitions, freshness posture, and usage exhaustion
- scope-execution bindings, narrowing posture, atomicity posture, and runtime enforcement outcomes
- governance simulation artifacts including topology inputs, simulation profile ref, hazard contract hash, basis contract hash, confidence / predictability / blast-radius outputs, and stale-guard checks
- authn-level and approval-policy resolution outcomes
- canonical hash fixtures that prove stable behavior across key ordering, list ordering, null handling, and replay

You must also:
- validate imported and newly added JSON artifacts against existing schemas where schemas exist
- create new schemas when this block introduces a first-class concept with no governed schema yet, and mark that as a `SCHEMA_GAP_*` closure
- preserve `python3 Algorithm/scripts/validate_contracts.py --self-test`
  and `python3 Algorithm/tools/forensic_contract_guard.py`
  as authoritative validation oracles after your changes
- add unit and integration tests that prove prohibited shortcuts stay impossible
- add deterministic fixtures for principal types, service principals, client-acting principals, stale delegation, missing authority link, masked access, step-up-required access, approval-required governance mutation, and bounded-safe mutation
- use Playwright only for any browser-visible diagnostic or admin surface introduced by this block, and keep those surfaces internal-only unless an existing route contract explicitly requires more
- verify reduced-motion behavior, keyboard traversal, heading hierarchy, accessible names, and trace capture on failure for any internal viewer page that is introduced

## Success posture for this block

A later implementation agent should be able to:
- resolve one durable `PrincipalContext` from session, actor, tenant, role, delegation, and authority-link facts without guessing
- evaluate `AUTHORIZE(...)` and downstream execution binding deterministically, including masking, partition narrowing, step-up, approval, and fail-closed denial
- persist and query delegation grants, authority links, and exceptional-authority grants with explicit lifecycle and freshness posture
- run governance access simulations against a frozen policy cut and carry the resulting hash basis into approvals, receipts, and later commits
- compute stable access-binding and dependency-topology hashes that survive replay and audit comparison
- hand the next cards a trustworthy substrate for session revocation, device binding, CSRF enforcement, authority requests, and northbound command admission
