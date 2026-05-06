# Release Candidate Evidence Query Surfaces

This read model exposes persisted release proof without asking operators to rejoin build, candidate, gate, manifest, and deployment tables by hand.

Local implementation:

- [Candidate identity bundle query](../../packages/backend-release/src/queries/get_release_candidate_identity_bundle.ts)
- [Verification manifest bundle query](../../packages/backend-release/src/queries/get_release_verification_manifest_bundle.ts)
- [Deployment release bundle query](../../packages/backend-release/src/queries/get_deployment_release_bundle.ts)
- [Internal release evidence routes](../../packages/backend-release/src/routes/internal/release_candidate_evidence_routes.ts)
- [Algorithm release evidence contract](../../Algorithm/release_candidate_identity_and_promotion_evidence_contract.md)
- [Release verification manifest schema](../../Algorithm/schemas/release_verification_manifest.schema.json)
- [Release candidate identity schema](../../Algorithm/schemas/release_candidate_identity_contract.schema.json)
- [Compatibility gate schema](../../Algorithm/schemas/schema_bundle_compatibility_gate_contract.schema.json)

Canonical read keys:

- `candidate_identity_hash` is authoritative for the candidate tuple and all candidate-bound release evidence.
- `verification_manifest_id` is authoritative for one promotion-evidence root, including superseded manifests.
- `release_id` is authoritative for deployment rollout state, then joins back to the manifest and candidate bundle through persisted refs.
- `compatibility_gate_hash` may narrow a candidate lookup. When present, the query returns only evidence bound to that exact compatibility gate and fails closed on mismatched evidence.

Currentness and supersession:

- Bundles never rewrite older manifests. `SUPERSEDED` manifests remain queryable by `verification_manifest_id`.
- Candidate bundles include manifest lineage entries with `CURRENT` or `SUPERSEDED` posture.
- Blocked manifests remain blocked even when other persisted evidence is present.

Missing evidence posture:

- Bundle DTOs are read models, not first-class persisted contracts.
- Candidate and compatibility hashes are read from persisted contracts and are not recalculated by routes or browsers.
- Companion evidence is reported as `AVAILABLE`, `AVAILABLE_REF_ONLY`, `MISSING_REF`, `MISSING_RECORD`, or `NOT_REQUIRED`.
- Missing canary summaries, client matrices, restore drills, deterministic packs, or restore checkpoints never manufacture a green or complete posture.

Internal route posture:

- Routes are read-only and internal/admin-only.
- Responses use `Cache-Control: no-store` and an ETag over the bundle DTO for conditional reads.
- Missing keys, missing records, stale or mixed-candidate evidence, and authorization failures return typed `ProblemEnvelope` responses.
