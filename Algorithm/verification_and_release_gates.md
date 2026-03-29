# Verification and Release Gates

## Purpose

`test_vectors.md` covers business-scenario exemplars, but production readiness also requires a complete
verification matrix spanning schemas, state machines, transport contracts, security controls,
performance posture, and restore behavior. This contract defines the mandatory test families and the
release gate that binds them.

## 1. Required test families

### A. Schema and contract validation

- validate every artifact schema under `schemas/`
- validate northbound problem/receipt/read surfaces against their frozen contracts
- reject undeclared shape drift and incompatible required-field changes

### B. Deterministic module and formula tests

- unit-test every deterministic helper used by manifest, trust, parity, drift, and gate logic
- verify money/value arithmetic, thresholds, and ordering under exact-decimal semantics
- verify duplicate suppression and request-hash determinism

### C. State-machine and model-based tests

- exercise every legal and illegal transition in `state_machines.md`
- use model-based/property-based test generation for lifecycle transitions, retries, and recovery paths
- prove that illegal transitions fail closed with typed reasons rather than process crashes

### D. Northbound API and operator-workspace contract tests

- command receipt replay tests
- stale-view rejection tests
- `ExperienceDelta` ordering/resume/rebase tests
- terminal reload and focus-anchor continuity tests
- native cold-start snapshot hydration, cache invalidation, and relaunch rebase tests
- Playwright journeys for shipped web surfaces and XCUITest journeys for the native macOS shell,
  step-up / approval / blocked-state flows, and multi-window investigation paths

### E. Authority and controlled-edge integration tests

- sandbox authority tests for each enabled `AuthorityOperationProfile`
- token-binding and fraud-header validation tests
- callback/inbox dedupe tests
- pending/unknown/out-of-band reconciliation tests

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
- chaos/fault-injection tests around worker crash, broker loss, and provider timeouts
- restore drill and DR failover/failback tests

## 2. Release gate

A release is production-eligible only when all blocking gates pass.

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

## 3. Minimum regression edge-case matrix

The automated suite SHALL include at minimum the following cross-cutting regressions:

- duplicate client command after timeout
- stale approval after frame rebase
- native relaunch after stream interruption or tenant switch
- token rotation during pending authority action
- additive migration during in-flight manifest
- queue loss with outbox recovery
- restore after erasure/retention action
- cross-tenant cache isolation
- masked versus full-data session isolation
- canary abort with rollback/fail-forward
- replay run blocked from live authority mutation

## 4. Evidence required for promotion

Every promotion decision SHALL retain evidence of:

- tested build digest and provenance
- executed test run identifiers
- migration ledger outcome
- canary result summary
- restore-drill reference
- approving actor/service
- resulting `DeploymentRelease` identifier

## 5. One-sentence summary

The verification and release-gate contract converts the blueprint from a strong algorithm into a
shippable system by making correctness, security, recovery, and rollout testable before promotion.
