import type { PortalLanguageContract } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { PortalLanguageContractProjectionError } from "../types.ts";

export type PortalCopyBudget = PortalLanguageContract["copy_budget"];

export type PortalCopyBudgetKey = keyof PortalCopyBudget;

export type PortalFirstViewBudgetKey = Extract<
  PortalCopyBudgetKey,
  | "approvals_first_view_char_budget"
  | "documents_first_view_char_budget"
  | "help_first_view_char_budget"
  | "home_first_view_char_budget"
  | "onboarding_first_view_char_budget"
  | "request_detail_first_view_char_budget"
>;

export type PortalTextBudgetKey = Exclude<PortalCopyBudgetKey, PortalFirstViewBudgetKey>;

export const portalLanguageContract = {
  contract_code: "PORTAL_LANGUAGE_CONTRACT_V1",
  plain_language_policy: "CLIENT_SAFE_LITERAL_TASK_LANGUAGE",
  copy_serialization_policy: "DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY",
  dominance_policy: "ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION",
  support_subordination_policy: "ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK",
  role_filter_policy: "ROLE_FILTER_BEFORE_COPY_PUBLICATION",
  due_label_policy: "EXPLICIT_DUE_DATE_OR_NO_DEADLINE",
  history_language_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
  settlement_language_policy: "PENDING_AND_SETTLED_EXPLICIT",
  forbidden_term_families: [
    "GATE_LANGUAGE",
    "MANIFEST_LANGUAGE",
    "STALE_OR_REBASE_JARGON",
    "OVERRIDE_LANGUAGE",
    "AUDIT_LANGUAGE",
    "ESCALATION_LANGUAGE",
    "ASSIGNMENT_LANGUAGE",
    "STAFF_ROLE_LANGUAGE",
    "WORKFLOW_LANGUAGE",
    "INTERNAL_ONLY_LANGUAGE",
  ],
  copy_budget: {
    dominant_question_max_chars: 120,
    reassurance_line_max_chars: 120,
    status_headline_max_chars: 96,
    status_supporting_text_max_chars: 180,
    status_due_label_max_chars: 48,
    action_label_max_chars: 36,
    task_label_max_chars: 72,
    task_description_max_chars: 180,
    limitation_headline_max_chars: 120,
    limitation_detail_max_chars: 180,
    request_title_max_chars: 72,
    request_why_label_max_chars: 120,
    request_due_label_max_chars: 64,
    request_help_text_max_chars: 180,
    approval_title_max_chars: 72,
    approval_summary_max_chars: 180,
    approval_change_digest_max_chars: 180,
    approval_receipt_next_step_max_chars: 96,
    onboarding_step_label_max_chars: 64,
    help_headline_max_chars: 96,
    help_option_label_max_chars: 40,
    timeline_headline_max_chars: 120,
    timeline_detail_max_chars: 180,
    request_row_title_max_chars: 72,
    request_row_status_label_max_chars: 48,
    request_row_due_label_max_chars: 64,
    request_row_action_label_max_chars: 36,
    request_row_no_safe_action_max_chars: 120,
    request_detail_status_max_chars: 120,
    home_first_view_char_budget: 520,
    documents_first_view_char_budget: 560,
    approvals_first_view_char_budget: 560,
    onboarding_first_view_char_budget: 480,
    help_first_view_char_budget: 420,
    request_detail_first_view_char_budget: 460,
  },
} as const satisfies PortalLanguageContract;

export const portalLanguageContractHash = stableJsonHash(portalLanguageContract);

export function buildPortalLanguageContract(): PortalLanguageContract {
  return portalLanguageContract;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function isPortalLanguageContract(value: unknown): value is PortalLanguageContract {
  return canonicalJson(value) === canonicalJson(portalLanguageContract);
}

export function assertPortalLanguageContract(
  value: unknown,
  fieldName = "language_contract",
): asserts value is PortalLanguageContract {
  if (isPortalLanguageContract(value)) {
    return;
  }
  throw new PortalLanguageContractProjectionError(
    `${fieldName} must retain PORTAL_LANGUAGE_CONTRACT_V1 exactly`,
    ["PORTAL_LANGUAGE_CONTRACT_MISMATCH"],
  );
}
