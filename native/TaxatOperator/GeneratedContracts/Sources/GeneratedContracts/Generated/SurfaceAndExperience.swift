// DO NOT EDIT: generated downstream from packages/contracts-core.
import Foundation

public struct ActionStripState: Codable, Sendable {
  public let artifact_type: JSONValue
  public let surface_code: JSONValue
  public let source_module_code: JSONValue
  public let actionability_state: String
  public let mode_safety_posture: String
  public let primary_action: JSONValue
  public let secondary_actions: [ActionStripStateAction]
  public let available_action_codes: [String]
  public let blocked_action_codes: [String]
  public let ownership_posture: String
  public let ownership_label: String?
  public let waiting_on_label: String?
  public let blocking_reason: String?
  public let no_safe_action_reason_code: String?
  public let machine_reason_codes: [String]
  public let investigation_entry_point: JSONValue
  public let suggested_detail_surface_code: JSONValue
  public let active_detail_surface_code: JSONValue
  public let focus_anchor_ref: String?
  public let primary_action_score: Int
  public let runner_up_action_score: Int
  public let dominance_margin: Int
  public let suppressed_secondary_count: Int
  public let full_text_ref: String

  public init(
    artifact_type: JSONValue,
    surface_code: JSONValue,
    source_module_code: JSONValue,
    actionability_state: String,
    mode_safety_posture: String,
    primary_action: JSONValue,
    secondary_actions: [ActionStripStateAction],
    available_action_codes: [String],
    blocked_action_codes: [String],
    ownership_posture: String,
    ownership_label: String?,
    waiting_on_label: String?,
    blocking_reason: String?,
    no_safe_action_reason_code: String?,
    machine_reason_codes: [String],
    investigation_entry_point: JSONValue,
    suggested_detail_surface_code: JSONValue,
    active_detail_surface_code: JSONValue,
    focus_anchor_ref: String?,
    primary_action_score: Int,
    runner_up_action_score: Int,
    dominance_margin: Int,
    suppressed_secondary_count: Int,
    full_text_ref: String
  ) {
    self.artifact_type = artifact_type
    self.surface_code = surface_code
    self.source_module_code = source_module_code
    self.actionability_state = actionability_state
    self.mode_safety_posture = mode_safety_posture
    self.primary_action = primary_action
    self.secondary_actions = secondary_actions
    self.available_action_codes = available_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.ownership_posture = ownership_posture
    self.ownership_label = ownership_label
    self.waiting_on_label = waiting_on_label
    self.blocking_reason = blocking_reason
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.machine_reason_codes = machine_reason_codes
    self.investigation_entry_point = investigation_entry_point
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.active_detail_surface_code = active_detail_surface_code
    self.focus_anchor_ref = focus_anchor_ref
    self.primary_action_score = primary_action_score
    self.runner_up_action_score = runner_up_action_score
    self.dominance_margin = dominance_margin
    self.suppressed_secondary_count = suppressed_secondary_count
    self.full_text_ref = full_text_ref
  }
}

public enum ActionStripStateDetailModuleCode: String, Codable, Sendable {
  case eVIDENCETIDE = "EVIDENCE_TIDE"
  case pACKETFORGE = "PACKET_FORGE"
  case aUTHORITYTUNNEL = "AUTHORITY_TUNNEL"
  case dRIFTFIELD = "DRIFT_FIELD"
  case fOCUSLENS = "FOCUS_LENS"
  case tWINPANEL = "TWIN_PANEL"
}

public struct ActionStripStateAction: Codable, Sendable {
  public let action_code: String
  public let label: String
  public let action_kind: String
  public let target_object_ref: String?
  public let target_detail_surface_code: JSONValue
  public let requires_live_freshness: Bool
  public let mutation_precondition_binding_or_null: JSONValue

  public init(
    action_code: String,
    label: String,
    action_kind: String,
    target_object_ref: String?,
    target_detail_surface_code: JSONValue,
    requires_live_freshness: Bool,
    mutation_precondition_binding_or_null: JSONValue
  ) {
    self.action_code = action_code
    self.label = label
    self.action_kind = action_kind
    self.target_object_ref = target_object_ref
    self.target_detail_surface_code = target_detail_surface_code
    self.requires_live_freshness = requires_live_freshness
    self.mutation_precondition_binding_or_null = mutation_precondition_binding_or_null
  }
}

public enum ActionStripStateSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/action_strip_state.schema.json"
  public static let sourceHash = "c234d4ddcbc3cffd75eefe529dc0c734e3c7ebf9d67ff2a737dc7ba94d839559"
}

public struct ContextBarState: Codable, Sendable {
  public let artifact_type: JSONValue
  public let surface_code: JSONValue
  public let source_module_code: JSONValue
  public let manifest_label: String
  public let period_label: String
  public let scope_label: String
  public let phase_label: String
  public let freshness_state: String
  public let truth_origin: String
  public let connection_state: String
  public let owner_handoff_posture: String
  public let owner_label: String?
  public let mode_posture: String
  public let limitation_statement: String?
  public let full_text_ref: String

  public init(
    artifact_type: JSONValue,
    surface_code: JSONValue,
    source_module_code: JSONValue,
    manifest_label: String,
    period_label: String,
    scope_label: String,
    phase_label: String,
    freshness_state: String,
    truth_origin: String,
    connection_state: String,
    owner_handoff_posture: String,
    owner_label: String?,
    mode_posture: String,
    limitation_statement: String?,
    full_text_ref: String
  ) {
    self.artifact_type = artifact_type
    self.surface_code = surface_code
    self.source_module_code = source_module_code
    self.manifest_label = manifest_label
    self.period_label = period_label
    self.scope_label = scope_label
    self.phase_label = phase_label
    self.freshness_state = freshness_state
    self.truth_origin = truth_origin
    self.connection_state = connection_state
    self.owner_handoff_posture = owner_handoff_posture
    self.owner_label = owner_label
    self.mode_posture = mode_posture
    self.limitation_statement = limitation_statement
    self.full_text_ref = full_text_ref
  }
}

public enum ContextBarStateSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/context_bar_state.schema.json"
  public static let sourceHash = "d4d16da7d94a1046bb5b8686f9be4bdce4764cc6f6f5988439253342b1fa3588"
}

public struct CrossDeviceContinuityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let continuity_scope: String
  public let canonical_object_ref: String
  public let shell_family: String
  public let route_identity_ref: String
  public let parent_context_ref_or_null: String?
  public let focus_anchor_ref_or_null: String?
  public let return_focus_anchor_ref_or_null: String?
  public let dominant_action_state_or_null: JSONValue
  public let stability_guard_hash_or_null: String?
  public let access_scope_hash_or_null: String?
  public let masking_scope_fingerprint_or_null: String?
  public let session_scope_ref_or_null: String?
  public let visibility_cache_partition_key_or_null: String?
  public let allowed_embodiments: [String]
  public let same_object_policy: JSONValue
  public let same_shell_policy: JSONValue
  public let narrow_layout_policy: String
  public let deep_link_return_policy: JSONValue
  public let action_posture_policy: JSONValue
  public let hydration_compatibility_policy: JSONValue
  public let compatibility_basis_class: String
  public let restoration_mode_policy: JSONValue
  public let secondary_window_policy: String
  public let supported_invalidation_reason_codes: [String]

  public init(
    contract_version: JSONValue,
    continuity_scope: String,
    canonical_object_ref: String,
    shell_family: String,
    route_identity_ref: String,
    parent_context_ref_or_null: String?,
    focus_anchor_ref_or_null: String?,
    return_focus_anchor_ref_or_null: String?,
    dominant_action_state_or_null: JSONValue,
    stability_guard_hash_or_null: String?,
    access_scope_hash_or_null: String?,
    masking_scope_fingerprint_or_null: String?,
    session_scope_ref_or_null: String?,
    visibility_cache_partition_key_or_null: String?,
    allowed_embodiments: [String],
    same_object_policy: JSONValue,
    same_shell_policy: JSONValue,
    narrow_layout_policy: String,
    deep_link_return_policy: JSONValue,
    action_posture_policy: JSONValue,
    hydration_compatibility_policy: JSONValue,
    compatibility_basis_class: String,
    restoration_mode_policy: JSONValue,
    secondary_window_policy: String,
    supported_invalidation_reason_codes: [String]
  ) {
    self.contract_version = contract_version
    self.continuity_scope = continuity_scope
    self.canonical_object_ref = canonical_object_ref
    self.shell_family = shell_family
    self.route_identity_ref = route_identity_ref
    self.parent_context_ref_or_null = parent_context_ref_or_null
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.return_focus_anchor_ref_or_null = return_focus_anchor_ref_or_null
    self.dominant_action_state_or_null = dominant_action_state_or_null
    self.stability_guard_hash_or_null = stability_guard_hash_or_null
    self.access_scope_hash_or_null = access_scope_hash_or_null
    self.masking_scope_fingerprint_or_null = masking_scope_fingerprint_or_null
    self.session_scope_ref_or_null = session_scope_ref_or_null
    self.visibility_cache_partition_key_or_null = visibility_cache_partition_key_or_null
    self.allowed_embodiments = allowed_embodiments
    self.same_object_policy = same_object_policy
    self.same_shell_policy = same_shell_policy
    self.narrow_layout_policy = narrow_layout_policy
    self.deep_link_return_policy = deep_link_return_policy
    self.action_posture_policy = action_posture_policy
    self.hydration_compatibility_policy = hydration_compatibility_policy
    self.compatibility_basis_class = compatibility_basis_class
    self.restoration_mode_policy = restoration_mode_policy
    self.secondary_window_policy = secondary_window_policy
    self.supported_invalidation_reason_codes = supported_invalidation_reason_codes
  }
}

public enum CrossDeviceContinuityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json"
  public static let sourceHash = "62be8c89a0d472a84eb5b3fca1ba4603ed3aad667048382a337c40707973ce83"
}

public struct DecisionSummaryState: Codable, Sendable {
  public let artifact_type: JSONValue
  public let surface_code: JSONValue
  public let source_module_codes: [JSONValue]
  public let headline: String
  public let primary_issue_ref: String?
  public let attention_state: String
  public let visible_warning_count: Int
  public let visible_reasons: [DecisionSummaryStateVisibleReason]
  public let additional_reason_count: Int
  public let plain_explanation: String
  public let uncertainty_statement: String?
  public let limitation_state: String
  public let state_reason_code_or_null: JSONValue
  public let limitation_reason_codes: [String]
  public let limitation_statement: String?
  public let blocking_reason: String?
  public let machine_reason_codes: [String]
  public let full_text_ref: String

  public init(
    artifact_type: JSONValue,
    surface_code: JSONValue,
    source_module_codes: [JSONValue],
    headline: String,
    primary_issue_ref: String?,
    attention_state: String,
    visible_warning_count: Int,
    visible_reasons: [DecisionSummaryStateVisibleReason],
    additional_reason_count: Int,
    plain_explanation: String,
    uncertainty_statement: String?,
    limitation_state: String,
    state_reason_code_or_null: JSONValue,
    limitation_reason_codes: [String],
    limitation_statement: String?,
    blocking_reason: String?,
    machine_reason_codes: [String],
    full_text_ref: String
  ) {
    self.artifact_type = artifact_type
    self.surface_code = surface_code
    self.source_module_codes = source_module_codes
    self.headline = headline
    self.primary_issue_ref = primary_issue_ref
    self.attention_state = attention_state
    self.visible_warning_count = visible_warning_count
    self.visible_reasons = visible_reasons
    self.additional_reason_count = additional_reason_count
    self.plain_explanation = plain_explanation
    self.uncertainty_statement = uncertainty_statement
    self.limitation_state = limitation_state
    self.state_reason_code_or_null = state_reason_code_or_null
    self.limitation_reason_codes = limitation_reason_codes
    self.limitation_statement = limitation_statement
    self.blocking_reason = blocking_reason
    self.machine_reason_codes = machine_reason_codes
    self.full_text_ref = full_text_ref
  }
}

public struct DecisionSummaryStateVisibleReason: Codable, Sendable {
  public let reason_code: String
  public let label: String
  public let severity: String

  public init(
    reason_code: String,
    label: String,
    severity: String
  ) {
    self.reason_code = reason_code
    self.label = label
    self.severity = severity
  }
}

public enum DecisionSummaryStateSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/decision_summary_state.schema.json"
  public static let sourceHash = "0a38e778b730005dd065ea63a6a3bdf581bec00b88518b0611d9f43379d428de"
}

public struct DetailDrawerState: Codable, Sendable {
  public let artifact_type: JSONValue
  public let surface_code: JSONValue
  public let entry_points: [DetailDrawerStateDetailEntry]
  public let expanded_module_code: JSONValue
  public let expanded_content_state: String
  public let focus_anchor_ref: String?
  public let fallback_reason_code: String?
  public let compare_mode_explicit: Bool
  public let audit_mode_explicit: Bool
  public let full_text_ref: String

  public init(
    artifact_type: JSONValue,
    surface_code: JSONValue,
    entry_points: [DetailDrawerStateDetailEntry],
    expanded_module_code: JSONValue,
    expanded_content_state: String,
    focus_anchor_ref: String?,
    fallback_reason_code: String?,
    compare_mode_explicit: Bool,
    audit_mode_explicit: Bool,
    full_text_ref: String
  ) {
    self.artifact_type = artifact_type
    self.surface_code = surface_code
    self.entry_points = entry_points
    self.expanded_module_code = expanded_module_code
    self.expanded_content_state = expanded_content_state
    self.focus_anchor_ref = focus_anchor_ref
    self.fallback_reason_code = fallback_reason_code
    self.compare_mode_explicit = compare_mode_explicit
    self.audit_mode_explicit = audit_mode_explicit
    self.full_text_ref = full_text_ref
  }
}

public enum DetailDrawerStateDetailModuleCode: String, Codable, Sendable {
  case eVIDENCETIDE = "EVIDENCE_TIDE"
  case pACKETFORGE = "PACKET_FORGE"
  case aUTHORITYTUNNEL = "AUTHORITY_TUNNEL"
  case dRIFTFIELD = "DRIFT_FIELD"
  case fOCUSLENS = "FOCUS_LENS"
  case tWINPANEL = "TWIN_PANEL"
}

public struct DetailDrawerStateDetailEntry: Codable, Sendable {
  public let module_code: DetailDrawerStateDetailModuleCode
  public let entry_label: String
  public let semantic_view_kind: String
  public let plain_language_summary: String
  public let entry_reason: String?
  public let content_state: String
  public let state_reason_code_or_null: JSONValue
  public let limitation_reason_codes: [String]
  public let anchorable_object_refs: [String]

  public init(
    module_code: DetailDrawerStateDetailModuleCode,
    entry_label: String,
    semantic_view_kind: String,
    plain_language_summary: String,
    entry_reason: String?,
    content_state: String,
    state_reason_code_or_null: JSONValue,
    limitation_reason_codes: [String],
    anchorable_object_refs: [String]
  ) {
    self.module_code = module_code
    self.entry_label = entry_label
    self.semantic_view_kind = semantic_view_kind
    self.plain_language_summary = plain_language_summary
    self.entry_reason = entry_reason
    self.content_state = content_state
    self.state_reason_code_or_null = state_reason_code_or_null
    self.limitation_reason_codes = limitation_reason_codes
    self.anchorable_object_refs = anchorable_object_refs
  }
}

public enum DetailDrawerStateSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/detail_drawer_state.schema.json"
  public static let sourceHash = "73dfa5a384deca11fc8f136b73ddad3e76ed10bbc9504dce8e2b946608d2d940"
}

public struct ExperienceCursor: Codable, Sendable {
  public let artifact_type: JSONValue
  public let cursor_scope_class: JSONValue
  public let cursor_id: String
  public let tenant_id: String
  public let principal_ref: String
  public let principal_class: String
  public let manifest_id: String
  public let shell_route_key: String
  public let shell_stability_token: String
  public let session_ref: String
  public let session_binding_hash: String
  public let access_binding_hash: String
  public let frame_epoch: Int
  public let last_ack_sequence: Int
  public let last_published_sequence: Int
  public let latest_snapshot_ref: String
  public let resume_token_hash: String
  public let stream_recovery_contract: JSONValue
  public let native_cache_hydration_contract: NativeCacheHydrationContract
  public let truth_boundary_contract: JSONValue
  public let stability_contract: RouteStabilityContract
  public let replacement_stability_contract_or_null: JSONValue
  public let cursor_state: String
  public let masking_posture_hash: String
  public let schema_compatibility_ref: String
  public let replacement_snapshot_ref: String?
  public let invalidation_reason_code: JSONValue
  public let invalidated_at: ISO8601DateTimeString
  public let last_seen_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    cursor_scope_class: JSONValue,
    cursor_id: String,
    tenant_id: String,
    principal_ref: String,
    principal_class: String,
    manifest_id: String,
    shell_route_key: String,
    shell_stability_token: String,
    session_ref: String,
    session_binding_hash: String,
    access_binding_hash: String,
    frame_epoch: Int,
    last_ack_sequence: Int,
    last_published_sequence: Int,
    latest_snapshot_ref: String,
    resume_token_hash: String,
    stream_recovery_contract: JSONValue,
    native_cache_hydration_contract: NativeCacheHydrationContract,
    truth_boundary_contract: JSONValue,
    stability_contract: RouteStabilityContract,
    replacement_stability_contract_or_null: JSONValue,
    cursor_state: String,
    masking_posture_hash: String,
    schema_compatibility_ref: String,
    replacement_snapshot_ref: String?,
    invalidation_reason_code: JSONValue,
    invalidated_at: ISO8601DateTimeString,
    last_seen_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.cursor_scope_class = cursor_scope_class
    self.cursor_id = cursor_id
    self.tenant_id = tenant_id
    self.principal_ref = principal_ref
    self.principal_class = principal_class
    self.manifest_id = manifest_id
    self.shell_route_key = shell_route_key
    self.shell_stability_token = shell_stability_token
    self.session_ref = session_ref
    self.session_binding_hash = session_binding_hash
    self.access_binding_hash = access_binding_hash
    self.frame_epoch = frame_epoch
    self.last_ack_sequence = last_ack_sequence
    self.last_published_sequence = last_published_sequence
    self.latest_snapshot_ref = latest_snapshot_ref
    self.resume_token_hash = resume_token_hash
    self.stream_recovery_contract = stream_recovery_contract
    self.native_cache_hydration_contract = native_cache_hydration_contract
    self.truth_boundary_contract = truth_boundary_contract
    self.stability_contract = stability_contract
    self.replacement_stability_contract_or_null = replacement_stability_contract_or_null
    self.cursor_state = cursor_state
    self.masking_posture_hash = masking_posture_hash
    self.schema_compatibility_ref = schema_compatibility_ref
    self.replacement_snapshot_ref = replacement_snapshot_ref
    self.invalidation_reason_code = invalidation_reason_code
    self.invalidated_at = invalidated_at
    self.last_seen_at = last_seen_at
    self.expires_at = expires_at
  }
}

