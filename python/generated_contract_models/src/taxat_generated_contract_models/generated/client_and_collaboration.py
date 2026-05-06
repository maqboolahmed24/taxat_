"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class ClientApprovalPack(TypedDict, total=False):
    approval_pack_id: Required[str]
    artifact_type: Required[Literal["ClientApprovalPack"]]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str | None]
    title: Required[str]
    summary_ref: Required[str]
    change_highlights_ref: Required[str]
    declaration_text_ref: Required[str]
    approval_pack_hash: Required[str]
    view_guard_ref: Required[str]
    stale_protection_state: Required[Literal["CURRENT", "REBASE_REQUIRED", "SUPERSEDED", "EXPIRED"]]
    lifecycle_state: Required[Literal["DRAFT", "READY_FOR_CLIENT", "VIEWED", "ACKNOWLEDGED", "STEP_UP_REQUIRED", "SIGNED", "COUNTERSIGNED", "EXPIRED", "SUPERSEDED", "CANCELLED"]]
    requires_step_up: Required[bool]
    viewed_at: Required[ISO8601DateTimeString]
    change_digest_acknowledged_at: Required[ISO8601DateTimeString]
    declaration_acknowledged_at: Required[ISO8601DateTimeString]
    acknowledged_at: Required[ISO8601DateTimeString]
    step_up_verified_at: Required[ISO8601DateTimeString]
    step_up_expires_at: Required[ISO8601DateTimeString]
    signed_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    approval_readiness_score: Required[int]
    recovery_posture: Required[Literal["NONE", "INLINE_RESUME", "RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED", "STEP_UP_RETRY", "HARD_RESET_REQUIRED", "SUPPORT_REQUIRED"]]
    dominant_hazard_code: Required[str | None]
    supersedes_pack_ref: Required[str | None]
    language_contract: Required[PortalLanguageContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]

ClientApprovalPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_approval_pack.schema.json",
    "source_hash": "ffc0b5884b0dab94cc27ad9cc85bd7d2ed3b5dabcca1e159388a01120d172b1f",
}

class ClientCompatibilityMatrix(TypedDict, total=False):
    compatibility_matrix_id: Required[str]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_compatibility_gate_contract: Required[SchemaBundleCompatibilityGateContract]
    supported_client_window_ref: Required[str]
    browser_rows: Required[list[ClientCompatibilityMatrixMatrixRow]]
    macos_rows: Required[list[ClientCompatibilityMatrixMatrixRow]]
    matrix_state: Required[Literal["GREEN", "RED"]]
    evaluated_at: Required[ISO8601DateTimeString]

class ClientCompatibilityMatrixMatrixRow(TypedDict, total=False):
    client_version: Required[str]
    scenario: Required[Literal["OLDEST_SUPPORTED_TO_CURRENT_SERVER", "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER"]]
    outcome: Required[Literal["COMPATIBLE", "INCOMPATIBLE"]]
    suite_result_ref: Required[str]

ClientCompatibilityMatrixSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_compatibility_matrix.schema.json",
    "source_hash": "f3f9d9ec2381f28c47a98f434db2cd0ae906d35cd2a2c8c8350b450306e625cf",
}

class ClientDocumentRequest(TypedDict, total=False):
    request_id: Required[str]
    artifact_type: Required[Literal["ClientDocumentRequest"]]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str | None]
    category: Required[Literal["IDENTITY", "BANK_STATEMENT", "INVOICE", "RECEIPT", "AUTHORITY_LETTER", "OTHER"]]
    title: Required[str]
    description_ref: Required[str]
    requested_file_types: Required[list[str]]
    due_at: Required[ISO8601DateTimeString]
    lifecycle_state: Required[Literal["OPEN", "UPLOAD_IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"]]
    required_count: Required[int]
    request_version_ref: Required[str]
    upload_refs: Required[list[str]]
    latest_upload_ref: Required[str | None]
    current_request_upload_ref_or_null: Required[str | None]
    review_outcome: Required[str | None]
    assistance_mode: Required[str | None]
    language_contract: Required[PortalLanguageContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]

ClientDocumentRequestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_document_request.schema.json",
    "source_hash": "85398a562c880754b21b13e9d4831d93e0df2c560821983a3b3517ab80eb1c27",
}

type ClientOnboardingJourneyStepCode = Literal["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION", "AUTHORITY_LINK_SETUP", "DOCUMENT_COLLECTION", "REVIEW_CONFIRMATION"]

class ClientOnboardingJourney(TypedDict, total=False):
    journey_id: Required[str]
    artifact_type: Required[Literal["ClientOnboardingJourney"]]
    tenant_id: Required[str]
    client_id: Required[str]
    lifecycle_state: Required[Literal["INVITED", "PROFILE_PENDING", "IDENTITY_PENDING", "AUTHORITY_LINK_PENDING", "DOCUMENTS_PENDING", "READY_FOR_REVIEW", "COMPLETED", "EXPIRED", "ABANDONED"]]
    current_step_code: Required[Literal["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION", "AUTHORITY_LINK_SETUP", "DOCUMENT_COLLECTION", "REVIEW_CONFIRMATION", None]]
    required_steps: Required[list[ClientOnboardingJourneyStepCode]]
    completed_steps: Required[list[ClientOnboardingJourneyStepCode]]
    verification_state: Required[Literal["NOT_STARTED", "PENDING", "VERIFIED", "WAIVED", "FAILED_RETRYABLE", "FAILED_REVIEW_REQUIRED"]]
    authority_link_requirement: Required[Literal["UNRESOLVED", "REQUIRED", "OPTIONAL", "NOT_REQUIRED"]]
    authority_link_state: Required[Literal["UNRESOLVED", "PENDING", "LINKED", "WAIVED", "NOT_REQUIRED"]]
    document_request_refs: Required[list[str]]
    help_channel_ref: Required[str | None]
    resume_state: Required[Literal["NONE", "LIVE", "RECONFIRMATION_REQUIRED", "STALE_REVIEW_REQUIRED"]]
    resume_step_code: Required[Literal["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION", "AUTHORITY_LINK_SETUP", "DOCUMENT_COLLECTION", "REVIEW_CONFIRMATION", None]]
    draft_upload_session_refs: Required[list[str]]
    reconfirmation_step_codes: Required[list[ClientOnboardingJourneyStepCode]]
    invited_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    completed_at: Required[ISO8601DateTimeString]
    completion_summary_ref: Required[str | None]
    completion_timeline_event_ref: Required[str | None]
    expires_at: Required[ISO8601DateTimeString]
    expired_at: Required[ISO8601DateTimeString]
    abandoned_at: Required[ISO8601DateTimeString]
    abandonment_reason_code: Required[str | None]
    language_contract: Required[PortalLanguageContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract]

ClientOnboardingJourneySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_onboarding_journey.schema.json",
    "source_hash": "074aca6d593700df000b390594b693ffd20dc2a39daef8c06a480729f9a10444",
}

type ClientPortalWorkspaceSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type ClientPortalWorkspaceRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type ClientPortalWorkspaceRouteCode = Literal["HOME", "DOCUMENTS", "APPROVALS", "ONBOARDING", "HELP"]

type ClientPortalWorkspaceContextRouteCode = Literal["NONE", "REQUEST_DETAIL", "APPROVAL_DETAIL", "ONBOARDING_STEP", "HELP_CONTEXT"]

type ClientPortalWorkspaceContextFallbackTarget = Literal["LATEST_VISIBLE_OBJECT", "RETURN_FOCUS_ANCHOR"]

type ClientPortalWorkspaceContextNarrowScreenMode = Literal["STACKED_SAME_SHELL"]

type ClientPortalWorkspaceHelpSurfaceCode = Literal["HELP_OPTIONS", "TOP_QUESTIONS", "CASE_CONTEXT_PANEL"]

type ClientPortalWorkspaceOnboardingStepCode = Literal["INVITE_ACCEPTANCE", "PROFILE_CONFIRMATION", "IDENTITY_VERIFICATION", "AUTHORITY_LINK_SETUP", "DOCUMENT_COLLECTION", "REVIEW_CONFIRMATION"]

