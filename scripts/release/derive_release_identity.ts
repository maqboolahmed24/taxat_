import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { stableJsonHash } from "../../packages/domain-kernel/src/primitives/hash.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..");

const branchingPolicyPath = path.join(repoRoot, "config", "release", "branching_policy.json");
const versioningPolicyPath = path.join(repoRoot, "config", "release", "versioning_policy.json");
const artifactNamingPolicyPath = path.join(
  repoRoot,
  "config",
  "release",
  "artifact_naming_policy.json",
);
const channelMatrixPath = path.join(repoRoot, "config", "release", "release_channel_matrix.json");

export type ReleaseChannelRef = "PREVIEW" | "SANDBOX" | "PREPRODUCTION" | "PRODUCTION";
export type RolloutStrategyRef =
  | "STANDARD_CANARY"
  | "EMERGENCY_PROMOTE"
  | "PIN_BASELINE"
  | "FAIL_FORWARD_COMPENSATING";
export type BranchFamilyRef = "MAINLINE" | "RELEASE_PREPARATION" | "HOTFIX" | "EXPERIMENTAL";
export type BranchRoleRef = "INTEGRATION" | "BASELINE" | "STABILIZATION" | "PATCH" | "EXPERIMENT";

export type ReleaseIdentityInput = {
  artifactDigest: string;
  branchRef: string;
  configBundleHash: string;
  migrationPlanRefOrNull?: string | null;
  requestedReleaseChannel: ReleaseChannelRef;
  rolloutStrategyRef: RolloutStrategyRef;
  sourceRevision: string;
  supportedClientWindowRefOrNull?: string | null;
  enabledProviderProfileRefs: string[];
  versionSeed: {
    major: number;
    minor: number;
    patch: number;
    channelIterationOrNull?: number | null;
    hotfixIterationOrNull?: number | null;
  };
  buildMetadata: {
    buildSequence: number;
    buildTimestamp: string;
    canaryAbortedReleaseIdOrNull?: string | null;
    compensatingReleaseIdOrNull?: string | null;
    compatibilityVerdictRef: string;
    emergencyOverrideExpiresAtOrNull?: string | null;
    emergencyOverrideRefOrNull?: string | null;
    failForwardOwnerRefOrNull?: string | null;
    pinnedBaselineReleaseIdOrNull?: string | null;
    schemaBundleHash: string;
  };
};

export type ReleaseCandidateIdentityContract = {
  admissibility_binding_policy: "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING";
  array_canonicalization_policy: "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY";
  artifact_digest: string;
  build_artifact_ref: string;
  candidate_environment_ref: string;
  candidate_identity_hash: string;
  config_bundle_hash: string;
  contract_version: "RELEASE_CANDIDATE_IDENTITY_V1";
  enabled_provider_profile_refs: string[];
  migration_plan_ref_or_null: string | null;
  schema_bundle_hash: string;
  suite_context_policy: "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL";
  supported_client_window_ref_or_null: string | null;
};

type BranchPatternRow = {
  allowed_release_channel_refs: ReleaseChannelRef[];
  allowed_rollout_strategy_refs: RolloutStrategyRef[];
  branch_family_ref: BranchFamilyRef;
  branch_role_ref: BranchRoleRef;
  label: string;
  pattern_ref: string;
  production_admissibility: string;
  regex: string;
};

type BranchingPolicy = {
  branch_pattern_rows: BranchPatternRow[];
  default_branch_refs: {
    baseline_branch_ref: string;
    integration_branch_ref: string;
  };
  policy_id: string;
  policy_version: string;
  schema_version: string;
};

type ChannelVersionRow = {
  allowed_branch_family_refs: BranchFamilyRef[];
  build_metadata_tokens: string[];
  display_track_label: string;
  prerelease_template: string | null;
  release_channel_ref: ReleaseChannelRef;
};

type RolloutMetadataRow = {
  additional_build_metadata_tokens: string[];
  rollout_strategy_ref: RolloutStrategyRef;
};

