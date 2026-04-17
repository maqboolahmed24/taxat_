# Verification and Release Gates

## Purpose

`test_vectors.md` covers business-scenario exemplars, but production readiness also requires a complete
verification matrix spanning schemas, state machines, transport contracts, security controls,
performance posture, and restore behavior. This contract defines the mandatory test families and the
release gate that binds them.

## 1. Required test families

### A. Schema and contract validation

- validate every artifact schema under `schemas/`
- validate at least one representative positive sample payload for every authoritative artifact family
- validate negative fixtures for schema closure, enum drift, nullability boundaries, and required-field omissions
- verify frozen-schema replay/read compatibility using prior-version fixtures wherever backward-compatible reader support is claimed
- validate northbound problem/receipt/read surfaces against their frozen contracts
- reject undeclared shape drift and incompatible required-field changes

### B. Deterministic module and formula tests

- unit-test every deterministic helper used by manifest, trust, parity, drift, twin, gate logic, and nightly portfolio ordering
- verify money/value arithmetic, thresholds, and ordering under exact-decimal semantics
- persist one candidate-bound `DeterministicGoldenPack` for the blocking deterministic and state-machine suite, covering ordered null slots, exact-decimal strings, named lifecycle transitions, replay hashes, and deterministic cadence fixtures
- verify duplicate suppression and request-hash determinism
- verify mirrored twin-state assembly, comparison-key normalization, delta-class precedence, and
  mismatch-priority ranking determinism
- verify nightly selection, priority, shard-planning, and digest-grouping determinism from frozen batch inputs

### C. State-machine and model-based tests

- exercise every legal and illegal transition in `state_machines.md`, including `NightlyBatchRun.lifecycle_state`
- use model-based/property-based test generation for lifecycle transitions, retries, and recovery paths
- prove that illegal transitions fail closed with typed reasons rather than process crashes

### D. Northbound API and operator-workspace contract tests

- command receipt replay tests
- stale-view rejection tests
- `ExperienceDelta` ordering/resume/rebase tests
- terminal reload and focus-anchor continuity tests
- native cold-start snapshot hydration, cache invalidation, and relaunch rebase tests
- compatibility-matrix tests across the supported browser/native client window, including oldest-supported client against current server contracts and current client against rollback-safe server contracts where that window is promised
- client-local persistence migration tests for upgrade, relaunch, tenant switch, and forced rebase under the supported desktop compatibility policy
- Playwright journeys for shipped web surfaces and XCUITest journeys for the native macOS shell,
  step-up / approval / blocked-state flows, and multi-window investigation paths

### E. Authority and controlled-edge integration tests

- sandbox authority tests for each enabled `AuthorityOperationProfile`
- candidate-bound `authority_sandbox_coverage_contract{...}` proving the exact enabled
  provider-profile set, exact required operation-family set, request-identity namespace isolation,
  and canonical replay-safe evidence refs exercised by the authority sandbox suite
- token-binding and fraud-header validation tests
- callback/inbox dedupe tests
- send-time binding-lineage invalidation and token-rotation fail-closed tests for queued authority mutations
- grouped binding-drift sentinel tests proving transmit, reconciliation poll, and recovery read all
  persist the same checked identity tuple, duplicate-truth posture, transmit-claim posture where
  applicable, and named blocked outcomes before any live network action
- authenticated ingress correlation/quarantine tests for weak-bound, ambiguous, or unbound callback, poll, or recovery payloads
- authenticated ingress tests proving bound or normalized `AuthorityIngressReceipt` artifacts retain
  the correlated request hash, idempotency key, bound interaction ref, persisted `response_body_ref`,
  checkpoint audit evidence, `authority_ingress_correlation_contract{...}`, and canonical
  `ingress_receipt_ref` on every async normalized response
- duplicate-suppression tests proving callback, poll, and recovery replays persist
  `receipt_state = DUPLICATE_SUPPRESSED`, point to one `canonical_ingress_receipt_ref`, and do not
  mutate state twice
- ingress-investigation snapshot tests proving quarantined or duplicate-suppressed payloads remain
  explainable from persisted payload, audit, and lineage artifacts alone, with only non-mutating
  safe next actions published to operators