class ClientPortalWorkspace(TypedDict, total=False):
    workspace_id: Required[str]
    artifact_type: Required[Literal["ClientPortalWorkspace"]]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: NotRequired[str | None]
    viewer_role: Required[Literal["CLIENT_VIEWER", "CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY"]]
    shell_family: Required[Literal["CLIENT_PORTAL_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    dominance_contract: Required[ShellDominanceContract]
    state_taxonomy_contract: Required[ShellStateTaxonomyContract]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    language_contract: Required[PortalLanguageContract]
    settlement_state: Required[ClientPortalWorkspaceSettlementState]
    recovery_posture: Required[ClientPortalWorkspaceRecoveryPosture]
    identity_context: Required[ClientPortalWorkspaceIdentityContext]
    workspace_posture: Required[ClientPortalWorkspaceWorkspacePosture]
    route: Required[Literal["HOME", "DOCUMENTS", "APPROVALS", "ONBOARDING", "HELP"]]
    route_context: Required[ClientPortalWorkspaceRouteContext]
    workspace_version: Required[int]
    freshness_state: Required[Literal["FRESH", "STALE_REVIEW_REQUIRED", "DEGRADED"]]
    view_guard_ref: Required[str]
    stability_contract: Required[RouteStabilityContract]
    visibility_partition: Required[VisibilityPartitionContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract]
    navigation_tabs: Required[list[ClientPortalWorkspaceNavigationTab]]
    interaction_layer: Required[PortalInteractionLayer]
    status_hero: Required[ClientPortalWorkspaceStatusHero]
    reliability_summary: Required[ClientPortalWorkspaceReliabilitySummary]
    task_groups: Required[list[ClientPortalWorkspaceTaskGroup]]
    home_surface_order: Required[list[Literal["PORTAL_HEADER", "STATUS_HERO", "TASK_QUEUE", "RECENT_ACTIVITY"]]]
    home_primary_task_ref: Required[str | None]
    draft_resume: Required[ClientPortalWorkspaceDraftResume]
    content_limitations: Required[list[ClientPortalWorkspaceLimitationNotice]]
    document_center: Required[ClientPortalWorkspaceDocumentCenter]
    approval_center: Required[ClientPortalWorkspaceApprovalCenter]
    onboarding_journey: Required[ClientPortalWorkspaceOnboardingJourney | None]
    support_panel: Required[ClientPortalWorkspaceSupportPanel]
    activity_timeline: Required[list[ClientPortalWorkspaceTimelineEvent]]
    updated_at: Required[ISO8601DateTimeString]

class ClientPortalWorkspaceIdentityContext(TypedDict, total=False):
    client_display_name: Required[str]
    delegated_session: Required[bool]
    acting_role_label: Required[str | None]
    period_label: Required[str | None]
    reassurance_line: Required[str]
    context_hash: Required[str]

class ClientPortalWorkspaceWorkspacePosture(TypedDict, total=False):
    connection_state: Required[Literal["CONNECTED", "RECONNECTING", "CATCHING_UP", "STALE", "DEGRADED"]]
    interaction_posture: Required[Literal["MUTATING_ALLOWED", "REVIEW_REQUIRED", "READ_ONLY_LIMITED"]]
    promoted_support_region: Required[Literal["NONE", "DRAFT_RESUME", "LIMITATION_NOTICE", "SUPPORT_PANEL"]]
    notice_headline: Required[str | None]
    notice_detail: Required[str | None]
    full_text_ref: Required[str | None]

class ClientPortalWorkspaceRouteContext(TypedDict, total=False):
    context_route: Required[ClientPortalWorkspaceContextRouteCode]
    context_object_ref: Required[str | None]
    return_route: Required[ClientPortalWorkspaceRouteCode | None]
    focus_anchor_ref: Required[str | None]
    focus_restoration: Required[FocusRestorationContract]
    artifact_focus_bucket_or_null: Required[Literal["PRIMARY", "HISTORY", "LIMITATION_NOTICE", None]]
    artifact_focus_subject_ref_or_null: Required[str | None]
    return_focus_anchor_ref_or_null: Required[str | None]
    fallback_target: Required[ClientPortalWorkspaceContextFallbackTarget | None]
    fallback_object_ref_or_null: Required[str | None]
    fallback_reason_ref_or_null: Required[str | None]
    narrow_screen_mode: Required[ClientPortalWorkspaceContextNarrowScreenMode | None]

class ClientPortalWorkspaceActionToken(TypedDict, total=False):
    action_code: Required[str]
    label: Required[str]
    route: Required[ClientPortalWorkspaceRouteCode]
    requires_step_up: NotRequired[bool]
    context_object_ref: NotRequired[str | None]
    focus_anchor_ref: NotRequired[str | None]

class ClientPortalWorkspaceDraftResume(TypedDict, total=False):
    draft_state: Required[Literal["NONE", "ACTIVE", "REBASED", "STALE_REVIEW_REQUIRED"]]
    draft_kind: Required[Literal["NONE", "UPLOAD", "APPROVAL", "ONBOARDING"]]
    draft_object_ref: Required[str | None]
    resume_route: Required[ClientPortalWorkspaceRouteCode | None]
    last_saved_at: Required[ISO8601DateTimeString]
    rebase_target_ref: Required[str | None]

class ClientPortalWorkspaceLimitationNotice(TypedDict, total=False):
    limitation_code: Required[Literal["MASKED_DETAILS", "WITHHELD_DOCUMENT", "PENDING_AUTHORITY_CONFIRMATION", "ROLE_RESTRICTED", "STALE_REVIEW_REQUIRED", "DEGRADED_DATA"]]
    headline: Required[str]
    detail: NotRequired[str | None]
    affected_route: Required[ClientPortalWorkspaceRouteCode]
    affected_object_ref: NotRequired[str | None]
    blocking: Required[bool]

class ClientPortalWorkspaceNavigationTab(TypedDict, total=False):
    label: Required[str]
    route: Required[ClientPortalWorkspaceRouteCode]
    active: Required[bool]
    badge_count: NotRequired[int | None]

class ClientPortalWorkspaceProgressStep(TypedDict, total=False):
    step_code: Required[str]
    label: Required[str]
    state: Required[Literal["COMPLETED", "CURRENT", "UPCOMING"]]

class ClientPortalWorkspaceReliabilitySummary(TypedDict, total=False):
    surface_class: Required[Literal["MOBILE", "TABLET", "DESKTOP"]]
    network_posture: Required[Literal["HEALTHY", "WEAK", "UNSTABLE", "OFFLINE_RECOVERING"]]
    dominant_flow_kind: Required[Literal["UPLOAD", "APPROVAL", "ONBOARDING", "GENERAL_NAVIGATION", "WAITING"]]
    flow_stability_score: Required[int]
    risk_weighted_friction_score: Required[int]
    completion_probability: Required[float]
    recovery_posture: Required[Literal["NONE", "INLINE_RESUME", "RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED", "STEP_UP_RETRY", "HARD_RESET_REQUIRED", "SUPPORT_REQUIRED"]]
    dominant_abort_hazard_code: Required[str | None]

class ClientPortalWorkspaceStatusHero(TypedDict, total=False):
    status_code: Required[Literal["ACTION_REQUIRED", "IN_REVIEW", "WAITING_ON_US", "WAITING_ON_AUTHORITY", "READY_TO_SIGN", "COMPLETED", "ONBOARDING_REQUIRED"]]
    headline: Required[str]
    supporting_text: Required[str]
    due_label: NotRequired[str | None]
    primary_action: Required[ClientPortalWorkspaceActionToken | None]
    secondary_action: NotRequired[None]
    progress_steps: Required[list[ClientPortalWorkspaceProgressStep]]

class ClientPortalWorkspaceTask(TypedDict, total=False):
    task_id: Required[str]
    task_type: Required[Literal["UPLOAD_DOCUMENT", "ANSWER_QUESTION", "VERIFY_IDENTITY", "CONNECT_AUTHORITY", "REVIEW_SUMMARY", "SIGN_DECLARATION", "REQUEST_HELP"]]
    label: Required[str]
    description: NotRequired[str | None]
    status: Required[Literal["OPEN", "WAITING", "DONE"]]
    due_at: NotRequired[ISO8601DateTimeString]
    effort_label: NotRequired[str | None]
    route: Required[ClientPortalWorkspaceRouteCode]
    primary_action: Required[ClientPortalWorkspaceActionToken]

class ClientPortalWorkspaceTaskGroup(TypedDict, total=False):
    group_code: Required[Literal["DO_NOW", "COMING_UP", "DONE"]]
    label: Required[str]
    tasks: Required[list[ClientPortalWorkspaceTask]]

class ClientPortalWorkspaceUploadItem(TypedDict, total=False):
    upload_session_id: Required[str]
    request_version_ref: Required[str]
    upload_request_binding_contract: Required[UploadRequestBindingContract]
    request_binding_state: Required[Literal["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT", "RECONFIRMATION_REQUIRED", "SUPERSEDED"]]
    resumability_state: Required[Literal["RESUMABLE", "RESTART_REQUIRED", "CLOSED"]]
    attachment_state: Required[Literal["STAGED", "CONFIRMATION_REQUIRED", "ATTACHED", "REBIND_REQUIRED"]]
    filename: Required[str]
    transfer_state: Required[Literal["QUEUED", "UPLOADING", "SCANNING", "ACCEPTED", "REJECTED", "FAILED"]]
    status_phase: Required[Literal["TRANSFER", "SCAN", "VALIDATION", "ACCEPTANCE", "REJECTION", "RETRY"]]
    history_state: Required[Literal["IN_PROGRESS", "CURRENT", "SUPERSEDED", "REJECTED", "FAILED"]]
    download_ref: Required[str | None]
    preview_posture: Required[Literal["SAME_SHELL_PREVIEW", "DOWNLOAD_ONLY", "NOT_AVAILABLE"]]
    preview_reason_code: Required[Literal["TRANSFER_IN_PROGRESS", "SCAN_PENDING", "FORMAT_UNSUPPORTED", "QUARANTINED", "REPLACEMENT_REQUIRED", "RETRY_REQUIRED", "POLICY_LIMITED", None]]
    uploaded_at: NotRequired[ISO8601DateTimeString]
    next_action_code: Required[Literal["NONE", "RESUME_UPLOAD", "CONFIRM_ATTACHMENT", "RECONFIRM_REQUEST", "RETRY_UPLOAD", "UPLOAD_REPLACEMENT", "CONTACT_SUPPORT"]]
    upload_confidence_score: Required[int]
    recovery_posture: Required[Literal["NONE", "INLINE_RESUME", "RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED", "STEP_UP_RETRY", "HARD_RESET_REQUIRED", "SUPPORT_REQUIRED"]]
    dominant_hazard_code: Required[str | None]

class ClientPortalWorkspaceDocumentRequest(TypedDict, total=False):
    request_id: Required[str]
    request_version_ref: Required[str]
    category: Required[Literal["IDENTITY", "BANK_STATEMENT", "INVOICE", "RECEIPT", "AUTHORITY_LETTER", "OTHER"]]
    title: Required[str]
    why_requested_label: Required[str]
    status: Required[Literal["OPEN", "UPLOADING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED"]]
    due_at: NotRequired[ISO8601DateTimeString]
    due_label: Required[str]
    help_text: NotRequired[str | None]
    accepted_file_types: Required[list[str]]
    max_file_size_mb: Required[int]
    uploads: Required[list[ClientPortalWorkspaceUploadItem]]
    current_upload_ref: Required[str | None]
    current_artifact_upload_ref: Required[str | None]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]

class ClientPortalWorkspaceDocumentCenter(TypedDict, total=False):
    summary_label: Required[str]
    surface_order: Required[Literal[["DOCUMENT_INBOX","UPLOAD_PANEL","UPLOAD_STATUS_LIST","DOCUMENT_HISTORY"]]]
    upload_affordances: Required[Literal[["BROWSE","DRAG_DROP","CAMERA_CAPTURE"]]]
    status_phase_order: Required[Literal[["TRANSFER","SCAN","VALIDATION","ACCEPTANCE","REJECTION","RETRY"]]]
    open_request_count: Required[int]
    requests: Required[list[ClientPortalWorkspaceDocumentRequest]]
    last_uploaded_at: NotRequired[ISO8601DateTimeString]

class ClientPortalWorkspaceApprovalPack(TypedDict, total=False):
    approval_pack_id: Required[str]
    title: Required[str]
    status: Required[Literal["READY_FOR_CLIENT", "VIEWED", "ACKNOWLEDGED", "STEP_UP_REQUIRED", "SIGNED", "EXPIRED", "SUPERSEDED"]]
    due_at: NotRequired[ISO8601DateTimeString]
    summary: Required[str]
    change_highlight_count: Required[int]
    change_digest_summary: Required[str]
    change_highlights_ref: Required[str]
    stale_protection_state: Required[Literal["CURRENT", "REBASE_REQUIRED", "SUPERSEDED", "EXPIRED"]]
    requires_step_up: Required[bool]
    declaration_text_ref: Required[str]
    declaration_download_ref: Required[str]
    declaration_print_ref: Required[str]
    change_digest_acknowledged: Required[bool]
    declaration_acknowledged: Required[bool]
    approval_acknowledged: Required[bool]
    sign_off_state: Required[Literal["REVIEW_REQUIRED", "STEP_UP_CHECKPOINT", "READY_TO_SIGN", "SIGNATURE_PENDING_SETTLEMENT", "STALE_REVIEW_REQUIRED", "SIGNED_RECEIPT"]]
    step_up_surface: Required[Literal["NOT_REQUIRED", "INLINE_CHECKPOINT"]]
    step_up_checkpoint_state: Required[Literal["NOT_REQUIRED", "REQUIRED", "SATISFIED"]]
    approval_readiness_score: Required[int]
    recovery_posture: Required[Literal["NONE", "INLINE_RESUME", "RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED", "STEP_UP_RETRY", "HARD_RESET_REQUIRED", "SUPPORT_REQUIRED"]]
    dominant_hazard_code: Required[str | None]
    sign_command_receipt_ref: Required[str | None]
    receipt_state: Required[Literal["NOT_ISSUED", "PENDING_SETTLEMENT", "ISSUED"]]
    settlement_pending_label: Required[str | None]
    receipt_ref: Required[str | None]
    receipt_download_ref: Required[str | None]
    receipt_print_ref: Required[str | None]
    receipt_issued_at: Required[ISO8601DateTimeString]
    receipt_next_step_label: Required[str | None]
    superseded_by_pack_ref: Required[str | None]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]
    primary_action: Required[ClientPortalWorkspaceActionToken]

