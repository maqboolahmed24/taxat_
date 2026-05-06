import type { ClientPortalRouteCode } from "../types.ts";

const routeLabels = {
  APPROVALS: "Approvals",
  DOCUMENTS: "Documents",
  HELP: "Help",
  HOME: "Home",
  ONBOARDING: "Onboarding",
} as const satisfies Record<ClientPortalRouteCode, string>;

const routeOrder = ["HOME", "DOCUMENTS", "APPROVALS", "ONBOARDING", "HELP"] as const;

export function deriveClientPortalNavigationTabs(input: {
  approvalBadgeCount?: number | null;
  documentBadgeCount?: number | null;
  includeOnboarding?: boolean | undefined;
  onboardingBadgeCount?: number | null;
  route: ClientPortalRouteCode;
}) {
  if (input.route === "ONBOARDING" && input.includeOnboarding !== true) {
    throw new Error("ONBOARDING route requires an active onboarding journey");
  }

  return routeOrder
    .filter((route) => route !== "ONBOARDING" || input.includeOnboarding === true)
    .map((route) => {
      const badgeCount =
        route === "DOCUMENTS"
          ? (input.documentBadgeCount ?? null)
          : route === "APPROVALS"
            ? (input.approvalBadgeCount ?? null)
            : route === "ONBOARDING"
              ? (input.onboardingBadgeCount ?? 1)
              : null;
      return {
        active: route === input.route,
        badge_count: route === "HOME" || route === "HELP" ? null : badgeCount,
        label: routeLabels[route],
        route,
      };
    });
}
