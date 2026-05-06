// DO NOT EDIT: generated downstream from packages/contracts-core.
import Foundation

public struct ClientApprovalPack: Codable, Sendable {
  public let approval_pack_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let title: String
  public let summary_ref: String
  public let change_highlights_ref: String
  public let declaration_text_ref: String
  public let approval_pack_hash: String
  public let view_guard_ref: String
  public let stale_protection_state: String
  public let lifecycle_state: String
  public let requires_step_up: Bool
  public let viewed_at: ISO8601DateTimeString
  public let change_digest_acknowledged_at: ISO8601DateTimeString
  public let declaration_acknowledged_at: ISO8601DateTimeString
  public let acknowledged_at: ISO8601DateTimeString
  public let step_up_verified_at: ISO8601DateTimeString
  public let step_up_expires_at: ISO8601DateTimeString
  public let signed_at: ISO8601DateTimeString
  public let state_changed_at: ISO8601DateTimeString
  public let approval_readiness_score: Int
  public let recovery_posture: String
  public let dominant_hazard_code: String?
  public let supersedes_pack_ref: String?
  public let language_contract: PortalLanguageContract
  public let customer_safe_projection: CustomerSafeProjectionContract
  public let externalization_governance_contract: JSONValue
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue

  public init(
    approval_pack_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    manifest_id: String?,
    title: String,
    summary_ref: String,
    change_highlights_ref: String,
    declaration_text_ref: String,
    approval_pack_hash: String,
    view_guard_ref: String,
    stale_protection_state: String,
    lifecycle_state: String,
    requires_step_up: Bool,
    viewed_at: ISO8601DateTimeString,
    change_digest_acknowledged_at: ISO8601DateTimeString,
    declaration_acknowledged_at: ISO8601DateTimeString,
    acknowledged_at: ISO8601DateTimeString,
    step_up_verified_at: ISO8601DateTimeString,
    step_up_expires_at: ISO8601DateTimeString,
    signed_at: ISO8601DateTimeString,
    state_changed_at: ISO8601DateTimeString,
    approval_readiness_score: Int,
    recovery_posture: String,
    dominant_hazard_code: String?,
    supersedes_pack_ref: String?,
    language_contract: PortalLanguageContract,
    customer_safe_projection: CustomerSafeProjectionContract,
    externalization_governance_contract: JSONValue,
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue
  ) {
    self.approval_pack_id = approval_pack_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.title = title
    self.summary_ref = summary_ref
    self.change_highlights_ref = change_highlights_ref
    self.declaration_text_ref = declaration_text_ref
    self.approval_pack_hash = approval_pack_hash
    self.view_guard_ref = view_guard_ref
    self.stale_protection_state = stale_protection_state
    self.lifecycle_state = lifecycle_state
    self.requires_step_up = requires_step_up
    self.viewed_at = viewed_at
    self.change_digest_acknowledged_at = change_digest_acknowledged_at
    self.declaration_acknowledged_at = declaration_acknowledged_at
    self.acknowledged_at = acknowledged_at
    self.step_up_verified_at = step_up_verified_at
    self.step_up_expires_at = step_up_expires_at
    self.signed_at = signed_at
    self.state_changed_at = state_changed_at
    self.approval_readiness_score = approval_readiness_score
    self.recovery_posture = recovery_posture
    self.dominant_hazard_code = dominant_hazard_code
    self.supersedes_pack_ref = supersedes_pack_ref
    self.language_contract = language_contract
    self.customer_safe_projection = customer_safe_projection
    self.externalization_governance_contract = externalization_governance_contract
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
  }
}

public enum ClientApprovalPackSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_approval_pack.schema.json"
  public static let sourceHash = "ffc0b5884b0dab94cc27ad9cc85bd7d2ed3b5dabcca1e159388a01120d172b1f"
}

public struct ClientCompatibilityMatrix: Codable, Sendable {
  public let compatibility_matrix_id: String
  public let candidate_environment_ref: String
  public let build_artifact_ref: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract
  public let supported_client_window_ref: String
  public let browser_rows: [ClientCompatibilityMatrixMatrixRow]
  public let macos_rows: [ClientCompatibilityMatrixMatrixRow]
  public let matrix_state: String
  public let evaluated_at: ISO8601DateTimeString

  public init(
    compatibility_matrix_id: String,
    candidate_environment_ref: String,
    build_artifact_ref: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract,
    supported_client_window_ref: String,
    browser_rows: [ClientCompatibilityMatrixMatrixRow],
    macos_rows: [ClientCompatibilityMatrixMatrixRow],
    matrix_state: String,
    evaluated_at: ISO8601DateTimeString
  ) {
    self.compatibility_matrix_id = compatibility_matrix_id
    self.candidate_environment_ref = candidate_environment_ref
    self.build_artifact_ref = build_artifact_ref
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.schema_bundle_compatibility_gate_contract = schema_bundle_compatibility_gate_contract
    self.supported_client_window_ref = supported_client_window_ref
    self.browser_rows = browser_rows
    self.macos_rows = macos_rows
    self.matrix_state = matrix_state
    self.evaluated_at = evaluated_at
  }
}

public struct ClientCompatibilityMatrixMatrixRow: Codable, Sendable {
  public let client_version: String
  public let scenario: String
  public let outcome: String
  public let suite_result_ref: String

  public init(
    client_version: String,
    scenario: String,
    outcome: String,
    suite_result_ref: String
  ) {
    self.client_version = client_version
    self.scenario = scenario
    self.outcome = outcome
    self.suite_result_ref = suite_result_ref
  }
}

public enum ClientCompatibilityMatrixSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_compatibility_matrix.schema.json"
  public static let sourceHash = "f3f9d9ec2381f28c47a98f434db2cd0ae906d35cd2a2c8c8350b450306e625cf"
}

public struct ClientDocumentRequest: Codable, Sendable {
  public let request_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let category: String
  public let title: String
  public let description_ref: String
  public let requested_file_types: [String]
  public let due_at: ISO8601DateTimeString
  public let lifecycle_state: String
  public let required_count: Int
  public let request_version_ref: String
  public let upload_refs: [String]
  public let latest_upload_ref: String?
  public let current_request_upload_ref_or_null: String?
  public let review_outcome: String?
  public let assistance_mode: String?
  public let language_contract: PortalLanguageContract
  public let customer_safe_projection: CustomerSafeProjectionContract
  public let externalization_governance_contract: JSONValue
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue

  public init(
    request_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    manifest_id: String?,
    category: String,
    title: String,
    description_ref: String,
    requested_file_types: [String],
    due_at: ISO8601DateTimeString,
    lifecycle_state: String,
    required_count: Int,
    request_version_ref: String,
    upload_refs: [String],
    latest_upload_ref: String?,
    current_request_upload_ref_or_null: String?,
    review_outcome: String?,
    assistance_mode: String?,
    language_contract: PortalLanguageContract,
    customer_safe_projection: CustomerSafeProjectionContract,
    externalization_governance_contract: JSONValue,
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue
  ) {
    self.request_id = request_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.category = category
    self.title = title
    self.description_ref = description_ref
    self.requested_file_types = requested_file_types
    self.due_at = due_at
    self.lifecycle_state = lifecycle_state
    self.required_count = required_count
    self.request_version_ref = request_version_ref
    self.upload_refs = upload_refs
    self.latest_upload_ref = latest_upload_ref
    self.current_request_upload_ref_or_null = current_request_upload_ref_or_null
    self.review_outcome = review_outcome
    self.assistance_mode = assistance_mode
    self.language_contract = language_contract
    self.customer_safe_projection = customer_safe_projection
    self.externalization_governance_contract = externalization_governance_contract
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
  }
}

public enum ClientDocumentRequestSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_document_request.schema.json"
  public static let sourceHash = "85398a562c880754b21b13e9d4831d93e0df2c560821983a3b3517ab80eb1c27"
}

public struct ClientOnboardingJourney: Codable, Sendable {
  public let journey_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let lifecycle_state: String
  public let current_step_code: JSONValue
  public let required_steps: [ClientOnboardingJourneyStepCode]
  public let completed_steps: [ClientOnboardingJourneyStepCode]
  public let verification_state: String
  public let authority_link_requirement: String
  public let authority_link_state: String
  public let document_request_refs: [String]
  public let help_channel_ref: String?
  public let resume_state: String
  public let resume_step_code: JSONValue
  public let draft_upload_session_refs: [String]
  public let reconfirmation_step_codes: [ClientOnboardingJourneyStepCode]
  public let invited_at: ISO8601DateTimeString
  public let state_changed_at: ISO8601DateTimeString
  public let completed_at: ISO8601DateTimeString
  public let completion_summary_ref: String?
  public let completion_timeline_event_ref: String?
  public let expires_at: ISO8601DateTimeString
  public let expired_at: ISO8601DateTimeString
  public let abandoned_at: ISO8601DateTimeString
  public let abandonment_reason_code: String?
  public let language_contract: PortalLanguageContract
  public let customer_safe_projection: CustomerSafeProjectionContract

  public init(
    journey_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    lifecycle_state: String,
    current_step_code: JSONValue,
    required_steps: [ClientOnboardingJourneyStepCode],
    completed_steps: [ClientOnboardingJourneyStepCode],
    verification_state: String,
    authority_link_requirement: String,
    authority_link_state: String,
    document_request_refs: [String],
    help_channel_ref: String?,
    resume_state: String,
    resume_step_code: JSONValue,
    draft_upload_session_refs: [String],
    reconfirmation_step_codes: [ClientOnboardingJourneyStepCode],
    invited_at: ISO8601DateTimeString,
    state_changed_at: ISO8601DateTimeString,
    completed_at: ISO8601DateTimeString,
    completion_summary_ref: String?,
    completion_timeline_event_ref: String?,
    expires_at: ISO8601DateTimeString,
    expired_at: ISO8601DateTimeString,
    abandoned_at: ISO8601DateTimeString,
    abandonment_reason_code: String?,
    language_contract: PortalLanguageContract,
    customer_safe_projection: CustomerSafeProjectionContract
  ) {
    self.journey_id = journey_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.lifecycle_state = lifecycle_state
    self.current_step_code = current_step_code
    self.required_steps = required_steps
    self.completed_steps = completed_steps
    self.verification_state = verification_state
    self.authority_link_requirement = authority_link_requirement
    self.authority_link_state = authority_link_state
    self.document_request_refs = document_request_refs
    self.help_channel_ref = help_channel_ref
    self.resume_state = resume_state
    self.resume_step_code = resume_step_code
    self.draft_upload_session_refs = draft_upload_session_refs
    self.reconfirmation_step_codes = reconfirmation_step_codes
    self.invited_at = invited_at
    self.state_changed_at = state_changed_at
    self.completed_at = completed_at
    self.completion_summary_ref = completion_summary_ref
    self.completion_timeline_event_ref = completion_timeline_event_ref
    self.expires_at = expires_at
    self.expired_at = expired_at
    self.abandoned_at = abandoned_at
    self.abandonment_reason_code = abandonment_reason_code
    self.language_contract = language_contract
    self.customer_safe_projection = customer_safe_projection
  }
}

public enum ClientOnboardingJourneyStepCode: String, Codable, Sendable {
  case iNVITEACCEPTANCE = "INVITE_ACCEPTANCE"
  case pROFILECONFIRMATION = "PROFILE_CONFIRMATION"
  case iDENTITYVERIFICATION = "IDENTITY_VERIFICATION"
  case aUTHORITYLINKSETUP = "AUTHORITY_LINK_SETUP"
  case dOCUMENTCOLLECTION = "DOCUMENT_COLLECTION"
  case rEVIEWCONFIRMATION = "REVIEW_CONFIRMATION"
}

public enum ClientOnboardingJourneySchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_onboarding_journey.schema.json"
  public static let sourceHash = "074aca6d593700df000b390594b693ffd20dc2a39daef8c06a480729f9a10444"
}

public struct ClientPortalWorkspace: Codable, Sendable {
  public let workspace_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let viewer_role: String
  public let shell_family: JSONValue
  public let object_anchor_ref: String
  public let dominant_question: String
  public let dominance_contract: ShellDominanceContract
  public let state_taxonomy_contract: ShellStateTaxonomyContract
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let cache_isolation_contract: JSONValue
  public let semantic_accessibility_contract: SemanticAccessibilityContract
  public let language_contract: PortalLanguageContract
  public let settlement_state: ClientPortalWorkspaceSettlementState
  public let recovery_posture: ClientPortalWorkspaceRecoveryPosture
  public let identity_context: ClientPortalWorkspaceIdentityContext
  public let workspace_posture: ClientPortalWorkspaceWorkspacePosture
  public let route: String
  public let route_context: ClientPortalWorkspaceRouteContext
  public let workspace_version: Int
  public let freshness_state: String
  public let view_guard_ref: String
  public let stability_contract: RouteStabilityContract
  public let visibility_partition: JSONValue
  public let customer_safe_projection: CustomerSafeProjectionContract
  public let navigation_tabs: [ClientPortalWorkspaceNavigationTab]
  public let interaction_layer: PortalInteractionLayer
  public let status_hero: ClientPortalWorkspaceStatusHero
  public let reliability_summary: ClientPortalWorkspaceReliabilitySummary
  public let task_groups: [ClientPortalWorkspaceTaskGroup]
  public let home_surface_order: [String]?
  public let home_primary_task_ref: String?
  public let draft_resume: ClientPortalWorkspaceDraftResume
  public let content_limitations: [ClientPortalWorkspaceLimitationNotice]
  public let document_center: ClientPortalWorkspaceDocumentCenter
  public let approval_center: ClientPortalWorkspaceApprovalCenter
  public let onboarding_journey: JSONValue
  public let support_panel: ClientPortalWorkspaceSupportPanel
  public let activity_timeline: [ClientPortalWorkspaceTimelineEvent]
  public let updated_at: ISO8601DateTimeString

  public init(
    workspace_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    manifest_id: String? = nil,
    viewer_role: String,
    shell_family: JSONValue,
    object_anchor_ref: String,
    dominant_question: String,
    dominance_contract: ShellDominanceContract,
    state_taxonomy_contract: ShellStateTaxonomyContract,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    cache_isolation_contract: JSONValue,
    semantic_accessibility_contract: SemanticAccessibilityContract,
    language_contract: PortalLanguageContract,
    settlement_state: ClientPortalWorkspaceSettlementState,
    recovery_posture: ClientPortalWorkspaceRecoveryPosture,
    identity_context: ClientPortalWorkspaceIdentityContext,
    workspace_posture: ClientPortalWorkspaceWorkspacePosture,
    route: String,
    route_context: ClientPortalWorkspaceRouteContext,
    workspace_version: Int,
    freshness_state: String,
    view_guard_ref: String,
    stability_contract: RouteStabilityContract,
    visibility_partition: JSONValue,
    customer_safe_projection: CustomerSafeProjectionContract,
    navigation_tabs: [ClientPortalWorkspaceNavigationTab],
    interaction_layer: PortalInteractionLayer,
    status_hero: ClientPortalWorkspaceStatusHero,
    reliability_summary: ClientPortalWorkspaceReliabilitySummary,
    task_groups: [ClientPortalWorkspaceTaskGroup],
    home_surface_order: [String]?,
    home_primary_task_ref: String?,
    draft_resume: ClientPortalWorkspaceDraftResume,
    content_limitations: [ClientPortalWorkspaceLimitationNotice],
    document_center: ClientPortalWorkspaceDocumentCenter,
    approval_center: ClientPortalWorkspaceApprovalCenter,
    onboarding_journey: JSONValue,
    support_panel: ClientPortalWorkspaceSupportPanel,
    activity_timeline: [ClientPortalWorkspaceTimelineEvent],
    updated_at: ISO8601DateTimeString
  ) {
    self.workspace_id = workspace_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.viewer_role = viewer_role
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.dominant_question = dominant_question
    self.dominance_contract = dominance_contract
    self.state_taxonomy_contract = state_taxonomy_contract
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.cache_isolation_contract = cache_isolation_contract
    self.semantic_accessibility_contract = semantic_accessibility_contract
    self.language_contract = language_contract
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.identity_context = identity_context
    self.workspace_posture = workspace_posture
    self.route = route
    self.route_context = route_context
    self.workspace_version = workspace_version
    self.freshness_state = freshness_state
    self.view_guard_ref = view_guard_ref
    self.stability_contract = stability_contract
    self.visibility_partition = visibility_partition
    self.customer_safe_projection = customer_safe_projection
    self.navigation_tabs = navigation_tabs
    self.interaction_layer = interaction_layer
    self.status_hero = status_hero
    self.reliability_summary = reliability_summary
    self.task_groups = task_groups
    self.home_surface_order = home_surface_order
    self.home_primary_task_ref = home_primary_task_ref
    self.draft_resume = draft_resume
    self.content_limitations = content_limitations
    self.document_center = document_center
    self.approval_center = approval_center
    self.onboarding_journey = onboarding_journey
    self.support_panel = support_panel
    self.activity_timeline = activity_timeline
    self.updated_at = updated_at
  }
}

public enum ClientPortalWorkspaceSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum ClientPortalWorkspaceRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public enum ClientPortalWorkspaceRouteCode: String, Codable, Sendable {
  case hOME = "HOME"
  case dOCUMENTS = "DOCUMENTS"
  case aPPROVALS = "APPROVALS"
  case oNBOARDING = "ONBOARDING"
  case hELP = "HELP"
}

public enum ClientPortalWorkspaceContextRouteCode: String, Codable, Sendable {
  case nONE = "NONE"
  case rEQUESTDETAIL = "REQUEST_DETAIL"
  case aPPROVALDETAIL = "APPROVAL_DETAIL"
  case oNBOARDINGSTEP = "ONBOARDING_STEP"
  case hELPCONTEXT = "HELP_CONTEXT"
}

public enum ClientPortalWorkspaceContextFallbackTarget: String, Codable, Sendable {
  case lATESTVISIBLEOBJECT = "LATEST_VISIBLE_OBJECT"
  case rETURNFOCUSANCHOR = "RETURN_FOCUS_ANCHOR"
}

public enum ClientPortalWorkspaceContextNarrowScreenMode: String, Codable, Sendable {
  case sTACKEDSAMESHELL = "STACKED_SAME_SHELL"
}

public enum ClientPortalWorkspaceHelpSurfaceCode: String, Codable, Sendable {
  case hELPOPTIONS = "HELP_OPTIONS"
  case tOPQUESTIONS = "TOP_QUESTIONS"
  case cASECONTEXTPANEL = "CASE_CONTEXT_PANEL"
}

public struct ClientPortalWorkspaceIdentityContext: Codable, Sendable {
  public let client_display_name: String
  public let delegated_session: Bool
  public let acting_role_label: String?
  public let period_label: String?
  public let reassurance_line: String
  public let context_hash: String

  public init(
    client_display_name: String,
    delegated_session: Bool,
    acting_role_label: String?,
    period_label: String?,
    reassurance_line: String,
    context_hash: String
  ) {
    self.client_display_name = client_display_name
    self.delegated_session = delegated_session
    self.acting_role_label = acting_role_label
    self.period_label = period_label
    self.reassurance_line = reassurance_line
    self.context_hash = context_hash
  }
}

public struct ClientPortalWorkspaceWorkspacePosture: Codable, Sendable {
  public let connection_state: String
  public let interaction_posture: String
  public let promoted_support_region: String
  public let notice_headline: String?
  public let notice_detail: String?
  public let full_text_ref: String?

  public init(
    connection_state: String,
    interaction_posture: String,
    promoted_support_region: String,
    notice_headline: String?,
    notice_detail: String?,
    full_text_ref: String?
  ) {
    self.connection_state = connection_state
    self.interaction_posture = interaction_posture
    self.promoted_support_region = promoted_support_region
    self.notice_headline = notice_headline
    self.notice_detail = notice_detail
    self.full_text_ref = full_text_ref
  }
}

public struct ClientPortalWorkspaceRouteContext: Codable, Sendable {
  public let context_route: ClientPortalWorkspaceContextRouteCode
  public let context_object_ref: String?
  public let return_route: JSONValue
  public let focus_anchor_ref: String?
  public let focus_restoration: FocusRestorationContract
  public let artifact_focus_bucket_or_null: JSONValue
  public let artifact_focus_subject_ref_or_null: String?
  public let return_focus_anchor_ref_or_null: String?
  public let fallback_target: JSONValue
  public let fallback_object_ref_or_null: String?
  public let fallback_reason_ref_or_null: String?
  public let narrow_screen_mode: JSONValue

  public init(
    context_route: ClientPortalWorkspaceContextRouteCode,
    context_object_ref: String?,
    return_route: JSONValue,
    focus_anchor_ref: String?,
    focus_restoration: FocusRestorationContract,
    artifact_focus_bucket_or_null: JSONValue,
    artifact_focus_subject_ref_or_null: String?,
    return_focus_anchor_ref_or_null: String?,
    fallback_target: JSONValue,
    fallback_object_ref_or_null: String?,
    fallback_reason_ref_or_null: String?,
    narrow_screen_mode: JSONValue
  ) {
    self.context_route = context_route
    self.context_object_ref = context_object_ref
    self.return_route = return_route
    self.focus_anchor_ref = focus_anchor_ref
    self.focus_restoration = focus_restoration
    self.artifact_focus_bucket_or_null = artifact_focus_bucket_or_null
    self.artifact_focus_subject_ref_or_null = artifact_focus_subject_ref_or_null
    self.return_focus_anchor_ref_or_null = return_focus_anchor_ref_or_null
    self.fallback_target = fallback_target
    self.fallback_object_ref_or_null = fallback_object_ref_or_null
    self.fallback_reason_ref_or_null = fallback_reason_ref_or_null
    self.narrow_screen_mode = narrow_screen_mode
  }
}

public struct ClientPortalWorkspaceActionToken: Codable, Sendable {
  public let action_code: String
  public let label: String
  public let route: ClientPortalWorkspaceRouteCode
  public let requires_step_up: Bool?
  public let context_object_ref: String?
  public let focus_anchor_ref: String?

  public init(
    action_code: String,
    label: String,
    route: ClientPortalWorkspaceRouteCode,
    requires_step_up: Bool? = nil,
    context_object_ref: String? = nil,
    focus_anchor_ref: String? = nil
  ) {
    self.action_code = action_code
    self.label = label
    self.route = route
    self.requires_step_up = requires_step_up
    self.context_object_ref = context_object_ref
    self.focus_anchor_ref = focus_anchor_ref
  }
}

public struct ClientPortalWorkspaceDraftResume: Codable, Sendable {
  public let draft_state: String
  public let draft_kind: String
  public let draft_object_ref: String?
  public let resume_route: JSONValue
  public let last_saved_at: ISO8601DateTimeString
  public let rebase_target_ref: String?

  public init(
    draft_state: String,
    draft_kind: String,
    draft_object_ref: String?,
    resume_route: JSONValue,
    last_saved_at: ISO8601DateTimeString,
    rebase_target_ref: String?
  ) {
    self.draft_state = draft_state
    self.draft_kind = draft_kind
    self.draft_object_ref = draft_object_ref
    self.resume_route = resume_route
    self.last_saved_at = last_saved_at
    self.rebase_target_ref = rebase_target_ref
  }
}

public struct ClientPortalWorkspaceLimitationNotice: Codable, Sendable {
  public let limitation_code: String
  public let headline: String
  public let detail: String?
  public let affected_route: ClientPortalWorkspaceRouteCode
  public let affected_object_ref: String?
  public let blocking: Bool

  public init(
    limitation_code: String,
    headline: String,
    detail: String? = nil,
    affected_route: ClientPortalWorkspaceRouteCode,
    affected_object_ref: String? = nil,
    blocking: Bool
  ) {
    self.limitation_code = limitation_code
    self.headline = headline
    self.detail = detail
    self.affected_route = affected_route
    self.affected_object_ref = affected_object_ref
    self.blocking = blocking
  }
}

public struct ClientPortalWorkspaceNavigationTab: Codable, Sendable {
  public let label: String
  public let route: ClientPortalWorkspaceRouteCode
  public let active: Bool
  public let badge_count: Int?

  public init(
    label: String,
    route: ClientPortalWorkspaceRouteCode,
    active: Bool,
    badge_count: Int? = nil
  ) {
    self.label = label
    self.route = route
    self.active = active
    self.badge_count = badge_count
  }
}

public struct ClientPortalWorkspaceProgressStep: Codable, Sendable {
  public let step_code: String
  public let label: String
  public let state: String

  public init(
    step_code: String,
    label: String,
    state: String
  ) {
    self.step_code = step_code
    self.label = label
    self.state = state
  }
}

public struct ClientPortalWorkspaceReliabilitySummary: Codable, Sendable {
  public let surface_class: String
  public let network_posture: String
  public let dominant_flow_kind: String
  public let flow_stability_score: Int
  public let risk_weighted_friction_score: Int
  public let completion_probability: Double
  public let recovery_posture: String
  public let dominant_abort_hazard_code: String?

  public init(
    surface_class: String,
    network_posture: String,
    dominant_flow_kind: String,
    flow_stability_score: Int,
    risk_weighted_friction_score: Int,
    completion_probability: Double,
    recovery_posture: String,
    dominant_abort_hazard_code: String?
  ) {
    self.surface_class = surface_class
    self.network_posture = network_posture
    self.dominant_flow_kind = dominant_flow_kind
    self.flow_stability_score = flow_stability_score
    self.risk_weighted_friction_score = risk_weighted_friction_score
    self.completion_probability = completion_probability
    self.recovery_posture = recovery_posture
    self.dominant_abort_hazard_code = dominant_abort_hazard_code
  }
}

public struct ClientPortalWorkspaceStatusHero: Codable, Sendable {
  public let status_code: String
  public let headline: String
  public let supporting_text: String
  public let due_label: String?
  public let primary_action: JSONValue
  public let secondary_action: JSONValue?
  public let progress_steps: [ClientPortalWorkspaceProgressStep]

  public init(
    status_code: String,
    headline: String,
    supporting_text: String,
    due_label: String? = nil,
    primary_action: JSONValue,
    secondary_action: JSONValue? = nil,
    progress_steps: [ClientPortalWorkspaceProgressStep]
  ) {
    self.status_code = status_code
    self.headline = headline
    self.supporting_text = supporting_text
    self.due_label = due_label
    self.primary_action = primary_action
    self.secondary_action = secondary_action
    self.progress_steps = progress_steps
  }
}

public struct ClientPortalWorkspaceTask: Codable, Sendable {
  public let task_id: String
  public let task_type: String
  public let label: String
  public let description: String?
  public let status: String
  public let due_at: ISO8601DateTimeString?
  public let effort_label: String?
  public let route: ClientPortalWorkspaceRouteCode
  public let primary_action: ClientPortalWorkspaceActionToken

  public init(
    task_id: String,
    task_type: String,
    label: String,
    description: String? = nil,
    status: String,
    due_at: ISO8601DateTimeString? = nil,
    effort_label: String? = nil,
    route: ClientPortalWorkspaceRouteCode,
    primary_action: ClientPortalWorkspaceActionToken
  ) {
    self.task_id = task_id
    self.task_type = task_type
    self.label = label
    self.description = description
    self.status = status
    self.due_at = due_at
    self.effort_label = effort_label
    self.route = route
    self.primary_action = primary_action
  }
}

public struct ClientPortalWorkspaceTaskGroup: Codable, Sendable {
  public let group_code: String
  public let label: String
  public let tasks: [ClientPortalWorkspaceTask]

  public init(
    group_code: String,
    label: String,
    tasks: [ClientPortalWorkspaceTask]
  ) {
    self.group_code = group_code
    self.label = label
    self.tasks = tasks
  }
}

public struct ClientPortalWorkspaceUploadItem: Codable, Sendable {
  public let upload_session_id: String
  public let request_version_ref: String
  public let upload_request_binding_contract: JSONValue
  public let request_binding_state: String
  public let resumability_state: String
  public let attachment_state: String
  public let filename: String
  public let transfer_state: String
  public let status_phase: String
  public let history_state: String
  public let download_ref: String?
  public let preview_posture: String
  public let preview_reason_code: JSONValue
  public let uploaded_at: ISO8601DateTimeString?
  public let next_action_code: String
  public let upload_confidence_score: Int
  public let recovery_posture: String
  public let dominant_hazard_code: String?

  public init(
    upload_session_id: String,
    request_version_ref: String,
    upload_request_binding_contract: JSONValue,
    request_binding_state: String,
    resumability_state: String,
    attachment_state: String,
    filename: String,
    transfer_state: String,
    status_phase: String,
    history_state: String,
    download_ref: String?,
    preview_posture: String,
    preview_reason_code: JSONValue,
    uploaded_at: ISO8601DateTimeString? = nil,
    next_action_code: String,
    upload_confidence_score: Int,
    recovery_posture: String,
    dominant_hazard_code: String?
  ) {
    self.upload_session_id = upload_session_id
    self.request_version_ref = request_version_ref
    self.upload_request_binding_contract = upload_request_binding_contract
    self.request_binding_state = request_binding_state
    self.resumability_state = resumability_state
    self.attachment_state = attachment_state
    self.filename = filename
    self.transfer_state = transfer_state
    self.status_phase = status_phase
    self.history_state = history_state
    self.download_ref = download_ref
    self.preview_posture = preview_posture
    self.preview_reason_code = preview_reason_code
    self.uploaded_at = uploaded_at
    self.next_action_code = next_action_code
    self.upload_confidence_score = upload_confidence_score
    self.recovery_posture = recovery_posture
    self.dominant_hazard_code = dominant_hazard_code
  }
}

public struct ClientPortalWorkspaceDocumentRequest: Codable, Sendable {
  public let request_id: String
  public let request_version_ref: String
  public let category: String
  public let title: String
  public let why_requested_label: String
  public let status: String
  public let due_at: ISO8601DateTimeString?
  public let due_label: String
  public let help_text: String?
  public let accepted_file_types: [String]
  public let max_file_size_mb: Int
  public let uploads: [ClientPortalWorkspaceUploadItem]
  public let current_upload_ref: String?
  public let current_artifact_upload_ref: String?
  public let externalization_governance_contract: JSONValue
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue

  public init(
    request_id: String,
    request_version_ref: String,
    category: String,
    title: String,
    why_requested_label: String,
    status: String,
    due_at: ISO8601DateTimeString? = nil,
    due_label: String,
    help_text: String? = nil,
    accepted_file_types: [String],
    max_file_size_mb: Int,
    uploads: [ClientPortalWorkspaceUploadItem],
    current_upload_ref: String?,
    current_artifact_upload_ref: String?,
    externalization_governance_contract: JSONValue,
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue
  ) {
    self.request_id = request_id
    self.request_version_ref = request_version_ref
    self.category = category
    self.title = title
    self.why_requested_label = why_requested_label
    self.status = status
    self.due_at = due_at
    self.due_label = due_label
    self.help_text = help_text
    self.accepted_file_types = accepted_file_types
    self.max_file_size_mb = max_file_size_mb
    self.uploads = uploads
    self.current_upload_ref = current_upload_ref
    self.current_artifact_upload_ref = current_artifact_upload_ref
    self.externalization_governance_contract = externalization_governance_contract
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
  }
}

public struct ClientPortalWorkspaceDocumentCenter: Codable, Sendable {
  public let summary_label: String
  public let surface_order: JSONValue
  public let upload_affordances: JSONValue
  public let status_phase_order: JSONValue
  public let open_request_count: Int
  public let requests: [ClientPortalWorkspaceDocumentRequest]
  public let last_uploaded_at: ISO8601DateTimeString?

  public init(
    summary_label: String,
    surface_order: JSONValue,
    upload_affordances: JSONValue,
    status_phase_order: JSONValue,
    open_request_count: Int,
    requests: [ClientPortalWorkspaceDocumentRequest],
    last_uploaded_at: ISO8601DateTimeString? = nil
  ) {
    self.summary_label = summary_label
    self.surface_order = surface_order
    self.upload_affordances = upload_affordances
    self.status_phase_order = status_phase_order
    self.open_request_count = open_request_count
    self.requests = requests
    self.last_uploaded_at = last_uploaded_at
  }
}