public enum ExperienceCursorSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/experience_cursor.schema.json"
  public static let sourceHash = "60057dfc5655cd1617426dacc34a92af2c5697b24a1ef6f3ab302d6ef92ceb22"
}

public struct ExperienceDelta: Codable, Sendable {
  public let manifest_id: String
  public let experience_sequence: Int
  public let frame_epoch: Int
  public let delivery_class: String
  public let shell_route_key: String
  public let posture_state: String
  public let semantic_motion: String
  public let cause_ref: String
  public let connection_state: JSONValue?
  public let activity_state: JSONValue?
  public let truth_state: JSONValue?
  public let checkpoint_state: JSONValue?
  public let truth_origin: JSONValue?
  public let truth_boundary_contract: JSONValue
  public let experience_profile: String
  public let attention_state: JSONValue?
  public let primary_object_ref: String?
  public let actionability_state: String
  public let primary_action_code: String?
  public let no_safe_action_reason_code: String?
  public let secondary_notice_count: Int?
  public let detail_entry_points: [ExperienceDeltaDetailModuleCode]?
  public let suggested_detail_surface_code: JSONValue?
  public let attention_policy: ExperienceDeltaAttentionPolicy
  public let cognitive_budget: ExperienceDeltaCognitiveBudget
  public let active_detail_surface_code: JSONValue?
  public let focus_anchor_ref: String?
  public let shell_stability_token: String?
  public let next_checkpoint_at: ISO8601DateTimeString?
  public let checkpoint_reason: String?
  public let plain_reason: String?
  public let blocked_action_codes: [String]?
  public let affected_object_refs: [String]
  public let affected_surface_codes: [ExperienceDeltaLowNoiseSurfaceCode]
  public let occurred_at: ISO8601DateTimeString
  public let surface_updates: [ExperienceDeltaSurfaceUpdate]
  public let resume_token: String?
  public let is_terminal: Bool?

  public init(
    manifest_id: String,
    experience_sequence: Int,
    frame_epoch: Int,
    delivery_class: String,
    shell_route_key: String,
    posture_state: String,
    semantic_motion: String,
    cause_ref: String,
    connection_state: JSONValue? = nil,
    activity_state: JSONValue? = nil,
    truth_state: JSONValue? = nil,
    checkpoint_state: JSONValue? = nil,
    truth_origin: JSONValue? = nil,
    truth_boundary_contract: JSONValue,
    experience_profile: String,
    attention_state: JSONValue? = nil,
    primary_object_ref: String? = nil,
    actionability_state: String,
    primary_action_code: String? = nil,
    no_safe_action_reason_code: String? = nil,
    secondary_notice_count: Int? = nil,
    detail_entry_points: [ExperienceDeltaDetailModuleCode]? = nil,
    suggested_detail_surface_code: JSONValue? = nil,
    attention_policy: ExperienceDeltaAttentionPolicy,
    cognitive_budget: ExperienceDeltaCognitiveBudget,
    active_detail_surface_code: JSONValue? = nil,
    focus_anchor_ref: String?,
    shell_stability_token: String?,
    next_checkpoint_at: ISO8601DateTimeString? = nil,
    checkpoint_reason: String? = nil,
    plain_reason: String? = nil,
    blocked_action_codes: [String]? = nil,
    affected_object_refs: [String],
    affected_surface_codes: [ExperienceDeltaLowNoiseSurfaceCode],
    occurred_at: ISO8601DateTimeString,
    surface_updates: [ExperienceDeltaSurfaceUpdate],
    resume_token: String? = nil,
    is_terminal: Bool? = nil
  ) {
    self.manifest_id = manifest_id
    self.experience_sequence = experience_sequence
    self.frame_epoch = frame_epoch
    self.delivery_class = delivery_class
    self.shell_route_key = shell_route_key
    self.posture_state = posture_state
    self.semantic_motion = semantic_motion
    self.cause_ref = cause_ref
    self.connection_state = connection_state
    self.activity_state = activity_state
    self.truth_state = truth_state
    self.checkpoint_state = checkpoint_state
    self.truth_origin = truth_origin
    self.truth_boundary_contract = truth_boundary_contract
    self.experience_profile = experience_profile
    self.attention_state = attention_state
    self.primary_object_ref = primary_object_ref
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.secondary_notice_count = secondary_notice_count
    self.detail_entry_points = detail_entry_points
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.attention_policy = attention_policy
    self.cognitive_budget = cognitive_budget
    self.active_detail_surface_code = active_detail_surface_code
    self.focus_anchor_ref = focus_anchor_ref
    self.shell_stability_token = shell_stability_token
    self.next_checkpoint_at = next_checkpoint_at
    self.checkpoint_reason = checkpoint_reason
    self.plain_reason = plain_reason
    self.blocked_action_codes = blocked_action_codes
    self.affected_object_refs = affected_object_refs
    self.affected_surface_codes = affected_surface_codes
    self.occurred_at = occurred_at
    self.surface_updates = surface_updates
    self.resume_token = resume_token
    self.is_terminal = is_terminal
  }
}

public enum ExperienceDeltaSurfaceCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
  case sCOPECOMPOSER = "SCOPE_COMPOSER"
  case pULSESPINE = "PULSE_SPINE"
  case mANIFESTRIBBON = "MANIFEST_RIBBON"
  case hANDOFFBATON = "HANDOFF_BATON"
  case dECISIONSTAGE = "DECISION_STAGE"
  case cONSEQUENCERAIL = "CONSEQUENCE_RAIL"
  case dECISIONCONSTELLATION = "DECISION_CONSTELLATION"
  case gATELATTICE = "GATE_LATTICE"
  case tRUSTPRISM = "TRUST_PRISM"
  case wORKFLOWCHOREOGRAPHER = "WORKFLOW_CHOREOGRAPHER"
  case eVIDENCETIDE = "EVIDENCE_TIDE"
  case pACKETFORGE = "PACKET_FORGE"
  case aUTHORITYTUNNEL = "AUTHORITY_TUNNEL"
  case dRIFTFIELD = "DRIFT_FIELD"
  case fOCUSLENS = "FOCUS_LENS"
  case tWINPANEL = "TWIN_PANEL"
}

public enum ExperienceDeltaLowNoiseSurfaceCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
}

public enum ExperienceDeltaDetailModuleCode: String, Codable, Sendable {
  case eVIDENCETIDE = "EVIDENCE_TIDE"
  case pACKETFORGE = "PACKET_FORGE"
  case aUTHORITYTUNNEL = "AUTHORITY_TUNNEL"
  case dRIFTFIELD = "DRIFT_FIELD"
  case fOCUSLENS = "FOCUS_LENS"
  case tWINPANEL = "TWIN_PANEL"
}

public struct ExperienceDeltaAttentionPolicy: Codable, Sendable {
  public let policy_version: String
  public let attention_state: String
  public let primary_surface_code: ExperienceDeltaLowNoiseSurfaceCode
  public let primary_object_ref: String?
  public let actionability_state: String
  public let primary_action_code: String?
  public let no_safe_action_reason_code: String?
  public let secondary_notice_count: Int
  public let detail_entry_points: [ExperienceDeltaDetailModuleCode]
  public let ranking_basis: [String]
  public let suggested_detail_surface_code: JSONValue
  public let primary_rank_score: Int
  public let runner_up_rank_score: Int
  public let dominance_margin: Int
  public let default_detail_module_code: JSONValue
  public let visible_warning_count: Int

  public init(
    policy_version: String,
    attention_state: String,
    primary_surface_code: ExperienceDeltaLowNoiseSurfaceCode,
    primary_object_ref: String?,
    actionability_state: String,
    primary_action_code: String?,
    no_safe_action_reason_code: String?,
    secondary_notice_count: Int,
    detail_entry_points: [ExperienceDeltaDetailModuleCode],
    ranking_basis: [String],
    suggested_detail_surface_code: JSONValue,
    primary_rank_score: Int,
    runner_up_rank_score: Int,
    dominance_margin: Int,
    default_detail_module_code: JSONValue,
    visible_warning_count: Int
  ) {
    self.policy_version = policy_version
    self.attention_state = attention_state
    self.primary_surface_code = primary_surface_code
    self.primary_object_ref = primary_object_ref
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.secondary_notice_count = secondary_notice_count
    self.detail_entry_points = detail_entry_points
    self.ranking_basis = ranking_basis
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.primary_rank_score = primary_rank_score
    self.runner_up_rank_score = runner_up_rank_score
    self.dominance_margin = dominance_margin
    self.default_detail_module_code = default_detail_module_code
    self.visible_warning_count = visible_warning_count
  }
}

public struct ExperienceDeltaCognitiveBudget: Codable, Sendable {
  public let persistent_surface_limit: Int
  public let concurrent_primary_limit: Int
  public let primary_reason_limit: Int
  public let secondary_action_limit: Int
  public let visible_warning_limit: Int
  public let detail_entry_point_limit: Int
  public let expanded_detail_module_limit: Int
  public let visibility_budget_units: Int
  public let prominent_motion_limit: Int
  public let issue_dominance_min_margin: Int
  public let action_dominance_min_margin: Int
  public let primary_rank_hysteresis: Int
  public let non_material_rank_swap_limit: Int
  public let non_material_continuity_cost_limit: Int
  public let refresh_coalescing_window_ms: Int
  public let refresh_burst_visible_change_limit: Int

  public init(
    persistent_surface_limit: Int,
    concurrent_primary_limit: Int,
    primary_reason_limit: Int,
    secondary_action_limit: Int,
    visible_warning_limit: Int,
    detail_entry_point_limit: Int,
    expanded_detail_module_limit: Int,
    visibility_budget_units: Int,
    prominent_motion_limit: Int,
    issue_dominance_min_margin: Int,
    action_dominance_min_margin: Int,
    primary_rank_hysteresis: Int,
    non_material_rank_swap_limit: Int,
    non_material_continuity_cost_limit: Int,
    refresh_coalescing_window_ms: Int,
    refresh_burst_visible_change_limit: Int
  ) {
    self.persistent_surface_limit = persistent_surface_limit
    self.concurrent_primary_limit = concurrent_primary_limit
    self.primary_reason_limit = primary_reason_limit
    self.secondary_action_limit = secondary_action_limit
    self.visible_warning_limit = visible_warning_limit
    self.detail_entry_point_limit = detail_entry_point_limit
    self.expanded_detail_module_limit = expanded_detail_module_limit
    self.visibility_budget_units = visibility_budget_units
    self.prominent_motion_limit = prominent_motion_limit
    self.issue_dominance_min_margin = issue_dominance_min_margin
    self.action_dominance_min_margin = action_dominance_min_margin
    self.primary_rank_hysteresis = primary_rank_hysteresis
    self.non_material_rank_swap_limit = non_material_rank_swap_limit
    self.non_material_continuity_cost_limit = non_material_continuity_cost_limit
    self.refresh_coalescing_window_ms = refresh_coalescing_window_ms
    self.refresh_burst_visible_change_limit = refresh_burst_visible_change_limit
  }
}

public enum ExperienceDeltaEmptyStateKind: String, Codable, Sendable {
  case nONE = "NONE"
  case nOTREQUESTED = "NOT_REQUESTED"
  case nOTYETMATERIALIZED = "NOT_YET_MATERIALIZED"
  case lIMITED = "LIMITED"
  case nOTAPPLICABLE = "NOT_APPLICABLE"
}

public struct ExperienceDeltaReasonItem: Codable, Sendable {
  public let reason_code: String
  public let label: String

  public init(
    reason_code: String,
    label: String
  ) {
    self.reason_code = reason_code
    self.label = label
  }
}

public struct ExperienceDeltaContextBarPayload: Codable, Sendable {
  public let manifest_label: String
  public let period_label: String
  public let scope_label: String
  public let phase_label: String
  public let freshness_label: String
  public let truth_origin_label: String
  public let connection_label: String
  public let owner_label: String?
  public let mode_label: String?
  public let limitation_label: String?

  public init(
    manifest_label: String,
    period_label: String,
    scope_label: String,
    phase_label: String,
    freshness_label: String,
    truth_origin_label: String,
    connection_label: String,
    owner_label: String? = nil,
    mode_label: String? = nil,
    limitation_label: String? = nil
  ) {
    self.manifest_label = manifest_label
    self.period_label = period_label
    self.scope_label = scope_label
    self.phase_label = phase_label
    self.freshness_label = freshness_label
    self.truth_origin_label = truth_origin_label
    self.connection_label = connection_label
    self.owner_label = owner_label
    self.mode_label = mode_label
    self.limitation_label = limitation_label
  }
}

public struct ExperienceDeltaDecisionSummaryPayload: Codable, Sendable {
  public let headline: String
  public let primary_issue_state: String
  public let reason_items: [ExperienceDeltaReasonItem]
  public let additional_reason_count: Int
  public let uncertainty_statement: String?
  public let plain_explanation: String
  public let empty_state_kind: ExperienceDeltaEmptyStateKind

  public init(
    headline: String,
    primary_issue_state: String,
    reason_items: [ExperienceDeltaReasonItem],
    additional_reason_count: Int,
    uncertainty_statement: String?,
    plain_explanation: String,
    empty_state_kind: ExperienceDeltaEmptyStateKind
  ) {
    self.headline = headline
    self.primary_issue_state = primary_issue_state
    self.reason_items = reason_items
    self.additional_reason_count = additional_reason_count
    self.uncertainty_statement = uncertainty_statement
    self.plain_explanation = plain_explanation
    self.empty_state_kind = empty_state_kind
  }
}

public struct ExperienceDeltaActionToken: Codable, Sendable {
  public let action_code: String
  public let label: String
  public let ownership_label: String?

  public init(
    action_code: String,
    label: String,
    ownership_label: String? = nil
  ) {
    self.action_code = action_code
    self.label = label
    self.ownership_label = ownership_label
  }
}

public struct ExperienceDeltaActionStripPayload: Codable, Sendable {
  public let action_state: String
  public let primary_action: JSONValue
  public let secondary_actions: [ExperienceDeltaActionToken]
  public let ownership_label: String?
  public let waiting_on_label: String?
  public let blocking_reason: String?
  public let investigation_entry_point: JSONValue

  public init(
    action_state: String,
    primary_action: JSONValue,
    secondary_actions: [ExperienceDeltaActionToken],
    ownership_label: String?,
    waiting_on_label: String?,
    blocking_reason: String?,
    investigation_entry_point: JSONValue
  ) {
    self.action_state = action_state
    self.primary_action = primary_action
    self.secondary_actions = secondary_actions
    self.ownership_label = ownership_label
    self.waiting_on_label = waiting_on_label
    self.blocking_reason = blocking_reason
    self.investigation_entry_point = investigation_entry_point
  }
}

public struct ExperienceDeltaDetailModule: Codable, Sendable {
  public let module_code: ExperienceDeltaDetailModuleCode
  public let entry_label: String
  public let entry_reason: String
  public let module_state: String
  public let available_action_codes: [String]?

  public init(
    module_code: ExperienceDeltaDetailModuleCode,
    entry_label: String,
    entry_reason: String,
    module_state: String,
    available_action_codes: [String]? = nil
  ) {
    self.module_code = module_code
    self.entry_label = entry_label
    self.entry_reason = entry_reason
    self.module_state = module_state
    self.available_action_codes = available_action_codes
  }
}

public struct ExperienceDeltaDetailDrawerPayload: Codable, Sendable {
  public let modules: [ExperienceDeltaDetailModule]
  public let expanded_module_code: JSONValue
  public let empty_state_kind: ExperienceDeltaEmptyStateKind
  public let compare_mode: Bool
  public let audit_mode: Bool
  public let focus_anchor_ref: String?

  public init(
    modules: [ExperienceDeltaDetailModule],
    expanded_module_code: JSONValue,
    empty_state_kind: ExperienceDeltaEmptyStateKind,
    compare_mode: Bool,
    audit_mode: Bool,
    focus_anchor_ref: String?
  ) {
    self.modules = modules
    self.expanded_module_code = expanded_module_code
    self.empty_state_kind = empty_state_kind
    self.compare_mode = compare_mode
    self.audit_mode = audit_mode
    self.focus_anchor_ref = focus_anchor_ref
  }
}

public struct ExperienceDeltaSurfaceUpdate: Codable, Sendable {
  public let surface_code: ExperienceDeltaLowNoiseSurfaceCode
  public let surface_version: Int
  public let patch_kind: String
  public let surface_lifecycle_state: String
  public let plain_reason: String?
  public let available_action_codes: [String]?
  public let blocked_action_codes: [String]?
  public let affected_object_refs: [String]?
  public let last_material_change_at: ISO8601DateTimeString?
  public let freshness_age: Int?
  public let limited_by: [String]?
  public let default_visibility: String?
  public let attention_tier: String?
  public let summary_rank: Int?
  public let payload: [String: JSONValue]

  public init(
    surface_code: ExperienceDeltaLowNoiseSurfaceCode,
    surface_version: Int,
    patch_kind: String,
    surface_lifecycle_state: String,
    plain_reason: String? = nil,
    available_action_codes: [String]? = nil,
    blocked_action_codes: [String]? = nil,
    affected_object_refs: [String]? = nil,
    last_material_change_at: ISO8601DateTimeString? = nil,
    freshness_age: Int? = nil,
    limited_by: [String]? = nil,
    default_visibility: String? = nil,
    attention_tier: String? = nil,
    summary_rank: Int? = nil,
    payload: [String: JSONValue]
  ) {
    self.surface_code = surface_code
    self.surface_version = surface_version
    self.patch_kind = patch_kind
    self.surface_lifecycle_state = surface_lifecycle_state
    self.plain_reason = plain_reason
    self.available_action_codes = available_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.affected_object_refs = affected_object_refs
    self.last_material_change_at = last_material_change_at
    self.freshness_age = freshness_age
    self.limited_by = limited_by
    self.default_visibility = default_visibility
    self.attention_tier = attention_tier
    self.summary_rank = summary_rank
    self.payload = payload
  }
}

