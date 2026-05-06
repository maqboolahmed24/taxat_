import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  projectionHash,
  type VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";

export type VisibilityPartitionArtifactScope = VisibilityPartitionContract["partition_scope"];
export type VisibilityPartitionAudienceClass = VisibilityPartitionContract["audience_class"];
export type VisibilityClass = VisibilityPartitionContract["allowed_visibility_classes"][number];

export type EnforceVisibilityPartitionInput = {
  artifact: Record<string, unknown>;
  artifact_label?: string | undefined;
  expected_allowed_visibility_classes?: readonly VisibilityClass[] | undefined;
  expected_audience_class?: VisibilityPartitionAudienceClass | undefined;
  expected_partition_scope?: VisibilityPartitionArtifactScope | undefined;
};

function fail(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(label: string, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireExact<T extends string>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    fail(`${label} must be ${expected}`);
  }
  return expected;
}

function requireAllowedVisibilityClasses(value: unknown): VisibilityClass[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("visibility_partition.allowed_visibility_classes must be a non-empty array");
  }
  const allowed = value.map((entry) => {
    if (entry !== "CUSTOMER_VISIBLE" && entry !== "INTERNAL_ONLY") {
      fail("visibility_partition.allowed_visibility_classes contains an unknown lane");
    }
    return entry;
  });
  if (new Set(allowed).size !== allowed.length) {
    fail("visibility_partition.allowed_visibility_classes must be unique");
  }
  return allowed;
}

function assertExactVisibilityClasses(
  actual: readonly VisibilityClass[],
  expected: readonly VisibilityClass[],
  message: string,
) {
  if (projectionHash(actual) !== projectionHash(expected)) {
    fail(message);
  }
}

