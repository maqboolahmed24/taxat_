import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type { AuditSliceEvent } from "../queries/query_audit_slice.ts";

export type AuditEventDiffInspector =
  AuditInvestigationFrame["event_diff_inspector"];

function uniquePreserve(values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function buildEventDiffInspector(input: {
  exportState: AuditInvestigationFrame["export_posture"]["state"];
  frameId: string;
  orderedEvents: readonly AuditSliceEvent[];
  selectedEventRef: string;
}): AuditEventDiffInspector {
  const selectedIndex = input.orderedEvents.findIndex(
    (event) => event.eventRef === input.selectedEventRef,
  );
  const selectedEvent = selectedIndex >= 0 ? input.orderedEvents[selectedIndex]! : null;
  const baselineEvent =
    selectedIndex > 0
      ? input.orderedEvents[selectedIndex - 1]!
      : selectedIndex === 0
        ? input.orderedEvents[1] ?? null
        : null;
  if (selectedEvent === null || baselineEvent === null || input.exportState === "DENIED") {
    return {
      baseline_event_ref_or_null: null,
      changed_field_refs: [],
      comparison_event_ref_or_null: null,
      panel_mode: "LIMITATION_NOTICE",
      raw_payload_posture: "SUMMARY_FIRST",
      summary_ref_or_null: `audit-summary://${input.frameId}/${input.selectedEventRef}`,
    };
  }

  return {
    baseline_event_ref_or_null: baselineEvent.eventRef,
    changed_field_refs: uniquePreserve(
      selectedEvent.changedFieldRefs.length > 0
        ? selectedEvent.changedFieldRefs
        : ["event_type", "reason_codes"],
    ),
    comparison_event_ref_or_null: selectedEvent.eventRef,
    panel_mode:
      input.exportState === "MASKED_ONLY" ? "MASKED_CHANGE_NUCLEI" : "CHANGE_NUCLEI",
    raw_payload_posture: "SUMMARY_FIRST",
    summary_ref_or_null:
      selectedEvent.summaryRefOrNull ?? `audit-diff://${input.frameId}/${selectedEvent.eventRef}`,
  };
}
