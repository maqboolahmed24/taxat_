/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type ClientApprovalPack = {
  "approval_pack_id": string;
  "artifact_type": "ClientApprovalPack";
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string | null;
  "title": string;
  "summary_ref": string;
  "change_highlights_ref": string;
  "declaration_text_ref": string;
  "approval_pack_hash": string;
  "view_guard_ref": string;
  "stale_protection_state": "CURRENT" | "REBASE_REQUIRED" | "SUPERSEDED" | "EXPIRED";
  "lifecycle_state": "DRAFT" | "READY_FOR_CLIENT" | "VIEWED" | "ACKNOWLEDGED" | "STEP_UP_REQUIRED" | "SIGNED" | "COUNTERSIGNED" | "EXPIRED" | "SUPERSEDED" | "CANCELLED";
  "requires_step_up": boolean;
  "viewed_at": ISO8601DateTimeString;
  "change_digest_acknowledged_at": ISO8601DateTimeString;
  "declaration_acknowledged_at": ISO8601DateTimeString;
  "acknowledged_at": ISO8601DateTimeString;
  "step_up_verified_at": ISO8601DateTimeString;
  "step_up_expires_at": ISO8601DateTimeString;
  "signed_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "approval_readiness_score": number;
  "recovery_posture": "NONE" | "INLINE_RESUME" | "RECONFIRM_INLINE" | "STALE_REVIEW_REQUIRED" | "STEP_UP_RETRY" | "HARD_RESET_REQUIRED" | "SUPPORT_REQUIRED";
  "dominant_hazard_code": string | null;
  "supersedes_pack_ref": string | null;
  "language_contract": PortalLanguageContract;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "CLIENT_APPROVAL_PACK";
    "projection_audience"?: "CLIENT_PORTAL";
  };
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "CLIENT_APPROVAL_PACK";
  };
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "CLIENT_APPROVAL_PACK";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "CLIENT_APPROVAL_PACK";
  };
};
export const ClientApprovalPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_approval_pack.schema.json", sourceHash: "ffc0b5884b0dab94cc27ad9cc85bd7d2ed3b5dabcca1e159388a01120d172b1f" } as const;

export type ClientCompatibilityMatrix = {
  "browser_rows"?: JsonValue;
} | {
  "macos_rows"?: JsonValue;
};
export const ClientCompatibilityMatrixSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_compatibility_matrix.schema.json", sourceHash: "f3f9d9ec2381f28c47a98f434db2cd0ae906d35cd2a2c8c8350b450306e625cf" } as const;

export type ClientCompatibilityMatrixMatrixRow = {
  "client_version": string;
  "scenario": "OLDEST_SUPPORTED_TO_CURRENT_SERVER" | "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER";
  "outcome": "COMPATIBLE" | "INCOMPATIBLE";
  "suite_result_ref": string;
};

export type ClientDocumentRequest = {
  "request_id": string;
  "artifact_type": "ClientDocumentRequest";
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string | null;
  "category": "IDENTITY" | "BANK_STATEMENT" | "INVOICE" | "RECEIPT" | "AUTHORITY_LETTER" | "OTHER";
  "title": string;
  "description_ref": string;
  "requested_file_types": Array<string>;
  "due_at": ISO8601DateTimeString;
  "lifecycle_state": "OPEN" | "UPLOAD_IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
  "required_count": number;
  "request_version_ref": string;
  "upload_refs": Array<string>;
  "latest_upload_ref": string | null;
  "current_request_upload_ref_or_null": string | null;
  "review_outcome": string | null;
  "assistance_mode": string | null;
  "language_contract": PortalLanguageContract;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "CLIENT_DOCUMENT_REQUEST";
    "projection_audience"?: "CLIENT_PORTAL";
  };
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
};
export const ClientDocumentRequestSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_document_request.schema.json", sourceHash: "85398a562c880754b21b13e9d4831d93e0df2c560821983a3b3517ab80eb1c27" } as const;

export type ClientOnboardingJourney = {
  "journey_id": string;
  "artifact_type": "ClientOnboardingJourney";
  "tenant_id": string;
  "client_id": string;
  "lifecycle_state": "INVITED" | "PROFILE_PENDING" | "IDENTITY_PENDING" | "AUTHORITY_LINK_PENDING" | "DOCUMENTS_PENDING" | "READY_FOR_REVIEW" | "COMPLETED" | "EXPIRED" | "ABANDONED";
  "current_step_code": "INVITE_ACCEPTANCE" | "PROFILE_CONFIRMATION" | "IDENTITY_VERIFICATION" | "AUTHORITY_LINK_SETUP" | "DOCUMENT_COLLECTION" | "REVIEW_CONFIRMATION" | null;
  "required_steps": Array<ClientOnboardingJourneyStepCode>;
  "completed_steps": Array<ClientOnboardingJourneyStepCode>;
  "verification_state": "NOT_STARTED" | "PENDING" | "VERIFIED" | "WAIVED" | "FAILED_RETRYABLE" | "FAILED_REVIEW_REQUIRED";
  "authority_link_requirement": "UNRESOLVED" | "REQUIRED" | "OPTIONAL" | "NOT_REQUIRED";
  "authority_link_state": "UNRESOLVED" | "PENDING" | "LINKED" | "WAIVED" | "NOT_REQUIRED";
  "document_request_refs": Array<string>;
  "help_channel_ref": string | null;
  "resume_state": "NONE" | "LIVE" | "RECONFIRMATION_REQUIRED" | "STALE_REVIEW_REQUIRED";
  "resume_step_code": "INVITE_ACCEPTANCE" | "PROFILE_CONFIRMATION" | "IDENTITY_VERIFICATION" | "AUTHORITY_LINK_SETUP" | "DOCUMENT_COLLECTION" | "REVIEW_CONFIRMATION" | null;
  "draft_upload_session_refs": Array<string>;
  "reconfirmation_step_codes": Array<ClientOnboardingJourneyStepCode>;
  "invited_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "completed_at": ISO8601DateTimeString;
  "completion_summary_ref": string | null;
  "completion_timeline_event_ref": string | null;
  "expires_at": ISO8601DateTimeString;
  "expired_at": ISO8601DateTimeString;
  "abandoned_at": ISO8601DateTimeString;
  "abandonment_reason_code": string | null;
  "language_contract": PortalLanguageContract;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "CLIENT_ONBOARDING_JOURNEY";
    "projection_audience"?: "CLIENT_PORTAL";
  };
};
export const ClientOnboardingJourneySchemaLineage = { schemaId: "https://taxat.dev/schemas/client_onboarding_journey.schema.json", sourceHash: "074aca6d593700df000b390594b693ffd20dc2a39daef8c06a480729f9a10444" } as const;

export type ClientOnboardingJourneyStepCode = "INVITE_ACCEPTANCE" | "PROFILE_CONFIRMATION" | "IDENTITY_VERIFICATION" | "AUTHORITY_LINK_SETUP" | "DOCUMENT_COLLECTION" | "REVIEW_CONFIRMATION";

export type ClientPortalWorkspace = {
  "navigation_tabs"?: JsonValue;
} & {
  "navigation_tabs"?: JsonValue;
} & {
  "navigation_tabs"?: JsonValue;
} & {
  "navigation_tabs"?: JsonValue;
} & {
  "navigation_tabs"?: JsonValue;
} & {
  "navigation_tabs"?: JsonValue;
} & {
  "task_groups"?: JsonValue;
} & {
  "task_groups"?: JsonValue;
} & {
  "task_groups"?: JsonValue;
};
export const ClientPortalWorkspaceSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_portal_workspace.schema.json", sourceHash: "fd0d29044ef9bc4a3865beca37e7365f19de90e07c8ef34e210b49a679bdd45e" } as const;

export type ClientPortalWorkspaceSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type ClientPortalWorkspaceRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type ClientPortalWorkspaceRouteCode = "HOME" | "DOCUMENTS" | "APPROVALS" | "ONBOARDING" | "HELP";

export type ClientPortalWorkspaceContextRouteCode = "NONE" | "REQUEST_DETAIL" | "APPROVAL_DETAIL" | "ONBOARDING_STEP" | "HELP_CONTEXT";

export type ClientPortalWorkspaceContextFallbackTarget = "LATEST_VISIBLE_OBJECT" | "RETURN_FOCUS_ANCHOR";

export type ClientPortalWorkspaceContextNarrowScreenMode = "STACKED_SAME_SHELL";

export type ClientPortalWorkspaceHelpSurfaceCode = "HELP_OPTIONS" | "TOP_QUESTIONS" | "CASE_CONTEXT_PANEL";

export type ClientPortalWorkspaceIdentityContext = {
  "client_display_name": string;
  "delegated_session": boolean;
  "acting_role_label": string | null;
  "period_label": string | null;
  "reassurance_line": string;
  "context_hash": string;
};

export type ClientPortalWorkspaceWorkspacePosture = {
  "connection_state": "CONNECTED" | "RECONNECTING" | "CATCHING_UP" | "STALE" | "DEGRADED";
  "interaction_posture": "MUTATING_ALLOWED" | "REVIEW_REQUIRED" | "READ_ONLY_LIMITED";
  "promoted_support_region": "NONE" | "DRAFT_RESUME" | "LIMITATION_NOTICE" | "SUPPORT_PANEL";
  "notice_headline": string | null;
  "notice_detail": string | null;
  "full_text_ref": string | null;
};

