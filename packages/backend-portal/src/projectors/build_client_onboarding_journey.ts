import {
  assertPortalLanguageContract,
  buildPortalLanguageContract,
} from "../contracts/portal_language_contract.ts";
import { buildOnboardingCompletionSummary } from "../services/build_onboarding_completion_summary.ts";
import { deriveOnboardingResumeState } from "../services/derive_onboarding_resume_state.ts";
import { deriveOnboardingStepWorkspaceState } from "../services/derive_onboarding_step_workspace_state.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import { validateOnboardingJourneyRecord } from "../services/validate_onboarding_progression_and_chronology.ts";
import type {
  ClientOnboardingAuthorityLinkRequirement,
  ClientOnboardingAuthorityLinkState,
  ClientOnboardingJourneyRecord,
  ClientOnboardingLifecycleState,
  ClientOnboardingStepCode,
  ClientOnboardingVerificationState,
  ClientOnboardingWorkspaceJourneyRecord,
} from "../types.ts";

export const onboardingStepOrder = [
  "INVITE_ACCEPTANCE",
  "PROFILE_CONFIRMATION",
  "IDENTITY_VERIFICATION",
  "AUTHORITY_LINK_SETUP",
  "DOCUMENT_COLLECTION",
  "REVIEW_CONFIRMATION",
] as const satisfies readonly ClientOnboardingStepCode[];

export const activeOnboardingLifecycleStates = [
  "INVITED",
  "PROFILE_PENDING",
  "IDENTITY_PENDING",
  "AUTHORITY_LINK_PENDING",
  "DOCUMENTS_PENDING",
  "READY_FOR_REVIEW",
] as const satisfies readonly ClientOnboardingLifecycleState[];

export type BuildClientOnboardingJourneyInput = {
  abandonedAt?: string | null | undefined;
  abandonmentReasonCode?: string | null | undefined;
  accessBindingHash: string;
  authorityLinkRequirement?: ClientOnboardingAuthorityLinkRequirement | undefined;
  authorityLinkState?: ClientOnboardingAuthorityLinkState | undefined;
  clientId: string;
  completedAt?: string | null | undefined;
  completedSteps?: readonly ClientOnboardingStepCode[] | undefined;
  completionNextStepsRef?: string | null | undefined;
  completionSummaryRef?: string | null | undefined;
  completionTimelineEventRef?: string | null | undefined;
  currentStepCode?: ClientOnboardingStepCode | null | undefined;
  documentRequestRefs?: readonly string[] | undefined;
  draftUploadSessionRefs?: readonly string[] | undefined;
  expiredAt?: string | null | undefined;
  expiresAt?: string | null | undefined;
  helpChannelRef?: string | null | undefined;
  invitedAt: string;
  journeyId: string;
  languageContract: Record<string, unknown>;
  lifecycleState: ClientOnboardingLifecycleState;
  maskingPostureFingerprint: string;
  reconfirmationStepCodes?: readonly ClientOnboardingStepCode[] | undefined;
  requiredSteps?: readonly ClientOnboardingStepCode[] | undefined;
  staleReviewRequired?: boolean | undefined;
  stateChangedAt: string;
  tenantId: string;
  verificationState?: ClientOnboardingVerificationState | undefined;
  visibilityCachePartitionKey: string;
};

export type ClientOnboardingWorkspaceProjection = {
  journey: ClientOnboardingJourneyRecord;
  workspaceJourney: ClientOnboardingWorkspaceJourneyRecord;
};

const stepLabels = {
  AUTHORITY_LINK_SETUP: "Connect authority access",
  DOCUMENT_COLLECTION: "Upload requested documents",
  IDENTITY_VERIFICATION: "Confirm your identity",
  INVITE_ACCEPTANCE: "Accept invite",
  PROFILE_CONFIRMATION: "Confirm your details",
  REVIEW_CONFIRMATION: "Review and confirm",
} as const satisfies Record<ClientOnboardingStepCode, string>;

