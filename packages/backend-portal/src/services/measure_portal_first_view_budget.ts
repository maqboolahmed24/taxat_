import {
  portalLanguageContract,
  type PortalFirstViewBudgetKey,
} from "../contracts/portal_language_contract.ts";
import { portalVisibleCopyText } from "./validate_portal_copy.ts";
import {
  type ClientPortalRouteCode,
  type ClientPortalWorkspaceRecord,
  PortalLanguageContractProjectionError,
} from "../types.ts";

export type PortalFirstViewRouteLabel =
  | ClientPortalRouteCode
  | "REQUEST_DETAIL";

export type PortalFirstViewBudgetResult = {
  budget: number;
  budgetKey: PortalFirstViewBudgetKey;
  routeLabel: PortalFirstViewRouteLabel;
  total: number;
  withinBudget: boolean;
};

export const portalFirstViewBudgetKeyByRoute = {
  APPROVALS: "approvals_first_view_char_budget",
  DOCUMENTS: "documents_first_view_char_budget",
  HELP: "help_first_view_char_budget",
  HOME: "home_first_view_char_budget",
  ONBOARDING: "onboarding_first_view_char_budget",
  REQUEST_DETAIL: "request_detail_first_view_char_budget",
} as const satisfies Record<PortalFirstViewRouteLabel, PortalFirstViewBudgetKey>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== null)
    : [];
}

export function portalCopyBudgetTotal(...values: readonly unknown[]): number {
  return values.reduce<number>((total, value) => {
    const text = portalVisibleCopyText(value);
    return total + (text === null ? 0 : text.length);
  }, 0);
}

export function measurePortalFirstViewBudget(input: {
  budgetKey?: PortalFirstViewBudgetKey | undefined;
  routeLabel: PortalFirstViewRouteLabel;
  values: readonly unknown[];
}): PortalFirstViewBudgetResult {
  const budgetKey = input.budgetKey ?? portalFirstViewBudgetKeyByRoute[input.routeLabel];
  const budget = portalLanguageContract.copy_budget[budgetKey];
  const total = portalCopyBudgetTotal(...input.values);
  return {
    budget,
    budgetKey,
    routeLabel: input.routeLabel,
    total,
    withinBudget: total <= budget,
  };
}

export function assertPortalFirstViewBudget(input: {
  budgetKey?: PortalFirstViewBudgetKey | undefined;
  routeLabel: PortalFirstViewRouteLabel;
  values: readonly unknown[];
}) {
  const result = measurePortalFirstViewBudget(input);
  if (result.withinBudget) {
    return result;
  }
  throw new PortalLanguageContractProjectionError(
    `${result.routeLabel} first view exceeds the governed portal copy budget of ${result.budget} characters.`,
    ["PORTAL_FIRST_VIEW_COPY_BUDGET_EXCEEDED"],
  );
}

function firstContentLimitation(workspace: ClientPortalWorkspaceRecord) {
  return asRecordArray(workspace.content_limitations)[0] ?? null;
}

function firstDocumentRequest(workspace: ClientPortalWorkspaceRecord) {
  const documentCenter = asRecord(workspace.document_center);
  return asRecordArray(documentCenter?.requests)[0] ?? null;
}

function requestByContextRef(workspace: ClientPortalWorkspaceRecord) {
  const contextObjectRef = workspace.route_context.context_object_ref;
  if (contextObjectRef === null) {
    return null;
  }
  const documentCenter = asRecord(workspace.document_center);
  return (
    asRecordArray(documentCenter?.requests).find(
      (request) => request.request_id === contextObjectRef,
    ) ?? null
  );
}

function visibleApprovalPack(workspace: ClientPortalWorkspaceRecord) {
  const approvalCenter = asRecord(workspace.approval_center);
  const latestPackRef = approvalCenter?.latest_pack_ref;
  const packs = asRecordArray(approvalCenter?.packs);
  return (
    packs.find((pack) => typeof latestPackRef === "string" && pack.approval_pack_id === latestPackRef) ??
    packs[0] ??
    null
  );
}

