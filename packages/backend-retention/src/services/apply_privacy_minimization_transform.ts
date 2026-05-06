import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
} from "../models/retention_tag.ts";

export type PrivacyMinimizationSurface =
  | "RUNTIME_VIEW"
  | "EXPORT"
  | "DIAGNOSTIC"
  | "SUPPORT_TOOL"
  | "RESTORE_REENTRY";

export type PrivacyFieldMode = "KEEP" | "MASK" | "HASH" | "DROP" | "REDACT" | "TOMBSTONE";

export type PrivacyMinimizationPolicy = {
  field: string;
  mode: PrivacyFieldMode;
  reason_code: string;
};

export type PrivacyMinimizationEntry = {
  field: string;
  mode: PrivacyFieldMode;
  reason_code: string;
};

export type CompensatingReErasurePosture = {
  compensating_re_erasure_state: "NOT_REQUIRED" | "REQUIRED_PENDING" | "BLOCKED";
  privacy_reconciliation_state:
    | "RECONCILED_NO_COMPENSATION_REQUIRED"
    | "COMPENSATING_RE_ERASURE_REQUIRED"
    | "BLOCKED_LEGAL_HOLD"
    | "BLOCKED_PROOF_PRESERVATION"
    | "BLOCKED_AUTHORITY_AMBIGUITY";
  workflow_ref_or_null: string | null;
  audit_ref_or_null: string | null;
  blocker_ref_or_null: string | null;
};

export type PrivacyMinimizationResult = {
  transformed_payload: Record<string, unknown>;
  minimization_entries: PrivacyMinimizationEntry[];
  compensating_re_erasure_posture: CompensatingReErasurePosture | null;
};

function minimizedValue(mode: PrivacyFieldMode, value: unknown) {
  switch (mode) {
    case "KEEP":
      return value;
    case "MASK":
      return "[MASKED]";
    case "HASH":
      return `minimized-hash://${stableJsonHash({ value })}`;
    case "REDACT":
      return "[REDACTED]";
    case "TOMBSTONE":
      return "[TOMBSTONED]";
    case "DROP":
      return undefined;
  }
}

function restorePosture(input: {
  audit_ref?: string;
  authority_ambiguity_ref?: string | null;
  legal_hold_ref?: string | null;
  proof_preservation_basis_ref?: string | null;
  resurrected_restricted_data: boolean;
  workflow_ref?: string;
}): CompensatingReErasurePosture {
  if (!input.resurrected_restricted_data) {
    return {
      compensating_re_erasure_state: "NOT_REQUIRED",
      privacy_reconciliation_state: "RECONCILED_NO_COMPENSATION_REQUIRED",
      workflow_ref_or_null: null,
      audit_ref_or_null: null,
      blocker_ref_or_null: null,
    };
  }
  if (input.legal_hold_ref) {
    return {
      compensating_re_erasure_state: "BLOCKED",
      privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD",
      workflow_ref_or_null: assertNonEmptyRetentionString("workflow_ref", input.workflow_ref),
      audit_ref_or_null: assertNonEmptyRetentionString("audit_ref", input.audit_ref),
      blocker_ref_or_null: input.legal_hold_ref,
    };
  }
  if (input.proof_preservation_basis_ref) {
    return {
      compensating_re_erasure_state: "BLOCKED",
      privacy_reconciliation_state: "BLOCKED_PROOF_PRESERVATION",
      workflow_ref_or_null: assertNonEmptyRetentionString("workflow_ref", input.workflow_ref),
      audit_ref_or_null: assertNonEmptyRetentionString("audit_ref", input.audit_ref),
      blocker_ref_or_null: input.proof_preservation_basis_ref,
    };
  }
  if (input.authority_ambiguity_ref) {
    return {
      compensating_re_erasure_state: "BLOCKED",
      privacy_reconciliation_state: "BLOCKED_AUTHORITY_AMBIGUITY",
      workflow_ref_or_null: assertNonEmptyRetentionString("workflow_ref", input.workflow_ref),
      audit_ref_or_null: assertNonEmptyRetentionString("audit_ref", input.audit_ref),
      blocker_ref_or_null: input.authority_ambiguity_ref,
    };
  }
  return {
    compensating_re_erasure_state: "REQUIRED_PENDING",
    privacy_reconciliation_state: "COMPENSATING_RE_ERASURE_REQUIRED",
    workflow_ref_or_null: assertNonEmptyRetentionString("workflow_ref", input.workflow_ref),
    audit_ref_or_null: assertNonEmptyRetentionString("audit_ref", input.audit_ref),
    blocker_ref_or_null: null,
  };
}

export function applyPrivacyMinimizationTransform(input: {
  payload: Record<string, unknown>;
  policies: readonly PrivacyMinimizationPolicy[];
  surface: PrivacyMinimizationSurface;
  audit_ref?: string;
  authority_ambiguity_ref?: string | null;
  legal_hold_ref?: string | null;
  proof_preservation_basis_ref?: string | null;
  resurrected_restricted_data?: boolean;
  workflow_ref?: string;
}): PrivacyMinimizationResult {
  const transformed: Record<string, unknown> = { ...input.payload };
  const entries: PrivacyMinimizationEntry[] = [];

  for (const policy of input.policies) {
    const field = assertNonEmptyRetentionString("privacy_policy.field", policy.field);
    const reasonCode = assertNonEmptyRetentionString(
      "privacy_policy.reason_code",
      policy.reason_code,
    );
    assertRetention(
      ["KEEP", "MASK", "HASH", "DROP", "REDACT", "TOMBSTONE"].includes(policy.mode),
      "RETENTION_FIELD_INVALID",
      "privacy minimization mode is invalid",
    );
    const nextValue = minimizedValue(policy.mode, transformed[field]);
    if (nextValue === undefined) {
      delete transformed[field];
    } else {
      transformed[field] = nextValue;
    }
    entries.push({
      field,
      mode: policy.mode,
      reason_code: reasonCode,
    });
  }

  return {
    transformed_payload: transformed,
    minimization_entries: entries,
    compensating_re_erasure_posture:
      input.surface === "RESTORE_REENTRY"
        ? restorePosture({
            audit_ref: input.audit_ref,
            authority_ambiguity_ref: input.authority_ambiguity_ref,
            legal_hold_ref: input.legal_hold_ref,
            proof_preservation_basis_ref: input.proof_preservation_basis_ref,
            resurrected_restricted_data: input.resurrected_restricted_data === true,
            workflow_ref: input.workflow_ref,
          })
        : null,
  };
}
