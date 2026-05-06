import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameActiveFilters,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type AuditInvestigationQueryContractCode =
  AuditInvestigationFrame["query_contract_code"];

export type AuditInvestigationOrderingBasis =
  AuditInvestigationFrame["ordering_basis"];

export type AuditSliceEventInput = {
  actorOrServiceRefOrNull?: string | null | undefined;
  auditStreamRef: string;
  authorityOperationRefOrNull?: string | null | undefined;
  changedFieldRefs?: readonly string[] | undefined;
  clientRefOrNull?: string | null | undefined;
  correlationKeys?: readonly string[] | undefined;
  diffAvailable?: boolean | undefined;
  eventRef: string;
  eventTime?: string | null | undefined;
  familyRef: string;
  logRecordRefs?: readonly string[] | undefined;
  manifestRefOrNull?: string | null | undefined;
  manifestRefs?: readonly string[] | undefined;
  objectRefs?: readonly string[] | undefined;
  primaryObjectRefOrNull?: string | null | undefined;
  recordedAt: string;
  streamSequence: number;
  summaryRefOrNull?: string | null | undefined;
  tenantId?: string | undefined;
  traceSpanRefs?: readonly string[] | undefined;
};

export type AuditSliceEvent = {
  actorOrServiceRefOrNull: string | null;
  auditStreamRef: string;
  authorityOperationRefOrNull: string | null;
  changedFieldRefs: string[];
  clientRefOrNull: string | null;
  correlationKeys: string[];
  diffAvailable: boolean;
  eventRef: string;
  eventTime: string | null;
  familyRef: string;
  logRecordRefs: string[];
  manifestRefOrNull: string | null;
  manifestRefs: string[];
  objectRefs: string[];
  primaryObjectRefOrNull: string | null;
  recordedAt: string;
  streamSequence: number;
  summaryRefOrNull: string | null;
  tenantId: string | null;
  traceSpanRefs: string[];
};

export type QueryAuditSliceInput = {
  activeFilters?: Partial<AuditInvestigationFrameActiveFilters> | undefined;
  cursorOffset?: number | undefined;
  events: readonly AuditSliceEventInput[];
  focusEventRef?: string | null | undefined;
  limit?: number | undefined;
  orderingBasis?: AuditInvestigationOrderingBasis | undefined;
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
  selectedObjectRef?: string | null | undefined;
  tenantId?: string | undefined;
};

export type QueriedAuditSlice = {
  activeFilters: AuditInvestigationFrameActiveFilters;
  activeSliceScopeRef: string;
  cursorOffset: number;
  limit: number;
  nextCursor: string | null;
  orderedEventRefs: string[];
  orderedEvents: AuditSliceEvent[];
  orderingBasis: AuditInvestigationOrderingBasis;
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
  queryHash: string;
  selectedEvent: AuditSliceEvent;
  selectedEventRef: string;
  selectedObjectRefOrNull: string | null;
  totalEventCount: number;
};

export class AuditSliceQueryError extends Error {
  readonly code:
    | "AUDIT_SLICE_EMPTY"
    | "AUDIT_SLICE_LIMIT_INVALID"
    | "AUDIT_SLICE_ORDERING_INVALID"
    | "AUDIT_SLICE_TOKEN_INVALID"
    | "AUDIT_SLICE_WINDOW_INVALID";

  constructor(code: AuditSliceQueryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuditSliceQueryError";
    this.code = code;
  }
}

const defaultLimit = 50;
const maxLimit = 100;

function nonEmptyToken(fieldName: string, value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_TOKEN_INVALID",
      `${fieldName} cannot contain an empty string`,
    );
  }
  return normalized;
}

function optionalToken(fieldName: string, value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return nonEmptyToken(fieldName, value);
}

function uniqueSorted(values: readonly (string | null | undefined)[]) {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => nonEmptyToken("audit slice array entry", value)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function uniquePreserve(values: readonly (string | null | undefined)[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const normalized = nonEmptyToken("audit slice array entry", value);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function orderingBasisFor(
  queryContractCode: AuditInvestigationQueryContractCode,
): AuditInvestigationOrderingBasis {
  return queryContractCode === "AUDIT_TRAIL"
    ? "AUDIT_STREAM_SEQUENCE"
    : "RECORDED_AT_THEN_STREAM_SEQUENCE";
}

function normalizeLimit(value: number | undefined) {
  if (value === undefined) {
    return defaultLimit;
  }
  if (!Number.isInteger(value) || value < 1 || value > maxLimit) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_LIMIT_INVALID",
      `audit slice limit must be an integer between 1 and ${maxLimit}`,
    );
  }
  return value;
}

function normalizeCursorOffset(value: number | undefined) {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_LIMIT_INVALID",
      "audit slice cursor offset must be a non-negative integer",
    );
  }
  return value;
}

