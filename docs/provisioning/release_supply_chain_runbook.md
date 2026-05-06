# Release Supply Chain Runbook

## Purpose

This runbook declares the machine-readable release supply-chain topology for Taxat build artifacts.
It freezes namespace layout, trust roots, evidence classes, and release-admission inputs so later CI or release automation cannot improvise supply-chain truth.

## Recommended Portable Stack

- Recommended stack: `GITHUB_ACTIONS_GHCR_SIGSTORE_KEYLESS_GITHUB_ATTESTATIONS`
- Current selection posture: `PROVIDER_SELECTION_REQUIRED`
- Official references:
  - [GitHub OIDC](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
  - [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
  - [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)
  - [Sigstore signing overview](https://docs.sigstore.dev/cosign/signing/overview/)
  - [Apple Developer ID](https://developer.apple.com/developer-id/)
  - [CycloneDX overview](https://cyclonedx.org/specification/overview/)

## Registry Topology

- `registry.preview.server` -> `ghcr.io/taxat/preview/server/<artifact>` (NO_PROMOTION_FROM_PREVIEW, PREVIEW_SHORT_LIVED)
- `registry.sandbox.server` -> `ghcr.io/taxat/sandbox/server/<artifact>` (COPY_BY_DIGEST_ONLY, VERIFICATION_WINDOW)
- `registry.preproduction.server` -> `ghcr.io/taxat/preprod/server/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.production.server` -> `ghcr.io/taxat/prod/server/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.preview.web` -> `ghcr.io/taxat/preview/web/<artifact>` (NO_PROMOTION_FROM_PREVIEW, PREVIEW_SHORT_LIVED)
- `registry.sandbox.web` -> `ghcr.io/taxat/sandbox/web/<artifact>` (COPY_BY_DIGEST_ONLY, VERIFICATION_WINDOW)
- `registry.preproduction.web` -> `ghcr.io/taxat/preprod/web/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.production.web` -> `ghcr.io/taxat/prod/web/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.preview.native` -> `ghcr.io/taxat/preview/native/<artifact>` (NO_PROMOTION_FROM_PREVIEW, PREVIEW_SHORT_LIVED)
- `registry.sandbox.native` -> `ghcr.io/taxat/sandbox/native/<artifact>` (COPY_BY_DIGEST_ONLY, VERIFICATION_WINDOW)
- `registry.preproduction.native` -> `ghcr.io/taxat/preprod/native/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.production.native` -> `ghcr.io/taxat/prod/native/<artifact>` (COPY_BY_DIGEST_ONLY, RELEASE_LONG_TAIL)
- `registry.evidence.sbom` -> `ghcr.io/taxat/evidence/sbom/<artifact>` (APPEND_ONLY_EVIDENCE, EVIDENCE_APPEND_ONLY)
- `registry.evidence.provenance` -> `ghcr.io/taxat/evidence/provenance/<artifact>` (APPEND_ONLY_EVIDENCE, EVIDENCE_APPEND_ONLY)
- `registry.evidence.release-admission` -> `ghcr.io/taxat/evidence/release-admission/<artifact>` (APPEND_ONLY_EVIDENCE, EVIDENCE_APPEND_ONLY)

## Signing And Notarization

- `API`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations
- `WORKER`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations
- `WEB_BUNDLE`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations
- `NATIVE_DESKTOP`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations, trust_root.apple.developer-id, notarization = notarization.apple-developer-id
- `SBOM`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations
- `PROVENANCE`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations
- `MANIFEST_INPUTS`: signature required = yes, trust roots = trust_root.sigstore.fulcio.github-oidc, trust_root.github.artifact-attestations

## Release Admission Inputs

- `admission.container-service`: fields = candidate_hash, build_artifact_digest, source_revision, dependency_lock_ref, schema_bundle_hash, workflow_run_ref, builder_identity; evidence = digest_pinned_subject, signature_verification, provenance_ref, sbom_ref, vulnerability_gate_pass; notarization required = no
- `admission.web-bundle`: fields = candidate_hash, build_artifact_digest, source_revision, dependency_lock_ref, schema_bundle_hash, workflow_run_ref, builder_identity; evidence = digest_pinned_subject, signature_verification, provenance_ref, sbom_ref, vulnerability_gate_pass; notarization required = no
- `admission.release-manifest`: fields = candidate_hash, build_artifact_digest, source_revision, dependency_lock_ref, schema_bundle_hash, workflow_run_ref, builder_identity; evidence = digest_pinned_subject, signature_verification, provenance_ref; notarization required = no
- `admission.macos-desktop`: fields = candidate_hash, build_artifact_digest, source_revision, dependency_lock_ref, schema_bundle_hash, workflow_run_ref, builder_identity, notarization_ref; evidence = digest_pinned_subject, signature_verification, provenance_ref, sbom_ref, vulnerability_gate_pass, notarization_ref; notarization required = yes

## Operational Rules

- Tags are discovery pointers only. Promotion copies digests.
- Signatures, provenance, SBOM bundles, and release manifests remain independently addressable artifacts.
- Mixed-candidate evidence is rejected.
- macOS delivery fails closed without current notarization evidence.
- Provider outages during signature or attestation publication leave the artifact inadmissible.
