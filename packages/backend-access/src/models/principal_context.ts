import type { PrincipalContext as SchemaPrincipalContext } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import {
  asTaxatHash,
  asTaxatId,
  asTaxatRef,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import { buildPrincipalContextAccessBindingHash } from "../hash/access_binding_hash.ts";

export type PrincipalContextRecord = SchemaPrincipalContext;

export type CreatePrincipalContextInput = Omit<
  PrincipalContextRecord,
  "access_binding_hash" | "artifact_type"
> & {
  access_binding_hash?: string;
  artifact_type?: "PrincipalContext";
};

type PrincipalContextModelErrorCode =
  | "PRINCIPAL_CONTEXT_ACCESS_BINDING_HASH_MISMATCH"
  | "PRINCIPAL_CONTEXT_FIELD_REQUIRED"
  | "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE"
  | "PRINCIPAL_CONTEXT_INVALID_SCOPE_BINDING";

export class PrincipalContextModelError extends Error {
  readonly code: PrincipalContextModelErrorCode;

  constructor(code: PrincipalContextModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalContextModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: PrincipalContextModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new PrincipalContextModelError(code, detail);
  }
}

function normalizePrincipalId(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatId(requireTrimmedString(label, value), family));
}

function normalizeOptionalRef(label: string, value: string | null, family: string) {
  return value === null ? null : unwrapIdentifier(asTaxatRef(requireTrimmedString(label, value), family));
}

function normalizeHash(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatHash(requireTrimmedString(label, value), family));
}