function normalizeVisibilityPartition(value: unknown): VisibilityPartitionContract {
  const input = requireRecord("visibility_partition", value);
  const partition_scope = requireString(
    "visibility_partition.partition_scope",
    input.partition_scope,
  ) as VisibilityPartitionContract["partition_scope"];
  const audience_class = requireString(
    "visibility_partition.audience_class",
    input.audience_class,
  ) as VisibilityPartitionContract["audience_class"];
  const badge_counter_policy = requireString(
    "visibility_partition.badge_counter_policy",
    input.badge_counter_policy,
  ) as VisibilityPartitionContract["badge_counter_policy"];
  const ordering_side_channel_policy = requireString(
    "visibility_partition.ordering_side_channel_policy",
    input.ordering_side_channel_policy,
  ) as VisibilityPartitionContract["ordering_side_channel_policy"];

  return {
    access_binding_hash: requireString(
      "visibility_partition.access_binding_hash",
      input.access_binding_hash,
    ),
    allowed_visibility_classes: requireAllowedVisibilityClasses(input.allowed_visibility_classes),
    audience_class,
    badge_counter_policy,
    cache_partition_key: requireString(
      "visibility_partition.cache_partition_key",
      input.cache_partition_key,
    ),
    export_scope_policy: requireExact(
      "visibility_partition.export_scope_policy",
      input.export_scope_policy,
      "MOUNTED_ROUTE_VISIBILITY_ONLY",
    ),
    fallback_discovery_policy: requireExact(
      "visibility_partition.fallback_discovery_policy",
      input.fallback_discovery_policy,
      "NO_CROSS_PARTITION_DISCOVERY",
    ),
    limited_state_presentation: requireExact(
      "visibility_partition.limited_state_presentation",
      input.limited_state_presentation,
      "EXPLICIT_LIMITATION_NOTICE",
    ),
    masking_posture_fingerprint: requireString(
      "visibility_partition.masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    ordering_side_channel_policy,
    partition_scope,
  };
}

function assertOptionalMirror(input: {
  actual: unknown;
  expected: string;
  label: string;
}) {
  if (input.actual !== undefined && input.actual !== null && input.actual !== input.expected) {
    fail(`${input.label} must mirror visibility_partition`);
  }
}

function validateCacheIsolationMirror(
  artifact: Record<string, unknown>,
  visibilityPartition: VisibilityPartitionContract,
) {
  if (!isRecord(artifact.cache_isolation_contract)) {
    return;
  }
  const cache = artifact.cache_isolation_contract;
  assertOptionalMirror({
    actual: cache.access_binding_hash_or_null,
    expected: visibilityPartition.access_binding_hash,
    label: "cache_isolation_contract.access_binding_hash_or_null",
  });
  assertOptionalMirror({
    actual: cache.masking_posture_fingerprint_or_null,
    expected: visibilityPartition.masking_posture_fingerprint,
    label: "cache_isolation_contract.masking_posture_fingerprint_or_null",
  });
  assertOptionalMirror({
    actual: cache.cache_partition_ref,
    expected: visibilityPartition.cache_partition_key,
    label: "cache_isolation_contract.cache_partition_ref",
  });
  assertOptionalMirror({
    actual: cache.visibility_cache_partition_key_or_null,
    expected: visibilityPartition.cache_partition_key,
    label: "cache_isolation_contract.visibility_cache_partition_key_or_null",
  });
}

function validateContinuityMirror(
  artifact: Record<string, unknown>,
  visibilityPartition: VisibilityPartitionContract,
) {
  if (!isRecord(artifact.cross_device_continuity_contract)) {
    return;
  }
  const continuity = artifact.cross_device_continuity_contract;
  assertOptionalMirror({
    actual: continuity.access_scope_hash_or_null,
    expected: visibilityPartition.access_binding_hash,
    label: "cross_device_continuity_contract.access_scope_hash_or_null",
  });
  assertOptionalMirror({
    actual: continuity.masking_scope_fingerprint_or_null,
    expected: visibilityPartition.masking_posture_fingerprint,
    label: "cross_device_continuity_contract.masking_scope_fingerprint_or_null",
  });
  assertOptionalMirror({
    actual: continuity.visibility_cache_partition_key_or_null,
    expected: visibilityPartition.cache_partition_key,
    label: "cross_device_continuity_contract.visibility_cache_partition_key_or_null",
  });
}

export function enforceVisibilityPartition(
  input: EnforceVisibilityPartitionInput,
): VisibilityPartitionContract {
  const label = input.artifact_label ?? String(input.artifact.artifact_type ?? "artifact");
  const visibilityPartition = normalizeVisibilityPartition(input.artifact.visibility_partition);

  if (
    input.expected_partition_scope !== undefined &&
    visibilityPartition.partition_scope !== input.expected_partition_scope
  ) {
    fail(`${label} visibility_partition.partition_scope drifted`);
  }
  if (
    input.expected_audience_class !== undefined &&
    visibilityPartition.audience_class !== input.expected_audience_class
  ) {
    fail(`${label} visibility_partition.audience_class drifted`);
  }
  if (input.expected_allowed_visibility_classes !== undefined) {
    assertExactVisibilityClasses(
      visibilityPartition.allowed_visibility_classes,
      input.expected_allowed_visibility_classes,
      `${label} visibility_partition.allowed_visibility_classes drifted`,
    );
  }
  if (
    visibilityPartition.audience_class === "CLIENT_PORTAL" ||
    visibilityPartition.audience_class === "CUSTOMER_COLLABORATION"
  ) {
    assertExactVisibilityClasses(
      visibilityPartition.allowed_visibility_classes,
      ["CUSTOMER_VISIBLE"],
      `${label} customer visibility partition must be customer-visible only`,
    );
  }
  if (visibilityPartition.badge_counter_policy === "SPLIT_LANE_COUNTS") {
    assertExactVisibilityClasses(
      visibilityPartition.allowed_visibility_classes,
      ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"],
      `${label} split-lane badge partitions must keep both visibility lanes`,
    );
  }

  assertOptionalMirror({
    actual: input.artifact.access_binding_hash,
    expected: visibilityPartition.access_binding_hash,
    label: `${label}.access_binding_hash`,
  });
  assertOptionalMirror({
    actual: input.artifact.masking_posture_fingerprint,
    expected: visibilityPartition.masking_posture_fingerprint,
    label: `${label}.masking_posture_fingerprint`,
  });
  validateCacheIsolationMirror(input.artifact, visibilityPartition);
  validateContinuityMirror(input.artifact, visibilityPartition);

  return visibilityPartition;
}
