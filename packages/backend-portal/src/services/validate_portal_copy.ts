import {
  assertPortalLanguageContract,
  portalLanguageContract,
  type PortalTextBudgetKey,
} from "../contracts/portal_language_contract.ts";
import { assertClearPortalDueLabel } from "./derive_clear_due_label.ts";
import { portalLanguageLeakMarkers } from "./filter_portal_vocabulary.ts";
import {
  type ClientPortalWorkspaceRecord,
  PortalLanguageContractProjectionError,
} from "../types.ts";

export type PortalCopyViolation = {
  fieldName: string;
  message: string;
  reasonCode: string;
};

export type PortalCopyFragment = {
  fieldName: string;
  value: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== null)
    : [];
}

export function portalVisibleCopyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.split(/\s+/).join(" ").trim();
  return normalized.length === 0 ? null : normalized;
}

export function normalizedPortalCopy(value: unknown): string | null {
  const text = portalVisibleCopyText(value);
  return text === null ? null : text.toLocaleLowerCase("en-GB").split(/\s+/).join(" ");
}

export function validatePortalCopy(input: {
  budgetKey: PortalTextBudgetKey;
  dueLabel?: boolean | undefined;
  fieldName: string;
  value: unknown;
}): PortalCopyViolation[] {
  const text = portalVisibleCopyText(input.value);
  if (text === null) {
    return [];
  }
  const budget = portalLanguageContract.copy_budget[input.budgetKey];
  const violations: PortalCopyViolation[] = [];
  if (text.length > budget) {
    violations.push({
      fieldName: input.fieldName,
      message: `${input.fieldName} exceeds the governed portal copy budget of ${budget} characters.`,
      reasonCode: "PORTAL_COPY_BUDGET_EXCEEDED",
    });
  }
  const leakedMarkers = portalLanguageLeakMarkers(text);
  if (leakedMarkers.length > 0) {
    violations.push({
      fieldName: input.fieldName,
      message: `${input.fieldName} must not leak ${leakedMarkers.join(", ")}.`,
      reasonCode: "PORTAL_COPY_FORBIDDEN_VOCABULARY",
    });
  }
  if (input.dueLabel === true) {
    try {
      assertClearPortalDueLabel({ fieldName: input.fieldName, value: text });
    } catch (_error) {
      violations.push({
        fieldName: input.fieldName,
        message: `${input.fieldName} must use explicit due-label wording.`,
        reasonCode: "PORTAL_DUE_LABEL_NOT_CLEAR",
      });
    }
  }
  return violations;
}

export function assertPortalCopy(input: {
  budgetKey: PortalTextBudgetKey;
  dueLabel?: boolean | undefined;
  fieldName: string;
  value: unknown;
}) {
  const violations = validatePortalCopy(input);
  if (violations.length === 0) {
    return;
  }
  const violation = violations[0];
  if (violation === undefined) {
    return;
  }
  throw new PortalLanguageContractProjectionError(violation.message, [violation.reasonCode]);
}

export function validatePortalDuplicateSupportCopy(
  fragments: readonly PortalCopyFragment[],
): PortalCopyViolation[] {
  const repeatedLabels = new Map<string, string[]>();
  for (const fragment of fragments) {
    const normalized = normalizedPortalCopy(fragment.value);
    if (normalized === null || normalized.length < 24) {
      continue;
    }
    repeatedLabels.set(normalized, [
      ...(repeatedLabels.get(normalized) ?? []),
      fragment.fieldName,
    ]);
  }
  const duplicates = [...repeatedLabels.values()].filter((labels) => labels.length > 1);
  if (duplicates.length === 0) {
    return [];
  }
  const firstDuplicate = duplicates[0] ?? [];
  return [
    {
      fieldName: firstDuplicate.join(" / "),
      message:
        "Portal routes must not repeat the same limitation or recovery narrative across visible regions.",
      reasonCode: "PORTAL_DUPLICATE_SUPPORT_COPY",
    },
  ];
}

export function assertNoDuplicatePortalSupportCopy(
  fragments: readonly PortalCopyFragment[],
) {
  const violations = validatePortalDuplicateSupportCopy(fragments);
  if (violations.length === 0) {
    return;
  }
  const violation = violations[0];
  if (violation === undefined) {
    return;
  }
  throw new PortalLanguageContractProjectionError(violation.message, [violation.reasonCode]);
}