type VersioningPolicy = {
  build_id_policy: {
    build_sequence_width: number;
    short_commit_length: number;
    template: string;
    timestamp_compact_format: string;
  };
  candidate_binding_policy: {
    bundle_hash_truncation_length: number;
    candidate_hash_truncation_length: number;
  };
  channel_version_rows: ChannelVersionRow[];
  core_version_policy: {
    format_ref: string;
  };
  rollout_metadata_rows: RolloutMetadataRow[];
  policy_id: string;
  policy_version: string;
  schema_version: string;
};

type ArtifactNamingPolicy = {
  collision_guard_policy: {
    required_dimensions: string[];
  };
  companion_artifact_templates: Record<
    string,
    {
      filename_template: string;
      registry_namespace_ref?: string;
      registry_strategy?: string;
      registry_tag_suffix?: string;
      registry_tag_template?: string;
    }
  >;
  primary_artifact_rows: Array<{
    artifact_class_ref: string;
    artifact_family_ref: string;
    component_ref: string;
    component_slug: string;
    distribution_targets: string[];
    desktop_companion_templates?: Record<string, string>;
    filename_template: string;
    registry_namespace_refs_by_channel: Record<ReleaseChannelRef, string>;
    registry_tag_template: string;
  }>;
  policy_id: string;
  policy_version: string;
  schema_version: string;
  token_policy: {
    candidate_hash_short_length: number;
    config_hash_short_length: number;
    max_filename_length: number;
    schema_hash_short_length: number;
    separator: string;
  };
};

type ReleaseChannelRow = {
  allowed_branch_family_refs: BranchFamilyRef[];
  allowed_branch_role_refs: BranchRoleRef[];
  allowed_rollout_strategy_refs: RolloutStrategyRef[];
  candidate_environment_ref: string;
  channel_slug: string;
  compatibility_requirement: string;
  environment_ref: string;
  promotion_mode: string;
  release_channel_ref: ReleaseChannelRef;
};

type RolloutStrategyRow = {
  allowed_release_channel_refs: ReleaseChannelRef[];
  posture_marker: string;
  required_compatibility_verdict_refs: string[];
  required_metadata_refs: string[];
  rollout_strategy_ref: RolloutStrategyRef;
};

type ReleaseChannelMatrix = {
  policy_id: string;
  policy_version: string;
  release_channel_rows: ReleaseChannelRow[];
  rollout_strategy_rows: RolloutStrategyRow[];
  schema_version: string;
};

export type ReleasePolicies = {
  artifactNamingPolicy: ArtifactNamingPolicy;
  branchingPolicy: BranchingPolicy;
  policySnapshotHash: string;
  releaseChannelMatrix: ReleaseChannelMatrix;
  versioningPolicy: VersioningPolicy;
};

export type DerivedReleaseIdentity = {
  branch: {
    branch_family_ref: BranchFamilyRef;
    branch_ref: string;
    branch_role_ref: BranchRoleRef;
    extracted_tokens: Record<string, string>;
    pattern_ref: string;
    production_admissibility: string;
  };
  build: {
    build_id: string;
    build_sequence: number;
    build_timestamp: string;
    build_timestamp_compact: string;
    source_revision: string;
    source_revision_short: string;
  };
  candidate_identity_contract: ReleaseCandidateIdentityContract;
  compatibility: {
    compatibility_requirement: string;
    compatibility_verdict_ref: string;
    rollback_boundary_state: "FAIL_FORWARD_ONLY" | "ROLLBACK_ALLOWED";
  };
  policy_snapshot_hash: string;
  release_channel: {
    candidate_environment_ref: string;
    channel_slug: string;
    environment_ref: string;
    promotion_mode: string;
    release_channel_ref: ReleaseChannelRef;
  };
  rollout: {
    canary_aborted_release_id_or_null: string | null;
    compensating_release_id_or_null: string | null;
    emergency_override_expires_at_or_null: string | null;
    emergency_override_ref_or_null: string | null;
    fail_forward_owner_ref_or_null: string | null;
    pinned_baseline_release_id_or_null: string | null;
    posture_marker: string;
    rollout_strategy_ref: RolloutStrategyRef;
  };
  version: {
    build_metadata_tokens: string[];
    core_version: string;
    display_track_label: string;
    human_version: string;
    prerelease_label_or_null: string | null;
    version_slug: string;
    version_tag: string;
  };
};

