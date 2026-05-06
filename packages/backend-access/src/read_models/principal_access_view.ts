import type {
  PrincipalAccessView as SchemaPrincipalAccessView,
  PrincipalAccessViewAccessWorkspace,
  PrincipalAccessViewActionMatrixCell,
  PrincipalAccessViewRecoveryPosture,
  PrincipalAccessViewSelectedActionDetail,
  PrincipalAccessViewSettlementState,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type PrincipalAccessViewRecord = SchemaPrincipalAccessView;

export type CreatePrincipalAccessViewInput = PrincipalAccessViewRecord;

type PrincipalAccessViewModelErrorCode =
  | "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED"
  | "PRINCIPAL_ACCESS_VIEW_INVALID";

export class PrincipalAccessViewModelError extends Error {
  readonly code: PrincipalAccessViewModelErrorCode;

  constructor(code: PrincipalAccessViewModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalAccessViewModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: PrincipalAccessViewModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new PrincipalAccessViewModelError(code, detail);
  }
}

function normalizeSettlementState(value: unknown) {
  const state = requireTrimmedString(
    "settlement_state",
    value,
  ) as PrincipalAccessViewSettlementState;
  assertCondition(
    [
      "STEADY",
      "RECEIPT_PENDING",
      "FRESHENING",
      "STALE_REVIEW_REQUIRED",
      "DEGRADED_READ_ONLY",
      "RECOVERY_REQUIRED",
    ].includes(state),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "settlement_state must remain supported",
  );
  return state;
}

function normalizeRecoveryPosture(value: unknown) {
  const posture = requireTrimmedString(
    "recovery_posture",
    value,
  ) as PrincipalAccessViewRecoveryPosture;
  assertCondition(
    [
      "NONE",
      "INLINE_RECONNECT",
      "INLINE_REBASE",
      "READ_ONLY_LIMITED",
      "OBJECT_SUPERSEDED",
      "ACCESS_REBIND_REQUIRED",
    ].includes(posture),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "recovery_posture must remain supported",
  );
  return posture;
}

function normalizeDecision(value: unknown) {
  const decision = requireTrimmedString(
    "action_matrix.decision",
    value,
  ) as PrincipalAccessViewActionMatrixCell["decision"];
  assertCondition(
    [
      "ALLOW",
      "ALLOW_MASKED",
      "REQUIRE_STEP_UP",
      "REQUIRE_APPROVAL",
      "DENY",
    ].includes(decision),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "action_matrix.decision must remain supported",
  );
  return decision;
}

function normalizeAuthnLevel(
  value: unknown,
): PrincipalAccessViewActionMatrixCell["required_authn_level"] {
  if (value === null) {
    return null;
  }
  const required_authn_level = requireTrimmedString(
    "required_authn_level",
    value,
  ) as Exclude<PrincipalAccessViewActionMatrixCell["required_authn_level"], null>;
  assertCondition(
    ["BASIC", "MFA", "STEP_UP"].includes(required_authn_level),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "required_authn_level must remain BASIC, MFA, STEP_UP, or null",
  );
  return required_authn_level;
}

function normalizeAuthorityChainLayers(
  value: PrincipalAccessViewActionMatrixCell["authority_chain_layers"],
) {
  assertCondition(
    Array.isArray(value) && value.length >= 4 && value.length <= 5,
    "PRINCIPAL_ACCESS_VIEW_INVALID",
    "authority_chain_layers must keep four required layers plus optional authority-of-record fifth layer",
  );
  const expectedLayerCodes = [
    "SESSION_AUTHN_POSTURE",
    "TENANT_OPERATIONAL_AUTHORITY",
    "CLIENT_DELEGATION_COVERAGE",
    "EXTERNAL_AUTHORITY_LINK_READINESS",
    "AUTHORITY_OF_RECORD_OUTCOME",
  ] as const;
  return value.map((layer, index) => {
    const layer_code = requireTrimmedString(
      `authority_chain_layers[${index}].layer_code`,
      layer.layer_code,
    );
    if (index < 4) {
      assertCondition(
        layer_code === expectedLayerCodes[index],
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        `authority_chain_layers[${index}] must preserve canonical order`,
      );
    } else {
      assertCondition(
        layer_code === "AUTHORITY_OF_RECORD_OUTCOME",
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "the optional fifth authority_chain layer must stay AUTHORITY_OF_RECORD_OUTCOME",
      );
    }
    const layer_outcome = requireTrimmedString(
      `authority_chain_layers[${index}].layer_outcome`,
      layer.layer_outcome,
    ) as PrincipalAccessViewActionMatrixCell["authority_chain_layers"][number]["layer_outcome"];
    assertCondition(
      [
        "ALLOW",
        "ALLOW_MASKED",
        "REQUIRE_STEP_UP",
        "REQUIRE_APPROVAL",
        "DENY",
        "NOT_APPLICABLE",
      ].includes(layer_outcome),
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      `authority_chain_layers[${index}].layer_outcome must remain supported`,
    );
    return {
      layer_code,
      layer_outcome,
      reason_codes: normalizeStringSet(
        `authority_chain_layers[${index}].reason_codes`,
        layer.reason_codes,
        { minItems: 1 },
      ),
    };
  }) as PrincipalAccessViewActionMatrixCell["authority_chain_layers"];
}

function normalizeActionMatrixCell(cell: PrincipalAccessViewActionMatrixCell) {
  const decision = normalizeDecision(cell.decision);
  const policy_path_ref =
    cell.policy_path_ref === null || cell.policy_path_ref === undefined
      ? null
      : requireTrimmedString("action_matrix.policy_path_ref", cell.policy_path_ref);
  const normalized = {
    cell_ref: requireTrimmedString("action_matrix.cell_ref", cell.cell_ref),
    resource_class: requireTrimmedString(
      "action_matrix.resource_class",
      cell.resource_class,
    ),
    action_family: requireTrimmedString(
      "action_matrix.action_family",
      cell.action_family,
    ),
    decision,
    reason_codes: normalizeStringSet("action_matrix.reason_codes", cell.reason_codes, {
      minItems: 1,
    }),
    effective_scope: normalizeScopeSequence(
      "action_matrix.effective_scope",
      cell.effective_scope,
      { allowEmpty: decision === "DENY" },
    ),
    masking_rules: normalizeStringSet("action_matrix.masking_rules", cell.masking_rules),
    required_approvals: normalizeStringSet(
      "action_matrix.required_approvals",
      cell.required_approvals,
    ),
    required_authn_level: normalizeAuthnLevel(cell.required_authn_level),
    policy_path_ref,
    authority_chain_layers: normalizeAuthorityChainLayers(cell.authority_chain_layers),
  } satisfies PrincipalAccessViewActionMatrixCell;

  if (decision === "DENY") {
    assertCondition(
      normalized.effective_scope.length === 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "DENY matrix cells must clear effective_scope",
    );
  } else {
    assertCondition(
      normalized.effective_scope.length > 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "non-DENY matrix cells must retain effective_scope",
    );
  }
  if (decision === "ALLOW_MASKED") {
    assertCondition(
      normalized.masking_rules.length > 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "ALLOW_MASKED matrix cells must retain masking_rules",
    );
  } else {
    assertCondition(
      normalized.masking_rules.length === 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "only ALLOW_MASKED matrix cells may retain masking_rules",
    );
  }
  if (decision === "REQUIRE_APPROVAL") {
    assertCondition(
      normalized.required_approvals.length > 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "REQUIRE_APPROVAL matrix cells must retain required_approvals",
    );
    assertCondition(
      normalized.required_authn_level === null,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "REQUIRE_APPROVAL matrix cells must clear required_authn_level",
    );
  } else {
    assertCondition(
      normalized.required_approvals.length === 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "only REQUIRE_APPROVAL matrix cells may retain required_approvals",
    );
  }
  if (decision === "REQUIRE_STEP_UP") {
    assertCondition(
      normalized.required_authn_level !== null &&
        normalized.required_authn_level !== "BASIC",
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "REQUIRE_STEP_UP matrix cells must retain MFA or STEP_UP authn requirement",
    );
  } else {
    assertCondition(
      normalized.required_authn_level === null,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "only REQUIRE_STEP_UP matrix cells may retain required_authn_level",
    );
  }
  return normalized;
}

function normalizeSelectedActionDetail(
  value: PrincipalAccessViewRecord["selected_action_detail"],
) {
  if (value === null) {
    return null;
  }
  return {
    panel_mode: "ACCESS_INSPECTOR" as const,
    ...normalizeActionMatrixCell(value),
    policy_path_ref: requireTrimmedString(
      "selected_action_detail.policy_path_ref",
      value.policy_path_ref,
    ),
  } satisfies PrincipalAccessViewSelectedActionDetail;
}

function normalizeAccessWorkspace(
  value: PrincipalAccessViewAccessWorkspace,
) {
  const workspace_mode = requireTrimmedString(
    "access_workspace.workspace_mode",
    value.workspace_mode,
  ) as PrincipalAccessViewAccessWorkspace["workspace_mode"];
  const inspector_state = requireTrimmedString(
    "access_workspace.inspector_state",
    value.inspector_state,
  ) as PrincipalAccessViewAccessWorkspace["inspector_state"];
  const promoted_support_surface = requireTrimmedString(
    "access_workspace.promoted_support_surface",
    value.promoted_support_surface,
  ) as PrincipalAccessViewAccessWorkspace["promoted_support_surface"];
  assertCondition(
    ["PRINCIPALS", "ROLES", "SIMULATOR"].includes(workspace_mode),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "workspace_mode must remain supported",
  );
  assertCondition(
    ["HIDDEN", "CELL_SELECTED", "ROLE_EDITING", "SIMULATION_SELECTED"].includes(
      inspector_state,
    ),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "inspector_state must remain supported",
  );
  assertCondition(
    ["AUDIT_SIDECAR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"].includes(
      promoted_support_surface,
    ),
    "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
    "promoted_support_surface must remain supported",
  );
  return {
    surface_order: [
      "PRINCIPAL_DIRECTORY",
      "WORKSPACE_CANVAS",
      "ACCESS_INSPECTOR",
      "AUTHORITY_CHAIN_PANEL",
      "POLICY_SIMULATOR",
    ] as const,
    workspace_mode,
    active_filters: {
      principal_types: normalizeStringSet(
        "access_workspace.active_filters.principal_types",
        value.active_filters.principal_types,
      ) as PrincipalAccessViewAccessWorkspace["active_filters"]["principal_types"],
      principal_states: normalizeStringSet(
        "access_workspace.active_filters.principal_states",
        value.active_filters.principal_states,
      ),
      role_refs: normalizeStringSet(
        "access_workspace.active_filters.role_refs",
        value.active_filters.role_refs,
      ),
      delegated_client_refs: normalizeStringSet(
        "access_workspace.active_filters.delegated_client_refs",
        value.active_filters.delegated_client_refs,
      ),
      recent_change_owner_refs: normalizeStringSet(
        "access_workspace.active_filters.recent_change_owner_refs",
        value.active_filters.recent_change_owner_refs,
      ),
    },
    selected_principal_ref:
      value.selected_principal_ref === null
        ? null
        : requireTrimmedString(
            "access_workspace.selected_principal_ref",
            value.selected_principal_ref,
          ),
    selected_role_template_ref:
      value.selected_role_template_ref === null
        ? null
        : requireTrimmedString(
            "access_workspace.selected_role_template_ref",
            value.selected_role_template_ref,
          ),
    selected_cell_ref:
      value.selected_cell_ref === null
        ? null
        : requireTrimmedString(
            "access_workspace.selected_cell_ref",
            value.selected_cell_ref,
          ),
    grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX" as const,
    inspector_state,
    promoted_support_surface,
    latest_simulation_ref:
      value.latest_simulation_ref === null
        ? null
        : requireTrimmedString(
            "access_workspace.latest_simulation_ref",
            value.latest_simulation_ref,
          ),
    role_editor_pending_change_refs: normalizeStringSet(
      "access_workspace.role_editor_pending_change_refs",
      value.role_editor_pending_change_refs,
    ),
  } satisfies PrincipalAccessViewAccessWorkspace;
}

export function normalizePrincipalAccessViewRecord(
  input: CreatePrincipalAccessViewInput,
): PrincipalAccessViewRecord {
  try {
    const principal_id = requireTrimmedString("principal_id", input.principal_id);
    const action_matrix = [...input.action_matrix].map((cell) => normalizeActionMatrixCell(cell));
    const cellByRef = new Map(action_matrix.map((cell) => [cell.cell_ref, cell] as const));
    const access_workspace = normalizeAccessWorkspace(input.access_workspace);
    const selected_action_detail = normalizeSelectedActionDetail(input.selected_action_detail);
    const focus_anchor_ref =
      input.focus_anchor_ref === null
        ? null
        : requireTrimmedString("focus_anchor_ref", input.focus_anchor_ref);
    const settlement_state = normalizeSettlementState(input.settlement_state);
    const recovery_posture = normalizeRecoveryPosture(input.recovery_posture);

    assertCondition(
      action_matrix.length > 0,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "action_matrix must retain at least one access cell",
    );
    assertCondition(
      cellByRef.size === action_matrix.length,
      "PRINCIPAL_ACCESS_VIEW_INVALID",
      "action_matrix.cell_ref must remain unique",
    );

    if (access_workspace.workspace_mode === "PRINCIPALS") {
      assertCondition(
        access_workspace.selected_principal_ref === principal_id,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "PRINCIPALS mode must keep selected_principal_ref aligned to principal_id",
      );
      assertCondition(
        access_workspace.selected_role_template_ref === null,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "PRINCIPALS mode must clear selected_role_template_ref",
      );
    }
    if (access_workspace.workspace_mode === "ROLES") {
      assertCondition(
        access_workspace.selected_role_template_ref !== null,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "ROLES mode must retain selected_role_template_ref",
      );
    } else {
      assertCondition(
        access_workspace.role_editor_pending_change_refs.length === 0,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "role_editor_pending_change_refs must clear outside ROLES mode",
      );
    }
    if (access_workspace.workspace_mode === "SIMULATOR") {
      assertCondition(
        access_workspace.latest_simulation_ref !== null,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "SIMULATOR mode must retain latest_simulation_ref",
      );
      assertCondition(
        access_workspace.promoted_support_surface === "POLICY_SIMULATOR",
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "SIMULATOR mode must promote POLICY_SIMULATOR",
      );
    } else {
      assertCondition(
        access_workspace.latest_simulation_ref === null,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "latest_simulation_ref must clear outside SIMULATOR mode",
      );
    }
    if (access_workspace.selected_cell_ref !== null) {
      assertCondition(
        focus_anchor_ref === access_workspace.selected_cell_ref,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "focus_anchor_ref must stay aligned to selected_cell_ref",
      );
      assertCondition(
        cellByRef.has(access_workspace.selected_cell_ref),
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "selected_cell_ref must resolve to one serialized matrix cell",
      );
      assertCondition(
        ["CELL_SELECTED", "ROLE_EDITING"].includes(access_workspace.inspector_state),
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "selected_cell_ref requires CELL_SELECTED or ROLE_EDITING inspector state",
      );
    }
    if (selected_action_detail !== null) {
      const matchingCell = cellByRef.get(selected_action_detail.cell_ref);
      assertCondition(
        matchingCell !== undefined,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "selected_action_detail.cell_ref must resolve to one serialized matrix cell",
      );
      assertCondition(
        access_workspace.selected_cell_ref === selected_action_detail.cell_ref,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "selected_action_detail.cell_ref must match access_workspace.selected_cell_ref",
      );
      assertCondition(
        JSON.stringify(matchingCell) ===
          JSON.stringify({
            cell_ref: selected_action_detail.cell_ref,
            resource_class: selected_action_detail.resource_class,
            action_family: selected_action_detail.action_family,
            decision: selected_action_detail.decision,
            reason_codes: selected_action_detail.reason_codes,
            effective_scope: selected_action_detail.effective_scope,
            masking_rules: selected_action_detail.masking_rules,
            required_approvals: selected_action_detail.required_approvals,
            required_authn_level: selected_action_detail.required_authn_level,
            policy_path_ref: selected_action_detail.policy_path_ref,
            authority_chain_layers: selected_action_detail.authority_chain_layers,
          }),
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "selected_action_detail must mirror the mounted matrix cell exactly",
      );
    }
    if (access_workspace.promoted_support_surface === "AUTHORITY_CHAIN_PANEL") {
      assertCondition(
        selected_action_detail !== null,
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "AUTHORITY_CHAIN_PANEL promotion requires selected_action_detail",
      );
    }
    if (settlement_state === "RECOVERY_REQUIRED") {
      assertCondition(
        recovery_posture !== "NONE",
        "PRINCIPAL_ACCESS_VIEW_INVALID",
        "RECOVERY_REQUIRED settlement must not keep recovery_posture NONE",
      );
    }

    return {
      ...input,
      tenant_id: requireTrimmedString("tenant_id", input.tenant_id),
      object_anchor_ref: requireTrimmedString("object_anchor_ref", input.object_anchor_ref),
      dominant_question: requireTrimmedString("dominant_question", input.dominant_question),
      settlement_state,
      recovery_posture,
      principal_id,
      principal_type: requireTrimmedString(
        "principal_type",
        input.principal_type,
      ) as PrincipalAccessViewRecord["principal_type"],
      effective_role_set: normalizeStringSet(
        "effective_role_set",
        input.effective_role_set,
        { minItems: 1 },
      ),
      delegation_summaries: [...input.delegation_summaries]
        .map((summary) => ({
          client_id: requireTrimmedString("delegation_summary.client_id", summary.client_id),
          delegation_basis: requireTrimmedString(
            "delegation_summary.delegation_basis",
            summary.delegation_basis,
          ) as PrincipalAccessViewRecord["delegation_summaries"][number]["delegation_basis"],
          scope_refs: normalizeStringSet("delegation_summary.scope_refs", summary.scope_refs, {
            minItems: 1,
          }),
          lifecycle_state: requireTrimmedString(
            "delegation_summary.lifecycle_state",
            summary.lifecycle_state,
          ),
          ...(summary.expires_at === undefined || summary.expires_at === null
            ? {}
            : { expires_at: normalizeUtcInstantString(summary.expires_at) }),
        }))
        .sort((left, right) => left.client_id.localeCompare(right.client_id)),
      authn_level: requireTrimmedString(
        "authn_level",
        input.authn_level,
      ) as PrincipalAccessViewRecord["authn_level"],
      approval_capabilities: normalizeStringSet(
        "approval_capabilities",
        input.approval_capabilities,
      ),
      run_kind_capabilities: normalizeStringSet(
        "run_kind_capabilities",
        input.run_kind_capabilities,
      ),
      action_matrix,
      focus_anchor_ref,
      access_workspace,
      selected_action_detail,
      last_step_up_at:
        input.last_step_up_at === null
          ? (null as unknown as PrincipalAccessViewRecord["last_step_up_at"])
          : normalizeUtcInstantString(input.last_step_up_at) as PrincipalAccessViewRecord["last_step_up_at"],
      last_modified_at: normalizeUtcInstantString(input.last_modified_at),
    };
  } catch (error) {
    if (error instanceof PrincipalAccessViewModelError) {
      throw error;
    }
    throw new PrincipalAccessViewModelError(
      "PRINCIPAL_ACCESS_VIEW_FIELD_REQUIRED",
      error instanceof Error ? error.message : "unknown principal access view normalization failure",
    );
  }
}