export type ClientPortalWorkspaceRouteContext = {
  "context_route": ClientPortalWorkspaceContextRouteCode;
  "context_object_ref": string | null;
  "return_route": ClientPortalWorkspaceRouteCode | null;
  "focus_anchor_ref": string | null;
  "focus_restoration": FocusRestorationContract;
  "artifact_focus_bucket_or_null": "PRIMARY" | "HISTORY" | "LIMITATION_NOTICE" | null;
  "artifact_focus_subject_ref_or_null": string | null;
  "return_focus_anchor_ref_or_null": string | null;
  "fallback_target": ClientPortalWorkspaceContextFallbackTarget | null;
  "fallback_object_ref_or_null": string | null;
  "fallback_reason_ref_or_null": string | null;
  "narrow_screen_mode": ClientPortalWorkspaceContextNarrowScreenMode | null;
};

export type ClientPortalWorkspaceActionToken = {
  "action_code": string;
  "label": string;
  "route": ClientPortalWorkspaceRouteCode;
  "requires_step_up"?: boolean;
  "context_object_ref"?: string | null;
  "focus_anchor_ref"?: string | null;
};

export type ClientPortalWorkspaceDraftResume = {
  "draft_state": "NONE" | "ACTIVE" | "REBASED" | "STALE_REVIEW_REQUIRED";
  "draft_kind": "NONE" | "UPLOAD" | "APPROVAL" | "ONBOARDING";
  "draft_object_ref": string | null;
  "resume_route": ClientPortalWorkspaceRouteCode | null;
  "last_saved_at": ISO8601DateTimeString;
  "rebase_target_ref": string | null;
};

export type ClientPortalWorkspaceLimitationNotice = {
  "limitation_code": "MASKED_DETAILS" | "WITHHELD_DOCUMENT" | "PENDING_AUTHORITY_CONFIRMATION" | "ROLE_RESTRICTED" | "STALE_REVIEW_REQUIRED" | "DEGRADED_DATA";
  "headline": string;
  "detail"?: string | null;
  "affected_route": ClientPortalWorkspaceRouteCode;
  "affected_object_ref"?: string | null;
  "blocking": boolean;
};

export type ClientPortalWorkspaceNavigationTab = {
  "label": string;
  "route": ClientPortalWorkspaceRouteCode;
  "active": boolean;
  "badge_count"?: number | null;
};

export type ClientPortalWorkspaceProgressStep = {
  "step_code": string;
  "label": string;
  "state": "COMPLETED" | "CURRENT" | "UPCOMING";
};

export type ClientPortalWorkspaceReliabilitySummary = {
  "surface_class": "MOBILE" | "TABLET" | "DESKTOP";
  "network_posture": "HEALTHY" | "WEAK" | "UNSTABLE" | "OFFLINE_RECOVERING";
  "dominant_flow_kind": "UPLOAD" | "APPROVAL" | "ONBOARDING" | "GENERAL_NAVIGATION" | "WAITING";
  "flow_stability_score": number;
  "risk_weighted_friction_score": number;
  "completion_probability": number;
  "recovery_posture": "NONE" | "INLINE_RESUME" | "RECONFIRM_INLINE" | "STALE_REVIEW_REQUIRED" | "STEP_UP_RETRY" | "HARD_RESET_REQUIRED" | "SUPPORT_REQUIRED";
  "dominant_abort_hazard_code": string | null;
};

export type ClientPortalWorkspaceStatusHero = {
  "status_code": "ACTION_REQUIRED" | "IN_REVIEW" | "WAITING_ON_US" | "WAITING_ON_AUTHORITY" | "READY_TO_SIGN" | "COMPLETED" | "ONBOARDING_REQUIRED";
  "headline": string;
  "supporting_text": string;
  "due_label"?: string | null;
  "primary_action": ClientPortalWorkspaceActionToken | null;
  "secondary_action"?: null;
  "progress_steps": Array<ClientPortalWorkspaceProgressStep>;
};

export type ClientPortalWorkspaceTask = {
  "task_id": string;
  "task_type": "UPLOAD_DOCUMENT" | "ANSWER_QUESTION" | "VERIFY_IDENTITY" | "CONNECT_AUTHORITY" | "REVIEW_SUMMARY" | "SIGN_DECLARATION" | "REQUEST_HELP";
  "label": string;
  "description"?: string | null;
  "status": "OPEN" | "WAITING" | "DONE";
  "due_at"?: ISO8601DateTimeString;
  "effort_label"?: string | null;
  "route": ClientPortalWorkspaceRouteCode;
  "primary_action": ClientPortalWorkspaceActionToken;
};

export type ClientPortalWorkspaceTaskGroup = {
  "group_code": "DO_NOW" | "COMING_UP" | "DONE";
  "label": string;
  "tasks": Array<ClientPortalWorkspaceTask>;
};

export type ClientPortalWorkspaceUploadItem = {
  "upload_session_id": string;
  "request_version_ref": string;
  "upload_request_binding_contract": UploadRequestBindingContract;
  "request_binding_state": "ORIGINAL_CURRENT" | "RECONFIRMED_CURRENT" | "RECONFIRMATION_REQUIRED" | "SUPERSEDED";
  "resumability_state": "RESUMABLE" | "RESTART_REQUIRED" | "CLOSED";
  "attachment_state": "STAGED" | "CONFIRMATION_REQUIRED" | "ATTACHED" | "REBIND_REQUIRED";
  "filename": string;
  "transfer_state": "QUEUED" | "UPLOADING" | "SCANNING" | "ACCEPTED" | "REJECTED" | "FAILED";
  "status_phase": "TRANSFER" | "SCAN" | "VALIDATION" | "ACCEPTANCE" | "REJECTION" | "RETRY";
  "history_state": "IN_PROGRESS" | "CURRENT" | "SUPERSEDED" | "REJECTED" | "FAILED";
  "download_ref": string | null;
  "preview_posture": "SAME_SHELL_PREVIEW" | "DOWNLOAD_ONLY" | "NOT_AVAILABLE";
  "preview_reason_code": "TRANSFER_IN_PROGRESS" | "SCAN_PENDING" | "FORMAT_UNSUPPORTED" | "QUARANTINED" | "REPLACEMENT_REQUIRED" | "RETRY_REQUIRED" | "POLICY_LIMITED" | null;
  "uploaded_at"?: ISO8601DateTimeString;
  "next_action_code": "NONE" | "RESUME_UPLOAD" | "CONFIRM_ATTACHMENT" | "RECONFIRM_REQUEST" | "RETRY_UPLOAD" | "UPLOAD_REPLACEMENT" | "CONTACT_SUPPORT";
  "upload_confidence_score": number;
  "recovery_posture": "NONE" | "INLINE_RESUME" | "RECONFIRM_INLINE" | "STALE_REVIEW_REQUIRED" | "STEP_UP_RETRY" | "HARD_RESET_REQUIRED" | "SUPPORT_REQUIRED";
  "dominant_hazard_code": string | null;
};

export type ClientPortalWorkspaceDocumentRequest = {
  "request_id": string;
  "request_version_ref": string;
  "category": "IDENTITY" | "BANK_STATEMENT" | "INVOICE" | "RECEIPT" | "AUTHORITY_LETTER" | "OTHER";
  "title": string;
  "why_requested_label": string;
  "status": "OPEN" | "UPLOADING" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  "due_at"?: ISO8601DateTimeString;
  "due_label": string;
  "help_text"?: string | null;
  "accepted_file_types": Array<string>;
  "max_file_size_mb": number;
  "uploads": Array<ClientPortalWorkspaceUploadItem>;
  "current_upload_ref": string | null;
  "current_artifact_upload_ref": string | null;
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "CLIENT_DOCUMENT_REQUEST";
  };
};

export type ClientPortalWorkspaceDocumentCenter = {
  "summary_label": string;
  "surface_order": ["DOCUMENT_INBOX","UPLOAD_PANEL","UPLOAD_STATUS_LIST","DOCUMENT_HISTORY"];
  "upload_affordances": ["BROWSE","DRAG_DROP","CAMERA_CAPTURE"];
  "status_phase_order": ["TRANSFER","SCAN","VALIDATION","ACCEPTANCE","REJECTION","RETRY"];
  "open_request_count": number;
  "requests": Array<ClientPortalWorkspaceDocumentRequest>;
  "last_uploaded_at"?: ISO8601DateTimeString;
};