public struct ClientPortalWorkspaceApprovalPack: Codable, Sendable {
  public let approval_pack_id: String
  public let title: String
  public let status: String
  public let due_at: ISO8601DateTimeString?
  public let summary: String
  public let change_highlight_count: Int
  public let change_digest_summary: String
  public let change_highlights_ref: String
  public let stale_protection_state: String
  public let requires_step_up: Bool
  public let declaration_text_ref: String
  public let declaration_download_ref: String
  public let declaration_print_ref: String
  public let change_digest_acknowledged: Bool
  public let declaration_acknowledged: Bool
  public let approval_acknowledged: Bool
  public let sign_off_state: String
  public let step_up_surface: String
  public let step_up_checkpoint_state: String
  public let approval_readiness_score: Int
  public let recovery_posture: String
  public let dominant_hazard_code: String?
  public let sign_command_receipt_ref: String?
  public let receipt_state: String
  public let settlement_pending_label: String?
  public let receipt_ref: String?
  public let receipt_download_ref: String?
  public let receipt_print_ref: String?
  public let receipt_issued_at: ISO8601DateTimeString
  public let receipt_next_step_label: String?
  public let superseded_by_pack_ref: String?
  public let externalization_governance_contract: JSONValue
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue
  public let primary_action: ClientPortalWorkspaceActionToken

  public init(
    approval_pack_id: String,
    title: String,
    status: String,
    due_at: ISO8601DateTimeString? = nil,
    summary: String,
    change_highlight_count: Int,
    change_digest_summary: String,
    change_highlights_ref: String,
    stale_protection_state: String,
    requires_step_up: Bool,
    declaration_text_ref: String,
    declaration_download_ref: String,
    declaration_print_ref: String,
    change_digest_acknowledged: Bool,
    declaration_acknowledged: Bool,
    approval_acknowledged: Bool,
    sign_off_state: String,
    step_up_surface: String,
    step_up_checkpoint_state: String,
    approval_readiness_score: Int,
    recovery_posture: String,
    dominant_hazard_code: String?,
    sign_command_receipt_ref: String?,
    receipt_state: String,
    settlement_pending_label: String?,
    receipt_ref: String?,
    receipt_download_ref: String?,
    receipt_print_ref: String?,
    receipt_issued_at: ISO8601DateTimeString,
    receipt_next_step_label: String?,
    superseded_by_pack_ref: String?,
    externalization_governance_contract: JSONValue,
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue,
    primary_action: ClientPortalWorkspaceActionToken
  ) {
    self.approval_pack_id = approval_pack_id
    self.title = title
    self.status = status
    self.due_at = due_at
    self.summary = summary
    self.change_highlight_count = change_highlight_count
    self.change_digest_summary = change_digest_summary
    self.change_highlights_ref = change_highlights_ref
    self.stale_protection_state = stale_protection_state
    self.requires_step_up = requires_step_up
    self.declaration_text_ref = declaration_text_ref
    self.declaration_download_ref = declaration_download_ref
    self.declaration_print_ref = declaration_print_ref
    self.change_digest_acknowledged = change_digest_acknowledged
    self.declaration_acknowledged = declaration_acknowledged
    self.approval_acknowledged = approval_acknowledged
    self.sign_off_state = sign_off_state
    self.step_up_surface = step_up_surface
    self.step_up_checkpoint_state = step_up_checkpoint_state
    self.approval_readiness_score = approval_readiness_score
    self.recovery_posture = recovery_posture
    self.dominant_hazard_code = dominant_hazard_code
    self.sign_command_receipt_ref = sign_command_receipt_ref
    self.receipt_state = receipt_state
    self.settlement_pending_label = settlement_pending_label
    self.receipt_ref = receipt_ref
    self.receipt_download_ref = receipt_download_ref
    self.receipt_print_ref = receipt_print_ref
    self.receipt_issued_at = receipt_issued_at
    self.receipt_next_step_label = receipt_next_step_label
    self.superseded_by_pack_ref = superseded_by_pack_ref
    self.externalization_governance_contract = externalization_governance_contract
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
    self.primary_action = primary_action
  }
}

public struct ClientPortalWorkspaceApprovalCenter: Codable, Sendable {
  public let surface_order: [String]
  public let outstanding_count: Int
  public let latest_pack_ref: String?
  public let packs: [ClientPortalWorkspaceApprovalPack]

  public init(
    surface_order: [String],
    outstanding_count: Int,
    latest_pack_ref: String?,
    packs: [ClientPortalWorkspaceApprovalPack]
  ) {
    self.surface_order = surface_order
    self.outstanding_count = outstanding_count
    self.latest_pack_ref = latest_pack_ref
    self.packs = packs
  }
}

public enum ClientPortalWorkspaceOnboardingStepCode: String, Codable, Sendable {
  case iNVITEACCEPTANCE = "INVITE_ACCEPTANCE"
  case pROFILECONFIRMATION = "PROFILE_CONFIRMATION"
  case iDENTITYVERIFICATION = "IDENTITY_VERIFICATION"
  case aUTHORITYLINKSETUP = "AUTHORITY_LINK_SETUP"
  case dOCUMENTCOLLECTION = "DOCUMENT_COLLECTION"
  case rEVIEWCONFIRMATION = "REVIEW_CONFIRMATION"
}

public struct ClientPortalWorkspaceOnboardingJourney: Codable, Sendable {
  public let journey_id: String
  public let surface_order: JSONValue
  public let state: String
  public let current_step_code: JSONValue
  public let current_step_label: String?
  public let completed_step_count: Int
  public let total_step_count: Int
  public let resume_state: String
  public let resume_step_code: JSONValue
  public let reconfirmation_step_codes: [ClientPortalWorkspaceOnboardingStepCode]
  public let step_workspace_state: String
  public let save_return_state: String
  public let save_and_return_action: JSONValue
  public let next_action: ClientPortalWorkspaceActionToken
  public let completion_summary_ref: String?
  public let completion_next_steps_ref: String?
  public let completed_at: ISO8601DateTimeString
  public let expired_at: ISO8601DateTimeString
  public let abandoned_at: ISO8601DateTimeString
  public let abandonment_reason_code: String?

  public init(
    journey_id: String,
    surface_order: JSONValue,
    state: String,
    current_step_code: JSONValue,
    current_step_label: String?,
    completed_step_count: Int,
    total_step_count: Int,
    resume_state: String,
    resume_step_code: JSONValue,
    reconfirmation_step_codes: [ClientPortalWorkspaceOnboardingStepCode],
    step_workspace_state: String,
    save_return_state: String,
    save_and_return_action: JSONValue,
    next_action: ClientPortalWorkspaceActionToken,
    completion_summary_ref: String?,
    completion_next_steps_ref: String?,
    completed_at: ISO8601DateTimeString,
    expired_at: ISO8601DateTimeString,
    abandoned_at: ISO8601DateTimeString,
    abandonment_reason_code: String?
  ) {
    self.journey_id = journey_id
    self.surface_order = surface_order
    self.state = state
    self.current_step_code = current_step_code
    self.current_step_label = current_step_label
    self.completed_step_count = completed_step_count
    self.total_step_count = total_step_count
    self.resume_state = resume_state
    self.resume_step_code = resume_step_code
    self.reconfirmation_step_codes = reconfirmation_step_codes
    self.step_workspace_state = step_workspace_state
    self.save_return_state = save_return_state
    self.save_and_return_action = save_and_return_action
    self.next_action = next_action
    self.completion_summary_ref = completion_summary_ref
    self.completion_next_steps_ref = completion_next_steps_ref
    self.completed_at = completed_at
    self.expired_at = expired_at
    self.abandoned_at = abandoned_at
    self.abandonment_reason_code = abandonment_reason_code
  }
}

public struct ClientPortalWorkspaceContactOption: Codable, Sendable {
  public let channel_code: String
  public let label: String
  public let availability_label: String?
  public let action: ClientPortalWorkspaceActionToken

  public init(
    channel_code: String,
    label: String,
    availability_label: String? = nil,
    action: ClientPortalWorkspaceActionToken
  ) {
    self.channel_code = channel_code
    self.label = label
    self.availability_label = availability_label
    self.action = action
  }
}

public struct ClientPortalWorkspaceCaseContextPanel: Codable, Sendable {
  public let context_summary_ref: String
  public let carried_context_refs: [String]
  public let linked_request_info_ref: String?
  public let linked_object_ref: String?
  public let focus_anchor_ref: String
  public let restate_required: JSONValue
  public let recommended_channel_code: String

  public init(
    context_summary_ref: String,
    carried_context_refs: [String],
    linked_request_info_ref: String?,
    linked_object_ref: String?,
    focus_anchor_ref: String,
    restate_required: JSONValue,
    recommended_channel_code: String
  ) {
    self.context_summary_ref = context_summary_ref
    self.carried_context_refs = carried_context_refs
    self.linked_request_info_ref = linked_request_info_ref
    self.linked_object_ref = linked_object_ref
    self.focus_anchor_ref = focus_anchor_ref
    self.restate_required = restate_required
    self.recommended_channel_code = recommended_channel_code
  }
}

public struct ClientPortalWorkspaceSupportPanel: Codable, Sendable {
  public let help_headline: String
  public let contact_options: [ClientPortalWorkspaceContactOption]
  public let secure_message_allowed: Bool
  public let faq_refs: [String]
  public let surface_order: [ClientPortalWorkspaceHelpSurfaceCode]?
  public let case_context_panel: JSONValue

  public init(
    help_headline: String,
    contact_options: [ClientPortalWorkspaceContactOption],
    secure_message_allowed: Bool,
    faq_refs: [String],
    surface_order: [ClientPortalWorkspaceHelpSurfaceCode]?,
    case_context_panel: JSONValue
  ) {
    self.help_headline = help_headline
    self.contact_options = contact_options
    self.secure_message_allowed = secure_message_allowed
    self.faq_refs = faq_refs
    self.surface_order = surface_order
    self.case_context_panel = case_context_panel
  }
}

public struct ClientPortalWorkspaceTimelineEvent: Codable, Sendable {
  public let event_id: String
  public let event_kind: String
  public let headline: String
  public let detail: String?
  public let occurred_at: ISO8601DateTimeString

  public init(
    event_id: String,
    event_kind: String,
    headline: String,
    detail: String? = nil,
    occurred_at: ISO8601DateTimeString
  ) {
    self.event_id = event_id
    self.event_kind = event_kind
    self.headline = headline
    self.detail = detail
    self.occurred_at = occurred_at
  }
}

public enum ClientPortalWorkspaceSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_portal_workspace.schema.json"
  public static let sourceHash = "fd0d29044ef9bc4a3865beca37e7365f19de90e07c8ef34e210b49a679bdd45e"
}

public struct ClientTimelineEvent: Codable, Sendable {
  public let event_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let event_kind: String
  public let headline: String
  public let detail_ref: String?
  public let occurred_at: ISO8601DateTimeString
  public let visible_to_client: JSONValue
  public let related_object_ref: String?
  public let language_contract: PortalLanguageContract
  public let authority_truth_contract: AuthorityTruthContract
  public let authority_truth_state: String
  public let customer_safe_projection: CustomerSafeProjectionContract

  public init(
    event_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    manifest_id: String?,
    event_kind: String,
    headline: String,
    detail_ref: String?,
    occurred_at: ISO8601DateTimeString,
    visible_to_client: JSONValue,
    related_object_ref: String?,
    language_contract: PortalLanguageContract,
    authority_truth_contract: AuthorityTruthContract,
    authority_truth_state: String,
    customer_safe_projection: CustomerSafeProjectionContract
  ) {
    self.event_id = event_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.event_kind = event_kind
    self.headline = headline
    self.detail_ref = detail_ref
    self.occurred_at = occurred_at
    self.visible_to_client = visible_to_client
    self.related_object_ref = related_object_ref
    self.language_contract = language_contract
    self.authority_truth_contract = authority_truth_contract
    self.authority_truth_state = authority_truth_state
    self.customer_safe_projection = customer_safe_projection
  }
}

public enum ClientTimelineEventSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_timeline_event.schema.json"
  public static let sourceHash = "394ff4411a746a2f7d3ef3bec12cba6b0d959f3c4b0d565f1d21b284d4ceb901"
}

public struct ClientUploadSession: Codable, Sendable {
  public let upload_session_id: String
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let request_id: String
  public let request_version_ref: String
  public let upload_request_binding_contract: JSONValue
  public let request_binding_state: String
  public let initiated_by: String
  public let storage_ref: String
  public let filename: String
  public let media_type: String
  public let byte_count: Int
  public let checksum: String
  public let surface_class: String
  public let capture_mode: String
  public let bytes_transferred: Int
  public let retry_count: Int
  public let resume_attempt_count: Int
  public let resume_success_count: Int
  public let integrity_state: String
  public let transfer_state: String
  public let malware_scan_state: String
  public let validation_state: String
  public let resumability_state: String
  public let resume_token_ref: String?
  public let attachment_state: String
  public let attached_document_ref: String?
  public let outcome_reason_code: String?
  public let next_action_code: String
  public let submitted_at: ISO8601DateTimeString
  public let transfer_started_at: ISO8601DateTimeString
  public let last_activity_at: ISO8601DateTimeString
  public let scan_completed_at: ISO8601DateTimeString
  public let validation_completed_at: ISO8601DateTimeString
  public let finalized_at: ISO8601DateTimeString
  public let attachment_confirmed_at: ISO8601DateTimeString
  public let reconfirmed_at: ISO8601DateTimeString
  public let state_changed_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let upload_confidence_score: Int
  public let recovery_posture: String
  public let dominant_hazard_code: String?

  public init(
    upload_session_id: String,
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    manifest_id: String?,
    request_id: String,
    request_version_ref: String,
    upload_request_binding_contract: JSONValue,
    request_binding_state: String,
    initiated_by: String,
    storage_ref: String,
    filename: String,
    media_type: String,
    byte_count: Int,
    checksum: String,
    surface_class: String,
    capture_mode: String,
    bytes_transferred: Int,
    retry_count: Int,
    resume_attempt_count: Int,
    resume_success_count: Int,
    integrity_state: String,
    transfer_state: String,
    malware_scan_state: String,
    validation_state: String,
    resumability_state: String,
    resume_token_ref: String?,
    attachment_state: String,
    attached_document_ref: String?,
    outcome_reason_code: String?,
    next_action_code: String,
    submitted_at: ISO8601DateTimeString,
    transfer_started_at: ISO8601DateTimeString,
    last_activity_at: ISO8601DateTimeString,
    scan_completed_at: ISO8601DateTimeString,
    validation_completed_at: ISO8601DateTimeString,
    finalized_at: ISO8601DateTimeString,
    attachment_confirmed_at: ISO8601DateTimeString,
    reconfirmed_at: ISO8601DateTimeString,
    state_changed_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    upload_confidence_score: Int,
    recovery_posture: String,
    dominant_hazard_code: String?
  ) {
    self.upload_session_id = upload_session_id
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.request_id = request_id
    self.request_version_ref = request_version_ref
    self.upload_request_binding_contract = upload_request_binding_contract
    self.request_binding_state = request_binding_state
    self.initiated_by = initiated_by
    self.storage_ref = storage_ref
    self.filename = filename
    self.media_type = media_type
    self.byte_count = byte_count
    self.checksum = checksum
    self.surface_class = surface_class
    self.capture_mode = capture_mode
    self.bytes_transferred = bytes_transferred
    self.retry_count = retry_count
    self.resume_attempt_count = resume_attempt_count
    self.resume_success_count = resume_success_count
    self.integrity_state = integrity_state
    self.transfer_state = transfer_state
    self.malware_scan_state = malware_scan_state
    self.validation_state = validation_state
    self.resumability_state = resumability_state
    self.resume_token_ref = resume_token_ref
    self.attachment_state = attachment_state
    self.attached_document_ref = attached_document_ref
    self.outcome_reason_code = outcome_reason_code
    self.next_action_code = next_action_code
    self.submitted_at = submitted_at
    self.transfer_started_at = transfer_started_at
    self.last_activity_at = last_activity_at
    self.scan_completed_at = scan_completed_at
    self.validation_completed_at = validation_completed_at
    self.finalized_at = finalized_at
    self.attachment_confirmed_at = attachment_confirmed_at
    self.reconfirmed_at = reconfirmed_at
    self.state_changed_at = state_changed_at
    self.expires_at = expires_at
    self.upload_confidence_score = upload_confidence_score
    self.recovery_posture = recovery_posture
    self.dominant_hazard_code = dominant_hazard_code
  }
}

public enum ClientUploadSessionSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/client_upload_session.schema.json"
  public static let sourceHash = "fdddce78ce8db065d6443d6674cb535f0b1276ff926211fe1bd0272758179552"
}

