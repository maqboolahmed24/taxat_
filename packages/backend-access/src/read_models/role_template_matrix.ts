import type {
  RoleTemplateMatrix as SchemaRoleTemplateMatrix,
  RoleTemplateMatrixRecoveryPosture,
  RoleTemplateMatrixSettlementState,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type RoleTemplateMatrixRecord = SchemaRoleTemplateMatrix;

export type CreateRoleTemplateMatrixInput = RoleTemplateMatrixRecord;

type RoleTemplateMatrixModelErrorCode =
  | "ROLE_TEMPLATE_MATRIX_FIELD_REQUIRED"
  | "ROLE_TEMPLATE_MATRIX_INVALID";

export class RoleTemplateMatrixModelError extends Error {
  readonly code: RoleTemplateMatrixModelErrorCode;

  constructor(code: RoleTemplateMatrixModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RoleTemplateMatrixModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: RoleTemplateMatrixModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RoleTemplateMatrixModelError(code, detail);
  }
}

function normalizeSettlementState(value: unknown) {
  const state = requireTrimmedString(
    "settlement_state",
    value,
  ) as RoleTemplateMatrixSettlementState;
  assertCondition(
    [
      "STEADY",
      "RECEIPT_PENDING",
      "FRESHENING",
      "STALE_REVIEW_REQUIRED",
      "DEGRADED_READ_ONLY",
      "RECOVERY_REQUIRED",
    ].includes(state),
    "ROLE_TEMPLATE_MATRIX_FIELD_REQUIRED",
    "settlement_state must remain a supported role matrix posture",
  );
  return state;
}

function normalizeRecoveryPosture(value: unknown) {
  const posture = requireTrimmedString(
    "recovery_posture",
    value,
  ) as RoleTemplateMatrixRecoveryPosture;
  assertCondition(
    [
      "NONE",
      "INLINE_RECONNECT",
      "INLINE_REBASE",
      "READ_ONLY_LIMITED",
      "OBJECT_SUPERSEDED",
      "ACCESS_REBIND_REQUIRED",
    ].includes(posture),
    "ROLE_TEMPLATE_MATRIX_FIELD_REQUIRED",
    "recovery_posture must remain a supported role matrix recovery posture",
  );
  return posture;
}

function normalizeDecision(value: unknown) {
  const decision = requireTrimmedString(
    "matrix_cell.decision",
    value,
  ) as RoleTemplateMatrixRecord["matrix_cells"][number]["decision"];
  assertCondition(
    [
      "ALLOW",
      "ALLOW_MASKED",
      "REQUIRE_STEP_UP",
      "REQUIRE_APPROVAL",
      "DENY",
    ].includes(decision),
    "ROLE_TEMPLATE_MATRIX_FIELD_REQUIRED",
    "decision must remain a supported role matrix decision",
  );
  return decision;
}

function normalizeAuthnLevel(
  value: unknown,
): RoleTemplateMatrixRecord["matrix_cells"][number]["required_authn_level"] {
  if (value === null) {
    return null;
  }
  const required_authn_level = requireTrimmedString(
    "required_authn_level",
    value,
  ) as Exclude<
    RoleTemplateMatrixRecord["matrix_cells"][number]["required_authn_level"],
    null
  >;
  assertCondition(
    ["BASIC", "MFA", "STEP_UP"].includes(required_authn_level),
    "ROLE_TEMPLATE_MATRIX_FIELD_REQUIRED",
    "required_authn_level must remain BASIC, MFA, STEP_UP, or null",
  );
  return required_authn_level;
}

function normalizeCell(
  cell: RoleTemplateMatrixRecord["matrix_cells"][number],
) {
  const cell_ref = requireTrimmedString("matrix_cell.cell_ref", cell.cell_ref);
  return {
    cell_ref,
    resource_class: requireTrimmedString(
      "matrix_cell.resource_class",
      cell.resource_class,
    ),
    action_family: requireTrimmedString(
      "matrix_cell.action_family",
      cell.action_family,
    ),
    decision: normalizeDecision(cell.decision),
    reason_codes: normalizeStringSet("matrix_cell.reason_codes", cell.reason_codes, {
      minItems: 1,
    }),
    effective_scope: normalizeScopeSequence(
      "matrix_cell.effective_scope",
      cell.effective_scope,
      { allowEmpty: cell.decision === "DENY" },
    ),
    masking_rules: normalizeStringSet(
      "matrix_cell.masking_rules",
      cell.masking_rules,
    ),
    required_approvals: normalizeStringSet(
      "matrix_cell.required_approvals",
      cell.required_approvals,
    ),
    required_authn_level: normalizeAuthnLevel(cell.required_authn_level),
    policy_path_ref: requireTrimmedString(
      "matrix_cell.policy_path_ref",
      cell.policy_path_ref,
    ),
    pending_change_ref_or_null:
      cell.pending_change_ref_or_null === null
        ? null
        : requireTrimmedString(
            "matrix_cell.pending_change_ref_or_null",
            cell.pending_change_ref_or_null,
          ),
  } satisfies RoleTemplateMatrixRecord["matrix_cells"][number];
}

export function normalizeRoleTemplateMatrixRecord(
  input: CreateRoleTemplateMatrixInput,
): RoleTemplateMatrixRecord {
  try {
    const role_id = requireTrimmedString("role_id", input.role_id);
    const role_label = requireTrimmedString("role_label", input.role_label);
    const version_hash = requireTrimmedString("version_hash", input.version_hash);
    const policy_snapshot_hash = requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    );
    const selected_cell_ref =
      input.role_matrix_workspace.selected_cell_ref === null
        ? null
        : requireTrimmedString(
            "role_matrix_workspace.selected_cell_ref",
            input.role_matrix_workspace.selected_cell_ref,
          );
    const normalizedCells = [...input.matrix_cells]
      .map((cell) => normalizeCell(cell))
      .sort((left, right) => left.cell_ref.localeCompare(right.cell_ref));
    const cellRefs = new Set(normalizedCells.map((cell) => cell.cell_ref));
    const selected_action_detail =
      input.selected_action_detail === null
        ? null
        : {
            panel_mode: "ACCESS_INSPECTOR" as const,
            ...normalizeCell(input.selected_action_detail),
          };
    const focus_anchor_ref =
      input.focus_anchor_ref === null
        ? null
        : requireTrimmedString("focus_anchor_ref", input.focus_anchor_ref);

    if (selected_cell_ref !== null) {
      assertCondition(
        focus_anchor_ref === selected_cell_ref,
        "ROLE_TEMPLATE_MATRIX_INVALID",
        "focus_anchor_ref must stay aligned to selected_cell_ref",
      );
      assertCondition(
        cellRefs.has(selected_cell_ref),
        "ROLE_TEMPLATE_MATRIX_INVALID",
        "selected_cell_ref must resolve to one serialized matrix cell",
      );
    }

    if (selected_action_detail !== null) {
      assertCondition(
        cellRefs.has(selected_action_detail.cell_ref),
        "ROLE_TEMPLATE_MATRIX_INVALID",
        "selected_action_detail.cell_ref must resolve to one serialized matrix cell",
      );
      assertCondition(
        selected_cell_ref === selected_action_detail.cell_ref,
        "ROLE_TEMPLATE_MATRIX_INVALID",
        "selected_action_detail.cell_ref must match selected_cell_ref",
      );
    }

    return {
      artifact_type: "RoleTemplateMatrix",
      tenant_id: requireTrimmedString("tenant_id", input.tenant_id),
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      object_anchor_ref: requireTrimmedString(
        "object_anchor_ref",
        input.object_anchor_ref,
      ),
      dominant_question: requireTrimmedString(
        "dominant_question",
        input.dominant_question,
      ),
      settlement_state: normalizeSettlementState(input.settlement_state),
      recovery_posture: normalizeRecoveryPosture(input.recovery_posture),
      interaction_layer: structuredClone(input.interaction_layer),
      cache_isolation_contract: structuredClone(input.cache_isolation_contract),
      role_id,
      role_label,
      policy_snapshot_hash,
      version_hash,
      focus_anchor_ref,
      role_matrix_workspace: {
        surface_order: input.role_matrix_workspace.surface_order,
        active_filters: {
          resource_classes: normalizeStringSet(
            "role_matrix_workspace.active_filters.resource_classes",
            input.role_matrix_workspace.active_filters.resource_classes,
          ),
          action_families: normalizeStringSet(
            "role_matrix_workspace.active_filters.action_families",
            input.role_matrix_workspace.active_filters.action_families,
          ),
          decision_outcomes: [...input.role_matrix_workspace.active_filters.decision_outcomes],
        },
        selected_role_template_ref: role_id,
        selected_cell_ref,
        grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
        inspector_state: requireTrimmedString(
          "role_matrix_workspace.inspector_state",
          input.role_matrix_workspace.inspector_state,
        ) as RoleTemplateMatrixRecord["role_matrix_workspace"]["inspector_state"],
        promoted_support_surface: requireTrimmedString(
          "role_matrix_workspace.promoted_support_surface",
          input.role_matrix_workspace.promoted_support_surface,
        ) as RoleTemplateMatrixRecord["role_matrix_workspace"]["promoted_support_surface"],
        latest_simulation_ref:
          input.role_matrix_workspace.latest_simulation_ref === null
            ? null
            : requireTrimmedString(
                "role_matrix_workspace.latest_simulation_ref",
                input.role_matrix_workspace.latest_simulation_ref,
              ),
        role_editor_pending_change_refs: normalizeStringSet(
          "role_matrix_workspace.role_editor_pending_change_refs",
          input.role_matrix_workspace.role_editor_pending_change_refs,
        ),
      },
      matrix_rows: [...input.matrix_rows]
        .map((row) => ({
          resource_class: requireTrimmedString(
            "matrix_rows[].resource_class",
            row.resource_class,
          ),
          row_label: requireTrimmedString("matrix_rows[].row_label", row.row_label),
          cell_refs: normalizeStringSet("matrix_rows[].cell_refs", row.cell_refs, {
            minItems: 1,
          }),
        }))
        .sort((left, right) =>
          left.resource_class.localeCompare(right.resource_class),
        ),
      matrix_columns: [...input.matrix_columns]
        .map((column) => ({
          action_family: requireTrimmedString(
            "matrix_columns[].action_family",
            column.action_family,
          ),
          column_label: requireTrimmedString(
            "matrix_columns[].column_label",
            column.column_label,
          ),
        }))
        .sort((left, right) =>
          left.action_family.localeCompare(right.action_family),
        ),
      matrix_cells: normalizedCells,
      selected_action_detail,
      captured_at: normalizeUtcInstantString(input.captured_at),
    } satisfies RoleTemplateMatrixRecord;
  } catch (error) {
    if (error instanceof RoleTemplateMatrixModelError) {
      throw error;
    }
    throw new RoleTemplateMatrixModelError(
      "ROLE_TEMPLATE_MATRIX_INVALID",
      error instanceof Error ? error.message : String(error),
    );
  }
}