- callback/poll competition tests proving corroborating observations stay no-op while conflicting
  observations force `ACK_INCONSISTENT_STATE`, response-history preservation, and reconciliation
- timeout-followed-by-callback/poll/recovery tests proving the later observation only supersedes the
  timeout placeholder through explicit response lineage plus reconciliation, never by silent
  overwrite
- reconciliation-runtime tests proving `reconciliation_attempt_count`,
  `next_reconciliation_at`, `reconciliation_budget_state`, and `resend_legality_state` survive
  recovery, replay, queue rebuild, and stale-worker reclaim without resetting to a fresh retry loop
- exhaustion and contradiction tests proving automatic resend stops once the interaction reaches
  `BLOCKED_BY_RECONCILIATION` or `BLOCKED_BY_ESCALATION`, with workflow handoff preserved
- pending/unknown/out-of-band reconciliation tests
- partial authority acknowledgement, contradictory authority-component, and missing-baseline twin
  reconciliation tests
- reconciliation-budget exhaustion and escalation tests proving no blind resend occurs after the profile-defined automatic budget is exhausted

### F. Security verification

- session fixation / step-up / revocation tests
- anti-CSRF tests for browser write surfaces
- Keychain/session-storage hygiene, local cache purge, and signed/notarized build verification for the
  macOS workspace
- cross-tenant and cross-mask cache isolation tests
- secret redaction tests for logs, queues, and traces
- dependency/build provenance verification
- SSRF and egress-policy tests for fetcher components

### G. Performance and failure-mode tests

- load, soak, and burst tests for command acceptance and stream fan-out
- queue backlog and backpressure tests
- canary health-gate tests
- chaos/fault-injection tests around worker crash, broker loss, provider timeouts, and stale nightly-shard heartbeat reclaim
- queue rebuild and broker-loss recovery tests proving outbox/inbox recovery does not blindly resend live authority mutations
- restore drills executed against the current release candidate whenever schema, migration, authority-transport, nightly-orchestration, or local-persistence behavior changed in the release
- restore drill and DR failover/failback tests

## 2. Release gate

A release is production-eligible only when all blocking gates pass.

Promotion evidence SHALL be persisted as a first-class `ReleaseVerificationManifest` validating
against `schemas/release_verification_manifest.schema.json` rather than reconstructed from CI logs or
dashboard screenshots.

The gate-evidence layer SHALL also validate against dedicated schemas in `schemas/` for
`DeterministicGoldenPack`, `VerificationSuiteResult`, `GateAdmissibilityRecord`, `CanaryHealthSummary`,
`RestoreDrillResult`, and `ClientCompatibilityMatrix` so each blocking decision remains
replay-safe and independently auditable.

`VerificationSuiteResult` and `GateAdmissibilityRecord` for
`suite_family = DETERMINISTIC_AND_STATE_MACHINE` SHALL retain `deterministic_golden_pack_ref`.
`ReleaseVerificationManifestAssemblyContract` and `ReleaseVerificationManifest` SHALL retain the
same ref whenever the deterministic/state-machine gate is green.

Those artifacts, `ReleaseVerificationManifest`, and `DeploymentRelease` SHALL all embed the shared
`release_candidate_identity_contract`. Its `candidate_identity_hash` is the canonical hash of the
promotion tuple (`candidate_environment_ref`, `build_artifact_ref`, `artifact_digest`,
`schema_bundle_hash`, `config_bundle_hash`, `migration_plan_ref_or_null`, ordered
`enabled_provider_profile_refs[]`, and `supported_client_window_ref_or_null`). Every release
evidence artifact SHALL retain that hash top-level, and every
`ReleaseVerificationManifest.blocking_gates.*` entry SHALL echo it so mixed-candidate gate binding
fails closed before promotion.