class ClientPortalWorkspaceApprovalCenter(TypedDict, total=False):
    surface_order: Required[Literal[["APPROVAL_SUMMARY","CHANGE_DIGEST","DECLARATION_PANEL","SIGN_OFF_PANEL"]]]
    outstanding_count: Required[int]
    latest_pack_ref: Required[str | None]
    packs: Required[list[ClientPortalWorkspaceApprovalPack]]

class ClientPortalWorkspaceOnboardingJourney(TypedDict, total=False):
    journey_id: Required[str]
    surface_order: Required[Literal[["WELCOME_PANEL","ONBOARDING_STEPPER","STEP_WORKSPACE","SUPPORT_PANEL"]]]
    state: Required[Literal["INVITED", "PROFILE_PENDING", "IDENTITY_PENDING", "AUTHORITY_LINK_PENDING", "DOCUMENTS_PENDING", "READY_FOR_REVIEW", "COMPLETED", "EXPIRED", "ABANDONED"]]
    current_step_code: Required[ClientPortalWorkspaceOnboardingStepCode | None]
    current_step_label: Required[str | None]
    completed_step_count: Required[int]
    total_step_count: Required[int]
    resume_state: Required[Literal["NONE", "LIVE", "RECONFIRMATION_REQUIRED", "STALE_REVIEW_REQUIRED"]]
    resume_step_code: Required[ClientPortalWorkspaceOnboardingStepCode | None]
    reconfirmation_step_codes: Required[list[ClientPortalWorkspaceOnboardingStepCode]]
    step_workspace_state: Required[Literal["ACTIVE_STEP", "RECONFIRMATION_REVIEW", "STALE_REVIEW", "COMPLETION_SUMMARY", "EXIT_SUPPORT"]]
    save_return_state: Required[Literal["AVAILABLE", "NOT_AVAILABLE_IRREVERSIBLE", "NOT_AVAILABLE_TERMINAL"]]
    save_and_return_action: Required[ClientPortalWorkspaceActionToken | None]
    next_action: Required[ClientPortalWorkspaceActionToken]
    completion_summary_ref: Required[str | None]
    completion_next_steps_ref: Required[str | None]
    completed_at: Required[ISO8601DateTimeString]
    expired_at: Required[ISO8601DateTimeString]
    abandoned_at: Required[ISO8601DateTimeString]
    abandonment_reason_code: Required[str | None]

class ClientPortalWorkspaceContactOption(TypedDict, total=False):
    channel_code: Required[Literal["SECURE_MESSAGE", "CALLBACK", "APPOINTMENT", "FAQ"]]
    label: Required[str]
    availability_label: NotRequired[str | None]
    action: Required[ClientPortalWorkspaceActionToken]

class ClientPortalWorkspaceCaseContextPanel(TypedDict, total=False):
    context_summary_ref: Required[str]
    carried_context_refs: Required[list[str]]
    linked_request_info_ref: Required[str | None]
    linked_object_ref: Required[str | None]
    focus_anchor_ref: Required[str]
    restate_required: Required[Literal[False]]
    recommended_channel_code: Required[Literal["SECURE_MESSAGE", "CALLBACK", "APPOINTMENT", "FAQ"]]

class ClientPortalWorkspaceSupportPanel(TypedDict, total=False):
    help_headline: Required[str]
    contact_options: Required[list[ClientPortalWorkspaceContactOption]]
    secure_message_allowed: Required[bool]
    faq_refs: Required[list[str]]
    surface_order: Required[list[ClientPortalWorkspaceHelpSurfaceCode]]
    case_context_panel: Required[ClientPortalWorkspaceCaseContextPanel | None]

class ClientPortalWorkspaceTimelineEvent(TypedDict, total=False):
    event_id: Required[str]
    event_kind: Required[Literal["UPLOAD_RECEIVED", "UPLOAD_REJECTED", "APPROVAL_READY", "APPROVAL_SIGNED", "ONBOARDING_STEP_COMPLETED", "SUBMISSION_SENT", "STATUS_UPDATED"]]
    headline: Required[str]
    detail: NotRequired[str | None]
    occurred_at: Required[ISO8601DateTimeString]

ClientPortalWorkspaceSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_portal_workspace.schema.json",
    "source_hash": "fd0d29044ef9bc4a3865beca37e7365f19de90e07c8ef34e210b49a679bdd45e",
}

class ClientTimelineEvent(TypedDict, total=False):
    event_id: Required[str]
    artifact_type: Required[Literal["ClientTimelineEvent"]]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str | None]
    event_kind: Required[Literal["UPLOAD_RECEIVED", "UPLOAD_REJECTED", "APPROVAL_READY", "APPROVAL_SIGNED", "ONBOARDING_STEP_COMPLETED", "SUBMISSION_SENT", "STATUS_UPDATED"]]
    headline: Required[str]
    detail_ref: Required[str | None]
    occurred_at: Required[ISO8601DateTimeString]
    visible_to_client: Required[Literal[True]]
    related_object_ref: Required[str | None]
    language_contract: Required[PortalLanguageContract]
    authority_truth_contract: Required[AuthorityTruthContract]
    authority_truth_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "PARTIAL_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"]]
    customer_safe_projection: Required[CustomerSafeProjectionContract]

ClientTimelineEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_timeline_event.schema.json",
    "source_hash": "394ff4411a746a2f7d3ef3bec12cba6b0d959f3c4b0d565f1d21b284d4ceb901",
}