public struct CollaborationActivitySlice: Codable, Sendable {
  public let artifact_type: JSONValue
  public let item_id: String
  public let workspace_route_key: String
  public let viewer_scope: String
  public let thread_visibility_class: String
  public let workspace_version: Int
  public let shell_stability_token: String
  public let visibility_partition: JSONValue
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let customer_safe_projection: JSONValue
  public let active_filters: CollaborationActivitySliceActiveFilters
  public let head_sequence: Int
  public let newest_returned_sequence_or_null: Int?
  public let oldest_returned_sequence_or_null: Int?
  public let next_before_sequence_or_null: Int?
  public let has_more_before: Bool
  public let focus_anchor_ref_or_null: String?
  public let entry_refs: [String]
  public let latest_workspace_snapshot_ref: String
  public let returned_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    item_id: String,
    workspace_route_key: String,
    viewer_scope: String,
    thread_visibility_class: String,
    workspace_version: Int,
    shell_stability_token: String,
    visibility_partition: JSONValue,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    customer_safe_projection: JSONValue,
    active_filters: CollaborationActivitySliceActiveFilters,
    head_sequence: Int,
    newest_returned_sequence_or_null: Int?,
    oldest_returned_sequence_or_null: Int?,
    next_before_sequence_or_null: Int?,
    has_more_before: Bool,
    focus_anchor_ref_or_null: String?,
    entry_refs: [String],
    latest_workspace_snapshot_ref: String,
    returned_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.item_id = item_id
    self.workspace_route_key = workspace_route_key
    self.viewer_scope = viewer_scope
    self.thread_visibility_class = thread_visibility_class
    self.workspace_version = workspace_version
    self.shell_stability_token = shell_stability_token
    self.visibility_partition = visibility_partition
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.customer_safe_projection = customer_safe_projection
    self.active_filters = active_filters
    self.head_sequence = head_sequence
    self.newest_returned_sequence_or_null = newest_returned_sequence_or_null
    self.oldest_returned_sequence_or_null = oldest_returned_sequence_or_null
    self.next_before_sequence_or_null = next_before_sequence_or_null
    self.has_more_before = has_more_before
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.entry_refs = entry_refs
    self.latest_workspace_snapshot_ref = latest_workspace_snapshot_ref
    self.returned_at = returned_at
  }
}

public struct CollaborationActivitySliceActiveFilters: Codable, Sendable {
  public let thread_visibility_class: String
  public let request_info_ref_or_null: String?
  public let include_system_entries: Bool
  public let before_sequence_or_null: Int?

  public init(
    thread_visibility_class: String,
    request_info_ref_or_null: String?,
    include_system_entries: Bool,
    before_sequence_or_null: Int?
  ) {
    self.thread_visibility_class = thread_visibility_class
    self.request_info_ref_or_null = request_info_ref_or_null
    self.include_system_entries = include_system_entries
    self.before_sequence_or_null = before_sequence_or_null
  }
}

public enum CollaborationActivitySliceSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_activity_slice.schema.json"
  public static let sourceHash = "0440134b8b268183385279b5fd5ef4cc72a0743170adf10473d2c4714d4eb23f"
}

public struct CollaborationAttachment: Codable, Sendable {
  public let artifact_type: JSONValue
  public let attachment_id: String
  public let item_id: String
  public let published_entry_ref: String
  public let current_state_entry_ref: String
  public let state_audit_event_ref: String
  public let visibility_class: String
  public let request_info_ref: String?
  public let upload_session_id: String
  public let publish_copy_mode: String
  public let source_attachment_ref: String?
  public let filename: String
  public let media_type: String
  public let byte_size: Int
  public let checksum: String
  public let storage_ref: String
  public let download_ref: String?
  public let malware_scan_state: String
  public let publication_state: String
  public let download_state: String
  public let unavailable_reason_code: JSONValue
  public let uploaded_by_ref: String
  public let uploaded_at: ISO8601DateTimeString
  public let published_at: ISO8601DateTimeString
  public let state_changed_at: ISO8601DateTimeString
  public let scan_completed_at: ISO8601DateTimeString
  public let semantic_action_id: String
  public let retention_class: String

  public init(
    artifact_type: JSONValue,
    attachment_id: String,
    item_id: String,
    published_entry_ref: String,
    current_state_entry_ref: String,
    state_audit_event_ref: String,
    visibility_class: String,
    request_info_ref: String?,
    upload_session_id: String,
    publish_copy_mode: String,
    source_attachment_ref: String?,
    filename: String,
    media_type: String,
    byte_size: Int,
    checksum: String,
    storage_ref: String,
    download_ref: String?,
    malware_scan_state: String,
    publication_state: String,
    download_state: String,
    unavailable_reason_code: JSONValue,
    uploaded_by_ref: String,
    uploaded_at: ISO8601DateTimeString,
    published_at: ISO8601DateTimeString,
    state_changed_at: ISO8601DateTimeString,
    scan_completed_at: ISO8601DateTimeString,
    semantic_action_id: String,
    retention_class: String
  ) {
    self.artifact_type = artifact_type
    self.attachment_id = attachment_id
    self.item_id = item_id
    self.published_entry_ref = published_entry_ref
    self.current_state_entry_ref = current_state_entry_ref
    self.state_audit_event_ref = state_audit_event_ref
    self.visibility_class = visibility_class
    self.request_info_ref = request_info_ref
    self.upload_session_id = upload_session_id
    self.publish_copy_mode = publish_copy_mode
    self.source_attachment_ref = source_attachment_ref
    self.filename = filename
    self.media_type = media_type
    self.byte_size = byte_size
    self.checksum = checksum
    self.storage_ref = storage_ref
    self.download_ref = download_ref
    self.malware_scan_state = malware_scan_state
    self.publication_state = publication_state
    self.download_state = download_state
    self.unavailable_reason_code = unavailable_reason_code
    self.uploaded_by_ref = uploaded_by_ref
    self.uploaded_at = uploaded_at
    self.published_at = published_at
    self.state_changed_at = state_changed_at
    self.scan_completed_at = scan_completed_at
    self.semantic_action_id = semantic_action_id
    self.retention_class = retention_class
  }
}

public enum CollaborationAttachmentSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_attachment.schema.json"
  public static let sourceHash = "f8d97e1fe2bb45987dcc9f2a3db9cb0d28204f453fd99d2918e9ef9699de09d7"
}

public struct CollaborationAttachmentSlice: Codable, Sendable {
  public let artifact_type: JSONValue
  public let item_id: String
  public let workspace_route_key: String
  public let viewer_scope: String
  public let visibility_class: String
  public let workspace_version: Int
  public let shell_stability_token: String
  public let visibility_partition: JSONValue
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let customer_safe_projection: JSONValue
  public let active_filters: CollaborationAttachmentSliceActiveFilters
  public let focus_anchor_ref_or_null: String?
  public let current_attachment_refs: [String]
  public let historical_attachment_refs: [String]
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue
  public let latest_workspace_snapshot_ref: String
  public let returned_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    item_id: String,
    workspace_route_key: String,
    viewer_scope: String,
    visibility_class: String,
    workspace_version: Int,
    shell_stability_token: String,
    visibility_partition: JSONValue,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    customer_safe_projection: JSONValue,
    active_filters: CollaborationAttachmentSliceActiveFilters,
    focus_anchor_ref_or_null: String?,
    current_attachment_refs: [String],
    historical_attachment_refs: [String],
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue,
    latest_workspace_snapshot_ref: String,
    returned_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.item_id = item_id
    self.workspace_route_key = workspace_route_key
    self.viewer_scope = viewer_scope
    self.visibility_class = visibility_class
    self.workspace_version = workspace_version
    self.shell_stability_token = shell_stability_token
    self.visibility_partition = visibility_partition
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.customer_safe_projection = customer_safe_projection
    self.active_filters = active_filters
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.current_attachment_refs = current_attachment_refs
    self.historical_attachment_refs = historical_attachment_refs
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
    self.latest_workspace_snapshot_ref = latest_workspace_snapshot_ref
    self.returned_at = returned_at
  }
}

public struct CollaborationAttachmentSliceActiveFilters: Codable, Sendable {
  public let visibility_class: String
  public let request_info_ref_or_null: String?
  public let include_history: Bool
  public let include_pending_placeholders: Bool

  public init(
    visibility_class: String,
    request_info_ref_or_null: String?,
    include_history: Bool,
    include_pending_placeholders: Bool
  ) {
    self.visibility_class = visibility_class
    self.request_info_ref_or_null = request_info_ref_or_null
    self.include_history = include_history
    self.include_pending_placeholders = include_pending_placeholders
  }
}

public enum CollaborationAttachmentSliceSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_attachment_slice.schema.json"
  public static let sourceHash = "036d2cb7dafe1541e284cea12b57d74ca84e94608c0063d16a6a2d58d9ed8dcc"
}

public struct CollaborationEntry: Codable, Sendable {
  public let entry_id: String
  public let item_id: String
  public let thread_id: String
  public let thread_sequence: Int
  public let entry_type: String
  public let visibility_class: String
  public let causal_parent_entry_ref: String?
  public let body_ref: String?
  public let attachment_refs: [String]
  public let actor_ref: String
  public let created_at: ISO8601DateTimeString
  public let command_id: String
  public let semantic_action_id: String
  public let command_receipt_ref: String
  public let audit_event_ref: String
  public let request_info_ref: String?
  public let redaction_state: String

  public init(
    entry_id: String,
    item_id: String,
    thread_id: String,
    thread_sequence: Int,
    entry_type: String,
    visibility_class: String,
    causal_parent_entry_ref: String?,
    body_ref: String?,
    attachment_refs: [String],
    actor_ref: String,
    created_at: ISO8601DateTimeString,
    command_id: String,
    semantic_action_id: String,
    command_receipt_ref: String,
    audit_event_ref: String,
    request_info_ref: String?,
    redaction_state: String
  ) {
    self.entry_id = entry_id
    self.item_id = item_id
    self.thread_id = thread_id
    self.thread_sequence = thread_sequence
    self.entry_type = entry_type
    self.visibility_class = visibility_class
    self.causal_parent_entry_ref = causal_parent_entry_ref
    self.body_ref = body_ref
    self.attachment_refs = attachment_refs
    self.actor_ref = actor_ref
    self.created_at = created_at
    self.command_id = command_id
    self.semantic_action_id = semantic_action_id
    self.command_receipt_ref = command_receipt_ref
    self.audit_event_ref = audit_event_ref
    self.request_info_ref = request_info_ref
    self.redaction_state = redaction_state
  }
}

public enum CollaborationEntrySchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_entry.schema.json"
  public static let sourceHash = "5f16f8f72a8d6d74606a69bab0094e0685e2794dd9b402c8a0ae1abf19279eb8"
}

public struct CollaborationQueueProjectionContract: Codable, Sendable {
  public let projection_scope: String
  public let basis_hash: String
  public let routing_contract: CollaborationRoutingContract
  public let latest_change_lane_or_null: JSONValue
  public let customer_unread_count: Int
  public let internal_unread_count_or_null: Int?
  public let customer_activity_module_badge_count: Int
  public let internal_activity_module_badge_count_or_null: Int?
  public let canonical_sort_key: [String: JSONValue]
  public let focus_continuity_state: String
  public let filter_membership_state: String
  public let notification_target_module_code_or_null: JSONValue

  public init(
    projection_scope: String,
    basis_hash: String,
    routing_contract: CollaborationRoutingContract,
    latest_change_lane_or_null: JSONValue,
    customer_unread_count: Int,
    internal_unread_count_or_null: Int?,
    customer_activity_module_badge_count: Int,
    internal_activity_module_badge_count_or_null: Int?,
    canonical_sort_key: [String: JSONValue],
    focus_continuity_state: String,
    filter_membership_state: String,
    notification_target_module_code_or_null: JSONValue
  ) {
    self.projection_scope = projection_scope
    self.basis_hash = basis_hash
    self.routing_contract = routing_contract
    self.latest_change_lane_or_null = latest_change_lane_or_null
    self.customer_unread_count = customer_unread_count
    self.internal_unread_count_or_null = internal_unread_count_or_null
    self.customer_activity_module_badge_count = customer_activity_module_badge_count
    self.internal_activity_module_badge_count_or_null = internal_activity_module_badge_count_or_null
    self.canonical_sort_key = canonical_sort_key
    self.focus_continuity_state = focus_continuity_state
    self.filter_membership_state = filter_membership_state
    self.notification_target_module_code_or_null = notification_target_module_code_or_null
  }
}

public enum CollaborationQueueProjectionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json"
  public static let sourceHash = "faee41ad3d85a1b29c9e7be58468a2f7698f99d279be4a0ffcf70cf4ce051227"
}

public struct CollaborationRoutingContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let routing_scope: String
  public let routing_profile_code: JSONValue
  public let routing_profile_hash: String
  public let routing_queue_ref: String
  public let basis_hash: String
  public let canonical_sort_key: [String: JSONValue]
  public let assignment_efficiency_score: Int
  public let ownership_confidence_score: Int
  public let sla_pressure_score: Int
  public let escalation_pressure_score: Int
  public let escalation_pressure_threshold: Int
  public let reassignment_gain_threshold: Int
  public let resolution_confidence_score: Int
  public let resolution_confidence_floor: Int
  public let queue_health_score: Int
  public let queue_pressure_score: Int
  public let queue_health_floor: Int
  public let queue_health_state: String
  public let escalation_rank: Int
  public let collaboration_priority_score: Int
  public let assignment_recommendation_state: String
  public let recommended_assignee_ref_or_null: String?
  public let escalation_recommendation_state: String
  public let recommended_escalation_target_ref_or_null: String?
  public let recommended_action_code_or_null: String?
  public let focused_row_reorder_state: String
  public let draft_safety_state: String
  public let ordering_reason_codes: [String]
  public let recommendation_reason_codes: [String]

  public init(
    contract_version: JSONValue,
    routing_scope: String,
    routing_profile_code: JSONValue,
    routing_profile_hash: String,
    routing_queue_ref: String,
    basis_hash: String,
    canonical_sort_key: [String: JSONValue],
    assignment_efficiency_score: Int,
    ownership_confidence_score: Int,
    sla_pressure_score: Int,
    escalation_pressure_score: Int,
    escalation_pressure_threshold: Int,
    reassignment_gain_threshold: Int,
    resolution_confidence_score: Int,
    resolution_confidence_floor: Int,
    queue_health_score: Int,
    queue_pressure_score: Int,
    queue_health_floor: Int,
    queue_health_state: String,
    escalation_rank: Int,
    collaboration_priority_score: Int,
    assignment_recommendation_state: String,
    recommended_assignee_ref_or_null: String?,
    escalation_recommendation_state: String,
    recommended_escalation_target_ref_or_null: String?,
    recommended_action_code_or_null: String?,
    focused_row_reorder_state: String,
    draft_safety_state: String,
    ordering_reason_codes: [String],
    recommendation_reason_codes: [String]
  ) {
    self.contract_version = contract_version
    self.routing_scope = routing_scope
    self.routing_profile_code = routing_profile_code
    self.routing_profile_hash = routing_profile_hash
    self.routing_queue_ref = routing_queue_ref
    self.basis_hash = basis_hash
    self.canonical_sort_key = canonical_sort_key
    self.assignment_efficiency_score = assignment_efficiency_score
    self.ownership_confidence_score = ownership_confidence_score
    self.sla_pressure_score = sla_pressure_score
    self.escalation_pressure_score = escalation_pressure_score
    self.escalation_pressure_threshold = escalation_pressure_threshold
    self.reassignment_gain_threshold = reassignment_gain_threshold
    self.resolution_confidence_score = resolution_confidence_score
    self.resolution_confidence_floor = resolution_confidence_floor
    self.queue_health_score = queue_health_score
    self.queue_pressure_score = queue_pressure_score
    self.queue_health_floor = queue_health_floor
    self.queue_health_state = queue_health_state
    self.escalation_rank = escalation_rank
    self.collaboration_priority_score = collaboration_priority_score
    self.assignment_recommendation_state = assignment_recommendation_state
    self.recommended_assignee_ref_or_null = recommended_assignee_ref_or_null
    self.escalation_recommendation_state = escalation_recommendation_state
    self.recommended_escalation_target_ref_or_null = recommended_escalation_target_ref_or_null
    self.recommended_action_code_or_null = recommended_action_code_or_null
    self.focused_row_reorder_state = focused_row_reorder_state
    self.draft_safety_state = draft_safety_state
    self.ordering_reason_codes = ordering_reason_codes
    self.recommendation_reason_codes = recommendation_reason_codes
  }
}

