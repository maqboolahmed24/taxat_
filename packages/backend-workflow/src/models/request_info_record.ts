import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { WorkflowModelError } from "./workflow_item.ts";

export type RequestInfoLifecycleState = "OPEN" | "RESPONDED" | "CLOSED";
export type RequestInfoClosureReason = "CUSTOMER_REPLY_ACCEPTED" | "CANCELLED" | "SUPERSEDED";

export type RequestInfoRecord = {
  artifact_type: "RequestInfoRecord";
  audit_event_refs: string[];
  closed_at: string | null;
  closed_by_ref: string | null;
  closure_entry_ref: string | null;
  closure_reason_code: RequestInfoClosureReason | null;
  customer_due_at: string | null;
  item_id: string;
  lifecycle_state: RequestInfoLifecycleState;
  opened_at: string;
  opened_notification_refs: string[];
  prompt_body_ref: string;
  prompt_entry_ref: string;
  request_info_id: string;
  request_info_ordinal: number;
  request_state_version: number;
  requested_by_ref: string;
  responded_at: string | null;
  responded_by_ref: string | null;
  response_body_ref: string | null;
  response_entry_ref: string | null;
  visibility_class: "CUSTOMER_VISIBLE";
};

export type RequestInfoRecordInput = Partial<RequestInfoRecord> & {
  audit_event_refs: readonly string[];
  item_id: string;
  opened_at: string;
  prompt_body_ref: string;
  prompt_entry_ref: string;
  request_info_ordinal: number;
  requested_by_ref: string;
};

const LIFECYCLE_STATES = ["OPEN", "RESPONDED", "CLOSED"] as const;
const CLOSURE_REASONS = ["CUSTOMER_REPLY_ACCEPTED", "CANCELLED", "SUPERSEDED"] as const;

function requestInfoError(message: string): never {
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

function normalizeNullableTimestamp(label: string, value: unknown) {
  return value == null ? null : normalizeTimestamp(label, value);
}

function normalizeStringRefs(label: string, values: readonly string[], minItems = 0) {
  try {
    return normalizeStringSet(label, values, { minItems });
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

function assertNullableEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  return value == null ? null : assertEnum(label, value, allowed);
}

function assertPositiveInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

function requireExact<T>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    requestInfoError(`${label} must stay ${String(expected)}`);
  }
  return expected;
}

function assertTimestampOrder(label: string, earlier: string | null, later: string | null) {
  if (earlier !== null && later !== null && later < earlier) {
    requestInfoError(`${label} chronology must be monotonic`);
  }
}

function responseLineageFields(record: RequestInfoRecord) {
  return [
    record.response_entry_ref,
    record.response_body_ref,
    record.responded_by_ref,
    record.responded_at,
  ];
}

export function requestInfoRecordId(input: {
  item_id: string;
  request_info_ordinal: number;
}) {
  return `request-info://${requireString("item_id", input.item_id)}/${assertPositiveInteger(
    "request_info_ordinal",
    input.request_info_ordinal,
  )}`;
}

export function requestInfoRecordContentFingerprint(record: RequestInfoRecord) {
  return stableJsonHash(normalizeRequestInfoRecord(record));
}

export function buildRequestInfoRecord(input: RequestInfoRecordInput): RequestInfoRecord {
  const lifecycleState = input.lifecycle_state ?? "OPEN";
  const requestStateVersion =
    input.request_state_version ??
    (lifecycleState === "OPEN"
      ? 1
      : lifecycleState === "RESPONDED"
        ? 2
        : input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED"
          ? 3
          : 2);

  return normalizeRequestInfoRecord({
    artifact_type: "RequestInfoRecord",
    audit_event_refs: [...input.audit_event_refs],
    closed_at: input.closed_at ?? null,
    closed_by_ref: input.closed_by_ref ?? null,
    closure_entry_ref: input.closure_entry_ref ?? null,
    closure_reason_code: input.closure_reason_code ?? null,
    customer_due_at: input.customer_due_at ?? null,
    item_id: input.item_id,
    lifecycle_state: lifecycleState,
    opened_at: input.opened_at,
    opened_notification_refs: [...(input.opened_notification_refs ?? [])],
    prompt_body_ref: input.prompt_body_ref,
    prompt_entry_ref: input.prompt_entry_ref,
    request_info_id:
      input.request_info_id ??
      requestInfoRecordId({
        item_id: input.item_id,
        request_info_ordinal: input.request_info_ordinal,
      }),
    request_info_ordinal: input.request_info_ordinal,
    request_state_version: requestStateVersion,
    requested_by_ref: input.requested_by_ref,
    responded_at: input.responded_at ?? null,
    responded_by_ref: input.responded_by_ref ?? null,
    response_body_ref: input.response_body_ref ?? null,
    response_entry_ref: input.response_entry_ref ?? null,
    visibility_class: input.visibility_class ?? "CUSTOMER_VISIBLE",
  });
}