class ClientUploadSession(TypedDict, total=False):
    upload_session_id: Required[str]
    artifact_type: Required[Literal["ClientUploadSession"]]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str | None]
    request_id: Required[str]
    request_version_ref: Required[str]
    upload_request_binding_contract: Required[UploadRequestBindingContract]
    request_binding_state: Required[Literal["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT", "RECONFIRMATION_REQUIRED", "SUPERSEDED"]]
    initiated_by: Required[str]
    storage_ref: Required[str]
    filename: Required[str]
    media_type: Required[str]
    byte_count: Required[int]
    checksum: Required[str]
    surface_class: Required[Literal["MOBILE", "TABLET", "DESKTOP"]]
    capture_mode: Required[Literal["BROWSE", "DRAG_DROP", "CAMERA", "SYSTEM_SHARE"]]
    bytes_transferred: Required[int]
    retry_count: Required[int]
    resume_attempt_count: Required[int]
    resume_success_count: Required[int]
    integrity_state: Required[Literal["PENDING", "VERIFIED", "FAILED"]]
    transfer_state: Required[Literal["QUEUED", "UPLOADING", "SCANNING", "ACCEPTED", "REJECTED", "FAILED"]]
    malware_scan_state: Required[Literal["PENDING", "CLEAN", "QUARANTINED"]]
    validation_state: Required[Literal["PENDING", "ACCEPTED", "REJECTED", "REQUIRES_REPLACEMENT"]]
    resumability_state: Required[Literal["RESUMABLE", "RESTART_REQUIRED", "CLOSED"]]
    resume_token_ref: Required[str | None]
    attachment_state: Required[Literal["STAGED", "CONFIRMATION_REQUIRED", "ATTACHED", "REBIND_REQUIRED"]]
    attached_document_ref: Required[str | None]
    outcome_reason_code: Required[str | None]
    next_action_code: Required[Literal["NONE", "RESUME_UPLOAD", "CONFIRM_ATTACHMENT", "RECONFIRM_REQUEST", "RETRY_UPLOAD", "UPLOAD_REPLACEMENT", "CONTACT_SUPPORT"]]
    submitted_at: Required[ISO8601DateTimeString]
    transfer_started_at: Required[ISO8601DateTimeString]
    last_activity_at: Required[ISO8601DateTimeString]
    scan_completed_at: Required[ISO8601DateTimeString]
    validation_completed_at: Required[ISO8601DateTimeString]
    finalized_at: Required[ISO8601DateTimeString]
    attachment_confirmed_at: Required[ISO8601DateTimeString]
    reconfirmed_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    upload_confidence_score: Required[int]
    recovery_posture: Required[Literal["NONE", "INLINE_RESUME", "RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED", "STEP_UP_RETRY", "HARD_RESET_REQUIRED", "SUPPORT_REQUIRED"]]
    dominant_hazard_code: Required[str | None]

ClientUploadSessionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/client_upload_session.schema.json",
    "source_hash": "fdddce78ce8db065d6443d6674cb535f0b1276ff926211fe1bd0272758179552",
}

class CollaborationActivitySlice(TypedDict, total=False):
    artifact_type: Required[Literal["CollaborationActivitySlice"]]
    item_id: Required[str]
    workspace_route_key: Required[str]
    viewer_scope: Required[Literal["STAFF_FULL", "CUSTOMER_VISIBLE"]]
    thread_visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    workspace_version: Required[int]
    shell_stability_token: Required[str]
    visibility_partition: Required[VisibilityPartitionContract]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    customer_safe_projection: Required[CustomerSafeProjectionContract | None]
    active_filters: Required[CollaborationActivitySliceActiveFilters]
    head_sequence: Required[int]
    newest_returned_sequence_or_null: Required[int | None]
    oldest_returned_sequence_or_null: Required[int | None]
    next_before_sequence_or_null: Required[int | None]
    has_more_before: Required[bool]
    focus_anchor_ref_or_null: Required[str | None]
    entry_refs: Required[list[str]]
    latest_workspace_snapshot_ref: Required[str]
    returned_at: Required[ISO8601DateTimeString]

class CollaborationActivitySliceActiveFilters(TypedDict, total=False):
    thread_visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    request_info_ref_or_null: Required[str | None]
    include_system_entries: Required[bool]
    before_sequence_or_null: Required[int | None]

CollaborationActivitySliceSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_activity_slice.schema.json",
    "source_hash": "0440134b8b268183385279b5fd5ef4cc72a0743170adf10473d2c4714d4eb23f",
}

class CollaborationAttachment(TypedDict, total=False):
    artifact_type: Required[Literal["CollaborationAttachment"]]
    attachment_id: Required[str]
    item_id: Required[str]
    published_entry_ref: Required[str]
    current_state_entry_ref: Required[str]
    state_audit_event_ref: Required[str]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    request_info_ref: Required[str | None]
    upload_session_id: Required[str]
    publish_copy_mode: Required[Literal["DIRECT_UPLOAD", "CUSTOMER_SAFE_COPY", "CUSTOMER_SAFE_DERIVATIVE"]]
    source_attachment_ref: Required[str | None]
    filename: Required[str]
    media_type: Required[str]
    byte_size: Required[int]
    checksum: Required[str]
    storage_ref: Required[str]
    download_ref: Required[str | None]
    malware_scan_state: Required[Literal["PENDING", "CLEAN", "QUARANTINED"]]
    publication_state: Required[Literal["PENDING_SCAN", "AVAILABLE", "QUARANTINED"]]
    download_state: Required[Literal["PENDING", "DOWNLOADABLE", "UNAVAILABLE"]]
    unavailable_reason_code: Required[Literal["SCAN_PENDING", "QUARANTINED_BY_MALWARE_SCAN", None]]
    uploaded_by_ref: Required[str]
    uploaded_at: Required[ISO8601DateTimeString]
    published_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    scan_completed_at: Required[ISO8601DateTimeString]
    semantic_action_id: Required[str]
    retention_class: Required[str]

CollaborationAttachmentSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_attachment.schema.json",
    "source_hash": "f8d97e1fe2bb45987dcc9f2a3db9cb0d28204f453fd99d2918e9ef9699de09d7",
}

class CollaborationAttachmentSlice(TypedDict, total=False):
    artifact_type: Required[Literal["CollaborationAttachmentSlice"]]
    item_id: Required[str]
    workspace_route_key: Required[str]
    viewer_scope: Required[Literal["STAFF_FULL", "CUSTOMER_VISIBLE"]]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    workspace_version: Required[int]
    shell_stability_token: Required[str]
    visibility_partition: Required[VisibilityPartitionContract]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    customer_safe_projection: Required[CustomerSafeProjectionContract | None]
    active_filters: Required[CollaborationAttachmentSliceActiveFilters]
    focus_anchor_ref_or_null: Required[str | None]
    current_attachment_refs: Required[list[str]]
    historical_attachment_refs: Required[list[str]]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]
    latest_workspace_snapshot_ref: Required[str]
    returned_at: Required[ISO8601DateTimeString]

class CollaborationAttachmentSliceActiveFilters(TypedDict, total=False):
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    request_info_ref_or_null: Required[str | None]
    include_history: Required[bool]
    include_pending_placeholders: Required[bool]

CollaborationAttachmentSliceSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_attachment_slice.schema.json",
    "source_hash": "036d2cb7dafe1541e284cea12b57d74ca84e94608c0063d16a6a2d58d9ed8dcc",
}

class CollaborationEntry(TypedDict, total=False):
    entry_id: Required[str]
    item_id: Required[str]
    thread_id: Required[str]
    thread_sequence: Required[int]
    entry_type: Required[Literal["COMMENT", "NOTE", "STATUS_CHANGE", "ASSIGNMENT_CHANGE", "ESCALATION", "REQUEST_INFO", "REQUEST_INFO_RESPONSE", "ATTACHMENT_ONLY", "SYSTEM"]]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    causal_parent_entry_ref: Required[str | None]
    body_ref: Required[str | None]
    attachment_refs: Required[list[str]]
    actor_ref: Required[str]
    created_at: Required[ISO8601DateTimeString]
    command_id: Required[str]
    semantic_action_id: Required[str]
    command_receipt_ref: Required[str]
    audit_event_ref: Required[str]
    request_info_ref: Required[str | None]
    redaction_state: Required[Literal["NONE", "REDACTED"]]

CollaborationEntrySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_entry.schema.json",
    "source_hash": "5f16f8f72a8d6d74606a69bab0094e0685e2794dd9b402c8a0ae1abf19279eb8",
}

class CollaborationQueueProjectionContract(TypedDict, total=False):
    projection_scope: Required[Literal["WORK_INBOX_ROW", "WORKSPACE_QUEUE_PROJECTION", "WORKSPACE_STREAM_EVENT", "WORK_ITEM_NOTIFICATION"]]
    basis_hash: Required[str]
    routing_contract: Required[CollaborationRoutingContract]
    latest_change_lane_or_null: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY", "MIXED_VISIBLE", None]]
    customer_unread_count: Required[int]
    internal_unread_count_or_null: Required[int | None]
    customer_activity_module_badge_count: Required[int]
    internal_activity_module_badge_count_or_null: Required[int | None]
    canonical_sort_key: Required[dict[str, JSONValue]]
    focus_continuity_state: Required[Literal["STABLE", "PENDING_REORDER_UNTIL_FOCUS_EXIT", "PENDING_REMOVAL_UNTIL_FOCUS_EXIT"]]
    filter_membership_state: Required[Literal["IN_ACTIVE_FILTER_SET", "FILTER_EXIT_PENDING_FOCUS_RELEASE", "OUT_OF_FILTER_SET"]]
    notification_target_module_code_or_null: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", None]]

CollaborationQueueProjectionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
    "source_hash": "faee41ad3d85a1b29c9e7be58468a2f7698f99d279be4a0ffcf70cf4ce051227",
}