let policyCache: ReleasePolicies | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function shortToken(value: string, length: number) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, length).toLowerCase();
}

function compactUtcTimestamp(iso: string) {
  const date = new Date(iso);
  assert(!Number.isNaN(date.getTime()), `Invalid build timestamp: ${iso}`);
  const year = `${date.getUTCFullYear()}`;
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hour = `${date.getUTCHours()}`.padStart(2, "0");
  const minute = `${date.getUTCMinutes()}`.padStart(2, "0");
  const second = `${date.getUTCSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}t${hour}${minute}${second}z`;
}

function slugifyVersion(value: string) {
  return value.toLowerCase().replace(/\+/g, "--").replace(/[^a-z0-9._-]+/g, "-");
}

function applyTemplate(template: string, tokens: Record<string, string>) {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => {
    assert(tokens[key] !== undefined, `Missing template token: ${key}`);
    return tokens[key];
  });
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalProviderProfileRefs(values: readonly string[]) {
  const normalized = values.map((value) => {
    assert(
      typeof value === "string" && value.trim() === value && value.length > 0,
      "Provider profile refs must be non-empty trimmed strings.",
    );
    return value;
  });
  const duplicates = normalized.filter((value, index) => normalized.indexOf(value) !== index);
  assert(
    duplicates.length === 0,
    `Provider profile refs must be unique before candidate hashing: ${[...new Set(duplicates)]
      .sort()
      .join(", ")}`,
  );
  return [...normalized].sort();
}

export function deriveReleaseCandidateIdentityHash(
  contract: Omit<ReleaseCandidateIdentityContract, "candidate_identity_hash">,
) {
  return stableJsonHash({
    artifact_digest: contract.artifact_digest,
    build_artifact_ref: contract.build_artifact_ref,
    candidate_environment_ref: contract.candidate_environment_ref,
    config_bundle_hash: contract.config_bundle_hash,
    enabled_provider_profile_refs: canonicalProviderProfileRefs(
      contract.enabled_provider_profile_refs,
    ),
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    schema_bundle_hash: contract.schema_bundle_hash,
    supported_client_window_ref_or_null: contract.supported_client_window_ref_or_null,
  });
}

