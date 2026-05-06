import {
  PortalHelpRequestProjectionError,
  type PortalHelpRequestReasonFamily,
  type PortalHelpRequestSourceRoute,
  type PortalHelpRequestSupportChannel,
} from "../types.ts";

export type DeriveHelpRequestRouteAndReasonBindingInput = {
  itemId?: string | null | undefined;
  reasonFamily?: PortalHelpRequestReasonFamily | string | null | undefined;
  requestInfoRef?: string | null | undefined;
  sourceFocusAnchorRef?: string | null | undefined;
  sourceRoute: PortalHelpRequestSourceRoute | string;
  supportChannel?: PortalHelpRequestSupportChannel | string | null | undefined;
};

export type HelpRequestRouteAndReasonBinding = {
  reason_family: PortalHelpRequestReasonFamily;
  source_route: PortalHelpRequestSourceRoute;
  support_channel: PortalHelpRequestSupportChannel;
};

const sourceRoutes = new Set<PortalHelpRequestSourceRoute>([
  "APPROVALS",
  "DOCUMENTS",
  "HELP",
  "HOME",
  "ONBOARDING",
  "REQUEST_DETAIL",
]);

const supportChannels = new Set<PortalHelpRequestSupportChannel>([
  "CONTEXTUAL_REQUEST",
  "PORTAL_HELP",
]);

const reasonFamilies = new Set<PortalHelpRequestReasonFamily>([
  "ACCESS_HELP",
  "APPROVAL_HELP",
  "DOCUMENT_HELP",
  "GENERAL_HELP",
  "ONBOARDING_HELP",
  "STATUS_QUESTION",
]);

const allowedRoutesByReasonFamily = new Map<
  PortalHelpRequestReasonFamily,
  ReadonlySet<PortalHelpRequestSourceRoute> | null
>([
  ["ACCESS_HELP", new Set(["HELP", "ONBOARDING"])],
  ["APPROVAL_HELP", new Set(["APPROVALS"])],
  ["DOCUMENT_HELP", new Set(["DOCUMENTS", "REQUEST_DETAIL"])],
  ["GENERAL_HELP", new Set(["HELP"])],
  ["ONBOARDING_HELP", new Set(["ONBOARDING"])],
  ["STATUS_QUESTION", null],
]);

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new PortalHelpRequestProjectionError(message, reasonCodes);
}

function maybeNonEmpty(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function normalizeSourceRoute(value: string): PortalHelpRequestSourceRoute {
  const normalized = value.trim().toUpperCase();
  if (sourceRoutes.has(normalized as PortalHelpRequestSourceRoute)) {
    return normalized as PortalHelpRequestSourceRoute;
  }
  fail(`Unknown portal help source route ${value}`, ["PORTAL_HELP_SOURCE_ROUTE_INVALID"]);
}

function normalizeSupportChannel(value: string): PortalHelpRequestSupportChannel {
  const normalized = value.trim().toUpperCase();
  if (supportChannels.has(normalized as PortalHelpRequestSupportChannel)) {
    return normalized as PortalHelpRequestSupportChannel;
  }
  fail(`Unknown portal help support channel ${value}`, [
    "PORTAL_HELP_SUPPORT_CHANNEL_INVALID",
  ]);
}

function normalizeReasonFamily(value: string): PortalHelpRequestReasonFamily {
  const normalized = value.trim().toUpperCase();
  if (reasonFamilies.has(normalized as PortalHelpRequestReasonFamily)) {
    return normalized as PortalHelpRequestReasonFamily;
  }
  fail(`Unknown portal help reason family ${value}`, [
    "PORTAL_HELP_REASON_FAMILY_INVALID",
  ]);
}

function defaultReasonFamily(
  sourceRoute: PortalHelpRequestSourceRoute,
): PortalHelpRequestReasonFamily {
  switch (sourceRoute) {
    case "APPROVALS":
      return "APPROVAL_HELP";
    case "DOCUMENTS":
    case "REQUEST_DETAIL":
      return "DOCUMENT_HELP";
    case "HELP":
      return "GENERAL_HELP";
    case "HOME":
      return "STATUS_QUESTION";
    case "ONBOARDING":
      return "ONBOARDING_HELP";
  }
}

export function deriveHelpRequestRouteAndReasonBinding(
  input: DeriveHelpRequestRouteAndReasonBindingInput,
): HelpRequestRouteAndReasonBinding {
  const sourceRoute = normalizeSourceRoute(input.sourceRoute);
  const requestInfoRef = maybeNonEmpty(input.requestInfoRef);
  const itemId = maybeNonEmpty(input.itemId);
  const focusAnchorRef = maybeNonEmpty(input.sourceFocusAnchorRef);
  const supportChannel =
    input.supportChannel === undefined || input.supportChannel === null
      ? requestInfoRef === null
        ? "PORTAL_HELP"
        : "CONTEXTUAL_REQUEST"
      : normalizeSupportChannel(input.supportChannel);
  const reasonFamily =
    input.reasonFamily === undefined || input.reasonFamily === null
      ? defaultReasonFamily(sourceRoute)
      : normalizeReasonFamily(input.reasonFamily);

  if (supportChannel === "CONTEXTUAL_REQUEST") {
    if (sourceRoute !== "REQUEST_DETAIL") {
      fail("Contextual portal help must stay on source_route = REQUEST_DETAIL", [
        "PORTAL_HELP_CONTEXTUAL_ROUTE_INVALID",
      ]);
    }
    if (requestInfoRef === null) {
      fail("Contextual portal help requires request_info_ref", [
        "PORTAL_HELP_CONTEXTUAL_REQUEST_INFO_REQUIRED",
      ]);
    }
    if (itemId === null) {
      fail("Contextual portal help requires item_id", [
        "PORTAL_HELP_CONTEXTUAL_ITEM_REQUIRED",
      ]);
    }
    if (focusAnchorRef === null) {
      fail("Contextual portal help requires source_focus_anchor_ref", [
        "PORTAL_HELP_CONTEXTUAL_FOCUS_REQUIRED",
      ]);
    }
  }

  if (sourceRoute === "REQUEST_DETAIL" && itemId === null) {
    fail("REQUEST_DETAIL portal help requires item_id", [
      "PORTAL_HELP_REQUEST_DETAIL_ITEM_REQUIRED",
    ]);
  }
  if (sourceRoute === "REQUEST_DETAIL" && focusAnchorRef === null) {
    fail("REQUEST_DETAIL portal help requires source_focus_anchor_ref", [
      "PORTAL_HELP_REQUEST_DETAIL_FOCUS_REQUIRED",
    ]);
  }
  if (requestInfoRef !== null && sourceRoute !== "REQUEST_DETAIL") {
    fail("Linked request-for-info help must stay on REQUEST_DETAIL", [
      "PORTAL_HELP_REQUEST_INFO_ROUTE_INVALID",
    ]);
  }

  const allowedRoutes = allowedRoutesByReasonFamily.get(reasonFamily);
  if (allowedRoutes !== null && allowedRoutes !== undefined && !allowedRoutes.has(sourceRoute)) {
    fail(`${reasonFamily} is not allowed for source_route ${sourceRoute}`, [
      "PORTAL_HELP_REASON_ROUTE_MISMATCH",
    ]);
  }

  return {
    reason_family: reasonFamily,
    source_route: sourceRoute,
    support_channel: supportChannel,
  };
}