class CollaborationRoutingContract(TypedDict, total=False):
    contract_version: Required[Literal["COLLABORATION_ROUTING_V1"]]
    routing_scope: Required[Literal["WORKFLOW_ITEM", "WORK_INBOX_ROW", "WORKSPACE_QUEUE_PROJECTION", "WORKSPACE_STREAM_EVENT", "WORK_ITEM_NOTIFICATION"]]
    routing_profile_code: Required[Literal["COLLABORATION_ROUTING_FORMULA_V1"]]
    routing_profile_hash: Required[str]
    routing_queue_ref: Required[str]
    basis_hash: Required[str]
    canonical_sort_key: Required[dict[str, JSONValue]]
    assignment_efficiency_score: Required[int]
    ownership_confidence_score: Required[int]
    sla_pressure_score: Required[int]
    escalation_pressure_score: Required[int]
    escalation_pressure_threshold: Required[int]
    reassignment_gain_threshold: Required[int]
    resolution_confidence_score: Required[int]
    resolution_confidence_floor: Required[int]
    queue_health_score: Required[int]
    queue_pressure_score: Required[int]
    queue_health_floor: Required[int]
    queue_health_state: Required[Literal["HEALTHY", "DEGRADED", "SATURATED"]]
    escalation_rank: Required[int]
    collaboration_priority_score: Required[int]
    assignment_recommendation_state: Required[Literal["KEEP_CURRENT_OWNER", "ASSIGN_RECOMMENDED", "REASSIGN_RECOMMENDED", "NO_ELIGIBLE_OWNER"]]
    recommended_assignee_ref_or_null: Required[str | None]
    escalation_recommendation_state: Required[Literal["NO_ESCALATION", "ESCALATE_RECOMMENDED", "ESCALATED_ACTIVE", "MANUAL_REVIEW_REQUIRED"]]
    recommended_escalation_target_ref_or_null: Required[str | None]
    recommended_action_code_or_null: Required[str | None]
    focused_row_reorder_state: Required[Literal["APPLY_IMMEDIATELY", "DEFER_REORDER_UNTIL_FOCUS_EXIT"]]
    draft_safety_state: Required[Literal["NO_DRAFT_LOCK", "DRAFT_LOCK_PREVENTS_TRANSFER", "COMMAND_PENDING_PREVENTS_TRANSFER"]]
    ordering_reason_codes: Required[list[str]]
    recommendation_reason_codes: Required[list[str]]

CollaborationRoutingContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_routing_contract.schema.json",
    "source_hash": "0c282041910d617200386bd615b00e91396767e7b51d886177832f355ea0909d",
}

class CollaborationThread(TypedDict, total=False):
    thread_id: Required[str]
    item_id: Required[str]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    head_sequence: Required[int]
    lifecycle_state: Required[Literal["OPEN", "CLOSED", "LIMITED"]]
    participant_refs: Required[list[str]]
    last_entry_ref: Required[str | None]

CollaborationThreadSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collaboration_thread.schema.json",
    "source_hash": "4241551fc3d68764f6f82cb53ba6a83f69ce2e3185bc4501e4fd504c7ba58231",
}

type CustomerRequestListSnapshotSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type CustomerRequestListSnapshotRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type CustomerRequestListSnapshotStatusCode = Literal["ACTION_REQUIRED", "IN_REVIEW", "WAITING_ON_US", "WAITING_ON_AUTHORITY", "COMPLETED"]

type CustomerRequestListSnapshotDueState = Literal["NONE", "ON_TRACK", "DUE_SOON", "OVERDUE"]

type CustomerRequestListSnapshotArtifactHistoryState = Literal["NO_SHARED_FILES", "CURRENT_ONLY", "CURRENT_PLUS_HISTORY", "HISTORY_ONLY", "LIMITED"]

class CustomerRequestListSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["CustomerRequestListSnapshot"]]
    tenant_id: Required[str]
    client_id: Required[str]
    shell_family: Required[Literal["CLIENT_PORTAL_SHELL"]]
    request_list_route_key: Required[str]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    language_contract: Required[PortalLanguageContract]
    settlement_state: Required[CustomerRequestListSnapshotSettlementState]
    recovery_posture: Required[CustomerRequestListSnapshotRecoveryPosture]
    interaction_layer: Required[PortalInteractionLayer]
    row_band_order: Required[Literal[["REQUEST_IDENTITY","STATUS_AND_DUE","REQUEST_ACTION"]]]
    queue_group_order: Required[Literal[["ACTION_REQUIRED","IN_REVIEW","WAITING_ON_US","WAITING_ON_AUTHORITY","COMPLETED"]]]
    active_filters: Required[CustomerRequestListSnapshotActiveFilters]
    list_version: Required[int]
    last_published_sequence: Required[int]
    resume_token: Required[str]
    cache_isolation_contract: Required[CacheIsolationContract]
    visibility_partition: Required[VisibilityPartitionContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    rows: Required[list[CustomerRequestListSnapshotRequestRow]]
    selected_item_ref_or_null: Required[str | None]
    selected_focus_anchor_ref_or_null: Required[str | None]
    updated_at: Required[ISO8601DateTimeString]

class CustomerRequestListSnapshotActiveFilters(TypedDict, total=False):
    status_codes: Required[list[CustomerRequestListSnapshotStatusCode]]
    due_states: Required[list[CustomerRequestListSnapshotDueState]]
    unread_only: Required[bool]
    files_requested_only: Required[bool]

class CustomerRequestListSnapshotRequestRow(TypedDict, total=False):
    item_id: Required[str]
    focus_anchor_ref: Required[str]
    title: Required[str]
    status_code: Required[CustomerRequestListSnapshotStatusCode]
    status_label_ref: Required[str]
    due_state: Required[CustomerRequestListSnapshotDueState]
    due_at_or_null: Required[ISO8601DateTimeString]
    due_label_ref_or_null: Required[str | None]
    unread_count: Required[int]
    last_staff_update_at_or_null: Required[ISO8601DateTimeString]
    files_requested: Required[bool]
    primary_action_code_or_null: Required[Literal["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO", None]]
    primary_action_label_ref_or_null: Required[str | None]
    no_safe_action_reason_ref_or_null: Required[str | None]
    authoritative_action: Required[ActionAuthorityContract]
    artifact_history_state: Required[CustomerRequestListSnapshotArtifactHistoryState]
    current_artifact_ref_or_null: Required[str | None]
    historical_artifact_refs: Required[list[str]]

CustomerRequestListSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/customer_request_list_snapshot.schema.json",
    "source_hash": "7a4872905f3e52ee333128546dadd28ab8ea4633757487d553675605d1c83fe2",
}

type CustomerSafeProjectionContractBlockedSignalClass = Literal["ASSIGNMENT_STATE", "ESCALATION_LOGIC", "RAW_GATE_STATE", "STAFF_REASON_CODES", "AUDIT_LINEAGE", "INTERNAL_ACTIVITY", "INTERNAL_ATTACHMENTS", "INTERNAL_PARTICIPANTS", "INTERNAL_COUNTS", "STAFF_ROUTE_CONTEXT"]

class CustomerSafeProjectionContract(TypedDict, total=False):
    contract_version: Required[Literal["CUSTOMER_SAFE_PROJECTION_V1"]]
    boundary_scope: Required[Literal["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST", "COLLABORATION_ACTIVITY_SLICE", "COLLABORATION_ATTACHMENT_SLICE", "WORKSPACE_STREAM_EVENT", "CLIENT_DOCUMENT_REQUEST", "CLIENT_APPROVAL_PACK", "CLIENT_ONBOARDING_JOURNEY", "CLIENT_TIMELINE_EVENT", "WORKSPACE_CUSTOMER_REQUEST", "WORK_ITEM_NOTIFICATION"]]
    projection_audience: Required[Literal["CLIENT_PORTAL", "CUSTOMER_COLLABORATION"]]
    shell_family: Required[Literal["CLIENT_PORTAL_SHELL"]]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    visibility_cache_partition_key: Required[str]
    status_derivation_policy: Required[Literal["CUSTOMER_SAFE_BLOCKS_ONLY"]]
    staff_field_dependency_policy: Required[Literal["EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE"]]
    plain_language_status_policy: Required[Literal["CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY"]]
    plain_language_action_policy: Required[Literal["CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY"]]
    limitation_notice_policy: Required[Literal["EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED"]]
    recovery_explanation_policy: Required[Literal["EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED"]]
    artifact_history_policy: Required[Literal["CURRENT_VERSUS_HISTORY_EXPLICIT"]]
    hidden_activity_policy: Required[Literal["NO_HIDDEN_ACTIVITY_DERIVATION"]]
    module_projection_policy: Required[Literal["CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY"]]
    attachment_visibility_policy: Required[Literal["CUSTOMER_VISIBLE_ATTACHMENTS_ONLY"]]
    live_update_visibility_policy: Required[Literal["INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED"]]
    draft_placeholder_policy: Required[Literal["CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS"]]
    notification_navigation_policy: Required[Literal["PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY"]]
    export_visibility_policy: Required[Literal["CUSTOMER_VISIBLE_EXPORTS_ONLY"]]
    blocked_staff_signal_classes: Required[list[CustomerSafeProjectionContractBlockedSignalClass]]

CustomerSafeProjectionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
    "source_hash": "509f152350698005aec20351981b8db2a0f7b81ff78cd65139dcc2cbf436dbb3",
}

