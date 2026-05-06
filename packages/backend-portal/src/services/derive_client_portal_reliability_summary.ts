import type {
  ClientPortalFreshnessState,
  ClientPortalRouteCode,
} from "../types.ts";

const flowByRoute = {
  APPROVALS: "APPROVAL",
  DOCUMENTS: "UPLOAD",
  HELP: "GENERAL_NAVIGATION",
  HOME: "GENERAL_NAVIGATION",
  ONBOARDING: "ONBOARDING",
} as const satisfies Record<ClientPortalRouteCode, string>;

export function deriveClientPortalReliabilitySummary(input: {
  freshnessState?: ClientPortalFreshnessState | undefined;
  route: ClientPortalRouteCode;
  surfaceClass?: "DESKTOP" | "MOBILE" | "TABLET" | undefined;
}) {
  const freshnessState = input.freshnessState ?? "FRESH";
  if (freshnessState === "STALE_REVIEW_REQUIRED") {
    return {
      completion_probability: 0.52,
      dominant_abort_hazard_code: "STALE_VIEW",
      dominant_flow_kind: flowByRoute[input.route],
      flow_stability_score: 61,
      network_posture: "HEALTHY",
      recovery_posture: "STALE_REVIEW_REQUIRED",
      risk_weighted_friction_score: 38,
      surface_class: input.surfaceClass ?? "DESKTOP",
    };
  }
  if (freshnessState === "DEGRADED") {
    return {
      completion_probability: 0.34,
      dominant_abort_hazard_code: "DATA_PATH_DEGRADED",
      dominant_flow_kind: flowByRoute[input.route],
      flow_stability_score: 42,
      network_posture: "UNSTABLE",
      recovery_posture: "SUPPORT_REQUIRED",
      risk_weighted_friction_score: 64,
      surface_class: input.surfaceClass ?? "DESKTOP",
    };
  }
  return {
    completion_probability: 0.83,
    dominant_abort_hazard_code: null,
    dominant_flow_kind: flowByRoute[input.route],
    flow_stability_score: 88,
    network_posture: "HEALTHY",
    recovery_posture: "NONE",
    risk_weighted_friction_score: 14,
    surface_class: input.surfaceClass ?? "DESKTOP",
  };
}
