# CI/CD And Preview Runbook

## Purpose

This runbook freezes Taxat's delivery-control topology for runner pools, secret resolution, workload identity, pipeline gates, and preview lifecycle policy.
It exists so later automation can build, test, preview, and promote candidates without widening environment trust or reusing mutable release truth.

## Selected Delivery Platform

- Selected platform: `GITHUB_ACTIONS_HYBRID_OIDC_ENVIRONMENTS`
- Selection posture: `PROVIDER_OVERRIDE_APPLIED`
- Official references:
  - [GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
  - [Larger runners](https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners)
  - [Managing environments](https://docs.github.com/en/actions/reference/environments)
  - [OIDC in cloud providers](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers)
  - [Workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
  - [Artifact retention](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization)
  - [Runner groups](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/manage-access)
  - [Cloudflare preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

## Runner Pools

- `runner.build-linux.standard`: ubuntu-latest -> BUILD (GITHUB_HOSTED_STANDARD, untrusted PRs = yes)
- `runner.playwright-linux.browser`: ubuntu-latest, playwright -> PLAYWRIGHT (GITHUB_HOSTED_STANDARD, untrusted PRs = no)
- `runner.security-linux.hardened`: ubuntu-latest, security -> SECURITY (GITHUB_HOSTED_STANDARD, untrusted PRs = yes)
- `runner.preview-linux.deploy`: ubuntu-latest, preview -> PREVIEW (GITHUB_HOSTED_STANDARD, untrusted PRs = no)
- `runner.macos.native.larger`: macos-15, xlarge, native-signing -> NATIVE_MACOS (GITHUB_HOSTED_LARGER, untrusted PRs = no)
- `runner.release-linux.controlled`: self-hosted, linux, release-control, ephemeral -> STAGING, PRODUCTION (SELF_HOSTED_EPHEMERAL_GROUP, untrusted PRs = no)

## Secret Resolution

- `secret.build.verify`: WF_BUILD_VERIFY -> sec_ci_ephemeral (NO_EXTERNAL_SECRET_RESOLUTION)
- `secret.playwright.verify`: WF_PLAYWRIGHT_VERIFY -> sec_ci_ephemeral (NO_EXTERNAL_SECRET_RESOLUTION)
- `secret.security.verify`: WF_SECURITY_VERIFY -> none (NO_EXTERNAL_SECRET_RESOLUTION)
- `secret.preview.deploy`: WF_PREVIEW_DEPLOY -> sec_ci_ephemeral, sec_ephemeral_review, cred.ci-runner-and-preview-deploy-token (GITHUB_OIDC_SECRET_BROKER)
- `secret.sandbox.deploy.verify`: WF_SANDBOX_DEPLOY_VERIFY -> sec_sandbox_runtime, sec_sandbox_web_authority, sec_sandbox_desktop_authority, sec_sandbox_batch_authority (GITHUB_OIDC_SECRET_BROKER)
- `secret.preprod.candidate.verify`: WF_PREPROD_CANDIDATE_VERIFY -> sec_preprod_runtime, sec_preprod_web_authority, sec_preprod_desktop_authority, sec_preprod_batch_authority (GITHUB_OIDC_SECRET_BROKER)
- `secret.native.notarize`: WF_NATIVE_NOTARIZE -> sec_preprod_runtime, cred.apple-signing-certificate-and-notary-key, cred.desktop-update-publishing-identity (BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC)
- `secret.production.promote`: WF_PRODUCTION_PROMOTE -> sec_production_runtime, sec_production_web_authority, sec_production_desktop_authority, sec_production_batch_authority, cred.apple-signing-certificate-and-notary-key, cred.desktop-update-publishing-identity (BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC)

## Gates

- `gate.build.verify`: suites = install-and-lockfile-integrity, typecheck, unit-and-contract-tests, deterministic-schema-self-test; evidence = candidate_hash, schema_bundle_hash, artifact_digest_set; approvals = none
- `gate.playwright.verify`: suites = browser-smoke, reduced-motion-parity, semantic-locator-stability, artifact-redaction-safe-diagnostics; evidence = candidate_hash, playwright_report_hash, trace_bundle_hash_on_failure; approvals = none
- `gate.security.verify`: suites = sbom-generation, vulnerability-scan, dependency-review, secret-scan; evidence = candidate_hash, sbom_ref, vulnerability_report_ref, artifact_attestation_ref; approvals = none
- `gate.preview.deploy`: suites = build-verified, playwright-preview-smoke, review-domain-bind, synthetic-fixture-seed; evidence = candidate_hash, preview_deploy_receipt, preview_domain_binding_ref, preview_audit_receipt; approvals = none
- `gate.sandbox.verify`: suites = candidate-build-complete, sandbox-deploy, sandbox-authority-smoke, release-manifest-candidate-binding; evidence = candidate_hash, schema_bundle_hash, sandbox_profile_set_ref, artifact_attestation_ref; approvals = none
- `gate.preprod.verify`: suites = sandbox-passed, preprod-deploy, migration-readiness-check, release-admission-preflight; evidence = candidate_hash, schema_bundle_hash, release_admission_input_pack, edge_boundary_ref; approvals = release-engineering-review
- `gate.native.notarize`: suites = xcode-build, codesign-verify, notary-submit-and-poll, update-feed-manifest-verify; evidence = candidate_hash, notarization_ref, artifact_attestation_ref, signed_update_manifest_ref; approvals = desktop-platform-review
- `gate.production.promote`: suites = preprod-passed, release-admission-pack-verified, artifact-attestations-enforced, post-deploy-canary; evidence = candidate_hash, schema_bundle_hash, release_admission_input_pack, promotion_receipt, artifact_attestation_ref; approvals = release-engineering-review, operations-review, approve-and-deploy

## Preview Lifecycle

- `preview.allocation.naming`: stage = ALLOCATION; TTL = 72h; triggers = pull_request.closed, ttl_expired, workflow_run.cancelled, force_push_replaced_candidate
- `preview.access.boundary`: stage = ACCESS; TTL = 72h; triggers = pull_request.closed, workflow_run.cancelled
- `preview.teardown.cleanup`: stage = TEARDOWN; TTL = 72h; triggers = pull_request.closed, workflow_run.cancelled, superseded_concurrency_group, ttl_expired

## Operating Rules

- Preview and CI lanes never resolve preproduction or production secret namespaces.
- Production and native notarization lanes require protected environments and explicit approvals before environment secrets become accessible.
- Candidate hash and schema bundle hash remain required evidence anchors throughout release-oriented lanes.
- Preview hosts stay review-zone scoped, noindex, synthetic-only, and mandatory-teardown on PR closure or cancellation.
- Apple signing material remains brokered as an explicit exception, never copied into broad CI runner storage.