function assertOptionalCopy(
  value: unknown,
  fieldName: string,
  budgetKey: PortalTextBudgetKey,
  dueLabel = false,
) {
  if (value === null || value === undefined) {
    return;
  }
  assertPortalCopy({ budgetKey, dueLabel, fieldName, value });
}

function collectDuplicateSupportFragments(
  workspace: ClientPortalWorkspaceRecord,
): PortalCopyFragment[] {
  const statusHero = asRecord(workspace.status_hero);
  const contentLimitations = asRecordArray(workspace.content_limitations);
  const supportPanel = asRecord(workspace.support_panel);
  const fragments: PortalCopyFragment[] = [
    {
      fieldName: "`status_hero.supporting_text`",
      value: statusHero?.supporting_text,
    },
  ];
  contentLimitations.forEach((limitation, index) => {
    fragments.push(
      {
        fieldName: `\`content_limitations[${index}].headline\``,
        value: limitation.headline,
      },
      {
        fieldName: `\`content_limitations[${index}].detail\``,
        value: limitation.detail,
      },
    );
  });
  if (supportPanel !== null) {
    fragments.push({
      fieldName: "`support_panel.help_headline`",
      value: supportPanel.help_headline,
    });
    const caseContextPanel = asRecord(supportPanel.case_context_panel);
    if (caseContextPanel !== null) {
      fragments.push({
        fieldName: "`support_panel.case_context_panel.context_summary_ref`",
        value: caseContextPanel.context_summary_ref,
      });
    }
  }
  return fragments;
}