export function normalizeRequestInfoRecord(input: RequestInfoRecord): RequestInfoRecord {
  const record: RequestInfoRecord = {
    artifact_type: requireExact("artifact_type", input.artifact_type, "RequestInfoRecord"),
    audit_event_refs: normalizeStringRefs("audit_event_refs", input.audit_event_refs, 1),
    closed_at: normalizeNullableTimestamp("closed_at", input.closed_at),
    closed_by_ref: normalizeNullableString("closed_by_ref", input.closed_by_ref),
    closure_entry_ref: normalizeNullableString("closure_entry_ref", input.closure_entry_ref),
    closure_reason_code: assertNullableEnum(
      "closure_reason_code",
      input.closure_reason_code,
      CLOSURE_REASONS,
    ),
    customer_due_at: normalizeNullableTimestamp("customer_due_at", input.customer_due_at),
    item_id: requireString("item_id", input.item_id),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, LIFECYCLE_STATES),
    opened_at: normalizeTimestamp("opened_at", input.opened_at),
    opened_notification_refs: normalizeStringRefs(
      "opened_notification_refs",
      input.opened_notification_refs,
    ),
    prompt_body_ref: requireString("prompt_body_ref", input.prompt_body_ref),
    prompt_entry_ref: requireString("prompt_entry_ref", input.prompt_entry_ref),
    request_info_id: requireString("request_info_id", input.request_info_id),
    request_info_ordinal: assertPositiveInteger("request_info_ordinal", input.request_info_ordinal),
    request_state_version: assertPositiveInteger("request_state_version", input.request_state_version),
    requested_by_ref: requireString("requested_by_ref", input.requested_by_ref),
    responded_at: normalizeNullableTimestamp("responded_at", input.responded_at),
    responded_by_ref: normalizeNullableString("responded_by_ref", input.responded_by_ref),
    response_body_ref: normalizeNullableString("response_body_ref", input.response_body_ref),
    response_entry_ref: normalizeNullableString("response_entry_ref", input.response_entry_ref),
    visibility_class: requireExact("visibility_class", input.visibility_class, "CUSTOMER_VISIBLE"),
  };

  const responseLineage = responseLineageFields(record);
  const responseLineageCount = responseLineage.filter((value) => value !== null).length;
  if (responseLineageCount !== 0 && responseLineageCount !== responseLineage.length) {
    requestInfoError("response lineage must keep entry, body, actor, and timestamp together");
  }
  if (record.response_entry_ref !== null && record.response_entry_ref === record.prompt_entry_ref) {
    requestInfoError("response_entry_ref must remain distinct from prompt_entry_ref");
  }
  if (record.response_body_ref !== null && record.response_body_ref === record.prompt_body_ref) {
    requestInfoError("response_body_ref must remain distinct from prompt_body_ref");
  }

  if (record.lifecycle_state === "OPEN") {
    if (
      record.request_state_version !== 1 ||
      responseLineageCount !== 0 ||
      record.closure_entry_ref !== null ||
      record.closed_by_ref !== null ||
      record.closure_reason_code !== null ||
      record.closed_at !== null
    ) {
      requestInfoError("OPEN request-info records must be version 1 with response and closure refs cleared");
    }
  }
  if (record.lifecycle_state === "RESPONDED") {
    if (
      record.request_state_version !== 2 ||
      responseLineageCount !== responseLineage.length ||
      record.closure_entry_ref !== null ||
      record.closed_by_ref !== null ||
      record.closure_reason_code !== null ||
      record.closed_at !== null
    ) {
      requestInfoError("RESPONDED request-info records must be version 2 with exact response lineage only");
    }
  }
  if (record.lifecycle_state === "CLOSED") {
    if (
      record.closure_entry_ref === null ||
      record.closed_by_ref === null ||
      record.closure_reason_code === null ||
      record.closed_at === null
    ) {
      requestInfoError("CLOSED request-info records require exact closure lineage");
    }
    if (record.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED") {
      if (record.request_state_version !== 3 || responseLineageCount !== responseLineage.length) {
        requestInfoError("CUSTOMER_REPLY_ACCEPTED closure requires version 3 and full response lineage");
      }
    } else if (record.request_state_version !== 2 || responseLineageCount !== 0) {
      requestInfoError("CANCELLED and SUPERSEDED closures require version 2 with response lineage cleared");
    }
  }

  assertTimestampOrder("request response", record.opened_at, record.responded_at);
  assertTimestampOrder("request closure", record.opened_at, record.closed_at);
  assertTimestampOrder("response closure", record.responded_at, record.closed_at);
  return record;
}
