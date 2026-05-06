const persistedDashboard = {
  accepted_risk_owner_policy: "ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY",
  accepted_risk_posture: {
    accountable_owner_ref_or_null: "tenant-admin://taxat/ops-owner",
    accountable_owner_type_or_null: "TENANT_ADMIN",
    approval_ref_or_null: "accepted-risk-approval://risk-0154-preview",
    approver_ref_or_null: "approver://taxat/security-lead",
    approver_type_or_null: "SECURITY_OPERATOR",
    bounded_scope_refs: ["error://error-0154-root", "submission-record://preview-filing"],
    decision_basis_or_null: "EXPLICIT_APPROVAL",
    expires_at_or_null: "2026-06-03T10:00:00Z",
    revoked_at_or_null: null,
    state: "ACTIVE",
  },
  artifact_type: "FailureLifecycleDashboard",
  blocking_scope: {
    affected_object_refs: ["submission-record://preview-filing"],
    blocking_class: "BLOCKS_FILING",
    reason_codes: ["AUTHORITY_STATE_UNRESOLVED", "LIMITED_OPERATIONAL_CONTINUATION_ONLY"],
    workflow_item_ref_or_null: "workflow-item://workflow-0154-preview",
  },
  closure_posture: {
    closure_evidence_refs: [
      "evidence://investigation-0154/authority-reconciliation",
      "evidence://risk-0154/bounded-approval",
    ],
    resolution_basis_ref_or_null: "resolution-basis://risk-0154/approval",
    resolution_state: "ACCEPTED_RISK",
    resolved_at_or_null: "2026-05-03T10:00:00Z",
    resolved_by_task_id_or_null: "remediation-task://task-0154-preview",
  },
  compensation_posture: {
    active_compensation_ref_or_null: null,
    closure_evidence_refs: ["evidence://compensation-0154/verified-limited-state"],
    latest_compensation_ref_or_null: "compensation-record://compensation-0154-preview",
    resolution_basis_ref_or_null: "resolution-basis://compensation-0154/preserve-limit",
    state: "VERIFIED",
    target_object_refs: ["derived-artifact://preview-filing-state"],
    verification_ref_or_null: "verification://compensation-0154",
  },
  current_error_ref: "error://error-0154-current",
  current_lineage_state: "ACCEPTED_RISK_ACTIVE",
  current_owner: {
    owner_ref_or_null: "tenant-admin://taxat/ops-owner",
    owner_type: "TENANT_ADMIN",
    source_artifact_type: "ACCEPTED_RISK_APPROVAL",
    source_ref: "accepted-risk-approval://risk-0154-preview",
  },
  current_state_source: {
    source_artifact_type: "ACCEPTED_RISK_APPROVAL",
    source_ref: "accepted-risk-approval://risk-0154-preview",
    state_changed_at: "2026-05-03T10:00:00Z",
    state_code: "ACTIVE",
  },
  dashboard_id: "failure-dashboard-0154-preview",
  data_source_policy: "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
  first_opened_at: "2026-05-03T09:00:00Z",
  investigation_posture: {
    accepted_risk_approval_ref_or_null: "accepted-risk-approval://risk-0154-preview",
    active_investigation_ref_or_null: null,
    latest_investigation_ref_or_null: "failure-investigation://investigation-0154-preview",
    outcome_or_null: "ACCEPTED_RISK",
    state: "ACCEPTED_RISK",
  },
  last_activity_at: "2026-05-03T10:00:00Z",
  lineage_error_refs_in_order: ["error://error-0154-root", "error://error-0154-current"],
  lineage_refs: {
    accepted_risk_approval_refs: ["accepted-risk-approval://risk-0154-preview"],
    audit_refs: [
      "audit://failure-0154/investigation-opened",
      "audit://failure-0154/accepted-risk-approved",
    ],
    compensation_record_refs: ["compensation-record://compensation-0154-preview"],
    failure_investigation_refs: ["failure-investigation://investigation-0154-preview"],
    provenance_refs: [
      "provenance://failure-0154/root-error",
      "provenance://failure-0154/current-error",
    ],
    remediation_task_refs: ["remediation-task://task-0154-preview"],
    workflow_item_refs: ["workflow-item://workflow-0154-preview"],
  },
  log_reconstruction_policy: "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION",
  manifest_id: "manifest-0154-current",
  next_legal_action: {
    action_code_or_null: "REVIEW_ACCEPTED_RISK_EXPIRY",
    action_ref_or_null: "workflow-item://workflow-0154-preview",
    action_state: "REVIEW_DUE",
    due_at_or_null: "2026-06-03T10:00:00Z",
    reason_codes: ["ACCEPTED_RISK_EXPIRY_REVIEW_REQUIRED"],
    source_artifact_type_or_null: "WORKFLOW_ITEM",
    waiting_on_actor_or_null: "STAFF",
  },
  remediation_summary: {
    active_task_ref_or_null: null,
    due_at_or_null: "2026-05-03T09:45:00Z",
    error_resolution_effect_or_null: "ERROR_MOVES_TO_ACCEPTED_RISK",
    latest_task_ref_or_null: "remediation-task://task-0154-preview",
    task_owner_ref_or_null: "operator://workflow/remediation-owner",
    task_owner_type_or_null: "SERVICE_OPERATOR",
    task_state_or_null: "COMPLETED",
  },
  root_error_ref: "error://error-0154-root",
  root_manifest_id: "manifest-0154-root",
  underlying_error_visibility_policy: "UNDERLYING_ERROR_ALWAYS_VISIBLE",
  updated_at: "2026-05-03T10:05:00Z",
  workflow_coordination: {
    current_assignee_ref_or_null: "tenant-admin://taxat/ops-owner",
    customer_status_projection_or_null: "UNDER_REVIEW",
    lifecycle_state_or_null: "OPEN",
    waiting_on_actor_or_null: "STAFF",
    workflow_item_ref_or_null: "workflow-item://workflow-0154-preview",
  },
};

