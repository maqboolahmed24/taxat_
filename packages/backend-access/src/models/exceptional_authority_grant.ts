import {
  asTaxatId,
  asTaxatRef,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type ExceptionalAuthorityGrantLifecycleState =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "EXHAUSTED"
  | "EXPIRED"
  | "REVOKED";

export type ExceptionalAuthorityGrantRecord = {
  artifact_type: "ExceptionalAuthorityGrant";
  exceptional_grant_id: string;
  incident_ref: string;
  target_action_family: string;
  tenant_id: string;
  client_id: string;
  partition_scope_refs: string[];
  requesting_principal_ref: string;
  requesting_principal_class: "HUMAN" | "EXTERNAL";
  approving_principal_ref: string;
  approving_principal_class: "HUMAN";
  activated_at: ISO8601DateTimeString | null;
  expires_at: ISO8601DateTimeString;
  revoked_at: ISO8601DateTimeString | null;
  usage_limit: number;
  remaining_uses: number;
  rationale: string;
  compensating_control_refs: string[];
  lifecycle_state: ExceptionalAuthorityGrantLifecycleState;
  approval_step_up_state: "SATISFIED";
  approval_step_up_evidence_ref: string;
  self_approved: false;
  authority_acknowledgement_override_permitted: false;
  delegation_substitution_permitted: false;
  silent_client_widening_permitted: false;
  declaration_sign_without_signatory_basis_permitted: false;
  truth_confirmation_override_permitted: false;
  silent_partition_widening_permitted: false;
};

export type CreateExceptionalAuthorityGrantInput = Omit<
  ExceptionalAuthorityGrantRecord,
  "artifact_type"
> & {
  artifact_type?: "ExceptionalAuthorityGrant";
};

type ExceptionalAuthorityGrantModelErrorCode =
  | "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED"
  | "EXCEPTIONAL_AUTHORITY_INVALID_CHRONOLOGY"
  | "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE"
  | "EXCEPTIONAL_AUTHORITY_INVALID_POSTURE"
  | "EXCEPTIONAL_AUTHORITY_SILENT_REBIND";

export class ExceptionalAuthorityGrantModelError extends Error {
  readonly code: ExceptionalAuthorityGrantModelErrorCode;

  constructor(code: ExceptionalAuthorityGrantModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ExceptionalAuthorityGrantModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: ExceptionalAuthorityGrantModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ExceptionalAuthorityGrantModelError(code, detail);
  }
}

function normalizeId(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatId(requireTrimmedString(label, value), family));
}

function normalizeRef(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatRef(requireTrimmedString(label, value), family));
}

