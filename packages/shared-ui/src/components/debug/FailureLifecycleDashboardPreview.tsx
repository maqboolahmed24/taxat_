export type FailureLifecycleDashboardPreviewSegment = {
  label: string;
  ref: string;
  state: "root" | "current" | "intermediate";
};

export const failureLifecycleDashboardPreviewContract = {
  component_id: "failure-lifecycle-dashboard-preview",
  purpose:
    "Render the persisted failure lifecycle dashboard without reconstructing lifecycle state from logs or UI-local joins.",
  required_selectors: [
    "failure-lineage-ribbon",
    "failure-current-owner-card",
    "failure-next-legal-action-card",
    "failure-accepted-risk-card",
    "failure-blocking-scope-card",
  ],
  source_policy: "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
} as const;

export function renderFailureLineageRibbon(
  segments: readonly FailureLifecycleDashboardPreviewSegment[],
) {
  return segments.map((segment) => `${segment.label}: ${segment.ref} [${segment.state}]`).join(" -> ");
}
