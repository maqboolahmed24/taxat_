import {
  deriveClientPortalRouteContext,
} from "./derive_client_portal_route_context.ts";
import type {
  ClientPortalRouteCode,
  ClientPortalRouteContext,
} from "../types.ts";

export type ContextualRouteObjectState =
  | "EXACT_TARGET_VISIBLE"
  | "LATEST_VISIBLE_OBJECT_AVAILABLE"
  | "RETURN_FOCUS_ANCHOR_ONLY";

export function applyContextualRouteFallbackRules(input: {
  latestVisibleFocusAnchorRef?: string | null;
  latestVisibleObjectRef?: string | null;
  objectState: ContextualRouteObjectState;
  route: ClientPortalRouteCode;
  routeContext: ClientPortalRouteContext;
  workspaceId: string;
}) {
  if (
    input.routeContext.context_route === "NONE" ||
    input.objectState === "EXACT_TARGET_VISIBLE"
  ) {
    return {
      object_anchor_ref:
        input.routeContext.context_route === "NONE"
          ? input.workspaceId
          : input.routeContext.context_object_ref,
      route_context: input.routeContext,
    };
  }

  if (
    input.objectState === "LATEST_VISIBLE_OBJECT_AVAILABLE" &&
    input.routeContext.fallback_target === "LATEST_VISIBLE_OBJECT"
  ) {
    const fallbackObjectRef =
      input.latestVisibleObjectRef ?? input.routeContext.fallback_object_ref_or_null;
    const routeContext = deriveClientPortalRouteContext({
      query: {
        artifact_focus_bucket_or_null: input.routeContext.artifact_focus_bucket_or_null,
        artifact_focus_subject_ref_or_null:
          input.routeContext.artifact_focus_subject_ref_or_null === null
            ? null
            : fallbackObjectRef,
        context_object_ref: fallbackObjectRef,
        context_route: input.routeContext.context_route,
        fallback_object_ref_or_null: fallbackObjectRef,
        fallback_reason_ref_or_null: "NARROWEST_SURVIVING_LIST_SELECTED",
        fallback_target: "LATEST_VISIBLE_OBJECT",
        focus_anchor_ref:
          input.latestVisibleFocusAnchorRef ??
          input.routeContext.focus_anchor_ref ??
          undefined,
        return_focus_anchor_ref_or_null:
          input.routeContext.return_focus_anchor_ref_or_null,
      },
      route: input.route,
    });
    return {
      object_anchor_ref: routeContext.context_object_ref,
      route_context: routeContext,
    };
  }

  return {
    object_anchor_ref: input.workspaceId,
    route_context: deriveClientPortalRouteContext({
      query: {
        context_route: "NONE",
      },
      route: input.route,
    }),
  };
}
