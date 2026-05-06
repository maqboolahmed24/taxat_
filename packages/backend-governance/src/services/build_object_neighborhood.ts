import type { AuditSliceEvent } from "../queries/query_audit_slice.ts";

export type AuditObjectNeighborhood = {
  downstream_event_refs: string[];
  neighborhood_mode: "UPSTREAM_DOWNSTREAM";
  object_refs: string[];
  selected_event_ref: string;
  selected_object_ref_or_null: string | null;
  upstream_event_refs: string[];
};

export type BuiltObjectNeighborhood = {
  object_neighborhood: AuditObjectNeighborhood;
  object_neighborhood_refs: string[];
};

export class AuditObjectNeighborhoodError extends Error {
  readonly code:
    | "AUDIT_NEIGHBORHOOD_CONTEXT_REQUIRED"
    | "AUDIT_NEIGHBORHOOD_SELECTION_INVALID";

  constructor(code: AuditObjectNeighborhoodError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuditObjectNeighborhoodError";
    this.code = code;
  }
}

function uniqueWithSelectedFirst(input: {
  selectedObjectRefOrNull: string | null;
  values: readonly string[];
}) {
  const selected = input.selectedObjectRefOrNull;
  const rest = [
    ...new Set(input.values.filter((value) => value.trim().length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  if (selected === null) {
    return rest;
  }
  return [selected, ...rest.filter((value) => value !== selected)];
}

function eventHasObject(event: AuditSliceEvent, objectRef: string | null) {
  if (objectRef === null) {
    return true;
  }
  return event.objectRefs.includes(objectRef);
}

export function buildObjectNeighborhood(input: {
  orderedEvents: readonly AuditSliceEvent[];
  selectedEventRef: string;
  selectedObjectRefOrNull: string | null;
}): BuiltObjectNeighborhood {
  const selectedIndex = input.orderedEvents.findIndex(
    (event) => event.eventRef === input.selectedEventRef,
  );
  if (selectedIndex < 0) {
    throw new AuditObjectNeighborhoodError(
      "AUDIT_NEIGHBORHOOD_SELECTION_INVALID",
      "selected audit event must come from the ordered audit slice",
    );
  }
  if (
    input.selectedObjectRefOrNull !== null &&
    !input.orderedEvents[selectedIndex]!.objectRefs.includes(input.selectedObjectRefOrNull)
  ) {
    throw new AuditObjectNeighborhoodError(
      "AUDIT_NEIGHBORHOOD_SELECTION_INVALID",
      "selected audit object must be present in the selected event context",
    );
  }

  const upstreamByObject = input.orderedEvents
    .slice(0, selectedIndex)
    .filter((event) => eventHasObject(event, input.selectedObjectRefOrNull))
    .map((event) => event.eventRef);
  const downstreamByObject = input.orderedEvents
    .slice(selectedIndex + 1)
    .filter((event) => eventHasObject(event, input.selectedObjectRefOrNull))
    .map((event) => event.eventRef);
  const upstream_event_refs =
    upstreamByObject.length > 0
      ? upstreamByObject
      : input.orderedEvents
          .slice(Math.max(0, selectedIndex - 1), selectedIndex)
          .map((event) => event.eventRef);
  const downstream_event_refs =
    downstreamByObject.length > 0
      ? downstreamByObject
      : input.orderedEvents
          .slice(selectedIndex + 1, selectedIndex + 2)
          .map((event) => event.eventRef);

  if (upstream_event_refs.length === 0 && downstream_event_refs.length === 0) {
    throw new AuditObjectNeighborhoodError(
      "AUDIT_NEIGHBORHOOD_CONTEXT_REQUIRED",
      "object neighborhoods require upstream or downstream audit context",
    );
  }

  const object_neighborhood_refs = uniqueWithSelectedFirst({
    selectedObjectRefOrNull: input.selectedObjectRefOrNull,
    values: input.orderedEvents.flatMap((event) => event.objectRefs),
  });

  return {
    object_neighborhood: {
      downstream_event_refs,
      neighborhood_mode: "UPSTREAM_DOWNSTREAM",
      object_refs: object_neighborhood_refs,
      selected_event_ref: input.selectedEventRef,
      selected_object_ref_or_null: input.selectedObjectRefOrNull,
      upstream_event_refs,
    },
    object_neighborhood_refs,
  };
}