function normalizeActiveFilters(input: {
  activeFilters?: Partial<AuditInvestigationFrameActiveFilters> | undefined;
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
}): AuditInvestigationFrameActiveFilters {
  const filters = input.activeFilters ?? {};
  const manifest_refs = uniqueSorted([
    ...(filters.manifest_refs ?? []),
    ...(input.queryContractCode === "RUN_TIMELINE" ? [input.queryAnchorRef] : []),
  ]);
  const client_refs = uniqueSorted([
    ...(filters.client_refs ?? []),
    ...(input.queryContractCode === "PRIVACY_ACTION_LEDGER" ? [input.queryAnchorRef] : []),
  ]);
  const window_from = optionalToken("active_filters.window_from", filters.window_from);
  const window_to = optionalToken("active_filters.window_to", filters.window_to);
  if (window_from !== null && window_to !== null && window_from > window_to) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_WINDOW_INVALID",
      "active_filters.window_from must be earlier than or equal to active_filters.window_to",
    );
  }

  return {
    actor_refs: uniqueSorted(filters.actor_refs ?? []),
    authority_operation_refs: uniqueSorted(filters.authority_operation_refs ?? []),
    client_refs,
    event_families: uniqueSorted(filters.event_families ?? []),
    manifest_refs,
    object_refs: uniqueSorted(filters.object_refs ?? []),
    window_from,
    window_to,
  } satisfies AuditInvestigationFrameActiveFilters;
}

function normalizeEvent(input: AuditSliceEventInput): AuditSliceEvent {
  const primaryObjectRefOrNull = optionalToken(
    "audit_event.primaryObjectRefOrNull",
    input.primaryObjectRefOrNull,
  );
  const objectRefs = uniquePreserve([
    primaryObjectRefOrNull,
    ...(input.objectRefs ?? []),
  ]);
  return {
    actorOrServiceRefOrNull: optionalToken(
      "audit_event.actorOrServiceRefOrNull",
      input.actorOrServiceRefOrNull,
    ),
    auditStreamRef: nonEmptyToken("audit_event.auditStreamRef", input.auditStreamRef),
    authorityOperationRefOrNull: optionalToken(
      "audit_event.authorityOperationRefOrNull",
      input.authorityOperationRefOrNull,
    ),
    changedFieldRefs: uniquePreserve(input.changedFieldRefs ?? []),
    clientRefOrNull: optionalToken("audit_event.clientRefOrNull", input.clientRefOrNull),
    correlationKeys: uniqueSorted(input.correlationKeys ?? []),
    diffAvailable: input.diffAvailable ?? objectRefs.length > 0,
    eventRef: nonEmptyToken("audit_event.eventRef", input.eventRef),
    eventTime: optionalToken("audit_event.eventTime", input.eventTime),
    familyRef: nonEmptyToken("audit_event.familyRef", input.familyRef),
    logRecordRefs: uniqueSorted(input.logRecordRefs ?? []),
    manifestRefOrNull: optionalToken("audit_event.manifestRefOrNull", input.manifestRefOrNull),
    manifestRefs: uniqueSorted([
      input.manifestRefOrNull,
      ...(input.manifestRefs ?? []),
    ]),
    objectRefs,
    primaryObjectRefOrNull,
    recordedAt: nonEmptyToken("audit_event.recordedAt", input.recordedAt),
    streamSequence: input.streamSequence,
    summaryRefOrNull: optionalToken("audit_event.summaryRefOrNull", input.summaryRefOrNull),
    tenantId: optionalToken("audit_event.tenantId", input.tenantId),
    traceSpanRefs: uniqueSorted(input.traceSpanRefs ?? []),
  };
}

function includesAny(values: readonly (string | null)[], filters: readonly string[]) {
  return filters.length === 0 || filters.some((filter) => values.includes(filter));
}

function matchesFilters(
  event: AuditSliceEvent,
  filters: AuditInvestigationFrameActiveFilters,
  tenantId: string | undefined,
) {
  if (tenantId !== undefined && event.tenantId !== tenantId) {
    return false;
  }
  if (!includesAny([event.actorOrServiceRefOrNull], filters.actor_refs)) {
    return false;
  }
  if (!includesAny([event.familyRef], filters.event_families)) {
    return false;
  }
  if (!includesAny([event.clientRefOrNull], filters.client_refs)) {
    return false;
  }
  if (!includesAny(event.manifestRefs, filters.manifest_refs)) {
    return false;
  }
  if (!includesAny([event.authorityOperationRefOrNull], filters.authority_operation_refs)) {
    return false;
  }
  if (!includesAny(event.objectRefs, filters.object_refs)) {
    return false;
  }
  if (filters.window_from !== null && event.recordedAt < filters.window_from) {
    return false;
  }
  if (filters.window_to !== null && event.recordedAt > filters.window_to) {
    return false;
  }
  return true;
}

function compareAuditStreamSequence(left: AuditSliceEvent, right: AuditSliceEvent) {
  return (
    left.auditStreamRef.localeCompare(right.auditStreamRef) ||
    left.streamSequence - right.streamSequence ||
    left.eventRef.localeCompare(right.eventRef)
  );
}

