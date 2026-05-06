import { expect, test } from "@playwright/test";

import {
  createCommandRequestTruthBoundaryContract,
  loadNorthboundPolicyBundle,
  type NorthboundActorContext,
  type NorthboundRouteState,
} from "../../../../apps/control-plane-api/src/northbound/index.ts";
import {
  ApiCommandReceiptRepository,
  ClientPortalWorkspaceRepository,
  getClientPortalOnboardingView,
  postCommandsEndpoint,
  type CommandEnvelope,
} from "../../../backend-northbound/src/index.ts";
import {
  buildClientPortalWorkspace,
  type BuildClientOnboardingJourneyInput,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

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

const tenantId = "tenant.onboarding-route-1";
const clientId = "client.onboarding-route-1";

function actorContext(): NorthboundActorContext {
  return {
    client_id_or_null: clientId,
    principal_ref: "principal.client-onboarding-1",
    session_ref: "session.portal-onboarding-1",
    tenant_id: tenantId,
  };
}

function onboardingInput(
  overrides: Partial<BuildClientOnboardingJourneyInput> = {},
): BuildClientOnboardingJourneyInput {
  return {
    accessBindingHash: "access.onboarding-route-1",
    authorityLinkRequirement: "REQUIRED",
    authorityLinkState: "LINKED",
    clientId,
    completedSteps: [
      "INVITE_ACCEPTANCE",
      "PROFILE_CONFIRMATION",
      "IDENTITY_VERIFICATION",
      "AUTHORITY_LINK_SETUP",
    ],
    documentRequestRefs: ["request.onboarding.route.documents"],
    invitedAt: "2026-05-01T09:00:00.000Z",
    journeyId: "onboarding.journey.route-1",
    languageContract,
    lifecycleState: "DOCUMENTS_PENDING",
    maskingPostureFingerprint: "mask.onboarding-route-1",
    requiredSteps: [
      "INVITE_ACCEPTANCE",
      "PROFILE_CONFIRMATION",
      "IDENTITY_VERIFICATION",
      "AUTHORITY_LINK_SETUP",
      "DOCUMENT_COLLECTION",
      "REVIEW_CONFIRMATION",
    ],
    stateChangedAt: "2026-05-04T09:00:00.000Z",
    tenantId,
    verificationState: "VERIFIED",
    visibilityCachePartitionKey: "visibility.onboarding-route-1",
    ...overrides,
  };
}

function onboardingRouteState(): NorthboundRouteState {
  return {
    guard_vector_components: {
      client_portal_workspace_version_or_null: 18,
      customer_thread_head_or_null: null,
      decision_bundle_hash_or_null: null,
      dependency_topology_hash_or_null: null,
      frame_epoch_or_null: null,
      internal_thread_head_or_null: null,
      mutation_basis_contract_hash_or_null: null,
      policy_snapshot_hash_or_null: null,
      request_state_version_or_null: null,
      shell_stability_token_or_null: null,
      simulation_basis_hash_or_null: null,
      view_guard_ref_or_null: "view.guard.onboarding.18",
      work_item_version_or_null: null,
    },
    last_published_sequence_or_null: null,
    latest_refs: {
      approval_pack_ref_or_null: null,
      client_portal_workspace_ref_or_null: "client-portal-workspace://route-1/v18",
      command_receipt_ref_or_null: null,
      decision_bundle_ref_or_null: null,
      policy_snapshot_ref_or_null: null,
      upload_session_ref_or_null: null,
      workspace_snapshot_ref_or_null: null,
    },
    publication_generation: 4,
    resume_capability: "SNAPSHOT_ONLY",
    resume_token_or_null: null,
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  };
}

async function staleCompleteOnboardingStepCommand(): Promise<CommandEnvelope> {
  const bundle = await loadNorthboundPolicyBundle();
  const family = bundle.commandFamiliesByType.get("CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP");
  if (!family) {
    throw new Error("CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP policy row missing");
  }
  return {
    actor_session_ref: "session.portal-onboarding-1",
    artifact_type: "CommandEnvelope",
    client_id: clientId,
    command_id: "command.onboarding.complete.001",
    command_type: "CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP",
    governance_target_ref: null,
    idempotency_key: "idem.onboarding.complete.001",
    if_match_approval_pack_hash: null,
    if_match_client_portal_workspace_version: 17,
    if_match_customer_head_sequence: null,
    if_match_decision_bundle_hash: null,
    if_match_dependency_topology_hash: null,
    if_match_frame_epoch: null,
    if_match_internal_head_sequence: null,
    if_match_policy_snapshot_hash: null,
    if_match_request_state_version: null,
    if_match_shell_stability_token: null,
    if_match_work_item_version: null,
    manifest_id: "manifest.onboarding-route-1",
    mutation_basis_contract: null,
    mutation_precondition_binding: family.mutation_precondition_binding,
    payload: {
      journey_id: "onboarding.journey.route-1",
      step_code: "DOCUMENT_COLLECTION",
    },
    period: null,
    requested_at: "2026-05-04T09:10:00.000Z",
    requested_scope: [],
    simulation_basis_hash: null,
    target_scope_class: "MANIFEST",
    tenant_id: tenantId,
    truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
    work_item_id: null,
  };
}

test("onboarding route publishes one current step and draft resume continuity", async () => {
  const repository = new ClientPortalWorkspaceRepository();
  const workspace = buildClientPortalWorkspace({
    clientId,
    onboardingJourney: onboardingInput({
      draftUploadSessionRefs: ["upload.onboarding.route-draft"],
    }),
    route: "HOME",
    tenantId,
  });
  await repository.persistWorkspace({ workspace });

  const view = await getClientPortalOnboardingView({
    clientId,
    clientPortalWorkspaceRepository: repository,
    tenantId,
  });

  expect(view).not.toBeNull();
  expect(view!.workspace.route).toBe("ONBOARDING");
  expect(view!.workspace.onboarding_journey).toMatchObject({
    current_step_code: "DOCUMENT_COLLECTION",
    resume_state: "LIVE",
    resume_step_code: "DOCUMENT_COLLECTION",
    step_workspace_state: "ACTIVE_STEP",
  });
  expect(view!.workspace.navigation_tabs.filter((tab) => tab.active)).toEqual([
    expect.objectContaining({ route: "ONBOARDING" }),
  ]);
  expect(view!.workspace.draft_resume).toMatchObject({
    draft_kind: "ONBOARDING",
    draft_object_ref: "onboarding.journey.route-1",
    draft_state: "ACTIVE",
    resume_route: "ONBOARDING",
  });
});

test("terminal onboarding removes the dedicated route and keeps completion summary posture", async () => {
  const repository = new ClientPortalWorkspaceRepository();
  const workspace = buildClientPortalWorkspace({
    clientId,
    onboardingJourney: onboardingInput({
      completedAt: "2026-05-04T10:00:00.000Z",
      completedSteps: [
        "INVITE_ACCEPTANCE",
        "PROFILE_CONFIRMATION",
        "IDENTITY_VERIFICATION",
        "AUTHORITY_LINK_SETUP",
        "DOCUMENT_COLLECTION",
        "REVIEW_CONFIRMATION",
      ],
      completionNextStepsRef: "copy.onboarding.route.next",
      completionSummaryRef: "copy.onboarding.route.summary",
      completionTimelineEventRef: "activity.onboarding.route.completed",
      lifecycleState: "COMPLETED",
      stateChangedAt: "2026-05-04T10:00:00.000Z",
    }),
    route: "HOME",
    tenantId,
  });
  await repository.persistWorkspace({ workspace });

  const view = await getClientPortalOnboardingView({
    clientId,
    clientPortalWorkspaceRepository: repository,
    tenantId,
  });

  expect(view).not.toBeNull();
  expect(view!.workspace.route).toBe("HOME");
  expect(view!.workspace.navigation_tabs.map((tab) => tab.route)).not.toContain("ONBOARDING");
  expect(view!.workspace.onboarding_journey).toMatchObject({
    completion_next_steps_ref: "copy.onboarding.route.next",
    completion_summary_ref: "copy.onboarding.route.summary",
    state: "COMPLETED",
    step_workspace_state: "COMPLETION_SUMMARY",
  });
});

test("stale onboarding step completion rejects against the latest workspace version", async () => {
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await staleCompleteOnboardingStepCommand(),
      correlationId: "corr.onboarding.complete.stale",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => new Date("2026-05-04T09:11:00.000Z"),
      receiptRepository: new ApiCommandReceiptRepository(),
      routeStateResolver: () => onboardingRouteState(),
    },
  );

  expect(response.status).toBe(409);
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("VIEW_STALE");
  expect(response.body.latest_client_portal_workspace_ref).toBe(
    "client-portal-workspace://route-1/v18",
  );
  expect(response.body.stale_guard_family).toBe("CLIENT_PORTAL_WORKSPACE_VERSION");
  expect(response.body.latest_stale_guard_value).toBe(18);
  expect(response.body.reason_codes).toContain("CLIENT_PORTAL_WORKSPACE_VERSION_MISMATCH");
  expect(response.body.suggested_detail_surface_code).toBe("CUSTOMER_ACTIVITY");

  await validateContractSchema("problem_envelope", response.body);
});
