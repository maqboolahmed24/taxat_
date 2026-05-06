import type {
  ClientOnboardingAuthorityLinkRequirement,
  ClientOnboardingAuthorityLinkState,
  ClientOnboardingJourneyRecord,
  ClientOnboardingLifecycleState,
  ClientOnboardingResumeState,
  ClientOnboardingStepCode,
  ClientOnboardingVerificationState,
} from "../types.ts";
import { ClientOnboardingJourneyProjectionError } from "../types.ts";

const activeStates = new Set<ClientOnboardingLifecycleState>([
  "AUTHORITY_LINK_PENDING",
  "DOCUMENTS_PENDING",
  "IDENTITY_PENDING",
  "INVITED",
  "PROFILE_PENDING",
  "READY_FOR_REVIEW",
]);

function epoch(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function includesEvery<T>(superset: ReadonlySet<T>, values: readonly T[]) {
  return values.every((value) => superset.has(value));
}

export function validateOnboardingProgressionAndChronology(input: {
  abandonedAt: string | null;
  abandonmentReasonCode: string | null;
  authorityLinkRequirement: ClientOnboardingAuthorityLinkRequirement;
  authorityLinkState: ClientOnboardingAuthorityLinkState;
  completedAt: string | null;
  completedSteps: readonly ClientOnboardingStepCode[];
  completionSummaryRef: string | null;
  completionTimelineEventRef: string | null;
  currentStepCode: ClientOnboardingStepCode | null;
  documentRequestRefs: readonly string[];
  draftUploadSessionRefs: readonly string[];
  expiredAt: string | null;
  expiresAt: string | null;
  invitedAt: string;
  lifecycleState: ClientOnboardingLifecycleState;
  reconfirmationStepCodes: readonly ClientOnboardingStepCode[];
  requiredSteps: readonly ClientOnboardingStepCode[];
  resumeState: ClientOnboardingResumeState;
  resumeStepCode: ClientOnboardingStepCode | null;
  stateChangedAt: string;
  verificationState: ClientOnboardingVerificationState;
}) {
  const reasonCodes: string[] = [];
  const requiredSet = new Set(input.requiredSteps);
  const completedSet = new Set(input.completedSteps);
  const reconfirmationSet = new Set(input.reconfirmationStepCodes);

  if (input.requiredSteps.length === 0 || hasDuplicates(input.requiredSteps)) {
    reasonCodes.push("CLIENT_ONBOARDING_REQUIRED_STEPS_INVALID");
  }
  if (hasDuplicates(input.completedSteps)) {
    reasonCodes.push("CLIENT_ONBOARDING_COMPLETED_STEPS_DUPLICATED");
  }
  if (hasDuplicates(input.reconfirmationStepCodes)) {
    reasonCodes.push("CLIENT_ONBOARDING_RECONFIRMATION_STEPS_DUPLICATED");
  }
  if (!includesEvery(requiredSet, input.completedSteps)) {
    reasonCodes.push("CLIENT_ONBOARDING_COMPLETED_STEP_OUTSIDE_REQUIRED_STEPS");
  }
  if (!includesEvery(requiredSet, input.reconfirmationStepCodes)) {
    reasonCodes.push("CLIENT_ONBOARDING_RECONFIRMATION_STEP_OUTSIDE_REQUIRED_STEPS");
  }

  if (activeStates.has(input.lifecycleState)) {
    if (input.currentStepCode === null) {
      reasonCodes.push("CLIENT_ONBOARDING_CURRENT_STEP_MISSING");
    } else {
      if (!requiredSet.has(input.currentStepCode)) {
        reasonCodes.push("CLIENT_ONBOARDING_CURRENT_STEP_OUTSIDE_REQUIRED_STEPS");
      }
      if (completedSet.has(input.currentStepCode)) {
        reasonCodes.push("CLIENT_ONBOARDING_CURRENT_STEP_ALREADY_COMPLETED");
      }
    }
  } else if (input.currentStepCode !== null) {
    reasonCodes.push("CLIENT_ONBOARDING_TERMINAL_CURRENT_STEP_NOT_CLEARED");
  }

  if (input.resumeStepCode !== null && !requiredSet.has(input.resumeStepCode)) {
    reasonCodes.push("CLIENT_ONBOARDING_RESUME_STEP_OUTSIDE_REQUIRED_STEPS");
  }
  if (input.resumeState === "LIVE" && input.resumeStepCode !== null && completedSet.has(input.resumeStepCode)) {
    reasonCodes.push("CLIENT_ONBOARDING_LIVE_RESUME_REOPENS_COMPLETED_STEP");
  }
  if (
    input.resumeState === "RECONFIRMATION_REQUIRED" &&
    (input.resumeStepCode === null || !reconfirmationSet.has(input.resumeStepCode))
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_RECONFIRMATION_RESUME_STEP_INVALID");
  }
  if (input.resumeState === "STALE_REVIEW_REQUIRED" && input.resumeStepCode !== null) {
    reasonCodes.push("CLIENT_ONBOARDING_STALE_REVIEW_RESUME_STEP_NOT_CLEARED");
  }
  if (input.resumeState === "NONE") {
    if (
      input.resumeStepCode !== null ||
      input.draftUploadSessionRefs.length > 0 ||
      input.reconfirmationStepCodes.length > 0
    ) {
      reasonCodes.push("CLIENT_ONBOARDING_NONE_RESUME_STATE_NOT_CLEARED");
    }
  }

  if (input.draftUploadSessionRefs.length > 0) {
    if (input.lifecycleState !== "DOCUMENTS_PENDING") {
      reasonCodes.push("CLIENT_ONBOARDING_DRAFT_UPLOAD_OUTSIDE_DOCUMENTS_PENDING");
    }
    if (input.currentStepCode !== "DOCUMENT_COLLECTION") {
      reasonCodes.push("CLIENT_ONBOARDING_DRAFT_UPLOAD_CURRENT_STEP_DRIFT");
    }
    if (input.resumeStepCode !== "DOCUMENT_COLLECTION") {
      reasonCodes.push("CLIENT_ONBOARDING_DRAFT_UPLOAD_RESUME_STEP_DRIFT");
    }
  }

  if (
    input.requiredSteps.includes("DOCUMENT_COLLECTION") &&
    input.documentRequestRefs.length === 0
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_DOCUMENT_STEP_WITHOUT_REQUEST_REFS");
  }
  if (
    !input.requiredSteps.includes("DOCUMENT_COLLECTION") &&
    (input.documentRequestRefs.length > 0 || input.draftUploadSessionRefs.length > 0)
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_DOCUMENT_REFS_WITHOUT_DOCUMENT_STEP");
  }

  if (
    input.authorityLinkRequirement === "REQUIRED" &&
    !input.requiredSteps.includes("AUTHORITY_LINK_SETUP")
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_REQUIRED_AUTHORITY_STEP_MISSING");
  }
  if (
    input.authorityLinkRequirement === "NOT_REQUIRED" &&
    (input.authorityLinkState !== "NOT_REQUIRED" ||
      input.requiredSteps.includes("AUTHORITY_LINK_SETUP"))
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_AUTHORITY_NOT_REQUIRED_DRIFT");
  }
  if (
    ["DOCUMENTS_PENDING", "READY_FOR_REVIEW", "COMPLETED"].includes(input.lifecycleState) &&
    ["OPTIONAL", "REQUIRED"].includes(input.authorityLinkRequirement) &&
    !["LINKED", "WAIVED"].includes(input.authorityLinkState)
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_AUTHORITY_LINK_NOT_SETTLED");
  }

  if (input.lifecycleState === "COMPLETED") {
    if (!includesEvery(completedSet, input.requiredSteps)) {
      reasonCodes.push("CLIENT_ONBOARDING_COMPLETED_WITH_INCOMPLETE_STEPS");
    }
    if (
      input.resumeState !== "NONE" ||
      input.completedAt === null ||
      input.completionSummaryRef === null ||
      input.completionTimelineEventRef === null ||
      !["VERIFIED", "WAIVED"].includes(input.verificationState)
    ) {
      reasonCodes.push("CLIENT_ONBOARDING_COMPLETION_TERMINAL_FIELDS_INVALID");
    }
  } else if (
    input.completedAt !== null ||
    input.completionSummaryRef !== null ||
    input.completionTimelineEventRef !== null
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_COMPLETION_FIELDS_ON_NON_COMPLETED_STATE");
  }

  if (
    input.lifecycleState === "EXPIRED" &&
    (input.resumeState !== "NONE" || input.expiredAt === null || input.expiresAt === null)
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRY_TERMINAL_FIELDS_INVALID");
  } else if (input.lifecycleState !== "EXPIRED" && input.expiredAt !== null) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRED_AT_ON_NON_EXPIRED_STATE");
  }

  if (
    input.lifecycleState === "ABANDONED" &&
    (input.resumeState !== "NONE" ||
      input.abandonedAt === null ||
      input.abandonmentReasonCode === null)
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_ABANDONMENT_TERMINAL_FIELDS_INVALID");
  } else if (
    input.lifecycleState !== "ABANDONED" &&
    (input.abandonedAt !== null || input.abandonmentReasonCode !== null)
  ) {
    reasonCodes.push("CLIENT_ONBOARDING_ABANDONMENT_FIELDS_ON_NON_ABANDONED_STATE");
  }

  const invitedAt = epoch(input.invitedAt);
  const stateChangedAt = epoch(input.stateChangedAt);
  const completedAt = epoch(input.completedAt);
  const expiresAt = epoch(input.expiresAt);
  const expiredAt = epoch(input.expiredAt);
  const abandonedAt = epoch(input.abandonedAt);

  if (invitedAt !== null && stateChangedAt !== null && stateChangedAt < invitedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_STATE_CHANGED_BEFORE_INVITE");
  }
  if (invitedAt !== null && completedAt !== null && completedAt < invitedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_COMPLETED_BEFORE_INVITE");
  }
  if (stateChangedAt !== null && completedAt !== null && completedAt < stateChangedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_COMPLETED_BEFORE_STATE_CHANGE");
  }
  if (invitedAt !== null && expiresAt !== null && expiresAt < invitedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRES_BEFORE_INVITE");
  }
  if (invitedAt !== null && expiredAt !== null && expiredAt < invitedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRED_BEFORE_INVITE");
  }
  if (stateChangedAt !== null && expiredAt !== null && expiredAt < stateChangedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRED_BEFORE_STATE_CHANGE");
  }
  if (expiresAt !== null && expiredAt !== null && expiredAt < expiresAt) {
    reasonCodes.push("CLIENT_ONBOARDING_EXPIRED_BEFORE_EXPIRY_BOUNDARY");
  }
  if (invitedAt !== null && abandonedAt !== null && abandonedAt < invitedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_ABANDONED_BEFORE_INVITE");
  }
  if (stateChangedAt !== null && abandonedAt !== null && abandonedAt < stateChangedAt) {
    reasonCodes.push("CLIENT_ONBOARDING_ABANDONED_BEFORE_STATE_CHANGE");
  }

  if (reasonCodes.length > 0) {
    throw new ClientOnboardingJourneyProjectionError(
      "onboarding journey progression or chronology is invalid",
      reasonCodes,
    );
  }
}

export function validateOnboardingJourneyRecord(record: ClientOnboardingJourneyRecord) {
  validateOnboardingProgressionAndChronology({
    abandonedAt: record.abandoned_at,
    abandonmentReasonCode: record.abandonment_reason_code,
    authorityLinkRequirement: record.authority_link_requirement,
    authorityLinkState: record.authority_link_state,
    completedAt: record.completed_at,
    completedSteps: record.completed_steps,
    completionSummaryRef: record.completion_summary_ref,
    completionTimelineEventRef: record.completion_timeline_event_ref,
    currentStepCode: record.current_step_code,
    documentRequestRefs: record.document_request_refs,
    draftUploadSessionRefs: record.draft_upload_session_refs,
    expiredAt: record.expired_at,
    expiresAt: record.expires_at,
    invitedAt: record.invited_at,
    lifecycleState: record.lifecycle_state,
    reconfirmationStepCodes: record.reconfirmation_step_codes,
    requiredSteps: record.required_steps,
    resumeState: record.resume_state,
    resumeStepCode: record.resume_step_code,
    stateChangedAt: record.state_changed_at,
    verificationState: record.verification_state,
  });
}
