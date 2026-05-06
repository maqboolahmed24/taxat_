import type {
  ClientTimelineEvent,
  ClientPortalWorkspaceContextRouteCode,
  ClientPortalWorkspaceRouteCode,
  ClientPortalWorkspaceTimelineEvent,
} from "../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type { GovernedUploadSession } from "../../domain-kernel/src/uploads/upload_session_state.ts";
import type { UploadRequestBindingContract } from "../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  FocusRestorationContract,
  RouteStabilityContract,
} from "../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type ClientPortalRouteCode = ClientPortalWorkspaceRouteCode;

export type ClientPortalContextRouteCode = ClientPortalWorkspaceContextRouteCode;

export type ClientTimelineEventRecord = ClientTimelineEvent;

export type ClientTimelineEventKind = ClientTimelineEvent["event_kind"];

export type ClientTimelineAuthorityTruthState = ClientTimelineEvent["authority_truth_state"];

export type ClientPortalWorkspaceTimelineEventRecord = ClientPortalWorkspaceTimelineEvent;

export type ClientPortalFreshnessState = "DEGRADED" | "FRESH" | "STALE_REVIEW_REQUIRED";

export type ClientPortalRouteQueryInput = {
  artifact_focus_bucket_or_null?: "HISTORY" | "LIMITATION_NOTICE" | "PRIMARY" | null;
  artifact_focus_subject_ref_or_null?: string | null;
  context_object_ref?: string | null;
  context_route?: ClientPortalContextRouteCode | string | null;
  fallback_object_ref_or_null?: string | null;
  fallback_reason_ref_or_null?: string | null;
  fallback_target?: "LATEST_VISIBLE_OBJECT" | "RETURN_FOCUS_ANCHOR" | null;
  focus_anchor_ref?: string | null;
  request_info_ref?: string | null;
  return_focus_anchor_ref_or_null?: string | null;
};

export type ClientPortalWorkspaceRecord = Record<string, unknown> & {
  activity_timeline: Array<Record<string, unknown>>;
  approval_center: Record<string, unknown> & {
    outstanding_count: number;
    packs: Array<Record<string, unknown>>;
  };
  artifact_type: "ClientPortalWorkspace";
  client_id: string;
  customer_safe_projection: Record<string, unknown>;
  document_center: Record<string, unknown> & {
    open_request_count: number;
    requests: Array<Record<string, unknown>>;
  };
  freshness_state: ClientPortalFreshnessState;
  home_primary_task_ref: string | null;
  home_surface_order: Array<string> | null;
  navigation_tabs: Array<Record<string, unknown>>;
  object_anchor_ref: string;
  onboarding_journey: null | Record<string, unknown>;
  recovery_posture:
    | "ACCESS_REBIND_REQUIRED"
    | "INLINE_REBASE"
    | "INLINE_RECONNECT"
    | "NONE"
    | "OBJECT_SUPERSEDED"
    | "READ_ONLY_LIMITED";
  route: ClientPortalRouteCode;
  route_context: ClientPortalRouteContext;
  settlement_state:
    | "DEGRADED_READ_ONLY"
    | "FRESHENING"
    | "RECEIPT_PENDING"
    | "RECOVERY_REQUIRED"
    | "STALE_REVIEW_REQUIRED"
    | "STEADY";
  shell_family: "CLIENT_PORTAL_SHELL";
  stability_contract: RouteStabilityContract;
  status_hero: Record<string, unknown>;
  task_groups: Array<Record<string, unknown>>;
  tenant_id: string;
  updated_at: string;
  view_guard_ref: string;
  visibility_partition: Record<string, unknown>;
  workspace_id: string;
  workspace_posture: ClientPortalWorkspacePosture;
  workspace_version: number;
};

export type ClientPortalWorkspacePosture = {
  connection_state: "CATCHING_UP" | "CONNECTED" | "DEGRADED" | "RECONNECTING" | "STALE";
  full_text_ref: string | null;
  interaction_posture: "MUTATING_ALLOWED" | "READ_ONLY_LIMITED" | "REVIEW_REQUIRED";
  notice_detail: string | null;
  notice_headline: string | null;
  promoted_support_region: "DRAFT_RESUME" | "LIMITATION_NOTICE" | "NONE" | "SUPPORT_PANEL";
};