Schema safety SHALL also bind one shared `schema_bundle_compatibility_gate_contract`. Its canonical
`compatibility_gate_hash` freezes the exact schema bundle, reader-window contract, supported native
client window posture, historical-manifest protection, replay/restore readability, migration
chronology, and rollback-vs-fail-forward boundary that the gate decision certifies. Candidate
identity alone is not sufficient: a stable `candidate_identity_hash` cannot prove that the same
build still remains safe after the compatibility window narrows, historical-manifest protection
changes, replay-safe readers disappear, or the supported native client window becomes blocked.
Schema-compatibility, migration-verification, operator-client, manifest, and deployment evidence
SHALL therefore bind that shared compatibility contract in addition to the shared candidate
identity tuple.

`ReleaseVerificationManifest` SHALL also retain one
`manifest_assembly_contract{...}` that freezes the canonical blocking-gate order, every gate's
exact `result_ref` and `admissibility_ref`, the per-gate candidate/compatibility hash echoes, the
executed test-run set, migration-ledger set, companion canary or restore or client-matrix evidence
refs, and the decision posture used to assemble the manifest. Promotion decisions SHALL therefore
read one durable manifest-assembly basis instead of inferring release truth from CI dashboards,
deployment logs, or operator-entered summary rows.

`RecoveryCheckpoint` and `DeploymentRelease` SHALL also embed the shared
`recovery_governance_contract`. For checkpoints, that contract binds workload criticality, inventory
linkage, reopen gating, and durable queue or authority recovery posture. For releases, it binds the
rollback boundary and fail-forward governance so closed reader windows or broken rollback safety
cannot silently masquerade as lawful rollback posture.

### Gate admissibility rules

A suite result SHALL satisfy a blocking gate only when all of the following are true:

1. the suite ran against the exact tested build digest, schema bundle, migration plan, and enabled provider-profile set proposed for promotion
2. the suite result is newer than every release-blocking code, config, schema, or migration change included in the candidate
3. the result is not assembled from mixed builds, mixed schema bundles, or mixed operator-client compatibility windows
4. any rerun used to recover from infrastructure noise preserves the same test scope and candidate identity
5. no blocking suite is passing under a flake quarantine, mute, or manual waiver that was introduced after the failing result

`ReleaseVerificationManifest` SHALL persist, for each blocking gate entry, the fixed `suite_family`
expected for that gate together with explicit `candidate_identity_hash`, `quarantine_state`, and
`manual_waiver_state` so a promotion decision cannot silently bind the wrong suite family, hide
waiver-based green posture, or point at evidence from another candidate. Gate entries for
`SCHEMA_COMPATIBILITY`, `MIGRATION_VERIFICATION`, and `OPERATOR_CLIENT` SHALL additionally persist
`compatibility_gate_hash_or_null`, and those gate families SHALL echo the non-null shared
`compatibility_gate_hash` from the bound `schema_bundle_compatibility_gate_contract`. Any gate
serialized as `GREEN` SHALL therefore also be `ADMISSIBLE`, unquarantined, unwaived, and
candidate-bound to the same canonical hash as the enclosing manifest. `GateAdmissibilityRecord`
SHALL therefore bind the exact migration plan and supported-client window where those dimensions
apply, SHALL bind the shared compatibility gate boundary where schema safety is being judged, and
any failed
admissibility dimension SHALL force explicit inadmissible posture with reason codes.
`VerificationSuiteResult` SHALL preserve those same suite-family-specific identity dimensions in the
first-class evidence objects themselves: authority-sandbox suites retain the enabled provider-profile
set they exercised, SHALL retain one non-null `authority_sandbox_coverage_contract_or_null`
covering the exact exercised operation-family set plus the required controlled-edge cases
`{ TOKEN_ROTATION, BINDING_LINEAGE_INVALIDATION, AMBIGUOUS_INGRESS_QUARANTINE, DUPLICATE_BUCKET_CHANGE, FRAUD_HEADER_VALIDATION, RECONCILIATION_BUDGET_EXHAUSTION }`,
operator-client suites retain the supported client window they judged, and
desktop supply-chain evidence SHALL remain bound to `BuildArtifact` only when `distribution_targets[]`
contains `MACOS_DESKTOP`. Restore-drill suites SHALL additionally retain both
`restore_drill_ref` and `restore_checkpoint_ref`, and the paired `RestoreDrillResult` SHALL carry
the same candidate-bound build/runtime identity tuple as the release candidate being promoted.
`RestoreDrillResult` only counts as successful promotion evidence when its bound
`privacy_reconciliation_contract{...}` reaches a final reconciled state and verifies audit
continuity, durable queue rebuild, authority binding revalidation, and replay-safe plus
enquiry-safe limitation posture.
`GateAdmissibilityRecord` SHALL echo those restore refs whenever `suite_family = RESTORE_DRILL` so
promotion evidence cannot silently swap in a different checkpoint or drill lineage during
admissibility evaluation.
`GateAdmissibilityRecord` for `suite_family = AUTHORITY_SANDBOX` SHALL also retain that same
`authority_sandbox_coverage_contract_or_null`, and `ReleaseVerificationManifest.blocking_gates.authority_sandbox`
plus `manifest_assembly_contract.gate_bindings[authority_sandbox]` SHALL retain its
`authority_sandbox_coverage_hash_or_null`, so promotion evidence proves exact sandbox breadth
instead of only proving sandbox reachability.
`manifest_assembly_contract.gate_bindings[]` SHALL mirror those same gate rows in canonical gate
order and SHALL fail closed if any gate's `suite_family`, `result_ref`, `admissibility_ref`,
`candidate_identity_hash`, `compatibility_gate_hash_or_null`, `authority_sandbox_coverage_hash_or_null`, `status`, `quarantine_state`,
`manual_waiver_state`, or `executed_at` diverges from `blocking_gates{...}`.