function workspaceFirstViewBasis(workspace: ClientPortalWorkspaceRecord): {
  routeLabel: PortalFirstViewRouteLabel;
  values: unknown[];
} {
  const statusHero = asRecord(workspace.status_hero);
  const primaryAction = asRecord(statusHero?.primary_action);
  const limitation = firstContentLimitation(workspace);
  const shared = [
    workspace.dominant_question,
    statusHero?.headline,
    statusHero?.supporting_text,
    statusHero?.due_label,
    primaryAction?.label,
  ];
  const limitationValues = [limitation?.headline, limitation?.detail];

  if (workspace.route_context.context_route === "REQUEST_DETAIL") {
    const requestDetail = requestByContextRef(workspace);
    return {
      routeLabel: "REQUEST_DETAIL",
      values: [
        ...shared,
        requestDetail?.title,
        requestDetail?.why_requested_label,
        requestDetail?.due_label,
        requestDetail?.help_text,
        ...limitationValues,
      ],
    };
  }

  if (workspace.route === "HOME") {
    const identityContext = asRecord(workspace.identity_context);
    const groups = asRecordArray(workspace.task_groups);
    const firstTask =
      groups
        .flatMap((group) => asRecordArray(group.tasks))
        .find((task) => task.task_id === workspace.home_primary_task_ref) ??
      groups.flatMap((group) => asRecordArray(group.tasks))[0] ??
      null;
    const taskAction = asRecord(firstTask?.primary_action);
    return {
      routeLabel: "HOME",
      values: [
        workspace.dominant_question,
        identityContext?.reassurance_line,
        statusHero?.headline,
        statusHero?.supporting_text,
        statusHero?.due_label,
        primaryAction?.label,
        firstTask?.label,
        firstTask?.description,
        taskAction?.label,
        ...limitationValues,
      ],
    };
  }

  if (workspace.route === "DOCUMENTS") {
    const visibleRequest = firstDocumentRequest(workspace);
    return {
      routeLabel: "DOCUMENTS",
      values: [
        ...shared,
        visibleRequest?.title,
        visibleRequest?.why_requested_label,
        visibleRequest?.due_label,
        visibleRequest?.help_text,
        ...limitationValues,
      ],
    };
  }

  if (workspace.route === "APPROVALS") {
    const visiblePack = visibleApprovalPack(workspace);
    const packPrimaryAction = asRecord(visiblePack?.primary_action);
    return {
      routeLabel: "APPROVALS",
      values: [
        ...shared,
        visiblePack?.title,
        visiblePack?.summary,
        visiblePack?.change_digest_summary,
        packPrimaryAction?.label,
        visiblePack?.settlement_pending_label,
        visiblePack?.receipt_next_step_label,
        ...limitationValues,
      ],
    };
  }

  if (workspace.route === "ONBOARDING") {
    const onboardingJourney = asRecord(workspace.onboarding_journey);
    const nextAction = asRecord(onboardingJourney?.next_action);
    const saveAndReturnAction = asRecord(onboardingJourney?.save_and_return_action);
    return {
      routeLabel: "ONBOARDING",
      values: [
        ...shared,
        onboardingJourney?.current_step_label,
        nextAction?.label,
        saveAndReturnAction?.label,
        ...limitationValues,
      ],
    };
  }

  const supportPanel = asRecord(workspace.support_panel);
  const helpOptions = asRecordArray(supportPanel?.contact_options);
  const caseContextPanel = asRecord(supportPanel?.case_context_panel);
  return {
    routeLabel: "HELP",
    values: [
      workspace.dominant_question,
      supportPanel?.help_headline,
      ...helpOptions.flatMap((option) => [
        option.label,
        asRecord(option.action)?.label,
      ]),
      caseContextPanel?.context_summary_ref,
    ],
  };
}

export function measureClientPortalWorkspaceFirstViewBudget(
  workspace: ClientPortalWorkspaceRecord,
): PortalFirstViewBudgetResult {
  const basis = workspaceFirstViewBasis(workspace);
  return measurePortalFirstViewBudget(basis);
}

export function assertClientPortalWorkspaceFirstViewBudget(
  workspace: ClientPortalWorkspaceRecord,
) {
  const basis = workspaceFirstViewBasis(workspace);
  return assertPortalFirstViewBudget(basis);
}
