import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  applyLastSeenObservation,
  completeActorSessionStepUp,
  deriveActorSessionLifecycleState,
  expireActorSession,
  normalizeActorSessionRecord,
  revokeActorSession,
  type ActorSessionLifecycleState,
  type ActorSessionRecord,
  type CreateActorSessionInput,
  type SessionRevocationClass,
} from "../models/actor_session.ts";
import type { TenantRepository } from "./tenant_repository.ts";
import type { UserRepository } from "./user_repository.ts";

export type ActorSessionTransitionRecord = {
  transition_id: string;
  session_id: string;
  tenant_id: string;
  from_lifecycle_state: ActorSessionLifecycleState | null;
  to_lifecycle_state: ActorSessionLifecycleState;
  reason_code: string;
  source_ref: string | null;
  transition_at: string;
  revocation_class: SessionRevocationClass | null;
};

type IssueActorSessionInput = CreateActorSessionInput & {
  source_ref?: string | null;
  transition_reason_code?: string;
};

type SessionTransitionInput = {
  reason_code: string;
  source_ref?: string | null;
};

type StepUpTransitionInput = SessionTransitionInput & {
  completed_at: string;
  rotated_session_binding_hash: string;
};

type RevocationInput = SessionTransitionInput & {
  revoked_at: string;
  revocation_reason: string;
  revocation_class: SessionRevocationClass;
  device_binding_invalidated?: boolean;
};

type ExpiryInput = SessionTransitionInput & {
  evaluated_at: string;
};

type ActorSessionRepositoryErrorCode =
  | "SESSION_DUPLICATE"
  | "SESSION_HUMAN_USER_REQUIRED"
  | "SESSION_NOT_FOUND"
  | "SESSION_SESSION_BINDING_COLLISION";

export class ActorSessionRepositoryError extends Error {
  readonly code: ActorSessionRepositoryErrorCode;

  constructor(code: ActorSessionRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ActorSessionRepositoryError";
    this.code = code;
  }
}

function bindingKey(tenantId: string, sessionBindingHash: string) {
  return `${tenantId}::${sessionBindingHash}`;
}

function cloneActorSessionRecord(session: ActorSessionRecord) {
  return structuredClone(session);
}

function cloneTransitionRecord(transition: ActorSessionTransitionRecord) {
  return structuredClone(transition);
}

