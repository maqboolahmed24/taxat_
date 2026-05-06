import { approvalSummaryPanel } from "../../components/approvals/ApprovalSummaryPanel.tsx";
import { calculationIdentityStrip } from "../../components/approvals/CalculationIdentityStrip.tsx";
import { changeDigestPanel } from "../../components/approvals/ChangeDigestPanel.tsx";
import { declarationPanel } from "../../components/approvals/DeclarationPanel.tsx";
import { noticeAcknowledgementCard } from "../../components/approvals/NoticeAcknowledgementCard.tsx";
import { packetNoticeStack } from "../../components/approvals/PacketNoticeStack.tsx";
import { packetPromotionBlockNotice } from "../../components/approvals/PacketPromotionBlockNotice.tsx";
import { signOffPanel } from "../../components/approvals/SignOffPanel.tsx";

export const finalDeclarationConfirmationRoute = {
  id: "final-declaration-confirmation",
  path: "/approvals/final-declaration-confirmation",
  static_preview_path:
    "/apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html",
  shell: "CLIENT_PORTAL_SHELL",
  route_order: [
    approvalSummaryPanel.order_key,
    packetNoticeStack.order_key,
    changeDigestPanel.order_key,
    declarationPanel.order_key,
    signOffPanel.order_key,
  ],
  semantic_hooks: [
    approvalSummaryPanel.test_id,
    calculationIdentityStrip.test_id,
    packetNoticeStack.test_id,
    noticeAcknowledgementCard.test_id,
    noticeAcknowledgementCard.title_test_id,
    noticeAcknowledgementCard.detail_toggle_test_id,
    noticeAcknowledgementCard.acknowledge_test_id,
    packetNoticeStack.blocked_test_id,
    packetNoticeStack.satisfied_test_id,
    packetNoticeStack.resolution_summary_test_id,
    packetPromotionBlockNotice.test_id,
    changeDigestPanel.test_id,
    changeDigestPanel.detail_toggle_test_id,
    declarationPanel.test_id,
    declarationPanel.download_test_id,
    declarationPanel.print_test_id,
    signOffPanel.test_id,
    signOffPanel.confirm_checkbox_test_id,
    "calculation-stale-notice",
    "calculation-modeled-notice",
    signOffPanel.submit_test_id,
    signOffPanel.step_up_test_id,
    signOffPanel.pending_receipt_test_id,
    signOffPanel.receipt_test_id,
  ],
  stale_protection_rules: [
    "superseded calculation locks final sign-off",
    "superseded declaration pack disables preview/download/print for historical material",
    "changed approval context requires a refreshed server-authored projection",
    "modeled calculation posture blocks filing-capable submit",
    "unsatisfied packet-local notice resolution disables sign-off",
    "stale packet notice posture remains read-only and blocks sign-off",
  ],
  visual_contract: {
    accent: "#0F766E",
    background: "#F7F5F0",
    critical: "#C2410C",
    info: "#1D4ED8",
    max_width: "1280px",
    secondary_text: "#667085",
    surface: "#FFFFFF",
    text: "#171717",
    warning: "#B7791F",
  },
} as const;