const lifecycleStep = {
  ABANDONED: null,
  AUTHORITY_LINK_PENDING: "AUTHORITY_LINK_SETUP",
  COMPLETED: null,
  DOCUMENTS_PENDING: "DOCUMENT_COLLECTION",
  EXPIRED: null,
  IDENTITY_PENDING: "IDENTITY_VERIFICATION",
  INVITED: "INVITE_ACCEPTANCE",
  PROFILE_PENDING: "PROFILE_CONFIRMATION",
  READY_FOR_REVIEW: "REVIEW_CONFIRMATION",
} as const satisfies Record<ClientOnboardingLifecycleState, ClientOnboardingStepCode | null>;

function orderedUnique<T extends string>(order: readonly T[], values: readonly T[]) {
  const valueSet = new Set(values);
  return order.filter((value) => valueSet.has(value));
}

function isActiveOnboardingLifecycleState(
  lifecycleState: ClientOnboardingLifecycleState,
): boolean {
  return activeOnboardingLifecycleStates.includes(
    lifecycleState as (typeof activeOnboardingLifecycleStates)[number],
  );
}

export { isActiveOnboardingLifecycleState };

function defaultAuthorityLinkRequirement(input: {
  completedSteps?: readonly ClientOnboardingStepCode[] | undefined;
  lifecycleState: ClientOnboardingLifecycleState;
  reconfirmationStepCodes?: readonly ClientOnboardingStepCode[] | undefined;
  requiredSteps?: readonly ClientOnboardingStepCode[] | undefined;
}) {
  const hasAuthorityStep =
    input.lifecycleState === "AUTHORITY_LINK_PENDING" ||
    input.requiredSteps?.includes("AUTHORITY_LINK_SETUP") === true ||
    input.completedSteps?.includes("AUTHORITY_LINK_SETUP") === true ||
    input.reconfirmationStepCodes?.includes("AUTHORITY_LINK_SETUP") === true;
  return hasAuthorityStep ? "REQUIRED" : "NOT_REQUIRED";
}

function defaultRequiredSteps(input: {
  authorityLinkRequirement: ClientOnboardingAuthorityLinkRequirement;
  completedSteps?: readonly ClientOnboardingStepCode[] | undefined;
  documentRequestRefs?: readonly string[] | undefined;
  lifecycleState: ClientOnboardingLifecycleState;
  reconfirmationStepCodes?: readonly ClientOnboardingStepCode[] | undefined;
}) {
  const includeAuthority =
    input.authorityLinkRequirement === "REQUIRED" ||
    input.lifecycleState === "AUTHORITY_LINK_PENDING" ||
    input.completedSteps?.includes("AUTHORITY_LINK_SETUP") === true ||
    input.reconfirmationStepCodes?.includes("AUTHORITY_LINK_SETUP") === true;
  const includeDocuments =
    ["DOCUMENTS_PENDING", "READY_FOR_REVIEW", "COMPLETED"].includes(input.lifecycleState) ||
    (input.documentRequestRefs?.length ?? 0) > 0 ||
    input.completedSteps?.includes("DOCUMENT_COLLECTION") === true ||
    input.reconfirmationStepCodes?.includes("DOCUMENT_COLLECTION") === true;
  return onboardingStepOrder.filter((step) => {
    if (step === "AUTHORITY_LINK_SETUP") {
      return includeAuthority;
    }
    if (step === "DOCUMENT_COLLECTION") {
      return includeDocuments;
    }
    return true;
  });
}

function defaultCompletedSteps(input: {
  currentStepCode: ClientOnboardingStepCode | null;
  lifecycleState: ClientOnboardingLifecycleState;
  requiredSteps: readonly ClientOnboardingStepCode[];
}) {
  if (input.lifecycleState === "COMPLETED") {
    return [...input.requiredSteps];
  }
  if (input.currentStepCode === null) {
    return [];
  }
  const currentIndex = input.requiredSteps.indexOf(input.currentStepCode);
  return currentIndex <= 0 ? [] : input.requiredSteps.slice(0, currentIndex);
}