export type ClientPortalWorkspaceApprovalPack = {
  "approval_pack_id": string;
  "title": string;
  "status": "READY_FOR_CLIENT" | "VIEWED" | "ACKNOWLEDGED" | "STEP_UP_REQUIRED" | "SIGNED" | "EXPIRED" | "SUPERSEDED";
  "due_at"?: ISO8601DateTimeString;
  "summary": string;
  "change_highlight_count": number;
  "change_digest_summary": string;
  "change_highlights_ref": string;
  "stale_protection_state": "CURRENT" | "REBASE_REQUIRED" | "SUPERSEDED" | "EXPIRED";
  "requires_step_up": boolean;
  "declaration_text_ref": string;
  "declaration_download_ref": string;
  "declaration_print_ref": string;
  "change_digest_acknowledged": boolean;
  "declaration_acknowledged": boolean;
  "approval_acknowledged": boolean;
  "sign_off_state": "REVIEW_REQUIRED" | "STEP_UP_CHECKPOINT" | "READY_TO_SIGN" | "SIGNATURE_PENDING_SETTLEMENT" | "STALE_REVIEW_REQUIRED" | "SIGNED_RECEIPT";
  "step_up_surface": "NOT_REQUIRED" | "INLINE_CHECKPOINT";
  "step_up_checkpoint_state": "NOT_REQUIRED" | "REQUIRED" | "SATISFIED";
  "approval_readiness_score": number;
  "recovery_posture": "NONE" | "INLINE_RESUME" | "RECONFIRM_INLINE" | "STALE_REVIEW_REQUIRED" | "STEP_UP_RETRY" | "HARD_RESET_REQUIRED" | "SUPPORT_REQUIRED";
  "dominant_hazard_code": string | null;
  "sign_command_receipt_ref": string | null;
  "receipt_state": "NOT_ISSUED" | "PENDING_SETTLEMENT" | "ISSUED";
  "settlement_pending_label": string | null;
  "receipt_ref": string | null;
  "receipt_download_ref": string | null;
  "receipt_print_ref": string | null;
  "receipt_issued_at": ISO8601DateTimeString;
  "receipt_next_step_label": string | null;
  "superseded_by_pack_ref": string | null;
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "CLIENT_APPROVAL_PACK";
  };
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "CLIENT_APPROVAL_PACK";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "CLIENT_APPROVAL_PACK";
  };
  "primary_action": ClientPortalWorkspaceActionToken & {
    "route": "APPROVALS";
    "context_object_ref": string;
  };
};

export type ClientPortalWorkspaceApprovalCenter = {
  "surface_order": ["APPROVAL_SUMMARY","CHANGE_DIGEST","DECLARATION_PANEL","SIGN_OFF_PANEL"];
  "outstanding_count": number;
  "latest_pack_ref": string | null;
  "packs": Array<ClientPortalWorkspaceApprovalPack>;
};

export type ClientPortalWorkspaceOnboardingStepCode = "INVITE_ACCEPTANCE" | "PROFILE_CONFIRMATION" | "IDENTITY_VERIFICATION" | "AUTHORITY_LINK_SETUP" | "DOCUMENT_COLLECTION" | "REVIEW_CONFIRMATION";

export type ClientPortalWorkspaceOnboardingJourney = {
  "journey_id": string;
  "surface_order": ["WELCOME_PANEL","ONBOARDING_STEPPER","STEP_WORKSPACE","SUPPORT_PANEL"];
  "state": "INVITED" | "PROFILE_PENDING" | "IDENTITY_PENDING" | "AUTHORITY_LINK_PENDING" | "DOCUMENTS_PENDING" | "READY_FOR_REVIEW" | "COMPLETED" | "EXPIRED" | "ABANDONED";
  "current_step_code": ClientPortalWorkspaceOnboardingStepCode | null;
  "current_step_label": string | null;
  "completed_step_count": number;
  "total_step_count": number;
  "resume_state": "NONE" | "LIVE" | "RECONFIRMATION_REQUIRED" | "STALE_REVIEW_REQUIRED";
  "resume_step_code": ClientPortalWorkspaceOnboardingStepCode | null;
  "reconfirmation_step_codes": Array<ClientPortalWorkspaceOnboardingStepCode>;
  "step_workspace_state": "ACTIVE_STEP" | "RECONFIRMATION_REVIEW" | "STALE_REVIEW" | "COMPLETION_SUMMARY" | "EXIT_SUPPORT";
  "save_return_state": "AVAILABLE" | "NOT_AVAILABLE_IRREVERSIBLE" | "NOT_AVAILABLE_TERMINAL";
  "save_and_return_action": ClientPortalWorkspaceActionToken | null;
  "next_action": ClientPortalWorkspaceActionToken;
  "completion_summary_ref": string | null;
  "completion_next_steps_ref": string | null;
  "completed_at": ISO8601DateTimeString;
  "expired_at": ISO8601DateTimeString;
  "abandoned_at": ISO8601DateTimeString;
  "abandonment_reason_code": string | null;
};

export type ClientPortalWorkspaceContactOption = {
  "channel_code": "SECURE_MESSAGE" | "CALLBACK" | "APPOINTMENT" | "FAQ";
  "label": string;
  "availability_label"?: string | null;
  "action": ClientPortalWorkspaceActionToken;
};

export type ClientPortalWorkspaceCaseContextPanel = {
  "context_summary_ref": string;
  "carried_context_refs": Array<string>;
  "linked_request_info_ref": string | null;
  "linked_object_ref": string | null;
  "focus_anchor_ref": string;
  "restate_required": false;
  "recommended_channel_code": "SECURE_MESSAGE" | "CALLBACK" | "APPOINTMENT" | "FAQ";
};

export type ClientPortalWorkspaceSupportPanel = {
  "contact_options"?: JsonValue;
} | {
  "secure_message_allowed"?: true;
} | {
  "faq_refs"?: JsonValue;
};

export type ClientPortalWorkspaceTimelineEvent = {
  "event_id": string;
  "event_kind": "UPLOAD_RECEIVED" | "UPLOAD_REJECTED" | "APPROVAL_READY" | "APPROVAL_SIGNED" | "ONBOARDING_STEP_COMPLETED" | "SUBMISSION_SENT" | "STATUS_UPDATED";
  "headline": string;
  "detail"?: string | null;
  "occurred_at": ISO8601DateTimeString;
};

export type ClientTimelineEvent = {
  "event_id": string;
  "artifact_type": "ClientTimelineEvent";
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string | null;
  "event_kind": "UPLOAD_RECEIVED" | "UPLOAD_REJECTED" | "APPROVAL_READY" | "APPROVAL_SIGNED" | "ONBOARDING_STEP_COMPLETED" | "SUBMISSION_SENT" | "STATUS_UPDATED";
  "headline": string;
  "detail_ref": string | null;
  "occurred_at": ISO8601DateTimeString;
  "visible_to_client": true;
  "related_object_ref": string | null;
  "language_contract": PortalLanguageContract;
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "CLIENT_TIMELINE_EVENT";
    "truth_surface_role"?: "CUSTOMER_SAFE_STATUS_PROJECTION";
    "surface_specific_binding_policy"?: "TIMELINE_IS_CUSTOMER_SAFE_AND_EXPLICIT_ABOUT_AUTHORITY_STATE";
  };
  "authority_truth_state": "NOT_APPLICABLE" | "NOT_REQUESTED" | "UNKNOWN" | "PENDING_ACK" | "PARTIAL_ACK" | "CONFIRMED" | "REJECTED" | "OUT_OF_BAND";
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "CLIENT_TIMELINE_EVENT";
    "projection_audience"?: "CLIENT_PORTAL";
  };
};
export const ClientTimelineEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_timeline_event.schema.json", sourceHash: "394ff4411a746a2f7d3ef3bec12cba6b0d959f3c4b0d565f1d21b284d4ceb901" } as const;

export type ClientUploadSession = {
  "upload_session_id": string;
  "artifact_type": "ClientUploadSession";
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string | null;
  "request_id": string;
  "request_version_ref": string;
  "upload_request_binding_contract": UploadRequestBindingContract;
  "request_binding_state": "ORIGINAL_CURRENT" | "RECONFIRMED_CURRENT" | "RECONFIRMATION_REQUIRED" | "SUPERSEDED";
  "initiated_by": string;
  "storage_ref": string;
  "filename": string;
  "media_type": string;
  "byte_count": number;
  "checksum": string;
  "surface_class": "MOBILE" | "TABLET" | "DESKTOP";
  "capture_mode": "BROWSE" | "DRAG_DROP" | "CAMERA" | "SYSTEM_SHARE";
  "bytes_transferred": number;
  "retry_count": number;
  "resume_attempt_count": number;
  "resume_success_count": number;
  "integrity_state": "PENDING" | "VERIFIED" | "FAILED";
  "transfer_state": "QUEUED" | "UPLOADING" | "SCANNING" | "ACCEPTED" | "REJECTED" | "FAILED";
  "malware_scan_state": "PENDING" | "CLEAN" | "QUARANTINED";
  "validation_state": "PENDING" | "ACCEPTED" | "REJECTED" | "REQUIRES_REPLACEMENT";
  "resumability_state": "RESUMABLE" | "RESTART_REQUIRED" | "CLOSED";
  "resume_token_ref": string | null;
  "attachment_state": "STAGED" | "CONFIRMATION_REQUIRED" | "ATTACHED" | "REBIND_REQUIRED";
  "attached_document_ref": string | null;
  "outcome_reason_code": string | null;
  "next_action_code": "NONE" | "RESUME_UPLOAD" | "CONFIRM_ATTACHMENT" | "RECONFIRM_REQUEST" | "RETRY_UPLOAD" | "UPLOAD_REPLACEMENT" | "CONTACT_SUPPORT";
  "submitted_at": ISO8601DateTimeString;
  "transfer_started_at": ISO8601DateTimeString;
  "last_activity_at": ISO8601DateTimeString;
  "scan_completed_at": ISO8601DateTimeString;
  "validation_completed_at": ISO8601DateTimeString;
  "finalized_at": ISO8601DateTimeString;
  "attachment_confirmed_at": ISO8601DateTimeString;
  "reconfirmed_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "upload_confidence_score": number;
  "recovery_posture": "NONE" | "INLINE_RESUME" | "RECONFIRM_INLINE" | "STALE_REVIEW_REQUIRED" | "STEP_UP_RETRY" | "HARD_RESET_REQUIRED" | "SUPPORT_REQUIRED";
  "dominant_hazard_code": string | null;
};
export const ClientUploadSessionSchemaLineage = { schemaId: "https://taxat.dev/schemas/client_upload_session.schema.json", sourceHash: "fdddce78ce8db065d6443d6674cb535f0b1276ff926211fe1bd0272758179552" } as const;