public struct ExperienceDeltaExperienceFrame: Codable, Sendable {
  public let manifest_id: String
  public let frame_epoch: Int
  public let shell_route_key: String
  public let experience_profile: String
  public let attention_state: String
  public let primary_object_ref: String?
  public let actionability_state: String
  public let primary_action_code: String?
  public let no_safe_action_reason_code: String?
  public let detail_entry_points: [ExperienceDeltaDetailModuleCode]
  public let suggested_detail_surface_code: JSONValue?
  public let attention_policy: ExperienceDeltaAttentionPolicy
  public let cognitive_budget: ExperienceDeltaCognitiveBudget
  public let active_detail_surface_code: JSONValue?
  public let focus_anchor_ref: String?
  public let shell_stability_token: String?
  public let surface_order: [JSONValue]
  public let surfaces: [String: JSONValue]

  public init(
    manifest_id: String,
    frame_epoch: Int,
    shell_route_key: String,
    experience_profile: String,
    attention_state: String,
    primary_object_ref: String? = nil,
    actionability_state: String,
    primary_action_code: String? = nil,
    no_safe_action_reason_code: String? = nil,
    detail_entry_points: [ExperienceDeltaDetailModuleCode],
    suggested_detail_surface_code: JSONValue? = nil,
    attention_policy: ExperienceDeltaAttentionPolicy,
    cognitive_budget: ExperienceDeltaCognitiveBudget,
    active_detail_surface_code: JSONValue? = nil,
    focus_anchor_ref: String?,
    shell_stability_token: String?,
    surface_order: [JSONValue],
    surfaces: [String: JSONValue]
  ) {
    self.manifest_id = manifest_id
    self.frame_epoch = frame_epoch
    self.shell_route_key = shell_route_key
    self.experience_profile = experience_profile
    self.attention_state = attention_state
    self.primary_object_ref = primary_object_ref
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.detail_entry_points = detail_entry_points
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.attention_policy = attention_policy
    self.cognitive_budget = cognitive_budget
    self.active_detail_surface_code = active_detail_surface_code
    self.focus_anchor_ref = focus_anchor_ref
    self.shell_stability_token = shell_stability_token
    self.surface_order = surface_order
    self.surfaces = surfaces
  }
}

public enum ExperienceDeltaSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/experience_delta.schema.json"
  public static let sourceHash = "ef74b4f037aa98d644513856236ba44c1c6518ee738edbfd87b71c1b41a068ec"
}

public struct ExperienceStreamEvent: Codable, Sendable {
  public let artifact_type: JSONValue
  public let stream_scope_class: JSONValue
  public let manifest_id: String
  public let shell_route_key: String
  public let experience_sequence: Int
  public let frame_epoch: Int
  public let shell_stability_token: String
  public let resume_token: String
  public let stream_recovery_contract: JSONValue
  public let stability_contract: RouteStabilityContract
  public let event_type: String
  public let snapshot_ref: String?
  public let delta_ref: String?
  public let terminal_bundle_ref: String?
  public let occurred_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    stream_scope_class: JSONValue,
    manifest_id: String,
    shell_route_key: String,
    experience_sequence: Int,
    frame_epoch: Int,
    shell_stability_token: String,
    resume_token: String,
    stream_recovery_contract: JSONValue,
    stability_contract: RouteStabilityContract,
    event_type: String,
    snapshot_ref: String?,
    delta_ref: String?,
    terminal_bundle_ref: String?,
    occurred_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.stream_scope_class = stream_scope_class
    self.manifest_id = manifest_id
    self.shell_route_key = shell_route_key
    self.experience_sequence = experience_sequence
    self.frame_epoch = frame_epoch
    self.shell_stability_token = shell_stability_token
    self.resume_token = resume_token
    self.stream_recovery_contract = stream_recovery_contract
    self.stability_contract = stability_contract
    self.event_type = event_type
    self.snapshot_ref = snapshot_ref
    self.delta_ref = delta_ref
    self.terminal_bundle_ref = terminal_bundle_ref
    self.occurred_at = occurred_at
  }
}

public enum ExperienceStreamEventSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/experience_stream_event.schema.json"
  public static let sourceHash = "21494b4d725acca39deb7b31108f1bf0b779cbb4ebf735f756b7913760f3ba0b"
}

public struct FocusRestorationContract: Codable, Sendable {
  public let requested_focus_anchor_ref_or_null: String?
  public let resolved_focus_anchor_ref_or_null: String?
  public let restoration_disposition: String
  public let restoration_reason_code_or_null: String?

  public init(
    requested_focus_anchor_ref_or_null: String?,
    resolved_focus_anchor_ref_or_null: String?,
    restoration_disposition: String,
    restoration_reason_code_or_null: String?
  ) {
    self.requested_focus_anchor_ref_or_null = requested_focus_anchor_ref_or_null
    self.resolved_focus_anchor_ref_or_null = resolved_focus_anchor_ref_or_null
    self.restoration_disposition = restoration_disposition
    self.restoration_reason_code_or_null = restoration_reason_code_or_null
  }
}

public enum FocusRestorationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/focus_restoration_contract.schema.json"
  public static let sourceHash = "d6de8729efa37d6b4154c7adb4ec6a93423919ee6557b5d09a26fdf16eaab7ef"
}

public struct FocusRestoreReturnTargetHarness: Codable, Sendable {
  public let contract_version: JSONValue
  public let harness_id: String
  public let deterministic_seed: Int
  public let suite_profile: JSONValue
  public let run_mode: JSONValue
  public let modality_policy: JSONValue
  public let identifier_policy: JSONValue
  public let return_target_policy: JSONValue
  public let fallback_order_policy: JSONValue
  public let live_update_focus_policy: JSONValue
  public let help_handoff_policy: JSONValue
  public let cases: [FocusRestoreReturnTargetHarnessHarnessCase]

  public init(
    contract_version: JSONValue,
    harness_id: String,
    deterministic_seed: Int,
    suite_profile: JSONValue,
    run_mode: JSONValue,
    modality_policy: JSONValue,
    identifier_policy: JSONValue,
    return_target_policy: JSONValue,
    fallback_order_policy: JSONValue,
    live_update_focus_policy: JSONValue,
    help_handoff_policy: JSONValue,
    cases: [FocusRestoreReturnTargetHarnessHarnessCase]
  ) {
    self.contract_version = contract_version
    self.harness_id = harness_id
    self.deterministic_seed = deterministic_seed
    self.suite_profile = suite_profile
    self.run_mode = run_mode
    self.modality_policy = modality_policy
    self.identifier_policy = identifier_policy
    self.return_target_policy = return_target_policy
    self.fallback_order_policy = fallback_order_policy
    self.live_update_focus_policy = live_update_focus_policy
    self.help_handoff_policy = help_handoff_policy
    self.cases = cases
  }
}

public enum FocusRestoreReturnTargetHarnessSurfaceType: String, Codable, Sendable {
  case lowNoiseExperienceFrame = "LowNoiseExperienceFrame"
  case workspaceSnapshot = "WorkspaceSnapshot"
  case clientPortalWorkspace = "ClientPortalWorkspace"
  case tenantGovernanceSnapshot = "TenantGovernanceSnapshot"
  case nativeOperatorSecondaryWindowScene = "NativeOperatorSecondaryWindowScene"
}

public enum FocusRestoreReturnTargetHarnessFocusScope: String, Codable, Sendable {
  case mANIFESTSUPPORTREGION = "MANIFEST_SUPPORT_REGION"
  case wORKSPACEDETAILROUTE = "WORKSPACE_DETAIL_ROUTE"
  case cLIENTPORTALCONTEXTUALROUTE = "CLIENT_PORTAL_CONTEXTUAL_ROUTE"
  case gOVERNANCESUPPORTROUTE = "GOVERNANCE_SUPPORT_ROUTE"
  case nATIVESECONDARYWINDOW = "NATIVE_SECONDARY_WINDOW"
}

public enum FocusRestoreReturnTargetHarnessTriggerAction: String, Codable, Sendable {
  case cLOSESUPPORTREGION = "CLOSE_SUPPORT_REGION"
  case bACKNAVIGATION = "BACK_NAVIGATION"
  case hELPHANDOFFRETURN = "HELP_HANDOFF_RETURN"
  case sTALEREBASERECOVERY = "STALE_REBASE_RECOVERY"
  case lIVEUPDATEDURINGACTIVEINPUT = "LIVE_UPDATE_DURING_ACTIVE_INPUT"
  case rESPONSIVERESTACK = "RESPONSIVE_RESTACK"
  case sECONDARYWINDOWCLOSE = "SECONDARY_WINDOW_CLOSE"
}

public enum FocusRestoreReturnTargetHarnessModality: String, Codable, Sendable {
  case kEYBOARDONLY = "KEYBOARD_ONLY"
  case pOINTERBASELINE = "POINTER_BASELINE"
  case aSSISTIVETECH = "ASSISTIVE_TECH"
}

public enum FocusRestoreReturnTargetHarnessObjectLossState: String, Codable, Sendable {
  case eXACTTARGETVISIBLE = "EXACT_TARGET_VISIBLE"
  case eXACTTARGETSTALESAMEOBJECTLAWFUL = "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL"
  case oBJECTSTALEPARENTLAWFUL = "OBJECT_STALE_PARENT_LAWFUL"
  case pARENTSTALENARROWLISTLAWFUL = "PARENT_STALE_NARROW_LIST_LAWFUL"
}

public enum FocusRestoreReturnTargetHarnessSupportSurfaceKind: String, Codable, Sendable {
  case tRAILINGINSPECTOR = "TRAILING_INSPECTOR"
  case dETAILDRAWER = "DETAIL_DRAWER"
  case cONTEXTUALDETAIL = "CONTEXTUAL_DETAIL"
  case hELPROUTE = "HELP_ROUTE"
  case sECONDARYCOMPAREWINDOW = "SECONDARY_COMPARE_WINDOW"
}

public enum FocusRestoreReturnTargetHarnessActiveFocusLockKind: String, Codable, Sendable {
  case cOMPOSER = "COMPOSER"
  case pICKER = "PICKER"
  case cOMPARECONTROL = "COMPARE_CONTROL"
}

public enum FocusRestoreReturnTargetHarnessExpectedTargetKind: String, Codable, Sendable {
  case iNVOKER = "INVOKER"
  case oBJECTSUMMARY = "OBJECT_SUMMARY"
  case pARENTRETURN = "PARENT_RETURN"
  case nARROWESTSURVIVINGLIST = "NARROWEST_SURVIVING_LIST"
}

public enum FocusRestoreReturnTargetHarnessRestorationDisposition: String, Codable, Sendable {
  case eXACTFOCUS = "EXACT_FOCUS"
  case rEMAPPEDFOCUS = "REMAPPED_FOCUS"
  case oBJECTSUMMARY = "OBJECT_SUMMARY"
  case pARENTRETURN = "PARENT_RETURN"
  case iNVALIDATED = "INVALIDATED"
}

public struct FocusRestoreReturnTargetHarnessStateSnapshot: Codable, Sendable {
  public let route_or_scene_ref: String
  public let canonical_object_ref_or_null: String?
  public let active_focus_anchor_ref_or_null: String?
  public let return_route_or_scene_ref_or_null: String?
  public let return_focus_anchor_ref_or_null: String?
  public let fallback_route_or_scene_ref_or_null: String?
  public let fallback_focus_anchor_ref_or_null: String?
  public let focus_restoration_disposition_or_null: String?
  public let focus_restoration_reason_code_or_null: String?
  public let browser_active_identifier_or_null: String?
  public let browser_return_identifier_or_null: String?
  public let native_active_identifier_or_null: String?
  public let native_return_identifier_or_null: String?
  public let active_focus_lock_ref_or_null: String?

  public init(
    route_or_scene_ref: String,
    canonical_object_ref_or_null: String?,
    active_focus_anchor_ref_or_null: String?,
    return_route_or_scene_ref_or_null: String?,
    return_focus_anchor_ref_or_null: String?,
    fallback_route_or_scene_ref_or_null: String?,
    fallback_focus_anchor_ref_or_null: String?,
    focus_restoration_disposition_or_null: String?,
    focus_restoration_reason_code_or_null: String?,
    browser_active_identifier_or_null: String?,
    browser_return_identifier_or_null: String?,
    native_active_identifier_or_null: String?,
    native_return_identifier_or_null: String?,
    active_focus_lock_ref_or_null: String?
  ) {
    self.route_or_scene_ref = route_or_scene_ref
    self.canonical_object_ref_or_null = canonical_object_ref_or_null
    self.active_focus_anchor_ref_or_null = active_focus_anchor_ref_or_null
    self.return_route_or_scene_ref_or_null = return_route_or_scene_ref_or_null
    self.return_focus_anchor_ref_or_null = return_focus_anchor_ref_or_null
    self.fallback_route_or_scene_ref_or_null = fallback_route_or_scene_ref_or_null
    self.fallback_focus_anchor_ref_or_null = fallback_focus_anchor_ref_or_null
    self.focus_restoration_disposition_or_null = focus_restoration_disposition_or_null
    self.focus_restoration_reason_code_or_null = focus_restoration_reason_code_or_null
    self.browser_active_identifier_or_null = browser_active_identifier_or_null
    self.browser_return_identifier_or_null = browser_return_identifier_or_null
    self.native_active_identifier_or_null = native_active_identifier_or_null
    self.native_return_identifier_or_null = native_return_identifier_or_null
    self.active_focus_lock_ref_or_null = active_focus_lock_ref_or_null
  }
}

public struct FocusRestoreReturnTargetHarnessHarnessCase: Codable, Sendable {
  public let case_id: String
  public let surface_type: FocusRestoreReturnTargetHarnessSurfaceType
  public let focus_scope: FocusRestoreReturnTargetHarnessFocusScope
  public let trigger_action: FocusRestoreReturnTargetHarnessTriggerAction
  public let covered_modalities: [FocusRestoreReturnTargetHarnessModality]
  public let object_loss_state: FocusRestoreReturnTargetHarnessObjectLossState
  public let support_surface_kind_or_null: String?
  public let active_focus_lock_kind_or_null: String?
  public let expected_target_kind: FocusRestoreReturnTargetHarnessExpectedTargetKind
  public let expected_focus_restoration_disposition: FocusRestoreReturnTargetHarnessRestorationDisposition
  public let pre_state: FocusRestoreReturnTargetHarnessStateSnapshot
  public let post_state: FocusRestoreReturnTargetHarnessStateSnapshot

  public init(
    case_id: String,
    surface_type: FocusRestoreReturnTargetHarnessSurfaceType,
    focus_scope: FocusRestoreReturnTargetHarnessFocusScope,
    trigger_action: FocusRestoreReturnTargetHarnessTriggerAction,
    covered_modalities: [FocusRestoreReturnTargetHarnessModality],
    object_loss_state: FocusRestoreReturnTargetHarnessObjectLossState,
    support_surface_kind_or_null: String?,
    active_focus_lock_kind_or_null: String?,
    expected_target_kind: FocusRestoreReturnTargetHarnessExpectedTargetKind,
    expected_focus_restoration_disposition: FocusRestoreReturnTargetHarnessRestorationDisposition,
    pre_state: FocusRestoreReturnTargetHarnessStateSnapshot,
    post_state: FocusRestoreReturnTargetHarnessStateSnapshot
  ) {
    self.case_id = case_id
    self.surface_type = surface_type
    self.focus_scope = focus_scope
    self.trigger_action = trigger_action
    self.covered_modalities = covered_modalities
    self.object_loss_state = object_loss_state
    self.support_surface_kind_or_null = support_surface_kind_or_null
    self.active_focus_lock_kind_or_null = active_focus_lock_kind_or_null
    self.expected_target_kind = expected_target_kind
    self.expected_focus_restoration_disposition = expected_focus_restoration_disposition
    self.pre_state = pre_state
    self.post_state = post_state
  }
}

public enum FocusRestoreReturnTargetHarnessSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/focus_restore_return_target_harness.schema.json"
  public static let sourceHash = "d5ebd72b42c2b8999c4f1033f251d7e89954996bb49e678161e512f71ea34f20"
}

public struct InteractionLayerFoundationContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let shell_family: String
  public let design_token_binding_policy: JSONValue
  public let layout_density_token: String
  public let surface_spacing_token: String
  public let support_surface_spacing_token: String
  public let responsive_compaction_token: String
  public let selector_profile: String
  public let support_surface_policy: JSONValue
  public let continuity_policy: String
  public let recovery_surface_policy: String
  public let history_presentation_policy: String
  public let preview_surface_policy: String
  public let notification_surface_policy: String
  public let secondary_window_policy: String
  public let motion_profile: JSONValue
  public let motion_token: JSONValue
  public let feedback_truth_policy: JSONValue
  public let platform_parity_policy: JSONValue

  public init(
    contract_version: JSONValue,
    shell_family: String,
    design_token_binding_policy: JSONValue,
    layout_density_token: String,
    surface_spacing_token: String,
    support_surface_spacing_token: String,
    responsive_compaction_token: String,
    selector_profile: String,
    support_surface_policy: JSONValue,
    continuity_policy: String,
    recovery_surface_policy: String,
    history_presentation_policy: String,
    preview_surface_policy: String,
    notification_surface_policy: String,
    secondary_window_policy: String,
    motion_profile: JSONValue,
    motion_token: JSONValue,
    feedback_truth_policy: JSONValue,
    platform_parity_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.shell_family = shell_family
    self.design_token_binding_policy = design_token_binding_policy
    self.layout_density_token = layout_density_token
    self.surface_spacing_token = surface_spacing_token
    self.support_surface_spacing_token = support_surface_spacing_token
    self.responsive_compaction_token = responsive_compaction_token
    self.selector_profile = selector_profile
    self.support_surface_policy = support_surface_policy
    self.continuity_policy = continuity_policy
    self.recovery_surface_policy = recovery_surface_policy
    self.history_presentation_policy = history_presentation_policy
    self.preview_surface_policy = preview_surface_policy
    self.notification_surface_policy = notification_surface_policy
    self.secondary_window_policy = secondary_window_policy
    self.motion_profile = motion_profile
    self.motion_token = motion_token
    self.feedback_truth_policy = feedback_truth_policy
    self.platform_parity_policy = platform_parity_policy
  }
}

public enum InteractionLayerFoundationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json"
  public static let sourceHash = "1400be63482ef4a193e04e687caabf09957571df5e2626ea07abfcefd6bb5ff1"
}

public struct LowNoiseBudgetAudit: Codable, Sendable {
  public let contract_version: JSONValue
  public let shell_family: JSONValue
  public let audit_scope: String
  public let rendered_surface_order: [JSONValue]
  public let persistent_surface_count: Int
  public let concurrent_primary_count: Int
  public let dominant_issue_count: Int
  public let primary_mutation_action_count: Int
  public let secondary_mutation_action_count: Int
  public let visible_reason_count: Int
  public let collapsed_reason_count: Int
  public let visible_warning_count: Int
  public let visible_action_count: Int
  public let visible_detail_entry_count: Int
  public let visible_shell_char_count: Int
  public let prominent_motion_count: Int
  public let scan_load: Double
  public let copy_budget_state: JSONValue
  public let surface_budget_state: JSONValue
  public let attention_budget_state: JSONValue
  public let semantic_coverage_state: JSONValue
  public let duplicate_posture_codes: [String]
  public let duplicate_posture_cluster_count: Int
  public let rank_swap_count_or_null: Int?
  public let continuity_cost_or_null: Int?
  public let visible_change_count_in_window_or_null: Int?
  public let coalesced_change_count_or_null: Int?
  public let refresh_budget_state: String
  public let detail_fallback_state: String