function defaultVerificationState(
  lifecycleState: ClientOnboardingLifecycleState,
): ClientOnboardingVerificationState {
  if (lifecycleState === "INVITED" || lifecycleState === "PROFILE_PENDING") {
    return "NOT_STARTED";
  }
  if (lifecycleState === "IDENTITY_PENDING") {
    return "PENDING";
  }
  return "VERIFIED";
}

function defaultAuthorityLinkState(input: {
  authorityLinkRequirement: ClientOnboardingAuthorityLinkRequirement;
  lifecycleState: ClientOnboardingLifecycleState;
}) {
  if (input.authorityLinkRequirement === "NOT_REQUIRED") {
    return "NOT_REQUIRED";
  }
  if (input.lifecycleState === "AUTHORITY_LINK_PENDING") {
    return "PENDING";
  }
  if (["DOCUMENTS_PENDING", "READY_FOR_REVIEW", "COMPLETED"].includes(input.lifecycleState)) {
    return "LINKED";
  }
  return "UNRESOLVED";
}

function customerSafeProjection(input: {
  accessBindingHash: string;
  maskingPostureFingerprint: string;
  visibilityCachePartitionKey: string;
}) {
  return {
    access_binding_hash: input.accessBindingHash,
    artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT",
    attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    blocked_staff_signal_classes: [
      "ASSIGNMENT_STATE",
      "ESCALATION_LOGIC",
      "RAW_GATE_STATE",
      "STAFF_REASON_CODES",
      "AUDIT_LINEAGE",
      "INTERNAL_ACTIVITY",
      "INTERNAL_ATTACHMENTS",
      "INTERNAL_PARTICIPANTS",
      "INTERNAL_COUNTS",
      "STAFF_ROUTE_CONTEXT",
    ],
    boundary_scope: "CLIENT_ONBOARDING_JOURNEY",
    contract_version: "CUSTOMER_SAFE_PROJECTION_V1",
    draft_placeholder_policy: "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    export_visibility_policy: "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    hidden_activity_policy: "NO_HIDDEN_ACTIVITY_DERIVATION",
    limitation_notice_policy: "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    live_update_visibility_policy: "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    masking_posture_fingerprint: input.maskingPostureFingerprint,
    module_projection_policy: "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    plain_language_action_policy: "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    plain_language_status_policy: "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    projection_audience: "CLIENT_PORTAL",
    recovery_explanation_policy: "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    shell_family: "CLIENT_PORTAL_SHELL",
    staff_field_dependency_policy: "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    status_derivation_policy: "CUSTOMER_SAFE_BLOCKS_ONLY",
    visibility_cache_partition_key: input.visibilityCachePartitionKey,
  };
}

function actionToken(input: {
  actionCode: string;
  contextObjectRef: string;
  focusAnchorRef: string;
  label: string;
  route: "HELP" | "HOME" | "ONBOARDING";
}) {
  return {
    action_code: input.actionCode,
    context_object_ref: input.contextObjectRef,
    focus_anchor_ref: input.focusAnchorRef,
    label: input.label,
    route: input.route,
  };
}

