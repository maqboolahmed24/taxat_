import { projectPortalInteractionLayer } from "../../../backend-low-noise/src/services/project_portal_interaction_layer.ts";
import { projectSemanticAccessibilityContract } from "../../../backend-low-noise/src/services/project_semantic_accessibility_contract.ts";
import { projectShellDominanceContract } from "../../../backend-low-noise/src/services/project_shell_dominance_contract.ts";
import { projectShellStateTaxonomyContract } from "../../../backend-low-noise/src/services/project_shell_state_taxonomy_contract.ts";
import { buildClientPortalRouteContinuityContract as buildSharedClientPortalRouteContinuityContract } from "../../../backend-recovery/src/services/build_cross_device_continuity_contract.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { buildPortalLanguageContract } from "../contracts/portal_language_contract.ts";
import type {
  BuildClientTimelineEventInput,
} from "./build_client_timeline_event.ts";
import { buildClientApprovalCenter } from "./build_client_approval_pack.ts";
import {
  buildClientOnboardingWorkspaceProjection,
  isActiveOnboardingLifecycleState,
  onboardingStepOrder,
  type BuildClientOnboardingJourneyInput,
} from "./build_client_onboarding_journey.ts";
import { buildDocumentCenter } from "./build_document_center.ts";
import { applyContextualRouteFallbackRules } from "../services/apply_contextual_route_fallback_rules.ts";
import { buildHelpCaseContextRefs } from "../services/build_help_case_context_refs.ts";
import { compressClientActivityTimeline } from "../services/compress_client_activity_timeline.ts";
import { deriveClientPortalCacheIsolationContract } from "../services/derive_client_portal_cache_isolation_contract.ts";
import { deriveClientPortalNavigationTabs } from "../services/derive_client_portal_navigation_tabs.ts";
import { deriveClientPortalReliabilitySummary } from "../services/derive_client_portal_reliability_summary.ts";
import { deriveClientPortalRouteContext } from "../services/derive_client_portal_route_context.ts";
import { deriveClientPortalViewGuardAndStability } from "../services/derive_client_portal_view_guard_and_stability.ts";
import { deriveClientPortalWorkspacePosture } from "../services/derive_client_portal_workspace_posture.ts";
import { deriveClearDueLabel } from "../services/derive_clear_due_label.ts";
import { assertClientPortalWorkspaceFirstViewBudget } from "../services/measure_portal_first_view_budget.ts";
import { assertClientPortalWorkspaceCopyGuards } from "../services/validate_portal_copy.ts";
import {
  cloneClientPortalWorkspace,
  type ClientOnboardingStepCode,
  type ClientOnboardingWorkspaceJourneyRecord,
  type ClientPortalFreshnessState,
  type ClientPortalRouteCode,
  type ClientPortalRouteContext,
  type ClientPortalRouteQueryInput,
  type ClientPortalWorkspaceRecord,
  type ClientTimelineEventRecord,
  type PortalHelpRequestSourceRoute,
} from "../types.ts";

export type BuildClientPortalWorkspaceInput = {
  accessBindingHash?: string | undefined;
  activityEvents?: readonly BuildClientTimelineEventInput[] | undefined;
  clientDisplayName?: string | undefined;
  clientId?: string | undefined;
  delegatedSession?: boolean | undefined;
  freshnessState?: ClientPortalFreshnessState | undefined;
  includeOnboarding?: boolean | undefined;
  onboardingJourney?: BuildClientOnboardingJourneyInput | null | undefined;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint?: string | undefined;
  periodLabel?: string | null | undefined;
  principalClass?: string | undefined;
  publicationGeneration?: number | undefined;
  query?: ClientPortalRouteQueryInput | undefined;
  route?: ClientPortalRouteCode | undefined;
  sessionBindingHash?: string | undefined;
  surfaceClass?: "DESKTOP" | "MOBILE" | "TABLET" | undefined;
  tenantId?: string | undefined;
  timelineEvents?: readonly ClientTimelineEventRecord[] | undefined;
  updatedAt?: string | undefined;
  viewGuardRef?: string | undefined;
  viewerRole?: "CLIENT_CONTRIBUTOR" | "CLIENT_SIGNATORY" | "CLIENT_VIEWER" | undefined;
  visibilityCachePartitionKey?: string | undefined;
  workspaceId?: string | undefined;
  workspaceVersion?: number | undefined;
};

const defaultTenantId = "tenant.taxat-sandbox";
const defaultClientId = "client.taxpayer-2001";
const defaultWorkspaceId = "portal.workspace.client-2001";
const defaultAccessBindingHash = "access.portal.client-2001";
const defaultMaskingFingerprint = "mask.portal.full";
const defaultVisibilityCachePartitionKey = "visibility.portal.client-2001";