class PortalHelpRequest(TypedDict, total=False):
    artifact_type: Required[Literal["PortalHelpRequest"]]
    help_request_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str | None]
    item_id: Required[str | None]
    request_info_ref: Required[str | None]
    source_focus_anchor_ref: Required[str]
    source_route: Required[Literal["HOME", "DOCUMENTS", "APPROVALS", "ONBOARDING", "HELP", "REQUEST_DETAIL"]]
    support_channel: Required[Literal["PORTAL_HELP", "CONTEXTUAL_REQUEST"]]
    reason_family: Required[Literal["STATUS_QUESTION", "DOCUMENT_HELP", "APPROVAL_HELP", "ONBOARDING_HELP", "ACCESS_HELP", "GENERAL_HELP"]]
    subject_line: Required[str]
    body_ref: Required[str]
    case_context_refs: Required[list[str]]
    opened_by_ref: Required[str]
    lifecycle_state: Required[Literal["OPEN", "ACKNOWLEDGED", "RESPONDED", "CLOSED"]]
    opened_at: Required[ISO8601DateTimeString]
    acknowledged_at: Required[ISO8601DateTimeString]
    response_ref: Required[str | None]
    responded_at: Required[ISO8601DateTimeString]
    closed_at: Required[ISO8601DateTimeString]

PortalHelpRequestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/portal_help_request.schema.json",
    "source_hash": "a1ca4f1acd72c786999e88d9a56c3b3c07e2b2f956477db3fb3cb8d69e585c05",
}

class PortalInteractionLayer(TypedDict, total=False):
    foundation_contract: Required[InteractionLayerFoundationContract]
    navigation_model: Required[Literal["TOP_LEVEL_TABS_CONTEXTUAL_DETAIL"]]
    spacing_profile: Required[Literal["COMFORTABLE_TASK_FIRST"]]
    status_language_profile: Required[Literal["PLAIN_LITERAL_CLIENT_SAFE"]]
    selector_profile: Required[Literal["PORTAL_SEMANTIC_SELECTORS_V1"]]
    support_region_policy: Required[Literal["ONE_PROMOTED_REGION_MAX"]]
    route_continuity_policy: Required[Literal["SAME_SHELL_CONTEXTUAL_RETURN"]]
    focus_restoration_policy: Required[Literal["RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE"]]
    artifact_hierarchy_policy: Required[Literal["CURRENT_PRIMARY_HISTORY_SECONDARY"]]
    responsive_detail_policy: Required[Literal["STACK_SUPPORT_BELOW_PRIMARY"]]
    motion_profile: Required[Literal["SUBTLE_CAUSAL_ONLY"]]
    feedback_truth_policy: Required[Literal["DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN"]]

PortalInteractionLayerSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/portal_interaction_layer.schema.json",
    "source_hash": "1b88474a2e418c513ca6fb12ef8b971b2ceb5646b93620c6ec587522f0cc7ec5",
}

class PortalLanguageContract(TypedDict, total=False):
    contract_code: Required[Literal["PORTAL_LANGUAGE_CONTRACT_V1"]]
    plain_language_policy: Required[Literal["CLIENT_SAFE_LITERAL_TASK_LANGUAGE"]]
    copy_serialization_policy: Required[Literal["DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY"]]
    dominance_policy: Required[Literal["ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION"]]
    support_subordination_policy: Required[Literal["ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK"]]
    role_filter_policy: Required[Literal["ROLE_FILTER_BEFORE_COPY_PUBLICATION"]]
    due_label_policy: Required[Literal["EXPLICIT_DUE_DATE_OR_NO_DEADLINE"]]
    history_language_policy: Required[Literal["CURRENT_PRIMARY_HISTORY_EXPLICIT"]]
    settlement_language_policy: Required[Literal["PENDING_AND_SETTLED_EXPLICIT"]]
    forbidden_term_families: Required[Literal[["GATE_LANGUAGE","MANIFEST_LANGUAGE","STALE_OR_REBASE_JARGON","OVERRIDE_LANGUAGE","AUDIT_LANGUAGE","ESCALATION_LANGUAGE","ASSIGNMENT_LANGUAGE","STAFF_ROLE_LANGUAGE","WORKFLOW_LANGUAGE","INTERNAL_ONLY_LANGUAGE"]]]
    copy_budget: Required[dict[str, JSONValue]]

PortalLanguageContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/portal_language_contract.schema.json",
    "source_hash": "e79c46591e1daa87fd488a76f04a784ad7d738ef4d7c9e8c2455e91dd549a298",
}

class RequestInfoRecord(TypedDict, total=False):
    artifact_type: Required[Literal["RequestInfoRecord"]]
    request_info_id: Required[str]
    item_id: Required[str]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE"]]
    request_info_ordinal: Required[int]
    lifecycle_state: Required[Literal["OPEN", "RESPONDED", "CLOSED"]]
    request_state_version: Required[int]
    prompt_entry_ref: Required[str]
    prompt_body_ref: Required[str]
    requested_by_ref: Required[str]
    customer_due_at: Required[ISO8601DateTimeString]
    opened_notification_refs: Required[list[str]]
    opened_at: Required[ISO8601DateTimeString]
    response_entry_ref: Required[str | None]
    response_body_ref: Required[str | None]
    responded_by_ref: Required[str | None]
    responded_at: Required[ISO8601DateTimeString]
    closure_entry_ref: Required[str | None]
    closed_by_ref: Required[str | None]
    closure_reason_code: Required[Literal["CUSTOMER_REPLY_ACCEPTED", "CANCELLED", "SUPERSEDED", None]]
    closed_at: Required[ISO8601DateTimeString]
    audit_event_refs: Required[list[str]]

RequestInfoRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/request_info_record.schema.json",
    "source_hash": "44b34797f0d758edce1cb46f3eba2b5455220ec61b002d26cd267a28acd6ce49",
}

class WorkInboxDelta(TypedDict, total=False):
    artifact_type: Required[Literal["WorkInboxDelta"]]
    tenant_id: Required[str]
    inbox_sequence: Required[int]
    delivery_class: Required[Literal["LIVE", "CATCH_UP", "SNAPSHOT"]]
    inbox_route_key: Required[str]
    inbox_version: Required[int]
    visibility_partition: Required[VisibilityPartitionContract]
    causal_semantic_action_id: Required[str | None]
    row_upserts: Required[list[WorkInboxDeltaRowUpsert]]
    row_removals: Required[list[WorkInboxDeltaRowRemoval]]
    badge_updates: Required[list[WorkInboxDeltaBadgeUpdate]]
    occurred_at: Required[ISO8601DateTimeString]

class WorkInboxDeltaRowUpsert(TypedDict, total=False):
    item_id: Required[str]
    row: Required[WorkInboxSnapshot]
    order_changed: Required[bool]
    defer_reorder_until_focus_exit: Required[bool]
    queue_projection_basis_hash: Required[str]