public enum CollaborationRoutingContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_routing_contract.schema.json"
  public static let sourceHash = "0c282041910d617200386bd615b00e91396767e7b51d886177832f355ea0909d"
}

public struct CollaborationThread: Codable, Sendable {
  public let thread_id: String
  public let item_id: String
  public let visibility_class: String
  public let head_sequence: Int
  public let lifecycle_state: String
  public let participant_refs: [String]
  public let last_entry_ref: String?

  public init(
    thread_id: String,
    item_id: String,
    visibility_class: String,
    head_sequence: Int,
    lifecycle_state: String,
    participant_refs: [String],
    last_entry_ref: String?
  ) {
    self.thread_id = thread_id
    self.item_id = item_id
    self.visibility_class = visibility_class
    self.head_sequence = head_sequence
    self.lifecycle_state = lifecycle_state
    self.participant_refs = participant_refs
    self.last_entry_ref = last_entry_ref
  }
}

public enum CollaborationThreadSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/collaboration_thread.schema.json"
  public static let sourceHash = "4241551fc3d68764f6f82cb53ba6a83f69ce2e3185bc4501e4fd504c7ba58231"
}

public struct CustomerRequestListSnapshot: Codable, Sendable {
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let client_id: String
  public let shell_family: JSONValue
  public let request_list_route_key: String
  public let object_anchor_ref: String
  public let dominant_question: String
  public let language_contract: PortalLanguageContract
  public let settlement_state: CustomerRequestListSnapshotSettlementState
  public let recovery_posture: CustomerRequestListSnapshotRecoveryPosture
  public let interaction_layer: PortalInteractionLayer
  public let row_band_order: JSONValue
  public let queue_group_order: JSONValue
  public let active_filters: CustomerRequestListSnapshotActiveFilters
  public let list_version: Int
  public let last_published_sequence: Int
  public let resume_token: String
  public let cache_isolation_contract: JSONValue
  public let visibility_partition: JSONValue
  public let customer_safe_projection: CustomerSafeProjectionContract
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let rows: [CustomerRequestListSnapshotRequestRow]
  public let selected_item_ref_or_null: String?
  public let selected_focus_anchor_ref_or_null: String?
  public let updated_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    tenant_id: String,
    client_id: String,
    shell_family: JSONValue,
    request_list_route_key: String,
    object_anchor_ref: String,
    dominant_question: String,
    language_contract: PortalLanguageContract,
    settlement_state: CustomerRequestListSnapshotSettlementState,
    recovery_posture: CustomerRequestListSnapshotRecoveryPosture,
    interaction_layer: PortalInteractionLayer,
    row_band_order: JSONValue,
    queue_group_order: JSONValue,
    active_filters: CustomerRequestListSnapshotActiveFilters,
    list_version: Int,
    last_published_sequence: Int,
    resume_token: String,
    cache_isolation_contract: JSONValue,
    visibility_partition: JSONValue,
    customer_safe_projection: CustomerSafeProjectionContract,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    rows: [CustomerRequestListSnapshotRequestRow],
    selected_item_ref_or_null: String?,
    selected_focus_anchor_ref_or_null: String?,
    updated_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.shell_family = shell_family
    self.request_list_route_key = request_list_route_key
    self.object_anchor_ref = object_anchor_ref
    self.dominant_question = dominant_question
    self.language_contract = language_contract
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.row_band_order = row_band_order
    self.queue_group_order = queue_group_order
    self.active_filters = active_filters
    self.list_version = list_version
    self.last_published_sequence = last_published_sequence
    self.resume_token = resume_token
    self.cache_isolation_contract = cache_isolation_contract
    self.visibility_partition = visibility_partition
    self.customer_safe_projection = customer_safe_projection
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.rows = rows
    self.selected_item_ref_or_null = selected_item_ref_or_null
    self.selected_focus_anchor_ref_or_null = selected_focus_anchor_ref_or_null
    self.updated_at = updated_at
  }
}

public enum CustomerRequestListSnapshotSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum CustomerRequestListSnapshotRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public enum CustomerRequestListSnapshotStatusCode: String, Codable, Sendable {
  case aCTIONREQUIRED = "ACTION_REQUIRED"
  case iNREVIEW = "IN_REVIEW"
  case wAITINGONUS = "WAITING_ON_US"
  case wAITINGONAUTHORITY = "WAITING_ON_AUTHORITY"
  case cOMPLETED = "COMPLETED"
}

public enum CustomerRequestListSnapshotDueState: String, Codable, Sendable {
  case nONE = "NONE"
  case oNTRACK = "ON_TRACK"
  case dUESOON = "DUE_SOON"
  case oVERDUE = "OVERDUE"
}

public enum CustomerRequestListSnapshotArtifactHistoryState: String, Codable, Sendable {
  case nOSHAREDFILES = "NO_SHARED_FILES"
  case cURRENTONLY = "CURRENT_ONLY"
  case cURRENTPLUSHISTORY = "CURRENT_PLUS_HISTORY"
  case hISTORYONLY = "HISTORY_ONLY"
  case lIMITED = "LIMITED"
}

public struct CustomerRequestListSnapshotActiveFilters: Codable, Sendable {
  public let status_codes: [CustomerRequestListSnapshotStatusCode]
  public let due_states: [CustomerRequestListSnapshotDueState]
  public let unread_only: Bool
  public let files_requested_only: Bool

  public init(
    status_codes: [CustomerRequestListSnapshotStatusCode],
    due_states: [CustomerRequestListSnapshotDueState],
    unread_only: Bool,
    files_requested_only: Bool
  ) {
    self.status_codes = status_codes
    self.due_states = due_states
    self.unread_only = unread_only
    self.files_requested_only = files_requested_only
  }
}

public struct CustomerRequestListSnapshotRequestRow: Codable, Sendable {
  public let item_id: String
  public let focus_anchor_ref: String
  public let title: String
  public let status_code: CustomerRequestListSnapshotStatusCode
  public let status_label_ref: String
  public let due_state: CustomerRequestListSnapshotDueState
  public let due_at_or_null: ISO8601DateTimeString
  public let due_label_ref_or_null: String?
  public let unread_count: Int
  public let last_staff_update_at_or_null: ISO8601DateTimeString
  public let files_requested: Bool
  public let primary_action_code_or_null: JSONValue
  public let primary_action_label_ref_or_null: String?
  public let no_safe_action_reason_ref_or_null: String?
  public let authoritative_action: ActionAuthorityContract
  public let artifact_history_state: CustomerRequestListSnapshotArtifactHistoryState
  public let current_artifact_ref_or_null: String?
  public let historical_artifact_refs: [String]

  public init(
    item_id: String,
    focus_anchor_ref: String,
    title: String,
    status_code: CustomerRequestListSnapshotStatusCode,
    status_label_ref: String,
    due_state: CustomerRequestListSnapshotDueState,
    due_at_or_null: ISO8601DateTimeString,
    due_label_ref_or_null: String?,
    unread_count: Int,
    last_staff_update_at_or_null: ISO8601DateTimeString,
    files_requested: Bool,
    primary_action_code_or_null: JSONValue,
    primary_action_label_ref_or_null: String?,
    no_safe_action_reason_ref_or_null: String?,
    authoritative_action: ActionAuthorityContract,
    artifact_history_state: CustomerRequestListSnapshotArtifactHistoryState,
    current_artifact_ref_or_null: String?,
    historical_artifact_refs: [String]
  ) {
    self.item_id = item_id
    self.focus_anchor_ref = focus_anchor_ref
    self.title = title
    self.status_code = status_code
    self.status_label_ref = status_label_ref
    self.due_state = due_state
    self.due_at_or_null = due_at_or_null
    self.due_label_ref_or_null = due_label_ref_or_null
    self.unread_count = unread_count
    self.last_staff_update_at_or_null = last_staff_update_at_or_null
    self.files_requested = files_requested
    self.primary_action_code_or_null = primary_action_code_or_null
    self.primary_action_label_ref_or_null = primary_action_label_ref_or_null
    self.no_safe_action_reason_ref_or_null = no_safe_action_reason_ref_or_null
    self.authoritative_action = authoritative_action
    self.artifact_history_state = artifact_history_state
    self.current_artifact_ref_or_null = current_artifact_ref_or_null
    self.historical_artifact_refs = historical_artifact_refs
  }
}

public enum CustomerRequestListSnapshotSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/customer_request_list_snapshot.schema.json"
  public static let sourceHash = "7a4872905f3e52ee333128546dadd28ab8ea4633757487d553675605d1c83fe2"
}

public struct CustomerSafeProjectionContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let boundary_scope: String
  public let projection_audience: String
  public let shell_family: JSONValue
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let visibility_cache_partition_key: String
  public let status_derivation_policy: JSONValue
  public let staff_field_dependency_policy: JSONValue
  public let plain_language_status_policy: JSONValue
  public let plain_language_action_policy: JSONValue
  public let limitation_notice_policy: JSONValue
  public let recovery_explanation_policy: JSONValue
  public let artifact_history_policy: JSONValue
  public let hidden_activity_policy: JSONValue
  public let module_projection_policy: JSONValue
  public let attachment_visibility_policy: JSONValue
  public let live_update_visibility_policy: JSONValue
  public let draft_placeholder_policy: JSONValue
  public let notification_navigation_policy: JSONValue
  public let export_visibility_policy: JSONValue
  public let blocked_staff_signal_classes: [CustomerSafeProjectionContractBlockedSignalClass]

  public init(
    contract_version: JSONValue,
    boundary_scope: String,
    projection_audience: String,
    shell_family: JSONValue,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    visibility_cache_partition_key: String,
    status_derivation_policy: JSONValue,
    staff_field_dependency_policy: JSONValue,
    plain_language_status_policy: JSONValue,
    plain_language_action_policy: JSONValue,
    limitation_notice_policy: JSONValue,
    recovery_explanation_policy: JSONValue,
    artifact_history_policy: JSONValue,
    hidden_activity_policy: JSONValue,
    module_projection_policy: JSONValue,
    attachment_visibility_policy: JSONValue,
    live_update_visibility_policy: JSONValue,
    draft_placeholder_policy: JSONValue,
    notification_navigation_policy: JSONValue,
    export_visibility_policy: JSONValue,
    blocked_staff_signal_classes: [CustomerSafeProjectionContractBlockedSignalClass]
  ) {
    self.contract_version = contract_version
    self.boundary_scope = boundary_scope
    self.projection_audience = projection_audience
    self.shell_family = shell_family
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.visibility_cache_partition_key = visibility_cache_partition_key
    self.status_derivation_policy = status_derivation_policy
    self.staff_field_dependency_policy = staff_field_dependency_policy
    self.plain_language_status_policy = plain_language_status_policy
    self.plain_language_action_policy = plain_language_action_policy
    self.limitation_notice_policy = limitation_notice_policy
    self.recovery_explanation_policy = recovery_explanation_policy
    self.artifact_history_policy = artifact_history_policy
    self.hidden_activity_policy = hidden_activity_policy
    self.module_projection_policy = module_projection_policy
    self.attachment_visibility_policy = attachment_visibility_policy
    self.live_update_visibility_policy = live_update_visibility_policy
    self.draft_placeholder_policy = draft_placeholder_policy
    self.notification_navigation_policy = notification_navigation_policy
    self.export_visibility_policy = export_visibility_policy
    self.blocked_staff_signal_classes = blocked_staff_signal_classes
  }
}

public enum CustomerSafeProjectionContractBlockedSignalClass: String, Codable, Sendable {
  case aSSIGNMENTSTATE = "ASSIGNMENT_STATE"
  case eSCALATIONLOGIC = "ESCALATION_LOGIC"
  case rAWGATESTATE = "RAW_GATE_STATE"
  case sTAFFREASONCODES = "STAFF_REASON_CODES"
  case aUDITLINEAGE = "AUDIT_LINEAGE"
  case iNTERNALACTIVITY = "INTERNAL_ACTIVITY"
  case iNTERNALATTACHMENTS = "INTERNAL_ATTACHMENTS"
  case iNTERNALPARTICIPANTS = "INTERNAL_PARTICIPANTS"
  case iNTERNALCOUNTS = "INTERNAL_COUNTS"
  case sTAFFROUTECONTEXT = "STAFF_ROUTE_CONTEXT"
}

public enum CustomerSafeProjectionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json"
  public static let sourceHash = "509f152350698005aec20351981b8db2a0f7b81ff78cd65139dcc2cbf436dbb3"
}

public struct PortalHelpRequest: Codable, Sendable {
  public let artifact_type: JSONValue
  public let help_request_id: String
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String?
  public let item_id: String?
  public let request_info_ref: String?
  public let source_focus_anchor_ref: String
  public let source_route: String
  public let support_channel: String
  public let reason_family: String
  public let subject_line: String
  public let body_ref: String
  public let case_context_refs: [String]
  public let opened_by_ref: String
  public let lifecycle_state: String
  public let opened_at: ISO8601DateTimeString
  public let acknowledged_at: ISO8601DateTimeString
  public let response_ref: String?
  public let responded_at: ISO8601DateTimeString
  public let closed_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    help_request_id: String,
    tenant_id: String,
    client_id: String,
    manifest_id: String?,
    item_id: String?,
    request_info_ref: String?,
    source_focus_anchor_ref: String,
    source_route: String,
    support_channel: String,
    reason_family: String,
    subject_line: String,
    body_ref: String,
    case_context_refs: [String],
    opened_by_ref: String,
    lifecycle_state: String,
    opened_at: ISO8601DateTimeString,
    acknowledged_at: ISO8601DateTimeString,
    response_ref: String?,
    responded_at: ISO8601DateTimeString,
    closed_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.help_request_id = help_request_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.item_id = item_id
    self.request_info_ref = request_info_ref
    self.source_focus_anchor_ref = source_focus_anchor_ref
    self.source_route = source_route
    self.support_channel = support_channel
    self.reason_family = reason_family
    self.subject_line = subject_line
    self.body_ref = body_ref
    self.case_context_refs = case_context_refs
    self.opened_by_ref = opened_by_ref
    self.lifecycle_state = lifecycle_state
    self.opened_at = opened_at
    self.acknowledged_at = acknowledged_at
    self.response_ref = response_ref
    self.responded_at = responded_at
    self.closed_at = closed_at
  }
}

public enum PortalHelpRequestSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/portal_help_request.schema.json"
  public static let sourceHash = "a1ca4f1acd72c786999e88d9a56c3b3c07e2b2f956477db3fb3cb8d69e585c05"
}

public struct PortalInteractionLayer: Codable, Sendable {
  public let foundation_contract: InteractionLayerFoundationContract
  public let navigation_model: JSONValue
  public let spacing_profile: JSONValue
  public let status_language_profile: JSONValue
  public let selector_profile: JSONValue
  public let support_region_policy: JSONValue
  public let route_continuity_policy: JSONValue
  public let focus_restoration_policy: JSONValue
  public let artifact_hierarchy_policy: JSONValue
  public let responsive_detail_policy: JSONValue
  public let motion_profile: JSONValue
  public let feedback_truth_policy: JSONValue

  public init(
    foundation_contract: InteractionLayerFoundationContract,
    navigation_model: JSONValue,
    spacing_profile: JSONValue,
    status_language_profile: JSONValue,
    selector_profile: JSONValue,
    support_region_policy: JSONValue,
    route_continuity_policy: JSONValue,
    focus_restoration_policy: JSONValue,
    artifact_hierarchy_policy: JSONValue,
    responsive_detail_policy: JSONValue,
    motion_profile: JSONValue,
    feedback_truth_policy: JSONValue
  ) {
    self.foundation_contract = foundation_contract
    self.navigation_model = navigation_model
    self.spacing_profile = spacing_profile
    self.status_language_profile = status_language_profile
    self.selector_profile = selector_profile
    self.support_region_policy = support_region_policy
    self.route_continuity_policy = route_continuity_policy
    self.focus_restoration_policy = focus_restoration_policy
    self.artifact_hierarchy_policy = artifact_hierarchy_policy
    self.responsive_detail_policy = responsive_detail_policy
    self.motion_profile = motion_profile
    self.feedback_truth_policy = feedback_truth_policy
  }
}

