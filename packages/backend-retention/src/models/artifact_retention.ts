import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  normalizeNullableRetentionString,
  normalizeRetentionClass,
  normalizeRetentionLimitationBehavior,
  type RetentionClass,
  type RetentionLimitationBehavior,
  type RetentionModelErrorCode,
  type RetentionTagRecord,
  uniqueSortedRetentionStrings,
} from "./retention_tag.ts";

export const ARTIFACT_RETENTION_LIFECYCLE_STATES = [
  "ACTIVE",
  "LIMITED",
  "LEGAL_HOLD",
  "ERASURE_PENDING",
  "PSEUDONYMISED",
  "ERASED",
] as const;

export type ArtifactRetentionLifecycleState =
  (typeof ARTIFACT_RETENTION_LIFECYCLE_STATES)[number];

export type ArtifactRetentionRecord = {
  artifact_type: "ArtifactRetention";
  retention_scope_class: "GOVERNED_ARTIFACT";
  retention_id: string;
  tenant_id: string;
  artifact_ref: string;
  retention_tag_ref: string;
  retention_class: RetentionClass;
  lifecycle_state: ArtifactRetentionLifecycleState;
  minimum_expiry_at: string;
  policy_expiry_at: string;
  effective_expiry_at: string;
  state_changed_at: string;
  last_evaluated_at: string;
  hold_ref: string | null;
  next_checkpoint_at: string | null;
  workflow_item_refs: string[];
  limitation_behavior: RetentionLimitationBehavior | null;
  limitation_reason_codes: string[];
  erasure_request_ref: string | null;
  erasure_action_ref: string | null;
  erasure_proof_ref: string | null;
};

export type ArtifactRetentionInput = ArtifactRetentionRecord;

function assertArtifactRetention(
  condition: unknown,
  code: RetentionModelErrorCode,
  detail: string,
): asserts condition {
  assertRetention(condition, code, detail);
}

function normalizeLifecycleState(value: unknown) {
  assertArtifactRetention(
    typeof value === "string" &&
      ARTIFACT_RETENTION_LIFECYCLE_STATES.includes(value as ArtifactRetentionLifecycleState),
    "RETENTION_FIELD_INVALID",
    `lifecycle_state must be one of ${ARTIFACT_RETENTION_LIFECYCLE_STATES.join(", ")}`,
  );
  return value as ArtifactRetentionLifecycleState;
}

function epoch(value: string) {
  return Date.parse(value);
}

function assertAtOrAfter(label: string, candidate: string, floorLabel: string, floor: string) {
  assertArtifactRetention(
    epoch(candidate) >= epoch(floor),
    "RETENTION_CHRONOLOGY_INVALID",
    `${label} must not be earlier than ${floorLabel}`,
  );
}

function normalizeNullableRetentionInstant(label: string, value: unknown) {
  return value === null ? null : normalizeUtcInstantString(value);
}

export function normalizeArtifactRetention(input: ArtifactRetentionInput): ArtifactRetentionRecord {
  assertArtifactRetention(
    input.artifact_type === "ArtifactRetention",
    "RETENTION_FIELD_INVALID",
    "artifact_type must be ArtifactRetention",
  );
  assertArtifactRetention(
    input.retention_scope_class === "GOVERNED_ARTIFACT",
    "RETENTION_FIELD_INVALID",
    "retention_scope_class must be GOVERNED_ARTIFACT",
  );

  const limitationBehavior =
    input.limitation_behavior === null
      ? null
      : normalizeRetentionLimitationBehavior(input.limitation_behavior);

  const artifactRetention: ArtifactRetentionRecord = {
    artifact_type: "ArtifactRetention",
    retention_scope_class: "GOVERNED_ARTIFACT",
    retention_id: assertNonEmptyRetentionString("retention_id", input.retention_id),
    tenant_id: assertNonEmptyRetentionString("tenant_id", input.tenant_id),
    artifact_ref: assertNonEmptyRetentionString("artifact_ref", input.artifact_ref),
    retention_tag_ref: assertNonEmptyRetentionString(
      "retention_tag_ref",
      input.retention_tag_ref,
    ),
    retention_class: normalizeRetentionClass(input.retention_class),
    lifecycle_state: normalizeLifecycleState(input.lifecycle_state),
    minimum_expiry_at: normalizeUtcInstantString(input.minimum_expiry_at),
    policy_expiry_at: normalizeUtcInstantString(input.policy_expiry_at),
    effective_expiry_at: normalizeUtcInstantString(input.effective_expiry_at),
    state_changed_at: normalizeUtcInstantString(input.state_changed_at),
    last_evaluated_at: normalizeUtcInstantString(input.last_evaluated_at),
    hold_ref: normalizeNullableRetentionString("hold_ref", input.hold_ref),
    next_checkpoint_at: normalizeNullableRetentionInstant(
      "next_checkpoint_at",
      input.next_checkpoint_at,
    ),
    workflow_item_refs: uniqueSortedRetentionStrings(
      "workflow_item_refs",
      input.workflow_item_refs,
    ),
    limitation_behavior: limitationBehavior === "NONE" ? null : limitationBehavior,
    limitation_reason_codes: uniqueSortedRetentionStrings(
      "limitation_reason_codes",
      input.limitation_reason_codes,
    ),
    erasure_request_ref: normalizeNullableRetentionString(
      "erasure_request_ref",
      input.erasure_request_ref,
    ),
    erasure_action_ref: normalizeNullableRetentionString(
      "erasure_action_ref",
      input.erasure_action_ref,
    ),
    erasure_proof_ref: normalizeNullableRetentionString(
      "erasure_proof_ref",
      input.erasure_proof_ref,
    ),
  };

  assertArtifactRetentionInvariants(artifactRetention);
  return artifactRetention;
}