export type ClientPortalRouteContext = {
  artifact_focus_bucket_or_null: "HISTORY" | "LIMITATION_NOTICE" | "PRIMARY" | null;
  artifact_focus_subject_ref_or_null: string | null;
  context_object_ref: string | null;
  context_route: ClientPortalContextRouteCode;
  fallback_object_ref_or_null: string | null;
  fallback_reason_ref_or_null: string | null;
  fallback_target: "LATEST_VISIBLE_OBJECT" | "RETURN_FOCUS_ANCHOR" | null;
  focus_anchor_ref: string | null;
  focus_restoration: FocusRestorationContract;
  narrow_screen_mode: "STACKED_SAME_SHELL" | null;
  return_focus_anchor_ref_or_null: string | null;
  return_route: ClientPortalRouteCode | null;
};

export type ClientDocumentRequestLifecycleState =
  | "ACCEPTED"
  | "EXPIRED"
  | "OPEN"
  | "REJECTED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "UPLOAD_IN_PROGRESS"
  | "WITHDRAWN";

export type ClientDocumentRequestCategory =
  | "AUTHORITY_LETTER"
  | "BANK_STATEMENT"
  | "IDENTITY"
  | "INVOICE"
  | "OTHER"
  | "RECEIPT";

export type ClientDocumentRequestCardStatus =
  | "ACCEPTED"
  | "EXPIRED"
  | "OPEN"
  | "REJECTED"
  | "UNDER_REVIEW"
  | "UPLOADING";

export type ClientDocumentUploadTransferState =
  | "ACCEPTED"
  | "FAILED"
  | "QUEUED"
  | "REJECTED"
  | "SCANNING"
  | "UPLOADING";

export type ClientDocumentUploadStatusPhase =
  | "ACCEPTANCE"
  | "REJECTION"
  | "RETRY"
  | "SCAN"
  | "TRANSFER"
  | "VALIDATION";

export type ClientDocumentUploadHistoryState =
  | "CURRENT"
  | "FAILED"
  | "IN_PROGRESS"
  | "REJECTED"
  | "SUPERSEDED";

export type ClientDocumentUploadPreviewPosture =
  | "DOWNLOAD_ONLY"
  | "NOT_AVAILABLE"
  | "SAME_SHELL_PREVIEW";

export type ClientDocumentUploadPreviewReasonCode =
  | "FORMAT_UNSUPPORTED"
  | "POLICY_LIMITED"
  | "QUARANTINED"
  | "REPLACEMENT_REQUIRED"
  | "RETRY_REQUIRED"
  | "SCAN_PENDING"
  | "TRANSFER_IN_PROGRESS";

export type ClientDocumentUploadRequestBindingState =
  | "ORIGINAL_CURRENT"
  | "RECONFIRMATION_REQUIRED"
  | "RECONFIRMED_CURRENT"
  | "SUPERSEDED";

export type ClientDocumentUploadResumabilityState =
  | "CLOSED"
  | "RESUMABLE"
  | "RESTART_REQUIRED";

export type ClientDocumentUploadAttachmentState =
  | "ATTACHED"
  | "CONFIRMATION_REQUIRED"
  | "REBIND_REQUIRED"
  | "STAGED";

export type ClientDocumentUploadNextActionCode =
  | "CONFIRM_ATTACHMENT"
  | "CONTACT_SUPPORT"
  | "NONE"
  | "RECONFIRM_REQUEST"
  | "RESUME_UPLOAD"
  | "RETRY_UPLOAD"
  | "UPLOAD_REPLACEMENT";

export type ClientDocumentUploadRecoveryPosture =
  | "HARD_RESET_REQUIRED"
  | "INLINE_RESUME"
  | "NONE"
  | "RECONFIRM_INLINE"
  | "STALE_REVIEW_REQUIRED"
  | "STEP_UP_RETRY"
  | "SUPPORT_REQUIRED";

export type ClientDocumentHistoryDisclosureState = "FULL" | "LIMITED" | "MASKED_PRESENT";