  public init(
    contract_version: JSONValue,
    shell_family: JSONValue,
    audit_scope: String,
    rendered_surface_order: [JSONValue],
    persistent_surface_count: Int,
    concurrent_primary_count: Int,
    dominant_issue_count: Int,
    primary_mutation_action_count: Int,
    secondary_mutation_action_count: Int,
    visible_reason_count: Int,
    collapsed_reason_count: Int,
    visible_warning_count: Int,
    visible_action_count: Int,
    visible_detail_entry_count: Int,
    visible_shell_char_count: Int,
    prominent_motion_count: Int,
    scan_load: Double,
    copy_budget_state: JSONValue,
    surface_budget_state: JSONValue,
    attention_budget_state: JSONValue,
    semantic_coverage_state: JSONValue,
    duplicate_posture_codes: [String],
    duplicate_posture_cluster_count: Int,
    rank_swap_count_or_null: Int?,
    continuity_cost_or_null: Int?,
    visible_change_count_in_window_or_null: Int?,
    coalesced_change_count_or_null: Int?,
    refresh_budget_state: String,
    detail_fallback_state: String
  ) {
    self.contract_version = contract_version
    self.shell_family = shell_family
    self.audit_scope = audit_scope
    self.rendered_surface_order = rendered_surface_order
    self.persistent_surface_count = persistent_surface_count
    self.concurrent_primary_count = concurrent_primary_count
    self.dominant_issue_count = dominant_issue_count
    self.primary_mutation_action_count = primary_mutation_action_count
    self.secondary_mutation_action_count = secondary_mutation_action_count
    self.visible_reason_count = visible_reason_count
    self.collapsed_reason_count = collapsed_reason_count
    self.visible_warning_count = visible_warning_count
    self.visible_action_count = visible_action_count
    self.visible_detail_entry_count = visible_detail_entry_count
    self.visible_shell_char_count = visible_shell_char_count
    self.prominent_motion_count = prominent_motion_count
    self.scan_load = scan_load
    self.copy_budget_state = copy_budget_state
    self.surface_budget_state = surface_budget_state
    self.attention_budget_state = attention_budget_state
    self.semantic_coverage_state = semantic_coverage_state
    self.duplicate_posture_codes = duplicate_posture_codes
    self.duplicate_posture_cluster_count = duplicate_posture_cluster_count
    self.rank_swap_count_or_null = rank_swap_count_or_null
    self.continuity_cost_or_null = continuity_cost_or_null
    self.visible_change_count_in_window_or_null = visible_change_count_in_window_or_null
    self.coalesced_change_count_or_null = coalesced_change_count_or_null
    self.refresh_budget_state = refresh_budget_state
    self.detail_fallback_state = detail_fallback_state
  }
}

public enum LowNoiseBudgetAuditSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/low_noise_budget_audit.schema.json"
  public static let sourceHash = "8776c4cb2e34e4646075949cd4bb22be38b01c26e65191932b9e9e19eea6e7d1"
}

public struct LowNoiseBudgetAuditPack: Codable, Sendable {
  public let contract_version: JSONValue
  public let pack_id: String
  public let deterministic_seed: Int
  public let suite_profile: JSONValue
  public let run_mode: JSONValue
  public let dominant_story_policy: JSONValue
  public let posture_deduplication_policy: JSONValue
  public let coalescing_policy: JSONValue
  public let copy_budget_policy: JSONValue
  public let cases: [LowNoiseBudgetAuditPackAuditCase]

  public init(
    contract_version: JSONValue,
    pack_id: String,
    deterministic_seed: Int,
    suite_profile: JSONValue,
    run_mode: JSONValue,
    dominant_story_policy: JSONValue,
    posture_deduplication_policy: JSONValue,
    coalescing_policy: JSONValue,
    copy_budget_policy: JSONValue,
    cases: [LowNoiseBudgetAuditPackAuditCase]
  ) {
    self.contract_version = contract_version
    self.pack_id = pack_id
    self.deterministic_seed = deterministic_seed
    self.suite_profile = suite_profile
    self.run_mode = run_mode
    self.dominant_story_policy = dominant_story_policy
    self.posture_deduplication_policy = posture_deduplication_policy
    self.coalescing_policy = coalescing_policy
    self.copy_budget_policy = copy_budget_policy
    self.cases = cases
  }
}

public enum LowNoiseBudgetAuditPackScenarioClass: String, Codable, Sendable {
  case fIRSTVIEW = "FIRST_VIEW"
  case rEASONPRESSURE = "REASON_PRESSURE"
  case nOSAFEACTION = "NO_SAFE_ACTION"
  case nONMATERIALREFRESH = "NON_MATERIAL_REFRESH"
  case rECONNECTCATCHUP = "RECONNECT_CATCH_UP"
  case dETAILFALLBACK = "DETAIL_FALLBACK"
}

public enum LowNoiseBudgetAuditPackActionabilityState: String, Codable, Sendable {
  case aCTIONAVAILABLE = "ACTION_AVAILABLE"
  case nOSAFEACTION = "NO_SAFE_ACTION"
}

public enum LowNoiseBudgetAuditPackModePosture: String, Codable, Sendable {
  case lIVECOMPLIANCE = "LIVE_COMPLIANCE"
  case aNALYSISONLY = "ANALYSIS_ONLY"
  case rEPLAYONLY = "REPLAY_ONLY"
  case mASKEDLIMITED = "MASKED_LIMITED"
  case rEADONLY = "READ_ONLY"
}

public enum LowNoiseBudgetAuditPackCoalescingOutcome: String, Codable, Sendable {
  case nONE = "NONE"
  case cOLLAPSETOCOUNTS = "COLLAPSE_TO_COUNTS"
  case dETAILLOCALONLY = "DETAIL_LOCAL_ONLY"
  case hOLDUNTILMATERIAL = "HOLD_UNTIL_MATERIAL"
}

public enum LowNoiseBudgetAuditPackDetailFallbackState: String, Codable, Sendable {
  case nOTAPPLICABLE = "NOT_APPLICABLE"
  case aCTIVEMODULEPRESERVED = "ACTIVE_MODULE_PRESERVED"
  case fIRSTVALIDENTRYSELECTED = "FIRST_VALID_ENTRY_SELECTED"
  case sUGGESTEDMODULESELECTED = "SUGGESTED_MODULE_SELECTED"
  case cOLLAPSEDROOTSELECTED = "COLLAPSED_ROOT_SELECTED"
}

public typealias LowNoiseBudgetAuditPackDetailModuleCode = JSONValue

public struct LowNoiseBudgetAuditPackAuditCase: Codable, Sendable {
  public let case_id: String
  public let scenario_class: LowNoiseBudgetAuditPackScenarioClass
  public let frame_ref: String
  public let mode_posture: LowNoiseBudgetAuditPackModePosture
  public let actionability_state: LowNoiseBudgetAuditPackActionabilityState
  public let audit: LowNoiseBudgetAudit
  public let dominant_question_changed: Bool
  public let primary_action_changed: Bool
  public let active_detail_surface_code_or_null: LowNoiseBudgetAuditPackDetailModuleCode
  public let expected_coalescing_outcome: LowNoiseBudgetAuditPackCoalescingOutcome
  public let expected_fallback_state: LowNoiseBudgetAuditPackDetailFallbackState

  public init(
    case_id: String,
    scenario_class: LowNoiseBudgetAuditPackScenarioClass,
    frame_ref: String,
    mode_posture: LowNoiseBudgetAuditPackModePosture,
    actionability_state: LowNoiseBudgetAuditPackActionabilityState,
    audit: LowNoiseBudgetAudit,
    dominant_question_changed: Bool,
    primary_action_changed: Bool,
    active_detail_surface_code_or_null: LowNoiseBudgetAuditPackDetailModuleCode,
    expected_coalescing_outcome: LowNoiseBudgetAuditPackCoalescingOutcome,
    expected_fallback_state: LowNoiseBudgetAuditPackDetailFallbackState
  ) {
    self.case_id = case_id
    self.scenario_class = scenario_class
    self.frame_ref = frame_ref
    self.mode_posture = mode_posture
    self.actionability_state = actionability_state
    self.audit = audit
    self.dominant_question_changed = dominant_question_changed
    self.primary_action_changed = primary_action_changed
    self.active_detail_surface_code_or_null = active_detail_surface_code_or_null
    self.expected_coalescing_outcome = expected_coalescing_outcome
    self.expected_fallback_state = expected_fallback_state
  }
}

public enum LowNoiseBudgetAuditPackSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/low_noise_budget_audit_pack.schema.json"
  public static let sourceHash = "2532fc8f24933f6ee6860df950b5119ba81570e76b6dedd42fdf54ce6d41dbcd"
}

public struct LowNoiseExperienceFrame: Codable, Sendable {
  public let artifact_type: JSONValue
  public let frame_id: String
  public let manifest_id: String
  public let decision_bundle_ref: String
  public let decision_bundle_hash: String
  public let trust_summary_ref: String
  public let experience_profile: JSONValue
  public let shell_family: JSONValue
  public let object_anchor_ref: String
  public let shell_route_key: String
  public let dominant_question: String
  public let dominance_contract: ShellDominanceContract
  public let state_taxonomy_contract: ShellStateTaxonomyContract
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let cache_isolation_contract: JSONValue
  public let semantic_accessibility_contract: SemanticAccessibilityContract
  public let truth_boundary_contract: JSONValue
  public let frame_epoch: Int
  public let last_published_sequence: Int
  public let shell_stability_token: String
  public let resume_token: String
  public let stream_recovery_contract: JSONValue
  public let stability_contract: RouteStabilityContract
  public let connection_state: String
  public let truth_state: String
  public let checkpoint_state: String
  public let truth_origin: String
  public let settlement_state: LowNoiseExperienceFrameSettlementState
  public let recovery_posture: LowNoiseExperienceFrameRecoveryPosture
  public let interaction_layer: OperatorInteractionLayer
  public let attention_policy: LowNoiseExperienceFrameAttentionPolicy
  public let cognitive_budget: LowNoiseExperienceFrameCognitiveBudget
  public let copy_budget: LowNoiseExperienceFrameCopyBudget
  public let low_noise_budget_audit: LowNoiseBudgetAudit
  public let surface_order: [JSONValue]
  public let context_bar: ContextBarState
  public let decision_summary: DecisionSummaryState
  public let action_strip: ActionStripState
  public let detail_drawer: DetailDrawerState
  public let active_detail_surface_code: JSONValue
  public let focus_anchor_ref: String?
  public let rendered_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    frame_id: String,
    manifest_id: String,
    decision_bundle_ref: String,
    decision_bundle_hash: String,
    trust_summary_ref: String,
    experience_profile: JSONValue,
    shell_family: JSONValue,
    object_anchor_ref: String,
    shell_route_key: String,
    dominant_question: String,
    dominance_contract: ShellDominanceContract,
    state_taxonomy_contract: ShellStateTaxonomyContract,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    cache_isolation_contract: JSONValue,
    semantic_accessibility_contract: SemanticAccessibilityContract,
    truth_boundary_contract: JSONValue,
    frame_epoch: Int,
    last_published_sequence: Int,
    shell_stability_token: String,
    resume_token: String,
    stream_recovery_contract: JSONValue,
    stability_contract: RouteStabilityContract,
    connection_state: String,
    truth_state: String,
    checkpoint_state: String,
    truth_origin: String,
    settlement_state: LowNoiseExperienceFrameSettlementState,
    recovery_posture: LowNoiseExperienceFrameRecoveryPosture,
    interaction_layer: OperatorInteractionLayer,
    attention_policy: LowNoiseExperienceFrameAttentionPolicy,
    cognitive_budget: LowNoiseExperienceFrameCognitiveBudget,
    copy_budget: LowNoiseExperienceFrameCopyBudget,
    low_noise_budget_audit: LowNoiseBudgetAudit,
    surface_order: [JSONValue],
    context_bar: ContextBarState,
    decision_summary: DecisionSummaryState,
    action_strip: ActionStripState,
    detail_drawer: DetailDrawerState,
    active_detail_surface_code: JSONValue,
    focus_anchor_ref: String?,
    rendered_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.frame_id = frame_id
    self.manifest_id = manifest_id
    self.decision_bundle_ref = decision_bundle_ref
    self.decision_bundle_hash = decision_bundle_hash
    self.trust_summary_ref = trust_summary_ref
    self.experience_profile = experience_profile
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.shell_route_key = shell_route_key
    self.dominant_question = dominant_question
    self.dominance_contract = dominance_contract
    self.state_taxonomy_contract = state_taxonomy_contract
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.cache_isolation_contract = cache_isolation_contract
    self.semantic_accessibility_contract = semantic_accessibility_contract
    self.truth_boundary_contract = truth_boundary_contract
    self.frame_epoch = frame_epoch
    self.last_published_sequence = last_published_sequence
    self.shell_stability_token = shell_stability_token
    self.resume_token = resume_token
    self.stream_recovery_contract = stream_recovery_contract
    self.stability_contract = stability_contract
    self.connection_state = connection_state
    self.truth_state = truth_state
    self.checkpoint_state = checkpoint_state
    self.truth_origin = truth_origin
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.attention_policy = attention_policy
    self.cognitive_budget = cognitive_budget
    self.copy_budget = copy_budget
    self.low_noise_budget_audit = low_noise_budget_audit
    self.surface_order = surface_order
    self.context_bar = context_bar
    self.decision_summary = decision_summary
    self.action_strip = action_strip
    self.detail_drawer = detail_drawer
    self.active_detail_surface_code = active_detail_surface_code
    self.focus_anchor_ref = focus_anchor_ref
    self.rendered_at = rendered_at
  }
}

public enum LowNoiseExperienceFrameLowNoiseSurfaceCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
}

public enum LowNoiseExperienceFrameDetailModuleCode: String, Codable, Sendable {
  case eVIDENCETIDE = "EVIDENCE_TIDE"
  case pACKETFORGE = "PACKET_FORGE"
  case aUTHORITYTUNNEL = "AUTHORITY_TUNNEL"
  case dRIFTFIELD = "DRIFT_FIELD"
  case fOCUSLENS = "FOCUS_LENS"
  case tWINPANEL = "TWIN_PANEL"
}

public enum LowNoiseExperienceFrameSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum LowNoiseExperienceFrameRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public struct LowNoiseExperienceFrameAttentionPolicy: Codable, Sendable {
  public let policy_version: String
  public let attention_state: String
  public let primary_surface_code: LowNoiseExperienceFrameLowNoiseSurfaceCode
  public let primary_object_ref: String?
  public let actionability_state: String
  public let primary_action_code: String?
  public let no_safe_action_reason_code: String?
  public let secondary_notice_count: Int
  public let detail_entry_points: [LowNoiseExperienceFrameDetailModuleCode]
  public let suggested_detail_surface_code: JSONValue
  public let primary_rank_score: Int
  public let runner_up_rank_score: Int
  public let dominance_margin: Int
  public let ranking_basis: [String]
  public let default_detail_module_code: JSONValue
  public let visible_warning_count: Int

  public init(
    policy_version: String,
    attention_state: String,
    primary_surface_code: LowNoiseExperienceFrameLowNoiseSurfaceCode,
    primary_object_ref: String?,
    actionability_state: String,
    primary_action_code: String?,
    no_safe_action_reason_code: String?,
    secondary_notice_count: Int,
    detail_entry_points: [LowNoiseExperienceFrameDetailModuleCode],
    suggested_detail_surface_code: JSONValue,
    primary_rank_score: Int,
    runner_up_rank_score: Int,
    dominance_margin: Int,
    ranking_basis: [String],
    default_detail_module_code: JSONValue,
    visible_warning_count: Int
  ) {
    self.policy_version = policy_version
    self.attention_state = attention_state
    self.primary_surface_code = primary_surface_code
    self.primary_object_ref = primary_object_ref
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.secondary_notice_count = secondary_notice_count
    self.detail_entry_points = detail_entry_points
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.primary_rank_score = primary_rank_score
    self.runner_up_rank_score = runner_up_rank_score
    self.dominance_margin = dominance_margin
    self.ranking_basis = ranking_basis
    self.default_detail_module_code = default_detail_module_code
    self.visible_warning_count = visible_warning_count
  }
}

public struct LowNoiseExperienceFrameCognitiveBudget: Codable, Sendable {
  public let persistent_surface_limit: JSONValue
  public let concurrent_primary_limit: JSONValue
  public let primary_reason_limit: JSONValue
  public let secondary_action_limit: JSONValue
  public let visible_warning_limit: JSONValue
  public let detail_entry_point_limit: JSONValue
  public let expanded_detail_module_limit: JSONValue
  public let visibility_budget_units: JSONValue
  public let prominent_motion_limit: JSONValue
  public let issue_dominance_min_margin: JSONValue
  public let action_dominance_min_margin: JSONValue
  public let primary_rank_hysteresis: JSONValue
  public let non_material_rank_swap_limit: JSONValue
  public let non_material_continuity_cost_limit: JSONValue
  public let refresh_coalescing_window_ms: JSONValue
  public let refresh_burst_visible_change_limit: JSONValue

  public init(
    persistent_surface_limit: JSONValue,
    concurrent_primary_limit: JSONValue,
    primary_reason_limit: JSONValue,
    secondary_action_limit: JSONValue,
    visible_warning_limit: JSONValue,
    detail_entry_point_limit: JSONValue,
    expanded_detail_module_limit: JSONValue,
    visibility_budget_units: JSONValue,
    prominent_motion_limit: JSONValue,
    issue_dominance_min_margin: JSONValue,
    action_dominance_min_margin: JSONValue,
    primary_rank_hysteresis: JSONValue,
    non_material_rank_swap_limit: JSONValue,
    non_material_continuity_cost_limit: JSONValue,
    refresh_coalescing_window_ms: JSONValue,
    refresh_burst_visible_change_limit: JSONValue
  ) {
    self.persistent_surface_limit = persistent_surface_limit
    self.concurrent_primary_limit = concurrent_primary_limit
    self.primary_reason_limit = primary_reason_limit
    self.secondary_action_limit = secondary_action_limit
    self.visible_warning_limit = visible_warning_limit
    self.detail_entry_point_limit = detail_entry_point_limit
    self.expanded_detail_module_limit = expanded_detail_module_limit
    self.visibility_budget_units = visibility_budget_units
    self.prominent_motion_limit = prominent_motion_limit
    self.issue_dominance_min_margin = issue_dominance_min_margin
    self.action_dominance_min_margin = action_dominance_min_margin
    self.primary_rank_hysteresis = primary_rank_hysteresis
    self.non_material_rank_swap_limit = non_material_rank_swap_limit
    self.non_material_continuity_cost_limit = non_material_continuity_cost_limit
    self.refresh_coalescing_window_ms = refresh_coalescing_window_ms
    self.refresh_burst_visible_change_limit = refresh_burst_visible_change_limit
  }
}

