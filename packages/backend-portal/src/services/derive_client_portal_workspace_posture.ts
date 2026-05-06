import type {
  ClientPortalFreshnessState,
  ClientPortalRouteCode,
  ClientPortalWorkspacePosture,
} from "../types.ts";

export type DerivedClientPortalWorkspacePosture = {
  content_limitations: Array<Record<string, unknown>>;
  freshness_state: ClientPortalFreshnessState;
  recovery_posture:
    | "INLINE_REBASE"
    | "INLINE_RECONNECT"
    | "NONE"
    | "READ_ONLY_LIMITED";
  settlement_state:
    | "DEGRADED_READ_ONLY"
    | "FRESHENING"
    | "RECOVERY_REQUIRED"
    | "STALE_REVIEW_REQUIRED"
    | "STEADY";
  workspace_posture: ClientPortalWorkspacePosture;
};

function limitation(input: {
  affectedRoute: ClientPortalRouteCode;
  code: "DEGRADED_DATA" | "STALE_REVIEW_REQUIRED";
}) {
  return {
    affected_object_ref: null,
    affected_route: input.affectedRoute,
    blocking: true,
    detail:
      input.code === "STALE_REVIEW_REQUIRED"
        ? "Refresh this view before sending changes."
        : "Some information is temporarily limited while the portal catches up.",
    headline:
      input.code === "STALE_REVIEW_REQUIRED"
        ? "Review the latest view"
        : "Portal data is temporarily limited",
    limitation_code: input.code,
  };
}

export function deriveClientPortalWorkspacePosture(input: {
  draftResumeActive?: boolean | undefined;
  freshnessState?: ClientPortalFreshnessState | undefined;
  route: ClientPortalRouteCode;
}): DerivedClientPortalWorkspacePosture {
  const freshnessState = input.freshnessState ?? "FRESH";
  if (freshnessState === "STALE_REVIEW_REQUIRED") {
    return {
      content_limitations: [
        limitation({
          affectedRoute: input.route,
          code: "STALE_REVIEW_REQUIRED",
        }),
      ],
      freshness_state: freshnessState,
      recovery_posture: "INLINE_REBASE",
      settlement_state: "STALE_REVIEW_REQUIRED",
      workspace_posture: {
        connection_state: "STALE",
        full_text_ref: "portal.notice.stale-review",
        interaction_posture: "REVIEW_REQUIRED",
        notice_detail: "Refresh this view before sending changes.",
        notice_headline: "Review the latest view",
        promoted_support_region: "LIMITATION_NOTICE",
      },
    };
  }
  if (freshnessState === "DEGRADED") {
    return {
      content_limitations: [
        limitation({
          affectedRoute: input.route,
          code: "DEGRADED_DATA",
        }),
      ],
      freshness_state: freshnessState,
      recovery_posture: "READ_ONLY_LIMITED",
      settlement_state: "DEGRADED_READ_ONLY",
      workspace_posture: {
        connection_state: "DEGRADED",
        full_text_ref: "portal.notice.degraded-data",
        interaction_posture: "READ_ONLY_LIMITED",
        notice_detail: "You can read the current view while we restore the live data path.",
        notice_headline: "Portal data is temporarily limited",
        promoted_support_region: "LIMITATION_NOTICE",
      },
    };
  }

  if (input.route === "HELP") {
    return {
      content_limitations: [],
      freshness_state: "FRESH",
      recovery_posture: "NONE",
      settlement_state: "STEADY",
      workspace_posture: {
        connection_state: "CONNECTED",
        full_text_ref: "portal.help.support-panel",
        interaction_posture: "MUTATING_ALLOWED",
        notice_detail: "Help stays connected to this filing and its visible context.",
        notice_headline: "Help for this filing",
        promoted_support_region: "SUPPORT_PANEL",
      },
    };
  }

  if (input.draftResumeActive === true) {
    return {
      content_limitations: [],
      freshness_state: "FRESH",
      recovery_posture: "NONE",
      settlement_state: "STEADY",
      workspace_posture: {
        connection_state: "CONNECTED",
        full_text_ref: "portal.draft.resume",
        interaction_posture: "MUTATING_ALLOWED",
        notice_detail: "Your saved work can be resumed on this route.",
        notice_headline: "Resume your saved work",
        promoted_support_region: "DRAFT_RESUME",
      },
    };
  }

  return {
    content_limitations: [],
    freshness_state: "FRESH",
    recovery_posture: "NONE",
    settlement_state: "STEADY",
    workspace_posture: {
      connection_state: "CONNECTED",
      full_text_ref: null,
      interaction_posture: "MUTATING_ALLOWED",
      notice_detail: null,
      notice_headline: null,
      promoted_support_region: "NONE",
    },
  };
}
