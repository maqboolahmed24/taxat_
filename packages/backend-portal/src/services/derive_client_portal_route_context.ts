import {
  projectFocusRestorationContract,
} from "../../../backend-low-noise/src/services/project_focus_restoration_contract.ts";
import type {
  ClientPortalContextRouteCode,
  ClientPortalRouteCode,
  ClientPortalRouteContext,
  ClientPortalRouteQueryInput,
} from "../types.ts";
import { deriveArtifactFocusRouteState } from "./derive_artifact_focus_route_state.ts";

const contextualRouteByParent = {
  APPROVALS: "APPROVAL_DETAIL",
  DOCUMENTS: "REQUEST_DETAIL",
  HELP: "HELP_CONTEXT",
  HOME: "NONE",
  ONBOARDING: "ONBOARDING_STEP",
} as const satisfies Record<ClientPortalRouteCode, ClientPortalContextRouteCode>;

function nonEmpty(value: string | null | undefined, label: string) {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return normalized;
}

function maybeNonEmpty(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function explicitContextRoute(
  query: ClientPortalRouteQueryInput | undefined,
  route: ClientPortalRouteCode,
): ClientPortalContextRouteCode {
  const explicit = maybeNonEmpty(query?.context_route ?? null);
  if (explicit !== null) {
    if (
      explicit === "NONE" ||
      explicit === "REQUEST_DETAIL" ||
      explicit === "APPROVAL_DETAIL" ||
      explicit === "ONBOARDING_STEP" ||
      explicit === "HELP_CONTEXT"
    ) {
      return explicit;
    }
    throw new Error(`Unknown client portal context route ${explicit}`);
  }
  return maybeNonEmpty(query?.context_object_ref) === null ? "NONE" : contextualRouteByParent[route];
}

function exactNullFocusRestoration() {
  return {
    requested_focus_anchor_ref_or_null: null,
    resolved_focus_anchor_ref_or_null: null,
    restoration_disposition: "EXACT_FOCUS",
    restoration_reason_code_or_null: null,
  } as const;
}

export function deriveClientPortalRouteContext(input: {
  query?: ClientPortalRouteQueryInput | undefined;
  route: ClientPortalRouteCode;
}): ClientPortalRouteContext {
  const contextRoute = explicitContextRoute(input.query, input.route);
  if (contextRoute === "NONE") {
    return {
      artifact_focus_bucket_or_null: null,
      artifact_focus_subject_ref_or_null: null,
      context_object_ref: null,
      context_route: "NONE",
      fallback_object_ref_or_null: null,
      fallback_reason_ref_or_null: null,
      fallback_target: null,
      focus_anchor_ref: null,
      focus_restoration: exactNullFocusRestoration(),
      narrow_screen_mode: null,
      return_focus_anchor_ref_or_null: null,
      return_route: null,
    };
  }

  const contextObjectRef = nonEmpty(
    input.query?.context_object_ref ?? input.query?.artifact_focus_subject_ref_or_null,
    "route_context.context_object_ref",
  );
  const focusAnchorRef = nonEmpty(
    input.query?.focus_anchor_ref ?? `portal.${input.route.toLowerCase()}.${contextObjectRef}.focus`,
    "route_context.focus_anchor_ref",
  );
  const fallbackTarget =
    input.query?.fallback_target ??
    (contextRoute === "REQUEST_DETAIL" ? "LATEST_VISIBLE_OBJECT" : "RETURN_FOCUS_ANCHOR");
  const fallbackReasonRef = nonEmpty(
    input.query?.fallback_reason_ref_or_null ?? "NARROWEST_SURVIVING_LIST_SELECTED",
    "route_context.fallback_reason_ref_or_null",
  );
  const fallbackObjectRef =
    fallbackTarget === "LATEST_VISIBLE_OBJECT"
      ? nonEmpty(
          input.query?.fallback_object_ref_or_null ?? contextObjectRef,
          "route_context.fallback_object_ref_or_null",
        )
      : null;
  const artifactFocus = deriveArtifactFocusRouteState({
    contextObjectRefOrNull: contextObjectRef,
    contextRoute,
    query: input.query,
  });

  return {
    artifact_focus_bucket_or_null: artifactFocus.artifact_focus_bucket_or_null,
    artifact_focus_subject_ref_or_null: artifactFocus.artifact_focus_subject_ref_or_null,
    context_object_ref: contextObjectRef,
    context_route: contextRoute,
    fallback_object_ref_or_null: fallbackObjectRef,
    fallback_reason_ref_or_null: fallbackReasonRef,
    fallback_target: fallbackTarget,
    focus_anchor_ref: focusAnchorRef,
    focus_restoration: projectFocusRestorationContract({
      exactFocusAnchorRefOrNull: focusAnchorRef,
    }),
    narrow_screen_mode: "STACKED_SAME_SHELL",
    return_focus_anchor_ref_or_null: nonEmpty(
      input.query?.return_focus_anchor_ref_or_null ??
        `portal.${input.route.toLowerCase()}.return`,
      "route_context.return_focus_anchor_ref_or_null",
    ),
    return_route: input.route,
  };
}