export function buildClientOnboardingJourney(
  input: BuildClientOnboardingJourneyInput,
): ClientOnboardingJourneyRecord {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  const authorityLinkRequirement =
    input.authorityLinkRequirement ??
    defaultAuthorityLinkRequirement({
      completedSteps: input.completedSteps,
      lifecycleState: input.lifecycleState,
      reconfirmationStepCodes: input.reconfirmationStepCodes,
      requiredSteps: input.requiredSteps,
    });
  const requiredSteps = orderedUnique(
    onboardingStepOrder,
    input.requiredSteps ??
      defaultRequiredSteps({
        authorityLinkRequirement,
        completedSteps: input.completedSteps,
        documentRequestRefs: input.documentRequestRefs,
        lifecycleState: input.lifecycleState,
        reconfirmationStepCodes: input.reconfirmationStepCodes,
      }),
  );
  const currentStepCode =
    isActiveOnboardingLifecycleState(input.lifecycleState)
      ? (input.currentStepCode ?? lifecycleStep[input.lifecycleState])
      : null;
  const completedSteps = orderedUnique(
    onboardingStepOrder,
    input.completedSteps ??
      defaultCompletedSteps({
        currentStepCode,
        lifecycleState: input.lifecycleState,
        requiredSteps,
      }),
  );
  const draftUploadSessionRefs = [...(input.draftUploadSessionRefs ?? [])];
  const resume = deriveOnboardingResumeState({
    completedSteps,
    currentStepCode,
    draftUploadSessionRefs,
    lifecycleState: input.lifecycleState,
    reconfirmationStepCodes: input.reconfirmationStepCodes,
    requiredSteps,
    staleReviewRequired: input.staleReviewRequired,
  });
  const completion = buildOnboardingCompletionSummary({
    abandonmentReasonCode: input.abandonmentReasonCode,
    completionNextStepsRef: input.completionNextStepsRef,
    completionSummaryRef: input.completionSummaryRef,
    completionTimelineEventRef: input.completionTimelineEventRef,
    journeyId: input.journeyId,
    lifecycleState: input.lifecycleState,
  });
  const documentRequestRefs = requiredSteps.includes("DOCUMENT_COLLECTION")
    ? [...(input.documentRequestRefs ?? ["request.onboarding.documents"])]
    : [];
  const completedAt =
    input.lifecycleState === "COMPLETED" ? (input.completedAt ?? input.stateChangedAt) : null;
  const expiresAt =
    input.lifecycleState === "EXPIRED"
      ? (input.expiresAt ?? input.stateChangedAt)
      : (input.expiresAt ?? null);
  const expiredAt =
    input.lifecycleState === "EXPIRED" ? (input.expiredAt ?? input.stateChangedAt) : null;
  const abandonedAt =
    input.lifecycleState === "ABANDONED" ? (input.abandonedAt ?? input.stateChangedAt) : null;
  const record = {
    abandoned_at: abandonedAt,
    abandonment_reason_code:
      input.lifecycleState === "ABANDONED"
        ? (input.abandonmentReasonCode ?? "CLIENT_REQUESTED_STOP")
        : null,
    artifact_type: "ClientOnboardingJourney",
    authority_link_requirement: authorityLinkRequirement,
    authority_link_state:
      input.authorityLinkState ??
      defaultAuthorityLinkState({
        authorityLinkRequirement,
        lifecycleState: input.lifecycleState,
      }),
    client_id: input.clientId,
    completed_at: completedAt,
    completed_steps: completedSteps,
    completion_summary_ref: completion.completion_summary_ref,
    completion_timeline_event_ref: completion.completion_timeline_event_ref,
    current_step_code: currentStepCode,
    customer_safe_projection: customerSafeProjection({
      accessBindingHash: input.accessBindingHash,
      maskingPostureFingerprint: input.maskingPostureFingerprint,
      visibilityCachePartitionKey: input.visibilityCachePartitionKey,
    }),
    document_request_refs: documentRequestRefs,
    draft_upload_session_refs: draftUploadSessionRefs,
    expired_at: expiredAt,
    expires_at: expiresAt,
    help_channel_ref: input.helpChannelRef ?? "help.portal.onboarding",
    invited_at: input.invitedAt,
    journey_id: input.journeyId,
    language_contract: buildPortalLanguageContract(),
    lifecycle_state: input.lifecycleState,
    reconfirmation_step_codes: resume.reconfirmationStepCodes,
    required_steps: requiredSteps,
    resume_state: resume.resumeState,
    resume_step_code: resume.resumeStepCode,
    state_changed_at: input.stateChangedAt,
    tenant_id: input.tenantId,
    verification_state: input.verificationState ?? defaultVerificationState(input.lifecycleState),
  } satisfies ClientOnboardingJourneyRecord;
  validateOnboardingJourneyRecord(record);
  return record;
}