public enum PortalInteractionLayerSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/portal_interaction_layer.schema.json"
  public static let sourceHash = "1b88474a2e418c513ca6fb12ef8b971b2ceb5646b93620c6ec587522f0cc7ec5"
}

public struct PortalLanguageContract: Codable, Sendable {
  public let contract_code: JSONValue
  public let plain_language_policy: JSONValue
  public let copy_serialization_policy: JSONValue
  public let dominance_policy: JSONValue
  public let support_subordination_policy: JSONValue
  public let role_filter_policy: JSONValue
  public let due_label_policy: JSONValue
  public let history_language_policy: JSONValue
  public let settlement_language_policy: JSONValue
  public let forbidden_term_families: [String]
  public let copy_budget: [String: JSONValue]

  public init(
    contract_code: JSONValue,
    plain_language_policy: JSONValue,
    copy_serialization_policy: JSONValue,
    dominance_policy: JSONValue,
    support_subordination_policy: JSONValue,
    role_filter_policy: JSONValue,
    due_label_policy: JSONValue,
    history_language_policy: JSONValue,
    settlement_language_policy: JSONValue,
    forbidden_term_families: [String],
    copy_budget: [String: JSONValue]
  ) {
    self.contract_code = contract_code
    self.plain_language_policy = plain_language_policy
    self.copy_serialization_policy = copy_serialization_policy
    self.dominance_policy = dominance_policy
    self.support_subordination_policy = support_subordination_policy
    self.role_filter_policy = role_filter_policy
    self.due_label_policy = due_label_policy
    self.history_language_policy = history_language_policy
    self.settlement_language_policy = settlement_language_policy
    self.forbidden_term_families = forbidden_term_families
    self.copy_budget = copy_budget
  }
}

public enum PortalLanguageContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/portal_language_contract.schema.json"
  public static let sourceHash = "e79c46591e1daa87fd488a76f04a784ad7d738ef4d7c9e8c2455e91dd549a298"
}

public struct RequestInfoRecord: Codable, Sendable {
  public let artifact_type: JSONValue
  public let request_info_id: String
  public let item_id: String
  public let visibility_class: JSONValue
  public let request_info_ordinal: Int
  public let lifecycle_state: String
  public let request_state_version: Int
  public let prompt_entry_ref: String
  public let prompt_body_ref: String
  public let requested_by_ref: String
  public let customer_due_at: ISO8601DateTimeString
  public let opened_notification_refs: [String]
  public let opened_at: ISO8601DateTimeString
  public let response_entry_ref: String?
  public let response_body_ref: String?
  public let responded_by_ref: String?
  public let responded_at: ISO8601DateTimeString
  public let closure_entry_ref: String?
  public let closed_by_ref: String?
  public let closure_reason_code: JSONValue
  public let closed_at: ISO8601DateTimeString
  public let audit_event_refs: [String]

  public init(
    artifact_type: JSONValue,
    request_info_id: String,
    item_id: String,
    visibility_class: JSONValue,
    request_info_ordinal: Int,
    lifecycle_state: String,
    request_state_version: Int,
    prompt_entry_ref: String,
    prompt_body_ref: String,
    requested_by_ref: String,
    customer_due_at: ISO8601DateTimeString,
    opened_notification_refs: [String],
    opened_at: ISO8601DateTimeString,
    response_entry_ref: String?,
    response_body_ref: String?,
    responded_by_ref: String?,
    responded_at: ISO8601DateTimeString,
    closure_entry_ref: String?,
    closed_by_ref: String?,
    closure_reason_code: JSONValue,
    closed_at: ISO8601DateTimeString,
    audit_event_refs: [String]
  ) {
    self.artifact_type = artifact_type
    self.request_info_id = request_info_id
    self.item_id = item_id
    self.visibility_class = visibility_class
    self.request_info_ordinal = request_info_ordinal
    self.lifecycle_state = lifecycle_state
    self.request_state_version = request_state_version
    self.prompt_entry_ref = prompt_entry_ref
    self.prompt_body_ref = prompt_body_ref
    self.requested_by_ref = requested_by_ref
    self.customer_due_at = customer_due_at
    self.opened_notification_refs = opened_notification_refs
    self.opened_at = opened_at
    self.response_entry_ref = response_entry_ref
    self.response_body_ref = response_body_ref
    self.responded_by_ref = responded_by_ref
    self.responded_at = responded_at
    self.closure_entry_ref = closure_entry_ref
    self.closed_by_ref = closed_by_ref
    self.closure_reason_code = closure_reason_code
    self.closed_at = closed_at
    self.audit_event_refs = audit_event_refs
  }
}

public enum RequestInfoRecordSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/request_info_record.schema.json"
  public static let sourceHash = "44b34797f0d758edce1cb46f3eba2b5455220ec61b002d26cd267a28acd6ce49"
}

public struct WorkInboxDelta: Codable, Sendable {
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let inbox_sequence: Int
  public let delivery_class: String
  public let inbox_route_key: String
  public let inbox_version: Int
  public let visibility_partition: JSONValue
  public let causal_semantic_action_id: String?
  public let row_upserts: [WorkInboxDeltaRowUpsert]
  public let row_removals: [WorkInboxDeltaRowRemoval]
  public let badge_updates: [WorkInboxDeltaBadgeUpdate]
  public let occurred_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    tenant_id: String,
    inbox_sequence: Int,
    delivery_class: String,
    inbox_route_key: String,
    inbox_version: Int,
    visibility_partition: JSONValue,
    causal_semantic_action_id: String?,
    row_upserts: [WorkInboxDeltaRowUpsert],
    row_removals: [WorkInboxDeltaRowRemoval],
    badge_updates: [WorkInboxDeltaBadgeUpdate],
    occurred_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.inbox_sequence = inbox_sequence
    self.delivery_class = delivery_class
    self.inbox_route_key = inbox_route_key
    self.inbox_version = inbox_version
    self.visibility_partition = visibility_partition
    self.causal_semantic_action_id = causal_semantic_action_id
    self.row_upserts = row_upserts
    self.row_removals = row_removals
    self.badge_updates = badge_updates
    self.occurred_at = occurred_at
  }
}

public struct WorkInboxDeltaRowUpsert: Codable, Sendable {
  public let item_id: String
  public let row: WorkInboxSnapshot
  public let order_changed: Bool
  public let defer_reorder_until_focus_exit: Bool
  public let queue_projection_basis_hash: String

  public init(
    item_id: String,
    row: WorkInboxSnapshot,
    order_changed: Bool,
    defer_reorder_until_focus_exit: Bool,
    queue_projection_basis_hash: String
  ) {
    self.item_id = item_id
    self.row = row
    self.order_changed = order_changed
    self.defer_reorder_until_focus_exit = defer_reorder_until_focus_exit
    self.queue_projection_basis_hash = queue_projection_basis_hash
  }
}

public struct WorkInboxDeltaRowRemoval: Codable, Sendable {
  public let item_id: String
  public let removal_cause: String
  public let preserve_until_focus_exit: Bool
  public let queue_projection_basis_hash: String

  public init(
    item_id: String,
    removal_cause: String,
    preserve_until_focus_exit: Bool,
    queue_projection_basis_hash: String
  ) {
    self.item_id = item_id
    self.removal_cause = removal_cause
    self.preserve_until_focus_exit = preserve_until_focus_exit
    self.queue_projection_basis_hash = queue_projection_basis_hash
  }
}

public struct WorkInboxDeltaBadgeUpdate: Codable, Sendable {
  public let item_id: String
  public let basis_hash: String
  public let customer_unread_count: Int
  public let internal_unread_count: Int
  public let customer_activity_module_badge_count: Int
  public let internal_activity_module_badge_count_or_null: Int?
  public let latest_change_lane_or_null: JSONValue

  public init(
    item_id: String,
    basis_hash: String,
    customer_unread_count: Int,
    internal_unread_count: Int,
    customer_activity_module_badge_count: Int,
    internal_activity_module_badge_count_or_null: Int?,
    latest_change_lane_or_null: JSONValue
  ) {
    self.item_id = item_id
    self.basis_hash = basis_hash
    self.customer_unread_count = customer_unread_count
    self.internal_unread_count = internal_unread_count
    self.customer_activity_module_badge_count = customer_activity_module_badge_count
    self.internal_activity_module_badge_count_or_null = internal_activity_module_badge_count_or_null
    self.latest_change_lane_or_null = latest_change_lane_or_null
  }
}

public enum WorkInboxDeltaSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/work_inbox_delta.schema.json"
  public static let sourceHash = "bab33fe29004fd26359c22a1ac0d73d18853e03d7d2fbf86aae1f4737f609ffe"
}

public struct WorkInboxSnapshot: Codable, Sendable {
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let shell_family: JSONValue
  public let inbox_route_key: String
  public let dominant_question: String
  public let settlement_state: WorkInboxSnapshotSettlementState
  public let recovery_posture: WorkInboxSnapshotRecoveryPosture
  public let interaction_layer: OperatorInteractionLayer
  public let viewer_mode: String
  public let active_filters: WorkInboxSnapshotActiveFilters
  public let queue_health_score: Int
  public let queue_health_contract: WorkQueueHealthContract
  public let inbox_version: Int
  public let last_published_sequence: Int
  public let resume_token: String
  public let cache_isolation_contract: JSONValue
  public let visibility_partition: JSONValue
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let rows: [WorkInboxSnapshotRow]
  public let selected_item_ref: String?
  public let selected_focus_anchor_ref_or_null: String?

  public init(
    artifact_type: JSONValue,
    tenant_id: String,
    shell_family: JSONValue,
    inbox_route_key: String,
    dominant_question: String,
    settlement_state: WorkInboxSnapshotSettlementState,
    recovery_posture: WorkInboxSnapshotRecoveryPosture,
    interaction_layer: OperatorInteractionLayer,
    viewer_mode: String,
    active_filters: WorkInboxSnapshotActiveFilters,
    queue_health_score: Int,
    queue_health_contract: WorkQueueHealthContract,
    inbox_version: Int,
    last_published_sequence: Int,
    resume_token: String,
    cache_isolation_contract: JSONValue,
    visibility_partition: JSONValue,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    rows: [WorkInboxSnapshotRow],
    selected_item_ref: String?,
    selected_focus_anchor_ref_or_null: String?
  ) {
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.inbox_route_key = inbox_route_key
    self.dominant_question = dominant_question
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.viewer_mode = viewer_mode
    self.active_filters = active_filters
    self.queue_health_score = queue_health_score
    self.queue_health_contract = queue_health_contract
    self.inbox_version = inbox_version
    self.last_published_sequence = last_published_sequence
    self.resume_token = resume_token
    self.cache_isolation_contract = cache_isolation_contract
    self.visibility_partition = visibility_partition
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.rows = rows
    self.selected_item_ref = selected_item_ref
    self.selected_focus_anchor_ref_or_null = selected_focus_anchor_ref_or_null
  }
}

public enum WorkInboxSnapshotSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum WorkInboxSnapshotRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public enum WorkInboxSnapshotWorkflowLifecycleState: String, Codable, Sendable {
  case oPEN = "OPEN"
  case iNPROGRESS = "IN_PROGRESS"
  case wAITINGONCLIENT = "WAITING_ON_CLIENT"
  case wAITINGONAUTHORITY = "WAITING_ON_AUTHORITY"
  case bLOCKED = "BLOCKED"
  case dONE = "DONE"
  case cANCELLED = "CANCELLED"
  case sTALE = "STALE"
}

public enum WorkInboxSnapshotWaitingOnActor: String, Codable, Sendable {
  case nONE = "NONE"
  case cUSTOMER = "CUSTOMER"
  case sTAFF = "STAFF"
  case aUTHORITY = "AUTHORITY"
  case sYSTEM = "SYSTEM"
}

public enum WorkInboxSnapshotDueState: String, Codable, Sendable {
  case oNTRACK = "ON_TRACK"
  case dUESOON = "DUE_SOON"
  case oVERDUE = "OVERDUE"
  case bREACHED = "BREACHED"
}

public enum WorkInboxSnapshotCustomerStatusProjection: String, Codable, Sendable {
  case uNDERREVIEW = "UNDER_REVIEW"
  case aCTIONREQUIRED = "ACTION_REQUIRED"
  case wAITINGONCONFIRMATION = "WAITING_ON_CONFIRMATION"
  case rESOLVED = "RESOLVED"
  case cLOSED = "CLOSED"
}

public enum WorkInboxSnapshotFilterChipCode: String, Codable, Sendable {
  case mINE = "MINE"
  case uNASSIGNED = "UNASSIGNED"
  case eSCALATED = "ESCALATED"
  case wAITINGONCUSTOMER = "WAITING_ON_CUSTOMER"
  case oVERDUE = "OVERDUE"
  case bLOCKED = "BLOCKED"
  case rESOLVEDRECENTLY = "RESOLVED_RECENTLY"
}

public struct WorkInboxSnapshotActiveFilters: Codable, Sendable {
  public let assignee_scope: String
  public let lifecycle_states: [WorkInboxSnapshotWorkflowLifecycleState]
  public let waiting_on_actors: [WorkInboxSnapshotWaitingOnActor]
  public let due_states: [WorkInboxSnapshotDueState]
  public let customer_status_projections: [WorkInboxSnapshotCustomerStatusProjection]
  public let selected_filter_chips: [WorkInboxSnapshotFilterChipCode]
  public let escalation_only: Bool
  public let include_resolved_recently: Bool

  public init(
    assignee_scope: String,
    lifecycle_states: [WorkInboxSnapshotWorkflowLifecycleState],
    waiting_on_actors: [WorkInboxSnapshotWaitingOnActor],
    due_states: [WorkInboxSnapshotDueState],
    customer_status_projections: [WorkInboxSnapshotCustomerStatusProjection],
    selected_filter_chips: [WorkInboxSnapshotFilterChipCode],
    escalation_only: Bool,
    include_resolved_recently: Bool
  ) {
    self.assignee_scope = assignee_scope
    self.lifecycle_states = lifecycle_states
    self.waiting_on_actors = waiting_on_actors
    self.due_states = due_states
    self.customer_status_projections = customer_status_projections
    self.selected_filter_chips = selected_filter_chips
    self.escalation_only = escalation_only
    self.include_resolved_recently = include_resolved_recently
  }
}

public struct WorkInboxSnapshotSortKey: Codable, Sendable {
  public let collaboration_priority_score: Int
  public let escalation_rank: Int
  public let effective_due_at: ISO8601DateTimeString
  public let resolution_confidence_score: Int
  public let queue_entered_at: ISO8601DateTimeString
  public let item_id: String

  public init(
    collaboration_priority_score: Int,
    escalation_rank: Int,
    effective_due_at: ISO8601DateTimeString,
    resolution_confidence_score: Int,
    queue_entered_at: ISO8601DateTimeString,
    item_id: String
  ) {
    self.collaboration_priority_score = collaboration_priority_score
    self.escalation_rank = escalation_rank
    self.effective_due_at = effective_due_at
    self.resolution_confidence_score = resolution_confidence_score
    self.queue_entered_at = queue_entered_at
    self.item_id = item_id
  }
}

public struct WorkInboxSnapshotRowActions: Codable, Sendable {
  public let actionability_state: String
  public let primary_action_code: String?
  public let secondary_action_codes: [String]
  public let available_action_codes: [String]
  public let blocked_action_codes: [String]
  public let available_action_bindings: [[String: JSONValue]]
  public let authoritative_action: ActionAuthorityContract

  public init(
    actionability_state: String,
    primary_action_code: String?,
    secondary_action_codes: [String],
    available_action_codes: [String],
    blocked_action_codes: [String],
    available_action_bindings: [[String: JSONValue]],
    authoritative_action: ActionAuthorityContract
  ) {
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.secondary_action_codes = secondary_action_codes
    self.available_action_codes = available_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.available_action_bindings = available_action_bindings
    self.authoritative_action = authoritative_action
  }
}