function normalizeOptionalInstant(value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

export function normalizeExceptionalAuthorityGrantRecord(
  input: CreateExceptionalAuthorityGrantInput,
): ExceptionalAuthorityGrantRecord {
  try {
    const exceptional_grant_id = normalizeId(
      "exceptional_grant_id",
      input.exceptional_grant_id,
      "exceptional_authority_grant",
    );
    const incident_ref = normalizeRef("incident_ref", input.incident_ref, "incident");
    const target_action_family = requireTrimmedString(
      "target_action_family",
      input.target_action_family,
    );
    const tenant_id = normalizeId("tenant_id", input.tenant_id, "tenant");
    const client_id = normalizeId("client_id", input.client_id, "client");
    const partition_scope_refs = normalizeStringSet(
      "partition_scope_refs",
      input.partition_scope_refs ?? [],
    );
    const requesting_principal_ref = normalizeRef(
      "requesting_principal_ref",
      input.requesting_principal_ref,
      "principal",
    );
    const requesting_principal_class = requireTrimmedString(
      "requesting_principal_class",
      input.requesting_principal_class,
    ) as ExceptionalAuthorityGrantRecord["requesting_principal_class"];
    const approving_principal_ref = normalizeRef(
      "approving_principal_ref",
      input.approving_principal_ref,
      "principal",
    );
    const approving_principal_class = requireTrimmedString(
      "approving_principal_class",
      input.approving_principal_class,
    ) as ExceptionalAuthorityGrantRecord["approving_principal_class"];
    const activated_at = normalizeOptionalInstant(input.activated_at);
    const expires_at = normalizeUtcInstantString(input.expires_at);
    const revoked_at = normalizeOptionalInstant(input.revoked_at);
    const usage_limit = input.usage_limit;
    const remaining_uses = input.remaining_uses;
    const rationale = requireTrimmedString("rationale", input.rationale);
    const compensating_control_refs = normalizeStringSet(
      "compensating_control_refs",
      input.compensating_control_refs,
      {
        minItems: 1,
      },
    );
    const lifecycle_state = requireTrimmedString(
      "lifecycle_state",
      input.lifecycle_state,
    ) as ExceptionalAuthorityGrantLifecycleState;
    const approval_step_up_state = requireTrimmedString(
      "approval_step_up_state",
      input.approval_step_up_state,
    ) as ExceptionalAuthorityGrantRecord["approval_step_up_state"];
    const approval_step_up_evidence_ref = normalizeRef(
      "approval_step_up_evidence_ref",
      input.approval_step_up_evidence_ref,
      "step_up_evidence",
    );

    assertCondition(
      ["HUMAN", "EXTERNAL"].includes(requesting_principal_class),
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      "requesting_principal_class must remain HUMAN or EXTERNAL",
    );
    assertCondition(
      approving_principal_class === "HUMAN",
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      "approving_principal_class must remain HUMAN",
    );
    assertCondition(
      [
        "PENDING_APPROVAL",
        "ACTIVE",
        "EXHAUSTED",
        "EXPIRED",
        "REVOKED",
      ].includes(lifecycle_state),
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      "lifecycle_state must remain a supported exceptional-authority lifecycle",
    );
    assertCondition(
      approval_step_up_state === "SATISFIED",
      "EXCEPTIONAL_AUTHORITY_INVALID_POSTURE",
      "approval_step_up_state must remain SATISFIED",
    );
    assertCondition(
      requesting_principal_ref !== approving_principal_ref,
      "EXCEPTIONAL_AUTHORITY_INVALID_POSTURE",
      "requesting_principal_ref and approving_principal_ref must remain distinct",
    );
    assertCondition(
      input.self_approved === false &&
        input.authority_acknowledgement_override_permitted === false &&
        input.delegation_substitution_permitted === false &&
        input.silent_client_widening_permitted === false &&
        input.declaration_sign_without_signatory_basis_permitted === false &&
        input.truth_confirmation_override_permitted === false &&
        input.silent_partition_widening_permitted === false,
      "EXCEPTIONAL_AUTHORITY_INVALID_POSTURE",
      "exceptional authority prohibited escalations must remain false",
    );
    assertCondition(
      Number.isInteger(usage_limit) && usage_limit >= 1,
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      "usage_limit must be an integer >= 1",
    );
    assertCondition(
      Number.isInteger(remaining_uses) &&
        remaining_uses >= 0 &&
        remaining_uses <= usage_limit,
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      "remaining_uses must be an integer between 0 and usage_limit",
    );

    if (activated_at !== null) {
      assertCondition(
        expires_at >= activated_at,
        "EXCEPTIONAL_AUTHORITY_INVALID_CHRONOLOGY",
        "expires_at must not predate activated_at",
      );
    }
    if (activated_at !== null && revoked_at !== null) {
      assertCondition(
        revoked_at >= activated_at,
        "EXCEPTIONAL_AUTHORITY_INVALID_CHRONOLOGY",
        "revoked_at must not predate activated_at",
      );
    }

    if (lifecycle_state === "PENDING_APPROVAL") {
      assertCondition(
        activated_at === null && revoked_at === null && remaining_uses === 0,
        "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
        "PENDING_APPROVAL exceptional authority must clear activated_at and revoked_at and set remaining_uses = 0",
      );
    }
    if (lifecycle_state === "ACTIVE") {
      assertCondition(
        activated_at !== null && revoked_at === null && remaining_uses >= 1,
        "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
        "ACTIVE exceptional authority must retain activated_at, clear revoked_at, and keep remaining_uses >= 1",
      );
    }
    if (lifecycle_state === "EXHAUSTED") {
      assertCondition(
        activated_at !== null && revoked_at === null && remaining_uses === 0,
        "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
        "EXHAUSTED exceptional authority must retain activated_at, clear revoked_at, and keep remaining_uses = 0",
      );
    }
    if (lifecycle_state === "REVOKED") {
      assertCondition(
        activated_at !== null && revoked_at !== null,
        "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
        "REVOKED exceptional authority must retain activated_at and revoked_at",
      );
    }
    if (["ACTIVE", "EXHAUSTED", "EXPIRED"].includes(lifecycle_state)) {
      assertCondition(
        activated_at !== null && revoked_at === null,
        "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
        "ACTIVE, EXHAUSTED, and EXPIRED exceptional authority must retain activated_at and clear revoked_at",
      );
    }

    return {
      artifact_type: input.artifact_type ?? "ExceptionalAuthorityGrant",
      exceptional_grant_id,
      incident_ref,
      target_action_family,
      tenant_id,
      client_id,
      partition_scope_refs,
      requesting_principal_ref,
      requesting_principal_class,
      approving_principal_ref,
      approving_principal_class,
      activated_at,
      expires_at,
      revoked_at,
      usage_limit,
      remaining_uses,
      rationale,
      compensating_control_refs,
      lifecycle_state,
      approval_step_up_state,
      approval_step_up_evidence_ref,
      self_approved: false,
      authority_acknowledgement_override_permitted: false,
      delegation_substitution_permitted: false,
      silent_client_widening_permitted: false,
      declaration_sign_without_signatory_basis_permitted: false,
      truth_confirmation_override_permitted: false,
      silent_partition_widening_permitted: false,
    };
  } catch (error) {
    if (error instanceof ExceptionalAuthorityGrantModelError) {
      throw error;
    }
    throw new ExceptionalAuthorityGrantModelError(
      "EXCEPTIONAL_AUTHORITY_FIELD_REQUIRED",
      error instanceof Error
        ? error.message
        : "exceptional authority normalization failed",
    );
  }
}

export function assertExceptionalAuthorityIdentityStable(
  previous: ExceptionalAuthorityGrantRecord,
  next: ExceptionalAuthorityGrantRecord,
) {
  const previousIdentity = JSON.stringify({
    exceptional_grant_id: previous.exceptional_grant_id,
    incident_ref: previous.incident_ref,
    target_action_family: previous.target_action_family,
    tenant_id: previous.tenant_id,
    client_id: previous.client_id,
    partition_scope_refs: previous.partition_scope_refs,
    requesting_principal_ref: previous.requesting_principal_ref,
    requesting_principal_class: previous.requesting_principal_class,
    approving_principal_ref: previous.approving_principal_ref,
    usage_limit: previous.usage_limit,
    rationale: previous.rationale,
    compensating_control_refs: previous.compensating_control_refs,
  });
  const nextIdentity = JSON.stringify({
    exceptional_grant_id: next.exceptional_grant_id,
    incident_ref: next.incident_ref,
    target_action_family: next.target_action_family,
    tenant_id: next.tenant_id,
    client_id: next.client_id,
    partition_scope_refs: next.partition_scope_refs,
    requesting_principal_ref: next.requesting_principal_ref,
    requesting_principal_class: next.requesting_principal_class,
    approving_principal_ref: next.approving_principal_ref,
    usage_limit: next.usage_limit,
    rationale: next.rationale,
    compensating_control_refs: next.compensating_control_refs,
  });

  assertCondition(
    previousIdentity === nextIdentity,
    "EXCEPTIONAL_AUTHORITY_SILENT_REBIND",
    "exceptional authority scope, incident, identities, and usage ceiling must not mutate in place",
  );
}

export function deriveExceptionalAuthorityLifecycleState(
  record: ExceptionalAuthorityGrantRecord,
  evaluatedAt: ISO8601DateTimeString,
): ExceptionalAuthorityGrantLifecycleState {
  if (record.revoked_at !== null && record.revoked_at <= evaluatedAt) {
    return "REVOKED";
  }
  if (record.expires_at <= evaluatedAt) {
    return "EXPIRED";
  }
  if (record.remaining_uses === 0 && record.lifecycle_state !== "PENDING_APPROVAL") {
    return "EXHAUSTED";
  }
  return record.lifecycle_state;
}

export function activateExceptionalAuthorityGrant(
  record: ExceptionalAuthorityGrantRecord,
  activatedAt: ISO8601DateTimeString,
): ExceptionalAuthorityGrantRecord {
  return normalizeExceptionalAuthorityGrantRecord({
    ...record,
    activated_at: activatedAt,
    revoked_at: null,
    remaining_uses: record.usage_limit,
    lifecycle_state: "ACTIVE",
  });
}

export function revokeExceptionalAuthorityGrant(
  record: ExceptionalAuthorityGrantRecord,
  revokedAt: ISO8601DateTimeString,
): ExceptionalAuthorityGrantRecord {
  return normalizeExceptionalAuthorityGrantRecord({
    ...record,
    activated_at: record.activated_at ?? revokedAt,
    revoked_at: revokedAt,
    lifecycle_state: "REVOKED",
  });
}

export function consumeExceptionalAuthorityGrantUse(
  record: ExceptionalAuthorityGrantRecord,
): ExceptionalAuthorityGrantRecord {
  assertCondition(
    record.remaining_uses > 0,
    "EXCEPTIONAL_AUTHORITY_INVALID_LIFECYCLE",
    "remaining_uses must stay above zero before consumption",
  );
  const nextRemainingUses = record.remaining_uses - 1;
  return normalizeExceptionalAuthorityGrantRecord({
    ...record,
    activated_at: record.activated_at ?? record.expires_at,
    remaining_uses: nextRemainingUses,
    lifecycle_state: nextRemainingUses === 0 ? "EXHAUSTED" : "ACTIVE",
  });
}

