import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientOnboardingJourney,
  buildClientOnboardingWorkspaceJourney,
  deriveOnboardingResumeState,
  deriveOnboardingStepWorkspaceState,
  type BuildClientOnboardingJourneyInput,
} from "../index.ts";
import { ClientOnboardingJourneyProjectionError } from "../types.ts";

const languageContract = {
  contract_code: "PORTAL_LANGUAGE_CONTRACT_V1",
  copy_budget: {
    action_label_max_chars: 36,
    approval_change_digest_max_chars: 180,
    approval_receipt_next_step_max_chars: 96,
    approval_summary_max_chars: 180,
    approval_title_max_chars: 72,
    approvals_first_view_char_budget: 560,
    documents_first_view_char_budget: 560,
    dominant_question_max_chars: 120,
    help_first_view_char_budget: 420,
    help_headline_max_chars: 96,
    help_option_label_max_chars: 40,
    home_first_view_char_budget: 520,
    limitation_detail_max_chars: 180,
    limitation_headline_max_chars: 120,
    onboarding_first_view_char_budget: 480,
    onboarding_step_label_max_chars: 64,
    reassurance_line_max_chars: 120,
    request_detail_first_view_char_budget: 460,
    request_detail_status_max_chars: 120,
    request_due_label_max_chars: 64,
    request_help_text_max_chars: 180,
    request_row_action_label_max_chars: 36,
    request_row_due_label_max_chars: 64,
    request_row_no_safe_action_max_chars: 120,
    request_row_status_label_max_chars: 48,
    request_row_title_max_chars: 72,
    request_title_max_chars: 72,
    request_why_label_max_chars: 120,
    status_due_label_max_chars: 48,
    status_headline_max_chars: 96,
    status_supporting_text_max_chars: 180,
    task_description_max_chars: 180,
    task_label_max_chars: 72,
    timeline_detail_max_chars: 180,
    timeline_headline_max_chars: 120,
  },
  copy_serialization_policy: "DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY",
  dominance_policy: "ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION",
  due_label_policy: "EXPLICIT_DUE_DATE_OR_NO_DEADLINE",
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
  history_language_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
  plain_language_policy: "CLIENT_SAFE_LITERAL_TASK_LANGUAGE",
  role_filter_policy: "ROLE_FILTER_BEFORE_COPY_PUBLICATION",
  settlement_language_policy: "PENDING_AND_SETTLED_EXPLICIT",
  support_subordination_policy: "ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK",
};

const baseInput = {
  accessBindingHash: "access.onboarding.client-1",
  authorityLinkRequirement: "REQUIRED",
  authorityLinkState: "LINKED",
  clientId: "client.onboarding-1",
  completedSteps: [
    "INVITE_ACCEPTANCE",
    "PROFILE_CONFIRMATION",
    "IDENTITY_VERIFICATION",
    "AUTHORITY_LINK_SETUP",
    "DOCUMENT_COLLECTION",
  ],
  documentRequestRefs: ["request.onboarding.identity"],
  invitedAt: "2026-05-01T09:00:00.000Z",
  journeyId: "onboarding.journey.client-1",
  languageContract,
  lifecycleState: "READY_FOR_REVIEW",
  maskingPostureFingerprint: "mask.onboarding.client-1",
  requiredSteps: [
    "INVITE_ACCEPTANCE",
    "PROFILE_CONFIRMATION",
    "IDENTITY_VERIFICATION",
    "AUTHORITY_LINK_SETUP",
    "DOCUMENT_COLLECTION",
    "REVIEW_CONFIRMATION",
  ],
  stateChangedAt: "2026-05-04T09:00:00.000Z",
  tenantId: "tenant.onboarding-1",
  verificationState: "VERIFIED",
  visibilityCachePartitionKey: "visibility.onboarding.client-1",
} satisfies BuildClientOnboardingJourneyInput;

