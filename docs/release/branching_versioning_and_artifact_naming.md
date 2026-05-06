# Branching, Versioning, And Artifact Naming

## Purpose

This runbook freezes the repo's release naming law so future CI and release tooling can derive branch admissibility, human-facing versions, build ids, candidate identity, and artifact coordinates without inventing one-off conventions.

The source of truth is the machine-readable policy pack under `config/release`:

- `branching_policy.json`
- `versioning_policy.json`
- `artifact_naming_policy.json`
- `release_channel_matrix.json`

## Branch Families

- `MAINLINE`
  - `dev` is the shared integration branch.
  - `main` is the protected admissible baseline.
  - `dev` may publish preview or sandbox candidates only.
  - `main` may carry admissible sandbox, preproduction, or production candidates once the release manifest and compatibility gate are green.
- `RELEASE_PREPARATION`
  - Pattern: `release/<semver>` or `release/v<semver>`.
  - Used when one version train needs stabilization without freezing all integration on `dev`.
  - May publish sandbox, preproduction, or production candidates through the standard canary or fail-forward compensating paths.
- `HOTFIX`
  - Pattern: `hotfix/<semver>` or `hotfix/v<semver>--<ticket>`.
  - Must carry baseline lineage, typically via a pinned or current production release id.
  - May publish preproduction or production candidates and can use emergency promotion when explicit override lineage is present.
- `EXPERIMENTAL`
  - Pattern: `exp/<topic>` or `experiment/<topic>`.
  - Preview only.
  - Never becomes admissible release evidence directly.

## Version Law

- The human-facing release core is semver: `major.minor.patch`.
- Preview, sandbox, and preproduction channels use prerelease labels:
  - preview: `preview.<iteration>`
  - sandbox / preproduction: `rc.<iteration>`
- Production uses the plain semver core and keeps rollout posture in build metadata.
- Build metadata records the channel and build sequence, then layers on rollout posture:
  - `canary`
  - `emergency`
  - `pin<baseline>`
  - `ffwd`
  - `comp<release>`
  - `hf<iteration>` for hotfix trains

Examples:

- Preview from `dev`: `1.4.0-preview.5+preview.b0005.shaabc123def456.canary`
- Preproduction canary from `release/1.4.0`: `1.4.0-rc.2+preprod.b0017.shaf4d31d6b2f43.canary`
- Production hotfix emergency promote: `1.4.1+prod.b0029.shaabc123def456.hf1.emergency`
- Production pinned baseline: `1.4.0+prod.b0031.shaabc123def456.pinfeedcafe`

### Build Id Versus Candidate Identity

- `build_id` is derived before the candidate hash.
- `build_id` must not include the candidate hash, because the candidate hash depends on the candidate tuple, which already includes the build artifact ref.
- The immutable `candidate_identity_hash` comes from:
  - `candidate_environment_ref`
  - `build_artifact_ref`
  - `artifact_digest`
  - `schema_bundle_hash`
  - `config_bundle_hash`
  - `migration_plan_ref_or_null`
  - `enabled_provider_profile_refs`
  - `supported_client_window_ref_or_null`

This keeps human-facing names flexible while immutable machine identity remains stable and auditable.

## Channel And Rollout Rules

- `PREVIEW`
  - Preview only.
  - Non-promotable lane.
  - Allowed from `dev` and experimental branches.
- `SANDBOX`
  - Verification rehearsal lane.
  - Allowed from `dev`, `main`, and release preparation branches.
  - Supports `STANDARD_CANARY` and `PIN_BASELINE`.
- `PREPRODUCTION`
  - Production-candidate source lane.
  - Allowed from `main`, release preparation, and hotfix branches.
  - Supports `STANDARD_CANARY`, `PIN_BASELINE`, and `FAIL_FORWARD_COMPENSATING`.
- `PRODUCTION`
  - Admissible only after manifest approval.
  - Allowed from `main`, release preparation, and hotfix branches.
  - Supports `STANDARD_CANARY`, `EMERGENCY_PROMOTE`, `PIN_BASELINE`, and `FAIL_FORWARD_COMPENSATING`.

Rollout posture is constrained by the compatibility verdict:

- `STANDARD_CANARY` requires `ROLLBACK_SAFE`
- `EMERGENCY_PROMOTE` requires `ROLLBACK_SAFE` plus emergency override refs
- `PIN_BASELINE` requires `ROLLBACK_SAFE` plus a pinned baseline release id
- `FAIL_FORWARD_COMPENSATING` requires `FAIL_FORWARD_ONLY` plus compensating release id and owner