public struct LowNoiseExperienceFrameCopyBudget: Codable, Sendable {
  public let manifest_label_max_chars: JSONValue
  public let context_label_max_chars: JSONValue
  public let headline_max_chars: JSONValue
  public let reason_label_max_chars: JSONValue
  public let explanation_max_chars: JSONValue
  public let action_label_max_chars: JSONValue
  public let blocking_reason_max_chars: JSONValue
  public let uncertainty_max_chars: JSONValue
  public let detail_entry_label_max_chars: JSONValue
  public let detail_entry_reason_max_chars: JSONValue

  public init(
    manifest_label_max_chars: JSONValue,
    context_label_max_chars: JSONValue,
    headline_max_chars: JSONValue,
    reason_label_max_chars: JSONValue,
    explanation_max_chars: JSONValue,
    action_label_max_chars: JSONValue,
    blocking_reason_max_chars: JSONValue,
    uncertainty_max_chars: JSONValue,
    detail_entry_label_max_chars: JSONValue,
    detail_entry_reason_max_chars: JSONValue
  ) {
    self.manifest_label_max_chars = manifest_label_max_chars
    self.context_label_max_chars = context_label_max_chars
    self.headline_max_chars = headline_max_chars
    self.reason_label_max_chars = reason_label_max_chars
    self.explanation_max_chars = explanation_max_chars
    self.action_label_max_chars = action_label_max_chars
    self.blocking_reason_max_chars = blocking_reason_max_chars
    self.uncertainty_max_chars = uncertainty_max_chars
    self.detail_entry_label_max_chars = detail_entry_label_max_chars
    self.detail_entry_reason_max_chars = detail_entry_reason_max_chars
  }
}

public enum LowNoiseExperienceFrameSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/low_noise_experience_frame.schema.json"
  public static let sourceHash = "bb5663b9f5f82e6bca819caee2748edd976dc5db3de0e83796fb7b86d6773f97"
}

public struct NativeCacheHydrationAutomationPack: Codable, Sendable {
  public let contract_version: JSONValue
  public let pack_id: String
  public let deterministic_seed: Int
  public let suite_profile: JSONValue
  public let run_mode: JSONValue
  public let first_paint_assertion_policy: JSONValue
  public let purge_assertion_policy: JSONValue
  public let action_gate_assertion_policy: JSONValue
  public let coverage_policy: JSONValue
  public let cases: [NativeCacheHydrationAutomationPackAutomationCase]

  public init(
    contract_version: JSONValue,
    pack_id: String,
    deterministic_seed: Int,
    suite_profile: JSONValue,
    run_mode: JSONValue,
    first_paint_assertion_policy: JSONValue,
    purge_assertion_policy: JSONValue,
    action_gate_assertion_policy: JSONValue,
    coverage_policy: JSONValue,
    cases: [NativeCacheHydrationAutomationPackAutomationCase]
  ) {
    self.contract_version = contract_version
    self.pack_id = pack_id
    self.deterministic_seed = deterministic_seed
    self.suite_profile = suite_profile
    self.run_mode = run_mode
    self.first_paint_assertion_policy = first_paint_assertion_policy
    self.purge_assertion_policy = purge_assertion_policy
    self.action_gate_assertion_policy = action_gate_assertion_policy
    self.coverage_policy = coverage_policy
    self.cases = cases
  }
}

public enum NativeCacheHydrationAutomationPackAutomationHarness: String, Codable, Sendable {
  case xCUITEST = "XCUITEST"
  case nATIVEPERSISTENCEFIXTURE = "NATIVE_PERSISTENCE_FIXTURE"
}

public enum NativeCacheHydrationAutomationPackHydrationScopeClass: String, Codable, Sendable {
  case eXPERIENCECURSOR = "EXPERIENCE_CURSOR"
  case wORKSPACECURSOR = "WORKSPACE_CURSOR"
  case nATIVEPRIMARYSCENE = "NATIVE_PRIMARY_SCENE"
  case nATIVESECONDARYWINDOW = "NATIVE_SECONDARY_WINDOW"
}

public enum NativeCacheHydrationAutomationPackScenarioClass: String, Codable, Sendable {
  case cOLDSTARTCOMPATIBLECACHE = "COLD_START_COMPATIBLE_CACHE"
  case cOLDSTARTSCHEMAINCOMPATIBLE = "COLD_START_SCHEMA_INCOMPATIBLE"
  case tENANTSWITCH = "TENANT_SWITCH"
  case pRIVILEGEDOWNGRADE = "PRIVILEGE_DOWNGRADE"
  case sESSIONREVOCATION = "SESSION_REVOCATION"
  case cACHEONLYRESTOREREBASEREQUIRED = "CACHE_ONLY_RESTORE_REBASE_REQUIRED"
  case sECONDARYWINDOWMASKINGPURGE = "SECONDARY_WINDOW_MASKING_PURGE"
}

public typealias NativeCacheHydrationAutomationPackPurgeReason = JSONValue

public enum NativeCacheHydrationAutomationPackArtifactClass: String, Codable, Sendable {
  case sTRUCTUREDCACHE = "STRUCTURED_CACHE"
  case rESUMEMETADATA = "RESUME_METADATA"
  case sCENERESTORATIONPAYLOAD = "SCENE_RESTORATION_PAYLOAD"
  case nSUSERACTIVITY = "NSUSERACTIVITY"
  case pREVIEWCACHE = "PREVIEW_CACHE"
  case tEMPEXPORTFILE = "TEMP_EXPORT_FILE"
  case lOCALSEARCHINDEX = "LOCAL_SEARCH_INDEX"
}

public enum NativeCacheHydrationAutomationPackFirstPaintOutcome: String, Codable, Sendable {
  case cACHEDRENDERAFTERCHECK = "CACHED_RENDER_AFTER_CHECK"
  case pLACEHOLDERUNTILFRESHSNAPSHOT = "PLACEHOLDER_UNTIL_FRESH_SNAPSHOT"
  case pURGEDNORESTORE = "PURGED_NO_RESTORE"
}

public enum NativeCacheHydrationAutomationPackActionOutcome: String, Codable, Sendable {
  case lIVEACTIONSALLOWED = "LIVE_ACTIONS_ALLOWED"
  case mUTATIONBLOCKEDPENDINGREBASE = "MUTATION_BLOCKED_PENDING_REBASE"
  case mUTATIONBLOCKEDPENDINGACCESSREBIND = "MUTATION_BLOCKED_PENDING_ACCESS_REBIND"
}

public enum NativeCacheHydrationAutomationPackResumeBindingState: String, Codable, Sendable {
  case uNCHANGEDLIVE = "UNCHANGED_LIVE"
  case cLEAREDFORREBASE = "CLEARED_FOR_REBASE"
  case cLEAREDFORACCESSREBIND = "CLEARED_FOR_ACCESS_REBIND"
}

public struct NativeCacheHydrationAutomationPackAutomationCase: Codable, Sendable {
  public let case_id: String
  public let automation_harness: NativeCacheHydrationAutomationPackAutomationHarness
  public let hydration_scope_class: NativeCacheHydrationAutomationPackHydrationScopeClass
  public let scenario_class: NativeCacheHydrationAutomationPackScenarioClass
  public let compatibility_check_completed_before_render: Bool
  public let incompatible_content_rendered: Bool
  public let purge_reason_code_or_null: NativeCacheHydrationAutomationPackPurgeReason
  public let purged_artifact_classes: [NativeCacheHydrationAutomationPackArtifactClass]
  public let resume_lineage_reused_illegally: Bool
  public let restoration_reopened_stale_context: Bool
  public let expected_first_paint_outcome: NativeCacheHydrationAutomationPackFirstPaintOutcome
  public let expected_action_outcome: NativeCacheHydrationAutomationPackActionOutcome
  public let expected_resume_binding_state: NativeCacheHydrationAutomationPackResumeBindingState

  public init(
    case_id: String,
    automation_harness: NativeCacheHydrationAutomationPackAutomationHarness,
    hydration_scope_class: NativeCacheHydrationAutomationPackHydrationScopeClass,
    scenario_class: NativeCacheHydrationAutomationPackScenarioClass,
    compatibility_check_completed_before_render: Bool,
    incompatible_content_rendered: Bool,
    purge_reason_code_or_null: NativeCacheHydrationAutomationPackPurgeReason,
    purged_artifact_classes: [NativeCacheHydrationAutomationPackArtifactClass],
    resume_lineage_reused_illegally: Bool,
    restoration_reopened_stale_context: Bool,
    expected_first_paint_outcome: NativeCacheHydrationAutomationPackFirstPaintOutcome,
    expected_action_outcome: NativeCacheHydrationAutomationPackActionOutcome,
    expected_resume_binding_state: NativeCacheHydrationAutomationPackResumeBindingState
  ) {
    self.case_id = case_id
    self.automation_harness = automation_harness
    self.hydration_scope_class = hydration_scope_class
    self.scenario_class = scenario_class
    self.compatibility_check_completed_before_render = compatibility_check_completed_before_render
    self.incompatible_content_rendered = incompatible_content_rendered
    self.purge_reason_code_or_null = purge_reason_code_or_null
    self.purged_artifact_classes = purged_artifact_classes
    self.resume_lineage_reused_illegally = resume_lineage_reused_illegally
    self.restoration_reopened_stale_context = restoration_reopened_stale_context
    self.expected_first_paint_outcome = expected_first_paint_outcome
    self.expected_action_outcome = expected_action_outcome
    self.expected_resume_binding_state = expected_resume_binding_state
  }
}

public enum NativeCacheHydrationAutomationPackSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/native_cache_hydration_automation_pack.schema.json"
  public static let sourceHash = "7020281be9a0755ba71075eec73827ca8cd1d67410bd557ad531699794b34344"
}

public struct NativeCacheHydrationContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let hydration_scope_class: String
  public let tenant_id: String
  public let principal_class: String
  public let session_binding_hash: String
  public let session_lineage_ref_or_null: String?
  public let access_binding_hash_or_null: String?
  public let masking_posture_fingerprint: String
  public let route_identity_ref: String
  public let canonical_object_ref: String
  public let shell_family: String
  public let schema_compatibility_ref: String
  public let projection_guard_ref: String
  public let resume_binding_ref_or_null: String?
  public let restoration_anchor_ref_or_null: String?
  public let preview_subject_ref_or_null: String?
  public let compatibility_dimensions: [JSONValue]
  public let purge_trigger_reason_codes: [JSONValue]
  public let regulated_local_artifact_classes: [JSONValue]
  public let first_paint_policy: JSONValue
  public let purge_execution_policy: JSONValue
  public let cursor_lineage_policy: JSONValue
  public let restoration_reuse_policy: JSONValue
  public let mutation_gate_policy: JSONValue
  public let local_artifact_purge_policy: JSONValue

  public init(
    contract_version: JSONValue,
    hydration_scope_class: String,
    tenant_id: String,
    principal_class: String,
    session_binding_hash: String,
    session_lineage_ref_or_null: String?,
    access_binding_hash_or_null: String?,
    masking_posture_fingerprint: String,
    route_identity_ref: String,
    canonical_object_ref: String,
    shell_family: String,
    schema_compatibility_ref: String,
    projection_guard_ref: String,
    resume_binding_ref_or_null: String?,
    restoration_anchor_ref_or_null: String?,
    preview_subject_ref_or_null: String?,
    compatibility_dimensions: [JSONValue],
    purge_trigger_reason_codes: [JSONValue],
    regulated_local_artifact_classes: [JSONValue],
    first_paint_policy: JSONValue,
    purge_execution_policy: JSONValue,
    cursor_lineage_policy: JSONValue,
    restoration_reuse_policy: JSONValue,
    mutation_gate_policy: JSONValue,
    local_artifact_purge_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.hydration_scope_class = hydration_scope_class
    self.tenant_id = tenant_id
    self.principal_class = principal_class
    self.session_binding_hash = session_binding_hash
    self.session_lineage_ref_or_null = session_lineage_ref_or_null
    self.access_binding_hash_or_null = access_binding_hash_or_null
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.route_identity_ref = route_identity_ref
    self.canonical_object_ref = canonical_object_ref
    self.shell_family = shell_family
    self.schema_compatibility_ref = schema_compatibility_ref
    self.projection_guard_ref = projection_guard_ref
    self.resume_binding_ref_or_null = resume_binding_ref_or_null
    self.restoration_anchor_ref_or_null = restoration_anchor_ref_or_null
    self.preview_subject_ref_or_null = preview_subject_ref_or_null
    self.compatibility_dimensions = compatibility_dimensions
    self.purge_trigger_reason_codes = purge_trigger_reason_codes
    self.regulated_local_artifact_classes = regulated_local_artifact_classes
    self.first_paint_policy = first_paint_policy
    self.purge_execution_policy = purge_execution_policy
    self.cursor_lineage_policy = cursor_lineage_policy
    self.restoration_reuse_policy = restoration_reuse_policy
    self.mutation_gate_policy = mutation_gate_policy
    self.local_artifact_purge_policy = local_artifact_purge_policy
  }
}

public enum NativeCacheHydrationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json"
  public static let sourceHash = "1fe7671d934377786466e683c784b9837bf08445cb7d246143e5a030a3e86a99"
}

public struct NativeOperatorSecondaryWindowScene: Codable, Sendable {
  public let artifact_type: JSONValue
  public let scene_id: String
  public let tenant_id: String
  public let shell_family: JSONValue
  public let surface_embodiment: JSONValue
  public let secondary_window_kind: String
  public let source_module_code: String
  public let parent_scene_ref: String
  public let parent_backing_read_model_type: String
  public let parent_object_family: String
  public let parent_object_anchor_ref: String
  public let parent_focus_anchor_ref: String
  public let dominant_question: String
  public let interaction_layer: OperatorInteractionLayer
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let cache_isolation_contract: JSONValue
  public let native_cache_hydration_contract: NativeCacheHydrationContract
  public let semantic_accessibility_contract: SemanticAccessibilityContract
  public let window_surface_order: [JSONValue]
  public let artifact_affordance: JSONValue
  public let identity_header: NativeOperatorSecondaryWindowSceneIdentityHeader
  public let summary_loading: NativeOperatorSecondaryWindowSceneSummaryLoading
  public let focus_handoff: NativeOperatorSecondaryWindowSceneFocusHandoff
  public let scene_identity: NativeOperatorSecondaryWindowSceneSceneIdentity
  public let scene_restoration: NativeOperatorSecondaryWindowSceneSceneRestoration
  public let support_only_window: JSONValue
  public let rendered_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    scene_id: String,
    tenant_id: String,
    shell_family: JSONValue,
    surface_embodiment: JSONValue,
    secondary_window_kind: String,
    source_module_code: String,
    parent_scene_ref: String,
    parent_backing_read_model_type: String,
    parent_object_family: String,
    parent_object_anchor_ref: String,
    parent_focus_anchor_ref: String,
    dominant_question: String,
    interaction_layer: OperatorInteractionLayer,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    cache_isolation_contract: JSONValue,
    native_cache_hydration_contract: NativeCacheHydrationContract,
    semantic_accessibility_contract: SemanticAccessibilityContract,
    window_surface_order: [JSONValue],
    artifact_affordance: JSONValue,
    identity_header: NativeOperatorSecondaryWindowSceneIdentityHeader,
    summary_loading: NativeOperatorSecondaryWindowSceneSummaryLoading,
    focus_handoff: NativeOperatorSecondaryWindowSceneFocusHandoff,
    scene_identity: NativeOperatorSecondaryWindowSceneSceneIdentity,
    scene_restoration: NativeOperatorSecondaryWindowSceneSceneRestoration,
    support_only_window: JSONValue,
    rendered_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.scene_id = scene_id
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.surface_embodiment = surface_embodiment
    self.secondary_window_kind = secondary_window_kind
    self.source_module_code = source_module_code
    self.parent_scene_ref = parent_scene_ref
    self.parent_backing_read_model_type = parent_backing_read_model_type
    self.parent_object_family = parent_object_family
    self.parent_object_anchor_ref = parent_object_anchor_ref
    self.parent_focus_anchor_ref = parent_focus_anchor_ref
    self.dominant_question = dominant_question
    self.interaction_layer = interaction_layer
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.cache_isolation_contract = cache_isolation_contract
    self.native_cache_hydration_contract = native_cache_hydration_contract
    self.semantic_accessibility_contract = semantic_accessibility_contract
    self.window_surface_order = window_surface_order
    self.artifact_affordance = artifact_affordance
    self.identity_header = identity_header
    self.summary_loading = summary_loading
    self.focus_handoff = focus_handoff
    self.scene_identity = scene_identity
    self.scene_restoration = scene_restoration
    self.support_only_window = support_only_window
    self.rendered_at = rendered_at
  }
}

public struct NativeOperatorSecondaryWindowSceneIdentityHeader: Codable, Sendable {
  public let parent_object_ref: String
  public let mounted_artifact_ref: String
  public let headline: String
  public let status_label: String
  public let currentness_state: String
  public let lineage_summary_ref: String

  public init(
    parent_object_ref: String,
    mounted_artifact_ref: String,
    headline: String,
    status_label: String,
    currentness_state: String,
    lineage_summary_ref: String
  ) {
    self.parent_object_ref = parent_object_ref
    self.mounted_artifact_ref = mounted_artifact_ref
    self.headline = headline
    self.status_label = status_label
    self.currentness_state = currentness_state
    self.lineage_summary_ref = lineage_summary_ref
  }
}

public struct NativeOperatorSecondaryWindowSceneSummaryLoading: Codable, Sendable {
  public let summary_card_ref: String
  public let summary_state: String
  public let detail_state: String
  public let default_revision_posture: String
  public let historical_navigation_state: String

  public init(
    summary_card_ref: String,
    summary_state: String,
    detail_state: String,
    default_revision_posture: String,
    historical_navigation_state: String
  ) {
    self.summary_card_ref = summary_card_ref
    self.summary_state = summary_state
    self.detail_state = detail_state
    self.default_revision_posture = default_revision_posture
    self.historical_navigation_state = historical_navigation_state
  }
}