Manual override SHALL NOT bypass failures in schema compatibility, authority mutation safety, restore/DR, signed build integrity, or critical security suites. A temporarily quarantined test may stop blocking promotion only after the owning contract is explicitly reclassified in a prior reviewed change, not ad hoc during the release being judged.

Blocking gate set:

1. schema compatibility green
2. deterministic/module/state-machine suites green
3. northbound API stale-view/idempotency suites green
4. authority sandbox suites green for enabled profiles
5. Playwright and/or XCUITest production-profile suites green for every shipped operator client
6. security suite green with no unresolved critical findings
7. performance/canary baseline within SLO and error-budget limits
8. latest restore drill within the allowed recency window and successful
9. migration verification green for any datastore/schema changes in the release
10. release artifact signature, digest, SBOM, provenance attestation, and macOS notarization
    verified where the desktop client is shipped
11. suite admissibility checks green for every blocking result used in the promotion decision

## 3. Minimum regression edge-case matrix

The automated suite SHALL include at minimum the following cross-cutting regressions:

- representative schema sample passes and negative fixture failures for each authoritative artifact family
- duplicate client command after timeout
- stale approval after frame rebase
- native relaunch after stream interruption or tenant switch
- supported oldest-client against current server contract window
- token rotation during pending authority action
- authority sandbox coverage proves the exact enabled provider-profile set and exact exercised
  operation-family set before the release gate can read `AUTHORITY_SANDBOX = GREEN`
- ambiguous authority callback quarantined before legal-state mutation
- fraud-header validation remains bound to the exercised authority request identity namespace
- authority-reference-only ingress stays quarantine-owned and cannot normalize as success or pending state
- duplicate-bucket change stays inside the sandbox duplicate namespace and resolves through explicit
  duplicate suppression instead of cross-environment reuse
- callback/poll corroboration preserves one current meaning and no duplicate legal-state mutation
- timeout placeholder cannot be silently overwritten by later callback, poll, or recovery read
- persisted reconciliation budget and resend-control posture survive recovery and prevent a fresh
  mutation send
- contradictory authority evidence forces blocked or escalated resend posture instead of a new retry
- reconciliation budget exhaustion opens escalation without duplicate resend
- additive migration during in-flight manifest
- queue loss with outbox recovery
- queue rebuild after broker loss does not re-send live authority mutations
- duplicate nightly scheduler delivery reuses the same batch and same-window manifest identity
- stale nightly shard reclaim resumes from durable cursor and performs persisted attempt recovery before resend
- capacity-exhausted nightly batch records explicit deferral and still publishes a complete operator digest
- restore after erasure/retention action
- restore-resurrected restricted data requires typed compensating re-erasure workflow and audit proof
- legal hold, proof preservation, or authority ambiguity cannot coexist with unrestricted restore reopen posture
- replay-safe and enquiry-safe limitation posture must remain verified before restore evidence turns green
- twin stale-snapshot refresh block and no-safe-action regression
- twin contradictory-component regression, for example acknowledgement confirmed while mirror remains
  incompatible
