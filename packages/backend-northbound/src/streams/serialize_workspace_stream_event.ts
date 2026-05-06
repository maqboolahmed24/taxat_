import type { WorkspaceStreamEvent } from "../../../../packages/generated-models/src/generated/typescript/client-and-collaboration.ts";
import { encodeSseFrame } from "../../../domain-kernel/src/streaming/sse_frame_encoder.ts";

export class WorkspaceStreamEventValidationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "WorkspaceStreamEventValidationError";
    this.reasonCodes = reasonCodes;
  }
}

const eventTypes = new Set<WorkspaceStreamEvent["event_type"]>([
  "activity.appended",
  "audit.appended",
  "heartbeat",
  "notification.badge",
  "workspace.delta",
  "workspace.snapshot",
]);

function fail(message: string, reasonCodes: string[]): never {
  throw new WorkspaceStreamEventValidationError(message, reasonCodes);
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`, ["WORKSPACE_STREAM_EVENT_SCHEMA_INVALID"]);
  }
}

function assertNullableString(label: string, value: unknown): asserts value is string | null {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    fail(`${label} must be a non-empty string or null`, [
      "WORKSPACE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`, [
      "WORKSPACE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
}

function assertNullPayloadRefs(event: WorkspaceStreamEvent) {
  if (
    event.snapshot_ref !== null ||
    event.delta_ref !== null ||
    event.activity_ref !== null ||
    event.audit_ref !== null ||
    event.notification_ref !== null
  ) {
    fail("heartbeat must not carry payload refs", [
      "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
    ]);
  }
}

function assertEventPayloadRef(event: WorkspaceStreamEvent) {
  if (event.event_type === "workspace.delta") {
    assertNonEmptyString("delta_ref", event.delta_ref);
    if (
      event.snapshot_ref !== null ||
      event.activity_ref !== null ||
      event.audit_ref !== null ||
      event.notification_ref !== null ||
      event.queue_projection_or_null === null
    ) {
      fail("workspace.delta must carry only delta_ref and queue projection", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "workspace.snapshot") {
    assertNonEmptyString("snapshot_ref", event.snapshot_ref);
    if (
      event.delta_ref !== null ||
      event.activity_ref !== null ||
      event.audit_ref !== null ||
      event.notification_ref !== null ||
      event.queue_projection_or_null !== null
    ) {
      fail("workspace.snapshot must carry only snapshot_ref", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "activity.appended") {
    assertNonEmptyString("activity_ref", event.activity_ref);
    if (
      event.snapshot_ref !== null ||
      event.delta_ref !== null ||
      event.audit_ref !== null ||
      event.notification_ref !== null ||
      event.queue_projection_or_null === null
    ) {
      fail("activity.appended must carry only activity_ref and queue projection", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "audit.appended") {
    assertNonEmptyString("audit_ref", event.audit_ref);
    if (
      event.snapshot_ref !== null ||
      event.delta_ref !== null ||
      event.activity_ref !== null ||
      event.notification_ref !== null ||
      event.queue_projection_or_null !== null ||
      event.session_visibility_class !== "STAFF_FULL"
    ) {
      fail("audit.appended must be staff-only and carry only audit_ref", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "notification.badge") {
    assertNonEmptyString("notification_ref", event.notification_ref);
    if (
      event.snapshot_ref !== null ||
      event.delta_ref !== null ||
      event.activity_ref !== null ||
      event.audit_ref !== null ||
      event.queue_projection_or_null === null
    ) {
      fail("notification.badge must carry only notification_ref and queue projection", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "heartbeat") {
    assertNullPayloadRefs(event);
    if (event.queue_projection_or_null !== null) {
      fail("heartbeat must not carry queue projection", [
        "WORKSPACE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  fail("workspace stream event type is invalid", ["WORKSPACE_STREAM_EVENT_TYPE_INVALID"]);
}

function assertGroupedContracts(event: WorkspaceStreamEvent) {
  const stability = event.stability_contract;
  if (stability.route_scope_class !== "WORKSPACE") {
    fail("event stability scope must be WORKSPACE", [
      "WORKSPACE_STREAM_EVENT_STABILITY_SCOPE_DRIFT",
    ]);
  }
  if (stability.resume_capability !== "STREAM_RESUMABLE") {
    fail("event stability contract must remain stream resumable", [
      "WORKSPACE_STREAM_EVENT_STABILITY_RESUME_DRIFT",
    ]);
  }
  if (stability.resume_token_or_null !== event.resume_token) {
    fail("event stability resume token drifted", [
      "WORKSPACE_STREAM_EVENT_STABILITY_RESUME_TOKEN_DRIFT",
    ]);
  }
  if (
    stability.last_published_sequence_or_null !==
    event.stream_recovery_contract.last_published_sequence
  ) {
    fail("event stability frontier drifted", [
      "WORKSPACE_STREAM_EVENT_STABILITY_FRONTIER_DRIFT",
    ]);
  }
  const guardVector = stability.guard_vector_components;
  if (
    guardVector.shell_stability_token_or_null !== event.shell_stability_token ||
    guardVector.frame_epoch_or_null !== event.frame_epoch ||
    guardVector.work_item_version_or_null !== event.workspace_version
  ) {
    fail("event stability guard vector drifted", [
      "WORKSPACE_STREAM_EVENT_STABILITY_GUARD_DRIFT",
    ]);
  }
  if (
    event.session_visibility_class === "CUSTOMER_VISIBLE" &&
    guardVector.internal_thread_head_or_null !== null
  ) {
    fail("customer stream event leaked internal head in stability contract", [
      "WORKSPACE_STREAM_EVENT_CUSTOMER_INTERNAL_HEAD_LEAK",
    ]);
  }

  const recovery = event.stream_recovery_contract;
  if (recovery.stream_scope_class !== "WORKSPACE") {
    fail("event stream scope must be WORKSPACE", [
      "WORKSPACE_STREAM_EVENT_RECOVERY_SCOPE_DRIFT",
    ]);
  }
  if (
    recovery.route_key !== event.workspace_route_key ||
    recovery.subject_ref !== event.item_id ||
    recovery.shell_stability_token !== event.shell_stability_token ||
    recovery.frame_epoch !== event.frame_epoch ||
    recovery.access_binding_hash !== event.access_binding_hash ||
    recovery.masking_context_hash !== event.masking_posture_fingerprint
  ) {
    fail("event stream recovery contract drifted from event fields", [
      "WORKSPACE_STREAM_EVENT_RECOVERY_DRIFT",
    ]);
  }
  if (
    recovery.resume_binding_representation !== "RAW_TOKEN" ||
    recovery.resume_binding_ref_or_null !== event.resume_token
  ) {
    fail("event stream resume binding drifted", [
      "WORKSPACE_STREAM_EVENT_RECOVERY_RESUME_TOKEN_DRIFT",
    ]);
  }
}

function assertVisibility(event: WorkspaceStreamEvent) {
  if (event.object_anchor_ref !== event.item_id) {
    fail("workspace event object anchor must equal item id", [
      "WORKSPACE_STREAM_EVENT_OBJECT_ANCHOR_DRIFT",
    ]);
  }
  if (event.session_visibility_class === "STAFF_FULL") {
    if (event.shell_family !== "CALM_SHELL" || event.customer_safe_projection !== null) {
      fail("staff workspace stream events must clear customer safe projection", [
        "WORKSPACE_STREAM_EVENT_STAFF_VISIBILITY_DRIFT",
      ]);
    }
    return;
  }
  if (
    event.shell_family !== "CLIENT_PORTAL_SHELL" ||
    event.customer_safe_projection === null ||
    event.visibility_partition.allowed_visibility_classes.length !== 1 ||
    event.visibility_partition.allowed_visibility_classes[0] !== "CUSTOMER_VISIBLE" ||
    event.audit_ref !== null ||
    event.event_type === "audit.appended"
  ) {
    fail("customer workspace stream events must remain customer-visible", [
      "WORKSPACE_STREAM_EVENT_CUSTOMER_VISIBILITY_DRIFT",
    ]);
  }
}

export function validateWorkspaceStreamEvent(event: WorkspaceStreamEvent) {
  if (event.artifact_type !== "WorkspaceStreamEvent") {
    fail("event artifact_type must be WorkspaceStreamEvent", [
      "WORKSPACE_STREAM_EVENT_ARTIFACT_INVALID",
    ]);
  }
  if (event.stream_scope_class !== "WORKSPACE") {
    fail("event stream_scope_class must be WORKSPACE", [
      "WORKSPACE_STREAM_EVENT_SCOPE_INVALID",
    ]);
  }
  if (!eventTypes.has(event.event_type)) {
    fail("workspace stream event type is invalid", ["WORKSPACE_STREAM_EVENT_TYPE_INVALID"]);
  }
  assertNonEmptyString("item_id", event.item_id);
  assertNonEmptyString("object_anchor_ref", event.object_anchor_ref);
  assertNonEmptyString("workspace_route_key", event.workspace_route_key);
  assertNonEmptyString("shell_stability_token", event.shell_stability_token);
  assertNonEmptyString("access_binding_hash", event.access_binding_hash);
  assertNonEmptyString("masking_posture_fingerprint", event.masking_posture_fingerprint);
  assertNonEmptyString("resume_token", event.resume_token);
  assertNullableString("snapshot_ref", event.snapshot_ref);
  assertNullableString("delta_ref", event.delta_ref);
  assertNullableString("activity_ref", event.activity_ref);
  assertNullableString("audit_ref", event.audit_ref);
  assertNullableString("notification_ref", event.notification_ref);
  assertNonNegativeInteger("workspace_sequence", event.workspace_sequence);
  assertNonNegativeInteger("frame_epoch", event.frame_epoch);
  assertNonNegativeInteger("workspace_version", event.workspace_version);
  if (!Number.isFinite(Date.parse(event.occurred_at))) {
    fail("occurred_at must be a valid ISO instant", [
      "WORKSPACE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
  if (event.visibility_partition.partition_scope !== "WORKSPACE_STREAM_EVENT") {
    fail("event visibility partition scope drifted", [
      "WORKSPACE_STREAM_EVENT_VISIBILITY_SCOPE_DRIFT",
    ]);
  }
  if (
    event.customer_safe_projection !== null &&
    event.customer_safe_projection.boundary_scope !== "WORKSPACE_STREAM_EVENT"
  ) {
    fail("event customer-safe projection boundary drifted", [
      "WORKSPACE_STREAM_EVENT_CUSTOMER_SAFE_BOUNDARY_DRIFT",
    ]);
  }
  assertVisibility(event);
  assertEventPayloadRef(event);
  assertGroupedContracts(event);
  return event;
}

export function serializeWorkspaceStreamEvent(event: WorkspaceStreamEvent) {
  return encodeSseFrame(validateWorkspaceStreamEvent(event));
}