public struct NativeOperatorSecondaryWindowSceneFocusHandoff: Codable, Sendable {
  public let launch_focus_anchor_ref: String
  public let window_focus_target: String
  public let close_return_focus_anchor_ref: String
  public let parent_focus_restore_policy: JSONValue

  public init(
    launch_focus_anchor_ref: String,
    window_focus_target: String,
    close_return_focus_anchor_ref: String,
    parent_focus_restore_policy: JSONValue
  ) {
    self.launch_focus_anchor_ref = launch_focus_anchor_ref
    self.window_focus_target = window_focus_target
    self.close_return_focus_anchor_ref = close_return_focus_anchor_ref
    self.parent_focus_restore_policy = parent_focus_restore_policy
  }
}

public struct NativeOperatorSecondaryWindowSceneSceneIdentity: Codable, Sendable {
  public let principal_session_lineage_ref: String
  public let masking_posture_fingerprint: String
  public let access_binding_hash_or_null: String?
  public let schema_compatibility_ref: String
  public let stability_contract: RouteStabilityContract
  public let shell_stability_token: String
  public let route_key: String
  public let frame_epoch: Int
  public let workspace_version_or_null: Int?
  public let manifest_id_or_null: String?
  public let work_item_id_or_null: String?
  public let focus_anchor_ref_or_null: String?

  public init(
    principal_session_lineage_ref: String,
    masking_posture_fingerprint: String,
    access_binding_hash_or_null: String?,
    schema_compatibility_ref: String,
    stability_contract: RouteStabilityContract,
    shell_stability_token: String,
    route_key: String,
    frame_epoch: Int,
    workspace_version_or_null: Int?,
    manifest_id_or_null: String?,
    work_item_id_or_null: String?,
    focus_anchor_ref_or_null: String?
  ) {
    self.principal_session_lineage_ref = principal_session_lineage_ref
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.access_binding_hash_or_null = access_binding_hash_or_null
    self.schema_compatibility_ref = schema_compatibility_ref
    self.stability_contract = stability_contract
    self.shell_stability_token = shell_stability_token
    self.route_key = route_key
    self.frame_epoch = frame_epoch
    self.workspace_version_or_null = workspace_version_or_null
    self.manifest_id_or_null = manifest_id_or_null
    self.work_item_id_or_null = work_item_id_or_null
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
  }
}

public struct NativeOperatorSecondaryWindowSceneSceneRestoration: Codable, Sendable {
  public let restoration_state: String
  public let invalid_reason_codes: [String]
  public let restoration_anchor_ref_or_null: String?
  public let resume_token_ref_or_null: String?
  public let focus_restoration: FocusRestorationContract

  public init(
    restoration_state: String,
    invalid_reason_codes: [String],
    restoration_anchor_ref_or_null: String?,
    resume_token_ref_or_null: String?,
    focus_restoration: FocusRestorationContract
  ) {
    self.restoration_state = restoration_state
    self.invalid_reason_codes = invalid_reason_codes
    self.restoration_anchor_ref_or_null = restoration_anchor_ref_or_null
    self.resume_token_ref_or_null = resume_token_ref_or_null
    self.focus_restoration = focus_restoration
  }
}

public enum NativeOperatorSecondaryWindowSceneSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/native_operator_secondary_window_scene.schema.json"
  public static let sourceHash = "a5b333cc1a53dfb216275f64063a6914c64d3f414cd8119b2c5270e398810610"
}

public struct NativeOperatorWorkspaceScene: Codable, Sendable {
  public let artifact_type: JSONValue
  public let scene_id: String
  public let tenant_id: String
  public let shell_family: JSONValue
  public let surface_embodiment: JSONValue
  public let backing_read_model_type: String
  public let backing_read_model_ref: String
  public let object_family: String
  public let object_anchor_ref: String
  public let dominant_question: String
  public let dominance_contract: ShellDominanceContract
  public let state_taxonomy_contract: ShellStateTaxonomyContract
  public let cross_device_continuity_contract: CrossDeviceContinuityContract
  public let cache_isolation_contract: JSONValue
  public let native_cache_hydration_contract: NativeCacheHydrationContract
  public let semantic_accessibility_contract: SemanticAccessibilityContract
  public let settlement_state: NativeOperatorWorkspaceSceneSettlementState
  public let recovery_posture: NativeOperatorWorkspaceSceneRecoveryPosture
  public let interaction_layer: OperatorInteractionLayer
  public let surface_order: [JSONValue]
  public let leading_sidebar: NativeOperatorWorkspaceSceneLeadingSidebar
  public let primary_canvas: NativeOperatorWorkspaceScenePrimaryCanvas
  public let trailing_inspector: NativeOperatorWorkspaceSceneTrailingInspector
  public let scene_identity: NativeOperatorWorkspaceSceneSceneIdentity
  public let scene_restoration: NativeOperatorWorkspaceSceneSceneRestoration
  public let shortcut_posture: NativeOperatorWorkspaceSceneShortcutPosture
  public let rendered_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    scene_id: String,
    tenant_id: String,
    shell_family: JSONValue,
    surface_embodiment: JSONValue,
    backing_read_model_type: String,
    backing_read_model_ref: String,
    object_family: String,
    object_anchor_ref: String,
    dominant_question: String,
    dominance_contract: ShellDominanceContract,
    state_taxonomy_contract: ShellStateTaxonomyContract,
    cross_device_continuity_contract: CrossDeviceContinuityContract,
    cache_isolation_contract: JSONValue,
    native_cache_hydration_contract: NativeCacheHydrationContract,
    semantic_accessibility_contract: SemanticAccessibilityContract,
    settlement_state: NativeOperatorWorkspaceSceneSettlementState,
    recovery_posture: NativeOperatorWorkspaceSceneRecoveryPosture,
    interaction_layer: OperatorInteractionLayer,
    surface_order: [JSONValue],
    leading_sidebar: NativeOperatorWorkspaceSceneLeadingSidebar,
    primary_canvas: NativeOperatorWorkspaceScenePrimaryCanvas,
    trailing_inspector: NativeOperatorWorkspaceSceneTrailingInspector,
    scene_identity: NativeOperatorWorkspaceSceneSceneIdentity,
    scene_restoration: NativeOperatorWorkspaceSceneSceneRestoration,
    shortcut_posture: NativeOperatorWorkspaceSceneShortcutPosture,
    rendered_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.scene_id = scene_id
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.surface_embodiment = surface_embodiment
    self.backing_read_model_type = backing_read_model_type
    self.backing_read_model_ref = backing_read_model_ref
    self.object_family = object_family
    self.object_anchor_ref = object_anchor_ref
    self.dominant_question = dominant_question
    self.dominance_contract = dominance_contract
    self.state_taxonomy_contract = state_taxonomy_contract
    self.cross_device_continuity_contract = cross_device_continuity_contract
    self.cache_isolation_contract = cache_isolation_contract
    self.native_cache_hydration_contract = native_cache_hydration_contract
    self.semantic_accessibility_contract = semantic_accessibility_contract
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.surface_order = surface_order
    self.leading_sidebar = leading_sidebar
    self.primary_canvas = primary_canvas
    self.trailing_inspector = trailing_inspector
    self.scene_identity = scene_identity
    self.scene_restoration = scene_restoration
    self.shortcut_posture = shortcut_posture
    self.rendered_at = rendered_at
  }
}

public enum NativeOperatorWorkspaceSceneSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum NativeOperatorWorkspaceSceneRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public enum NativeOperatorWorkspaceSceneDetailSurfaceCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
}

public struct NativeOperatorWorkspaceSceneLeadingSidebar: Codable, Sendable {
  public let selection_family: String
  public let sidebar_collapse_state: String
  public let selected_object_ref: String
  public let selected_focus_anchor_ref_or_null: String?

  public init(
    selection_family: String,
    sidebar_collapse_state: String,
    selected_object_ref: String,
    selected_focus_anchor_ref_or_null: String?
  ) {
    self.selection_family = selection_family
    self.sidebar_collapse_state = sidebar_collapse_state
    self.selected_object_ref = selected_object_ref
    self.selected_focus_anchor_ref_or_null = selected_focus_anchor_ref_or_null
  }
}

public struct NativeOperatorWorkspaceScenePrimaryCanvas: Codable, Sendable {
  public let surface_order: [JSONValue]
  public let authoritative_action_surface_code: JSONValue
  public let mounted_object_ref: String
  public let focused_surface_code_or_null: JSONValue

  public init(
    surface_order: [JSONValue],
    authoritative_action_surface_code: JSONValue,
    mounted_object_ref: String,
    focused_surface_code_or_null: JSONValue
  ) {
    self.surface_order = surface_order
    self.authoritative_action_surface_code = authoritative_action_surface_code
    self.mounted_object_ref = mounted_object_ref
    self.focused_surface_code_or_null = focused_surface_code_or_null
  }
}

public struct NativeOperatorWorkspaceSceneTrailingInspector: Codable, Sendable {
  public let presentation_mode: String
  public let support_surface_code: JSONValue
  public let bound_object_ref_or_null: String?
  public let focus_anchor_ref_or_null: String?
  public let detached_scene_ref_or_null: String?
  public let authoritative_action_strip_present: JSONValue

  public init(
    presentation_mode: String,
    support_surface_code: JSONValue,
    bound_object_ref_or_null: String?,
    focus_anchor_ref_or_null: String?,
    detached_scene_ref_or_null: String?,
    authoritative_action_strip_present: JSONValue
  ) {
    self.presentation_mode = presentation_mode
    self.support_surface_code = support_surface_code
    self.bound_object_ref_or_null = bound_object_ref_or_null
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.detached_scene_ref_or_null = detached_scene_ref_or_null
    self.authoritative_action_strip_present = authoritative_action_strip_present
  }
}

public struct NativeOperatorWorkspaceSceneSceneIdentity: Codable, Sendable {
  public let principal_session_lineage_ref: String
  public let masking_posture_fingerprint: String
  public let access_binding_hash_or_null: String?
  public let schema_compatibility_ref: String
  public let stability_contract: RouteStabilityContract
  public let shell_stability_token: String
  public let route_key: String
  public let frame_epoch: Int
  public let workspace_version_or_null: Int?
  public let manifest_id_or_null: String?
  public let work_item_id_or_null: String?
  public let focus_anchor_ref_or_null: String?

  public init(
    principal_session_lineage_ref: String,
    masking_posture_fingerprint: String,
    access_binding_hash_or_null: String?,
    schema_compatibility_ref: String,
    stability_contract: RouteStabilityContract,
    shell_stability_token: String,
    route_key: String,
    frame_epoch: Int,
    workspace_version_or_null: Int?,
    manifest_id_or_null: String?,
    work_item_id_or_null: String?,
    focus_anchor_ref_or_null: String?
  ) {
    self.principal_session_lineage_ref = principal_session_lineage_ref
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.access_binding_hash_or_null = access_binding_hash_or_null
    self.schema_compatibility_ref = schema_compatibility_ref
    self.stability_contract = stability_contract
    self.shell_stability_token = shell_stability_token
    self.route_key = route_key
    self.frame_epoch = frame_epoch
    self.workspace_version_or_null = workspace_version_or_null
    self.manifest_id_or_null = manifest_id_or_null
    self.work_item_id_or_null = work_item_id_or_null
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
  }
}

public struct NativeOperatorWorkspaceSceneSceneRestoration: Codable, Sendable {
  public let restoration_state: String
  public let invalid_reason_codes: [String]
  public let restoration_anchor_ref_or_null: String?
  public let resume_token_ref_or_null: String?
  public let focus_restoration: FocusRestorationContract

  public init(
    restoration_state: String,
    invalid_reason_codes: [String],
    restoration_anchor_ref_or_null: String?,
    resume_token_ref_or_null: String?,
    focus_restoration: FocusRestorationContract
  ) {
    self.restoration_state = restoration_state
    self.invalid_reason_codes = invalid_reason_codes
    self.restoration_anchor_ref_or_null = restoration_anchor_ref_or_null
    self.resume_token_ref_or_null = resume_token_ref_or_null
    self.focus_restoration = focus_restoration
  }
}

public struct NativeOperatorWorkspaceSceneShortcutPosture: Codable, Sendable {
  public let available_shortcut_codes: [JSONValue]
  public let focused_region: String
  public let menu_command_surface_state: JSONValue
  public let focus_restore_policy: JSONValue

  public init(
    available_shortcut_codes: [JSONValue],
    focused_region: String,
    menu_command_surface_state: JSONValue,
    focus_restore_policy: JSONValue
  ) {
    self.available_shortcut_codes = available_shortcut_codes
    self.focused_region = focused_region
    self.menu_command_surface_state = menu_command_surface_state
    self.focus_restore_policy = focus_restore_policy
  }
}

public enum NativeOperatorWorkspaceSceneSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/native_operator_workspace_scene.schema.json"
  public static let sourceHash = "8437b846bcb9b095516a5850088b14e42b4b26389f456e7f262d652d7519e3a2"
}

public struct OperatorInteractionLayer: Codable, Sendable {
  public let foundation_contract: InteractionLayerFoundationContract
  public let mounted_content_policy: JSONValue
  public let refresh_presentation: JSONValue
  public let recovery_presentation: JSONValue
  public let recovery_notice_surface: String
  public let delta_promotion_mode: JSONValue
  public let selector_profile: JSONValue
  public let shell_continuity_policy: JSONValue
  public let activity_partition_policy: JSONValue
  public let investigation_presentation_policy: JSONValue
  public let secondary_window_policy: JSONValue
  public let notification_surface: String
  public let artifact_preview_surface: String
  public let history_presentation: JSONValue
  public let motion_profile: JSONValue
  public let unsafe_action_policy: JSONValue
  public let feedback_truth_policy: JSONValue

  public init(
    foundation_contract: InteractionLayerFoundationContract,
    mounted_content_policy: JSONValue,
    refresh_presentation: JSONValue,
    recovery_presentation: JSONValue,
    recovery_notice_surface: String,
    delta_promotion_mode: JSONValue,
    selector_profile: JSONValue,
    shell_continuity_policy: JSONValue,
    activity_partition_policy: JSONValue,
    investigation_presentation_policy: JSONValue,
    secondary_window_policy: JSONValue,
    notification_surface: String,
    artifact_preview_surface: String,
    history_presentation: JSONValue,
    motion_profile: JSONValue,
    unsafe_action_policy: JSONValue,
    feedback_truth_policy: JSONValue
  ) {
    self.foundation_contract = foundation_contract
    self.mounted_content_policy = mounted_content_policy
    self.refresh_presentation = refresh_presentation
    self.recovery_presentation = recovery_presentation
    self.recovery_notice_surface = recovery_notice_surface
    self.delta_promotion_mode = delta_promotion_mode
    self.selector_profile = selector_profile
    self.shell_continuity_policy = shell_continuity_policy
    self.activity_partition_policy = activity_partition_policy
    self.investigation_presentation_policy = investigation_presentation_policy
    self.secondary_window_policy = secondary_window_policy
    self.notification_surface = notification_surface
    self.artifact_preview_surface = artifact_preview_surface
    self.history_presentation = history_presentation
    self.motion_profile = motion_profile
    self.unsafe_action_policy = unsafe_action_policy
    self.feedback_truth_policy = feedback_truth_policy
  }
}

public enum OperatorInteractionLayerSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/operator_interaction_layer.schema.json"
  public static let sourceHash = "09c6f385e74b009d4fb76743a66f4c0596a2643a075e17940457a7ce9ffb30e9"
}

public struct RouteStabilityContract: Codable, Sendable {
  public let route_scope_class: String
  public let publication_generation: Int
  public let guard_vector_hash: String
  public let guard_vector_components: RouteStabilityContractGuardVectorComponents
  public let last_published_sequence_or_null: Int?
  public let resume_token_or_null: String?
  public let resume_capability: String

  public init(
    route_scope_class: String,
    publication_generation: Int,
    guard_vector_hash: String,
    guard_vector_components: RouteStabilityContractGuardVectorComponents,
    last_published_sequence_or_null: Int?,
    resume_token_or_null: String?,
    resume_capability: String
  ) {
    self.route_scope_class = route_scope_class
    self.publication_generation = publication_generation
    self.guard_vector_hash = guard_vector_hash
    self.guard_vector_components = guard_vector_components
    self.last_published_sequence_or_null = last_published_sequence_or_null
    self.resume_token_or_null = resume_token_or_null
    self.resume_capability = resume_capability
  }
}

public struct RouteStabilityContractGuardVectorComponents: Codable, Sendable {
  public let decision_bundle_hash_or_null: String?
  public let shell_stability_token_or_null: String?
  public let frame_epoch_or_null: Int?
  public let work_item_version_or_null: Int?
  public let customer_thread_head_or_null: Int?
  public let internal_thread_head_or_null: Int?
  public let request_state_version_or_null: Int?
  public let client_portal_workspace_version_or_null: Int?
  public let view_guard_ref_or_null: String?
  public let policy_snapshot_hash_or_null: String?
  public let dependency_topology_hash_or_null: String?
  public let simulation_basis_hash_or_null: String?
  public let mutation_basis_contract_hash_or_null: String?

  public init(
    decision_bundle_hash_or_null: String?,
    shell_stability_token_or_null: String?,
    frame_epoch_or_null: Int?,
    work_item_version_or_null: Int?,
    customer_thread_head_or_null: Int?,
    internal_thread_head_or_null: Int?,
    request_state_version_or_null: Int?,
    client_portal_workspace_version_or_null: Int?,
    view_guard_ref_or_null: String?,
    policy_snapshot_hash_or_null: String?,
    dependency_topology_hash_or_null: String?,
    simulation_basis_hash_or_null: String?,
    mutation_basis_contract_hash_or_null: String? = nil
  ) {
    self.decision_bundle_hash_or_null = decision_bundle_hash_or_null
    self.shell_stability_token_or_null = shell_stability_token_or_null
    self.frame_epoch_or_null = frame_epoch_or_null
    self.work_item_version_or_null = work_item_version_or_null
    self.customer_thread_head_or_null = customer_thread_head_or_null
    self.internal_thread_head_or_null = internal_thread_head_or_null
    self.request_state_version_or_null = request_state_version_or_null
    self.client_portal_workspace_version_or_null = client_portal_workspace_version_or_null
    self.view_guard_ref_or_null = view_guard_ref_or_null
    self.policy_snapshot_hash_or_null = policy_snapshot_hash_or_null
    self.dependency_topology_hash_or_null = dependency_topology_hash_or_null
    self.simulation_basis_hash_or_null = simulation_basis_hash_or_null
    self.mutation_basis_contract_hash_or_null = mutation_basis_contract_hash_or_null
  }
}

