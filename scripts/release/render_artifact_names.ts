import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  deriveReleaseIdentity,
  loadReleasePolicies,
  repoRoot,
  type DerivedReleaseIdentity,
  type ReleaseChannelRef,
  type ReleaseIdentityInput,
} from "./derive_release_identity.ts";

type SupplyChainNamespace = {
  namespace_ref: string;
  package_coordinate_template: string;
};

type SupplyChainCatalog = {
  registry_namespaces: SupplyChainNamespace[];
};

const buildTargetCatalogPath = path.join(
  repoRoot,
  "config",
  "supplychain",
  "build_target_catalog.json",
);

export type RenderedPrimaryArtifact = {
  artifact_class_ref: string;
  artifact_family_ref: string;
  artifact_registry_ref: string;
  component_ref: string;
  component_slug: string;
  companions: {
    desktop_notarization_ref: string | null;
    hardened_runtime_attestation_ref: string | null;
    provenance_ref: string;
    release_verification_manifest_ref: string;
    sbom_ref: string;
    signature_ref: string;
  };
  digest_pinned_registry_ref: string;
  discovery_tag_ref: string;
  distribution_targets: string[];
  filename: string;
  namespace_ref: string;
  registry_repository: string;
};

export type RenderedReleaseArtifactPlan = {
  identity: DerivedReleaseIdentity;
  policy_snapshot_hash: string;
  primary_artifacts: RenderedPrimaryArtifact[];
  release_verification_manifest: {
    filename: string;
    registry_ref: string;
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function applyTemplate(template: string, tokens: Record<string, string>) {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => {
    assert(tokens[key] !== undefined, `Missing template token: ${key}`);
    return tokens[key];
  });
}

function shortHash(value: string, length: number) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, length).toLowerCase();
}

function findNamespaceTemplate(
  catalog: SupplyChainCatalog,
  namespaceRef: string,
) {
  const namespace = catalog.registry_namespaces.find((row) => row.namespace_ref === namespaceRef);
  assert(namespace, `Missing supply-chain namespace ${namespaceRef}.`);
  return namespace.package_coordinate_template;
}

function buildPrimaryTokens(
  identity: DerivedReleaseIdentity,
  componentSlug: string,
  candidateHashShort: string,
  schemaHashShort: string,
  configHashShort: string,
) {
  return {
    build_id: identity.build.build_id,
    candidate_hash_short: candidateHashShort,
    channel_slug: identity.release_channel.channel_slug,
    component_slug: componentSlug,
    config_hash_short: configHashShort,
    rollout_posture_marker: identity.rollout.posture_marker,
    schema_hash_short: schemaHashShort,
    version_slug: identity.version.version_slug,
    version_tag: identity.version.version_tag,
  };
}

function renderRegistryRepository(
  template: string,
  componentSlug: string,
) {
  return template.replace("<artifact>", componentSlug);
}