export function assertClientPortalWorkspaceCopyGuards(workspace: ClientPortalWorkspaceRecord) {
  assertPortalLanguageContract(workspace.language_contract, "`language_contract`");
  assertPortalCopy({
    budgetKey: "dominant_question_max_chars",
    fieldName: "`dominant_question`",
    value: workspace.dominant_question,
  });

  const identityContext = asRecord(workspace.identity_context);
  assertOptionalCopy(
    identityContext?.reassurance_line,
    "`identity_context.reassurance_line`",
    "reassurance_line_max_chars",
  );

  const statusHero = asRecord(workspace.status_hero);
  if (statusHero !== null) {
    assertPortalCopy({
      budgetKey: "status_headline_max_chars",
      fieldName: "`status_hero.headline`",
      value: statusHero.headline,
    });
    assertOptionalCopy(
      statusHero.supporting_text,
      "`status_hero.supporting_text`",
      "status_supporting_text_max_chars",
    );
    assertOptionalCopy(
      statusHero.due_label,
      "`status_hero.due_label`",
      "status_due_label_max_chars",
      true,
    );
    const primaryAction = asRecord(statusHero.primary_action);
    assertOptionalCopy(
      primaryAction?.label,
      "`status_hero.primary_action.label`",
      "action_label_max_chars",
    );
    if (statusHero.secondary_action !== null && statusHero.secondary_action !== undefined) {
      throw new PortalLanguageContractProjectionError(
        "`status_hero.secondary_action` must remain null so the hero cannot publish a competing primary action.",
        ["PORTAL_HERO_SECONDARY_ACTION_NOT_ALLOWED"],
      );
    }
  }

  asRecordArray(workspace.task_groups).forEach((group, groupIndex) => {
    assertOptionalCopy(
      group.label,
      `\`task_groups[${groupIndex}].label\``,
      "help_option_label_max_chars",
    );
    asRecordArray(group.tasks).forEach((task, taskIndex) => {
      assertOptionalCopy(
        task.label,
        `\`task_groups[${groupIndex}].tasks[${taskIndex}].label\``,
        "task_label_max_chars",
      );
      assertOptionalCopy(
        task.description,
        `\`task_groups[${groupIndex}].tasks[${taskIndex}].description\``,
        "task_description_max_chars",
      );
      const primaryAction = asRecord(task.primary_action);
      assertOptionalCopy(
        primaryAction?.label,
        `\`task_groups[${groupIndex}].tasks[${taskIndex}].primary_action.label\``,
        "action_label_max_chars",
      );
    });
  });

  asRecordArray(workspace.content_limitations).forEach((limitation, index) => {
    assertOptionalCopy(
      limitation.headline,
      `\`content_limitations[${index}].headline\``,
      "limitation_headline_max_chars",
    );
    assertOptionalCopy(
      limitation.detail,
      `\`content_limitations[${index}].detail\``,
      "limitation_detail_max_chars",
    );
  });

  const documentCenter = asRecord(workspace.document_center);
  asRecordArray(documentCenter?.requests).forEach((request, index) => {
    assertOptionalCopy(
      request.title,
      `\`document_center.requests[${index}].title\``,
      "request_title_max_chars",
    );
    assertOptionalCopy(
      request.why_requested_label,
      `\`document_center.requests[${index}].why_requested_label\``,
      "request_why_label_max_chars",
    );
    assertOptionalCopy(
      request.due_label,
      `\`document_center.requests[${index}].due_label\``,
      "request_due_label_max_chars",
      true,
    );
    assertOptionalCopy(
      request.help_text,
      `\`document_center.requests[${index}].help_text\``,
      "request_help_text_max_chars",
    );
  });

  const approvalCenter = asRecord(workspace.approval_center);
  asRecordArray(approvalCenter?.packs).forEach((pack, index) => {
    assertOptionalCopy(
      pack.title,
      `\`approval_center.packs[${index}].title\``,
      "approval_title_max_chars",
    );
    assertOptionalCopy(
      pack.summary,
      `\`approval_center.packs[${index}].summary\``,
      "approval_summary_max_chars",
    );
    assertOptionalCopy(
      pack.change_digest_summary,
      `\`approval_center.packs[${index}].change_digest_summary\``,
      "approval_change_digest_max_chars",
    );
    const primaryAction = asRecord(pack.primary_action);
    assertOptionalCopy(
      primaryAction?.label,
      `\`approval_center.packs[${index}].primary_action.label\``,
      "action_label_max_chars",
    );
    assertOptionalCopy(
      pack.settlement_pending_label,
      `\`approval_center.packs[${index}].settlement_pending_label\``,
      "approval_receipt_next_step_max_chars",
    );
    assertOptionalCopy(
      pack.receipt_next_step_label,
      `\`approval_center.packs[${index}].receipt_next_step_label\``,
      "approval_receipt_next_step_max_chars",
    );
  });

  const onboardingJourney = asRecord(workspace.onboarding_journey);
  if (onboardingJourney !== null) {
    assertOptionalCopy(
      onboardingJourney.current_step_label,
      "`onboarding_journey.current_step_label`",
      "onboarding_step_label_max_chars",
    );
    const nextAction = asRecord(onboardingJourney.next_action);
    assertOptionalCopy(
      nextAction?.label,
      "`onboarding_journey.next_action.label`",
      "action_label_max_chars",
    );
    const saveAction = asRecord(onboardingJourney.save_and_return_action);
    assertOptionalCopy(
      saveAction?.label,
      "`onboarding_journey.save_and_return_action.label`",
      "action_label_max_chars",
    );
  }

  const supportPanel = asRecord(workspace.support_panel);
  if (supportPanel !== null) {
    assertOptionalCopy(
      supportPanel.help_headline,
      "`support_panel.help_headline`",
      "help_headline_max_chars",
    );
    asRecordArray(supportPanel.contact_options).forEach((option, index) => {
      assertOptionalCopy(
        option.label,
        `\`support_panel.contact_options[${index}].label\``,
        "help_option_label_max_chars",
      );
      const action = asRecord(option.action);
      assertOptionalCopy(
        action?.label,
        `\`support_panel.contact_options[${index}].action.label\``,
        "action_label_max_chars",
      );
    });
    const caseContextPanel = asRecord(supportPanel.case_context_panel);
    assertOptionalCopy(
      caseContextPanel?.context_summary_ref,
      "`support_panel.case_context_panel.context_summary_ref`",
      "request_help_text_max_chars",
    );
  }

  asRecordArray(workspace.activity_timeline).forEach((event, index) => {
    assertOptionalCopy(
      event.headline,
      `\`activity_timeline[${index}].headline\``,
      "timeline_headline_max_chars",
    );
    assertOptionalCopy(
      event.detail_ref,
      `\`activity_timeline[${index}].detail_ref\``,
      "timeline_detail_max_chars",
    );
  });

  assertNoDuplicatePortalSupportCopy(collectDuplicateSupportFragments(workspace));
}