function compareRecordedThenStream(left: AuditSliceEvent, right: AuditSliceEvent) {
  return (
    left.recordedAt.localeCompare(right.recordedAt) ||
    left.auditStreamRef.localeCompare(right.auditStreamRef) ||
    left.streamSequence - right.streamSequence ||
    left.eventRef.localeCompare(right.eventRef)
  );
}

function encodeAuditSliceCursor(input: { nextOffset: number; queryHash: string }) {
  return `audit-slice-cursor.${Buffer.from(
    JSON.stringify({
      offset: input.nextOffset,
      query_hash: input.queryHash,
    }),
    "utf8",
  ).toString("base64url")}`;
}

function selectedObjectRefFor(input: {
  requested: string | null;
  selectedEvent: AuditSliceEvent;
}) {
  if (input.requested !== null) {
    if (!input.selectedEvent.objectRefs.includes(input.requested)) {
      throw new AuditSliceQueryError(
        "AUDIT_SLICE_TOKEN_INVALID",
        "selected object must be present in the selected event neighborhood context",
      );
    }
    return input.requested;
  }
  return input.selectedEvent.primaryObjectRefOrNull ?? input.selectedEvent.objectRefs[0] ?? null;
}

export function queryAuditSlice(input: QueryAuditSliceInput): QueriedAuditSlice {
  const queryAnchorRef = nonEmptyToken("queryAnchorRef", input.queryAnchorRef);
  const expectedOrderingBasis = orderingBasisFor(input.queryContractCode);
  const orderingBasis = input.orderingBasis ?? expectedOrderingBasis;
  if (orderingBasis !== expectedOrderingBasis) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_ORDERING_INVALID",
      `${input.queryContractCode} requires ${expectedOrderingBasis}`,
    );
  }
  const activeFilters = normalizeActiveFilters({
    activeFilters: input.activeFilters,
    queryAnchorRef,
    queryContractCode: input.queryContractCode,
  });
  const normalizedEvents = input.events
    .map(normalizeEvent)
    .filter((event) => matchesFilters(event, activeFilters, input.tenantId))
    .sort(
      orderingBasis === "AUDIT_STREAM_SEQUENCE"
        ? compareAuditStreamSequence
        : compareRecordedThenStream,
    );
  if (normalizedEvents.length === 0) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_EMPTY",
      "cannot materialize an audit investigation slice without ordered audit events",
    );
  }

  const requestedFocus = optionalToken("focusEventRef", input.focusEventRef);
  const requestedSelectedObject = optionalToken("selectedObjectRef", input.selectedObjectRef);
  const limit = normalizeLimit(input.limit);
  const requestedOffset = normalizeCursorOffset(input.cursorOffset);
  const focusIndex =
    requestedFocus === null
      ? -1
      : normalizedEvents.findIndex((event) => event.eventRef === requestedFocus);
  const initialOffset = Math.min(requestedOffset, Math.max(0, normalizedEvents.length - 1));
  const cursorOffset =
    focusIndex >= 0 && (focusIndex < initialOffset || focusIndex >= initialOffset + limit)
      ? Math.min(focusIndex, Math.max(0, normalizedEvents.length - limit))
      : initialOffset;
  const orderedEvents = normalizedEvents.slice(cursorOffset, cursorOffset + limit);
  if (orderedEvents.length === 0) {
    throw new AuditSliceQueryError(
      "AUDIT_SLICE_EMPTY",
      "audit slice cursor resolved beyond the ordered audit evidence",
    );
  }

  const selectedEvent =
    requestedFocus === null
      ? orderedEvents.length > 1
        ? orderedEvents[1]!
        : orderedEvents[0]!
      : orderedEvents.find((event) => event.eventRef === requestedFocus) ?? orderedEvents[0]!;
  const selectedObjectRefOrNull = selectedObjectRefFor({
    requested: requestedSelectedObject,
    selectedEvent,
  });
  const queryHash = stableJsonHash({
    active_filters: activeFilters,
    ordering_basis: orderingBasis,
    ordered_event_refs: orderedEvents.map((event) => event.eventRef),
    query_anchor_ref: queryAnchorRef,
    query_contract_code: input.queryContractCode,
  });
  const nextOffset = cursorOffset + orderedEvents.length;

  return {
    activeFilters,
    activeSliceScopeRef: queryAnchorRef,
    cursorOffset,
    limit,
    nextCursor:
      nextOffset < normalizedEvents.length
        ? encodeAuditSliceCursor({
            nextOffset,
            queryHash,
          })
        : null,
    orderedEventRefs: orderedEvents.map((event) => event.eventRef),
    orderedEvents,
    orderingBasis,
    queryAnchorRef,
    queryContractCode: input.queryContractCode,
    queryHash,
    selectedEvent,
    selectedEventRef: selectedEvent.eventRef,
    selectedObjectRefOrNull,
    totalEventCount: normalizedEvents.length,
  };
}