export type CollaborationActivitySlice = {
  "artifact_type": "CollaborationActivitySlice";
  "item_id": string;
  "workspace_route_key": string;
  "viewer_scope": "STAFF_FULL" | "CUSTOMER_VISIBLE";
  "thread_visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "workspace_version": number;
  "shell_stability_token": string;
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "COLLABORATION_ACTIVITY_SLICE";
  };
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "COLLABORATION_ACTIVITY_SLICE";
    "projection_audience"?: "CUSTOMER_COLLABORATION";
  } | null;
  "active_filters": CollaborationActivitySliceActiveFilters;
  "head_sequence": number;
  "newest_returned_sequence_or_null": number | null;
  "oldest_returned_sequence_or_null": number | null;
  "next_before_sequence_or_null": number | null;
  "has_more_before": boolean;
  "focus_anchor_ref_or_null": string | null;
  "entry_refs": Array<string>;
  "latest_workspace_snapshot_ref": string;
  "returned_at": ISO8601DateTimeString;
};
export const CollaborationActivitySliceSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_activity_slice.schema.json", sourceHash: "0440134b8b268183385279b5fd5ef4cc72a0743170adf10473d2c4714d4eb23f" } as const;

export type CollaborationActivitySliceActiveFilters = {
  "thread_visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "request_info_ref_or_null": string | null;
  "include_system_entries": boolean;
  "before_sequence_or_null": number | null;
};

export type CollaborationAttachment = {
  "artifact_type": "CollaborationAttachment";
  "attachment_id": string;
  "item_id": string;
  "published_entry_ref": string;
  "current_state_entry_ref": string;
  "state_audit_event_ref": string;
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "request_info_ref": string | null;
  "upload_session_id": string;
  "publish_copy_mode": "DIRECT_UPLOAD" | "CUSTOMER_SAFE_COPY" | "CUSTOMER_SAFE_DERIVATIVE";
  "source_attachment_ref": string | null;
  "filename": string;
  "media_type": string;
  "byte_size": number;
  "checksum": string;
  "storage_ref": string;
  "download_ref": string | null;
  "malware_scan_state": "PENDING" | "CLEAN" | "QUARANTINED";
  "publication_state": "PENDING_SCAN" | "AVAILABLE" | "QUARANTINED";
  "download_state": "PENDING" | "DOWNLOADABLE" | "UNAVAILABLE";
  "unavailable_reason_code": "SCAN_PENDING" | "QUARANTINED_BY_MALWARE_SCAN" | null;
  "uploaded_by_ref": string;
  "uploaded_at": ISO8601DateTimeString;
  "published_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "scan_completed_at": ISO8601DateTimeString;
  "semantic_action_id": string;
  "retention_class": string;
};
export const CollaborationAttachmentSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_attachment.schema.json", sourceHash: "f8d97e1fe2bb45987dcc9f2a3db9cb0d28204f453fd99d2918e9ef9699de09d7" } as const;

export type CollaborationAttachmentSlice = {
  "artifact_type": "CollaborationAttachmentSlice";
  "item_id": string;
  "workspace_route_key": string;
  "viewer_scope": "STAFF_FULL" | "CUSTOMER_VISIBLE";
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "workspace_version": number;
  "shell_stability_token": string;
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "COLLABORATION_ATTACHMENT_SLICE";
  };
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "COLLABORATION_ATTACHMENT_SLICE";
    "projection_audience"?: "CUSTOMER_COLLABORATION";
  } | null;
  "active_filters": CollaborationAttachmentSliceActiveFilters;
  "focus_anchor_ref_or_null": string | null;
  "current_attachment_refs": Array<string>;
  "historical_attachment_refs": Array<string>;
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "COLLABORATION_ATTACHMENT_SLICE";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "COLLABORATION_ATTACHMENT_SLICE";
  };
  "latest_workspace_snapshot_ref": string;
  "returned_at": ISO8601DateTimeString;
};
export const CollaborationAttachmentSliceSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_attachment_slice.schema.json", sourceHash: "036d2cb7dafe1541e284cea12b57d74ca84e94608c0063d16a6a2d58d9ed8dcc" } as const;

export type CollaborationAttachmentSliceActiveFilters = {
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "request_info_ref_or_null": string | null;
  "include_history": boolean;
  "include_pending_placeholders": boolean;
};

export type CollaborationEntry = {
  "entry_id": string;
  "item_id": string;
  "thread_id": string;
  "thread_sequence": number;
  "entry_type": "COMMENT" | "NOTE" | "STATUS_CHANGE" | "ASSIGNMENT_CHANGE" | "ESCALATION" | "REQUEST_INFO" | "REQUEST_INFO_RESPONSE" | "ATTACHMENT_ONLY" | "SYSTEM";
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "causal_parent_entry_ref": string | null;
  "body_ref": string | null;
  "attachment_refs": Array<string>;
  "actor_ref": string;
  "created_at": ISO8601DateTimeString;
  "command_id": string;
  "semantic_action_id": string;
  "command_receipt_ref": string;
  "audit_event_ref": string;
  "request_info_ref": string | null;
  "redaction_state": "NONE" | "REDACTED";
};
export const CollaborationEntrySchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_entry.schema.json", sourceHash: "5f16f8f72a8d6d74606a69bab0094e0685e2794dd9b402c8a0ae1abf19279eb8" } as const;

export type CollaborationQueueProjectionContract = {
  "projection_scope": "WORK_INBOX_ROW" | "WORKSPACE_QUEUE_PROJECTION" | "WORKSPACE_STREAM_EVENT" | "WORK_ITEM_NOTIFICATION";
  "basis_hash": string;
  "routing_contract": CollaborationRoutingContract;
  "latest_change_lane_or_null": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY" | "MIXED_VISIBLE" | null;
  "customer_unread_count": number;
  "internal_unread_count_or_null": number | null;
  "customer_activity_module_badge_count": number;
  "internal_activity_module_badge_count_or_null": number | null;
  "canonical_sort_key": {
    "collaboration_priority_score": number;
    "escalation_rank": number;
    "effective_due_at_or_null": ISO8601DateTimeString;
    "resolution_confidence_score": number;
    "queue_entered_at": ISO8601DateTimeString;
    "item_id": string;
  };
  "focus_continuity_state": "STABLE" | "PENDING_REORDER_UNTIL_FOCUS_EXIT" | "PENDING_REMOVAL_UNTIL_FOCUS_EXIT";
  "filter_membership_state": "IN_ACTIVE_FILTER_SET" | "FILTER_EXIT_PENDING_FOCUS_RELEASE" | "OUT_OF_FILTER_SET";
  "notification_target_module_code_or_null": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | null;
};
export const CollaborationQueueProjectionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json", sourceHash: "faee41ad3d85a1b29c9e7be58468a2f7698f99d279be4a0ffcf70cf4ce051227" } as const;

