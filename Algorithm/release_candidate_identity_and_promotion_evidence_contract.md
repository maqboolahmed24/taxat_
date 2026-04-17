# Release Candidate Identity And Promotion Evidence Contract

## Purpose

Promotion evidence SHALL be replayable from durable artifacts, not reconstructed from CI dashboards,
ad hoc spreadsheets, or operator memory. Every blocking release-evidence artifact therefore binds to
one shared `release_candidate_identity_contract` and one canonical `candidate_identity_hash`.
Candidate identity alone is not sufficient for schema safety, so release evidence that claims schema
compatibility SHALL also bind one shared
`schema_bundle_compatibility_gate_contract{...}` and one canonical `compatibility_gate_hash`.

## 1. Governing candidate identity model

`ReleaseCandidateIdentityContract` is the authoritative candidate tuple for release evidence. It
freezes:

- `candidate_environment_ref`
- `build_artifact_ref`
- `artifact_digest`
- `schema_bundle_hash`
- `config_bundle_hash`
- `migration_plan_ref_or_null`
- ordered `enabled_provider_profile_refs[]`
- `supported_client_window_ref_or_null`

`candidate_identity_hash` SHALL be the canonical hash of exactly that tuple. Array members SHALL be
sorted and unique before hashing so the same candidate cannot hash differently across workers merely
because provider profiles were discovered in a different order.

## 2. Contract boundary

`ReleaseCandidateIdentityContract` freezes the promoted binary, config, provider-profile, and
supported-client tuple. `SchemaBundleCompatibilityGateContract` freezes the additional mutable
compatibility boundary that candidate identity does not cover by itself:

- `schema_reader_window_contract{...}`
- `compatibility_window_ref`
- reader-window state
- protected historical-manifest posture
- replay/restore guard posture
- migration chronology posture
- native supported-client window posture
- destructive-contract posture
- rollback-vs-fail-forward posture
- explicit blocking `reason_codes[]`

The shared candidate contract SHALL be serialized into:

- `VerificationSuiteResult`
- `GateAdmissibilityRecord`
- `CanaryHealthSummary`
- `RestoreDrillResult`
- `ClientCompatibilityMatrix`
- `ReleaseVerificationManifest`
- `DeploymentRelease`

Each artifact SHALL also retain a top-level `candidate_identity_hash` for queryable mixed-candidate
rejection. `ReleaseVerificationManifest.blocking_gates.*` SHALL additionally echo that same
candidate hash so individual gate entries cannot silently point at evidence from a different build,
schema bundle, migration plan, provider-profile set, or supported-client window.
Schema, migration-verification, and operator-client gate rows SHALL additionally echo the shared
`compatibility_gate_hash` so a green gate cannot be replayed across reader-window closure, changed
historical-manifest protection, or a changed native client window while the binary candidate hash
stays the same.
`ReleaseVerificationManifest` SHALL also persist one
`manifest_assembly_contract{...}` that freezes the canonical gate order, every gate's exact
`result_ref` plus `admissibility_ref`, the companion canary/restore/client-matrix evidence refs,
and the decision posture (`PENDING`, `BLOCKED`, `APPROVED`, or `SUPERSEDED`) used to assemble the
promotion-evidence root. Promotion evidence is therefore machine-assembled from first-class
artifacts instead of reconstructed from dashboards or per-gate summaries after the fact.
For `suite_family = AUTHORITY_SANDBOX`, `VerificationSuiteResult` and `GateAdmissibilityRecord`
SHALL additionally retain one shared `authority_sandbox_coverage_contract_or_null`, and
`ReleaseVerificationManifest.blocking_gates.authority_sandbox` plus the mirrored manifest-assembly
gate binding SHALL retain its `authority_sandbox_coverage_hash_or_null`. Promotion evidence
therefore proves the exact enabled provider-profile set, exact exercised operation-family set, and
required controlled-edge sandbox cases rather than only preserving a green status bit.

## 3. Admissibility boundary

A blocking gate is admissible only when:

- the gate result is bound to the exact candidate tuple above
- freshness remains valid for the candidate being promoted
- rerun scope remains identical to the blocking suite scope
- quarantine posture is `NONE`
- manual waiver posture is `NONE`

`GREEN` gate posture therefore requires exact candidate binding plus `ADMISSIBLE` and unwaived
evidence. Promotion cannot be assembled from stale green runs, mixed reruns, or override-only
narratives.

## 4. Eliminated failure modes

This contract closes the following issue class:

- suite results from one build digest satisfying gates for another build
- migration-sensitive gates reusing results from the wrong migration plan
- authority-sandbox evidence drifting across provider-profile sets
- authority-sandbox gate rows staying green after the exercised operation-family set, fraud-header
  binding proof, token-rotation fail-closed proof, duplicate-bucket isolation proof, ambiguous-ingress
  quarantine proof, or reconciliation-budget exhaustion proof drifted
- operator-client gates reusing the wrong compatibility window
- schema-compatibility evidence from an earlier reader window being reused after the compatibility
  window has changed or closed
- release evidence claiming server-side schema safety while native supported-client persistence is
  now blocked
- restore-drill or canary evidence being swapped in from a different release candidate
- manifest gate rows pointing at mixed-candidate evidence while the manifest appears green overall
- manifest gate rows being manually stitched in a different order or with different `result_ref` /
  `admissibility_ref` pairs than the durable promotion-evidence basis
- green operator-client, canary, or restore gates being serialized without their companion
  first-class evidence refs in the manifest assembly basis
- approval, deployment, or supersession posture being inferred from deployment logs instead of one
  frozen release-verification assembly contract
- candidate hashes drifting because ordered arrays were not canonicalized before hashing
- schema-compatibility gates staying candidate-bound while no longer reader-window-bound

## 5. Enforcement

Machine enforcement lives in:

- `schemas/release_candidate_identity_contract.schema.json`
- `schemas/schema_bundle_compatibility_gate_contract.schema.json`
- `schemas/authority_sandbox_coverage_contract.schema.json`
- `schemas/release_verification_manifest_assembly_contract.schema.json`
- `schemas/release_verification_manifest.schema.json`
- `scripts/validate_contracts.py`
- `tools/forensic_contract_guard.py`

The validator SHALL reject any artifact whose nested candidate contract drifts from its parent
fields, whose candidate hash does not match the canonical tuple, whose compatibility-gate hash does
not match the canonical reader-window tuple, whose manifest assembly contract drifts from the top-
level gate object or companion evidence refs, or whose manifest gate hashes differ from the
manifest-level candidate or compatibility-gate hashes. It SHALL also reject any authority-sandbox
suite or admissibility artifact whose coverage contract drifts from the enclosing candidate,
schema/migration/client-window scope, enabled provider-profile set, exact exercised operation-family
set, or required controlled-edge case matrix.
