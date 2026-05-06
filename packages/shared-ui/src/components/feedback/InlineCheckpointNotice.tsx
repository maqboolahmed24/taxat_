export type InlineCheckpointNoticeTone = "info" | "warning" | "critical";

export type InlineCheckpointNotice = {
  body: string;
  id: string;
  tone: InlineCheckpointNoticeTone;
  title: string;
};

export const inlineCheckpointNoticeContract = {
  component_id: "inline-checkpoint-notice",
  purpose:
    "Keep stale, modeled, and step-up checkpoint states inline on the same approval route without route-breaking detours.",
  tones: {
    critical: "#C2410C",
    info: "#1D4ED8",
    warning: "#B7791F",
  },
} as const;

export function renderInlineCheckpointNotice(notice: InlineCheckpointNotice) {
  return `${notice.title}: ${notice.body}`;
}