export type CollaborationRoutingContract = {
  "contract_version": "COLLABORATION_ROUTING_V1";
  "routing_scope": "WORKFLOW_ITEM" | "WORK_INBOX_ROW" | "WORKSPACE_QUEUE_PROJECTION" | "WORKSPACE_STREAM_EVENT" | "WORK_ITEM_NOTIFICATION";
  "routing_profile_code": "COLLABORATION_ROUTING_FORMULA_V1";
  "routing_profile_hash": string;
  "routing_queue_ref": string;
  "basis_hash": string;
  "canonical_sort_key": {
    "collaboration_priority_score": number;
    "escalation_rank": number;
    "effective_due_at_or_null": ISO8601DateTimeString;
    "resolution_confidence_score": number;
    "queue_entered_at": ISO8601DateTimeString;
    "item_id": string;
  };
  "assignment_efficiency_score": number;
  "ownership_confidence_score": number;
  "sla_pressure_score": number;
  "escalation_pressure_score": number;
  "escalation_pressure_threshold": number;
  "reassignment_gain_threshold": number;
  "resolution_confidence_score": number;
  "resolution_confidence_floor": number;
  "queue_health_score": number;
  "queue_pressure_score": number;
  "queue_health_floor": number;
  "queue_health_state": "HEALTHY" | "DEGRADED" | "SATURATED";
  "escalation_rank": number;
  "collaboration_priority_score": number;
  "assignment_recommendation_state": "KEEP_CURRENT_OWNER" | "ASSIGN_RECOMMENDED" | "REASSIGN_RECOMMENDED" | "NO_ELIGIBLE_OWNER";
  "recommended_assignee_ref_or_null": string | null;
  "escalation_recommendation_state": "NO_ESCALATION" | "ESCALATE_RECOMMENDED" | "ESCALATED_ACTIVE" | "MANUAL_REVIEW_REQUIRED";
  "recommended_escalation_target_ref_or_null": string | null;
  "recommended_action_code_or_null": string | null;
  "focused_row_reorder_state": "APPLY_IMMEDIATELY" | "DEFER_REORDER_UNTIL_FOCUS_EXIT";
  "draft_safety_state": "NO_DRAFT_LOCK" | "DRAFT_LOCK_PREVENTS_TRANSFER" | "COMMAND_PENDING_PREVENTS_TRANSFER";
  "ordering_reason_codes": Array<string>;
  "recommendation_reason_codes": Array<string>;
};
export const CollaborationRoutingContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_routing_contract.schema.json", sourceHash: "0c282041910d617200386bd615b00e91396767e7b51d886177832f355ea0909d" } as const;

export type CollaborationThread = {
  "thread_id": string;
  "item_id": string;
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "head_sequence": number;
  "lifecycle_state": "OPEN" | "CLOSED" | "LIMITED";
  "participant_refs": Array<string>;
  "last_entry_ref": string | null;
};
export const CollaborationThreadSchemaLineage = { schemaId: "https://taxat.dev/schemas/collaboration_thread.schema.json", sourceHash: "4241551fc3d68764f6f82cb53ba6a83f69ce2e3185bc4501e4fd504c7ba58231" } as const;

export type CustomerRequestListSnapshot = {
  "artifact_type": "CustomerRequestListSnapshot";
  "tenant_id": string;
  "client_id": string;
  "shell_family": "CLIENT_PORTAL_SHELL";
  "request_list_route_key": string;
  "object_anchor_ref": string;
  "dominant_question": string;
  "language_contract": PortalLanguageContract;
  "settlement_state": CustomerRequestListSnapshotSettlementState;
  "recovery_posture": CustomerRequestListSnapshotRecoveryPosture;
  "interaction_layer": PortalInteractionLayer;
  "row_band_order": ["REQUEST_IDENTITY","STATUS_AND_DUE","REQUEST_ACTION"];
  "queue_group_order": ["ACTION_REQUIRED","IN_REVIEW","WAITING_ON_US","WAITING_ON_AUTHORITY","COMPLETED"];
  "active_filters": CustomerRequestListSnapshotActiveFilters;
  "list_version": number;
  "last_published_sequence": number;
  "resume_token": string;
  "cache_isolation_contract": CacheIsolationContract & {
    "cache_scope_class"?: "CUSTOMER_REQUEST_LIST";
  };
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "CUSTOMER_REQUEST_LIST";
  };
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "CUSTOMER_REQUEST_LIST";
    "projection_audience"?: "CLIENT_PORTAL";
  };
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "rows": Array<CustomerRequestListSnapshotRequestRow>;
  "selected_item_ref_or_null": string | null;
  "selected_focus_anchor_ref_or_null": string | null;
  "updated_at": ISO8601DateTimeString;
};
export const CustomerRequestListSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/customer_request_list_snapshot.schema.json", sourceHash: "7a4872905f3e52ee333128546dadd28ab8ea4633757487d553675605d1c83fe2" } as const;

export type CustomerRequestListSnapshotSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type CustomerRequestListSnapshotRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type CustomerRequestListSnapshotStatusCode = "ACTION_REQUIRED" | "IN_REVIEW" | "WAITING_ON_US" | "WAITING_ON_AUTHORITY" | "COMPLETED";

export type CustomerRequestListSnapshotDueState = "NONE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";

export type CustomerRequestListSnapshotArtifactHistoryState = "NO_SHARED_FILES" | "CURRENT_ONLY" | "CURRENT_PLUS_HISTORY" | "HISTORY_ONLY" | "LIMITED";

export type CustomerRequestListSnapshotActiveFilters = {
  "status_codes": Array<CustomerRequestListSnapshotStatusCode>;
  "due_states": Array<CustomerRequestListSnapshotDueState>;
  "unread_only": boolean;
  "files_requested_only": boolean;
};

export type CustomerRequestListSnapshotRequestRow = {
  "item_id": string;
  "focus_anchor_ref": string;
  "title": string;
  "status_code": CustomerRequestListSnapshotStatusCode;
  "status_label_ref": string;
  "due_state": CustomerRequestListSnapshotDueState;
  "due_at_or_null": ISO8601DateTimeString;
  "due_label_ref_or_null": string | null;
  "unread_count": number;
  "last_staff_update_at_or_null": ISO8601DateTimeString;
  "files_requested": boolean;
  "primary_action_code_or_null": "REPLY" | "UPLOAD_FILE" | "RESPOND_TO_REQUEST_INFO" | null;
  "primary_action_label_ref_or_null": string | null;
  "no_safe_action_reason_ref_or_null": string | null;
  "authoritative_action": ActionAuthorityContract & {
    "projection_scope"?: "CUSTOMER_REQUEST_ROW";
  };
  "artifact_history_state": CustomerRequestListSnapshotArtifactHistoryState;
  "current_artifact_ref_or_null": string | null;
  "historical_artifact_refs": Array<string>;
};

export type CustomerSafeProjectionContract = {
  "contract_version": "CUSTOMER_SAFE_PROJECTION_V1";
  "boundary_scope": "CLIENT_PORTAL_WORKSPACE" | "CUSTOMER_REQUEST_LIST" | "COLLABORATION_ACTIVITY_SLICE" | "COLLABORATION_ATTACHMENT_SLICE" | "WORKSPACE_STREAM_EVENT" | "CLIENT_DOCUMENT_REQUEST" | "CLIENT_APPROVAL_PACK" | "CLIENT_ONBOARDING_JOURNEY" | "CLIENT_TIMELINE_EVENT" | "WORKSPACE_CUSTOMER_REQUEST" | "WORK_ITEM_NOTIFICATION";
  "projection_audience": "CLIENT_PORTAL" | "CUSTOMER_COLLABORATION";
  "shell_family": "CLIENT_PORTAL_SHELL";
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "visibility_cache_partition_key": string;
  "status_derivation_policy": "CUSTOMER_SAFE_BLOCKS_ONLY";
  "staff_field_dependency_policy": "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE";
  "plain_language_status_policy": "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY";
  "plain_language_action_policy": "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY";
  "limitation_notice_policy": "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED";
  "recovery_explanation_policy": "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED";
  "artifact_history_policy": "CURRENT_VERSUS_HISTORY_EXPLICIT";
  "hidden_activity_policy": "NO_HIDDEN_ACTIVITY_DERIVATION";
  "module_projection_policy": "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY";
  "attachment_visibility_policy": "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY";
  "live_update_visibility_policy": "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED";
  "draft_placeholder_policy": "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS";
  "notification_navigation_policy": "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY";
  "export_visibility_policy": "CUSTOMER_VISIBLE_EXPORTS_ONLY";
  "blocked_staff_signal_classes": Array<CustomerSafeProjectionContractBlockedSignalClass>;
};
export const CustomerSafeProjectionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json", sourceHash: "509f152350698005aec20351981b8db2a0f7b81ff78cd65139dcc2cbf436dbb3" } as const;

export type CustomerSafeProjectionContractBlockedSignalClass = "ASSIGNMENT_STATE" | "ESCALATION_LOGIC" | "RAW_GATE_STATE" | "STAFF_REASON_CODES" | "AUDIT_LINEAGE" | "INTERNAL_ACTIVITY" | "INTERNAL_ATTACHMENTS" | "INTERNAL_PARTICIPANTS" | "INTERNAL_COUNTS" | "STAFF_ROUTE_CONTEXT";

export type PortalHelpRequest = {
  "artifact_type": "PortalHelpRequest";
  "help_request_id": string;
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string | null;
  "item_id": string | null;
  "request_info_ref": string | null;
  "source_focus_anchor_ref": string;
  "source_route": "HOME" | "DOCUMENTS" | "APPROVALS" | "ONBOARDING" | "HELP" | "REQUEST_DETAIL";
  "support_channel": "PORTAL_HELP" | "CONTEXTUAL_REQUEST";
  "reason_family": "STATUS_QUESTION" | "DOCUMENT_HELP" | "APPROVAL_HELP" | "ONBOARDING_HELP" | "ACCESS_HELP" | "GENERAL_HELP";
  "subject_line": string;
  "body_ref": string;
  "case_context_refs": Array<string>;
  "opened_by_ref": string;
  "lifecycle_state": "OPEN" | "ACKNOWLEDGED" | "RESPONDED" | "CLOSED";
  "opened_at": ISO8601DateTimeString;
  "acknowledged_at": ISO8601DateTimeString;
  "response_ref": string | null;
  "responded_at": ISO8601DateTimeString;
  "closed_at": ISO8601DateTimeString;
};
export const PortalHelpRequestSchemaLineage = { schemaId: "https://taxat.dev/schemas/portal_help_request.schema.json", sourceHash: "a1ca4f1acd72c786999e88d9a56c3b3c07e2b2f956477db3fb3cb8d69e585c05" } as const;

