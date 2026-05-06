import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { WorkflowModelError } from "./workflow_item.ts";
import type { CollaborationVisibilityClass } from "./collaboration_thread.ts";

export type CollaborationEntryType =
  | "COMMENT"
  | "NOTE"
  | "STATUS_CHANGE"
  | "ASSIGNMENT_CHANGE"
  | "ESCALATION"
  | "REQUEST_INFO"
  | "REQUEST_INFO_RESPONSE"
  | "ATTACHMENT_ONLY"
  | "SYSTEM";
export type CollaborationEntryRedactionState = "NONE" | "REDACTED";

export type CollaborationEntry = {
  actor_ref: string;
  attachment_refs: string[];
  audit_event_ref: string;
  body_ref: string | null;
  causal_parent_entry_ref: string | null;
  command_id: string;
  command_receipt_ref: string;
  created_at: string;
  entry_id: string;
  entry_type: CollaborationEntryType;
  item_id: string;
  redaction_state: CollaborationEntryRedactionState;
  request_info_ref: string | null;
  semantic_action_id: string;
  thread_id: string;
  thread_sequence: number;
  visibility_class: CollaborationVisibilityClass;
};

export type CollaborationEntryInput = Partial<CollaborationEntry> & {
  actor_ref: string;
  command_id: string;
  created_at: string;
  entry_type: CollaborationEntryType;
  item_id: string;
  thread_id: string;
  thread_sequence: number;
  visibility_class: CollaborationVisibilityClass;
};

const ENTRY_TYPES = [
  "COMMENT",
  "NOTE",
  "STATUS_CHANGE",
  "ASSIGNMENT_CHANGE",
  "ESCALATION",
  "REQUEST_INFO",
  "REQUEST_INFO_RESPONSE",
  "ATTACHMENT_ONLY",
  "SYSTEM",
] as const;
const REDACTION_STATES = ["NONE", "REDACTED"] as const;
const ENTRY_VISIBILITY_CLASSES = ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] as const;

function entryError(message: string): never {
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

function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 UTC instant`,
    );
  }
}

function normalizeStringRefs(label: string, values: readonly string[] | null | undefined) {
  try {
    return normalizeStringSet(label, values ?? []);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a valid string set`,
    );
  }
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertPositiveInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

export function collaborationEntryId(input: {
  command_id: string;
  item_id: string;
  thread_id: string;
  thread_sequence: number;
}) {
  return `collaboration-entry://${stableJsonHash({
    command_id: input.command_id,
    item_id: input.item_id,
    thread_id: input.thread_id,
    thread_sequence: input.thread_sequence,
  })}`;
}

export function semanticActionIdForEntry(input: {
  command_id: string;
  entry_type: CollaborationEntryType;
}) {
  return `semantic-action://${input.entry_type.toLowerCase()}/${stableJsonHash({
    command_id: input.command_id,
  })}`;
}

export function collaborationEntryContentFingerprint(entry: CollaborationEntry) {
  return stableJsonHash(normalizeCollaborationEntry(entry));
}

export function buildCollaborationEntry(input: CollaborationEntryInput): CollaborationEntry {
  return normalizeCollaborationEntry({
    actor_ref: input.actor_ref,
    attachment_refs: [...(input.attachment_refs ?? [])],
    audit_event_ref:
      input.audit_event_ref ?? `audit://collaboration-entry/${stableJsonHash({ command_id: input.command_id })}`,
    body_ref: input.body_ref ?? null,
    causal_parent_entry_ref: input.causal_parent_entry_ref ?? null,
    command_id: input.command_id,
    command_receipt_ref: input.command_receipt_ref ?? `api-command-receipt://${input.command_id}`,
    created_at: input.created_at,
    entry_id: input.entry_id ?? collaborationEntryId(input),
    entry_type: input.entry_type,
    item_id: input.item_id,
    redaction_state: input.redaction_state ?? "NONE",
    request_info_ref: input.request_info_ref ?? null,
    semantic_action_id: input.semantic_action_id ?? semanticActionIdForEntry(input),
    thread_id: input.thread_id,
    thread_sequence: input.thread_sequence,
    visibility_class: input.visibility_class,
  });
}

export function normalizeCollaborationEntry(input: CollaborationEntry): CollaborationEntry {
  const entry: CollaborationEntry = {
    actor_ref: requireString("actor_ref", input.actor_ref),
    attachment_refs: normalizeStringRefs("attachment_refs", input.attachment_refs),
    audit_event_ref: requireString("audit_event_ref", input.audit_event_ref),
    body_ref: normalizeNullableString("body_ref", input.body_ref),
    causal_parent_entry_ref: normalizeNullableString(
      "causal_parent_entry_ref",
      input.causal_parent_entry_ref,
    ),
    command_id: requireString("command_id", input.command_id),
    command_receipt_ref: requireString("command_receipt_ref", input.command_receipt_ref),
    created_at: normalizeTimestamp("created_at", input.created_at),
    entry_id: requireString("entry_id", input.entry_id),
    entry_type: assertEnum("entry_type", input.entry_type, ENTRY_TYPES),
    item_id: requireString("item_id", input.item_id),
    redaction_state: assertEnum("redaction_state", input.redaction_state, REDACTION_STATES),
    request_info_ref: normalizeNullableString("request_info_ref", input.request_info_ref),
    semantic_action_id: requireString("semantic_action_id", input.semantic_action_id),
    thread_id: requireString("thread_id", input.thread_id),
    thread_sequence: assertPositiveInteger("thread_sequence", input.thread_sequence),
    visibility_class: assertEnum("visibility_class", input.visibility_class, ENTRY_VISIBILITY_CLASSES),
  };

  if (["NOTE", "ASSIGNMENT_CHANGE", "ESCALATION"].includes(entry.entry_type)) {
    if (entry.visibility_class !== "INTERNAL_ONLY") {
      entryError(`${entry.entry_type} entries must remain INTERNAL_ONLY`);
    }
  }
  if (["REQUEST_INFO", "REQUEST_INFO_RESPONSE"].includes(entry.entry_type)) {
    if (
      entry.visibility_class !== "CUSTOMER_VISIBLE" ||
      entry.request_info_ref === null ||
      entry.causal_parent_entry_ref === null
    ) {
      entryError("REQUEST_INFO entries require CUSTOMER_VISIBLE visibility, request_info_ref, and causal parent");
    }
  } else if (entry.request_info_ref !== null) {
    entryError("only REQUEST_INFO entries may carry request_info_ref");
  }
  if (entry.entry_type === "ATTACHMENT_ONLY") {
    if (entry.body_ref !== null || entry.attachment_refs.length === 0) {
      entryError("ATTACHMENT_ONLY entries require attachments and must clear body_ref");
    }
  } else if (entry.body_ref === null) {
    entryError(`${entry.entry_type} entries require body_ref`);
  }
  return entry;
}