const dominantQuestionByRoute = {
  APPROVALS: "Do I need to approve anything now?",
  DOCUMENTS: "What documents do you need from me next?",
  HELP: "How can we help with this filing?",
  HOME: "What does the firm need from me next?",
  ONBOARDING: "What should I finish to complete onboarding?",
} as const satisfies Record<ClientPortalRouteCode, string>;

function visibilityPartition(input: {
  accessBindingHash: string;
  maskingPostureFingerprint: string;
  visibilityCachePartitionKey: string;
}) {
  return {
    access_binding_hash: input.accessBindingHash,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    audience_class: "CLIENT_PORTAL",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    cache_partition_key: input.visibilityCachePartitionKey,
    export_scope_policy: "MOUNTED_ROUTE_VISIBILITY_ONLY",
    fallback_discovery_policy: "NO_CROSS_PARTITION_DISCOVERY",
    limited_state_presentation: "EXPLICIT_LIMITATION_NOTICE",
    masking_posture_fingerprint: input.maskingPostureFingerprint,
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "CLIENT_PORTAL_WORKSPACE",
  };
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
    boundary_scope: "CLIENT_PORTAL_WORKSPACE",
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

function approvalCenter(input: {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  manifestId: string | null;
  maskingPostureFingerprint: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
}) {
  return buildClientApprovalCenter(input);
}

function defaultOnboardingInput(input: {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  maskingPostureFingerprint: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
}): BuildClientOnboardingJourneyInput {
  return {
    accessBindingHash: input.accessBindingHash,
    authorityLinkRequirement: "REQUIRED",
    authorityLinkState: "LINKED",
    clientId: input.clientId,
    completedSteps: [
      "INVITE_ACCEPTANCE",
      "PROFILE_CONFIRMATION",
      "IDENTITY_VERIFICATION",
      "AUTHORITY_LINK_SETUP",
      "DOCUMENT_COLLECTION",
    ],
    documentRequestRefs: ["request.identity"],
    invitedAt: "2026-05-01T09:00:00.000Z",
    journeyId: "onboarding.journey.2026",
    languageContract: input.languageContract,
    lifecycleState: "READY_FOR_REVIEW",
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    requiredSteps: [...onboardingStepOrder],
    stateChangedAt: "2026-05-03T09:00:00.000Z",
    tenantId: input.tenantId,
    verificationState: "VERIFIED",
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  };
}

function onboardingInputFromWorkspaceJourney(input: {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  maskingPostureFingerprint: string;
  sourceDraftResume: Record<string, unknown>;
  source: ClientOnboardingWorkspaceJourneyRecord;
  tenantId: string;
  updatedAt: string;
  visibilityCachePartitionKey: string;
}): BuildClientOnboardingJourneyInput {
  const totalStepCount = Math.min(
    Math.max(input.source.total_step_count, 1),
    onboardingStepOrder.length,
  );
  const requiredSteps = onboardingStepOrder.slice(0, totalStepCount);
  const completedSteps =
    input.source.state === "COMPLETED"
      ? requiredSteps
      : requiredSteps.slice(0, Math.min(input.source.completed_step_count, totalStepCount));
  return {
    abandonedAt: input.source.abandoned_at,
    abandonmentReasonCode: input.source.abandonment_reason_code,
    accessBindingHash: input.accessBindingHash,
    authorityLinkRequirement: requiredSteps.includes("AUTHORITY_LINK_SETUP")
      ? "REQUIRED"
      : "NOT_REQUIRED",
    authorityLinkState: requiredSteps.includes("AUTHORITY_LINK_SETUP")
      ? input.source.state === "AUTHORITY_LINK_PENDING"
        ? "PENDING"
        : "LINKED"
      : "NOT_REQUIRED",
    clientId: input.clientId,
    completedAt: input.source.completed_at,
    completedSteps,
    completionNextStepsRef: input.source.completion_next_steps_ref,
    completionSummaryRef: input.source.completion_summary_ref,
    currentStepCode: input.source.current_step_code,
    documentRequestRefs: requiredSteps.includes("DOCUMENT_COLLECTION") ? ["request.identity"] : [],
    draftUploadSessionRefs:
      input.sourceDraftResume.draft_kind === "ONBOARDING" &&
      input.sourceDraftResume.draft_state === "ACTIVE" &&
      input.source.state === "DOCUMENTS_PENDING"
        ? [`${input.source.journey_id}.draft-upload-session`]
        : [],
    expiredAt: input.source.expired_at,
    expiresAt: input.source.expired_at,
    invitedAt: "2026-05-01T09:00:00.000Z",
    journeyId: input.source.journey_id,
    languageContract: input.languageContract,
    lifecycleState: input.source.state,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    reconfirmationStepCodes: input.source.reconfirmation_step_codes,
    requiredSteps,
    stateChangedAt:
      input.source.completed_at ??
      input.source.expired_at ??
      input.source.abandoned_at ??
      input.updatedAt,
    tenantId: input.tenantId,
    verificationState:
      input.source.state === "IDENTITY_PENDING"
        ? "PENDING"
        : input.source.state === "INVITED" || input.source.state === "PROFILE_PENDING"
          ? "NOT_STARTED"
          : "VERIFIED",
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  };
}

function onboardingProjection(input: {
  accessBindingHash: string;
  clientId: string;
  includeOnboarding?: boolean | undefined;
  languageContract: Record<string, unknown>;
  maskingPostureFingerprint: string;
  onboardingJourney?: BuildClientOnboardingJourneyInput | null | undefined;
  tenantId: string;
  visibilityCachePartitionKey: string;
}) {
  if (input.onboardingJourney === null || input.includeOnboarding === false) {
    return null;
  }
  return buildClientOnboardingWorkspaceProjection(
    input.onboardingJourney ??
      defaultOnboardingInput({
        accessBindingHash: input.accessBindingHash,
        clientId: input.clientId,
        languageContract: input.languageContract,
        maskingPostureFingerprint: input.maskingPostureFingerprint,
        tenantId: input.tenantId,
        visibilityCachePartitionKey: input.visibilityCachePartitionKey,
      }),
  );
}

function supportPanel(input: {
  clientId: string;
  manifestId: string | null;
  objectAnchorRef: string;
  requestInfoRef: string | null;
  route: ClientPortalRouteCode;
  routeContext: ClientPortalRouteContext;
  tenantId: string;
  workspaceId: string;
}) {
  const actionFocusAnchorRef =
    input.routeContext.focus_anchor_ref ?? `portal.${input.route.toLowerCase()}.help`;
  const contactOption = {
    action: {
      action_code: "REQUEST_HELP",
      context_object_ref: input.routeContext.context_object_ref,
      focus_anchor_ref: actionFocusAnchorRef,
      label: "Ask for help",
      route: "HELP",
    },
    availability_label: "Usually replies within one business day",
    channel_code: "SECURE_MESSAGE",
    label: "Send a message",
  };

  if (input.route !== "HELP") {
    return {
      case_context_panel: null,
      contact_options: [contactOption],
      faq_refs: [],
      help_headline: "Need help with this filing?",
      secure_message_allowed: true,
      surface_order: null,
    };
  }

  const focusAnchorRef = input.routeContext.focus_anchor_ref ?? "portal.help.case-context";
  const sourceRoute: PortalHelpRequestSourceRoute =
    input.routeContext.context_route === "REQUEST_DETAIL" ? "REQUEST_DETAIL" : "HELP";
  const linkedObjectRef =
    input.routeContext.context_object_ref ?? input.objectAnchorRef ?? input.workspaceId;
  const carriedContextRefs = buildHelpCaseContextRefs({
    clientId: input.clientId,
    itemId: sourceRoute === "REQUEST_DETAIL" ? input.routeContext.context_object_ref : null,
    linkedObjectRef,
    manifestId: input.manifestId,
    requestInfoRef: input.requestInfoRef,
    sourceFocusAnchorRef: focusAnchorRef,
    sourceRoute,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });
  return {
    case_context_panel: {
      carried_context_refs: carriedContextRefs,
      context_summary_ref: "copy.help.case-context",
      focus_anchor_ref: focusAnchorRef,
      linked_object_ref: linkedObjectRef,
      linked_request_info_ref: input.requestInfoRef,
      recommended_channel_code: "SECURE_MESSAGE",
      restate_required: false,
    },
    contact_options: [contactOption],
    faq_refs: ["faq.portal.documents", "faq.portal.approvals"],
    help_headline: "Help for this filing",
    secure_message_allowed: true,
    surface_order: ["HELP_OPTIONS", "TOP_QUESTIONS", "CASE_CONTEXT_PANEL"],
  };
}

function taskGroups() {
  return [
    {
      group_code: "DO_NOW",
      label: "Do now",
      tasks: [
        {
          description: "Attach the recent statement so we can continue.",
          due_at: "2026-05-12T12:00:00.000Z",
          effort_label: "About 2 minutes",
          label: "Upload bank statement",
          primary_action: {
            action_code: "UPLOAD_DOCUMENT",
            context_object_ref: "request.bank-statement",
            focus_anchor_ref: "request.bank-statement.upload",
            label: "Upload now",
            route: "DOCUMENTS",
          },
          route: "DOCUMENTS",
          status: "OPEN",
          task_id: "task.upload.bank-statement",
          task_type: "UPLOAD_DOCUMENT",
        },
      ],
    },
    {
      group_code: "COMING_UP",
      label: "Coming up",
      tasks: [
        {
          description: "Your declaration is ready after document review.",
          effort_label: "About 3 minutes",
          label: "Review declaration",
          primary_action: {
            action_code: "REVIEW_APPROVAL",
            context_object_ref: "approval.pack.2026",
            focus_anchor_ref: "approval.pack.2026",
            label: "Review",
            route: "APPROVALS",
          },
          route: "APPROVALS",
          status: "WAITING",
          task_id: "task.review.approval",
          task_type: "SIGN_DECLARATION",
        },
      ],
    },
  ];
}

function statusHero(input: {
  freshnessState: ClientPortalFreshnessState;
  onboarding: ClientOnboardingWorkspaceJourneyRecord | null;
  route: ClientPortalRouteCode;
}) {
  if (input.freshnessState === "STALE_REVIEW_REQUIRED") {
    return {
      due_label: null,
      headline: "Review the latest view",
      primary_action: {
        action_code: "REFRESH_PORTAL_VIEW",
        focus_anchor_ref: "portal-inline-recovery",
        label: "Refresh",
        route: input.route,
      },
      progress_steps: [{ label: "Review latest view", state: "CURRENT", step_code: "RECOVERY" }],
      secondary_action: null,
      status_code: "ACTION_REQUIRED",
      supporting_text: "Refresh before sending changes.",
    };
  }
  if (input.freshnessState === "DEGRADED") {
    return {
      due_label: null,
      headline: "Portal data is temporarily limited",
      primary_action: {
        action_code: "REQUEST_HELP",
        focus_anchor_ref: "portal-support-entry",
        label: "Ask for help",
        route: "HELP",
      },
      progress_steps: [{ label: "Connection limited", state: "CURRENT", step_code: "RECOVERY" }],
      secondary_action: null,
      status_code: "WAITING_ON_US",
      supporting_text: "You can read the current view while the live data path is restored.",
    };
  }
  if (input.route === "ONBOARDING") {
    const onboarding = input.onboarding;
    return {
      due_label: null,
      headline: onboarding?.current_step_label ?? "Finish onboarding",
      primary_action: onboarding?.next_action ?? {
        action_code: "CONTINUE_ONBOARDING",
        context_object_ref: "onboarding.journey.2026",
        focus_anchor_ref: "onboarding.review",
        label: "Continue",
        route: "ONBOARDING",
      },
      progress_steps: [
        {
          label: onboarding?.current_step_label ?? "Onboarding",
          state: "CURRENT",
          step_code: onboarding?.current_step_code ?? "ONBOARDING",
        },
      ],
      secondary_action: null,
      status_code: "ONBOARDING_REQUIRED",
      supporting_text: "Finish this step so your portal stays ready for the filing work.",
    };
  }
  if (input.route === "APPROVALS") {
    return {
      due_label: deriveClearDueLabel({
        dueAt: "2026-05-10T12:00:00.000Z",
        now: "2026-05-03T10:00:00.000Z",
      }),
      headline: "Review and sign your declaration",
      primary_action: {
        action_code: "SIGN",
        context_object_ref: "approval.pack.2026",
        focus_anchor_ref: "approval.pack.2026.sign",
        label: "Sign now",
        requires_step_up: true,
        route: "APPROVALS",
      },
      progress_steps: [{ label: "Approval ready", state: "CURRENT", step_code: "APPROVAL" }],
      secondary_action: null,
      status_code: "READY_TO_SIGN",
      supporting_text: "Please review and sign the declaration.",
    };
  }
  if (input.route === "HELP") {
    return {
      due_label: null,
      headline: "Help for this filing",
      primary_action: {
        action_code: "REQUEST_HELP",
        focus_anchor_ref: "portal.help.case-context",
        label: "Send a message",
        route: "HELP",
      },
      progress_steps: [{ label: "Help available", state: "CURRENT", step_code: "HELP" }],
      secondary_action: null,
      status_code: "WAITING_ON_US",
      supporting_text: "Help stays connected to this filing and its visible context.",
    };
  }
  return {
    due_label: deriveClearDueLabel({
      dueAt: "2026-05-12T12:00:00.000Z",
      now: "2026-05-03T10:00:00.000Z",
    }),
    headline: "Upload your bank statement",
    primary_action: {
      action_code: "UPLOAD_DOCUMENT",
      context_object_ref: "request.bank-statement",
      focus_anchor_ref: "request.bank-statement.upload",
      label: "Upload now",
      route: "DOCUMENTS",
    },
    progress_steps: [
      { label: "Documents requested", state: "CURRENT", step_code: "DOCUMENTS" },
      { label: "Approval ready", state: "UPCOMING", step_code: "APPROVAL" },
    ],
    secondary_action: null,
    status_code: "ACTION_REQUIRED",
    supporting_text: "Please upload the statement so we can continue.",
  };
}

function crossDeviceContinuityContract(input: {
  accessBindingHash: string;
  canonicalObjectRef: string;
  maskingPostureFingerprint: string;
  route: ClientPortalRouteCode;
  routeContext: ClientPortalWorkspaceRecord["route_context"];
  stabilityGuardHash: string;
  visibilityCachePartitionKey: string;
  workspacePosture: ClientPortalWorkspaceRecord["workspace_posture"];
}) {
  const isContextual = input.routeContext.context_route !== "NONE";
  return buildSharedClientPortalRouteContinuityContract({
    access_scope_hash_or_null: input.accessBindingHash,
    canonical_object_ref: input.canonicalObjectRef,
    dominant_action_state_or_null:
      input.workspacePosture.interaction_posture === "MUTATING_ALLOWED"
        ? "ACTION_AVAILABLE"
        : "NO_SAFE_ACTION",
    parent_context_ref_or_null: isContextual ? input.routeContext.return_route : null,
    focus_anchor_ref_or_null: input.routeContext.focus_anchor_ref,
    masking_scope_fingerprint_or_null: input.maskingPostureFingerprint,
    return_focus_anchor_ref_or_null: isContextual
      ? input.routeContext.return_focus_anchor_ref_or_null
      : null,
    route_identity_ref: isContextual ? input.routeContext.context_route : input.route,
    stability_guard_hash_or_null: input.stabilityGuardHash,
    visibility_cache_partition_key_or_null: input.visibilityCachePartitionKey,
  });
}

function defaultActivityEvents(input: {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  manifestId: string | null;
  maskingPostureFingerprint: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
}): BuildClientTimelineEventInput[] {
  const base = {
    accessBindingHash: input.accessBindingHash,
    clientId: input.clientId,
    languageContract: input.languageContract,
    manifestId: input.manifestId,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    tenantId: input.tenantId,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  };
  return [
    {
      ...base,
      detailRef: "copy.timeline.submission.sent.pending",
      eventId: "activity.submission.sent",
      internalEventFamily: "SUBMISSION_SENT",
      occurredAt: "2026-05-03T09:50:00.000Z",
      relatedObjectRef: "submission.2026",
      sourceEventId: "activity.submission.sent",
    },
    {
      ...base,
      detailRef: "copy.timeline.upload.identity.received",
      eventId: "activity.upload.received",
      internalEventFamily: "UPLOAD_RECEIVED",
      occurredAt: "2026-05-03T09:40:00.000Z",
      relatedObjectRef: "request.identity",
      sourceEventId: "activity.upload.received",
    },
    {
      ...base,
      detailRef: "copy.timeline.approval.ready",
      eventId: "activity.approval.ready",
      internalEventFamily: "APPROVAL_READY",
      occurredAt: "2026-05-03T09:10:00.000Z",
      relatedObjectRef: "approval.pack.2026",
      sourceEventId: "activity.approval.ready",
    },
  ];
}

export function buildClientPortalWorkspace(
  input: BuildClientPortalWorkspaceInput = {},
): ClientPortalWorkspaceRecord {
  const requestedRoute = input.route ?? "HOME";
  const tenantId = input.tenantId ?? defaultTenantId;
  const clientId = input.clientId ?? defaultClientId;
  const workspaceId = input.workspaceId ?? defaultWorkspaceId;
  const accessBindingHash = input.accessBindingHash ?? defaultAccessBindingHash;
  const maskingPostureFingerprint =
    input.maskingPostureFingerprint ?? defaultMaskingFingerprint;
  const visibilityCachePartitionKey =
    input.visibilityCachePartitionKey ?? defaultVisibilityCachePartitionKey;
  const workspaceVersion = input.workspaceVersion ?? 12;
  const portalLanguageContract = buildPortalLanguageContract();
  const onboardingState = onboardingProjection({
    accessBindingHash,
    clientId,
    includeOnboarding: input.includeOnboarding,
    languageContract: portalLanguageContract,
    maskingPostureFingerprint,
    onboardingJourney: input.onboardingJourney,
    tenantId,
    visibilityCachePartitionKey,
  });
  const onboarding = onboardingState?.workspaceJourney ?? null;
  const onboardingJourneyRecord = onboardingState?.journey ?? null;
  const onboardingActive =
    onboarding !== null && isActiveOnboardingLifecycleState(onboarding.state);
  const terminalOnboardingNeedsSupport =
    onboarding !== null && (onboarding.state === "ABANDONED" || onboarding.state === "EXPIRED");
  const route =
    requestedRoute === "ONBOARDING" && !onboardingActive ? "HOME" : requestedRoute;
  const routeContext = deriveClientPortalRouteContext({
    query: input.query,
    route,
  });
  const objectAnchorRef =
    routeContext.context_route === "NONE" ? workspaceId : String(routeContext.context_object_ref);
  const posture = deriveClientPortalWorkspacePosture({
    freshnessState: input.freshnessState,
    route,
  });
  if (terminalOnboardingNeedsSupport) {
    posture.workspace_posture.interaction_posture = "READ_ONLY_LIMITED";
    posture.workspace_posture.promoted_support_region = "SUPPORT_PANEL";
    posture.workspace_posture.notice_headline = "Onboarding needs support";
    posture.workspace_posture.notice_detail = "This onboarding link is no longer active.";
    posture.recovery_posture = "READ_ONLY_LIMITED";
    posture.settlement_state = "RECOVERY_REQUIRED";
  }
  const stability = deriveClientPortalViewGuardAndStability({
    publicationGeneration: input.publicationGeneration ?? 3,
    viewGuardRef: input.viewGuardRef ?? `view-guard.portal.${workspaceVersion}`,
    workspaceVersion,
  });
  const manifestId = input.manifestId ?? "manifest.portal.2026";
  const documents = buildDocumentCenter({
    accessBindingHash,
    clientId,
    languageContract: portalLanguageContract,
    manifestId,
    maskingPostureFingerprint,
    tenantId,
    visibilityCachePartitionKey,
  });
  const approvals = approvalCenter({
    accessBindingHash,
    clientId,
    languageContract: portalLanguageContract,
    manifestId,
    maskingPostureFingerprint,
    tenantId,
    visibilityCachePartitionKey,
  });
  const hero = statusHero({
    freshnessState: posture.freshness_state,
    onboarding,
    route,
  });
  const tasks =
    route === "HOME" &&
    ["COMPLETED", "IN_REVIEW", "WAITING_ON_AUTHORITY", "WAITING_ON_US"].includes(
      String(hero.status_code),
    )
      ? taskGroups().filter((group) => group.group_code !== "DO_NOW")
      : taskGroups();
  const dominantQuestion = dominantQuestionByRoute[route];
  const activityTimeline = compressClientActivityTimeline({
    events:
      input.timelineEvents ??
      input.activityEvents ??
      defaultActivityEvents({
        accessBindingHash,
        clientId,
        languageContract: portalLanguageContract,
        manifestId,
        maskingPostureFingerprint,
        tenantId,
        visibilityCachePartitionKey,
      }),
    maxEvents: route === "HOME" ? 6 : 12,
  }).workspaceTimeline;

  const workspace = {
    activity_timeline: activityTimeline,
    approval_center: approvals,
    artifact_type: "ClientPortalWorkspace",
    cache_isolation_contract: deriveClientPortalCacheIsolationContract({
      accessBindingHash,
      canonicalObjectRef: objectAnchorRef,
      clientId,
      maskingPostureFingerprint,
      principalClass: input.principalClass ?? input.viewerRole ?? "CLIENT_CONTRIBUTOR",
      route,
      routeContext,
      sessionBindingHash: input.sessionBindingHash ?? "session.portal-client-1",
      tenantId,
      visibilityCachePartitionKey,
      workspaceVersion,
    }),
    client_id: clientId,
    content_limitations: posture.content_limitations,
    cross_device_continuity_contract: crossDeviceContinuityContract({
      accessBindingHash,
      canonicalObjectRef: objectAnchorRef,
      maskingPostureFingerprint,
      route,
      routeContext,
      stabilityGuardHash: stability.stability_contract.guard_vector_hash,
      visibilityCachePartitionKey,
      workspacePosture: posture.workspace_posture,
    }),
    customer_safe_projection: customerSafeProjection({
      accessBindingHash,
      maskingPostureFingerprint,
      visibilityCachePartitionKey,
    }),
    document_center: documents,
    dominance_contract: projectShellDominanceContract({
      actionabilityState:
        posture.workspace_posture.interaction_posture === "MUTATING_ALLOWED"
          ? "ACTION_AVAILABLE"
          : "NO_SAFE_ACTION",
      dominantActionRefOrNull:
        route === "HOME" ? "task.upload.bank-statement" : String(hero.primary_action?.action_code),
      dominantQuestion,
      portalRoute: route,
      primaryActionCode: String(hero.primary_action?.action_code ?? "NO_ACTION"),
      promotedSupportRegion: posture.workspace_posture.promoted_support_region,
      recoveryPosture: posture.recovery_posture,
      settlementState: posture.settlement_state,
      shellFamily: "CLIENT_PORTAL_SHELL",
    }),
    dominant_question: dominantQuestion,
    draft_resume:
      onboardingJourneyRecord !== null &&
      (onboardingJourneyRecord.draft_upload_session_refs.length > 0 ||
        onboardingJourneyRecord.resume_state === "RECONFIRMATION_REQUIRED" ||
        onboardingJourneyRecord.resume_state === "STALE_REVIEW_REQUIRED")
        ? {
            draft_kind: "ONBOARDING",
            draft_object_ref: onboardingJourneyRecord.journey_id,
            draft_state:
              onboardingJourneyRecord.resume_state === "STALE_REVIEW_REQUIRED"
                ? "STALE_REVIEW_REQUIRED"
                : onboardingJourneyRecord.resume_state === "RECONFIRMATION_REQUIRED"
                  ? "REBASED"
                  : "ACTIVE",
            last_saved_at: input.updatedAt ?? onboardingJourneyRecord.state_changed_at,
            rebase_target_ref:
              onboardingJourneyRecord.resume_state === "LIVE"
                ? null
                : (onboardingJourneyRecord.current_step_code ?? onboardingJourneyRecord.journey_id),
            resume_route: "ONBOARDING",
          }
        : {
            draft_kind: "NONE",
            draft_object_ref: null,
            draft_state: "NONE",
            last_saved_at: null,
            rebase_target_ref: null,
            resume_route: null,
          },
    freshness_state: posture.freshness_state,
    home_primary_task_ref:
      route === "HOME" && hero.status_code === "ACTION_REQUIRED" ? "task.upload.bank-statement" : null,
    home_surface_order:
      route === "HOME"
        ? ["PORTAL_HEADER", "STATUS_HERO", "TASK_QUEUE", "RECENT_ACTIVITY"]
        : null,
    identity_context: {
      acting_role_label: input.delegatedSession === false ? null : "Contributor",
      client_display_name: input.clientDisplayName ?? "Taylor Example",
      context_hash: stableJsonHash({
        client_id: clientId,
        delegated_session: input.delegatedSession ?? true,
        period_label: input.periodLabel ?? "2025 to 2026",
      }),
      delegated_session: input.delegatedSession ?? true,
      period_label: input.periodLabel ?? "2025 to 2026",
      reassurance_line:
        input.delegatedSession === false
          ? "You are viewing your portal for 2025 to 2026."
          : "You are acting for Taylor Example for 2025 to 2026.",
    },
    interaction_layer: projectPortalInteractionLayer(),
    language_contract: portalLanguageContract,
    manifest_id: manifestId,
    navigation_tabs: deriveClientPortalNavigationTabs({
      approvalBadgeCount: approvals.outstanding_count,
      documentBadgeCount: documents.open_request_count,
      includeOnboarding: onboardingActive,
      route,
    }),
    object_anchor_ref: objectAnchorRef,
    onboarding_journey: onboarding,
    recovery_posture: posture.recovery_posture,
    reliability_summary: deriveClientPortalReliabilitySummary({
      freshnessState: posture.freshness_state,
      route,
      surfaceClass: input.surfaceClass,
    }),
    route,
    route_context: routeContext,
    semantic_accessibility_contract: projectSemanticAccessibilityContract({
      routeVariant:
        routeContext.context_route === "NONE" ? "PORTAL_WORKSPACE" : "PORTAL_CONTEXTUAL_ROUTE",
      surfaceType: "ClientPortalWorkspace",
    }),
    settlement_state: posture.settlement_state,
    shell_family: "CLIENT_PORTAL_SHELL",
    stability_contract: stability.stability_contract,
    state_taxonomy_contract: projectShellStateTaxonomyContract({
      currentEmptyStateOrNull:
        posture.workspace_posture.promoted_support_region === "LIMITATION_NOTICE"
          ? "LIMITED"
          : null,
      currentEmptySurfaceCodeOrNull:
        posture.workspace_posture.promoted_support_region === "LIMITATION_NOTICE"
          ? "LIMITATION_NOTICE"
          : null,
      limitationReasonCodes: posture.content_limitations.map((entry) =>
        String(entry.limitation_code),
      ),
      recoveryPosture: posture.recovery_posture,
      settlementState: posture.settlement_state,
    }),
    status_hero: hero,
    support_panel: supportPanel({
      clientId,
      manifestId,
      objectAnchorRef,
      requestInfoRef: input.query?.request_info_ref ?? null,
      route,
      routeContext,
      tenantId,
      workspaceId,
    }),
    task_groups: tasks,
    tenant_id: tenantId,
    updated_at: input.updatedAt ?? "2026-05-03T10:00:00.000Z",
    view_guard_ref: stability.view_guard_ref,
    viewer_role: input.viewerRole ?? "CLIENT_CONTRIBUTOR",
    visibility_partition: visibilityPartition({
      accessBindingHash,
      maskingPostureFingerprint,
      visibilityCachePartitionKey,
    }),
    workspace_id: workspaceId,
    workspace_posture: posture.workspace_posture,
    workspace_version: stability.workspace_version,
  } satisfies ClientPortalWorkspaceRecord;
  assertClientPortalWorkspaceCopyGuards(workspace);
  assertClientPortalWorkspaceFirstViewBudget(workspace);
  return workspace;
}

export function deriveClientPortalRouteWorkspace(input: {
  query?: ClientPortalRouteQueryInput | undefined;
  requestedRoute: ClientPortalRouteCode;
  workspace: ClientPortalWorkspaceRecord;
}) {
  const source = cloneClientPortalWorkspace(input.workspace);
  const sourceOnboardingJourney =
    source.onboarding_journey === null
      ? null
      : onboardingInputFromWorkspaceJourney({
          accessBindingHash: String(source.visibility_partition.access_binding_hash),
          clientId: source.client_id,
          languageContract: source.language_contract as Record<string, unknown>,
          maskingPostureFingerprint: String(
            source.visibility_partition.masking_posture_fingerprint,
          ),
          sourceDraftResume: source.draft_resume as Record<string, unknown>,
          source: source.onboarding_journey as ClientOnboardingWorkspaceJourneyRecord,
          tenantId: source.tenant_id,
          updatedAt: source.updated_at,
          visibilityCachePartitionKey: String(source.visibility_partition.cache_partition_key),
        });
  const routeContext = deriveClientPortalRouteContext({
    query: input.query,
    route: input.requestedRoute,
  });
  const fallback = applyContextualRouteFallbackRules({
    objectState: "EXACT_TARGET_VISIBLE",
    route: input.requestedRoute,
    routeContext,
    workspaceId: source.workspace_id,
  });
  return buildClientPortalWorkspace({
    accessBindingHash: String(source.visibility_partition.access_binding_hash),
    clientId: source.client_id,
    freshnessState: source.freshness_state,
    manifestId: typeof source.manifest_id === "string" ? source.manifest_id : null,
    maskingPostureFingerprint: String(source.visibility_partition.masking_posture_fingerprint),
    onboardingJourney: sourceOnboardingJourney,
    principalClass:
      typeof source.cache_isolation_contract?.principal_class === "string"
        ? source.cache_isolation_contract.principal_class
        : undefined,
    publicationGeneration: source.stability_contract.publication_generation,
    query:
      fallback.route_context.context_route === "NONE"
        ? undefined
        : {
            artifact_focus_bucket_or_null:
              fallback.route_context.artifact_focus_bucket_or_null,
            artifact_focus_subject_ref_or_null:
              fallback.route_context.artifact_focus_subject_ref_or_null,
            context_object_ref: fallback.object_anchor_ref,
            context_route: fallback.route_context.context_route,
            fallback_object_ref_or_null:
              fallback.route_context.fallback_object_ref_or_null,
            fallback_reason_ref_or_null:
              fallback.route_context.fallback_reason_ref_or_null,
            fallback_target: fallback.route_context.fallback_target,
            focus_anchor_ref: fallback.route_context.focus_anchor_ref,
            return_focus_anchor_ref_or_null:
              fallback.route_context.return_focus_anchor_ref_or_null,
          },
    route: input.requestedRoute,
    sessionBindingHash:
      typeof source.cache_isolation_contract?.session_binding_hash === "string"
        ? source.cache_isolation_contract.session_binding_hash
        : undefined,
    tenantId: source.tenant_id,
    updatedAt: source.updated_at,
    viewGuardRef: source.view_guard_ref,
    viewerRole: source.viewer_role as "CLIENT_CONTRIBUTOR" | "CLIENT_SIGNATORY" | "CLIENT_VIEWER",
    visibilityCachePartitionKey: String(source.visibility_partition.cache_partition_key),
    workspaceId: source.workspace_id,
    workspaceVersion: source.workspace_version,
  });
}