class WorkInboxDeltaRowRemoval(TypedDict, total=False):
    item_id: Required[str]
    removal_cause: Required[Literal["FILTER_EXIT", "VISIBILITY_EXIT", "ITEM_CLOSED", "ITEM_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]]
    preserve_until_focus_exit: Required[bool]
    queue_projection_basis_hash: Required[str]

class WorkInboxDeltaBadgeUpdate(TypedDict, total=False):
    item_id: Required[str]
    basis_hash: Required[str]
    customer_unread_count: Required[int]
    internal_unread_count: Required[int]
    customer_activity_module_badge_count: Required[int]
    internal_activity_module_badge_count_or_null: Required[int | None]
    latest_change_lane_or_null: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY", "MIXED_VISIBLE", None]]

WorkInboxDeltaSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/work_inbox_delta.schema.json",
    "source_hash": "bab33fe29004fd26359c22a1ac0d73d18853e03d7d2fbf86aae1f4737f609ffe",
}

type WorkInboxSnapshotSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type WorkInboxSnapshotRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type WorkInboxSnapshotWorkflowLifecycleState = Literal["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "WAITING_ON_AUTHORITY", "BLOCKED", "DONE", "CANCELLED", "STALE"]

type WorkInboxSnapshotWaitingOnActor = Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"]

type WorkInboxSnapshotDueState = Literal["ON_TRACK", "DUE_SOON", "OVERDUE", "BREACHED"]

type WorkInboxSnapshotCustomerStatusProjection = Literal["UNDER_REVIEW", "ACTION_REQUIRED", "WAITING_ON_CONFIRMATION", "RESOLVED", "CLOSED"]

type WorkInboxSnapshotFilterChipCode = Literal["MINE", "UNASSIGNED", "ESCALATED", "WAITING_ON_CUSTOMER", "OVERDUE", "BLOCKED", "RESOLVED_RECENTLY"]

class WorkInboxSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["WorkInboxSnapshot"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["CALM_SHELL"]]
    inbox_route_key: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[WorkInboxSnapshotSettlementState]
    recovery_posture: Required[WorkInboxSnapshotRecoveryPosture]
    interaction_layer: Required[OperatorInteractionLayer]
    viewer_mode: Required[Literal["STAFF_MUTATING", "STAFF_READ_ONLY"]]
    active_filters: Required[WorkInboxSnapshotActiveFilters]
    queue_health_score: Required[int]
    queue_health_contract: Required[WorkQueueHealthContract]
    inbox_version: Required[int]
    last_published_sequence: Required[int]
    resume_token: Required[str]
    cache_isolation_contract: Required[CacheIsolationContract]
    visibility_partition: Required[VisibilityPartitionContract]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    rows: Required[list[WorkInboxSnapshotRow]]
    selected_item_ref: Required[str | None]
    selected_focus_anchor_ref_or_null: Required[str | None]

class WorkInboxSnapshotActiveFilters(TypedDict, total=False):
    assignee_scope: Required[Literal["ALL", "MINE", "UNASSIGNED"]]
    lifecycle_states: Required[list[WorkInboxSnapshotWorkflowLifecycleState]]
    waiting_on_actors: Required[list[WorkInboxSnapshotWaitingOnActor]]
    due_states: Required[list[WorkInboxSnapshotDueState]]
    customer_status_projections: Required[list[WorkInboxSnapshotCustomerStatusProjection]]
    selected_filter_chips: Required[list[WorkInboxSnapshotFilterChipCode]]
    escalation_only: Required[bool]
    include_resolved_recently: Required[bool]

class WorkInboxSnapshotSortKey(TypedDict, total=False):
    collaboration_priority_score: Required[int]
    escalation_rank: Required[int]
    effective_due_at: Required[ISO8601DateTimeString]
    resolution_confidence_score: Required[int]
    queue_entered_at: Required[ISO8601DateTimeString]
    item_id: Required[str]

class WorkInboxSnapshotRowActions(TypedDict, total=False):
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: Required[str | None]
    secondary_action_codes: Required[list[str]]
    available_action_codes: Required[list[str]]
    blocked_action_codes: Required[list[str]]
    available_action_bindings: Required[list[dict[str, JSONValue]]]
    authoritative_action: Required[ActionAuthorityContract]

class WorkInboxSnapshotRow(TypedDict, total=False):
    item_id: Required[str]
    focus_anchor_ref: Required[str]
    sort_key: Required[WorkInboxSnapshotSortKey]
    queue_projection: Required[CollaborationQueueProjectionContract]
    title: Required[str]
    client_label: Required[str]
    period_label: Required[str]
    internal_lifecycle_state: Required[WorkInboxSnapshotWorkflowLifecycleState]
    customer_status_projection: Required[Literal["UNDER_REVIEW", "ACTION_REQUIRED", "WAITING_ON_CONFIRMATION", "RESOLVED", "CLOSED", None]]
    assignee_label: Required[str | None]
    waiting_on_actor: Required[WorkInboxSnapshotWaitingOnActor]
    due_state: Required[Literal["ON_TRACK", "DUE_SOON", "OVERDUE", "BREACHED", None]]
    effective_due_at: Required[ISO8601DateTimeString]
    last_activity_at: Required[ISO8601DateTimeString]
    customer_unread_count: Required[int]
    internal_unread_count: Required[int]
    escalation_active: Required[bool]
    collaboration_priority_score: Required[int]
    escalation_rank: Required[int]
    resolution_confidence_score: Required[int]
    sla_pressure_score: Required[int]
    queue_entered_at: Required[ISO8601DateTimeString]
    row_actions: Required[WorkInboxSnapshotRowActions]

WorkInboxSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/work_inbox_snapshot.schema.json",
    "source_hash": "7936b537901dc5d302d42f49cfa36253efe54dfc41850dd7b42d2dc15d6bada9",
}

class WorkItemNotification(TypedDict, total=False):
    notification_id: Required[str]
    item_id: Required[str]
    recipient_ref: Required[str]
    visibility_class: Required[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]
    notification_type: Required[Literal["NEW_ASSIGNMENT", "REASSIGNMENT", "ESCALATION", "CUSTOMER_REPLY", "CUSTOMER_DUE_DATE_CHANGED", "SLA_DUE_SOON", "SLA_OVERDUE", "SLA_BREACHED", "ITEM_RESOLVED", "ITEM_CANCELLED", "REQUEST_INFO_OPENED", "CUSTOMER_VISIBLE_COMMENT"]]
    delivery_channel: Required[Literal["IN_APP", "EMAIL", "PUSH"]]
    dedupe_key: Required[str]
    semantic_action_id: Required[str]
    visibility_partition: Required[VisibilityPartitionContract]
    access_binding_hash: Required[str]
    customer_safe_projection: Required[CustomerSafeProjectionContract | None]
    queue_projection: Required[CollaborationQueueProjectionContract]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL"]]
    object_anchor_ref: Required[str]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    target_route_ref: Required[str]
    target_module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]
    focus_anchor_ref: Required[str | None]
    focus_restoration: Required[FocusRestorationContract]
    return_route_ref: Required[str]
    return_focus_anchor_ref: Required[str]
    fallback_route_ref: Required[str]
    fallback_focus_anchor_ref: Required[str]
    fallback_reason_code_or_null: Required[str | None]
    workspace_version_at_queue: Required[int]
    request_info_ref: Required[str | None]
    queued_at: Required[ISO8601DateTimeString]
    delivered_at: Required[ISO8601DateTimeString]
    read_at: Required[ISO8601DateTimeString]
    suppressed_reason_codes: Required[list[str]]

WorkItemNotificationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/work_item_notification.schema.json",
    "source_hash": "e675b25673a25b05297ad110b6214150e7f60406b0cc717f9f7d11589f7d5d56",
}

class WorkItemParticipant(TypedDict, total=False):
    artifact_type: Required[Literal["WorkItemParticipant"]]
    participant_ref: Required[str]
    item_id: Required[str]
    participant_role: Required[Literal["PREPARER", "REVIEWER", "APPROVER", "SUPPORT_OPERATOR", "TENANT_ADMIN", "AUDITOR", "CLIENT_VIEWER", "CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY", "SUBJECT_SELF", "SUBJECT_REPRESENTATIVE"]]
    watch_state: Required[Literal["PRIMARY_OWNER", "WATCHER", "CUSTOMER_PARTICIPANT"]]
    last_read_customer_sequence: Required[int | None]
    last_read_internal_sequence: Required[int | None]
    notification_preferences_ref: Required[str]

WorkItemParticipantSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/work_item_participant.schema.json",
    "source_hash": "e7a8bba88b2549451d348d63d7da2782b67f548efd510cdf20d59a9ae4605add",
}

class WorkQueueHealthContract(TypedDict, total=False):
    contract_version: Required[Literal["WORK_QUEUE_HEALTH_V1"]]
    queue_scope: Required[Literal["WORK_INBOX_SNAPSHOT"]]
    routing_profile_code: Required[Literal["COLLABORATION_ROUTING_FORMULA_V1"]]
    routing_profile_hash: Required[str]
    queue_route_key: Required[str]
    basis_hash: Required[str]
    queue_health_score: Required[int]
    queue_pressure_score: Required[int]
    queue_health_floor: Required[int]
    queue_health_state: Required[Literal["HEALTHY", "DEGRADED", "SATURATED"]]
    intervention_recommendation_state: Required[Literal["NONE", "REBALANCE", "STAFFING_REVIEW", "MANUAL_TRIAGE"]]
    ordering_policy: Required[Literal["CANONICAL_SORT_KEY_ONLY"]]
    focus_safe_live_update_policy: Required[Literal["DEFER_TO_ROUTING_CONTINUITY_STATE"]]
    reason_codes: Required[list[str]]

WorkQueueHealthContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/work_queue_health_contract.schema.json",
    "source_hash": "a7a2fd062ddb5b74d8510437df68eb977ded72932b1615cb16dd59336b93fe5d",
}

type WorkspaceSnapshotSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type WorkspaceSnapshotRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

class WorkspaceSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["WorkspaceSnapshot"]]
    item_id: Required[str]
    tenant_id: Required[str]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL"]]
    object_anchor_ref: Required[str]
    workspace_route_key: Required[str]
    experience_profile: Required[Literal["LOW_NOISE"]]
    viewer_scope: Required[Literal["STAFF_FULL", "CUSTOMER_VISIBLE"]]
    dominant_question: Required[str]
    dominance_contract: Required[ShellDominanceContract]
    state_taxonomy_contract: Required[ShellStateTaxonomyContract]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    settlement_state: Required[WorkspaceSnapshotSettlementState]
    recovery_posture: Required[WorkspaceSnapshotRecoveryPosture]
    interaction_layer: Required[OperatorInteractionLayer]
    frame_epoch: Required[int]
    workspace_version: Required[int]
    customer_head_sequence: Required[int]
    internal_head_sequence_or_null: Required[int | None]
    active_request_info_ref_or_null: Required[str | None]
    request_state_version_or_null: Required[int | None]
    shell_stability_token: Required[str]
    last_published_sequence: Required[int]
    resume_token: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    stability_contract: Required[RouteStabilityContract]
    visibility_partition: Required[VisibilityPartitionContract]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    customer_safe_projection: Required[CustomerSafeProjectionContract | None]
    queue_projection: Required[CollaborationQueueProjectionContract]
    route_context: Required[WorkspaceSnapshotRouteContext]
    surface_order: Required[list[JSONValue]]
    context_bar: Required[WorkspaceSnapshotContextBar]
    decision_summary: Required[WorkspaceSnapshotDecisionSummary]
    action_strip: Required[WorkspaceSnapshotActionStrip]
    detail_drawer: Required[WorkspaceSnapshotDetailDrawer]
    customer_request_workspace: Required[WorkspaceSnapshotCustomerRequestWorkspace | None]
    permissions: Required[WorkspaceSnapshotPermissions]
    participants: Required[list[WorkspaceSnapshotWorkItemParticipant]]

class WorkspaceSnapshotRouteContext(TypedDict, total=False):
    entry_surface: Required[Literal["WORK_INBOX", "MANIFEST_LINK", "REQUEST_LIST", "PORTAL_HOME", "PORTAL_APPROVALS", "PORTAL_HELP", "NOTIFICATION", "DIRECT_URL", "NATIVE_RESTORE"]]
    active_route_ref: Required[str]
    active_module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL"]]
    focus_anchor_ref_or_null: Required[str | None]
    focus_restoration: Required[FocusRestorationContract]
    artifact_focus_bucket_or_null: Required[Literal["PRIMARY", "HISTORY", "LIMITATION_NOTICE", None]]
    artifact_focus_subject_ref_or_null: Required[str | None]
    return_route_ref: Required[str]
    return_focus_anchor_ref: Required[str]
    fallback_route_ref: Required[str]
    fallback_focus_anchor_ref: Required[str]
    fallback_reason_code: Required[str]