export function normalizePrincipalContextRecord(
  input: CreatePrincipalContextInput,
): PrincipalContextRecord {
  try {
    const principal_id = normalizePrincipalId("principal_id", input.principal_id, "principal");
    const tenant_id = normalizePrincipalId("tenant_id", input.tenant_id, "tenant");
    const session_id = normalizePrincipalId("session_id", input.session_id, "actor_session");
    const principal_type = requireTrimmedString("principal_type", input.principal_type) as PrincipalContextRecord["principal_type"];
    const authn_level = requireTrimmedString("authn_level", input.authn_level) as PrincipalContextRecord["authn_level"];
    const subject_identity_assurance_level = requireTrimmedString(
      "subject_identity_assurance_level",
      input.subject_identity_assurance_level,
    ) as PrincipalContextRecord["subject_identity_assurance_level"];
    const delegation_basis = requireTrimmedString(
      "delegation_basis",
      input.delegation_basis,
    ) as PrincipalContextRecord["delegation_basis"];
    const authorization_evaluated_at = normalizeUtcInstantString(input.authorization_evaluated_at);
    const policy_snapshot_hash = normalizeHash(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
      "policy_snapshot",
    );
    const effective_role_set = normalizeStringSet("effective_role_set", input.effective_role_set, {
      minItems: 1,
    });
    const client_scope = normalizeStringSet("client_scope", input.client_scope ?? []);
    const requested_scope = normalizeScopeSequence("requested_scope", input.requested_scope);
    const partition_scope_refs = normalizeStringSet(
      "partition_scope_refs",
      input.partition_scope_refs ?? [],
    );
    const delegation_snapshot_refs = normalizeStringSet(
      "delegation_snapshot_refs",
      input.delegation_snapshot_refs ?? [],
    );
    const authority_link_refs = normalizeStringSet(
      "authority_link_refs",
      input.authority_link_refs ?? [],
    );
    const authority_link_snapshot_refs = normalizeStringSet(
      "authority_link_snapshot_refs",
      input.authority_link_snapshot_refs ?? [],
    );
    const masking_scope = requireTrimmedString("masking_scope", input.masking_scope);
    const approval_capabilities = normalizeStringSet(
      "approval_capabilities",
      input.approval_capabilities ?? [],
    );
    const client_portal_capabilities = normalizeStringSet(
      "client_portal_capabilities",
      input.client_portal_capabilities ?? [],
    );
    const run_kind_capabilities = normalizeStringSet(
      "run_kind_capabilities",
      input.run_kind_capabilities ?? [],
    );
    const service_identity_ref = normalizeOptionalRef(
      "service_identity_ref",
      input.service_identity_ref,
      "service_identity",
    );

    assertCondition(
      ["HUMAN", "SERVICE", "EXTERNAL"].includes(principal_type),
      "PRINCIPAL_CONTEXT_FIELD_REQUIRED",
      "principal_type must be HUMAN, SERVICE, or EXTERNAL",
    );
    assertCondition(
      ["BASIC", "MFA", "STEP_UP"].includes(authn_level),
      "PRINCIPAL_CONTEXT_FIELD_REQUIRED",
      "authn_level must be BASIC, MFA, or STEP_UP",
    );
    assertCondition(
      ["UNVERIFIED", "VERIFIED", "STEP_UP_VERIFIED"].includes(
        subject_identity_assurance_level,
      ),
      "PRINCIPAL_CONTEXT_FIELD_REQUIRED",
      "subject_identity_assurance_level must be UNVERIFIED, VERIFIED, or STEP_UP_VERIFIED",
    );
    assertCondition(
      [
        "SELF_ACTING",
        "CLIENT_GRANTED",
        "SELF_ASSESSMENT_IMPORTED",
        "DIGITAL_HANDSHAKE",
        "TENANT_INTERNAL",
        "SYSTEM_ASSIGNED",
      ].includes(delegation_basis),
      "PRINCIPAL_CONTEXT_FIELD_REQUIRED",
      "delegation_basis must remain a supported actor-model basis",
    );

    assertCondition(
      (authn_level === "STEP_UP") ===
        (subject_identity_assurance_level === "STEP_UP_VERIFIED"),
      "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
      "STEP_UP authn posture and STEP_UP_VERIFIED assurance must move together",
    );

    if (principal_type === "SERVICE") {
      assertCondition(
        service_identity_ref !== null,
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts require service_identity_ref",
      );
      assertCondition(
        authn_level === "BASIC",
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts must keep BASIC authn level",
      );
      assertCondition(
        subject_identity_assurance_level === "UNVERIFIED",
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts must keep UNVERIFIED assurance",
      );
      assertCondition(
        delegation_basis === "TENANT_INTERNAL" || delegation_basis === "SYSTEM_ASSIGNED",
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts must use machine-scoped delegation bases",
      );
      assertCondition(
        approval_capabilities.length === 0,
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts may not retain human approval capabilities",
      );
      assertCondition(
        client_portal_capabilities.length === 0,
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts may not retain client portal capabilities",
      );
      assertCondition(
        delegation_snapshot_refs.length === 0,
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "service principal contexts may not retain client delegation snapshot refs",
      );
    } else {
      assertCondition(
        service_identity_ref === null,
        "PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE",
        "non-service principal contexts must clear service_identity_ref",
      );
    }

    if (
      ["SELF_ACTING", "CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(
        delegation_basis,
      )
    ) {
      assertCondition(
        client_scope.length > 0,
        "PRINCIPAL_CONTEXT_INVALID_SCOPE_BINDING",
        "client-acting delegation bases require non-empty client_scope",
      );
    }

    if (client_portal_capabilities.length > 0) {
      assertCondition(
        principal_type === "HUMAN" && client_scope.length > 0,
        "PRINCIPAL_CONTEXT_INVALID_SCOPE_BINDING",
        "client portal capabilities require a human principal with non-empty client_scope",
      );
    }

    if (authority_link_refs.length > 0) {
      assertCondition(
        authority_link_snapshot_refs.length > 0,
        "PRINCIPAL_CONTEXT_INVALID_SCOPE_BINDING",
        "authority_link_refs require matching frozen authority_link_snapshot_refs",
      );
    }

    const expectedAccessBindingHash = buildPrincipalContextAccessBindingHash({
      principal_id,
      principal_type,
      effective_role_set,
      tenant_id,
      client_scope,
      requested_scope,
      partition_scope_refs,
      authn_level,
      subject_identity_assurance_level,
      session_id,
      service_identity_ref,
      delegation_basis,
      authorization_evaluated_at,
      policy_snapshot_hash,
      delegation_snapshot_refs,
      authority_link_refs,
      authority_link_snapshot_refs,
      masking_scope,
      approval_capabilities,
      client_portal_capabilities,
      run_kind_capabilities,
    });

    const access_binding_hash =
      input.access_binding_hash === undefined
        ? expectedAccessBindingHash
        : normalizeHash("access_binding_hash", input.access_binding_hash, "access_binding");

    if (input.access_binding_hash !== undefined) {
      assertCondition(
        access_binding_hash === expectedAccessBindingHash,
        "PRINCIPAL_CONTEXT_ACCESS_BINDING_HASH_MISMATCH",
        "access_binding_hash does not match the canonical principal-context binding seed",
      );
    }

    return {
      artifact_type: input.artifact_type ?? "PrincipalContext",
      principal_id,
      principal_type,
      effective_role_set,
      tenant_id,
      client_scope,
      requested_scope,
      partition_scope_refs,
      authn_level,
      subject_identity_assurance_level,
      session_id,
      service_identity_ref,
      delegation_basis,
      authorization_evaluated_at,
      policy_snapshot_hash,
      access_binding_hash,
      delegation_snapshot_refs,
      authority_link_refs,
      authority_link_snapshot_refs,
      masking_scope,
      approval_capabilities,
      client_portal_capabilities,
      run_kind_capabilities,
    };
  } catch (error) {
    if (error instanceof PrincipalContextModelError) {
      throw error;
    }
    throw new PrincipalContextModelError(
      "PRINCIPAL_CONTEXT_FIELD_REQUIRED",
      error instanceof Error ? error.message : "principal context normalization failed",
    );
  }
}

export function deriveSubjectIdentityAssuranceLevel(input: {
  authorization_evaluated_at?: ISO8601DateTimeString;
  authn_level: PrincipalContextRecord["authn_level"];
  principal_type: PrincipalContextRecord["principal_type"];
}): PrincipalContextRecord["subject_identity_assurance_level"] {
  if (input.principal_type === "SERVICE") {
    return "UNVERIFIED";
  }
  return input.authn_level === "STEP_UP" ? "STEP_UP_VERIFIED" : "VERIFIED";
}