function text(id, value) {
  document.getElementById(id).textContent = value ?? "None";
}

function dl(id, rows) {
  const node = document.getElementById(id);
  node.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      if (value?.tone) {
        const status = document.createElement("span");
        status.className = "status";
        status.dataset.tone = value.tone;
        status.textContent = value.text;
        dd.append(status);
      } else {
        dd.textContent = value ?? "None";
      }
      return [dt, dd];
    }),
  );
}

function refs(id, values) {
  document.getElementById(id).textContent = values.join("\n");
}

function renderLineage(dashboard) {
  const ribbon = document.getElementById("lineage-ribbon");
  ribbon.replaceChildren(
    ...dashboard.lineage_error_refs_in_order.map((ref, index, refs) => {
      const segment = document.createElement("div");
      segment.className = "lineage-segment";
      segment.dataset.state =
        index === 0 ? "root" : index === refs.length - 1 ? "current" : "intermediate";
      const label = document.createElement("strong");
      const value = document.createElement("span");
      label.textContent = index === 0 ? "Root error" : index === refs.length - 1 ? "Current error" : `Hop ${index + 1}`;
      value.textContent = ref;
      segment.append(label, value);
      return segment;
    }),
  );
}

function render(dashboard) {
  text("dashboard-id", dashboard.dashboard_id);
  text("lineage-state", dashboard.current_lineage_state);
  text("updated-at", dashboard.updated_at);
  renderLineage(dashboard);

  dl("current-owner", [
    ["Owner type", { text: dashboard.current_owner.owner_type, tone: "teal" }],
    ["Owner ref", dashboard.current_owner.owner_ref_or_null],
    ["Source", dashboard.current_owner.source_artifact_type],
    ["Source ref", dashboard.current_owner.source_ref],
  ]);

  dl("next-action", [
    ["Action state", { text: dashboard.next_legal_action.action_state, tone: "amber" }],
    ["Action code", dashboard.next_legal_action.action_code_or_null],
    ["Action ref", dashboard.next_legal_action.action_ref_or_null],
    ["Due", dashboard.next_legal_action.due_at_or_null],
    ["Waiting on", dashboard.next_legal_action.waiting_on_actor_or_null],
  ]);

  dl("blocking-scope", [
    ["Class", { text: dashboard.blocking_scope.blocking_class, tone: "red" }],
    ["Reasons", dashboard.blocking_scope.reason_codes.join(", ")],
    ["Affected", dashboard.blocking_scope.affected_object_refs.join(", ")],
    ["Workflow", dashboard.blocking_scope.workflow_item_ref_or_null],
  ]);

  dl("compensation-posture", [
    ["State", dashboard.compensation_posture.state],
    ["Latest", dashboard.compensation_posture.latest_compensation_ref_or_null],
    ["Verification", dashboard.compensation_posture.verification_ref_or_null],
  ]);

  dl("investigation-posture", [
    ["State", dashboard.investigation_posture.state],
    ["Latest", dashboard.investigation_posture.latest_investigation_ref_or_null],
    ["Outcome", dashboard.investigation_posture.outcome_or_null],
  ]);

  dl("accepted-risk-posture", [
    ["State", { text: dashboard.accepted_risk_posture.state, tone: "amber" }],
    ["Approval", dashboard.accepted_risk_posture.approval_ref_or_null],
    ["Expiry", dashboard.accepted_risk_posture.expires_at_or_null],
    ["Owner", dashboard.accepted_risk_posture.accountable_owner_ref_or_null],
  ]);

  refs("workflow-refs", dashboard.lineage_refs.workflow_item_refs);
  refs("audit-refs", dashboard.lineage_refs.audit_refs);
  refs("provenance-refs", dashboard.lineage_refs.provenance_refs);
}

render(persistedDashboard);