public enum RouteStabilityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/route_stability_contract.schema.json"
  public static let sourceHash = "ae13fc174b6924f8525c5b26fa8615663cb48634fdaa730a3f33f85bcbc72bfc"
}

public struct SemanticAccessibilityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let shell_family: String
  public let selector_profile: String
  public let identifier_semantics_policy: JSONValue
  public let browser_identifier_policy: JSONValue
  public let native_identifier_policy: JSONValue
  public let landmark_structure_policy: JSONValue
  public let heading_navigation_policy: JSONValue
  public let focus_order_policy: JSONValue
  public let focus_entry_policy: JSONValue
  public let focus_restore_policy: JSONValue
  public let keyboard_completion_policy: JSONValue
  public let live_update_focus_policy: JSONValue
  public let live_region_policy: JSONValue
  public let conditional_notice_anchor_policy: JSONValue
  public let support_region_access_policy: JSONValue
  public let detail_module_access_policy: JSONValue
  public let artifact_handoff_policy: JSONValue
  public let reduced_motion_policy: JSONValue
  public let required_anchor_codes: [SemanticAccessibilityContractAnchorCode]
  public let semantic_focus_order: [SemanticAccessibilityContractFocusRegionCode]
  public let announced_change_kinds: [SemanticAccessibilityContractAnnouncedChangeKind]

  public init(
    contract_version: JSONValue,
    shell_family: String,
    selector_profile: String,
    identifier_semantics_policy: JSONValue,
    browser_identifier_policy: JSONValue,
    native_identifier_policy: JSONValue,
    landmark_structure_policy: JSONValue,
    heading_navigation_policy: JSONValue,
    focus_order_policy: JSONValue,
    focus_entry_policy: JSONValue,
    focus_restore_policy: JSONValue,
    keyboard_completion_policy: JSONValue,
    live_update_focus_policy: JSONValue,
    live_region_policy: JSONValue,
    conditional_notice_anchor_policy: JSONValue,
    support_region_access_policy: JSONValue,
    detail_module_access_policy: JSONValue,
    artifact_handoff_policy: JSONValue,
    reduced_motion_policy: JSONValue,
    required_anchor_codes: [SemanticAccessibilityContractAnchorCode],
    semantic_focus_order: [SemanticAccessibilityContractFocusRegionCode],
    announced_change_kinds: [SemanticAccessibilityContractAnnouncedChangeKind]
  ) {
    self.contract_version = contract_version
    self.shell_family = shell_family
    self.selector_profile = selector_profile
    self.identifier_semantics_policy = identifier_semantics_policy
    self.browser_identifier_policy = browser_identifier_policy
    self.native_identifier_policy = native_identifier_policy
    self.landmark_structure_policy = landmark_structure_policy
    self.heading_navigation_policy = heading_navigation_policy
    self.focus_order_policy = focus_order_policy
    self.focus_entry_policy = focus_entry_policy
    self.focus_restore_policy = focus_restore_policy
    self.keyboard_completion_policy = keyboard_completion_policy
    self.live_update_focus_policy = live_update_focus_policy
    self.live_region_policy = live_region_policy
    self.conditional_notice_anchor_policy = conditional_notice_anchor_policy
    self.support_region_access_policy = support_region_access_policy
    self.detail_module_access_policy = detail_module_access_policy
    self.artifact_handoff_policy = artifact_handoff_policy
    self.reduced_motion_policy = reduced_motion_policy
    self.required_anchor_codes = required_anchor_codes
    self.semantic_focus_order = semantic_focus_order
    self.announced_change_kinds = announced_change_kinds
  }
}

public enum SemanticAccessibilityContractAnchorCode: String, Codable, Sendable {
  case sHELLROOT = "SHELL_ROOT"
  case sHELLFAMILY = "SHELL_FAMILY"
  case oBJECTANCHOR = "OBJECT_ANCHOR"
  case dOMINANTQUESTION = "DOMINANT_QUESTION"
  case dOMINANTACTION = "DOMINANT_ACTION"
  case sETTLEMENTPOSTURE = "SETTLEMENT_POSTURE"
  case rECOVERYPOSTURE = "RECOVERY_POSTURE"
  case wORKSPACEPOSTURE = "WORKSPACE_POSTURE"
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case pRIMARYACTION = "PRIMARY_ACTION"
  case nOSAFEACTIONREASON = "NO_SAFE_ACTION_REASON"
  case dETAILDRAWER = "DETAIL_DRAWER"
  case pROMOTEDSUPPORTREGION = "PROMOTED_SUPPORT_REGION"
  case lIMITATIONNOTICE = "LIMITATION_NOTICE"
  case rECOVERYNOTICE = "RECOVERY_NOTICE"
  case aRTIFACTHANDOFF = "ARTIFACT_HANDOFF"
  case aRTIFACTSTATELABEL = "ARTIFACT_STATE_LABEL"
  case rETURNPATHCONTROL = "RETURN_PATH_CONTROL"
  case rOUTETABS = "ROUTE_TABS"
  case rEQUESTFOCUS = "REQUEST_FOCUS"
  case cURRENTARTIFACT = "CURRENT_ARTIFACT"
  case hISTORYLIST = "HISTORY_LIST"
  case sECTIONNAV = "SECTION_NAV"
  case pRIMARYWORKLIST = "PRIMARY_WORKLIST"
  case wORKSPACEHEADER = "WORKSPACE_HEADER"
  case aTTENTIONSUMMARY = "ATTENTION_SUMMARY"
  case rISKLEDGER = "RISK_LEDGER"
  case lEADINGSIDEBAR = "LEADING_SIDEBAR"
  case pRIMARYCANVAS = "PRIMARY_CANVAS"
  case tRAILINGINSPECTOR = "TRAILING_INSPECTOR"
  case iDENTITYHEADER = "IDENTITY_HEADER"
  case sUMMARYCARD = "SUMMARY_CARD"
  case dETAILBODY = "DETAIL_BODY"
}

public enum SemanticAccessibilityContractFocusRegionCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
  case pORTALHEADER = "PORTAL_HEADER"
  case sTATUSHERO = "STATUS_HERO"
  case pRIMARYACTION = "PRIMARY_ACTION"
  case pROMOTEDSUPPORTREGION = "PROMOTED_SUPPORT_REGION"
  case sUPPORTINGDETAIL = "SUPPORTING_DETAIL"
  case sECTIONNAV = "SECTION_NAV"
  case pRIMARYWORKLIST = "PRIMARY_WORKLIST"
  case wORKSPACEHEADER = "WORKSPACE_HEADER"
  case aTTENTIONSUMMARY = "ATTENTION_SUMMARY"
  case pROMOTEDAUXILIARYSURFACE = "PROMOTED_AUXILIARY_SURFACE"
  case lEADINGSIDEBAR = "LEADING_SIDEBAR"
  case pRIMARYCANVAS = "PRIMARY_CANVAS"
  case tRAILINGINSPECTOR = "TRAILING_INSPECTOR"
  case iDENTITYHEADER = "IDENTITY_HEADER"
  case sUMMARYCARD = "SUMMARY_CARD"
  case dETAILBODY = "DETAIL_BODY"
}

public enum SemanticAccessibilityContractAnnouncedChangeKind: String, Codable, Sendable {
  case aCTIVITYDELTA = "ACTIVITY_DELTA"
  case bADGEDELTA = "BADGE_DELTA"
  case lIMITATIONNOTICE = "LIMITATION_NOTICE"
  case rECOVERYNOTICE = "RECOVERY_NOTICE"
  case cOMMANDFAILURE = "COMMAND_FAILURE"
  case tERMINALSETTLEMENT = "TERMINAL_SETTLEMENT"
}

public enum SemanticAccessibilityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json"
  public static let sourceHash = "83be304f9b057ad506807e18b1018f2274c02aa0eb32fd564931c6c4a29c567c"
}

public struct SemanticAccessibilityRegressionPack: Codable, Sendable {
  public let contract_version: JSONValue
  public let pack_id: String
  public let deterministic_seed: Int
  public let suite_profile: JSONValue
  public let run_mode: JSONValue
  public let modality_policy: JSONValue
  public let identifier_binding_policy: JSONValue
  public let landmark_heading_policy: JSONValue
  public let live_update_announcement_policy: JSONValue
  public let support_surface_policy: JSONValue
  public let transition_stability_policy: JSONValue
  public let return_path_policy: JSONValue
  public let cases: [SemanticAccessibilityRegressionPackRegressionCase]

  public init(
    contract_version: JSONValue,
    pack_id: String,
    deterministic_seed: Int,
    suite_profile: JSONValue,
    run_mode: JSONValue,
    modality_policy: JSONValue,
    identifier_binding_policy: JSONValue,
    landmark_heading_policy: JSONValue,
    live_update_announcement_policy: JSONValue,
    support_surface_policy: JSONValue,
    transition_stability_policy: JSONValue,
    return_path_policy: JSONValue,
    cases: [SemanticAccessibilityRegressionPackRegressionCase]
  ) {
    self.contract_version = contract_version
    self.pack_id = pack_id
    self.deterministic_seed = deterministic_seed
    self.suite_profile = suite_profile
    self.run_mode = run_mode
    self.modality_policy = modality_policy
    self.identifier_binding_policy = identifier_binding_policy
    self.landmark_heading_policy = landmark_heading_policy
    self.live_update_announcement_policy = live_update_announcement_policy
    self.support_surface_policy = support_surface_policy
    self.transition_stability_policy = transition_stability_policy
    self.return_path_policy = return_path_policy
    self.cases = cases
  }
}

public enum SemanticAccessibilityRegressionPackSurfaceType: String, Codable, Sendable {
  case lowNoiseExperienceFrame = "LowNoiseExperienceFrame"
  case workspaceSnapshot = "WorkspaceSnapshot"
  case clientPortalWorkspace = "ClientPortalWorkspace"
  case tenantGovernanceSnapshot = "TenantGovernanceSnapshot"
  case nativeOperatorWorkspaceScene = "NativeOperatorWorkspaceScene"
  case nativeOperatorSecondaryWindowScene = "NativeOperatorSecondaryWindowScene"
}

public enum SemanticAccessibilityRegressionPackShellFamily: String, Codable, Sendable {
  case cALMSHELL = "CALM_SHELL"
  case cLIENTPORTALSHELL = "CLIENT_PORTAL_SHELL"
  case gOVERNANCEDENSITYSHELL = "GOVERNANCE_DENSITY_SHELL"
}

public enum SemanticAccessibilityRegressionPackSelectorProfile: String, Codable, Sendable {
  case oPERATORSEMANTICSELECTORSV1 = "OPERATOR_SEMANTIC_SELECTORS_V1"
  case pORTALSEMANTICSELECTORSV1 = "PORTAL_SEMANTIC_SELECTORS_V1"
  case gOVERNANCESEMANTICSELECTORSV1 = "GOVERNANCE_SEMANTIC_SELECTORS_V1"
}

public enum SemanticAccessibilityRegressionPackAutomationHarness: String, Codable, Sendable {
  case pLAYWRIGHT = "PLAYWRIGHT"
  case xCUITEST = "XCUITEST"
}

public enum SemanticAccessibilityRegressionPackModality: String, Codable, Sendable {
  case kEYBOARDONLY = "KEYBOARD_ONLY"
  case sCREENREADER = "SCREEN_READER"
  case rEDUCEDMOTION = "REDUCED_MOTION"
}

public enum SemanticAccessibilityRegressionPackTransitionClass: String, Codable, Sendable {
  case rESPONSIVERESTACK = "RESPONSIVE_RESTACK"
  case rEBASE = "REBASE"
  case rECONNECT = "RECONNECT"
  case sUPPORTREGIONCOLLAPSE = "SUPPORT_REGION_COLLAPSE"
  case lIVEUPDATE = "LIVE_UPDATE"
  case sECONDARYWINDOWRETURN = "SECONDARY_WINDOW_RETURN"
}

public enum SemanticAccessibilityRegressionPackAnnouncementMode: String, Codable, Sendable {
  case pOLITE = "POLITE"
  case aSSERTIVE = "ASSERTIVE"
}

public struct SemanticAccessibilityRegressionPackAnchorBinding: Codable, Sendable {
  public let anchor_code: String
  public let semantic_anchor_ref: String
  public let browser_identifier_or_null: String?
  public let native_identifier_or_null: String?
  public let heading_level_or_null: Int?
  public let landmark_role_or_null: String?

  public init(
    anchor_code: String,
    semantic_anchor_ref: String,
    browser_identifier_or_null: String?,
    native_identifier_or_null: String?,
    heading_level_or_null: Int?,
    landmark_role_or_null: String?
  ) {
    self.anchor_code = anchor_code
    self.semantic_anchor_ref = semantic_anchor_ref
    self.browser_identifier_or_null = browser_identifier_or_null
    self.native_identifier_or_null = native_identifier_or_null
    self.heading_level_or_null = heading_level_or_null
    self.landmark_role_or_null = landmark_role_or_null
  }
}

public struct SemanticAccessibilityRegressionPackRegressionCase: Codable, Sendable {
  public let case_id: String
  public let surface_type: SemanticAccessibilityRegressionPackSurfaceType
  public let shell_family: SemanticAccessibilityRegressionPackShellFamily
  public let selector_profile: SemanticAccessibilityRegressionPackSelectorProfile
  public let automation_harness: SemanticAccessibilityRegressionPackAutomationHarness
  public let covered_modalities: [SemanticAccessibilityRegressionPackModality]
  public let transition_classes: [SemanticAccessibilityRegressionPackTransitionClass]
  public let required_anchor_codes: [String]
  public let semantic_focus_order: [String]
  public let announced_change_kinds: [String]
  public let anchor_bindings: [SemanticAccessibilityRegressionPackAnchorBinding]
  public let landmark_anchor_codes_in_order: [String]
  public let heading_anchor_codes_in_order: [String]
  public let focus_entry_anchor_ref: String
  public let keyboard_path_anchor_refs: [String]
  public let screen_reader_anchor_codes_in_order: [String]
  public let live_update_change_kind_or_null: String?
  public let live_region_mode_or_null: String?
  public let live_update_focus_theft_detected: Bool
  public let excessive_live_noise_detected: Bool
  public let support_surface_kind_or_null: String?
  public let support_surface_keyboard_reachable: Bool
  public let support_surface_keyboard_dismissible: Bool
  public let support_surface_modal_trap_detected: Bool
  public let return_path_anchor_code_or_null: String?
  public let reduced_motion_semantics_preserved: Bool
  public let reduced_motion_recovery_story_matches_default: Bool

  public init(
    case_id: String,
    surface_type: SemanticAccessibilityRegressionPackSurfaceType,
    shell_family: SemanticAccessibilityRegressionPackShellFamily,
    selector_profile: SemanticAccessibilityRegressionPackSelectorProfile,
    automation_harness: SemanticAccessibilityRegressionPackAutomationHarness,
    covered_modalities: [SemanticAccessibilityRegressionPackModality],
    transition_classes: [SemanticAccessibilityRegressionPackTransitionClass],
    required_anchor_codes: [String],
    semantic_focus_order: [String],
    announced_change_kinds: [String],
    anchor_bindings: [SemanticAccessibilityRegressionPackAnchorBinding],
    landmark_anchor_codes_in_order: [String],
    heading_anchor_codes_in_order: [String],
    focus_entry_anchor_ref: String,
    keyboard_path_anchor_refs: [String],
    screen_reader_anchor_codes_in_order: [String],
    live_update_change_kind_or_null: String?,
    live_region_mode_or_null: String?,
    live_update_focus_theft_detected: Bool,
    excessive_live_noise_detected: Bool,
    support_surface_kind_or_null: String?,
    support_surface_keyboard_reachable: Bool,
    support_surface_keyboard_dismissible: Bool,
    support_surface_modal_trap_detected: Bool,
    return_path_anchor_code_or_null: String?,
    reduced_motion_semantics_preserved: Bool,
    reduced_motion_recovery_story_matches_default: Bool
  ) {
    self.case_id = case_id
    self.surface_type = surface_type
    self.shell_family = shell_family
    self.selector_profile = selector_profile
    self.automation_harness = automation_harness
    self.covered_modalities = covered_modalities
    self.transition_classes = transition_classes
    self.required_anchor_codes = required_anchor_codes
    self.semantic_focus_order = semantic_focus_order
    self.announced_change_kinds = announced_change_kinds
    self.anchor_bindings = anchor_bindings
    self.landmark_anchor_codes_in_order = landmark_anchor_codes_in_order
    self.heading_anchor_codes_in_order = heading_anchor_codes_in_order
    self.focus_entry_anchor_ref = focus_entry_anchor_ref
    self.keyboard_path_anchor_refs = keyboard_path_anchor_refs
    self.screen_reader_anchor_codes_in_order = screen_reader_anchor_codes_in_order
    self.live_update_change_kind_or_null = live_update_change_kind_or_null
    self.live_region_mode_or_null = live_region_mode_or_null
    self.live_update_focus_theft_detected = live_update_focus_theft_detected
    self.excessive_live_noise_detected = excessive_live_noise_detected
    self.support_surface_kind_or_null = support_surface_kind_or_null
    self.support_surface_keyboard_reachable = support_surface_keyboard_reachable
    self.support_surface_keyboard_dismissible = support_surface_keyboard_dismissible
    self.support_surface_modal_trap_detected = support_surface_modal_trap_detected
    self.return_path_anchor_code_or_null = return_path_anchor_code_or_null
    self.reduced_motion_semantics_preserved = reduced_motion_semantics_preserved
    self.reduced_motion_recovery_story_matches_default = reduced_motion_recovery_story_matches_default
  }
}

public enum SemanticAccessibilityRegressionPackSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/semantic_accessibility_regression_pack.schema.json"
  public static let sourceHash = "448a34f8195646d69811f038825b487582e94b3d4d8ede6ba92cde30f8fc7fe3"
}

public struct ShellContinuityFuzzHarness: Codable, Sendable {
  public let contract_version: JSONValue
  public let harness_id: String
  public let deterministic_seed: Int
  public let suite_profile: JSONValue
  public let run_mode: JSONValue
  public let shrink_policy: JSONValue
  public let coverage_policy: JSONValue
  public let continuity_invariant_policy: JSONValue
  public let inline_recovery_policy: JSONValue
  public let action_meaning_policy: JSONValue
  public let native_return_policy: JSONValue
  public let cases: [ShellContinuityFuzzHarnessFuzzCase]

