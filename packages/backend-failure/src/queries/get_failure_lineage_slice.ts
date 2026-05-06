import type {
  FailureLifecycleDashboard,
  FailureLifecycleDashboardClosurePosture,
  FailureLifecycleDashboardCurrentOwner,
  FailureLifecycleDashboardLineageRefs,
  FailureLifecycleDashboardNextLegalAction,
  FailureLifecycleDashboardStateSource,
  FailureLineageState,
} from "../../../backend-workflow/src/index.ts";
import {
  requireFailureLifecycleDashboard,
  type GetFailureLifecycleDashboardInput,
} from "./get_failure_lifecycle_dashboard.ts";

export type FailureLineageSlice = {
  closure_posture: FailureLifecycleDashboardClosurePosture;
  current_error_ref: string;
  current_lineage_state: FailureLineageState;
  current_owner: FailureLifecycleDashboardCurrentOwner;
  current_state_source: FailureLifecycleDashboardStateSource;
  dashboard_id: string;
  lineage_error_refs_in_order: string[];
  lineage_refs: FailureLifecycleDashboardLineageRefs;
  next_legal_action: FailureLifecycleDashboardNextLegalAction;
  root_error_ref: string;
  selected_error_ref: string;
  selected_index: number;
};

export type GetFailureLineageSliceInput = GetFailureLifecycleDashboardInput & {
  selected_error_ref?: string | undefined;
};

function selectedRefOrCurrent(
  dashboard: FailureLifecycleDashboard,
  selectedErrorRef: string | undefined,
) {
  const selected = selectedErrorRef ?? dashboard.current_error_ref;
  const selectedIndex = dashboard.lineage_error_refs_in_order.indexOf(selected);
  if (selectedIndex < 0) {
    throw new Error("selected_error_ref must appear in lineage_error_refs_in_order");
  }
  return {
    selected,
    selectedIndex,
  };
}

export async function getFailureLineageSlice(
  input: GetFailureLineageSliceInput,
): Promise<FailureLineageSlice> {
  const { selected_error_ref: selectedErrorRef, ...dashboardInput } = input;
  const dashboard = await requireFailureLifecycleDashboard(dashboardInput);
  const { selected, selectedIndex } = selectedRefOrCurrent(dashboard, selectedErrorRef);
  return {
    closure_posture: dashboard.closure_posture,
    current_error_ref: dashboard.current_error_ref,
    current_lineage_state: dashboard.current_lineage_state,
    current_owner: dashboard.current_owner,
    current_state_source: dashboard.current_state_source,
    dashboard_id: dashboard.dashboard_id,
    lineage_error_refs_in_order: [...dashboard.lineage_error_refs_in_order],
    lineage_refs: dashboard.lineage_refs,
    next_legal_action: dashboard.next_legal_action,
    root_error_ref: dashboard.root_error_ref,
    selected_error_ref: selected,
    selected_index: selectedIndex,
  };
}
