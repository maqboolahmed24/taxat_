# Release Candidate Identity Hashing

`ReleaseCandidateIdentityContract` is now built through one backend-manifest path:

- `buildReleaseCandidateIdentityContract` assembles the schema-backed contract.
- `computeReleaseCandidateIdentityHash` derives `candidate_identity_hash`.
- `validateCandidateIdentityContract` fails closed on drift, extra fields, hash mismatch, or non-canonical arrays.

## Hash Profile

V1 uses `RELEASE_CANDIDATE_IDENTITY_HASH_V1` with the existing Taxat stable JSON SHA-256 substrate. The hash seed is exactly the release-candidate tuple required by the corpus:

1. `candidate_environment_ref`
2. `build_artifact_ref`
3. `artifact_digest`
4. `schema_bundle_hash`
5. `config_bundle_hash`
6. `migration_plan_ref_or_null`
7. `enabled_provider_profile_refs`
8. `supported_client_window_ref_or_null`

The hash excludes `candidate_identity_hash`, contract policy constants, persistence ids, row versions, and write timestamps. Later V2 profile changes must use a new contract/profile constant and must not reinterpret existing V1 hashes.

## Canonicalization

Provider profile refs are trimmed, NFC-normalized, sorted lexicographically, and rejected if duplicates remain after normalization. The stored contract must already contain that canonical order.

`migration_plan_ref_or_null` and `supported_client_window_ref_or_null` are explicit nullable identity dimensions. `null` and a present string hash differently because they represent different candidate semantics.

The builder allows an empty provider-profile set because the current schema does not require `minItems`; later authority-sandbox evidence may impose stricter per-suite requirements.

## Evidence Binding

Later verification, admissibility, canary, restore, client compatibility, release manifest, and deployment artifacts should embed this contract and retain a top-level `candidate_identity_hash`. They should validate the top-level hash as an expected mirror instead of copying or recomputing candidate tuple fields independently.
