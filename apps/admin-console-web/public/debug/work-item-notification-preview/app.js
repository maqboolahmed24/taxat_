const notifications = {
  customer: {
    fallbackReason: "NOTIFICATION_RETURN_TARGET_UNAVAILABLE",
    fallbackRoute: "/portal/requests",
    focusAnchor: "request-info-focus://request-info://workflow-item-0149-preview/1",
    focusRestoration: "EXACT_FOCUS",
    objectAnchor: "workflow-item-0149-preview",
    openState: "OPENABLE",
    route: "/portal/requests/workflow-item-0149-preview",
    shell: "CLIENT_PORTAL_SHELL",
    suppression: "No suppression. Portal route is active and customer safe.",
    targetModule: "CUSTOMER_ACTIVITY",
    title: "Customer request info opened",
    returnRoute: "/portal/requests",
    visibility: "CUSTOMER_VISIBLE",
  },
  internal: {
    fallbackReason: "NOTIFICATION_RETURN_TARGET_UNAVAILABLE",
    fallbackRoute: "/work",
    focusAnchor: "work-item-focus://workflow-item-0149-preview/internal-activity",
    focusRestoration: "EXACT_FOCUS",
    objectAnchor: "workflow-item-0149-preview",
    openState: "OPENABLE",
    route: "/work/items/workflow-item-0149-preview",
    shell: "CALM_SHELL",
    suppression: "No suppression. Staff work route is active.",
    targetModule: "INTERNAL_ACTIVITY",
    title: "Internal reassignment",
    returnRoute: "/work",
    visibility: "INTERNAL_ONLY",
  },
  suppressed: {
    fallbackReason: "ACCESS_BINDING_CHANGE",
    fallbackRoute: "/portal/requests",
    focusAnchor: "Not exposed",
    focusRestoration: "INVALIDATED",
    objectAnchor: "workflow-item-0149-preview",
    openState: "SUPPRESSED",
    route: "No active open target",
    shell: "CLIENT_PORTAL_SHELL",
    suppression: "Suppressed reason codes: ACCESS_BINDING_CHANGED. No active route is exposed.",
    targetModule: "Not exposed",
    title: "Suppressed stale portal notification",
    returnRoute: "/portal/requests",
    visibility: "CUSTOMER_VISIBLE",
  },
};

const ids = {
  fallbackReason: "fallback-reason",
  fallbackRoute: "fallback-route",
  focusAnchor: "focus-anchor",
  focusRestoration: "focus-restoration",
  objectAnchor: "object-anchor",
  openState: "open-state",
  route: "target-route",
  shell: "shell",
  routeShell: "route-shell",
  suppression: "suppression-copy",
  targetModule: "target-module",
  title: "notification-title",
  returnRoute: "return-route",
  visibility: "visibility",
};

function render(scenario) {
  const notification = notifications[scenario] ?? notifications.customer;
  for (const [field, id] of Object.entries(ids)) {
    document.getElementById(id).textContent =
      field === "routeShell" ? notification.shell : notification[field];
  }
}

const select = document.getElementById("scenario");
const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario") ?? "customer";
select.value = notifications[scenario] ? scenario : "customer";
select.addEventListener("change", () => {
  const next = new URL(window.location.href);
  next.searchParams.set("scenario", select.value);
  window.history.replaceState(null, "", next);
  render(select.value);
});
render(select.value);