export type ArtifactSelectionContractRecord = {
  authoritative_subject_refs: string[];
  default_download_target_ref_or_null: string | null;
  default_preview_target_ref_or_null: string | null;
  default_print_target_ref_or_null: string | null;
  historical_subject_refs: string[];
  limited_history_count_or_null: number | null;
  limited_history_state: "LIMITED" | "MASKED_PRESENT" | "NONE";
  presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY";
  primary_subject_refs: string[];
  selection_scope: "CLIENT_APPROVAL_PACK" | "CLIENT_DOCUMENT_REQUEST";
};

export type ArtifactAffordanceContractRecord = {
  affordance_scope: "CLIENT_APPROVAL_PACK" | "CLIENT_DOCUMENT_REQUEST";
  contract_version: "ARTIFACT_AFFORDANCE_V1";
  default_download_target_ref_or_null: string | null;
  default_preview_target_ref_or_null: string | null;
  default_print_target_ref_or_null: string | null;
  header_posture:
    | "AWAITING_CURRENT_REPLACEMENT"
    | "CURRENT"
    | "CURRENT_WITH_HISTORY"
    | "EXPIRED"
    | "HISTORICAL"
    | "QUARANTINED"
    | "REJECTED"
    | "SUPERSEDED";
  history_affordance_state:
    | "EXPLICIT_SECONDARY"
    | "EXPLICIT_SECONDARY_LIMITED"
    | "HIDDEN_UNTIL_REQUESTED"
    | "NONE";
  invocation_validation_policy: "VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE";
  label_visibility_policy: "EXPLICIT_POSTURE_LABELS_REQUIRED";
  preview_open_policy:
    | "CURRENT_SUMMARY_FIRST_ONLY"
    | "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND";
  primary_slot_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT";
  primary_subject_role:
    | "APPROVAL_PACK"
    | "CURRENT_ARTIFACT"
    | "CURRENT_REQUEST_UPLOAD"
    | "HISTORICAL_CONTEXT"
    | "NO_CURRENT_ARTIFACT";
  visible_primary_subject_ref_or_null: string | null;
};

export type ExternalizationGovernanceContractRecord = {
  access_binding_hash_or_null: string | null;
  approval_requirement_token_or_null: string | null;
  approval_state: "DENIED" | "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED";
  background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN";
  blocking_context_tokens: string[];
  boundary_scope: "CLIENT_APPROVAL_PACK" | "CLIENT_DOCUMENT_REQUEST";
  context_anchor_ref: string;
  contract_version: "EXTERNALIZATION_GOVERNANCE_V1";
  delivery_binding_hash: string;
  delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION";
  delivery_surface_kind: "PORTAL_APPROVAL_EXPORT" | "PORTAL_DOCUMENT_DOWNLOAD";
  direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN";
  download_target_ref_or_null: string | null;
  eligibility_state:
    | "APPROVAL_REQUIRED"
    | "BLOCKED"
    | "LIMITED_READY"
    | "MASKED_ONLY"
    | "PENDING_RETURN"
    | "READY";
  external_handoff_target_ref_or_null: string | null;
  handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT";
  history_meaning_state:
    | "CURRENT_DECLARATION_OR_ISSUED_RECEIPT"
    | "CURRENT_ONLY"
    | "CURRENT_WITH_HISTORY_EXPLICIT";
  limitation_state: "FULL" | "HISTORY_LIMITED" | "POLICY_LIMITED";
  masking_posture_fingerprint_or_null: string | null;
  masking_state: "CUSTOMER_SAFE_ONLY" | "NONE";
  posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED";
  preview_target_ref_or_null: string | null;
  print_target_ref_or_null: string | null;
  reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION";
  shell_family_or_null: "CLIENT_PORTAL_SHELL" | null;
  signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING";
  slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED";
  slice_binding_ref: string;
  temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING";
  tenant_id: string;
  visibility_cache_partition_key_or_null: string | null;
};

export type ClientApprovalPackLifecycleState =
  | "ACKNOWLEDGED"
  | "CANCELLED"
  | "COUNTERSIGNED"
  | "DRAFT"
  | "EXPIRED"
  | "READY_FOR_CLIENT"
  | "SIGNED"
  | "STEP_UP_REQUIRED"
  | "SUPERSEDED"
  | "VIEWED";

