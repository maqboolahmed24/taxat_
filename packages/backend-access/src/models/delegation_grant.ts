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

export type DelegationGrantDelegateClass =
  | "HUMAN"
  | "EXTERNAL"
  | "ROLE_GROUP"
  | "SERVICE";

export type DelegationGrantBasisType =
  | "CLIENT_GRANTED"
  | "SELF_ASSESSMENT_IMPORTED"
  | "DIGITAL_HANDSHAKE";

export type DelegationGrantLifecycleState =
  | "PENDING_VALIDATION"
  | "ACTIVE"
  | "LIMITED_SCOPE"
  | "REVOKED"
  | "EXPIRED"
  | "SUPERSEDED";

export type DelegationGrantRecord = {
  artifact_type: "DelegationGrant";
  delegation_grant_id: string;
  tenant_id: string;
  reporting_subject_ref: string;
  delegate_ref: string | null;
  delegate_class: DelegationGrantDelegateClass | null;
  authority_scope_refs: string[];
  partition_scope_refs: string[];
  basis_type: DelegationGrantBasisType;
  basis_evidence_refs: string[];
  effective_from: ISO8601DateTimeString;
  expires_at: ISO8601DateTimeString | null;
  revoked_at: ISO8601DateTimeString | null;
  superseded_by_grant_id: string | null;
  lifecycle_state: DelegationGrantLifecycleState;
  last_validated_at: ISO8601DateTimeString | null;
  imported_evidence_fresh_until: ISO8601DateTimeString | null;
  limitation_reason_codes: string[];
};

export type CreateDelegationGrantInput = Omit<DelegationGrantRecord, "artifact_type"> & {
  artifact_type?: "DelegationGrant";
};

type DelegationGrantModelErrorCode =
  | "DELEGATION_GRANT_FIELD_REQUIRED"
  | "DELEGATION_GRANT_INVALID_CHRONOLOGY"
  | "DELEGATION_GRANT_INVALID_LIFECYCLE"
  | "DELEGATION_GRANT_INVALID_POSTURE"
  | "DELEGATION_GRANT_SILENT_REBIND";

export class DelegationGrantModelError extends Error {
  readonly code: DelegationGrantModelErrorCode;

  constructor(code: DelegationGrantModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DelegationGrantModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: DelegationGrantModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new DelegationGrantModelError(code, detail);
  }
}

function normalizeId(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatId(requireTrimmedString(label, value), family));
}

function normalizeRef(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatRef(requireTrimmedString(label, value), family));
}

function normalizeOptionalRef(label: string, value: string | null, family: string) {
  return value === null ? null : normalizeRef(label, value, family);
}