  public init(
    contract_version: JSONValue,
    harness_id: String,
    deterministic_seed: Int,
    suite_profile: JSONValue,
    run_mode: JSONValue,
    shrink_policy: JSONValue,
    coverage_policy: JSONValue,
    continuity_invariant_policy: JSONValue,
    inline_recovery_policy: JSONValue,
    action_meaning_policy: JSONValue,
    native_return_policy: JSONValue,
    cases: [ShellContinuityFuzzHarnessFuzzCase]
  ) {
    self.contract_version = contract_version
    self.harness_id = harness_id
    self.deterministic_seed = deterministic_seed
    self.suite_profile = suite_profile
    self.run_mode = run_mode
    self.shrink_policy = shrink_policy
    self.coverage_policy = coverage_policy
    self.continuity_invariant_policy = continuity_invariant_policy
    self.inline_recovery_policy = inline_recovery_policy
    self.action_meaning_policy = action_meaning_policy
    self.native_return_policy = native_return_policy
    self.cases = cases
  }
}

public enum ShellContinuityFuzzHarnessSurfaceType: String, Codable, Sendable {
  case lowNoiseExperienceFrame = "LowNoiseExperienceFrame"
  case workspaceSnapshot = "WorkspaceSnapshot"
  case clientPortalWorkspace = "ClientPortalWorkspace"
  case tenantGovernanceSnapshot = "TenantGovernanceSnapshot"
  case nativeOperatorWorkspaceScene = "NativeOperatorWorkspaceScene"
  case nativeOperatorSecondaryWindowScene = "NativeOperatorSecondaryWindowScene"
}

public enum ShellContinuityFuzzHarnessContinuityScope: String, Codable, Sendable {
  case mANIFESTROUTE = "MANIFEST_ROUTE"
  case wORKSPACEROUTE = "WORKSPACE_ROUTE"
  case cLIENTPORTALROUTE = "CLIENT_PORTAL_ROUTE"
  case gOVERNANCEROUTE = "GOVERNANCE_ROUTE"
  case nATIVEPRIMARYSCENE = "NATIVE_PRIMARY_SCENE"
  case nATIVESECONDARYWINDOW = "NATIVE_SECONDARY_WINDOW"
}

public enum ShellContinuityFuzzHarnessShellFamily: String, Codable, Sendable {
  case cALMSHELL = "CALM_SHELL"
  case cLIENTPORTALSHELL = "CLIENT_PORTAL_SHELL"
  case gOVERNANCEDENSITYSHELL = "GOVERNANCE_DENSITY_SHELL"
}

public enum ShellContinuityFuzzHarnessPerturbation: String, Codable, Sendable {
  case rEBASE = "REBASE"
  case rECONNECT = "RECONNECT"
  case rESIZEWIDETONARROW = "RESIZE_WIDE_TO_NARROW"
  case rESIZENARROWTOWIDE = "RESIZE_NARROW_TO_WIDE"
  case rESPONSIVECOLLAPSE = "RESPONSIVE_COLLAPSE"
  case sTREAMCATCHUP = "STREAM_CATCH_UP"
  case fRAMEEPOCHADVANCE = "FRAME_EPOCH_ADVANCE"
  case nATIVESCENERESTORE = "NATIVE_SCENE_RESTORE"
  case sECONDARYWINDOWRESTORE = "SECONDARY_WINDOW_RESTORE"
}

public enum ShellContinuityFuzzHarnessAssertedInvariant: String, Codable, Sendable {
  case sHELLFAMILY = "SHELL_FAMILY"
  case rOUTEIDENTITY = "ROUTE_IDENTITY"
  case oBJECTANCHOR = "OBJECT_ANCHOR"
  case dOMINANTQUESTION = "DOMINANT_QUESTION"
  case sETTLEMENTSTATE = "SETTLEMENT_STATE"
  case aCTIVECONTEXT = "ACTIVE_CONTEXT"
  case fOCUSANCHOR = "FOCUS_ANCHOR"
  case rETURNFOCUSANCHOR = "RETURN_FOCUS_ANCHOR"
  case dOMINANTMEANING = "DOMINANT_MEANING"
}

public struct ShellContinuityFuzzHarnessStateSnapshot: Codable, Sendable {
  public let route_identity_ref: String
  public let canonical_object_ref: String
  public let shell_family: ShellContinuityFuzzHarnessShellFamily
  public let dominant_question: String
  public let dominant_meaning_ref_or_null: String?
  public let settlement_state_or_null: String?
  public let recovery_posture_or_null: String?
  public let active_context_ref_or_null: String?
  public let focus_anchor_ref_or_null: String?
  public let return_focus_anchor_ref_or_null: String?

  public init(
    route_identity_ref: String,
    canonical_object_ref: String,
    shell_family: ShellContinuityFuzzHarnessShellFamily,
    dominant_question: String,
    dominant_meaning_ref_or_null: String?,
    settlement_state_or_null: String?,
    recovery_posture_or_null: String?,
    active_context_ref_or_null: String?,
    focus_anchor_ref_or_null: String?,
    return_focus_anchor_ref_or_null: String?
  ) {
    self.route_identity_ref = route_identity_ref
    self.canonical_object_ref = canonical_object_ref
    self.shell_family = shell_family
    self.dominant_question = dominant_question
    self.dominant_meaning_ref_or_null = dominant_meaning_ref_or_null
    self.settlement_state_or_null = settlement_state_or_null
    self.recovery_posture_or_null = recovery_posture_or_null
    self.active_context_ref_or_null = active_context_ref_or_null
    self.focus_anchor_ref_or_null = focus_anchor_ref_or_null
    self.return_focus_anchor_ref_or_null = return_focus_anchor_ref_or_null
  }
}

public struct ShellContinuityFuzzHarnessFuzzCase: Codable, Sendable {
  public let case_id: String
  public let surface_type: ShellContinuityFuzzHarnessSurfaceType
  public let continuity_scope: ShellContinuityFuzzHarnessContinuityScope
  public let shell_family: ShellContinuityFuzzHarnessShellFamily
  public let truth_change_detected: Bool
  public let perturbations: [ShellContinuityFuzzHarnessPerturbation]
  public let shrink_sequence: [ShellContinuityFuzzHarnessPerturbation]
  public let expected_outcome: String
  public let expected_inline_recovery_reason_or_null: String?
  public let asserted_invariants: [ShellContinuityFuzzHarnessAssertedInvariant]
  public let pre_state: ShellContinuityFuzzHarnessStateSnapshot
  public let post_state: ShellContinuityFuzzHarnessStateSnapshot

  public init(
    case_id: String,
    surface_type: ShellContinuityFuzzHarnessSurfaceType,
    continuity_scope: ShellContinuityFuzzHarnessContinuityScope,
    shell_family: ShellContinuityFuzzHarnessShellFamily,
    truth_change_detected: Bool,
    perturbations: [ShellContinuityFuzzHarnessPerturbation],
    shrink_sequence: [ShellContinuityFuzzHarnessPerturbation],
    expected_outcome: String,
    expected_inline_recovery_reason_or_null: String?,
    asserted_invariants: [ShellContinuityFuzzHarnessAssertedInvariant],
    pre_state: ShellContinuityFuzzHarnessStateSnapshot,
    post_state: ShellContinuityFuzzHarnessStateSnapshot
  ) {
    self.case_id = case_id
    self.surface_type = surface_type
    self.continuity_scope = continuity_scope
    self.shell_family = shell_family
    self.truth_change_detected = truth_change_detected
    self.perturbations = perturbations
    self.shrink_sequence = shrink_sequence
    self.expected_outcome = expected_outcome
    self.expected_inline_recovery_reason_or_null = expected_inline_recovery_reason_or_null
    self.asserted_invariants = asserted_invariants
    self.pre_state = pre_state
    self.post_state = post_state
  }
}

public enum ShellContinuityFuzzHarnessSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/shell_continuity_fuzz_harness.schema.json"
  public static let sourceHash = "d8b67626c4ad07ba4152195744702c3579235d468bcf22cdc379f1f60dc9cf51"
}

public struct ShellDominanceContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let summary_action_alignment_policy: JSONValue
  public let dominant_question_surface_code: ShellDominanceContractSurfaceCode
  public let dominant_action_surface_code: ShellDominanceContractSurfaceCode
  public let dominant_action_ref_or_null: String?
  public let safe_action_state: String
  public let promoted_support_surface_code_or_null: JSONValue
  public let support_surface_role: String
  public let supplemental_queue_policy: String
  public let parallel_primary_posture: JSONValue
  public let explicit_multifocus_mode: String
  public let renderer_salience_policy: JSONValue
  public let responsive_collapse_policy: JSONValue
  public let detached_support_policy: JSONValue

  public init(
    contract_version: JSONValue,
    summary_action_alignment_policy: JSONValue,
    dominant_question_surface_code: ShellDominanceContractSurfaceCode,
    dominant_action_surface_code: ShellDominanceContractSurfaceCode,
    dominant_action_ref_or_null: String?,
    safe_action_state: String,
    promoted_support_surface_code_or_null: JSONValue,
    support_surface_role: String,
    supplemental_queue_policy: String,
    parallel_primary_posture: JSONValue,
    explicit_multifocus_mode: String,
    renderer_salience_policy: JSONValue,
    responsive_collapse_policy: JSONValue,
    detached_support_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.summary_action_alignment_policy = summary_action_alignment_policy
    self.dominant_question_surface_code = dominant_question_surface_code
    self.dominant_action_surface_code = dominant_action_surface_code
    self.dominant_action_ref_or_null = dominant_action_ref_or_null
    self.safe_action_state = safe_action_state
    self.promoted_support_surface_code_or_null = promoted_support_surface_code_or_null
    self.support_surface_role = support_surface_role
    self.supplemental_queue_policy = supplemental_queue_policy
    self.parallel_primary_posture = parallel_primary_posture
    self.explicit_multifocus_mode = explicit_multifocus_mode
    self.renderer_salience_policy = renderer_salience_policy
    self.responsive_collapse_policy = responsive_collapse_policy
    self.detached_support_policy = detached_support_policy
  }
}

public enum ShellDominanceContractSurfaceCode: String, Codable, Sendable {
  case cONTEXTBAR = "CONTEXT_BAR"
  case dECISIONSUMMARY = "DECISION_SUMMARY"
  case aCTIONSTRIP = "ACTION_STRIP"
  case dETAILDRAWER = "DETAIL_DRAWER"
  case sTATUSHERO = "STATUS_HERO"
  case tASKQUEUE = "TASK_QUEUE"
  case dOCUMENTCENTER = "DOCUMENT_CENTER"
  case aPPROVALCENTER = "APPROVAL_CENTER"
  case sTEPWORKSPACE = "STEP_WORKSPACE"
  case sUPPORTPANEL = "SUPPORT_PANEL"
  case lIMITATIONNOTICE = "LIMITATION_NOTICE"
  case dRAFTRESUME = "DRAFT_RESUME"
  case aTTENTIONSUMMARY = "ATTENTION_SUMMARY"
  case wORKSPACECANVAS = "WORKSPACE_CANVAS"
  case aUDITSIDECAR = "AUDIT_SIDECAR"
  case bLASTRADIUSPANEL = "BLAST_RADIUS_PANEL"
  case dIFFPANEL = "DIFF_PANEL"
  case eXPORTELIGIBILITYPANEL = "EXPORT_ELIGIBILITY_PANEL"
  case aPPROVALPANEL = "APPROVAL_PANEL"
  case pRIMARYCANVAS = "PRIMARY_CANVAS"
  case tRAILINGINSPECTOR = "TRAILING_INSPECTOR"
}

public enum ShellDominanceContractSupportSurfaceCode: String, Codable, Sendable {
  case dETAILDRAWER = "DETAIL_DRAWER"
  case sUPPORTPANEL = "SUPPORT_PANEL"
  case lIMITATIONNOTICE = "LIMITATION_NOTICE"
  case dRAFTRESUME = "DRAFT_RESUME"
  case aUDITSIDECAR = "AUDIT_SIDECAR"
  case bLASTRADIUSPANEL = "BLAST_RADIUS_PANEL"
  case dIFFPANEL = "DIFF_PANEL"
  case eXPORTELIGIBILITYPANEL = "EXPORT_ELIGIBILITY_PANEL"
  case aPPROVALPANEL = "APPROVAL_PANEL"
  case tRAILINGINSPECTOR = "TRAILING_INSPECTOR"
}

public enum ShellDominanceContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/shell_dominance_contract.schema.json"
  public static let sourceHash = "dc69c82897d2e421cd337c3a719e8ea924fafbc739178aa535e3916dc71e4fa0"
}

public struct ShellStateTaxonomyContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let current_empty_state_or_null: JSONValue
  public let current_empty_surface_code_or_null: JSONValue
  public let limitation_reason_codes: [String]
  public let current_settlement_state: String
  public let current_recovery_posture: String
  public let mounted_context_state: String
  public let generic_placeholder_policy: JSONValue
  public let loading_strategy: JSONValue
  public let limitation_reason_policy: JSONValue
  public let stale_action_policy: JSONValue
  public let recovery_navigation_policy: JSONValue
  public let profile_copy_policy: JSONValue

  public init(
    contract_version: JSONValue,
    current_empty_state_or_null: JSONValue,
    current_empty_surface_code_or_null: JSONValue,
    limitation_reason_codes: [String],
    current_settlement_state: String,
    current_recovery_posture: String,
    mounted_context_state: String,
    generic_placeholder_policy: JSONValue,
    loading_strategy: JSONValue,
    limitation_reason_policy: JSONValue,
    stale_action_policy: JSONValue,
    recovery_navigation_policy: JSONValue,
    profile_copy_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.current_empty_state_or_null = current_empty_state_or_null
    self.current_empty_surface_code_or_null = current_empty_surface_code_or_null
    self.limitation_reason_codes = limitation_reason_codes
    self.current_settlement_state = current_settlement_state
    self.current_recovery_posture = current_recovery_posture
    self.mounted_context_state = mounted_context_state
    self.generic_placeholder_policy = generic_placeholder_policy
    self.loading_strategy = loading_strategy
    self.limitation_reason_policy = limitation_reason_policy
    self.stale_action_policy = stale_action_policy
    self.recovery_navigation_policy = recovery_navigation_policy
    self.profile_copy_policy = profile_copy_policy
  }
}

public enum ShellStateTaxonomyContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json"
  public static let sourceHash = "307e14e9eb39a2ad49c092cbc24d9a9ddf5fffb5b85f126647549f9ce3238e6e"
}

public struct WorkspaceCursor: Codable, Sendable {
  public let artifact_type: JSONValue
  public let cursor_scope_class: JSONValue
  public let cursor_id: String
  public let tenant_id: String
  public let principal_ref: String
  public let principal_class: String
  public let item_id: String
  public let workspace_route_key: String
  public let session_visibility_class: String
  public let shell_stability_token: String
  public let session_ref: String
  public let session_binding_hash: String
  public let access_binding_hash: String
  public let masking_posture_fingerprint: String
  public let frame_epoch: Int
  public let workspace_version: Int
  public let customer_head_sequence: Int
  public let internal_head_sequence_or_null: Int?
  public let request_state_version_or_null: Int?
  public let last_ack_sequence: Int
  public let last_published_sequence: Int
  public let latest_snapshot_ref: String
  public let resume_token_hash: String
  public let stream_recovery_contract: JSONValue
  public let native_cache_hydration_contract: NativeCacheHydrationContract
  public let stability_contract: RouteStabilityContract
  public let replacement_stability_contract_or_null: JSONValue
  public let cursor_state: String
  public let schema_compatibility_ref: String
  public let replacement_snapshot_ref: String?
  public let invalidation_reason_code: JSONValue
  public let invalidated_at: ISO8601DateTimeString
  public let last_seen_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    cursor_scope_class: JSONValue,
    cursor_id: String,
    tenant_id: String,
    principal_ref: String,
    principal_class: String,
    item_id: String,
    workspace_route_key: String,
    session_visibility_class: String,
    shell_stability_token: String,
    session_ref: String,
    session_binding_hash: String,
    access_binding_hash: String,
    masking_posture_fingerprint: String,
    frame_epoch: Int,
    workspace_version: Int,
    customer_head_sequence: Int,
    internal_head_sequence_or_null: Int?,
    request_state_version_or_null: Int?,
    last_ack_sequence: Int,
    last_published_sequence: Int,
    latest_snapshot_ref: String,
    resume_token_hash: String,
    stream_recovery_contract: JSONValue,
    native_cache_hydration_contract: NativeCacheHydrationContract,
    stability_contract: RouteStabilityContract,
    replacement_stability_contract_or_null: JSONValue,
    cursor_state: String,
    schema_compatibility_ref: String,
    replacement_snapshot_ref: String?,
    invalidation_reason_code: JSONValue,
    invalidated_at: ISO8601DateTimeString,
    last_seen_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.cursor_scope_class = cursor_scope_class
    self.cursor_id = cursor_id
    self.tenant_id = tenant_id
    self.principal_ref = principal_ref
    self.principal_class = principal_class
    self.item_id = item_id
    self.workspace_route_key = workspace_route_key
    self.session_visibility_class = session_visibility_class
    self.shell_stability_token = shell_stability_token
    self.session_ref = session_ref
    self.session_binding_hash = session_binding_hash
    self.access_binding_hash = access_binding_hash
    self.masking_posture_fingerprint = masking_posture_fingerprint
    self.frame_epoch = frame_epoch
    self.workspace_version = workspace_version
    self.customer_head_sequence = customer_head_sequence
    self.internal_head_sequence_or_null = internal_head_sequence_or_null
    self.request_state_version_or_null = request_state_version_or_null
    self.last_ack_sequence = last_ack_sequence
    self.last_published_sequence = last_published_sequence
    self.latest_snapshot_ref = latest_snapshot_ref
    self.resume_token_hash = resume_token_hash
    self.stream_recovery_contract = stream_recovery_contract
    self.native_cache_hydration_contract = native_cache_hydration_contract
    self.stability_contract = stability_contract
    self.replacement_stability_contract_or_null = replacement_stability_contract_or_null
    self.cursor_state = cursor_state
    self.schema_compatibility_ref = schema_compatibility_ref
    self.replacement_snapshot_ref = replacement_snapshot_ref
    self.invalidation_reason_code = invalidation_reason_code
    self.invalidated_at = invalidated_at
    self.last_seen_at = last_seen_at
    self.expires_at = expires_at
  }
}

public enum WorkspaceCursorSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/workspace_cursor.schema.json"
  public static let sourceHash = "5d5637c30712f2619950628f5fcdf541199d959b3ac62e4c51e93192dfaa034d"
}

public enum SurfaceAndExperienceBindingManifest {
  public static let familyRef = "SURFACE_AND_EXPERIENCE"
  public static let schemaCount = 26
}