export async function renderArtifactNames(
  input: ReleaseIdentityInput,
  options?: { reloadPolicies?: boolean },
): Promise<RenderedReleaseArtifactPlan> {
  const [identity, policies, supplyChainCatalog] = await Promise.all([
    deriveReleaseIdentity(input, options?.reloadPolicies ? { reloadPolicies: true } : undefined),
    loadReleasePolicies(options?.reloadPolicies ? { reload: true } : undefined),
    readJson<SupplyChainCatalog>(buildTargetCatalogPath),
  ]);

  const { artifactNamingPolicy } = policies;
  const candidateHashShort = shortHash(
    identity.candidate_identity_contract.candidate_identity_hash,
    artifactNamingPolicy.token_policy.candidate_hash_short_length,
  );
  const schemaHashShort = shortHash(
    identity.candidate_identity_contract.schema_bundle_hash,
    artifactNamingPolicy.token_policy.schema_hash_short_length,
  );
  const configHashShort = shortHash(
    identity.candidate_identity_contract.config_bundle_hash,
    artifactNamingPolicy.token_policy.config_hash_short_length,
  );

  const manifestTokens = buildPrimaryTokens(
    identity,
    "release-verification-manifest",
    candidateHashShort,
    schemaHashShort,
    configHashShort,
  );
  const manifestTemplate = artifactNamingPolicy.companion_artifact_templates.release_verification_manifest_ref;
  assert(manifestTemplate, "Missing release_verification_manifest_ref companion template.");
  const manifestRepository = renderRegistryRepository(
    findNamespaceTemplate(supplyChainCatalog, manifestTemplate.registry_namespace_ref as string),
    "release-verification-manifest",
  );
  const manifestTag = applyTemplate(manifestTemplate.registry_tag_template as string, manifestTokens);
  const manifestFilename = applyTemplate(manifestTemplate.filename_template, manifestTokens);
  const releaseVerificationManifestRef = `${manifestRepository}:${manifestTag}`;

  const primaryArtifacts = artifactNamingPolicy.primary_artifact_rows.map((row) => {
    const namespaceRef = row.registry_namespace_refs_by_channel[
      identity.release_channel.release_channel_ref as ReleaseChannelRef
    ];
    const repositoryTemplate = findNamespaceTemplate(supplyChainCatalog, namespaceRef);
    const registryRepository = renderRegistryRepository(repositoryTemplate, row.component_slug);
    const primaryTokens = buildPrimaryTokens(
      identity,
      row.component_slug,
      candidateHashShort,
      schemaHashShort,
      configHashShort,
    );
    const discoveryTag = applyTemplate(row.registry_tag_template, primaryTokens);
    const filename = applyTemplate(row.filename_template, primaryTokens);
    assert(
      filename.length <= artifactNamingPolicy.token_policy.max_filename_length,
      `Filename exceeds max length for ${row.component_slug}: ${filename}`,
    );
    const digestValue = identity.candidate_identity_contract.artifact_digest.startsWith("sha256:")
      ? identity.candidate_identity_contract.artifact_digest
      : `sha256:${identity.candidate_identity_contract.artifact_digest}`;
    const digestPinnedRegistryRef = `${registryRepository}@${digestValue}`;
    const discoveryTagRef = `${registryRepository}:${discoveryTag}`;

    const sbomTemplate = artifactNamingPolicy.companion_artifact_templates.sbom_ref;
    const provenanceTemplate = artifactNamingPolicy.companion_artifact_templates.provenance_ref;
    const signatureTemplate = artifactNamingPolicy.companion_artifact_templates.signature_ref;
    assert(sbomTemplate, "Missing sbom_ref companion template.");
    assert(provenanceTemplate, "Missing provenance_ref companion template.");
    assert(signatureTemplate, "Missing signature_ref companion template.");
    const sbomRepository = renderRegistryRepository(
      findNamespaceTemplate(supplyChainCatalog, sbomTemplate.registry_namespace_ref as string),
      row.component_slug,
    );
    const provenanceRepository = renderRegistryRepository(
      findNamespaceTemplate(supplyChainCatalog, provenanceTemplate.registry_namespace_ref as string),
      row.component_slug,
    );
    const sbomTag = applyTemplate(sbomTemplate.registry_tag_template as string, primaryTokens);
    const provenanceTag = applyTemplate(provenanceTemplate.registry_tag_template as string, primaryTokens);
    const sbomRef = `${sbomRepository}:${sbomTag}`;
    const provenanceRef = `${provenanceRepository}:${provenanceTag}`;
    const signatureFilename = applyTemplate(signatureTemplate.filename_template, primaryTokens);
    const signatureRef = `${discoveryTagRef}${signatureTemplate.registry_tag_suffix ?? ""}`;

    let desktopNotarizationRef: string | null = null;
    let hardenedRuntimeAttestationRef: string | null = null;
    if (row.desktop_companion_templates) {
      const notarizationTemplate = row.desktop_companion_templates.desktop_notarization_ref;
      const hardenedRuntimeTemplate =
        row.desktop_companion_templates.hardened_runtime_attestation_ref;
      assert(typeof notarizationTemplate === "string", "Missing desktop notarization template.");
      assert(
        typeof hardenedRuntimeTemplate === "string",
        "Missing hardened runtime attestation template.",
      );
      desktopNotarizationRef = applyTemplate(notarizationTemplate, primaryTokens);
      hardenedRuntimeAttestationRef = applyTemplate(hardenedRuntimeTemplate, primaryTokens);
    }

    void signatureFilename;

    return {
      artifact_class_ref: row.artifact_class_ref,
      artifact_family_ref: row.artifact_family_ref,
      artifact_registry_ref: digestPinnedRegistryRef,
      component_ref: row.component_ref,
      component_slug: row.component_slug,
      companions: {
        desktop_notarization_ref: desktopNotarizationRef,
        hardened_runtime_attestation_ref: hardenedRuntimeAttestationRef,
        provenance_ref: provenanceRef,
        release_verification_manifest_ref: releaseVerificationManifestRef,
        sbom_ref: sbomRef,
        signature_ref: signatureRef,
      },
      digest_pinned_registry_ref: digestPinnedRegistryRef,
      discovery_tag_ref: discoveryTagRef,
      distribution_targets: row.distribution_targets,
      filename,
      namespace_ref: namespaceRef,
      registry_repository: registryRepository,
    } satisfies RenderedPrimaryArtifact;
  });

  const duplicateRefs = new Set<string>();
  const seenRefs = new Set<string>();
  for (const artifact of primaryArtifacts) {
    for (const ref of [
      artifact.artifact_registry_ref,
      artifact.discovery_tag_ref,
      artifact.filename,
      artifact.companions.sbom_ref,
      artifact.companions.provenance_ref,
      artifact.companions.signature_ref,
    ]) {
      if (seenRefs.has(ref)) {
        duplicateRefs.add(ref);
      }
      seenRefs.add(ref);
    }
  }
  assert(duplicateRefs.size === 0, `Artifact naming collision detected: ${[...duplicateRefs].join(", ")}`);

  return {
    identity,
    policy_snapshot_hash: policies.policySnapshotHash,
    primary_artifacts: primaryArtifacts,
    release_verification_manifest: {
      filename: manifestFilename,
      registry_ref: releaseVerificationManifestRef,
    },
  };
}

async function readReleaseInput(filePath: string) {
  return readJson<ReleaseIdentityInput>(path.resolve(filePath));
}

export async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const inputPath = inputIndex === -1 ? undefined : args[inputIndex + 1];
  assert(typeof inputPath === "string" && inputPath.length > 0, "Usage: --input <release-identity-input.json>");
  const input = await readReleaseInput(inputPath);
  const rendered = await renderArtifactNames(input);
  console.log(JSON.stringify(rendered, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