public struct WorkInboxSnapshotRow: Codable, Sendable {
  public let item_id: String
  public let focus_anchor_ref: String
  public let sort_key: WorkInboxSnapshotSortKey
  public let queue_projection: CollaborationQueueProjectionContract
  public let title: String
  public let client_label: String
  public let period_label: String
  public let internal_lifecycle_state: WorkInboxSnapshotWorkflowLifecycleState
  public let customer_status_projection: JSONValue
  public let assignee_label: String?
  public let waiting_on_actor: WorkInboxSnapshotWaitingOnActor
  public let due_state: JSONValue
  public let effective_due_at: ISO8601DateTimeString
  public let last_activity_at: ISO8601DateTimeString
  public let customer_unread_count: Int
  public let internal_unread_count: Int
  public let escalation_active: Bool
  public let collaboration_priority_score: Int
  public let escalation_rank: Int
  public let resolution_confidence_score: Int
  public let sla_pressure_score: Int
  public let queue_entered_at: ISO8601DateTimeString
  public let row_actions: WorkInboxSnapshotRowActions

  public init(
    item_id: String,
    focus_anchor_ref: String,
    sort_key: WorkInboxSnapshotSortKey,
    queue_projection: CollaborationQueueProjectionContract,
    title: String,
    client_label: String,
    period_label: String,
    internal_lifecycle_state: WorkInboxSnapshotWorkflowLifecycleState,
    customer_status_projection: JSONValue,
    assignee_label: String?,
    waiting_on_actor: WorkInboxSnapshotWaitingOnActor,
    due_state: JSONValue,
    effective_due_at: ISO8601DateTimeString,
    last_activity_at: ISO8601DateTimeString,
    customer_unread_count: Int,
    internal_unread_count: Int,
    escalation_active: Bool,
    collaboration_priority_score: Int,
    escalation_rank: Int,
    resolution_confidence_score: Int,
    sla_pressure_score: Int,
    queue_entered_at: ISO8601DateTimeString,
    row_actions: WorkInboxSnapshotRowActions
  ) {
    self.item_id = item_id
    self.focus_anchor_ref = focus_anchor_ref
    self.sort_key = sort_key
    self.queue_projection = queue_projection
    self.title = title
    self.client_label = client_label
    self.period_label = period_label
    self.internal_lifecycle_state = internal_lifecycle_state
    self.customer_status_projection = customer_status_projection
    self.assignee_label = assignee_label
    self.waiting_on_actor = waiting_on_actor
    self.due_state = due_state
    self.effective_due_at = effective_due_at
    self.last_activity_at = last_activity_at
    self.customer_unread_count = customer_unread_count
    self.internal_unread_count = internal_unread_count
    self.escalation_active = escalation_active
    self.collaboration_priority_score = collaboration_priority_score
    self.escalation_rank = escalation_rank
    self.resolution_confidence_score = resolution_confidence_score
    self.sla_pressure_score = sla_pressure_score
    self.queue_entered_at = queue_entered_at
    self.row_actions = row_actions
  }
}

public enum WorkInboxSnapshotSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/work_inbox_snapshot.schema.json"
  public static let sourceHash = "7936b537901dc5d302d42f49cfa36253efe54dfc41850dd7b42d2dc15d6bada9"
}

public struct WorkItemNotification: Codable, Sendable {
  public let notification_id: String
  public let item_id: String
  public let recipient_ref: String
  public let visibility_class: String
  public let notification_type: String
  public let delivery_channel: String
  public let dedupe_key: String
  public let semantic_action_id: String
  public let visibility_partition: JSONValue
  public let access_binding_hash: String
  public let customer_safe_projection: JSONValue
  public let queue_projection: CollaborationQueueProjectionContract
  public let shell_family: String
  public let object_anchor_ref: String
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let target_route_ref: String
  public let target_module_code: JSONValue
  public let focus_anchor_ref: String?
  public let focus_restoration: FocusRestorationContract
  public let return_route_ref: String
  public let return_focus_anchor_ref: String
  public let fallback_route_ref: String
  public let fallback_focus_anchor_ref: String
  public let fallback_reason_code_or_null: String?
  public let workspace_version_at_queue: Int
  public let request_info_ref: String?
  public let queued_at: ISO8601DateTimeString
  public let delivered_at: ISO8601DateTimeString
  public let read_at: ISO8601DateTimeString
  public let suppressed_reason_codes: [String]

  public init(
    notification_id: String,
    item_id: String,
    recipient_ref: String,
    visibility_class: String,
    notification_type: String,
    delivery_channel: String,
    dedupe_key: String,
    semantic_action_id: String,
    visibility_partition: JSONValue,
    access_binding_hash: String,
    customer_safe_projection: JSONValue,
    queue_projection: CollaborationQueueProjectionContract,
    shell_family: String,
    object_anchor_ref: String,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    target_route_ref: String,
    target_module_code: JSONValue,
    focus_anchor_ref: String?,
    focus_restoration: FocusRestorationContract,
    return_route_ref: String,
    return_focus_anchor_ref: String,
    fallback_route_ref: String,
    fallback_focus_anchor_ref: String,
    fallback_reason_code_or_null: String?,
    workspace_version_at_queue: Int,
    request_info_ref: String?,
    queued_at: ISO8601DateTimeString,
    delivered_at: ISO8601DateTimeString,
    read_at: ISO8601DateTimeString,
    suppressed_reason_codes: [String]
  ) {
    self.notification_id = notification_id
    self.item_id = item_id
    self.recipient_ref = recipient_ref
    self.visibility_class = visibility_class
    self.notification_type = notification_type
    self.delivery_channel = delivery_channel
    self.dedupe_key = dedupe_key
    self.semantic_action_id = semantic_action_id
    self.visibility_partition = visibility_partition
    self.access_binding_hash = access_binding_hash
    self.customer_safe_projection = customer_safe_projection
    self.queue_projection = queue_projection
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.target_route_ref = target_route_ref
    self.target_module_code = target_module_code
    self.focus_anchor_ref = focus_anchor_ref
    self.focus_restoration = focus_restoration
    self.return_route_ref = return_route_ref
    self.return_focus_anchor_ref = return_focus_anchor_ref
    self.fallback_route_ref = fallback_route_ref
    self.fallback_focus_anchor_ref = fallback_focus_anchor_ref
    self.fallback_reason_code_or_null = fallback_reason_code_or_null
    self.workspace_version_at_queue = workspace_version_at_queue
    self.request_info_ref = request_info_ref
    self.queued_at = queued_at
    self.delivered_at = delivered_at
    self.read_at = read_at
    self.suppressed_reason_codes = suppressed_reason_codes
  }
}

public enum WorkItemNotificationSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/work_item_notification.schema.json"
  public static let sourceHash = "e675b25673a25b05297ad110b6214150e7f60406b0cc717f9f7d11589f7d5d56"
}

public struct WorkItemParticipant: Codable, Sendable {
  public let artifact_type: JSONValue
  public let participant_ref: String
  public let item_id: String
  public let participant_role: String
  public let watch_state: String
  public let last_read_customer_sequence: Int?
  public let last_read_internal_sequence: Int?
  public let notification_preferences_ref: String

  public init(
    artifact_type: JSONValue,
    participant_ref: String,
    item_id: String,
    participant_role: String,
    watch_state: String,
    last_read_customer_sequence: Int?,
    last_read_internal_sequence: Int?,
    notification_preferences_ref: String
  ) {
    self.artifact_type = artifact_type
    self.participant_ref = participant_ref
    self.item_id = item_id
    self.participant_role = participant_role
    self.watch_state = watch_state
    self.last_read_customer_sequence = last_read_customer_sequence
    self.last_read_internal_sequence = last_read_internal_sequence
    self.notification_preferences_ref = notification_preferences_ref
  }
}

public enum WorkItemParticipantSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/work_item_participant.schema.json"
  public static let sourceHash = "e7a8bba88b2549451d348d63d7da2782b67f548efd510cdf20d59a9ae4605add"
}

public struct WorkQueueHealthContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let queue_scope: String
  public let routing_profile_code: JSONValue
  public let routing_profile_hash: String
  public let queue_route_key: String
  public let basis_hash: String
  public let queue_health_score: Int
  public let queue_pressure_score: Int
  public let queue_health_floor: Int
  public let queue_health_state: String
  public let intervention_recommendation_state: String
  public let ordering_policy: JSONValue
  public let focus_safe_live_update_policy: JSONValue
  public let reason_codes: [String]

  public init(
    contract_version: JSONValue,
    queue_scope: String,
    routing_profile_code: JSONValue,
    routing_profile_hash: String,
    queue_route_key: String,
    basis_hash: String,
    queue_health_score: Int,
    queue_pressure_score: Int,
    queue_health_floor: Int,
    queue_health_state: String,
    intervention_recommendation_state: String,
    ordering_policy: JSONValue,
    focus_safe_live_update_policy: JSONValue,
    reason_codes: [String]
  ) {
    self.contract_version = contract_version
    self.queue_scope = queue_scope
    self.routing_profile_code = routing_profile_code
    self.routing_profile_hash = routing_profile_hash
    self.queue_route_key = queue_route_key
    self.basis_hash = basis_hash
    self.queue_health_score = queue_health_score
    self.queue_pressure_score = queue_pressure_score
    self.queue_health_floor = queue_health_floor
    self.queue_health_state = queue_health_state
    self.intervention_recommendation_state = intervention_recommendation_state
    self.ordering_policy = ordering_policy
    self.focus_safe_live_update_policy = focus_safe_live_update_policy
    self.reason_codes = reason_codes
  }
}

public enum WorkQueueHealthContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/work_queue_health_contract.schema.json"
  public static let sourceHash = "a7a2fd062ddb5b74d8510437df68eb977ded72932b1615cb16dd59336b93fe5d"
}

public struct WorkspaceSnapshot: Codable, Sendable {
  public let artifact_type: JSONValue
  public let item_id: String
  public let tenant_id: String
  public let shell_family: String
  public let object_anchor_ref: String
  public let workspace_route_key: String
  public let experience_profile: JSONValue
  public let viewer_scope: String
  public let dominant_question: String
  public let dominance_contract: ShellDominanceContract
  public let state_taxonomy_contract: ShellStateTaxonomyContract
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let cache_isolation_contract: JSONValue
  public let semantic_accessibility_contract: SemanticAccessibilityContract
  public let settlement_state: WorkspaceSnapshotSettlementState
  public let recovery_posture: WorkspaceSnapshotRecoveryPosture
  public let interaction_layer: OperatorInteractionLayer
  public let frame_epoch: Int
  public let workspace_version: Int
  public let customer_head_sequence: Int
  public let internal_head_sequence_or_null: Int?
  public let active_request_info_ref_or_null: String?
  public let request_state_version_or_null: Int?
  public let shell_stability_token: String
  public let last_published_sequence: Int
  public let resume_token: String
  public let stream_recovery_contract: JSONValue
  public let stability_contract: RouteStabilityContract
  public let visibility_partition: JSONValue
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let customer_safe_projection: JSONValue
  public let queue_projection: CollaborationQueueProjectionContract
  public let route_context: WorkspaceSnapshotRouteContext
  public let surface_order: [JSONValue]
  public let context_bar: WorkspaceSnapshotContextBar
  public let decision_summary: WorkspaceSnapshotDecisionSummary
  public let action_strip: WorkspaceSnapshotActionStrip
  public let detail_drawer: WorkspaceSnapshotDetailDrawer
  public let customer_request_workspace: JSONValue
  public let permissions: WorkspaceSnapshotPermissions
  public let participants: [WorkspaceSnapshotWorkItemParticipant]

  public init(
    artifact_type: JSONValue,
    item_id: String,
    tenant_id: String,
    shell_family: String,
    object_anchor_ref: String,
    workspace_route_key: String,
    experience_profile: JSONValue,
    viewer_scope: String,
    dominant_question: String,
    dominance_contract: ShellDominanceContract,
    state_taxonomy_contract: ShellStateTaxonomyContract,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    cache_isolation_contract: JSONValue,
    semantic_accessibility_contract: SemanticAccessibilityContract,
    settlement_state: WorkspaceSnapshotSettlementState,
    recovery_posture: WorkspaceSnapshotRecoveryPosture,
    interaction_layer: OperatorInteractionLayer,
    frame_epoch: Int,
    workspace_version: Int,
    customer_head_sequence: Int,
    internal_head_sequence_or_null: Int?,
    active_request_info_ref_or_null: String?,
    request_state_version_or_null: Int?,
    shell_stability_token: String,
    last_published_sequence: Int,
    resume_token: String,
    stream_recovery_contract: JSONValue,
    stability_contract: RouteStabilityContract,
    visibility_partition: JSONValue,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    customer_safe_projection: JSONValue,
    queue_projection: CollaborationQueueProjectionContract,
    route_context: WorkspaceSnapshotRouteContext,
    surface_order: [JSONValue],
    context_bar: WorkspaceSnapshotContextBar,
    decision_summary: WorkspaceSnapshotDecisionSummary,
    action_strip: WorkspaceSnapshotActionStrip,
    detail_drawer: WorkspaceSnapshotDetailDrawer,
    customer_request_workspace: JSONValue,
    permissions: WorkspaceSnapshotPermissions,
    participants: [WorkspaceSnapshotWorkItemParticipant]
  ) {
    self.artifact_type = artifact_type
    self.item_id = item_id
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.workspace_route_key = workspace_route_key
    self.experience_profile = experience_profile
    self.viewer_scope = viewer_scope
    self.dominant_question = dominant_question
    self.dominance_contract = dominance_contract
    self.state_taxonomy_contract = state_taxonomy_contract
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.cache_isolation_contract = cache_isolation_contract
    self.semantic_accessibility_contract = semantic_accessibility_contract
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.frame_epoch = frame_epoch
    self.workspace_version = workspace_version
    self.customer_head_sequence = customer_head_sequence
    self.internal_head_sequence_or_null = internal_head_sequence_or_null
    self.active_request_info_ref_or_null = active_request_info_ref_or_null
    self.request_state_version_or_null = request_state_version_or_null
    self.shell_stability_token = shell_stability_token
    self.last_published_sequence = last_published_sequence
    self.resume_token = resume_token
    self.stream_recovery_contract = stream_recovery_contract
    self.stability_contract = stability_contract
    self.visibility_partition = visibility_partition
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.customer_safe_projection = customer_safe_projection
    self.queue_projection = queue_projection
    self.route_context = route_context
    self.surface_order = surface_order
    self.context_bar = context_bar
    self.decision_summary = decision_summary
    self.action_strip = action_strip
    self.detail_drawer = detail_drawer
    self.customer_request_workspace = customer_request_workspace
    self.permissions = permissions
    self.participants = participants
  }
}

public enum WorkspaceSnapshotSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum WorkspaceSnapshotRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public struct WorkspaceSnapshotRouteContext: Codable, Sendable {
  public let entry_surface: String
  public let active_route_ref: String
  public let active_module_code: String
  public let focus_anchor_ref_or_null: String?
  public let focus_restoration: FocusRestorationContract
  public let artifact_focus_bucket_or_null: JSONValue
  public let artifact_focus_subject_ref_or_null: String?
  public let return_route_ref: String
  public let return_focus_anchor_ref: String
  public let fallback_route_ref: String
  public let fallback_focus_anchor_ref: String
  public let fallback_reason_code: String

  public init(
    entry_surface: String,
    active_route_ref: String,
    active_module_code: String,
    focus_anchor_ref_or_null: String?,
    focus_restoration: FocusRestorationContract,
    artifact_focus_bucket_or_null: JSONValue,
    artifact_focus_subject_ref_or_null: String?,
    return_route_ref: String,
    return_focus_anchor_ref: String,
    fallback_route_ref: String,
    fallback_focus_anchor_ref: String,
    fallback_reason_code: String
  ) {
    self.entry_surface = entry_surface
    self.active_route_ref = active_route_ref
    self.active_module_code = active_module_code
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.focus_restoration = focus_restoration
    self.artifact_focus_bucket_or_null = artifact_focus_bucket_or_null
    self.artifact_focus_subject_ref_or_null = artifact_focus_subject_ref_or_null
    self.return_route_ref = return_route_ref
    self.return_focus_anchor_ref = return_focus_anchor_ref
    self.fallback_route_ref = fallback_route_ref
    self.fallback_focus_anchor_ref = fallback_focus_anchor_ref
    self.fallback_reason_code = fallback_reason_code
  }
}

