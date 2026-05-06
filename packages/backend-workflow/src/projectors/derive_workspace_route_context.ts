import { WorkflowModelError, type WorkflowItem } from "../models/workflow_item.ts";
import {
  buildFocusRestorationContract,
  type FocusRestorationContract,
  type WorkspaceModuleCode,
  type WorkspaceViewerScope,
} from "./projection_contract_helpers.ts";

export type WorkspaceEntrySurface =
  | "WORK_INBOX"
  | "MANIFEST_LINK"
  | "REQUEST_LIST"
  | "PORTAL_HOME"
  | "PORTAL_APPROVALS"
  | "PORTAL_HELP"
  | "NOTIFICATION"
  | "DIRECT_URL"
  | "NATIVE_RESTORE";

export type WorkspaceRouteContext = {
  active_module_code: WorkspaceModuleCode;
  active_route_ref: string;
  artifact_focus_bucket_or_null: "PRIMARY" | "HISTORY" | "LIMITATION_NOTICE" | null;
  artifact_focus_subject_ref_or_null: string | null;
  entry_surface: WorkspaceEntrySurface;
  fallback_focus_anchor_ref: string;
  fallback_reason_code: string;
  fallback_route_ref: string;
  focus_anchor_ref_or_null: string | null;
  focus_restoration: FocusRestorationContract;
  return_focus_anchor_ref: string;
  return_route_ref: string;
};

export type DeriveWorkspaceRouteContextInput = {
  active_module_code?: WorkspaceModuleCode | undefined;
  artifact_focus_bucket_or_null?: "PRIMARY" | "HISTORY" | "LIMITATION_NOTICE" | null | undefined;
  artifact_focus_subject_ref_or_null?: string | null | undefined;
  entry_surface?: WorkspaceEntrySurface | undefined;
  focus_anchor_ref_or_null?: string | null | undefined;
  item: Pick<WorkflowItem, "item_id">;
  return_focus_anchor_ref?: string | undefined;
  return_route_ref?: string | undefined;
  viewer_scope: WorkspaceViewerScope;
};

const STAFF_ENTRY_SURFACES = new Set<WorkspaceEntrySurface>([
  "WORK_INBOX",
  "MANIFEST_LINK",
  "NOTIFICATION",
  "DIRECT_URL",
  "NATIVE_RESTORE",
]);
const CUSTOMER_ENTRY_SURFACES = new Set<WorkspaceEntrySurface>([
  "REQUEST_LIST",
  "PORTAL_HOME",
  "PORTAL_APPROVALS",
  "PORTAL_HELP",
  "NOTIFICATION",
  "DIRECT_URL",
]);

function defaultReturnRoute(input: {
  entry_surface: WorkspaceEntrySurface;
  item_id: string;
  viewer_scope: WorkspaceViewerScope;
}) {
  if (input.viewer_scope === "STAFF_FULL") {
    return input.entry_surface === "MANIFEST_LINK"
      ? `/manifests/${input.item_id}?focus=workflow:${input.item_id}`
      : "/work";
  }
  switch (input.entry_surface) {
    case "PORTAL_HOME":
      return "/portal";
    case "PORTAL_APPROVALS":
      return "/portal/approvals";
    case "PORTAL_HELP":
      return "/portal/help";
    case "REQUEST_LIST":
    case "NOTIFICATION":
    case "DIRECT_URL":
    default:
      return "/portal/requests";
  }
}

export function defaultWorkspaceFocusAnchor(input: {
  active_module_code: WorkspaceModuleCode;
  item_id: string;
}) {
  return `work-item-focus://${input.item_id}/${input.active_module_code.toLowerCase().replaceAll("_", "-")}`;
}

export function deriveWorkspaceRouteContext(
  input: DeriveWorkspaceRouteContextInput,
): WorkspaceRouteContext {
  const itemId = input.item.item_id;
  const entrySurface =
    input.entry_surface ?? (input.viewer_scope === "STAFF_FULL" ? "WORK_INBOX" : "REQUEST_LIST");
  const allowed = input.viewer_scope === "STAFF_FULL" ? STAFF_ENTRY_SURFACES : CUSTOMER_ENTRY_SURFACES;
  if (!allowed.has(entrySurface)) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      `entry_surface ${entrySurface} is not lawful for ${input.viewer_scope}`,
    );
  }

  const activeRoute =
    input.viewer_scope === "STAFF_FULL" ? `/work/items/${itemId}` : `/portal/requests/${itemId}`;
  const activeModuleCode = input.active_module_code ?? "CUSTOMER_ACTIVITY";
  const focusAnchor =
    input.focus_anchor_ref_or_null === undefined
      ? defaultWorkspaceFocusAnchor({ active_module_code: activeModuleCode, item_id: itemId })
      : input.focus_anchor_ref_or_null;
  const returnRoute =
    input.return_route_ref ??
    defaultReturnRoute({
      entry_surface: entrySurface,
      item_id: itemId,
      viewer_scope: input.viewer_scope,
    });
  const returnFocus =
    input.return_focus_anchor_ref ??
    (input.viewer_scope === "STAFF_FULL"
      ? `work-inbox-row://${itemId}`
      : `customer-request-row://${itemId}`);

  return {
    active_module_code: activeModuleCode,
    active_route_ref: activeRoute,
    artifact_focus_bucket_or_null: input.artifact_focus_bucket_or_null ?? null,
    artifact_focus_subject_ref_or_null: input.artifact_focus_subject_ref_or_null ?? null,
    entry_surface: entrySurface,
    fallback_focus_anchor_ref: returnFocus,
    fallback_reason_code:
      input.viewer_scope === "STAFF_FULL" ? "WORK_ITEM_RETURN_TARGET_UNAVAILABLE" : "REQUEST_UPDATED",
    fallback_route_ref: returnRoute,
    focus_anchor_ref_or_null: focusAnchor,
    focus_restoration: buildFocusRestorationContract(focusAnchor),
    return_focus_anchor_ref: returnFocus,
    return_route_ref: returnRoute,
  };
}