export type PortalInteractionLayer = {
  "foundation_contract": InteractionLayerFoundationContract & {
    "shell_family"?: "CLIENT_PORTAL_SHELL";
  };
  "navigation_model": "TOP_LEVEL_TABS_CONTEXTUAL_DETAIL";
  "spacing_profile": "COMFORTABLE_TASK_FIRST";
  "status_language_profile": "PLAIN_LITERAL_CLIENT_SAFE";
  "selector_profile": "PORTAL_SEMANTIC_SELECTORS_V1";
  "support_region_policy": "ONE_PROMOTED_REGION_MAX";
  "route_continuity_policy": "SAME_SHELL_CONTEXTUAL_RETURN";
  "focus_restoration_policy": "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE";
  "artifact_hierarchy_policy": "CURRENT_PRIMARY_HISTORY_SECONDARY";
  "responsive_detail_policy": "STACK_SUPPORT_BELOW_PRIMARY";
  "motion_profile": "SUBTLE_CAUSAL_ONLY";
  "feedback_truth_policy": "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};
export const PortalInteractionLayerSchemaLineage = { schemaId: "https://taxat.dev/schemas/portal_interaction_layer.schema.json", sourceHash: "1b88474a2e418c513ca6fb12ef8b971b2ceb5646b93620c6ec587522f0cc7ec5" } as const;

export type PortalLanguageContract = {
  "contract_code": "PORTAL_LANGUAGE_CONTRACT_V1";
  "plain_language_policy": "CLIENT_SAFE_LITERAL_TASK_LANGUAGE";
  "copy_serialization_policy": "DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY";
  "dominance_policy": "ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION";
  "support_subordination_policy": "ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK";
  "role_filter_policy": "ROLE_FILTER_BEFORE_COPY_PUBLICATION";
  "due_label_policy": "EXPLICIT_DUE_DATE_OR_NO_DEADLINE";
  "history_language_policy": "CURRENT_PRIMARY_HISTORY_EXPLICIT";
  "settlement_language_policy": "PENDING_AND_SETTLED_EXPLICIT";
  "forbidden_term_families": ["GATE_LANGUAGE","MANIFEST_LANGUAGE","STALE_OR_REBASE_JARGON","OVERRIDE_LANGUAGE","AUDIT_LANGUAGE","ESCALATION_LANGUAGE","ASSIGNMENT_LANGUAGE","STAFF_ROLE_LANGUAGE","WORKFLOW_LANGUAGE","INTERNAL_ONLY_LANGUAGE"];
  "copy_budget": {
    "dominant_question_max_chars": 120;
    "reassurance_line_max_chars": 120;
    "status_headline_max_chars": 96;
    "status_supporting_text_max_chars": 180;
    "status_due_label_max_chars": 48;
    "action_label_max_chars": 36;
    "task_label_max_chars": 72;
    "task_description_max_chars": 180;
    "limitation_headline_max_chars": 120;
    "limitation_detail_max_chars": 180;
    "request_title_max_chars": 72;
    "request_why_label_max_chars": 120;
    "request_due_label_max_chars": 64;
    "request_help_text_max_chars": 180;
    "approval_title_max_chars": 72;
    "approval_summary_max_chars": 180;
    "approval_change_digest_max_chars": 180;
    "approval_receipt_next_step_max_chars": 96;
    "onboarding_step_label_max_chars": 64;
    "help_headline_max_chars": 96;
    "help_option_label_max_chars": 40;
    "timeline_headline_max_chars": 120;
    "timeline_detail_max_chars": 180;
    "request_row_title_max_chars": 72;
    "request_row_status_label_max_chars": 48;
    "request_row_due_label_max_chars": 64;
    "request_row_action_label_max_chars": 36;
    "request_row_no_safe_action_max_chars": 120;
    "request_detail_status_max_chars": 120;
    "home_first_view_char_budget": 520;
    "documents_first_view_char_budget": 560;
    "approvals_first_view_char_budget": 560;
    "onboarding_first_view_char_budget": 480;
    "help_first_view_char_budget": 420;
    "request_detail_first_view_char_budget": 460;
  };
};
export const PortalLanguageContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/portal_language_contract.schema.json", sourceHash: "e79c46591e1daa87fd488a76f04a784ad7d738ef4d7c9e8c2455e91dd549a298" } as const;

export type RequestInfoRecord = {
  "artifact_type": "RequestInfoRecord";
  "request_info_id": string;
  "item_id": string;
  "visibility_class": "CUSTOMER_VISIBLE";
  "request_info_ordinal": number;
  "lifecycle_state": "OPEN" | "RESPONDED" | "CLOSED";
  "request_state_version": number;
  "prompt_entry_ref": string;
  "prompt_body_ref": string;
  "requested_by_ref": string;
  "customer_due_at": ISO8601DateTimeString;
  "opened_notification_refs": Array<string>;
  "opened_at": ISO8601DateTimeString;
  "response_entry_ref": string | null;
  "response_body_ref": string | null;
  "responded_by_ref": string | null;
  "responded_at": ISO8601DateTimeString;
  "closure_entry_ref": string | null;
  "closed_by_ref": string | null;
  "closure_reason_code": "CUSTOMER_REPLY_ACCEPTED" | "CANCELLED" | "SUPERSEDED" | null;
  "closed_at": ISO8601DateTimeString;
  "audit_event_refs": Array<string>;
};
export const RequestInfoRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/request_info_record.schema.json", sourceHash: "44b34797f0d758edce1cb46f3eba2b5455220ec61b002d26cd267a28acd6ce49" } as const;

export type WorkInboxDelta = {
  "artifact_type": "WorkInboxDelta";
  "tenant_id": string;
  "inbox_sequence": number;
  "delivery_class": "LIVE" | "CATCH_UP" | "SNAPSHOT";
  "inbox_route_key": string;
  "inbox_version": number;
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "WORK_INBOX_DELTA";
  };
  "causal_semantic_action_id": string | null;
  "row_upserts": Array<WorkInboxDeltaRowUpsert>;
  "row_removals": Array<WorkInboxDeltaRowRemoval>;
  "badge_updates": Array<WorkInboxDeltaBadgeUpdate>;
  "occurred_at": ISO8601DateTimeString;
};
export const WorkInboxDeltaSchemaLineage = { schemaId: "https://taxat.dev/schemas/work_inbox_delta.schema.json", sourceHash: "bab33fe29004fd26359c22a1ac0d73d18853e03d7d2fbf86aae1f4737f609ffe" } as const;

export type WorkInboxDeltaRowUpsert = {
  "item_id": string;
  "row": WorkInboxSnapshot;
  "order_changed": boolean;
  "defer_reorder_until_focus_exit": boolean;
  "queue_projection_basis_hash": string;
};

export type WorkInboxDeltaRowRemoval = {
  "item_id": string;
  "removal_cause": "FILTER_EXIT" | "VISIBILITY_EXIT" | "ITEM_CLOSED" | "ITEM_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";
  "preserve_until_focus_exit": boolean;
  "queue_projection_basis_hash": string;
};

export type WorkInboxDeltaBadgeUpdate = {
  "item_id": string;
  "basis_hash": string;
  "customer_unread_count": number;
  "internal_unread_count": number;
  "customer_activity_module_badge_count": number;
  "internal_activity_module_badge_count_or_null": number | null;
  "latest_change_lane_or_null": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY" | "MIXED_VISIBLE" | null;
};

export type WorkInboxSnapshot = {
  "interaction_layer": {
    "recovery_notice_surface": "CONTEXT_BAR";
    "notification_surface": "CONTEXT_BAR";
    "artifact_preview_surface": "DETAIL_DRAWER";
  };
};
export const WorkInboxSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/work_inbox_snapshot.schema.json", sourceHash: "7936b537901dc5d302d42f49cfa36253efe54dfc41850dd7b42d2dc15d6bada9" } as const;

export type WorkInboxSnapshotSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type WorkInboxSnapshotRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type WorkInboxSnapshotWorkflowLifecycleState = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "WAITING_ON_AUTHORITY" | "BLOCKED" | "DONE" | "CANCELLED" | "STALE";

export type WorkInboxSnapshotWaitingOnActor = "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";

export type WorkInboxSnapshotDueState = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED";

export type WorkInboxSnapshotCustomerStatusProjection = "UNDER_REVIEW" | "ACTION_REQUIRED" | "WAITING_ON_CONFIRMATION" | "RESOLVED" | "CLOSED";

export type WorkInboxSnapshotFilterChipCode = "MINE" | "UNASSIGNED" | "ESCALATED" | "WAITING_ON_CUSTOMER" | "OVERDUE" | "BLOCKED" | "RESOLVED_RECENTLY";