export type ClientApprovalPackStaleProtectionState =
  | "CURRENT"
  | "EXPIRED"
  | "REBASE_REQUIRED"
  | "SUPERSEDED";

export type ClientApprovalPackRecoveryPosture =
  | "HARD_RESET_REQUIRED"
  | "INLINE_RESUME"
  | "NONE"
  | "RECONFIRM_INLINE"
  | "STALE_REVIEW_REQUIRED"
  | "STEP_UP_RETRY"
  | "SUPPORT_REQUIRED";

export type ClientApprovalPackRecord = Record<string, unknown> & {
  approval_pack_hash: string;
  approval_pack_id: string;
  approval_readiness_score: number;
  artifact_affordance: ArtifactAffordanceContractRecord;
  artifact_selection: ArtifactSelectionContractRecord;
  artifact_type: "ClientApprovalPack";
  change_digest_acknowledged_at: string | null;
  client_id: string;
  declaration_acknowledged_at: string | null;
  declaration_text_ref: string;
  dominant_hazard_code: string | null;
  externalization_governance_contract: ExternalizationGovernanceContractRecord;
  lifecycle_state: ClientApprovalPackLifecycleState;
  recovery_posture: ClientApprovalPackRecoveryPosture;
  requires_step_up: boolean;
  signed_at: string | null;
  stale_protection_state: ClientApprovalPackStaleProtectionState;
  tenant_id: string;
  view_guard_ref: string;
};

export type ClientApprovalCenterPackRecord = Record<string, unknown> & {
  approval_pack_id: string;
  approval_readiness_score: number;
  artifact_affordance: ArtifactAffordanceContractRecord;
  artifact_selection: ArtifactSelectionContractRecord;
  change_digest_acknowledged: boolean;
  declaration_acknowledged: boolean;
  dominant_hazard_code: string | null;
  externalization_governance_contract: ExternalizationGovernanceContractRecord;
  primary_action: Record<string, unknown>;
  receipt_state: "ISSUED" | "NOT_ISSUED" | "PENDING_SETTLEMENT";
  recovery_posture: ClientApprovalPackRecoveryPosture;
  requires_step_up: boolean;
  sign_off_state:
    | "READY_TO_SIGN"
    | "REVIEW_REQUIRED"
    | "SIGNATURE_PENDING_SETTLEMENT"
    | "SIGNED_RECEIPT"
    | "STALE_REVIEW_REQUIRED"
    | "STEP_UP_CHECKPOINT";
  stale_protection_state: ClientApprovalPackStaleProtectionState;
  status: Exclude<ClientApprovalPackLifecycleState, "CANCELLED" | "COUNTERSIGNED" | "DRAFT">;
};

export class ClientApprovalPackProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ClientApprovalPackProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export type ClientOnboardingStepCode =
  | "INVITE_ACCEPTANCE"
  | "PROFILE_CONFIRMATION"
  | "IDENTITY_VERIFICATION"
  | "AUTHORITY_LINK_SETUP"
  | "DOCUMENT_COLLECTION"
  | "REVIEW_CONFIRMATION";

export type ClientOnboardingLifecycleState =
  | "ABANDONED"
  | "AUTHORITY_LINK_PENDING"
  | "COMPLETED"
  | "DOCUMENTS_PENDING"
  | "EXPIRED"
  | "IDENTITY_PENDING"
  | "INVITED"
  | "PROFILE_PENDING"
  | "READY_FOR_REVIEW";

export type ClientOnboardingVerificationState =
  | "FAILED_RETRYABLE"
  | "FAILED_REVIEW_REQUIRED"
  | "NOT_STARTED"
  | "PENDING"
  | "VERIFIED"
  | "WAIVED";

export type ClientOnboardingAuthorityLinkRequirement =
  | "NOT_REQUIRED"
  | "OPTIONAL"
  | "REQUIRED"
  | "UNRESOLVED";

export type ClientOnboardingAuthorityLinkState =
  | "LINKED"
  | "NOT_REQUIRED"
  | "PENDING"
  | "UNRESOLVED"
  | "WAIVED";

export type ClientOnboardingResumeState =
  | "LIVE"
  | "NONE"
  | "RECONFIRMATION_REQUIRED"
  | "STALE_REVIEW_REQUIRED";

