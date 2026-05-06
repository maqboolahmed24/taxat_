import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  buildCanonicalHashVector,
  canonicalHashDigest,
  normalizeCanonicalNullableString,
  normalizeCanonicalStringSet,
  requireCanonicalString,
} from "./canonical_hash_serializer.ts";

export type RoleTemplateVersionHashRow = {
  cell_refs: readonly string[];
  resource_class: string;
  row_label: string;
};

export type RoleTemplateVersionHashColumn = {
  action_family: string;
  column_label: string;
};

export type RoleTemplateVersionHashCell = {
  action_family: string;
  cell_ref: string;
  decision: "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";
  effective_scope: readonly string[];
  masking_rules: readonly string[];
  pending_change_ref_or_null: string | null;
  policy_path_ref: string;
  reason_codes: readonly string[];
  required_approvals: readonly string[];
  required_authn_level: "BASIC" | "MFA" | "STEP_UP" | null;
  resource_class: string;
};

export type RoleTemplateVersionHashInput = {
  matrix_cells: readonly RoleTemplateVersionHashCell[];
  matrix_columns: readonly RoleTemplateVersionHashColumn[];
  matrix_rows: readonly RoleTemplateVersionHashRow[];
  policy_snapshot_hash: string;
  role_editor_pending_change_refs: readonly string[];
  role_id: string;
  role_label: string;
};

const decisionOrder = new Map(
  ["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"].map(
    (decision, index) => [decision, index] as const,
  ),
);

export function buildRoleTemplateVersionHashVector(
  input: RoleTemplateVersionHashInput,
) {
  const payload = {
    artifact_type: "RoleTemplateMatrix",
    role_matrix_contract_boundary: "ROLE_TEMPLATE_VERSION_HASH_V1",
    role_id: requireCanonicalString("role_id", input.role_id),
    role_label: requireCanonicalString("role_label", input.role_label),
    policy_snapshot_hash: requireCanonicalString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    matrix_rows: [...input.matrix_rows]
      .map((row) => ({
        resource_class: requireCanonicalString(
          "matrix_rows[].resource_class",
          row.resource_class,
        ),
        row_label: requireCanonicalString("matrix_rows[].row_label", row.row_label),
        cell_refs: normalizeCanonicalStringSet(
          "matrix_rows[].cell_refs",
          row.cell_refs,
          { minItems: 1 },
        ),
      }))
      .sort((left, right) =>
        left.resource_class.localeCompare(right.resource_class),
      ),
    matrix_columns: [...input.matrix_columns]
      .map((column) => ({
        action_family: requireCanonicalString(
          "matrix_columns[].action_family",
          column.action_family,
        ),
        column_label: requireCanonicalString(
          "matrix_columns[].column_label",
          column.column_label,
        ),
      }))
      .sort((left, right) =>
        left.action_family.localeCompare(right.action_family),
      ),
    matrix_cells: [...input.matrix_cells]
      .map((cell) => ({
        cell_ref: requireCanonicalString("matrix_cells[].cell_ref", cell.cell_ref),
        resource_class: requireCanonicalString(
          "matrix_cells[].resource_class",
          cell.resource_class,
        ),
        action_family: requireCanonicalString(
          "matrix_cells[].action_family",
          cell.action_family,
        ),
        decision: requireCanonicalString(
          "matrix_cells[].decision",
          cell.decision,
        ),
        reason_codes: normalizeCanonicalStringSet(
          "matrix_cells[].reason_codes",
          cell.reason_codes,
          { minItems: 1 },
        ),
        effective_scope: normalizeCanonicalStringSet(
          "matrix_cells[].effective_scope",
          cell.effective_scope,
        ),
        masking_rules: normalizeCanonicalStringSet(
          "matrix_cells[].masking_rules",
          cell.masking_rules,
        ),
        required_approvals: normalizeCanonicalStringSet(
          "matrix_cells[].required_approvals",
          cell.required_approvals,
        ),
        required_authn_level: normalizeCanonicalNullableString(
          "matrix_cells[].required_authn_level",
          cell.required_authn_level,
        ),
        policy_path_ref: requireCanonicalString(
          "matrix_cells[].policy_path_ref",
          cell.policy_path_ref,
        ),
        pending_change_ref_or_null: normalizeCanonicalNullableString(
          "matrix_cells[].pending_change_ref_or_null",
          cell.pending_change_ref_or_null,
        ),
      }))
      .sort((left, right) => {
        const leftDecisionOrder = decisionOrder.get(left.decision) ?? Number.MAX_SAFE_INTEGER;
        const rightDecisionOrder =
          decisionOrder.get(right.decision) ?? Number.MAX_SAFE_INTEGER;
        if (left.cell_ref !== right.cell_ref) {
          return left.cell_ref.localeCompare(right.cell_ref);
        }
        return leftDecisionOrder - rightDecisionOrder;
      }),
    role_editor_pending_change_refs: normalizeCanonicalStringSet(
      "role_editor_pending_change_refs",
      input.role_editor_pending_change_refs,
    ),
  } satisfies CanonicalJsonValue;

  return buildCanonicalHashVector(payload);
}

export function buildRoleTemplateVersionHash(
  input: RoleTemplateVersionHashInput,
) {
  return canonicalHashDigest(buildRoleTemplateVersionHashVector(input).payload);
}
