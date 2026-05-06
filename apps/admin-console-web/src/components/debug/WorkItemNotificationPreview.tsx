export type WorkItemNotificationPreviewScenario = "customer" | "internal" | "suppressed";

export const workItemNotificationPreviewScenarios: WorkItemNotificationPreviewScenario[] = [
  "customer",
  "internal",
  "suppressed",
];

export const workItemNotificationPreviewPublicRoute =
  "/apps/admin-console-web/public/debug/work-item-notification-preview/index.html";