test("builds a schema-valid onboarding journey with one current review step", async () => {
  const journey = buildClientOnboardingJourney(baseInput);
  const workspaceJourney = buildClientOnboardingWorkspaceJourney(baseInput);

  expect(journey.current_step_code).toBe("REVIEW_CONFIRMATION");
  expect(journey.resume_state).toBe("LIVE");
  expect(journey.resume_step_code).toBe("REVIEW_CONFIRMATION");
  expect(journey.completed_steps).not.toContain("REVIEW_CONFIRMATION");
  expect(workspaceJourney.surface_order).toEqual([
    "WELCOME_PANEL",
    "ONBOARDING_STEPPER",
    "STEP_WORKSPACE",
    "SUPPORT_PANEL",
  ]);
  expect(workspaceJourney.step_workspace_state).toBe("ACTIVE_STEP");
  expect(workspaceJourney.completed_step_count).toBe(5);
  expect(workspaceJourney.total_step_count).toBe(6);
  expect(workspaceJourney.next_action).toMatchObject({
    action_code: "CONTINUE_ONBOARDING",
    route: "ONBOARDING",
  });

  await validateContractSchema("client_onboarding_journey", journey);
});

test("derives live resume, reconfirmation review, and stale-review postures deterministically", () => {
  expect(
    deriveOnboardingResumeState({
      completedSteps: ["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION"],
      currentStepCode: "DOCUMENT_COLLECTION",
      draftUploadSessionRefs: ["upload.draft.1"],
      lifecycleState: "DOCUMENTS_PENDING",
      requiredSteps: baseInput.requiredSteps,
    }),
  ).toEqual({
    reconfirmationStepCodes: [],
    resumeState: "LIVE",
    resumeStepCode: "DOCUMENT_COLLECTION",
  });

  expect(
    deriveOnboardingResumeState({
      completedSteps: ["INVITE_ACCEPTANCE"],
      currentStepCode: "PROFILE_CONFIRMATION",
      lifecycleState: "PROFILE_PENDING",
      reconfirmationStepCodes: ["PROFILE_CONFIRMATION"],
      requiredSteps: baseInput.requiredSteps,
    }),
  ).toEqual({
    reconfirmationStepCodes: ["PROFILE_CONFIRMATION"],
    resumeState: "RECONFIRMATION_REQUIRED",
    resumeStepCode: "PROFILE_CONFIRMATION",
  });

  expect(
    deriveOnboardingResumeState({
      completedSteps: baseInput.completedSteps,
      currentStepCode: "REVIEW_CONFIRMATION",
      lifecycleState: "READY_FOR_REVIEW",
      reconfirmationStepCodes: ["REVIEW_CONFIRMATION"],
      requiredSteps: baseInput.requiredSteps,
      staleReviewRequired: true,
    }),
  ).toEqual({
    reconfirmationStepCodes: ["REVIEW_CONFIRMATION"],
    resumeState: "STALE_REVIEW_REQUIRED",
    resumeStepCode: null,
  });
  expect(
    deriveOnboardingStepWorkspaceState({
      currentStepCode: "REVIEW_CONFIRMATION",
      lifecycleState: "READY_FOR_REVIEW",
      resumeState: "STALE_REVIEW_REQUIRED",
    }),
  ).toMatchObject({
    saveReturnState: "NOT_AVAILABLE_IRREVERSIBLE",
    stepWorkspaceState: "STALE_REVIEW",
  });
});

test("keeps document draft upload continuity inside DOCUMENT_COLLECTION only", async () => {
  const draft = buildClientOnboardingJourney({
    ...baseInput,
    authorityLinkState: "LINKED",
    completedSteps: [
      "INVITE_ACCEPTANCE",
      "PROFILE_CONFIRMATION",
      "IDENTITY_VERIFICATION",
      "AUTHORITY_LINK_SETUP",
    ],
    draftUploadSessionRefs: ["upload.onboarding.draft"],
    lifecycleState: "DOCUMENTS_PENDING",
    stateChangedAt: "2026-05-04T08:00:00.000Z",
  });
  expect(draft.current_step_code).toBe("DOCUMENT_COLLECTION");
  expect(draft.resume_step_code).toBe("DOCUMENT_COLLECTION");
  expect(draft.draft_upload_session_refs).toEqual(["upload.onboarding.draft"]);
  await validateContractSchema("client_onboarding_journey", draft);

  expect(() =>
    buildClientOnboardingJourney({
      ...baseInput,
      draftUploadSessionRefs: ["upload.invalid"],
      lifecycleState: "READY_FOR_REVIEW",
    }),
  ).toThrow(ClientOnboardingJourneyProjectionError);
});

