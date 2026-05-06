import type { ExperienceStreamEvent } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { encodeSseFrame } from "../../../domain-kernel/src/streaming/sse_frame_encoder.ts";

export class ExperienceStreamEventValidationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ExperienceStreamEventValidationError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new ExperienceStreamEventValidationError(message, reasonCodes);
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`, ["EXPERIENCE_STREAM_EVENT_SCHEMA_INVALID"]);
  }
}

function assertNullableString(label: string, value: unknown): asserts value is string | null {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    fail(`${label} must be a non-empty string or null`, [
      "EXPERIENCE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`, [
      "EXPERIENCE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
}

function assertEventPayloadRef(event: ExperienceStreamEvent) {
  if (event.event_type === "experience.delta") {
    assertNonEmptyString("delta_ref", event.delta_ref);
    if (event.snapshot_ref !== null || event.terminal_bundle_ref !== null) {
      fail("experience.delta must carry only delta_ref", [
        "EXPERIENCE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "experience.snapshot") {
    assertNonEmptyString("snapshot_ref", event.snapshot_ref);
    if (event.delta_ref !== null || event.terminal_bundle_ref !== null) {
      fail("experience.snapshot must carry only snapshot_ref", [
        "EXPERIENCE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "terminal.bundle") {
    assertNonEmptyString("terminal_bundle_ref", event.terminal_bundle_ref);
    if (event.snapshot_ref !== null || event.delta_ref !== null) {
      fail("terminal.bundle must carry only terminal_bundle_ref", [
        "EXPERIENCE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  if (event.event_type === "heartbeat") {
    if (
      event.snapshot_ref !== null ||
      event.delta_ref !== null ||
      event.terminal_bundle_ref !== null
    ) {
      fail("heartbeat must not carry payload refs", [
        "EXPERIENCE_STREAM_EVENT_PAYLOAD_REF_INVALID",
      ]);
    }
    return;
  }
  fail("experience stream event type is invalid", ["EXPERIENCE_STREAM_EVENT_TYPE_INVALID"]);
}

function assertGroupedContracts(event: ExperienceStreamEvent) {
  const stability = event.stability_contract;
  if (stability.route_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("event stability scope must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_SCOPE_DRIFT",
    ]);
  }
  if (stability.resume_capability !== "STREAM_RESUMABLE") {
    fail("event stability contract must remain stream resumable", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_RESUME_DRIFT",
    ]);
  }
  if (stability.resume_token_or_null !== event.resume_token) {
    fail("event stability resume token drifted", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_RESUME_TOKEN_DRIFT",
    ]);
  }
  if (stability.last_published_sequence_or_null !== event.stream_recovery_contract.last_published_sequence) {
    fail("event stability frontier drifted", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_FRONTIER_DRIFT",
    ]);
  }
  if (
    stability.guard_vector_components.shell_stability_token_or_null !==
    event.shell_stability_token
  ) {
    fail("event stability shell token drifted", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_SHELL_DRIFT",
    ]);
  }
  if (stability.guard_vector_components.frame_epoch_or_null !== event.frame_epoch) {
    fail("event stability frame epoch drifted", [
      "EXPERIENCE_STREAM_EVENT_STABILITY_EPOCH_DRIFT",
    ]);
  }

  const recovery = event.stream_recovery_contract;
  if (recovery.stream_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("event stream scope must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_SCOPE_DRIFT",
    ]);
  }
  if (recovery.route_key !== event.shell_route_key) {
    fail("event stream route key drifted", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_ROUTE_DRIFT",
    ]);
  }
  if (recovery.subject_ref !== event.manifest_id) {
    fail("event stream subject drifted", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_SUBJECT_DRIFT",
    ]);
  }
  if (recovery.shell_stability_token !== event.shell_stability_token) {
    fail("event stream shell token drifted", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_SHELL_DRIFT",
    ]);
  }
  if (recovery.frame_epoch !== event.frame_epoch) {
    fail("event stream frame epoch drifted", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_EPOCH_DRIFT",
    ]);
  }
  if (
    recovery.resume_binding_representation !== "RAW_TOKEN" ||
    recovery.resume_binding_ref_or_null !== event.resume_token
  ) {
    fail("event stream resume binding drifted", [
      "EXPERIENCE_STREAM_EVENT_RECOVERY_RESUME_TOKEN_DRIFT",
    ]);
  }
}

export function validateExperienceStreamEvent(event: ExperienceStreamEvent) {
  if (event.artifact_type !== "ExperienceStreamEvent") {
    fail("event artifact_type must be ExperienceStreamEvent", [
      "EXPERIENCE_STREAM_EVENT_ARTIFACT_INVALID",
    ]);
  }
  if (event.stream_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("event stream_scope_class must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_STREAM_EVENT_SCOPE_INVALID",
    ]);
  }
  assertNonEmptyString("manifest_id", event.manifest_id);
  assertNonEmptyString("shell_route_key", event.shell_route_key);
  assertNonEmptyString("shell_stability_token", event.shell_stability_token);
  assertNonEmptyString("resume_token", event.resume_token);
  assertNullableString("snapshot_ref", event.snapshot_ref);
  assertNullableString("delta_ref", event.delta_ref);
  assertNullableString("terminal_bundle_ref", event.terminal_bundle_ref);
  assertNonNegativeInteger("experience_sequence", event.experience_sequence);
  assertNonNegativeInteger("frame_epoch", event.frame_epoch);
  if (!Number.isFinite(Date.parse(event.occurred_at))) {
    fail("occurred_at must be a valid ISO instant", [
      "EXPERIENCE_STREAM_EVENT_SCHEMA_INVALID",
    ]);
  }
  if (event.shell_route_key !== event.manifest_id) {
    fail("event shell_route_key must equal manifest_id", [
      "EXPERIENCE_STREAM_EVENT_ROUTE_KEY_DRIFT",
    ]);
  }
  assertEventPayloadRef(event);
  assertGroupedContracts(event);
  return event;
}

export function serializeExperienceStreamEvent(event: ExperienceStreamEvent) {
  return encodeSseFrame(validateExperienceStreamEvent(event));
}