class WorkspaceSnapshotContextBar(TypedDict, total=False):
    title: Required[str]
    item_id: Required[str]
    client_label: Required[str]
    period_label: Required[str]
    internal_lifecycle_state: Required[Literal["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "WAITING_ON_AUTHORITY", "BLOCKED", "DONE", "CANCELLED", "STALE", None]]
    customer_status_projection: Required[str]
    assignee_label: Required[str | None]
    escalation_active: Required[bool | None]
    waiting_on_actor: Required[Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"]]
    due_state: Required[Literal["ON_TRACK", "DUE_SOON", "OVERDUE", "BREACHED"]]
    freshness_state: Required[Literal["FRESH", "RECONNECTING", "CATCHING_UP", "STALE", "DEGRADED"]]
    freshness_notice_ref_or_null: Required[str | None]
    recovery_notice_ref_or_null: Required[str | None]

class WorkspaceSnapshotDecisionSummary(TypedDict, total=False):
    summary_ref: Required[str]
    next_actor: Required[Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"]]
    next_actor_summary_ref: Required[str]
    due_summary_ref: Required[str]
    customer_state_differs: Required[bool | None]
    customer_state_summary_ref: Required[str | None]
    reason_codes: Required[list[str]]

class WorkspaceSnapshotActionStrip(TypedDict, total=False):
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: Required[str | None]
    secondary_action_codes: Required[list[str]]
    available_action_codes: Required[list[str]]
    blocked_action_codes: Required[list[str]]
    ownership_posture: Required[Literal["SELF", "CUSTOMER_WAIT", "STAFF_WAIT", "AUTHORITY_WAIT", "SYSTEM_WAIT", "NONE"]]
    ownership_label: Required[str | None]
    waiting_on_label: Required[str | None]
    blocking_reason: Required[str | None]
    machine_reason_codes: Required[list[str]]
    suggested_module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]
    authoritative_action: Required[ActionAuthorityContract]

class WorkspaceSnapshotCustomerRequestWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["CONTEXT_BAR","DECISION_SUMMARY","ACTION_STRIP","DETAIL_DRAWER"]]]
    language_contract: Required[PortalLanguageContract]
    status_code: Required[Literal["ACTION_REQUIRED", "IN_REVIEW", "WAITING_ON_US", "WAITING_ON_AUTHORITY", "COMPLETED"]]
    status_label_ref: Required[str]
    due_label_ref_or_null: Required[str | None]
    action_order: Required[Literal[["REPLY","UPLOAD_FILE","RESPOND_TO_REQUEST_INFO"]]]
    visible_action_codes: Required[list[Literal["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"]]]
    primary_action_label_ref_or_null: Required[str | None]
    no_safe_action_reason_ref_or_null: Required[str | None]
    authoritative_action: Required[ActionAuthorityContract]
    artifact_history_state: Required[Literal["NO_SHARED_FILES", "CURRENT_ONLY", "CURRENT_PLUS_HISTORY", "HISTORY_ONLY", "LIMITED"]]
    current_artifact_ref_or_null: Required[str | None]
    historical_artifact_refs: Required[list[str]]
    artifact_selection: Required[ArtifactSelectionContract]
    artifact_affordance: Required[ArtifactAffordanceContract]

class WorkspaceSnapshotDetailDrawer(TypedDict, total=False):
    modules: Required[list[WorkspaceSnapshotModuleState]]
    promoted_module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]
    expanded_module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]
    focus_anchor_ref: Required[str | None]
    fallback_reason_code: Required[str | None]
    composer_layer: Required[WorkspaceSnapshotComposerLayer]

class WorkspaceSnapshotComposerLayer(TypedDict, total=False):
    surface_order: Required[list[JSONValue]]
    available_append_command_codes: Required[list[Literal["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO", "RESPOND_TO_REQUEST_INFO"]]]
    default_append_command_code_or_null: Required[Literal["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO", "RESPOND_TO_REQUEST_INFO", None]]
    selected_append_command_code_or_null: Required[Literal["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO", "RESPOND_TO_REQUEST_INFO", None]]
    composer_visibility_class_or_null: Required[Literal["INTERNAL_ONLY", "CUSTOMER_VISIBLE", None]]
    visibility_label_ref_or_null: Required[str | None]
    target_request_info_ref_or_null: Required[str | None]
    draft_state: Required[Literal["NONE", "ACTIVE", "REBASED", "STALE_REVIEW_REQUIRED"]]
    draft_ref_or_null: Required[str | None]
    draft_last_saved_at_or_null: Required[ISO8601DateTimeString]
    rebase_target_snapshot_ref_or_null: Required[str | None]
    publish_block_reason_codes: Required[list[str]]
    attachment_picker: Required[WorkspaceSnapshotAttachmentPicker]
    publish_confirmation: Required[WorkspaceSnapshotPublishConfirmation]

class WorkspaceSnapshotAttachmentPicker(TypedDict, total=False):
    picker_state: Required[Literal["EMPTY", "STAGED", "READY", "LIMITED"]]
    staged_upload_refs: Required[list[str]]
    inherited_visibility_class_or_null: Required[Literal["INTERNAL_ONLY", "CUSTOMER_VISIBLE", None]]
    visibility_confirmation_required: Required[bool]
    visibility_confirmed: Required[bool]

class WorkspaceSnapshotPublishConfirmation(TypedDict, total=False):
    confirmation_state: Required[Literal["NOT_REQUIRED", "REQUIRED", "CONFIRMED", "RECEIPT_PENDING", "BLOCKED_BY_REBASE"]]
    publish_action_code_or_null: Required[Literal["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO", "RESPOND_TO_REQUEST_INFO", None]]
    confirmation_message_ref_or_null: Required[str | None]

class WorkspaceSnapshotModuleState(TypedDict, total=False):
    module_code: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL"]]
    content_state: Required[Literal["POPULATED", "NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE"]]
    state_reason_code_or_null: Required[Literal["REQUEST_NOT_TRIGGERED", "MATERIALIZATION_PENDING", "NOT_APPLICABLE_TO_CONTEXT", None]]
    limitation_reason_codes: Required[list[str]]
    placeholder_refs: Required[list[str]]
    module_badge_count: Required[int]
    new_activity_marker_ref_or_null: Required[str | None]
    visibility_partition: Required[Literal["CUSTOMER_VISIBLE_ONLY", "INTERNAL_ONLY_ONLY", "SEGMENTED_BY_VISIBILITY"]]
    file_segments: Required[list[Literal["SHARED_WITH_CUSTOMER", "INTERNAL_ONLY"]]]
    current_shared_file_refs: Required[list[str]]
    historical_shared_file_refs: Required[list[str]]
    internal_only_file_refs: Required[list[str]]

class WorkspaceSnapshotPermissions(TypedDict, total=False):
    can_reply_customer_visible: Required[bool]
    can_publish_request_info: Required[bool]
    can_add_internal_note: Required[bool]
    can_assign: Required[bool]
    can_escalate: Required[bool]
    can_change_status: Required[bool]
    can_view_audit_trail: Required[bool]

class WorkspaceSnapshotWorkItemParticipant(TypedDict, total=False):
    participant_ref: Required[str]
    item_id: Required[str]
    participant_role: Required[Literal["PREPARER", "REVIEWER", "APPROVER", "SUPPORT_OPERATOR", "TENANT_ADMIN", "AUDITOR", "CLIENT_VIEWER", "CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY", "SUBJECT_SELF", "SUBJECT_REPRESENTATIVE"]]
    watch_state: Required[Literal["PRIMARY_OWNER", "WATCHER", "CUSTOMER_PARTICIPANT"]]
    last_read_customer_sequence: Required[int | None]
    last_read_internal_sequence: Required[int | None]
    notification_preferences_ref: Required[str]

WorkspaceSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/workspace_snapshot.schema.json",
    "source_hash": "47a79ceeb06d68483fd8baca9146fc297049848ef5fd1a6d92ec6bc2089dddea",
}

class WorkspaceStreamEvent(TypedDict, total=False):
    artifact_type: Required[Literal["WorkspaceStreamEvent"]]
    stream_scope_class: Required[Literal["WORKSPACE"]]
    item_id: Required[str]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL"]]
    object_anchor_ref: Required[str]
    workspace_route_key: Required[str]
    session_visibility_class: Required[Literal["STAFF_FULL", "CUSTOMER_VISIBLE"]]
    workspace_sequence: Required[int]
    frame_epoch: Required[int]
    workspace_version: Required[int]
    shell_stability_token: Required[str]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    resume_token: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    stability_contract: Required[RouteStabilityContract]
    visibility_partition: Required[VisibilityPartitionContract]
    customer_safe_projection: Required[CustomerSafeProjectionContract | None]
    event_type: Required[Literal["workspace.delta", "workspace.snapshot", "activity.appended", "audit.appended", "notification.badge", "heartbeat"]]
    queue_projection_or_null: Required[None | CollaborationQueueProjectionContract]
    snapshot_ref: Required[str | None]
    delta_ref: Required[str | None]
    activity_ref: Required[str | None]
    audit_ref: Required[str | None]
    notification_ref: Required[str | None]
    occurred_at: Required[ISO8601DateTimeString]

WorkspaceStreamEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/workspace_stream_event.schema.json",
    "source_hash": "aaab80fcae970968d9466994590f711726f2d4221d5ee69644d24c1e893c46fa",
}

ClientAndCollaborationBindingManifest = {"family_ref": "CLIENT_AND_COLLABORATION", "schema_count": 27}