function extractRegexTokens(match: RegExpExecArray) {
  const groups = match.groups ?? {};
  return Object.fromEntries(
    Object.entries(groups).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function validateVersionSeed(input: ReleaseIdentityInput) {
  const { versionSeed, requestedReleaseChannel, branchRef } = input;
  for (const key of ["major", "minor", "patch"] as const) {
    assert(isPositiveInteger(versionSeed[key]) || versionSeed[key] === 0, `Invalid ${key} version value.`);
  }
  if (requestedReleaseChannel === "PRODUCTION") {
    assert(
      versionSeed.channelIterationOrNull === null || versionSeed.channelIterationOrNull === undefined,
      `Production release ${branchRef} must not carry a prerelease channel iteration.`,
    );
  } else {
    assert(
      isPositiveInteger(versionSeed.channelIterationOrNull),
      `${requestedReleaseChannel} requires a positive channelIterationOrNull.`,
    );
  }
}

function applyRolloutMetadataTokens(
  input: ReleaseIdentityInput,
  rolloutRow: RolloutStrategyRow,
  versioningPolicy: VersioningPolicy,
) {
  const rolloutMetadataRow = versioningPolicy.rollout_metadata_rows.find(
    (row) => row.rollout_strategy_ref === rolloutRow.rollout_strategy_ref,
  );
  assert(rolloutMetadataRow, `Missing rollout metadata row for ${rolloutRow.rollout_strategy_ref}.`);

  const pinnedBaselineShort = input.buildMetadata.pinnedBaselineReleaseIdOrNull
    ? shortToken(input.buildMetadata.pinnedBaselineReleaseIdOrNull, 8)
    : "none";
  const compensatingReleaseShort = input.buildMetadata.compensatingReleaseIdOrNull
    ? shortToken(input.buildMetadata.compensatingReleaseIdOrNull, 8)
    : "none";

  return rolloutMetadataRow.additional_build_metadata_tokens.map((token) =>
    token
      .replace("{baseline_release_short}", pinnedBaselineShort)
      .replace("{compensating_release_short}", compensatingReleaseShort),
  );
}

export async function loadReleasePolicies(options?: { reload?: boolean }): Promise<ReleasePolicies> {
  if (!options?.reload && policyCache) {
    return policyCache;
  }

  const [branchingPolicy, versioningPolicy, artifactNamingPolicy, releaseChannelMatrix] =
    await Promise.all([
      readJson<BranchingPolicy>(branchingPolicyPath),
      readJson<VersioningPolicy>(versioningPolicyPath),
      readJson<ArtifactNamingPolicy>(artifactNamingPolicyPath),
      readJson<ReleaseChannelMatrix>(channelMatrixPath),
    ]);

  const policySnapshotHash = stableHash({
    artifactNamingPolicy,
    branchingPolicy,
    releaseChannelMatrix,
    versioningPolicy,
  });

  policyCache = {
    artifactNamingPolicy,
    branchingPolicy,
    policySnapshotHash,
    releaseChannelMatrix,
    versioningPolicy,
  };
  return policyCache;
}

export function classifyBranchRef(branchRef: string, branchingPolicy: BranchingPolicy) {
  for (const row of branchingPolicy.branch_pattern_rows) {
    const match = new RegExp(row.regex).exec(branchRef);
    if (!match) {
      continue;
    }
    return {
      branch_family_ref: row.branch_family_ref,
      branch_ref: branchRef,
      branch_role_ref: row.branch_role_ref,
      extracted_tokens: extractRegexTokens(match),
      pattern_ref: row.pattern_ref,
      production_admissibility: row.production_admissibility,
      row,
    };
  }
  throw new Error(`Branch ref ${branchRef} does not match any governed release branch pattern.`);
}

export function deriveRollbackBoundaryState(verdictRef: string) {
  return verdictRef === "ROLLBACK_SAFE" ? "ROLLBACK_ALLOWED" : "FAIL_FORWARD_ONLY";
}

export async function deriveReleaseIdentity(
  input: ReleaseIdentityInput,
  options?: { reloadPolicies?: boolean },
): Promise<DerivedReleaseIdentity> {
  validateVersionSeed(input);
  assert(isPositiveInteger(input.buildMetadata.buildSequence), "buildSequence must be a positive integer.");
  assert(input.enabledProviderProfileRefs.length > 0, "At least one provider profile ref is required.");
  const enabledProviderProfileRefs = canonicalProviderProfileRefs(
    input.enabledProviderProfileRefs,
  );

  const policies = await loadReleasePolicies(options?.reloadPolicies ? { reload: true } : undefined);
  const branch = classifyBranchRef(input.branchRef, policies.branchingPolicy);
  const channelRow = policies.releaseChannelMatrix.release_channel_rows.find(
    (row) => row.release_channel_ref === input.requestedReleaseChannel,
  );
  assert(channelRow, `Unknown release channel ${input.requestedReleaseChannel}.`);

  const rolloutRow = policies.releaseChannelMatrix.rollout_strategy_rows.find(
    (row) => row.rollout_strategy_ref === input.rolloutStrategyRef,
  );
  assert(rolloutRow, `Unknown rollout strategy ${input.rolloutStrategyRef}.`);

  assert(
    branch.row.allowed_release_channel_refs.includes(input.requestedReleaseChannel),
    `Branch ${input.branchRef} is not allowed to build channel ${input.requestedReleaseChannel}.`,
  );
  assert(
    branch.row.allowed_rollout_strategy_refs.includes(input.rolloutStrategyRef),
    `Branch ${input.branchRef} is not allowed to use rollout ${input.rolloutStrategyRef}.`,
  );
  assert(
    channelRow.allowed_branch_family_refs.includes(branch.branch_family_ref) &&
      channelRow.allowed_branch_role_refs.includes(branch.branch_role_ref),
    `Channel ${input.requestedReleaseChannel} rejects branch family ${branch.branch_family_ref}/${branch.branch_role_ref}.`,
  );
  assert(
    channelRow.allowed_rollout_strategy_refs.includes(input.rolloutStrategyRef),
    `Channel ${input.requestedReleaseChannel} does not allow rollout ${input.rolloutStrategyRef}.`,
  );
  assert(
    rolloutRow.allowed_release_channel_refs.includes(input.requestedReleaseChannel),
    `Rollout ${input.rolloutStrategyRef} cannot target channel ${input.requestedReleaseChannel}.`,
  );
  assert(
    rolloutRow.required_compatibility_verdict_refs.includes(input.buildMetadata.compatibilityVerdictRef),
    `Rollout ${input.rolloutStrategyRef} requires compatibility verdicts ${rolloutRow.required_compatibility_verdict_refs.join(", ")}.`,
  );

  const requiredMetadataMap = {
    canary_aborted_release_id_or_null: input.buildMetadata.canaryAbortedReleaseIdOrNull ?? null,
    compensating_release_id_or_null: input.buildMetadata.compensatingReleaseIdOrNull ?? null,
    emergency_override_expires_at: input.buildMetadata.emergencyOverrideExpiresAtOrNull ?? null,
    emergency_override_ref: input.buildMetadata.emergencyOverrideRefOrNull ?? null,
    fail_forward_owner_ref_or_null: input.buildMetadata.failForwardOwnerRefOrNull ?? null,
    pinned_baseline_release_id_or_null: input.buildMetadata.pinnedBaselineReleaseIdOrNull ?? null,
  } as const;

  for (const key of rolloutRow.required_metadata_refs) {
    const value = requiredMetadataMap[key as keyof typeof requiredMetadataMap];
    assert(typeof value === "string" && value.length > 0, `Rollout ${input.rolloutStrategyRef} requires ${key}.`);
  }

  const channelVersionRow = policies.versioningPolicy.channel_version_rows.find(
    (row) => row.release_channel_ref === input.requestedReleaseChannel,
  );
  assert(channelVersionRow, `No version row for channel ${input.requestedReleaseChannel}.`);
  assert(
    channelVersionRow.allowed_branch_family_refs.includes(branch.branch_family_ref),
    `Versioning policy rejects ${branch.branch_family_ref} for ${input.requestedReleaseChannel}.`,
  );

  const buildTimestampCompact = compactUtcTimestamp(input.buildMetadata.buildTimestamp);
  const shortCommit = shortToken(
    input.sourceRevision,
    policies.versioningPolicy.build_id_policy.short_commit_length,
  );
  const buildSequencePadded = `${input.buildMetadata.buildSequence}`.padStart(
    policies.versioningPolicy.build_id_policy.build_sequence_width,
    "0",
  );
  const buildId = applyTemplate(policies.versioningPolicy.build_id_policy.template, {
    build_sequence_padded: buildSequencePadded,
    channel_slug: channelRow.channel_slug,
    short_commit: shortCommit,
    timestamp_compact: buildTimestampCompact,
  });

  const coreVersion = `${input.versionSeed.major}.${input.versionSeed.minor}.${input.versionSeed.patch}`;
  const prereleaseLabel =
    channelVersionRow.prerelease_template === null
      ? null
      : applyTemplate(channelVersionRow.prerelease_template, {
          channel_iteration: `${input.versionSeed.channelIterationOrNull}`,
        });

  const buildMetadataTokens = channelVersionRow.build_metadata_tokens.map((token) =>
    token
      .replace("{build_sequence_padded}", buildSequencePadded)
      .replace("{short_commit}", shortCommit),
  );
  if (branch.branch_family_ref === "HOTFIX") {
    assert(
      isPositiveInteger(input.versionSeed.hotfixIterationOrNull),
      `Hotfix branch ${input.branchRef} requires hotfixIterationOrNull.`,
    );
    buildMetadataTokens.push(`hf${input.versionSeed.hotfixIterationOrNull}`);
  }
  buildMetadataTokens.push(
    ...applyRolloutMetadataTokens(input, rolloutRow, policies.versioningPolicy),
  );

  const dedupedBuildMetadataTokens = [...new Set(buildMetadataTokens)];
  const humanVersion = `${coreVersion}${prereleaseLabel ? `-${prereleaseLabel}` : ""}+${dedupedBuildMetadataTokens.join(".")}`;
  const versionSlug = slugifyVersion(humanVersion);
  const versionTag = versionSlug.replace(/--+/g, "--");

  const buildArtifactRef = `build.${channelRow.channel_slug}.${buildId}`;
  const candidateContractWithoutHash = {
    contract_version: "RELEASE_CANDIDATE_IDENTITY_V1",
    candidate_environment_ref: channelRow.candidate_environment_ref,
    build_artifact_ref: buildArtifactRef,
    artifact_digest: input.artifactDigest,
    schema_bundle_hash: input.buildMetadata.schemaBundleHash,
    config_bundle_hash: input.configBundleHash,
    migration_plan_ref_or_null: input.migrationPlanRefOrNull ?? null,
    enabled_provider_profile_refs: enabledProviderProfileRefs,
    supported_client_window_ref_or_null: input.supportedClientWindowRefOrNull ?? null,
    array_canonicalization_policy: "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY",
    suite_context_policy: "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL",
    admissibility_binding_policy: "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING",
  } satisfies Omit<ReleaseCandidateIdentityContract, "candidate_identity_hash">;

  const candidateIdentityContract = {
    ...candidateContractWithoutHash,
    candidate_identity_hash: deriveReleaseCandidateIdentityHash(candidateContractWithoutHash),
  } satisfies ReleaseCandidateIdentityContract;

  return {
    branch: {
      branch_family_ref: branch.branch_family_ref,
      branch_ref: branch.branch_ref,
      branch_role_ref: branch.branch_role_ref,
      extracted_tokens: branch.extracted_tokens,
      pattern_ref: branch.pattern_ref,
      production_admissibility: branch.production_admissibility,
    },
    build: {
      build_id: buildId,
      build_sequence: input.buildMetadata.buildSequence,
      build_timestamp: input.buildMetadata.buildTimestamp,
      build_timestamp_compact: buildTimestampCompact,
      source_revision: input.sourceRevision,
      source_revision_short: shortCommit,
    },
    candidate_identity_contract: candidateIdentityContract,
    compatibility: {
      compatibility_requirement: channelRow.compatibility_requirement,
      compatibility_verdict_ref: input.buildMetadata.compatibilityVerdictRef,
      rollback_boundary_state: deriveRollbackBoundaryState(input.buildMetadata.compatibilityVerdictRef),
    },
    policy_snapshot_hash: policies.policySnapshotHash,
    release_channel: {
      candidate_environment_ref: channelRow.candidate_environment_ref,
      channel_slug: channelRow.channel_slug,
      environment_ref: channelRow.environment_ref,
      promotion_mode: channelRow.promotion_mode,
      release_channel_ref: channelRow.release_channel_ref,
    },
    rollout: {
      canary_aborted_release_id_or_null: input.buildMetadata.canaryAbortedReleaseIdOrNull ?? null,
      compensating_release_id_or_null: input.buildMetadata.compensatingReleaseIdOrNull ?? null,
      emergency_override_expires_at_or_null:
        input.buildMetadata.emergencyOverrideExpiresAtOrNull ?? null,
      emergency_override_ref_or_null: input.buildMetadata.emergencyOverrideRefOrNull ?? null,
      fail_forward_owner_ref_or_null: input.buildMetadata.failForwardOwnerRefOrNull ?? null,
      pinned_baseline_release_id_or_null: input.buildMetadata.pinnedBaselineReleaseIdOrNull ?? null,
      posture_marker: rolloutRow.posture_marker,
      rollout_strategy_ref: input.rolloutStrategyRef,
    },
    version: {
      build_metadata_tokens: dedupedBuildMetadataTokens,
      core_version: coreVersion,
      display_track_label: channelVersionRow.display_track_label,
      human_version: humanVersion,
      prerelease_label_or_null: prereleaseLabel,
      version_slug: versionSlug,
      version_tag: versionTag,
    },
  };
}

export async function readReleaseIdentityInput(filePath: string) {
  return readJson<ReleaseIdentityInput>(path.resolve(filePath));
}

export async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const inputPath = inputIndex === -1 ? undefined : args[inputIndex + 1];
  assert(typeof inputPath === "string" && inputPath.length > 0, "Usage: --input <release-identity-input.json>");
  const input = await readReleaseIdentityInput(inputPath);
  const identity = await deriveReleaseIdentity(input);
  console.log(JSON.stringify(identity, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