public struct WorkspaceSnapshotContextBar: Codable, Sendable {
  public let title: String
  public let item_id: String
  public let client_label: String
  public let period_label: String
  public let internal_lifecycle_state: JSONValue
  public let customer_status_projection: String
  public let assignee_label: String?
  public let escalation_active: Bool?
  public let waiting_on_actor: String
  public let due_state: String
  public let freshness_state: String
  public let freshness_notice_ref_or_null: String?
  public let recovery_notice_ref_or_null: String?

  public init(
    title: String,
    item_id: String,
    client_label: String,
    period_label: String,
    internal_lifecycle_state: JSONValue,
    customer_status_projection: String,
    assignee_label: String?,
    escalation_active: Bool?,
    waiting_on_actor: String,
    due_state: String,
    freshness_state: String,
    freshness_notice_ref_or_null: String?,
    recovery_notice_ref_or_null: String?
  ) {
    self.title = title
    self.item_id = item_id
    self.client_label = client_label
    self.period_label = period_label
    self.internal_lifecycle_state = internal_lifecycle_state
    self.customer_status_projection = customer_status_projection
    self.assignee_label = assignee_label
    self.escalation_active = escalation_active
    self.waiting_on_actor = waiting_on_actor
    self.due_state = due_state
    self.freshness_state = freshness_state
    self.freshness_notice_ref_or_null = freshness_notice_ref_or_null
    self.recovery_notice_ref_or_null = recovery_notice_ref_or_null
  }
}

public struct WorkspaceSnapshotDecisionSummary: Codable, Sendable {
  public let summary_ref: String
  public let next_actor: String
  public let next_actor_summary_ref: String
  public let due_summary_ref: String
  public let customer_state_differs: Bool?
  public let customer_state_summary_ref: String?
  public let reason_codes: [String]

  public init(
    summary_ref: String,
    next_actor: String,
    next_actor_summary_ref: String,
    due_summary_ref: String,
    customer_state_differs: Bool?,
    customer_state_summary_ref: String?,
    reason_codes: [String]
  ) {
    self.summary_ref = summary_ref
    self.next_actor = next_actor
    self.next_actor_summary_ref = next_actor_summary_ref
    self.due_summary_ref = due_summary_ref
    self.customer_state_differs = customer_state_differs
    self.customer_state_summary_ref = customer_state_summary_ref
    self.reason_codes = reason_codes
  }
}

public struct WorkspaceSnapshotActionStrip: Codable, Sendable {
  public let actionability_state: String
  public let primary_action_code: String?
  public let secondary_action_codes: [String]
  public let available_action_codes: [String]
  public let blocked_action_codes: [String]
  public let ownership_posture: String
  public let ownership_label: String?
  public let waiting_on_label: String?
  public let blocking_reason: String?
  public let machine_reason_codes: [String]
  public let suggested_module_code: JSONValue
  public let authoritative_action: ActionAuthorityContract

  public init(
    actionability_state: String,
    primary_action_code: String?,
    secondary_action_codes: [String],
    available_action_codes: [String],
    blocked_action_codes: [String],
    ownership_posture: String,
    ownership_label: String?,
    waiting_on_label: String?,
    blocking_reason: String?,
    machine_reason_codes: [String],
    suggested_module_code: JSONValue,
    authoritative_action: ActionAuthorityContract
  ) {
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.secondary_action_codes = secondary_action_codes
    self.available_action_codes = available_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.ownership_posture = ownership_posture
    self.ownership_label = ownership_label
    self.waiting_on_label = waiting_on_label
    self.blocking_reason = blocking_reason
    self.machine_reason_codes = machine_reason_codes
    self.suggested_module_code = suggested_module_code
    self.authoritative_action = authoritative_action
  }
}

public struct WorkspaceSnapshotCustomerRequestWorkspace: Codable, Sendable {
  public let surface_order: JSONValue
  public let language_contract: PortalLanguageContract
  public let status_code: String
  public let status_label_ref: String
  public let due_label_ref_or_null: String?
  public let action_order: JSONValue
  public let visible_action_codes: [String]
  public let primary_action_label_ref_or_null: String?
  public let no_safe_action_reason_ref_or_null: String?
  public let authoritative_action: ActionAuthorityContract
  public let artifact_history_state: String
  public let current_artifact_ref_or_null: String?
  public let historical_artifact_refs: [String]
  public let artifact_selection: JSONValue
  public let artifact_affordance: JSONValue

  public init(
    surface_order: JSONValue,
    language_contract: PortalLanguageContract,
    status_code: String,
    status_label_ref: String,
    due_label_ref_or_null: String?,
    action_order: JSONValue,
    visible_action_codes: [String],
    primary_action_label_ref_or_null: String?,
    no_safe_action_reason_ref_or_null: String?,
    authoritative_action: ActionAuthorityContract,
    artifact_history_state: String,
    current_artifact_ref_or_null: String?,
    historical_artifact_refs: [String],
    artifact_selection: JSONValue,
    artifact_affordance: JSONValue
  ) {
    self.surface_order = surface_order
    self.language_contract = language_contract
    self.status_code = status_code
    self.status_label_ref = status_label_ref
    self.due_label_ref_or_null = due_label_ref_or_null
    self.action_order = action_order
    self.visible_action_codes = visible_action_codes
    self.primary_action_label_ref_or_null = primary_action_label_ref_or_null
    self.no_safe_action_reason_ref_or_null = no_safe_action_reason_ref_or_null
    self.authoritative_action = authoritative_action
    self.artifact_history_state = artifact_history_state
    self.current_artifact_ref_or_null = current_artifact_ref_or_null
    self.historical_artifact_refs = historical_artifact_refs
    self.artifact_selection = artifact_selection
    self.artifact_affordance = artifact_affordance
  }
}

public struct WorkspaceSnapshotDetailDrawer: Codable, Sendable {
  public let modules: [WorkspaceSnapshotModuleState]
  public let promoted_module_code: JSONValue
  public let expanded_module_code: JSONValue
  public let focus_anchor_ref: String?
  public let fallback_reason_code: String?
  public let composer_layer: WorkspaceSnapshotComposerLayer

  public init(
    modules: [WorkspaceSnapshotModuleState],
    promoted_module_code: JSONValue,
    expanded_module_code: JSONValue,
    focus_anchor_ref: String?,
    fallback_reason_code: String?,
    composer_layer: WorkspaceSnapshotComposerLayer
  ) {
    self.modules = modules
    self.promoted_module_code = promoted_module_code
    self.expanded_module_code = expanded_module_code
    self.focus_anchor_ref = focus_anchor_ref
    self.fallback_reason_code = fallback_reason_code
    self.composer_layer = composer_layer
  }
}

public struct WorkspaceSnapshotComposerLayer: Codable, Sendable {
  public let surface_order: [JSONValue]
  public let available_append_command_codes: [String]
  public let default_append_command_code_or_null: JSONValue
  public let selected_append_command_code_or_null: JSONValue
  public let composer_visibility_class_or_null: JSONValue
  public let visibility_label_ref_or_null: String?
  public let target_request_info_ref_or_null: String?
  public let draft_state: String
  public let draft_ref_or_null: String?
  public let draft_last_saved_at_or_null: ISO8601DateTimeString
  public let rebase_target_snapshot_ref_or_null: String?
  public let publish_block_reason_codes: [String]
  public let attachment_picker: WorkspaceSnapshotAttachmentPicker
  public let publish_confirmation: WorkspaceSnapshotPublishConfirmation

  public init(
    surface_order: [JSONValue],
    available_append_command_codes: [String],
    default_append_command_code_or_null: JSONValue,
    selected_append_command_code_or_null: JSONValue,
    composer_visibility_class_or_null: JSONValue,
    visibility_label_ref_or_null: String?,
    target_request_info_ref_or_null: String?,
    draft_state: String,
    draft_ref_or_null: String?,
    draft_last_saved_at_or_null: ISO8601DateTimeString,
    rebase_target_snapshot_ref_or_null: String?,
    publish_block_reason_codes: [String],
    attachment_picker: WorkspaceSnapshotAttachmentPicker,
    publish_confirmation: WorkspaceSnapshotPublishConfirmation
  ) {
    self.surface_order = surface_order
    self.available_append_command_codes = available_append_command_codes
    self.default_append_command_code_or_null = default_append_command_code_or_null
    self.selected_append_command_code_or_null = selected_append_command_code_or_null
    self.composer_visibility_class_or_null = composer_visibility_class_or_null
    self.visibility_label_ref_or_null = visibility_label_ref_or_null
    self.target_request_info_ref_or_null = target_request_info_ref_or_null
    self.draft_state = draft_state
    self.draft_ref_or_null = draft_ref_or_null
    self.draft_last_saved_at_or_null = draft_last_saved_at_or_null
    self.rebase_target_snapshot_ref_or_null = rebase_target_snapshot_ref_or_null
    self.publish_block_reason_codes = publish_block_reason_codes
    self.attachment_picker = attachment_picker
    self.publish_confirmation = publish_confirmation
  }
}

public struct WorkspaceSnapshotAttachmentPicker: Codable, Sendable {
  public let picker_state: String
  public let staged_upload_refs: [String]
  public let inherited_visibility_class_or_null: JSONValue
  public let visibility_confirmation_required: Bool
  public let visibility_confirmed: Bool

  public init(
    picker_state: String,
    staged_upload_refs: [String],
    inherited_visibility_class_or_null: JSONValue,
    visibility_confirmation_required: Bool,
    visibility_confirmed: Bool
  ) {
    self.picker_state = picker_state
    self.staged_upload_refs = staged_upload_refs
    self.inherited_visibility_class_or_null = inherited_visibility_class_or_null
    self.visibility_confirmation_required = visibility_confirmation_required
    self.visibility_confirmed = visibility_confirmed
  }
}

public struct WorkspaceSnapshotPublishConfirmation: Codable, Sendable {
  public let confirmation_state: String
  public let publish_action_code_or_null: JSONValue
  public let confirmation_message_ref_or_null: String?

  public init(
    confirmation_state: String,
    publish_action_code_or_null: JSONValue,
    confirmation_message_ref_or_null: String?
  ) {
    self.confirmation_state = confirmation_state
    self.publish_action_code_or_null = publish_action_code_or_null
    self.confirmation_message_ref_or_null = confirmation_message_ref_or_null
  }
}

public struct WorkspaceSnapshotModuleState: Codable, Sendable {
  public let module_code: String
  public let content_state: String
  public let state_reason_code_or_null: JSONValue
  public let limitation_reason_codes: [String]
  public let placeholder_refs: [String]
  public let module_badge_count: Int
  public let new_activity_marker_ref_or_null: String?
  public let visibility_partition: String
  public let file_segments: [String]
  public let current_shared_file_refs: [String]
  public let historical_shared_file_refs: [String]
  public let internal_only_file_refs: [String]

  public init(
    module_code: String,
    content_state: String,
    state_reason_code_or_null: JSONValue,
    limitation_reason_codes: [String],
    placeholder_refs: [String],
    module_badge_count: Int,
    new_activity_marker_ref_or_null: String?,
    visibility_partition: String,
    file_segments: [String],
    current_shared_file_refs: [String],
    historical_shared_file_refs: [String],
    internal_only_file_refs: [String]
  ) {
    self.module_code = module_code
    self.content_state = content_state
    self.state_reason_code_or_null = state_reason_code_or_null
    self.limitation_reason_codes = limitation_reason_codes
    self.placeholder_refs = placeholder_refs
    self.module_badge_count = module_badge_count
    self.new_activity_marker_ref_or_null = new_activity_marker_ref_or_null
    self.visibility_partition = visibility_partition
    self.file_segments = file_segments
    self.current_shared_file_refs = current_shared_file_refs
    self.historical_shared_file_refs = historical_shared_file_refs
    self.internal_only_file_refs = internal_only_file_refs
  }
}

public struct WorkspaceSnapshotPermissions: Codable, Sendable {
  public let can_reply_customer_visible: Bool
  public let can_publish_request_info: Bool
  public let can_add_internal_note: Bool
  public let can_assign: Bool
  public let can_escalate: Bool
  public let can_change_status: Bool
  public let can_view_audit_trail: Bool

  public init(
    can_reply_customer_visible: Bool,
    can_publish_request_info: Bool,
    can_add_internal_note: Bool,
    can_assign: Bool,
    can_escalate: Bool,
    can_change_status: Bool,
    can_view_audit_trail: Bool
  ) {
    self.can_reply_customer_visible = can_reply_customer_visible
    self.can_publish_request_info = can_publish_request_info
    self.can_add_internal_note = can_add_internal_note
    self.can_assign = can_assign
    self.can_escalate = can_escalate
    self.can_change_status = can_change_status
    self.can_view_audit_trail = can_view_audit_trail
  }
}

public struct WorkspaceSnapshotWorkItemParticipant: Codable, Sendable {
  public let participant_ref: String
  public let item_id: String
  public let participant_role: String
  public let watch_state: String
  public let last_read_customer_sequence: Int?
  public let last_read_internal_sequence: Int?
  public let notification_preferences_ref: String

  public init(
    participant_ref: String,
    item_id: String,
    participant_role: String,
    watch_state: String,
    last_read_customer_sequence: Int?,
    last_read_internal_sequence: Int?,
    notification_preferences_ref: String
  ) {
    self.participant_ref = participant_ref
    self.item_id = item_id
    self.participant_role = participant_role
    self.watch_state = watch_state
    self.last_read_customer_sequence = last_read_customer_sequence
    self.last_read_internal_sequence = last_read_internal_sequence
    self.notification_preferences_ref = notification_preferences_ref
  }
}

public enum WorkspaceSnapshotSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/workspace_snapshot.schema.json"
  public static let sourceHash = "47a79ceeb06d68483fd8baca9146fc297049848ef5fd1a6d92ec6bc2089dddea"
}

public struct WorkspaceStreamEvent: Codable, Sendable {
  public let artifact_type: JSONValue
  public let stream_scope_class: JSONValue
  public let item_id: String
  public let shell_family: String
  public let object_anchor_ref: String
  public let workspace_route_key: String
  public let session_visibility_class: String
  public let workspace_sequence: Int
  public let frame_epoch: Int
  public let workspace_version: Int
  public let shell_stability_token: String
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let resume_token: String
  public let stream_recovery_contract: JSONValue
  public let stability_contract: RouteStabilityContract
  public let visibility_partition: JSONValue
  public let customer_safe_projection: JSONValue
  public let event_type: String
  public let queue_projection_or_null: JSONValue
  public let snapshot_ref: String?
  public let delta_ref: String?
  public let activity_ref: String?
  public let audit_ref: String?
  public let notification_ref: String?
  public let occurred_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    stream_scope_class: JSONValue,
    item_id: String,
    shell_family: String,
    object_anchor_ref: String,
    workspace_route_key: String,
    session_visibility_class: String,
    workspace_sequence: Int,
    frame_epoch: Int,
    workspace_version: Int,
    shell_stability_token: String,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    resume_token: String,
    stream_recovery_contract: JSONValue,
    stability_contract: RouteStabilityContract,
    visibility_partition: JSONValue,
    customer_safe_projection: JSONValue,
    event_type: String,
    queue_projection_or_null: JSONValue,
    snapshot_ref: String?,
    delta_ref: String?,
    activity_ref: String?,
    audit_ref: String?,
    notification_ref: String?,
    occurred_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.stream_scope_class = stream_scope_class
    self.item_id = item_id
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.workspace_route_key = workspace_route_key
    self.session_visibility_class = session_visibility_class
    self.workspace_sequence = workspace_sequence
    self.frame_epoch = frame_epoch
    self.workspace_version = workspace_version
    self.shell_stability_token = shell_stability_token
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.resume_token = resume_token
    self.stream_recovery_contract = stream_recovery_contract
    self.stability_contract = stability_contract
    self.visibility_partition = visibility_partition
    self.customer_safe_projection = customer_safe_projection
    self.event_type = event_type
    self.queue_projection_or_null = queue_projection_or_null
    self.snapshot_ref = snapshot_ref
    self.delta_ref = delta_ref
    self.activity_ref = activity_ref
    self.audit_ref = audit_ref
    self.notification_ref = notification_ref
    self.occurred_at = occurred_at
  }
}

public enum WorkspaceStreamEventSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/workspace_stream_event.schema.json"
  public static let sourceHash = "aaab80fcae970968d9466994590f711726f2d4221d5ee69644d24c1e893c46fa"
}

public enum ClientAndCollaborationBindingManifest {
  public static let familyRef = "CLIENT_AND_COLLABORATION"
  public static let schemaCount = 27
}