export function assertArtifactRetentionInvariants(record: ArtifactRetentionRecord) {
  assertAtOrAfter(
    "effective_expiry_at",
    record.effective_expiry_at,
    "minimum_expiry_at",
    record.minimum_expiry_at,
  );
  assertAtOrAfter(
    "effective_expiry_at",
    record.effective_expiry_at,
    "policy_expiry_at",
    record.policy_expiry_at,
  );
  assertAtOrAfter(
    "last_evaluated_at",
    record.last_evaluated_at,
    "state_changed_at",
    record.state_changed_at,
  );
  if (record.next_checkpoint_at !== null) {
    assertAtOrAfter(
      "next_checkpoint_at",
      record.next_checkpoint_at,
      "state_changed_at",
      record.state_changed_at,
    );
  }

  if (record.lifecycle_state === "LEGAL_HOLD") {
    assertArtifactRetention(
      record.hold_ref !== null &&
        record.next_checkpoint_at !== null &&
        record.workflow_item_refs.length > 0,
      "RETENTION_HOLD_POSTURE_INVALID",
      "LEGAL_HOLD requires hold ref, checkpoint, and workflow refs",
    );
    assertPendingOnlyClearsLimitationAndErasure(record, "LEGAL_HOLD");
    return;
  }

  assertArtifactRetention(
    record.hold_ref === null,
    "RETENTION_HOLD_POSTURE_INVALID",
    "hold_ref is only lawful on LEGAL_HOLD",
  );

  if (record.lifecycle_state === "ACTIVE") {
    assertNoPendingRefs(record, "ACTIVE");
    assertNoLimitation(record, "ACTIVE");
    assertNoErasureRefs(record, "ACTIVE");
    return;
  }

  if (record.lifecycle_state === "LIMITED") {
    assertNoPendingRefs(record, "LIMITED");
    assertLimitation(record, "LIMITED");
    assertNoErasureRefs(record, "LIMITED");
    return;
  }

  if (record.lifecycle_state === "ERASURE_PENDING") {
    assertArtifactRetention(
      record.next_checkpoint_at !== null &&
        record.workflow_item_refs.length > 0 &&
        record.erasure_request_ref !== null,
      "RETENTION_FIELD_INVALID",
      "ERASURE_PENDING requires request, checkpoint, and workflow refs",
    );
    assertNoLimitation(record, "ERASURE_PENDING");
    assertArtifactRetention(
      record.erasure_action_ref === null && record.erasure_proof_ref === null,
      "RETENTION_FIELD_INVALID",
      "ERASURE_PENDING must not carry completed erasure action or proof refs",
    );
    return;
  }

  assertNoPendingRefs(record, record.lifecycle_state);
  assertArtifactRetention(
    record.erasure_request_ref !== null &&
      record.erasure_action_ref !== null &&
      record.erasure_proof_ref !== null,
    "RETENTION_FIELD_INVALID",
    `${record.lifecycle_state} requires erasure request, action, and proof refs`,
  );

  if (record.lifecycle_state === "PSEUDONYMISED") {
    assertLimitation(record, "PSEUDONYMISED");
  } else {
    assertNoLimitation(record, "ERASED");
  }
}

