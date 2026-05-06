import type { OperatorInteractionLayer } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type CalmShellEmbodiment =
  | "BROWSER_PRIMARY"
  | "NATIVE_PRIMARY_SCENE"
  | "PARENT_BOUND_SUPPORT_WINDOW"
  | "SYSTEM_NOTIFICATION_MIRROR";

export type CalmShellPreviewNotificationAndHistoryPosture = Pick<
  OperatorInteractionLayer,
  | "artifact_preview_surface"
  | "history_presentation"
  | "notification_surface"
  | "recovery_notice_surface"
>;

export function deriveCalmShellPreviewNotificationAndHistoryPosture(input: {
  embodiment?: CalmShellEmbodiment | undefined;
} = {}): CalmShellPreviewNotificationAndHistoryPosture {
  switch (input.embodiment ?? "BROWSER_PRIMARY") {
    case "PARENT_BOUND_SUPPORT_WINDOW":
      return {
        artifact_preview_surface: "SECONDARY_WINDOW_BODY",
        history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
        notification_surface: "PARENT_CONTEXT_BAR",
        recovery_notice_surface: "IDENTITY_HEADER",
      };
    case "SYSTEM_NOTIFICATION_MIRROR":
      return {
        artifact_preview_surface: "DETAIL_DRAWER",
        history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
        notification_surface: "CONTEXT_BAR_WITH_SYSTEM_MIRROR",
        recovery_notice_surface: "CONTEXT_BAR",
      };
    case "BROWSER_PRIMARY":
    case "NATIVE_PRIMARY_SCENE":
      return {
        artifact_preview_surface: "DETAIL_DRAWER",
        history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
        notification_surface: "CONTEXT_BAR",
        recovery_notice_surface: "CONTEXT_BAR",
      };
  }
}