- twin missing-baseline regression
- twin post-amendment divergence reclassification against the amended baseline
- twin portfolio-summary ranking determinism across many clients
- cross-tenant cache isolation
- masked versus full-data session isolation
- canary abort with rollback/fail-forward
- replay run blocked from live authority mutation

## 4. Evidence required for promotion

Every promotion decision SHALL retain evidence of:

- tested build digest and provenance
- shared `release_candidate_identity_contract`
- authority sandbox coverage evidence proving exact provider-profile and operation-family breadth
  plus controlled-edge fail-closed cases for the release candidate
- aggregate `candidate_identity_hash` for the exact promotion candidate
- shared `schema_bundle_compatibility_gate_contract`
- aggregate `compatibility_gate_hash` for the exact schema-compatibility boundary being certified
- shared `manifest_assembly_contract`
- tested `schema_bundle_hash` and enabled provider-profile set
- executed test run identifiers
- a verification manifest binding each blocking suite result to the tested release candidate
- per-gate `candidate_identity_hash` echoes proving each gate row certifies the same candidate
- per-gate `compatibility_gate_hash_or_null` echoes for schema, migration, and operator-client gates
- migration ledger outcome
- canary result summary
- restore-drill reference
- exact restore checkpoint used by the claimed drill
- supported-client compatibility matrix outcome
- blocking-suite quarantine/waiver status (which SHALL be empty for blocking gates)
- approving actor/service
- resulting `DeploymentRelease` identifier

Green blocking gates SHALL also retain their companion first-class evidence objects: a green
performance/canary gate retains `CanaryHealthSummary`, a green restore gate retains both
`RestoreDrillResult` and `RecoveryCheckpoint` lineage, and a green operator-client gate retains the
`ClientCompatibilityMatrix`.
`ClientCompatibilityMatrix` evidence SHALL cover both compatibility scenarios for every tested client
family and SHALL not claim red posture without a concrete incompatible row.

That evidence bundle SHALL be bound into `ReleaseVerificationManifest`, including the exact
`BuildArtifact`, aggregate `candidate_identity_hash`, executed test run identifiers, migration
mode plus plan/ledger posture, aggregate `compatibility_gate_hash`, restore-drill reference,
restore checkpoint reference, and blocking-gate admissibility plus waiver/quarantine results used
for the decision. `manifest_assembly_contract{...}` is the deterministic automation tape for that
assembly step; the manifest SHALL not be considered promotion-ready if that contract is absent,
non-canonical, or out of sync with the top-level evidence fields.

`ReleaseVerificationManifest` SHALL point to first-class `VerificationSuiteResult` artifacts for
each blocking suite family, companion `GateAdmissibilityRecord` artifacts for admissibility and
quarantine posture, and explicit `CanaryHealthSummary`, `RestoreDrillResult`, and
`ClientCompatibilityMatrix` evidence where those promotion gates apply.

## 4A. Replayability verification additions

The verification program SHALL additionally include:

- exact replay of a historically valid manifest with byte-identical `execution_basis_hash` and
  `deterministic_outcome_hash`
- exact recovery of an interrupted run proving no fresh input collection or fresh authority read occurs
- replay-basis corruption tests for missing `ConfigFreeze`, missing `InputFreeze`, corrupt historical
  authority basis, and missing late-data monitor basis
- counterfactual replay tests proving declared basis drift yields `EXPECTED_EQUIVALENCE`, `EXPECTED_DIFFERENCE`, or
  `LIMITED_COMPARABLE`, while any undeclared observed variance yields `UNEXPECTED_MISMATCH`
- retention-limited replay tests proving limitation codes survive when payload retention prevents a
  full exact comparison

## 5. One-sentence summary

The verification and release-gate contract converts the blueprint from a strong algorithm into a
shippable system by making correctness, security, recovery, and rollout testable before promotion.