function requireTrimmed(label: string, value: string) {
  if (value.trim().length === 0) {
    throw new ActorSessionRepositoryError(
      "SESSION_NOT_FOUND",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim();
}

export class ActorSessionRepository {
  private readonly sessions = new Map<string, ActorSessionRecord>();
  private readonly bindingIndex = new Map<string, string>();
  private readonly transitions = new Map<string, ActorSessionTransitionRecord[]>();

  constructor(
    private readonly dependencies: {
      tenantRepository: TenantRepository;
      userRepository: UserRepository;
    },
  ) {}

  private recordTransition(
    session: ActorSessionRecord,
    input: {
      from_lifecycle_state: ActorSessionLifecycleState | null;
      to_lifecycle_state: ActorSessionLifecycleState;
      reason_code: string;
      source_ref?: string | null;
      transition_at: string;
      revocation_class?: SessionRevocationClass | null;
    },
  ) {
    const transition: ActorSessionTransitionRecord = {
      transition_id: stableJsonHash({
        session_id: session.session_id,
        from_lifecycle_state: input.from_lifecycle_state,
        to_lifecycle_state: input.to_lifecycle_state,
        reason_code: input.reason_code,
        transition_at: input.transition_at,
        source_ref: input.source_ref ?? null,
      }),
      session_id: session.session_id,
      tenant_id: session.tenant_id,
      from_lifecycle_state: input.from_lifecycle_state,
      to_lifecycle_state: input.to_lifecycle_state,
      reason_code: requireTrimmed("reason_code", input.reason_code),
      source_ref: input.source_ref ?? null,
      transition_at: input.transition_at,
      revocation_class: input.revocation_class ?? null,
    };
    const current = this.transitions.get(session.session_id) ?? [];
    current.push(transition);
    current.sort((left, right) => left.transition_at.localeCompare(right.transition_at));
    this.transitions.set(session.session_id, current);
    return cloneTransitionRecord(transition);
  }

  private replaceSession(previous: ActorSessionRecord, next: ActorSessionRecord) {
    if (previous.session_binding_hash !== next.session_binding_hash) {
      this.bindingIndex.delete(bindingKey(previous.tenant_id, previous.session_binding_hash));
      const nextBindingKey = bindingKey(next.tenant_id, next.session_binding_hash);
      const collisionSessionId = this.bindingIndex.get(nextBindingKey);
      if (collisionSessionId && collisionSessionId !== next.session_id) {
        throw new ActorSessionRepositoryError(
          "SESSION_SESSION_BINDING_COLLISION",
          `binding hash ${next.session_binding_hash} is already bound inside tenant ${next.tenant_id}`,
        );
      }
      this.bindingIndex.set(nextBindingKey, next.session_id);
    }
    this.sessions.set(next.session_id, cloneActorSessionRecord(next));
  }

  async issueSession(input: IssueActorSessionInput) {
    const session = normalizeActorSessionRecord(input);
    await this.dependencies.tenantRepository.requireActiveTenant(session.tenant_id);
    if (session.principal_class === "HUMAN") {
      if (session.principal_user_id_or_null === null) {
        throw new ActorSessionRepositoryError(
          "SESSION_HUMAN_USER_REQUIRED",
          "human sessions require principal_user_id_or_null",
        );
      }
      await this.dependencies.userRepository.requireActiveUser(
        session.tenant_id,
        session.principal_user_id_or_null,
      );
    }

    if (this.sessions.has(session.session_id)) {
      throw new ActorSessionRepositoryError(
        "SESSION_DUPLICATE",
        `session ${session.session_id} already exists`,
      );
    }
    const nextBindingKey = bindingKey(session.tenant_id, session.session_binding_hash);
    if (this.bindingIndex.has(nextBindingKey)) {
      throw new ActorSessionRepositoryError(
        "SESSION_SESSION_BINDING_COLLISION",
        `binding hash ${session.session_binding_hash} is already active inside tenant ${session.tenant_id}`,
      );
    }

    this.sessions.set(session.session_id, cloneActorSessionRecord(session));
    this.bindingIndex.set(nextBindingKey, session.session_id);
    this.recordTransition(session, {
      from_lifecycle_state: null,
      to_lifecycle_state: session.lifecycle_state,
      reason_code: input.transition_reason_code ?? "SESSION_ISSUED",
      source_ref: input.source_ref ?? null,
      transition_at: session.issued_at,
    });
    return cloneActorSessionRecord(session);
  }

  async getBySessionId(tenantId: string, sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenant_id !== tenantId) {
      return null;
    }
    return cloneActorSessionRecord(session);
  }

  async requireBySessionId(tenantId: string, sessionId: string) {
    const session = await this.getBySessionId(tenantId, sessionId);
    if (!session) {
      throw new ActorSessionRepositoryError(
        "SESSION_NOT_FOUND",
        `session ${sessionId} does not exist in tenant ${tenantId}`,
      );
    }
    return session;
  }

  async getByBindingHash(tenantId: string, sessionBindingHash: string) {
    const sessionId = this.bindingIndex.get(bindingKey(tenantId, sessionBindingHash));
    if (!sessionId) {
      return null;
    }
    return this.getBySessionId(tenantId, sessionId);
  }

  async listByUser(tenantId: string, userId: string) {
    return [...this.sessions.values()]
      .filter(
        (session) =>
          session.tenant_id === tenantId && session.principal_user_id_or_null === userId,
      )
      .sort((left, right) => left.issued_at.localeCompare(right.issued_at))
      .map((session) => cloneActorSessionRecord(session));
  }

  async listTransitions(tenantId: string, sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenant_id !== tenantId) {
      return [];
    }
    return (this.transitions.get(sessionId) ?? []).map((transition) =>
      cloneTransitionRecord(transition),
    );
  }

  async recordLastSeen(tenantId: string, sessionId: string, observedAt: string) {
    const session = await this.requireBySessionId(tenantId, sessionId);
    const next = applyLastSeenObservation(session, observedAt);
    if (next.session_row_version === session.session_row_version) {
      return cloneActorSessionRecord(session);
    }
    this.replaceSession(session, next);
    return cloneActorSessionRecord(next);
  }

  async completeStepUp(tenantId: string, sessionId: string, input: StepUpTransitionInput) {
    const session = await this.requireBySessionId(tenantId, sessionId);
    const next = completeActorSessionStepUp(
      session,
      input.completed_at,
      input.rotated_session_binding_hash,
    );
    if (next.session_row_version === session.session_row_version) {
      return cloneActorSessionRecord(session);
    }
    this.replaceSession(session, next);
    this.recordTransition(next, {
      from_lifecycle_state: session.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: next.step_up_completed_at ?? input.completed_at,
    });
    return cloneActorSessionRecord(next);
  }

  async revokeSession(tenantId: string, sessionId: string, input: RevocationInput) {
    const session = await this.requireBySessionId(tenantId, sessionId);
    const next = revokeActorSession(session, {
      revokedAt: input.revoked_at,
      revocationReason: input.revocation_reason,
      deviceBindingInvalidated: input.device_binding_invalidated ?? false,
    });
    if (next.session_row_version === session.session_row_version) {
      return cloneActorSessionRecord(session);
    }
    this.replaceSession(session, next);
    this.recordTransition(next, {
      from_lifecycle_state: session.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: next.revoked_at ?? input.revoked_at,
      revocation_class: input.revocation_class,
    });
    return cloneActorSessionRecord(next);
  }

  async expireSession(tenantId: string, sessionId: string, input: ExpiryInput) {
    const session = await this.requireBySessionId(tenantId, sessionId);
    const next = expireActorSession(session, input.evaluated_at);
    if (next.session_row_version === session.session_row_version) {
      return cloneActorSessionRecord(session);
    }
    this.replaceSession(session, next);
    this.recordTransition(next, {
      from_lifecycle_state: session.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: input.evaluated_at,
      revocation_class: "SESSION_EXPIRY",
    });
    return cloneActorSessionRecord(next);
  }

  async deriveCurrentLifecycle(tenantId: string, sessionId: string, asOf: string) {
    const session = await this.requireBySessionId(tenantId, sessionId);
    return deriveActorSessionLifecycleState(session, asOf);
  }

  async listAllSessions() {
    return [...this.sessions.values()]
      .sort((left, right) => left.session_id.localeCompare(right.session_id))
      .map((session) => cloneActorSessionRecord(session));
  }
}
