# Build Artifact And Candidate Tuple Persistence

## Scope

`packages/backend-release` owns the durable release identity persistence path added for `pc_0219`.
It does not assemble deployment, canary, verification-manifest, or migration evidence; those later
objects consume the persisted `BuildArtifact`, `ReleaseCandidateIdentityContract`, and top-level
`candidate_identity_hash`.

The package was created under the shared tranche rule:
`ASSUMPTION_BACKEND_RELEASE_PACKAGE_CREATED`.

## BuildArtifact Persistence

`BuildArtifactRepository.persistBuildArtifact(...)` stores one immutable build artifact record keyed
by `build_id`, with `build_artifact_ref = build_id` for downstream release evidence mirrors.

Persisted fields are the schema-backed release truth:

- `build_id`
- `vcs_ref`
- `artifact_digest`
- `sbom_ref`
- `provenance_ref`
- `signature_ref`
- `artifact_registry_ref`
- `release_channel`
- `build_time`
- canonical `distribution_targets[]`
- `desktop_notarization_ref`
- `hardened_runtime_attestation_ref`

`distribution_targets[]` is canonicalized in validator order:

1. `SERVER`
2. `WEB_OPERATOR_SHELL`
3. `MACOS_DESKTOP`

Duplicate targets are removed before persistence. A stored record that is not already in this order
is invalid.

Desktop-only evidence is represented as:

- `MACOS_DESKTOP` present: both `desktop_notarization_ref` and
  `hardened_runtime_attestation_ref` are required.
- `MACOS_DESKTOP` absent: both desktop-only refs are persisted as `null`; stale supplied refs are
  cleared by the normalizer and rejected by stored-record assertion.

## Candidate Tuple

The candidate tuple hashed into `candidate_identity_hash` is exactly:

- `candidate_environment_ref`
- `build_artifact_ref`
- `artifact_digest`
- `schema_bundle_hash`
- `config_bundle_hash`
- `migration_plan_ref_or_null`
- sorted unique `enabled_provider_profile_refs[]`
- `supported_client_window_ref_or_null`

`packages/backend-release` reuses the existing backend-manifest
`ReleaseCandidateIdentityContract` builder, hash tuple, and validator instead of forking the hash
dialect. Provider-profile arrays are sorted and unique before hashing, and duplicate provider refs
fail closed.

The persisted candidate record keeps queryable top-level fields:

- `candidate_identity_hash`
- `candidate_identity_contract_ref`
- `candidate_environment_ref`
- `build_artifact_ref`
- `artifact_digest`
- `schema_bundle_hash`
- `config_bundle_hash`
- `migration_plan_ref_or_null`
- `enabled_provider_profile_refs[]`
- `supported_client_window_ref_or_null`

Write timestamps, row versions, CI job ids, and registry discovery tags are not part of the hash.

## Cross-Link Service

`persistBuildArtifactAndCandidateTuple(...)` is the canonical write path for build provenance plus
candidate identity. It:

1. normalizes and validates `BuildArtifact`;
2. forces `candidate_identity_input.build_artifact_ref`, when supplied, to match `BuildArtifact.build_id`;
3. forces `candidate_identity_input.artifact_digest`, when supplied, to match `BuildArtifact.artifact_digest`;
4. derives the schema-valid `ReleaseCandidateIdentityContract`;
5. persists both records through the repository.

Downstream release-verification, canary, restore-drill, client-compatibility, and deployment objects
should read this tuple and copy `candidate_identity_hash` as a top-level query field. They should not
rehash loose fields or rebuild identity from CI metadata.

## Existing Release Script Patch

`scripts/release/derive_release_identity.ts` now uses the canonical JSON hash helper for candidate
identity and rejects duplicate provider-profile refs before derivation. This closes the gap where the
script could silently dedupe profile refs while backend-manifest validation would fail the same tuple.

No optional debug lab or route was added for this card, so APIRequestContext and browser-lab coverage
were not applicable.
