import { cloneWorkflowRecord } from "../models/workflow_item.ts";

export type InternalOnlyProjectionFieldFamily =
  | "ASSIGNMENT_STATE"
  | "ESCALATION_LOGIC"
  | "RAW_GATE_STATE"
  | "STAFF_REASON_CODES"
  | "AUDIT_LINEAGE"
  | "INTERNAL_ACTIVITY"
  | "INTERNAL_ATTACHMENTS"
  | "INTERNAL_PARTICIPANTS"
  | "INTERNAL_COUNTS"
  | "STAFF_ROUTE_CONTEXT";

export type StrippedInternalOnlyProjectionFields<T> = {
  payload: T;
  stripped_field_families: InternalOnlyProjectionFieldFamily[];
  stripped_paths: string[];
};

const PATH_SUBTREES_ALLOWED_BY_BOUNDARY = [
  "customer_safe_projection.blocked_staff_signal_classes",
  "customer_request_workspace.language_contract.forbidden_term_families",
  "language_contract.forbidden_term_families",
  "queue_projection.canonical_sort_key",
  "queue_projection.routing_contract",
  "state_taxonomy_contract",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathKey(path: readonly string[]) {
  return path.join(".");
}

function isAllowedBoundarySubtree(path: readonly string[]) {
  const key = pathKey(path);
  return PATH_SUBTREES_ALLOWED_BY_BOUNDARY.some(
    (allowed) => key === allowed || key.startsWith(`${allowed}.`),
  );
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulValue(entry));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasMeaningfulValue(entry));
  }
  return true;
}

function keyFamily(key: string): InternalOnlyProjectionFieldFamily | null {
  const normalized = key.toLowerCase();
  if (
    normalized.includes("assignee") ||
    normalized.includes("assignment") ||
    normalized === "current_owner_ref"
  ) {
    return "ASSIGNMENT_STATE";
  }
  if (normalized.includes("escalation")) {
    return "ESCALATION_LOGIC";
  }
  if (
    normalized.includes("raw_gate") ||
    normalized.includes("gate_state") ||
    normalized.includes("internal_lifecycle") ||
    normalized === "lifecycle_state"
  ) {
    return "RAW_GATE_STATE";
  }
  if (
    normalized.includes("staff_reason") ||
    normalized.includes("internal_reason") ||
    normalized.includes("raw_reason")
  ) {
    return "STAFF_REASON_CODES";
  }
  if (normalized.includes("audit") || normalized.includes("provenance")) {
    return "AUDIT_LINEAGE";
  }
  if (
    normalized.includes("internal_activity") ||
    normalized === "internal_head_sequence_or_null" ||
    normalized === "last_internal_event_ref" ||
    normalized === "last_internal_activity_at"
  ) {
    return "INTERNAL_ACTIVITY";
  }
  if (normalized.includes("internal_only_file") || normalized.includes("internal_attachment")) {
    return "INTERNAL_ATTACHMENTS";
  }
  if (normalized.includes("internal_participant") || normalized.includes("primary_owner")) {
    return "INTERNAL_PARTICIPANTS";
  }
  if (normalized.includes("internal_unread") || normalized.includes("internal_count")) {
    return "INTERNAL_COUNTS";
  }
  if (
    normalized.includes("staff_route") ||
    normalized === "staff_context" ||
    normalized === "staff_workspace_version"
  ) {
    return "STAFF_ROUTE_CONTEXT";
  }
  return null;
}

function valueFamily(value: unknown): InternalOnlyProjectionFieldFamily | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value.startsWith("audit://")) {
    return "AUDIT_LINEAGE";
  }
  if (value === "INTERNAL_ONLY" || value === "INTERNAL_ACTIVITY") {
    return "INTERNAL_ACTIVITY";
  }
  if (value === "AUDIT_TRAIL" || value === "LINKED_CONTEXT" || value.startsWith("/work")) {
    return "STAFF_ROUTE_CONTEXT";
  }
  if (
    value.includes("ASSIGN") ||
    value.includes("ASSIGNEE") ||
    value.includes("OWNER_TRANSFER")
  ) {
    return "ASSIGNMENT_STATE";
  }
  if (value.includes("ESCALAT")) {
    return "ESCALATION_LOGIC";
  }
  if (value.includes("GATE") || value.includes("OVERRIDE") || value.includes("STALE")) {
    return "RAW_GATE_STATE";
  }
  if (value.includes("AUDIT")) {
    return "AUDIT_LINEAGE";
  }
  return null;
}

function fieldFamilyForPath(
  key: string,
  path: readonly string[],
  value: unknown,
): InternalOnlyProjectionFieldFamily | null {
  if (isAllowedBoundarySubtree(path)) {
    return null;
  }
  const byKey = keyFamily(key);
  if (byKey !== null && hasMeaningfulValue(value)) {
    return byKey;
  }
  const byValue = valueFamily(value);
  if (byValue !== null && hasMeaningfulValue(value)) {
    return byValue;
  }
  return null;
}

export function findInternalOnlyProjectionFieldFamilies(value: unknown): {
  field_families: InternalOnlyProjectionFieldFamily[];
  paths: string[];
} {
  const families = new Set<InternalOnlyProjectionFieldFamily>();
  const paths: string[] = [];

  function walk(current: unknown, path: string[]) {
    if (isAllowedBoundarySubtree(path)) {
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((entry, index) => walk(entry, [...path, String(index)]));
      return;
    }
    if (!isRecord(current)) {
      const key = path.at(-1) ?? "";
      const family = fieldFamilyForPath(key, path, current);
      if (family !== null) {
        families.add(family);
        paths.push(pathKey(path));
      }
      return;
    }
    for (const [key, entry] of Object.entries(current)) {
      const nextPath = [...path, key];
      const family = fieldFamilyForPath(key, nextPath, entry);
      if (family !== null) {
        families.add(family);
        paths.push(pathKey(nextPath));
        continue;
      }
      walk(entry, nextPath);
    }
  }

  walk(value, []);
  return {
    field_families: [...families].sort(),
    paths,
  };
}

export function stripInternalOnlyProjectionFields<T>(
  value: T,
): StrippedInternalOnlyProjectionFields<T> {
  const families = new Set<InternalOnlyProjectionFieldFamily>();
  const paths: string[] = [];

  function strip(current: unknown, path: string[]): unknown {
    if (isAllowedBoundarySubtree(path)) {
      return cloneWorkflowRecord(current);
    }
    if (Array.isArray(current)) {
      return current.map((entry, index) => strip(entry, [...path, String(index)]));
    }
    if (!isRecord(current)) {
      return cloneWorkflowRecord(current);
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(current)) {
      const nextPath = [...path, key];
      const family = fieldFamilyForPath(key, nextPath, entry);
      if (family !== null) {
        families.add(family);
        paths.push(pathKey(nextPath));
        continue;
      }
      output[key] = strip(entry, nextPath);
    }
    return output;
  }

  return {
    payload: strip(value, []) as T,
    stripped_field_families: [...families].sort(),
    stripped_paths: paths,
  };
}