export type WorkInboxSnapshotActiveFilters = {
  "assignee_scope": "ALL" | "MINE" | "UNASSIGNED";
  "lifecycle_states": Array<WorkInboxSnapshotWorkflowLifecycleState>;
  "waiting_on_actors": Array<WorkInboxSnapshotWaitingOnActor>;
  "due_states": Array<WorkInboxSnapshotDueState>;
  "customer_status_projections": Array<WorkInboxSnapshotCustomerStatusProjection>;
  "selected_filter_chips": Array<WorkInboxSnapshotFilterChipCode>;
  "escalation_only": boolean;
  "include_resolved_recently": boolean;
};

export type WorkInboxSnapshotSortKey = {
  "collaboration_priority_score": number;
  "escalation_rank": number;
  "effective_due_at": ISO8601DateTimeString;
  "resolution_confidence_score": number;
  "queue_entered_at": ISO8601DateTimeString;
  "item_id": string;
};

export type WorkInboxSnapshotRowActions = {
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code": string | null;
  "secondary_action_codes": Array<string>;
  "available_action_codes": Array<string>;
  "blocked_action_codes": Array<string>;
  "available_action_bindings": Array<{
      "action_code": string;
      "mutation_precondition_binding_or_null": MutationPreconditionBinding | null;
    }>;
  "authoritative_action": ActionAuthorityContract & {
    "projection_scope"?: "WORK_INBOX_ROW_ACTIONS";
  };
};

export type WorkInboxSnapshotRow = {
  "item_id": string;
  "focus_anchor_ref": string;
  "sort_key": WorkInboxSnapshotSortKey;
  "queue_projection": CollaborationQueueProjectionContract & {
    "projection_scope"?: "WORK_INBOX_ROW";
  };
  "title": string;
  "client_label": string;
  "period_label": string;
  "internal_lifecycle_state": WorkInboxSnapshotWorkflowLifecycleState;
  "customer_status_projection": "UNDER_REVIEW" | "ACTION_REQUIRED" | "WAITING_ON_CONFIRMATION" | "RESOLVED" | "CLOSED" | null;
  "assignee_label": string | null;
  "waiting_on_actor": WorkInboxSnapshotWaitingOnActor;
  "due_state": "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED" | null;
  "effective_due_at": ISO8601DateTimeString;
  "last_activity_at": ISO8601DateTimeString;
  "customer_unread_count": number;
  "internal_unread_count": number;
  "escalation_active": boolean;
  "collaboration_priority_score": number;
  "escalation_rank": number;
  "resolution_confidence_score": number;
  "sla_pressure_score": number;
  "queue_entered_at": ISO8601DateTimeString;
  "row_actions": WorkInboxSnapshotRowActions;
};

export type WorkItemNotification = {
  "notification_id": string;
  "item_id": string;
  "recipient_ref": string;
  "visibility_class": "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
  "notification_type": "NEW_ASSIGNMENT" | "REASSIGNMENT" | "ESCALATION" | "CUSTOMER_REPLY" | "CUSTOMER_DUE_DATE_CHANGED" | "SLA_DUE_SOON" | "SLA_OVERDUE" | "SLA_BREACHED" | "ITEM_RESOLVED" | "ITEM_CANCELLED" | "REQUEST_INFO_OPENED" | "CUSTOMER_VISIBLE_COMMENT";
  "delivery_channel": "IN_APP" | "EMAIL" | "PUSH";
  "dedupe_key": string;
  "semantic_action_id": string;
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "WORK_ITEM_NOTIFICATION";
  };
  "access_binding_hash": string;
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "WORK_ITEM_NOTIFICATION";
    "projection_audience"?: "CLIENT_PORTAL";
  } | null;
  "queue_projection": CollaborationQueueProjectionContract & {
    "projection_scope"?: "WORK_ITEM_NOTIFICATION";
  };
  "shell_family": "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  "object_anchor_ref": string;
  "cross_device_continuity_contract": CrossDeviceContinuityContract & {
    "continuity_scope"?: "WORK_ITEM_NOTIFICATION";
  };
  "target_route_ref": string;
  "target_module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
  "focus_anchor_ref": string | null;
  "focus_restoration": FocusRestorationContract;
  "return_route_ref": string;
  "return_focus_anchor_ref": string;
  "fallback_route_ref": string;
  "fallback_focus_anchor_ref": string;
  "fallback_reason_code_or_null": string | null;
  "workspace_version_at_queue": number;
  "request_info_ref": string | null;
  "queued_at": ISO8601DateTimeString;
  "delivered_at": ISO8601DateTimeString;
  "read_at": ISO8601DateTimeString;
  "suppressed_reason_codes": Array<string>;
};
export const WorkItemNotificationSchemaLineage = { schemaId: "https://taxat.dev/schemas/work_item_notification.schema.json", sourceHash: "e675b25673a25b05297ad110b6214150e7f60406b0cc717f9f7d11589f7d5d56" } as const;

export type WorkItemParticipant = {
  "artifact_type": "WorkItemParticipant";
  "participant_ref": string;
  "item_id": string;
  "participant_role": "PREPARER" | "REVIEWER" | "APPROVER" | "SUPPORT_OPERATOR" | "TENANT_ADMIN" | "AUDITOR" | "CLIENT_VIEWER" | "CLIENT_CONTRIBUTOR" | "CLIENT_SIGNATORY" | "SUBJECT_SELF" | "SUBJECT_REPRESENTATIVE";
  "watch_state": "PRIMARY_OWNER" | "WATCHER" | "CUSTOMER_PARTICIPANT";
  "last_read_customer_sequence": number | null;
  "last_read_internal_sequence": number | null;
  "notification_preferences_ref": string;
};
export const WorkItemParticipantSchemaLineage = { schemaId: "https://taxat.dev/schemas/work_item_participant.schema.json", sourceHash: "e7a8bba88b2549451d348d63d7da2782b67f548efd510cdf20d59a9ae4605add" } as const;

export type WorkQueueHealthContract = {
  "contract_version": "WORK_QUEUE_HEALTH_V1";
  "queue_scope": "WORK_INBOX_SNAPSHOT";
  "routing_profile_code": "COLLABORATION_ROUTING_FORMULA_V1";
  "routing_profile_hash": string;
  "queue_route_key": string;
  "basis_hash": string;
  "queue_health_score": number;
  "queue_pressure_score": number;
  "queue_health_floor": number;
  "queue_health_state": "HEALTHY" | "DEGRADED" | "SATURATED";
  "intervention_recommendation_state": "NONE" | "REBALANCE" | "STAFFING_REVIEW" | "MANUAL_TRIAGE";
  "ordering_policy": "CANONICAL_SORT_KEY_ONLY";
  "focus_safe_live_update_policy": "DEFER_TO_ROUTING_CONTINUITY_STATE";
  "reason_codes": Array<string>;
};
export const WorkQueueHealthContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/work_queue_health_contract.schema.json", sourceHash: "a7a2fd062ddb5b74d8510437df68eb977ded72932b1615cb16dd59336b93fe5d" } as const;

export type WorkspaceSnapshot = {
  "interaction_layer": {
    "recovery_notice_surface": "CONTEXT_BAR";
    "notification_surface": "CONTEXT_BAR";
    "artifact_preview_surface": "DETAIL_DRAWER";
  };
};
export const WorkspaceSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/workspace_snapshot.schema.json", sourceHash: "47a79ceeb06d68483fd8baca9146fc297049848ef5fd1a6d92ec6bc2089dddea" } as const;

export type WorkspaceSnapshotSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type WorkspaceSnapshotRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type WorkspaceSnapshotRouteContext = {
  "entry_surface": "WORK_INBOX" | "MANIFEST_LINK" | "REQUEST_LIST" | "PORTAL_HOME" | "PORTAL_APPROVALS" | "PORTAL_HELP" | "NOTIFICATION" | "DIRECT_URL" | "NATIVE_RESTORE";
  "active_route_ref": string;
  "active_module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL";
  "focus_anchor_ref_or_null": string | null;
  "focus_restoration": FocusRestorationContract;
  "artifact_focus_bucket_or_null": "PRIMARY" | "HISTORY" | "LIMITATION_NOTICE" | null;
  "artifact_focus_subject_ref_or_null": string | null;
  "return_route_ref": string;
  "return_focus_anchor_ref": string;
  "fallback_route_ref": string;
  "fallback_focus_anchor_ref": string;
  "fallback_reason_code": string;
};

export type WorkspaceSnapshotContextBar = {
  "title": string;
  "item_id": string;
  "client_label": string;
  "period_label": string;
  "internal_lifecycle_state": "OPEN" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "WAITING_ON_AUTHORITY" | "BLOCKED" | "DONE" | "CANCELLED" | "STALE" | null;
  "customer_status_projection": string;
  "assignee_label": string | null;
  "escalation_active": boolean | null;
  "waiting_on_actor": "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";
  "due_state": "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED";
  "freshness_state": "FRESH" | "RECONNECTING" | "CATCHING_UP" | "STALE" | "DEGRADED";
  "freshness_notice_ref_or_null": string | null;
  "recovery_notice_ref_or_null": string | null;
};

