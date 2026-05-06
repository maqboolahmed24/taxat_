import {
  deriveActorSessionLifecycleState,
  type ActorSessionRecord,
} from "../models/actor_session.ts";
import {
  deriveSubjectIdentityAssuranceLevel,
  normalizePrincipalContextRecord,
  type PrincipalContextRecord,
} from "../models/principal_context.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import type { TenantRepository } from "../repositories/tenant_repository.ts";
import type { UserRepository } from "../repositories/user_repository.ts";
import {
  PolicySnapshotRefResolver,
  type ResolvedPolicySnapshotRef,
} from "./policy_snapshot_ref_resolver.ts";
import { normalizeStringSet } from "./principal_context_normalizer.ts";

type PrincipalContextBuilderErrorCode =
  | "CONFLICT_CHRONOLOGY_NON_MONOTONIC"
  | "PRINCIPAL_CONTEXT_POLICY_UNRESOLVED"
  | "PRINCIPAL_CONTEXT_SESSION_UNUSABLE";

export class PrincipalContextBuilderError extends Error {
  readonly code: PrincipalContextBuilderErrorCode;

  constructor(code: PrincipalContextBuilderErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalContextBuilderError";
    this.code = code;
  }
}

export type BuildPrincipalContextInput = {
  authority_link_refs?: string[];
  authority_link_snapshot_refs?: string[];
  authorization_evaluated_at: string;
  client_scope?: string[];
  delegation_basis: PrincipalContextRecord["delegation_basis"];
  delegation_snapshot_refs?: string[];
  effective_role_set?: string[];
  masking_scope: string;
  partition_scope_refs?: string[];
  policy_context_override?: Partial<
    Pick<
      ResolvedPolicySnapshotRef,
      "approval_capabilities" | "client_portal_capabilities" | "policy_snapshot_hash" | "run_kind_capabilities"
    >
  >;
  requested_scope: string[];
  service_identity_ref?: string | null;
  session_id: string;
  subject_identity_assurance_level?: PrincipalContextRecord["subject_identity_assurance_level"];
  tenant_id: string;
};

function assertChronology(session: ActorSessionRecord, evaluatedAt: string) {
  if (evaluatedAt < session.issued_at) {
    throw new PrincipalContextBuilderError(
      "CONFLICT_CHRONOLOGY_NON_MONOTONIC",
      "authorization_evaluated_at cannot predate session issuance",
    );
  }
  if (session.step_up_completed_at !== null && evaluatedAt < session.step_up_completed_at) {
    throw new PrincipalContextBuilderError(
      "CONFLICT_CHRONOLOGY_NON_MONOTONIC",
      "authorization_evaluated_at cannot predate frozen step-up evidence",
    );
  }
}

export class PrincipalContextBuilder {
  private readonly policySnapshotRefResolver: PolicySnapshotRefResolver;

  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      tenantRepository: TenantRepository;
      userRepository: UserRepository;
      policySnapshotRefResolver?: PolicySnapshotRefResolver;
    },
  ) {
    this.policySnapshotRefResolver =
      dependencies.policySnapshotRefResolver ?? new PolicySnapshotRefResolver();
  }

  private async resolvePolicyContext(
    effectiveRoleSet: string[],
    override?: BuildPrincipalContextInput["policy_context_override"],
  ) {
    const resolved = await this.policySnapshotRefResolver.resolveForRoleSet(effectiveRoleSet);
    const policy_snapshot_hash = override?.policy_snapshot_hash ?? resolved.policy_snapshot_hash;
    if (!policy_snapshot_hash) {
      throw new PrincipalContextBuilderError(
        "PRINCIPAL_CONTEXT_POLICY_UNRESOLVED",
        "policy_snapshot_hash could not be resolved for the effective role set",
      );
    }

    return {
      policy_snapshot_hash,
      approval_capabilities: normalizeStringSet(
        "approval_capabilities",
        override?.approval_capabilities ?? resolved.approval_capabilities,
      ),
      client_portal_capabilities: normalizeStringSet(
        "client_portal_capabilities",
        override?.client_portal_capabilities ?? resolved.client_portal_capabilities,
      ),
      run_kind_capabilities: normalizeStringSet(
        "run_kind_capabilities",
        override?.run_kind_capabilities ?? resolved.run_kind_capabilities,
      ),
    };
  }

  async build(input: BuildPrincipalContextInput) {
    const evaluatedAt = normalizeUtcInstantString(input.authorization_evaluated_at);
    await this.dependencies.tenantRepository.requireActiveTenant(input.tenant_id);

    const session = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    assertChronology(session, evaluatedAt);

    const lifecycleState = deriveActorSessionLifecycleState(session, evaluatedAt);
    if (["REVOKED", "EXPIRED", "DEVICE_INVALIDATED"].includes(lifecycleState)) {
      throw new PrincipalContextBuilderError(
        "PRINCIPAL_CONTEXT_SESSION_UNUSABLE",
        `session ${input.session_id} is not usable at ${evaluatedAt}`,
      );
    }

    let principal_id = session.principal_ref;
    let effective_role_set = normalizeStringSet(
      "effective_role_set",
      input.effective_role_set ?? [],
    );

    if (session.principal_class === "HUMAN") {
      const user = await this.dependencies.userRepository.requireActiveUser(
        input.tenant_id,
        session.principal_user_id_or_null ?? session.principal_ref,
      );
      principal_id = user.user_id;
      if (effective_role_set.length === 0) {
        effective_role_set = normalizeStringSet("effective_role_set", user.roles, { minItems: 1 });
      }
    } else if (effective_role_set.length === 0) {
      effective_role_set = normalizeStringSet("effective_role_set", [session.principal_ref], {
        minItems: 1,
      });
    }

    const policyContext = await this.resolvePolicyContext(
      effective_role_set,
      input.policy_context_override,
    );

    return normalizePrincipalContextRecord({
      principal_id,
      principal_type: session.principal_class,
      effective_role_set,
      tenant_id: input.tenant_id,
      client_scope: input.client_scope ?? [],
      requested_scope: input.requested_scope,
      partition_scope_refs: input.partition_scope_refs ?? [],
      authn_level: session.authn_level,
      subject_identity_assurance_level:
        input.subject_identity_assurance_level ??
        deriveSubjectIdentityAssuranceLevel({
          authn_level: session.authn_level,
          principal_type: session.principal_class,
        }),
      session_id: session.session_id,
      service_identity_ref:
        session.principal_class === "SERVICE"
          ? (input.service_identity_ref ?? session.principal_ref)
          : null,
      delegation_basis: input.delegation_basis,
      authorization_evaluated_at: evaluatedAt,
      policy_snapshot_hash: policyContext.policy_snapshot_hash,
      delegation_snapshot_refs: input.delegation_snapshot_refs ?? [],
      authority_link_refs: input.authority_link_refs ?? [],
      authority_link_snapshot_refs: input.authority_link_snapshot_refs ?? [],
      masking_scope: input.masking_scope,
      approval_capabilities: policyContext.approval_capabilities,
      client_portal_capabilities: policyContext.client_portal_capabilities,
      run_kind_capabilities: policyContext.run_kind_capabilities,
    });
  }
}