export function projectClientOnboardingJourneyToWorkspace(
  journey: ClientOnboardingJourneyRecord,
  input: {
    completionNextStepsRef?: string | null | undefined;
  } = {},
): ClientOnboardingWorkspaceJourneyRecord {
  const workspace = deriveOnboardingStepWorkspaceState({
    currentStepCode: journey.current_step_code,
    lifecycleState: journey.lifecycle_state,
    resumeState: journey.resume_state,
  });
  const completion = buildOnboardingCompletionSummary({
    abandonmentReasonCode: journey.abandonment_reason_code,
    completionNextStepsRef: input.completionNextStepsRef,
    completionSummaryRef: journey.completion_summary_ref,
    completionTimelineEventRef: journey.completion_timeline_event_ref,
    journeyId: journey.journey_id,
    lifecycleState: journey.lifecycle_state,
  });
  const focusStep = journey.current_step_code ?? journey.resume_step_code ?? "summary";
  const currentStepLabel =
    journey.current_step_code === null ? null : stepLabels[journey.current_step_code];
  assertPortalCopy({
    budgetKey: "onboarding_step_label_max_chars",
    fieldName: "`onboarding_journey.current_step_label`",
    value: currentStepLabel,
  });
  assertPortalCopy({
    budgetKey: "action_label_max_chars",
    fieldName: "`onboarding_journey.next_action.label`",
    value: workspace.actionLabel,
  });
  return {
    abandoned_at: journey.abandoned_at,
    abandonment_reason_code: journey.abandonment_reason_code,
    completed_at: journey.completed_at,
    completed_step_count: journey.completed_steps.length,
    completion_next_steps_ref: completion.completion_next_steps_ref,
    completion_summary_ref: journey.completion_summary_ref,
    current_step_code: journey.current_step_code,
    current_step_label: currentStepLabel,
    expired_at: journey.expired_at,
    journey_id: journey.journey_id,
    next_action: actionToken({
      actionCode: workspace.actionCode,
      contextObjectRef: journey.journey_id,
      focusAnchorRef:
        workspace.actionRoute === "HELP"
          ? "portal.onboarding.support"
          : `onboarding.${String(focusStep).toLowerCase()}`,
      label: workspace.actionLabel,
      route: workspace.actionRoute,
    }),
    reconfirmation_step_codes: journey.reconfirmation_step_codes,
    resume_state: journey.resume_state,
    resume_step_code:
      journey.resume_state === "STALE_REVIEW_REQUIRED"
        ? journey.current_step_code
        : journey.resume_step_code,
    save_and_return_action:
      workspace.saveReturnState === "AVAILABLE"
        ? actionToken({
            actionCode: "SAVE_AND_RETURN",
            contextObjectRef: journey.journey_id,
            focusAnchorRef: `onboarding.${String(focusStep).toLowerCase()}`,
            label: "Save",
            route: "ONBOARDING",
          })
        : null,
    save_return_state: workspace.saveReturnState,
    state: journey.lifecycle_state,
    step_workspace_state: workspace.stepWorkspaceState,
    surface_order: ["WELCOME_PANEL", "ONBOARDING_STEPPER", "STEP_WORKSPACE", "SUPPORT_PANEL"],
    total_step_count: journey.required_steps.length,
  } satisfies ClientOnboardingWorkspaceJourneyRecord;
}

export function buildClientOnboardingWorkspaceJourney(
  input: BuildClientOnboardingJourneyInput,
): ClientOnboardingWorkspaceJourneyRecord {
  return projectClientOnboardingJourneyToWorkspace(buildClientOnboardingJourney(input), {
    completionNextStepsRef: input.completionNextStepsRef,
  });
}

export function buildClientOnboardingWorkspaceProjection(
  input: BuildClientOnboardingJourneyInput,
): ClientOnboardingWorkspaceProjection {
  const journey = buildClientOnboardingJourney(input);
  return {
    journey,
    workspaceJourney: projectClientOnboardingJourneyToWorkspace(journey, {
      completionNextStepsRef: input.completionNextStepsRef,
    }),
  };
}