function assertPendingOnlyClearsLimitationAndErasure(
  record: ArtifactRetentionRecord,
  state: ArtifactRetentionLifecycleState,
) {
  assertNoLimitation(record, state);
  assertNoErasureRefs(record, state);
}

function assertNoPendingRefs(
  record: ArtifactRetentionRecord,
  state: ArtifactRetentionLifecycleState,
) {
  assertArtifactRetention(
    record.next_checkpoint_at === null && record.workflow_item_refs.length === 0,
    "RETENTION_FIELD_INVALID",
    `${state} must not carry pending checkpoint or workflow refs`,
  );
}

function assertNoLimitation(
  record: ArtifactRetentionRecord,
  state: ArtifactRetentionLifecycleState,
) {
  assertArtifactRetention(
    record.limitation_behavior === null && record.limitation_reason_codes.length === 0,
    "RETENTION_LIMITATION_INVALID",
    `${state} must not carry limitation behavior or reasons`,
  );
}

function assertLimitation(
  record: ArtifactRetentionRecord,
  state: ArtifactRetentionLifecycleState,
) {
  assertArtifactRetention(
    record.limitation_behavior !== null && record.limitation_reason_codes.length > 0,
    "RETENTION_LIMITATION_INVALID",
    `${state} requires explicit limitation behavior and reasons`,
  );
}

function assertNoErasureRefs(
  record: ArtifactRetentionRecord,
  state: ArtifactRetentionLifecycleState,
) {
  assertArtifactRetention(
    record.erasure_request_ref === null &&
      record.erasure_action_ref === null &&
      record.erasure_proof_ref === null,
    "RETENTION_FIELD_INVALID",
    `${state} must not carry erasure request, action, or proof refs`,
  );
}

export function deriveArtifactRetentionId(input: {
  artifact_ref: string;
  retention_tag_ref: string;
  tenant_id: string;
}) {
  return `artifact-retention://${stableJsonHash({
    artifact_ref: assertNonEmptyRetentionString("artifact_ref", input.artifact_ref),
    retention_tag_ref: assertNonEmptyRetentionString(
      "retention_tag_ref",
      input.retention_tag_ref,
    ),
    tenant_id: assertNonEmptyRetentionString("tenant_id", input.tenant_id),
  })}`;
}

export function artifactRetentionFromTag(input: {
  artifact_ref: string;
  last_evaluated_at: string;
  lifecycle_state: ArtifactRetentionLifecycleState;
  retention_id?: string;
  retention_tag: RetentionTagRecord;
  state_changed_at: string;
  tenant_id: string;
  hold_ref?: string | null;
  next_checkpoint_at?: string | null;
  workflow_item_refs?: readonly string[];
  limitation_behavior?: RetentionLimitationBehavior | null;
  limitation_reason_codes?: readonly string[];
  erasure_request_ref?: string | null;
  erasure_action_ref?: string | null;
  erasure_proof_ref?: string | null;
}) {
  return normalizeArtifactRetention({
    artifact_type: "ArtifactRetention",
    retention_scope_class: "GOVERNED_ARTIFACT",
    retention_id:
      input.retention_id ??
      deriveArtifactRetentionId({
        artifact_ref: input.artifact_ref,
        retention_tag_ref: input.retention_tag.retention_tag_id,
        tenant_id: input.tenant_id,
      }),
    tenant_id: input.tenant_id,
    artifact_ref: input.artifact_ref,
    retention_tag_ref: input.retention_tag.retention_tag_id,
    retention_class: input.retention_tag.retention_class,
    lifecycle_state: input.lifecycle_state,
    minimum_expiry_at: input.retention_tag.minimum_expiry_at,
    policy_expiry_at: input.retention_tag.policy_expiry_at,
    effective_expiry_at: input.retention_tag.effective_expiry_at,
    state_changed_at: input.state_changed_at,
    last_evaluated_at: input.last_evaluated_at,
    hold_ref: input.hold_ref ?? null,
    next_checkpoint_at: input.next_checkpoint_at ?? null,
    workflow_item_refs: [...(input.workflow_item_refs ?? [])],
    limitation_behavior: input.limitation_behavior ?? null,
    limitation_reason_codes: [...(input.limitation_reason_codes ?? [])],
    erasure_request_ref: input.erasure_request_ref ?? null,
    erasure_action_ref: input.erasure_action_ref ?? null,
    erasure_proof_ref: input.erasure_proof_ref ?? null,
  });
}