export type ClientOnboardingStepWorkspaceState =
  | "ACTIVE_STEP"
  | "COMPLETION_SUMMARY"
  | "EXIT_SUPPORT"
  | "RECONFIRMATION_REVIEW"
  | "STALE_REVIEW";

export type ClientOnboardingSaveReturnState =
  | "AVAILABLE"
  | "NOT_AVAILABLE_IRREVERSIBLE"
  | "NOT_AVAILABLE_TERMINAL";

export type ClientOnboardingJourneyRecord = Record<string, unknown> & {
  abandoned_at: string | null;
  abandonment_reason_code: string | null;
  artifact_type: "ClientOnboardingJourney";
  authority_link_requirement: ClientOnboardingAuthorityLinkRequirement;
  authority_link_state: ClientOnboardingAuthorityLinkState;
  client_id: string;
  completed_at: string | null;
  completed_steps: ClientOnboardingStepCode[];
  completion_summary_ref: string | null;
  completion_timeline_event_ref: string | null;
  current_step_code: ClientOnboardingStepCode | null;
  document_request_refs: string[];
  draft_upload_session_refs: string[];
  expired_at: string | null;
  expires_at: string | null;
  help_channel_ref: string | null;
  invited_at: string;
  journey_id: string;
  lifecycle_state: ClientOnboardingLifecycleState;
  reconfirmation_step_codes: ClientOnboardingStepCode[];
  required_steps: ClientOnboardingStepCode[];
  resume_state: ClientOnboardingResumeState;
  resume_step_code: ClientOnboardingStepCode | null;
  state_changed_at: string;
  tenant_id: string;
  verification_state: ClientOnboardingVerificationState;
};

export type ClientOnboardingCompletionSummaryRecord = {
  completion_next_steps_ref: string | null;
  completion_summary_ref: string | null;
  completion_timeline_event_ref: string | null;
  terminal_exit_reason_code: "ABANDONED" | "COMPLETED" | "EXPIRED" | null;
};

export type ClientOnboardingWorkspaceJourneyRecord = Record<string, unknown> & {
  abandoned_at: string | null;
  abandonment_reason_code: string | null;
  completed_at: string | null;
  completed_step_count: number;
  completion_next_steps_ref: string | null;
  completion_summary_ref: string | null;
  current_step_code: ClientOnboardingStepCode | null;
  current_step_label: string | null;
  expired_at: string | null;
  journey_id: string;
  next_action: Record<string, unknown>;
  reconfirmation_step_codes: ClientOnboardingStepCode[];
  resume_state: ClientOnboardingResumeState;
  resume_step_code: ClientOnboardingStepCode | null;
  save_and_return_action: Record<string, unknown> | null;
  save_return_state: ClientOnboardingSaveReturnState;
  state: ClientOnboardingLifecycleState;
  step_workspace_state: ClientOnboardingStepWorkspaceState;
  surface_order: ["WELCOME_PANEL", "ONBOARDING_STEPPER", "STEP_WORKSPACE", "SUPPORT_PANEL"];
  total_step_count: number;
};

export class ClientOnboardingJourneyProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ClientOnboardingJourneyProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export class ClientTimelineEventProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ClientTimelineEventProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export class PortalLanguageContractProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "PortalLanguageContractProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export type PortalHelpRequestSourceRoute =
  | "APPROVALS"
  | "DOCUMENTS"
  | "HELP"
  | "HOME"
  | "ONBOARDING"
  | "REQUEST_DETAIL";

export type PortalHelpRequestSupportChannel = "CONTEXTUAL_REQUEST" | "PORTAL_HELP";

export type PortalHelpRequestReasonFamily =
  | "ACCESS_HELP"
  | "APPROVAL_HELP"
  | "DOCUMENT_HELP"
  | "GENERAL_HELP"
  | "ONBOARDING_HELP"
  | "STATUS_QUESTION";

export type PortalHelpRequestLifecycleState =
  | "ACKNOWLEDGED"
  | "CLOSED"
  | "OPEN"
  | "RESPONDED";

