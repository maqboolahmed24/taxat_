import { reasonMatrixTable } from "../../components/reconciliation/ReasonMatrixTable.tsx";
import { reconciliationBudgetBand } from "../../components/reconciliation/ReconciliationBudgetBand.tsx";
import { reconciliationProfileHeader } from "../../components/reconciliation/ReconciliationProfileHeader.tsx";
import { reconciliationWindowQueryPanel } from "../../components/reconciliation/ReconciliationWindowQueryPanel.tsx";
import { resumeAndEscalationStrip } from "../../components/reconciliation/ResumeAndEscalationStrip.tsx";

export const reconciliationInsightsRoute = {
  id: "reconciliation-insights",
  path: "/operations/reconciliation-insights",
  shell: "ADMIN_CONSOLE_OPERATIONS",
  static_preview_path:
    "/apps/admin-console-web/public/operations/reconciliation-insights/index.html",
  semantic_hooks: [
    reconciliationProfileHeader.test_id,
    reconciliationWindowQueryPanel.test_id,
    "reconciliation-dominant-insight",
    reconciliationBudgetBand.test_id,
    reasonMatrixTable.test_id,
    resumeAndEscalationStrip.test_id,
    "reconciliation-drill-table",
    reconciliationWindowQueryPanel.filter_test_id,
    "reconciliation-empty-state",
  ],
  source_policy: "DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY",
  visual_contract: {
    accent: "#0F766E",
    background: "#F7F5F0",
    danger: "#C2410C",
    info: "#1D4ED8",
    max_width: "1440px",
    secondary_text: "#667085",
    surface: "#FFFFFF",
    text: "#171717",
    warning: "#B7791F",
  },
} as const;