export type WorkspaceSnapshotDecisionSummary = {
  "summary_ref": string;
  "next_actor": "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";
  "next_actor_summary_ref": string;
  "due_summary_ref": string;
  "customer_state_differs": boolean | null;
  "customer_state_summary_ref": string | null;
  "reason_codes": Array<string>;
};

export type WorkspaceSnapshotActionStrip = {
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code": string | null;
  "secondary_action_codes": Array<string>;
  "available_action_codes": Array<string>;
  "blocked_action_codes": Array<string>;
  "ownership_posture": "SELF" | "CUSTOMER_WAIT" | "STAFF_WAIT" | "AUTHORITY_WAIT" | "SYSTEM_WAIT" | "NONE";
  "ownership_label": string | null;
  "waiting_on_label": string | null;
  "blocking_reason": string | null;
  "machine_reason_codes": Array<string>;
  "suggested_module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
  "authoritative_action": ActionAuthorityContract & {
    "projection_scope"?: "WORKSPACE_ACTION_STRIP";
  };
};

export type WorkspaceSnapshotCustomerRequestWorkspace = {
  "surface_order": ["CONTEXT_BAR","DECISION_SUMMARY","ACTION_STRIP","DETAIL_DRAWER"];
  "language_contract": PortalLanguageContract;
  "status_code": "ACTION_REQUIRED" | "IN_REVIEW" | "WAITING_ON_US" | "WAITING_ON_AUTHORITY" | "COMPLETED";
  "status_label_ref": string;
  "due_label_ref_or_null": string | null;
  "action_order": ["REPLY","UPLOAD_FILE","RESPOND_TO_REQUEST_INFO"];
  "visible_action_codes": Array<"REPLY" | "UPLOAD_FILE" | "RESPOND_TO_REQUEST_INFO">;
  "primary_action_label_ref_or_null": string | null;
  "no_safe_action_reason_ref_or_null": string | null;
  "authoritative_action": ActionAuthorityContract & {
    "projection_scope"?: "CUSTOMER_REQUEST_DETAIL";
  };
  "artifact_history_state": "NO_SHARED_FILES" | "CURRENT_ONLY" | "CURRENT_PLUS_HISTORY" | "HISTORY_ONLY" | "LIMITED";
  "current_artifact_ref_or_null": string | null;
  "historical_artifact_refs": Array<string>;
  "artifact_selection": ArtifactSelectionContract & {
    "selection_scope"?: "COLLABORATION_CUSTOMER_REQUEST";
  };
  "artifact_affordance": ArtifactAffordanceContract & {
    "affordance_scope"?: "COLLABORATION_CUSTOMER_REQUEST";
  };
};

export type WorkspaceSnapshotDetailDrawer = {
  "modules": Array<WorkspaceSnapshotModuleState>;
  "promoted_module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
  "expanded_module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
  "focus_anchor_ref": string | null;
  "fallback_reason_code": string | null;
  "composer_layer": WorkspaceSnapshotComposerLayer;
};

export type WorkspaceSnapshotComposerLayer = {
  "surface_order": Array<JsonValue>;
  "available_append_command_codes": Array<"ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO">;
  "default_append_command_code_or_null": "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
  "selected_append_command_code_or_null": "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
  "composer_visibility_class_or_null": "INTERNAL_ONLY" | "CUSTOMER_VISIBLE" | null;
  "visibility_label_ref_or_null": string | null;
  "target_request_info_ref_or_null": string | null;
  "draft_state": "NONE" | "ACTIVE" | "REBASED" | "STALE_REVIEW_REQUIRED";
  "draft_ref_or_null": string | null;
  "draft_last_saved_at_or_null": ISO8601DateTimeString;
  "rebase_target_snapshot_ref_or_null": string | null;
  "publish_block_reason_codes": Array<string>;
  "attachment_picker": WorkspaceSnapshotAttachmentPicker;
  "publish_confirmation": WorkspaceSnapshotPublishConfirmation;
};

export type WorkspaceSnapshotAttachmentPicker = {
  "picker_state": "EMPTY" | "STAGED" | "READY" | "LIMITED";
  "staged_upload_refs": Array<string>;
  "inherited_visibility_class_or_null": "INTERNAL_ONLY" | "CUSTOMER_VISIBLE" | null;
  "visibility_confirmation_required": boolean;
  "visibility_confirmed": boolean;
};

export type WorkspaceSnapshotPublishConfirmation = {
  "confirmation_state": "NOT_REQUIRED" | "REQUIRED" | "CONFIRMED" | "RECEIPT_PENDING" | "BLOCKED_BY_REBASE";
  "publish_action_code_or_null": "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
  "confirmation_message_ref_or_null": string | null;
};

export type WorkspaceSnapshotModuleState = {
  "module_code": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL";
  "content_state": "POPULATED" | "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE";
  "state_reason_code_or_null": "REQUEST_NOT_TRIGGERED" | "MATERIALIZATION_PENDING" | "NOT_APPLICABLE_TO_CONTEXT" | null;
  "limitation_reason_codes": Array<string>;
  "placeholder_refs": Array<string>;
  "module_badge_count": number;
  "new_activity_marker_ref_or_null": string | null;
  "visibility_partition": "CUSTOMER_VISIBLE_ONLY" | "INTERNAL_ONLY_ONLY" | "SEGMENTED_BY_VISIBILITY";
  "file_segments": Array<"SHARED_WITH_CUSTOMER" | "INTERNAL_ONLY">;
  "current_shared_file_refs": Array<string>;
  "historical_shared_file_refs": Array<string>;
  "internal_only_file_refs": Array<string>;
};

export type WorkspaceSnapshotPermissions = {
  "can_reply_customer_visible": boolean;
  "can_publish_request_info": boolean;
  "can_add_internal_note": boolean;
  "can_assign": boolean;
  "can_escalate": boolean;
  "can_change_status": boolean;
  "can_view_audit_trail": boolean;
};

export type WorkspaceSnapshotWorkItemParticipant = {
  "participant_ref": string;
  "item_id": string;
  "participant_role": "PREPARER" | "REVIEWER" | "APPROVER" | "SUPPORT_OPERATOR" | "TENANT_ADMIN" | "AUDITOR" | "CLIENT_VIEWER" | "CLIENT_CONTRIBUTOR" | "CLIENT_SIGNATORY" | "SUBJECT_SELF" | "SUBJECT_REPRESENTATIVE";
  "watch_state": "PRIMARY_OWNER" | "WATCHER" | "CUSTOMER_PARTICIPANT";
  "last_read_customer_sequence": number | null;
  "last_read_internal_sequence": number | null;
  "notification_preferences_ref": string;
};

export type WorkspaceStreamEvent = {
  "artifact_type": "WorkspaceStreamEvent";
  "stream_scope_class": "WORKSPACE";
  "item_id": string;
  "shell_family": "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  "object_anchor_ref": string;
  "workspace_route_key": string;
  "session_visibility_class": "STAFF_FULL" | "CUSTOMER_VISIBLE";
  "workspace_sequence": number;
  "frame_epoch": number;
  "workspace_version": number;
  "shell_stability_token": string;
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "resume_token": string;
  "stream_recovery_contract": StreamRecoveryContract;
  "stability_contract": RouteStabilityContract & {
    "route_scope_class"?: "WORKSPACE";
    "guard_vector_components"?: {
      "decision_bundle_hash_or_null"?: null;
      "shell_stability_token_or_null"?: string;
      "frame_epoch_or_null"?: number;
      "work_item_version_or_null"?: number;
      "customer_thread_head_or_null"?: number;
      "internal_thread_head_or_null"?: number | null;
      "request_state_version_or_null"?: number | null;
      "client_portal_workspace_version_or_null"?: null;
      "view_guard_ref_or_null"?: null;
    };
    "last_published_sequence_or_null"?: number;
    "resume_capability"?: "STREAM_RESUMABLE";
  };
  "visibility_partition": VisibilityPartitionContract & {
    "partition_scope"?: "WORKSPACE_STREAM_EVENT";
  };
  "customer_safe_projection": CustomerSafeProjectionContract & {
    "boundary_scope"?: "WORKSPACE_STREAM_EVENT";
    "projection_audience"?: "CUSTOMER_COLLABORATION";
  } | null;
  "event_type": "workspace.delta" | "workspace.snapshot" | "activity.appended" | "audit.appended" | "notification.badge" | "heartbeat";
  "queue_projection_or_null": null | CollaborationQueueProjectionContract & {
    "projection_scope"?: "WORKSPACE_STREAM_EVENT";
  };
  "snapshot_ref": string | null;
  "delta_ref": string | null;
  "activity_ref": string | null;
  "audit_ref": string | null;
  "notification_ref": string | null;
  "occurred_at": ISO8601DateTimeString;
};
export const WorkspaceStreamEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/workspace_stream_event.schema.json", sourceHash: "aaab80fcae970968d9466994590f711726f2d4221d5ee69644d24c1e893c46fa" } as const;

export const ClientAndCollaborationBindingManifest = { familyRef: "CLIENT_AND_COLLABORATION", schemaCount: 27 } as const;