export type PortalHelpRequestRecord = Record<string, unknown> & {
  acknowledged_at: string | null;
  artifact_type: "PortalHelpRequest";
  body_ref: string;
  case_context_refs: string[];
  client_id: string;
  closed_at: string | null;
  help_request_id: string;
  item_id: string | null;
  lifecycle_state: PortalHelpRequestLifecycleState;
  manifest_id: string | null;
  opened_at: string;
  opened_by_ref: string;
  reason_family: PortalHelpRequestReasonFamily;
  request_info_ref: string | null;
  responded_at: string | null;
  response_ref: string | null;
  source_focus_anchor_ref: string;
  source_route: PortalHelpRequestSourceRoute;
  subject_line: string;
  support_channel: PortalHelpRequestSupportChannel;
  tenant_id: string;
};

export type PortalHelpReturnTargetRecord = {
  focus_anchor_ref: string;
  item_id: string | null;
  request_info_ref: string | null;
  source_route: PortalHelpRequestSourceRoute;
};

export type PortalHelpBoundaryHandoffState =
  | "ACKNOWLEDGED"
  | "CLOSED"
  | "OPEN"
  | "RESPONDED";

export type PortalHelpBoundaryHandoffRecord = Record<string, unknown> & {
  artifact_type: "PortalHelpBoundaryHandoff";
  case_context_refs: string[];
  handoff_at: string;
  handoff_id: string;
  handoff_state: PortalHelpBoundaryHandoffState;
  help_request_ref: string;
  return_target: PortalHelpReturnTargetRecord;
  support_boundary_ref: string;
};

export class PortalHelpRequestProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "PortalHelpRequestProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export type ClientDocumentProjectedUploadRow = {
  attachment_state: ClientDocumentUploadAttachmentState;
  dominant_hazard_code: string | null;
  download_ref: string | null;
  filename: string;
  history_state: ClientDocumentUploadHistoryState;
  next_action_code: ClientDocumentUploadNextActionCode;
  preview_posture: ClientDocumentUploadPreviewPosture;
  preview_reason_code: ClientDocumentUploadPreviewReasonCode | null;
  recovery_posture: ClientDocumentUploadRecoveryPosture;
  request_binding_state: ClientDocumentUploadRequestBindingState;
  request_version_ref: string;
  resumability_state: ClientDocumentUploadResumabilityState;
  status_phase: ClientDocumentUploadStatusPhase;
  transfer_state: ClientDocumentUploadTransferState;
  upload_confidence_score: number;
  upload_request_binding_contract: Record<string, unknown>;
  upload_session_id: string;
  uploaded_at: string | null;
};

export type ClientPortalUploadRequestBindingContract = UploadRequestBindingContract;

export type ClientPortalUploadSessionRecord = GovernedUploadSession;

export class ClientUploadSessionProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ClientUploadSessionProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export type ClientDocumentRequestRecord = Record<string, unknown> & {
  artifact_affordance: ArtifactAffordanceContractRecord;
  artifact_selection: ArtifactSelectionContractRecord;
  artifact_type: "ClientDocumentRequest";
  category: ClientDocumentRequestCategory;
  client_id: string;
  current_request_upload_ref_or_null: string | null;
  due_at: string | null;
  externalization_governance_contract: ExternalizationGovernanceContractRecord;
  latest_upload_ref: string | null;
  lifecycle_state: ClientDocumentRequestLifecycleState;
  request_id: string;
  request_version_ref: string;
  tenant_id: string;
  upload_refs: string[];
};

export type ClientDocumentRequestCardRecord = Record<string, unknown> & {
  artifact_affordance: ArtifactAffordanceContractRecord;
  artifact_selection: ArtifactSelectionContractRecord;
  category: ClientDocumentRequestCategory;
  current_artifact_upload_ref: string | null;
  current_upload_ref: string | null;
  externalization_governance_contract: ExternalizationGovernanceContractRecord;
  request_id: string;
  request_version_ref: string;
  status: ClientDocumentRequestCardStatus;
  uploads: ClientDocumentProjectedUploadRow[];
};

export class ClientDocumentRequestProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ClientDocumentRequestProjectionError";
    this.reasonCodes = [...reasonCodes];
  }
}

export function cloneClientPortalWorkspace(
  workspace: ClientPortalWorkspaceRecord,
): ClientPortalWorkspaceRecord {
  return JSON.parse(JSON.stringify(workspace)) as ClientPortalWorkspaceRecord;
}
