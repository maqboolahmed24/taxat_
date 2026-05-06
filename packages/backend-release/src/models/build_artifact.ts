import type { BuildArtifact } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type BuildArtifactRecord = BuildArtifact;
export type BuildArtifactDistributionTarget = BuildArtifactRecord["distribution_targets"][number];

export type BuildArtifactDraft = {
  build_id: unknown;
  vcs_ref: unknown;
  artifact_digest: unknown;
  sbom_ref: unknown;
  provenance_ref: unknown;
  signature_ref: unknown;
  artifact_registry_ref: unknown;
  release_channel: unknown;
  build_time: unknown;
  distribution_targets: unknown;
  desktop_notarization_ref?: unknown;
  hardened_runtime_attestation_ref?: unknown;
};

export type BuildArtifactModelErrorCode =
  | "BUILD_ARTIFACT_FIELD_INVALID"
  | "BUILD_ARTIFACT_TARGET_INVALID"
  | "BUILD_ARTIFACT_TARGET_ORDER_INVALID"
  | "BUILD_ARTIFACT_DESKTOP_EVIDENCE_INVALID";

export class BuildArtifactModelError extends Error {
  readonly code: BuildArtifactModelErrorCode;

  constructor(code: BuildArtifactModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildArtifactModelError";
    this.code = code;
  }
}

export const BUILD_ARTIFACT_SCHEMA_ID =
  "https://taxat.dev/schemas/build_artifact.schema.json" as const;

export const BUILD_ARTIFACT_DISTRIBUTION_TARGET_ORDER = [
  "SERVER",
  "WEB_OPERATOR_SHELL",
  "MACOS_DESKTOP",
] as const satisfies readonly BuildArtifactDistributionTarget[];

const distributionTargetOrder = new Map(
  BUILD_ARTIFACT_DISTRIBUTION_TARGET_ORDER.map((target, index) => [target, index]),
);

function assertBuildArtifact(
  condition: unknown,
  code: BuildArtifactModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new BuildArtifactModelError(code, detail);
  }
}

function requireTrimmedString(label: string, value: unknown) {
  assertBuildArtifact(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "BUILD_ARTIFACT_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireNullableTrimmedString(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  if (typeof value === "undefined") {
    return null;
  }
  return requireTrimmedString(label, value);
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function compareDistributionTargets(
  left: BuildArtifactDistributionTarget,
  right: BuildArtifactDistributionTarget,
) {
  return distributionTargetOrder.get(left)! - distributionTargetOrder.get(right)!;
}

export function canonicalizeBuildArtifactDistributionTargets(
  values: unknown,
): BuildArtifactDistributionTarget[] {
  assertBuildArtifact(
    Array.isArray(values),
    "BUILD_ARTIFACT_TARGET_INVALID",
    "distribution_targets must be an array",
  );
  const normalized = values.map((value, index) => {
    assertBuildArtifact(
      typeof value === "string" &&
        distributionTargetOrder.has(value as BuildArtifactDistributionTarget),
      "BUILD_ARTIFACT_TARGET_INVALID",
      `distribution_targets[${index}] must be SERVER, WEB_OPERATOR_SHELL, or MACOS_DESKTOP`,
    );
    return value as BuildArtifactDistributionTarget;
  });
  const canonical = [...new Set(normalized)].sort(compareDistributionTargets);
  assertBuildArtifact(
    canonical.length > 0,
    "BUILD_ARTIFACT_TARGET_INVALID",
    "distribution_targets must contain at least one target",
  );
  return canonical;
}

export function isCanonicalBuildArtifactDistributionTargets(values: readonly string[]) {
  try {
    return arraysEqual(values, canonicalizeBuildArtifactDistributionTargets(values));
  } catch {
    return false;
  }
}

export function buildArtifactRef(record: Pick<BuildArtifactRecord, "build_id">) {
  return record.build_id;
}

export function normalizeBuildArtifactRecord(input: BuildArtifactDraft): BuildArtifactRecord {
  const distributionTargets = canonicalizeBuildArtifactDistributionTargets(
    input.distribution_targets,
  );
  const shipsMacosDesktop = distributionTargets.includes("MACOS_DESKTOP");
  const desktopNotarizationRef = requireNullableTrimmedString(
    "desktop_notarization_ref",
    input.desktop_notarization_ref,
  );
  const hardenedRuntimeAttestationRef = requireNullableTrimmedString(
    "hardened_runtime_attestation_ref",
    input.hardened_runtime_attestation_ref,
  );

  if (shipsMacosDesktop) {
    assertBuildArtifact(
      desktopNotarizationRef !== null && hardenedRuntimeAttestationRef !== null,
      "BUILD_ARTIFACT_DESKTOP_EVIDENCE_INVALID",
      "MACOS_DESKTOP build artifacts require notarization and hardened-runtime evidence refs",
    );
  }

  return {
    build_id: requireTrimmedString("build_id", input.build_id),
    vcs_ref: requireTrimmedString("vcs_ref", input.vcs_ref),
    artifact_digest: requireTrimmedString("artifact_digest", input.artifact_digest),
    sbom_ref: requireTrimmedString("sbom_ref", input.sbom_ref),
    provenance_ref: requireTrimmedString("provenance_ref", input.provenance_ref),
    signature_ref: requireTrimmedString("signature_ref", input.signature_ref),
    artifact_registry_ref: requireTrimmedString(
      "artifact_registry_ref",
      input.artifact_registry_ref,
    ),
    release_channel: requireTrimmedString("release_channel", input.release_channel),
    build_time: normalizeUtcInstantString(input.build_time),
    distribution_targets: distributionTargets,
    desktop_notarization_ref: shipsMacosDesktop ? desktopNotarizationRef : null,
    hardened_runtime_attestation_ref: shipsMacosDesktop
      ? hardenedRuntimeAttestationRef
      : null,
  };
}

export function assertBuildArtifactRecord(record: BuildArtifactRecord) {
  const normalized = normalizeBuildArtifactRecord(record);
  assertBuildArtifact(
    record.build_time === normalized.build_time,
    "BUILD_ARTIFACT_FIELD_INVALID",
    "build_time must be UTC-normalized before persistence",
  );
  assertBuildArtifact(
    arraysEqual(record.distribution_targets, normalized.distribution_targets),
    "BUILD_ARTIFACT_TARGET_ORDER_INVALID",
    "distribution_targets must be sorted in canonical release-target order",
  );
  assertBuildArtifact(
    record.desktop_notarization_ref === normalized.desktop_notarization_ref &&
      record.hardened_runtime_attestation_ref ===
        normalized.hardened_runtime_attestation_ref,
    "BUILD_ARTIFACT_DESKTOP_EVIDENCE_INVALID",
    "desktop-only evidence refs must appear only for MACOS_DESKTOP build artifacts",
  );
  return normalized;
}

export function cloneBuildArtifactRecord(record: BuildArtifactRecord) {
  return structuredClone(record);
}