function normalizeOptionalInstant(value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

export function normalizeDelegationGrantRecord(
  input: CreateDelegationGrantInput,
): DelegationGrantRecord {
  try {
    const delegation_grant_id = normalizeId(
      "delegation_grant_id",
      input.delegation_grant_id,
      "delegation_grant",
    );
    const tenant_id = normalizeId("tenant_id", input.tenant_id, "tenant");
    const reporting_subject_ref = normalizeRef(
      "reporting_subject_ref",
      input.reporting_subject_ref,
      "reporting_subject",
    );
    const delegate_ref = normalizeOptionalRef("delegate_ref", input.delegate_ref, "delegate");
    const delegate_class =
      input.delegate_class === null
        ? null
        : (requireTrimmedString(
            "delegate_class",
            input.delegate_class,
          ) as DelegationGrantRecord["delegate_class"]);
    const authority_scope_refs = normalizeStringSet(
      "authority_scope_refs",
      input.authority_scope_refs,
      {
        minItems: 1,
      },
    );
    const partition_scope_refs = normalizeStringSet(
      "partition_scope_refs",
      input.partition_scope_refs ?? [],
    );
    const basis_type = requireTrimmedString(
      "basis_type",
      input.basis_type,
    ) as DelegationGrantBasisType;
    const basis_evidence_refs = normalizeStringSet(
      "basis_evidence_refs",
      input.basis_evidence_refs,
      {
        minItems: 1,
      },
    );
    const effective_from = normalizeUtcInstantString(input.effective_from);
    const expires_at = normalizeOptionalInstant(input.expires_at);
    const revoked_at = normalizeOptionalInstant(input.revoked_at);
    const superseded_by_grant_id =
      input.superseded_by_grant_id === null
        ? null
        : normalizeId(
            "superseded_by_grant_id",
            input.superseded_by_grant_id,
            "delegation_grant",
          );
    const lifecycle_state = requireTrimmedString(
      "lifecycle_state",
      input.lifecycle_state,
    ) as DelegationGrantLifecycleState;
    const last_validated_at = normalizeOptionalInstant(input.last_validated_at);
    const imported_evidence_fresh_until = normalizeOptionalInstant(
      input.imported_evidence_fresh_until,
    );
    const limitation_reason_codes = normalizeStringSet(
      "limitation_reason_codes",
      input.limitation_reason_codes ?? [],
    );

    assertCondition(
      delegate_ref !== null || delegate_class !== null,
      "DELEGATION_GRANT_INVALID_POSTURE",
      "delegate_ref or delegate_class must be populated",
    );
    assertCondition(
      delegate_class === null ||
        ["HUMAN", "EXTERNAL", "ROLE_GROUP", "SERVICE"].includes(delegate_class),
      "DELEGATION_GRANT_FIELD_REQUIRED",
      "delegate_class must remain a supported delegation principal class",
    );
    assertCondition(
      ["CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(
        basis_type,
      ),
      "DELEGATION_GRANT_FIELD_REQUIRED",
      "basis_type must remain a supported client-authority basis",
    );
    assertCondition(
      [
        "PENDING_VALIDATION",
        "ACTIVE",
        "LIMITED_SCOPE",
        "REVOKED",
        "EXPIRED",
        "SUPERSEDED",
      ].includes(lifecycle_state),
      "DELEGATION_GRANT_FIELD_REQUIRED",
      "lifecycle_state must remain a supported delegation lifecycle",
    );
    assertCondition(
      superseded_by_grant_id === null || superseded_by_grant_id !== delegation_grant_id,
      "DELEGATION_GRANT_INVALID_POSTURE",
      "superseded_by_grant_id must not point back to delegation_grant_id",
    );
    if (expires_at !== null) {
      assertCondition(
        expires_at >= effective_from,
        "DELEGATION_GRANT_INVALID_CHRONOLOGY",
        "expires_at must not predate effective_from",
      );
    }
    if (revoked_at !== null) {
      assertCondition(
        revoked_at >= effective_from,
        "DELEGATION_GRANT_INVALID_CHRONOLOGY",
        "revoked_at must not predate effective_from",
      );
    }
    if (imported_evidence_fresh_until !== null) {
      assertCondition(
        imported_evidence_fresh_until >= effective_from,
        "DELEGATION_GRANT_INVALID_CHRONOLOGY",
        "imported_evidence_fresh_until must not predate effective_from",
      );
    }

    if (basis_type === "CLIENT_GRANTED") {
      assertCondition(
        delegate_ref !== null,
        "DELEGATION_GRANT_INVALID_POSTURE",
        "CLIENT_GRANTED delegation must retain delegate_ref",
      );
      assertCondition(
        imported_evidence_fresh_until === null,
        "DELEGATION_GRANT_INVALID_POSTURE",
        "CLIENT_GRANTED delegation must clear imported_evidence_fresh_until",
      );
    } else {
      assertCondition(
        imported_evidence_fresh_until !== null ||
          !["ACTIVE", "LIMITED_SCOPE"].includes(lifecycle_state),
        "DELEGATION_GRANT_INVALID_POSTURE",
        "active imported or authorisation-link delegation must retain imported_evidence_fresh_until",
      );
    }

    if (["ACTIVE", "LIMITED_SCOPE"].includes(lifecycle_state)) {
      assertCondition(
        last_validated_at !== null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "active or limited delegation grants must retain last_validated_at",
      );
      assertCondition(
        revoked_at === null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "active or limited delegation grants must clear revoked_at",
      );
      assertCondition(
        superseded_by_grant_id === null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "active or limited delegation grants must clear superseded_by_grant_id",
      );
    }
    if (lifecycle_state === "ACTIVE") {
      assertCondition(
        limitation_reason_codes.length === 0,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "ACTIVE delegation grants must not retain limitation_reason_codes",
      );
    }
    if (lifecycle_state === "LIMITED_SCOPE") {
      assertCondition(
        limitation_reason_codes.length > 0,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "LIMITED_SCOPE delegation grants must retain limitation_reason_codes",
      );
    }
    if (lifecycle_state === "PENDING_VALIDATION") {
      assertCondition(
        last_validated_at === null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "PENDING_VALIDATION delegation grants must clear last_validated_at",
      );
    }
    if (lifecycle_state === "REVOKED") {
      assertCondition(
        revoked_at !== null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "REVOKED delegation grants must retain revoked_at",
      );
    }
    if (lifecycle_state === "EXPIRED") {
      assertCondition(
        expires_at !== null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "EXPIRED delegation grants must retain expires_at",
      );
    }
    if (lifecycle_state === "SUPERSEDED") {
      assertCondition(
        superseded_by_grant_id !== null,
        "DELEGATION_GRANT_INVALID_LIFECYCLE",
        "SUPERSEDED delegation grants must retain superseded_by_grant_id",
      );
    }

    if (basis_type !== "CLIENT_GRANTED" && lifecycle_state !== "PENDING_VALIDATION") {
      assertCondition(
        imported_evidence_fresh_until !== null,
        "DELEGATION_GRANT_INVALID_POSTURE",
        "imported or authorisation-link delegation must retain freshness posture once active",
      );
      assertCondition(
        last_validated_at !== null,
        "DELEGATION_GRANT_INVALID_POSTURE",
        "imported or authorisation-link delegation must retain last_validated_at once active",
      );
      assertCondition(
        imported_evidence_fresh_until === null ||
          last_validated_at === null ||
          last_validated_at <= imported_evidence_fresh_until,
        "DELEGATION_GRANT_INVALID_POSTURE",
        "imported or authorisation-link delegation must not outlive imported_evidence_fresh_until",
      );
    }

    return {
      artifact_type: input.artifact_type ?? "DelegationGrant",
      delegation_grant_id,
      tenant_id,
      reporting_subject_ref,
      delegate_ref,
      delegate_class,
      authority_scope_refs,
      partition_scope_refs,
      basis_type,
      basis_evidence_refs,
      effective_from,
      expires_at,
      revoked_at,
      superseded_by_grant_id,
      lifecycle_state,
      last_validated_at,
      imported_evidence_fresh_until,
      limitation_reason_codes,
    };
  } catch (error) {
    if (error instanceof DelegationGrantModelError) {
      throw error;
    }
    throw new DelegationGrantModelError(
      "DELEGATION_GRANT_FIELD_REQUIRED",
      error instanceof Error ? error.message : "delegation grant normalization failed",
    );
  }
}

export function assertDelegationGrantIdentityStable(
  previous: DelegationGrantRecord,
  next: DelegationGrantRecord,
) {
  const previousIdentity = JSON.stringify({
    delegation_grant_id: previous.delegation_grant_id,
    tenant_id: previous.tenant_id,
    reporting_subject_ref: previous.reporting_subject_ref,
    delegate_ref: previous.delegate_ref,
    delegate_class: previous.delegate_class,
    authority_scope_refs: previous.authority_scope_refs,
    partition_scope_refs: previous.partition_scope_refs,
    basis_type: previous.basis_type,
    basis_evidence_refs: previous.basis_evidence_refs,
    effective_from: previous.effective_from,
  });
  const nextIdentity = JSON.stringify({
    delegation_grant_id: next.delegation_grant_id,
    tenant_id: next.tenant_id,
    reporting_subject_ref: next.reporting_subject_ref,
    delegate_ref: next.delegate_ref,
    delegate_class: next.delegate_class,
    authority_scope_refs: next.authority_scope_refs,
    partition_scope_refs: next.partition_scope_refs,
    basis_type: next.basis_type,
    basis_evidence_refs: next.basis_evidence_refs,
    effective_from: next.effective_from,
  });

  assertCondition(
    previousIdentity === nextIdentity,
    "DELEGATION_GRANT_SILENT_REBIND",
    "delegation grant identity, scope basis, and evidence lineage must not mutate in place",
  );
}

export function deriveDelegationGrantLifecycleState(
  record: DelegationGrantRecord,
  evaluatedAt: ISO8601DateTimeString,
): DelegationGrantLifecycleState {
  if (record.superseded_by_grant_id !== null) {
    return "SUPERSEDED";
  }
  if (record.revoked_at !== null && record.revoked_at <= evaluatedAt) {
    return "REVOKED";
  }
  if (record.expires_at !== null && record.expires_at <= evaluatedAt) {
    return "EXPIRED";
  }
  return record.lifecycle_state;
}

