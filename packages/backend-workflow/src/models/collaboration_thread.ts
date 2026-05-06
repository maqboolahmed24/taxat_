import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { WorkflowModelError, type WorkflowItem } from "./workflow_item.ts";

export type CollaborationVisibilityClass = "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
export type CollaborationThreadLifecycleState = "OPEN" | "CLOSED" | "LIMITED";

export type CollaborationThread = {
  head_sequence: number;
  item_id: string;
  last_entry_ref: string | null;
  lifecycle_state: CollaborationThreadLifecycleState;
  participant_refs: string[];
  thread_id: string;
  visibility_class: CollaborationVisibilityClass;
};

export type CollaborationThreadInput = Partial<CollaborationThread> & {
  item_id: string;
  participant_refs: readonly string[];
  visibility_class: CollaborationVisibilityClass;
};

const THREAD_VISIBILITY_CLASSES = ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] as const;
const THREAD_LIFECYCLE_STATES = ["OPEN", "CLOSED", "LIMITED"] as const;

function threadError(message: string): never {
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

function normalizeNullableString(label: string, value: unknown) {
  return value == null ? null : requireString(label, value);
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertNonNegativeInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return value;
}

function normalizeParticipantRefs(values: readonly string[]) {
  try {
    return normalizeStringSet("participant_refs", values, { minItems: 1 });
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : "participant_refs must contain at least one participant",
    );
  }
}

export function collaborationThreadId(input: {
  item_id: string;
  visibility_class: CollaborationVisibilityClass;
}) {
  const lane = input.visibility_class === "CUSTOMER_VISIBLE" ? "customer" : "internal";
  return `collaboration-thread://${lane}/${input.item_id}`;
}

export function collaborationThreadContentFingerprint(thread: CollaborationThread) {
  return stableJsonHash(normalizeCollaborationThread(thread));
}

export function buildCollaborationThread(input: CollaborationThreadInput): CollaborationThread {
  return normalizeCollaborationThread({
    head_sequence: input.head_sequence ?? 0,
    item_id: input.item_id,
    last_entry_ref: input.last_entry_ref ?? null,
    lifecycle_state: input.lifecycle_state ?? "OPEN",
    participant_refs: [...input.participant_refs],
    thread_id: input.thread_id ?? collaborationThreadId(input),
    visibility_class: input.visibility_class,
  });
}

export function normalizeCollaborationThread(input: CollaborationThread): CollaborationThread {
  const thread: CollaborationThread = {
    head_sequence: assertNonNegativeInteger("head_sequence", input.head_sequence),
    item_id: requireString("item_id", input.item_id),
    last_entry_ref: normalizeNullableString("last_entry_ref", input.last_entry_ref),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, THREAD_LIFECYCLE_STATES),
    participant_refs: normalizeParticipantRefs(input.participant_refs),
    thread_id: requireString("thread_id", input.thread_id),
    visibility_class: assertEnum("visibility_class", input.visibility_class, THREAD_VISIBILITY_CLASSES),
  };

  if (thread.head_sequence === 0) {
    if (thread.last_entry_ref !== null || thread.lifecycle_state !== "OPEN") {
      threadError("empty collaboration threads must be OPEN and clear last_entry_ref");
    }
  } else if (thread.last_entry_ref === null) {
    threadError("non-empty collaboration threads require last_entry_ref");
  }
  if (thread.lifecycle_state !== "OPEN" && thread.head_sequence === 0) {
    threadError("CLOSED and LIMITED collaboration threads require at least one entry");
  }
  return thread;
}

export function requiredThreadVisibilitiesForWorkflowItem(item: Pick<WorkflowItem, "collaboration_visibility">) {
  return item.collaboration_visibility === "CUSTOMER_SHARED"
    ? (["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] as const)
    : (["INTERNAL_ONLY"] as const);
}