test("publishes terminal completion summary and rejects terminal chronology drift", async () => {
  const completed = buildClientOnboardingJourney({
    ...baseInput,
    completedAt: "2026-05-04T10:00:00.000Z",
    completedSteps: baseInput.requiredSteps,
    completionNextStepsRef: "copy.onboarding.next",
    completionSummaryRef: "copy.onboarding.summary",
    completionTimelineEventRef: "activity.onboarding.completed",
    lifecycleState: "COMPLETED",
    stateChangedAt: "2026-05-04T10:00:00.000Z",
  });
  const completedWorkspace = buildClientOnboardingWorkspaceJourney({
    ...baseInput,
    completedAt: "2026-05-04T10:00:00.000Z",
    completedSteps: baseInput.requiredSteps,
    completionNextStepsRef: "copy.onboarding.next",
    completionSummaryRef: "copy.onboarding.summary",
    completionTimelineEventRef: "activity.onboarding.completed",
    lifecycleState: "COMPLETED",
    stateChangedAt: "2026-05-04T10:00:00.000Z",
  });
  expect(completed.current_step_code).toBeNull();
  expect(completed.resume_state).toBe("NONE");
  expect(completedWorkspace.step_workspace_state).toBe("COMPLETION_SUMMARY");
  expect(completedWorkspace.completion_next_steps_ref).toBe("copy.onboarding.next");
  await validateContractSchema("client_onboarding_journey", completed);

  expect(() =>
    buildClientOnboardingJourney({
      ...baseInput,
      expiredAt: "2026-05-04T09:00:00.000Z",
      expiresAt: "2026-05-04T10:00:00.000Z",
      lifecycleState: "EXPIRED",
      stateChangedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toThrow(ClientOnboardingJourneyProjectionError);
  expect(() =>
    buildClientOnboardingJourney({
      ...baseInput,
      abandonedAt: "2026-04-30T09:00:00.000Z",
      abandonmentReasonCode: "CLIENT_REQUESTED_STOP",
      lifecycleState: "ABANDONED",
      stateChangedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toThrow(ClientOnboardingJourneyProjectionError);
});

test("keeps authority-link requirements in the step order without opening another writable step", () => {
  const requiredAuthority = buildClientOnboardingJourney({
    ...baseInput,
    completedSteps: ["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION"],
    lifecycleState: "AUTHORITY_LINK_PENDING",
  });
  expect(requiredAuthority.required_steps).toContain("AUTHORITY_LINK_SETUP");
  expect(requiredAuthority.current_step_code).toBe("AUTHORITY_LINK_SETUP");

  const noAuthority = buildClientOnboardingJourney({
    ...baseInput,
    authorityLinkRequirement: "NOT_REQUIRED",
    authorityLinkState: "NOT_REQUIRED",
    completedSteps: ["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION"],
    lifecycleState: "DOCUMENTS_PENDING",
    requiredSteps: [
      "INVITE_ACCEPTANCE",
      "PROFILE_CONFIRMATION",
      "IDENTITY_VERIFICATION",
      "DOCUMENT_COLLECTION",
      "REVIEW_CONFIRMATION",
    ],
  });
  expect(noAuthority.required_steps).not.toContain("AUTHORITY_LINK_SETUP");
  expect(noAuthority.current_step_code).toBe("DOCUMENT_COLLECTION");
});