## Artifact Naming

Primary artifacts carry:

- component slug
- version slug
- channel slug
- build id
- short candidate hash
- short schema bundle hash
- short config bundle hash
- rollout posture marker

Examples:

- Backend image reference file:
  - `taxat-api__1.4.0-rc.2--preprod.b0017.shaf4d31d6b2f43.canary__preprod__b20260423t104530z-preprod-0017-f4d31d6b2f43__cih0353f56fc8aa__sb95b97708__cfg5ca5ae7e__canary.image-ref.txt`
- Web bundle:
  - `taxat-operator-web__1.4.0-rc.2--preprod.b0017.shaf4d31d6b2f43.canary__preprod__b20260423t104530z-preprod-0017-f4d31d6b2f43__cih0353f56fc8aa__sb95b97708__cfg5ca5ae7e__canary.web-bundle.tar.zst`
- Desktop package:
  - `taxat-operator-desktop__1.4.1--prod.b0029.shaabc123def456.hf1.emergency__prod__b20260423t120500z-prod-0029-abc123def456__cih2f06fabcde12__sb95b97708__cfg5ca5ae7e__emergency.pkg`

Evidence companions derive from the same identity:

- SBOM: `.sbom.cdx.json`
- Provenance: `.provenance.intoto.jsonl`
- Signature: `.sig`
- macOS notarization: `.notary.json`
- macOS hardened runtime: `.hardened-runtime.json`
- release verification manifest: `taxat-release-verification-manifest__...json`

## Registry Coordinates

Registry repositories follow the governed supply-chain namespaces from `config/supplychain/build_target_catalog.json`.

- server lanes:
  - `ghcr.io/taxat/preview/server/<artifact>`
  - `ghcr.io/taxat/sandbox/server/<artifact>`
  - `ghcr.io/taxat/preprod/server/<artifact>`
  - `ghcr.io/taxat/prod/server/<artifact>`
- web lanes:
  - `ghcr.io/taxat/preview/web/<artifact>`
  - `ghcr.io/taxat/sandbox/web/<artifact>`
  - `ghcr.io/taxat/preprod/web/<artifact>`
  - `ghcr.io/taxat/prod/web/<artifact>`
- native lanes:
  - `ghcr.io/taxat/preview/native/<artifact>`
  - `ghcr.io/taxat/sandbox/native/<artifact>`
  - `ghcr.io/taxat/preprod/native/<artifact>`
  - `ghcr.io/taxat/prod/native/<artifact>`
- evidence lanes:
  - `ghcr.io/taxat/evidence/sbom/<artifact>`
  - `ghcr.io/taxat/evidence/provenance/<artifact>`
  - `ghcr.io/taxat/evidence/release-admission/<artifact>`

Durable build identity uses digest-pinned subject refs.
Discovery tags are emitted for operator readability only.

## Scripts

- `scripts/release/derive_release_identity.ts`
  - Classifies the branch, validates channel and rollout admissibility, derives build id, semver label, rollout markers, and the release-candidate identity contract.
- `scripts/release/render_artifact_names.ts`
  - Renders deterministic filenames, registry repositories, digest-pinned artifact refs, evidence refs, and release-verification-manifest refs.
- `scripts/release/validate_release_metadata.ts`
  - Checks branch/channel legality, compatibility verdict alignment, rollout-specific required metadata, and naming compliance for build artifacts plus manifest refs.

## Required Usage

1. Build or supply the release identity input JSON.
2. Run `derive_release_identity.ts` to freeze the candidate tuple and human-facing version.
3. Run `render_artifact_names.ts` to generate primary artifact names and evidence refs.
4. Assemble release metadata and pass it to `validate_release_metadata.ts`.
5. Only proceed to release evidence or deployment orchestration when validation is green.

## Guardrails

- Branch names never override candidate identity or compatibility gates.
- The same commit built for two channels must produce different build ids and human versions.
- Config-only changes must still change candidate identity and artifact names.
- Production desktop artifacts must carry notarization and hardened-runtime companion refs.
- Fail-forward-only candidates must not masquerade as rollback-safe canaries.
- Pinned-baseline and emergency promotions must remain visible in metadata and names.
