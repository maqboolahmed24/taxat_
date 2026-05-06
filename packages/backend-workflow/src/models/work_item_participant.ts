import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { WorkflowModelError } from "./workflow_item.ts";

export type WorkItemParticipantRole =
  | "PREPARER"
  | "REVIEWER"
  | "APPROVER"
  | "SUPPORT_OPERATOR"
  | "TENANT_ADMIN"
  | "AUDITOR"
  | "CLIENT_VIEWER"
  | "CLIENT_CONTRIBUTOR"
  | "CLIENT_SIGNATORY"
  | "SUBJECT_SELF"
  | "SUBJECT_REPRESENTATIVE";
export type WorkItemParticipantWatchState = "PRIMARY_OWNER" | "WATCHER" | "CUSTOMER_PARTICIPANT";

export type WorkItemParticipant = {
  artifact_type: "WorkItemParticipant";
  item_id: string;
  last_read_customer_sequence: number | null;
  last_read_internal_sequence: number | null;
  notification_preferences_ref: string;
  participant_ref: string;
  participant_role: WorkItemParticipantRole;
  watch_state: WorkItemParticipantWatchState;
};

export type WorkItemParticipantInput = Partial<WorkItemParticipant> & {
  item_id: string;
  notification_preferences_ref: string;
  participant_ref: string;
  participant_role: WorkItemParticipantRole;
};

export const CUSTOMER_PARTICIPANT_ROLES = [
  "CLIENT_VIEWER",
  "CLIENT_CONTRIBUTOR",
  "CLIENT_SIGNATORY",
  "SUBJECT_SELF",
  "SUBJECT_REPRESENTATIVE",
] as const;

export const PRIMARY_OWNER_PARTICIPANT_ROLES = [
  "PREPARER",
  "REVIEWER",
  "APPROVER",
  "SUPPORT_OPERATOR",
  "TENANT_ADMIN",
] as const;

const PARTICIPANT_ROLES = [
  "PREPARER",
  "REVIEWER",
  "APPROVER",
  "SUPPORT_OPERATOR",
  "TENANT_ADMIN",
  "AUDITOR",
  "CLIENT_VIEWER",
  "CLIENT_CONTRIBUTOR",
  "CLIENT_SIGNATORY",
  "SUBJECT_SELF",
  "SUBJECT_REPRESENTATIVE",
] as const;
const WATCH_STATES = ["PRIMARY_OWNER", "WATCHER", "CUSTOMER_PARTICIPANT"] as const;

function participantError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertNullableNonNegativeInteger(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a non-negative integer or null`);
  }
  return value;
}

function requireExact<T>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    participantError(`${label} must stay ${String(expected)}`);
  }
  return expected;
}

export function isCustomerParticipantRole(role: WorkItemParticipantRole) {
  return CUSTOMER_PARTICIPANT_ROLES.includes(role as (typeof CUSTOMER_PARTICIPANT_ROLES)[number]);
}

export function isPrimaryOwnerParticipantRole(role: WorkItemParticipantRole) {
  return PRIMARY_OWNER_PARTICIPANT_ROLES.includes(role as (typeof PRIMARY_OWNER_PARTICIPANT_ROLES)[number]);
}

export function workItemParticipantKey(input: { item_id: string; participant_ref: string }) {
  return `${requireString("item_id", input.item_id)}:${requireString("participant_ref", input.participant_ref)}`;
}

export function workItemParticipantContentFingerprint(participant: WorkItemParticipant) {
  return stableJsonHash(normalizeWorkItemParticipant(participant));
}

export function buildWorkItemParticipant(input: WorkItemParticipantInput): WorkItemParticipant {
  const role = assertEnum("participant_role", input.participant_role, PARTICIPANT_ROLES);
  const defaultWatchState = isCustomerParticipantRole(role) ? "CUSTOMER_PARTICIPANT" : "WATCHER";
  return normalizeWorkItemParticipant({
    artifact_type: "WorkItemParticipant",
    item_id: input.item_id,
    last_read_customer_sequence: input.last_read_customer_sequence ?? null,
    last_read_internal_sequence: input.last_read_internal_sequence ?? null,
    notification_preferences_ref: input.notification_preferences_ref,
    participant_ref: input.participant_ref,
    participant_role: role,
    watch_state: input.watch_state ?? defaultWatchState,
  });
}

export function normalizeWorkItemParticipant(input: WorkItemParticipant): WorkItemParticipant {
  const participant: WorkItemParticipant = {
    artifact_type: requireExact("artifact_type", input.artifact_type, "WorkItemParticipant"),
    item_id: requireString("item_id", input.item_id),
    last_read_customer_sequence: assertNullableNonNegativeInteger(
      "last_read_customer_sequence",
      input.last_read_customer_sequence,
    ),
    last_read_internal_sequence: assertNullableNonNegativeInteger(
      "last_read_internal_sequence",
      input.last_read_internal_sequence,
    ),
    notification_preferences_ref: requireString(
      "notification_preferences_ref",
      input.notification_preferences_ref,
    ),
    participant_ref: requireString("participant_ref", input.participant_ref),
    participant_role: assertEnum("participant_role", input.participant_role, PARTICIPANT_ROLES),
    watch_state: assertEnum("watch_state", input.watch_state, WATCH_STATES),
  };

  if (isCustomerParticipantRole(participant.participant_role) && participant.watch_state !== "CUSTOMER_PARTICIPANT") {
    participantError("customer-facing participant roles must use CUSTOMER_PARTICIPANT watch state");
  }
  if (participant.watch_state === "CUSTOMER_PARTICIPANT") {
    if (!isCustomerParticipantRole(participant.participant_role)) {
      participantError("CUSTOMER_PARTICIPANT watch state is limited to customer-facing roles");
    }
    if (participant.last_read_internal_sequence !== null) {
      participantError("CUSTOMER_PARTICIPANT rows must clear last_read_internal_sequence");
    }
  }
  if (
    participant.watch_state === "PRIMARY_OWNER" &&
    !isPrimaryOwnerParticipantRole(participant.participant_role)
  ) {
    participantError("PRIMARY_OWNER must remain limited to staff owner roles");
  }
  return participant;
}
