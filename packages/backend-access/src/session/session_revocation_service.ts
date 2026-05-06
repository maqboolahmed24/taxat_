import type { ActorSessionRecord } from "../models/actor_session.ts";
import type { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import { CsrfTokenService } from "./csrf_token_service.ts";
import { RevocationPropagationService } from "./revocation_propagation_service.ts";
import { SessionLifecycleService } from "./session_lifecycle_service.ts";
import { SESSION_SECURITY_REASON_CODES } from "./session_security_reason_codes.ts";

type SessionRevocationServiceErrorCode =
  | "SESSION_BINDING_REJECTED"
  | "SESSION_NOT_USABLE";

export class SessionRevocationServiceError extends Error {
  readonly code: SessionRevocationServiceErrorCode;
  readonly reason_codes: string[];

  constructor(code: SessionRevocationServiceErrorCode, detail: string, reason_codes: string[] = []) {
    super(`${code}: ${detail}`);
    this.name = "SessionRevocationServiceError";
    this.code = code;
    this.reason_codes = reason_codes;
  }
}

export type SessionRevocationResult = {
  already_revoked: boolean;
  invalidated_artifact_refs: string[];
  invalidated_csrf_token_count: number;
  reason_codes: string[];
  session: ActorSessionRecord;
};

export class SessionRevocationService {
  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      csrfTokenService: CsrfTokenService;
      revocationPropagationService: RevocationPropagationService;
      sessionLifecycleService: SessionLifecycleService;
    },
  ) {}

  async assertSessionAccepted(input: {
    as_of: string;
    presented_session_binding_hash?: string | null;
    session_id: string;
    tenant_id: string;
  }) {
    const posture = await this.dependencies.sessionLifecycleService.resolveSessionPosture({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      as_of: input.as_of,
    });
    if (!posture.usable) {
      throw new SessionRevocationServiceError(
        "SESSION_NOT_USABLE",
        `session ${input.session_id} is not usable for command admission`,
        [...posture.reason_codes, SESSION_SECURITY_REASON_CODES.session_command_rejected],
      );
    }
    if (
      input.presented_session_binding_hash !== undefined &&
      input.presented_session_binding_hash !== null &&
      input.presented_session_binding_hash.trim() !== posture.session.session_binding_hash
    ) {
      throw new SessionRevocationServiceError(
        "SESSION_BINDING_REJECTED",
        `session ${input.session_id} does not match the presented session binding hash`,
        [SESSION_SECURITY_REASON_CODES.session_binding_mismatch],
      );
    }
    return posture;
  }

  async revokeSession(input: {
    reason_code: string;
    revoked_at: string;
    session_id: string;
    source_ref?: string | null;
    tenant_id: string;
  }): Promise<SessionRevocationResult> {
    const current = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const alreadyRevoked = current.revoked_at !== null;
    const session = alreadyRevoked
      ? current
      : await this.dependencies.sessionLifecycleService.revokeSession({
          tenant_id: input.tenant_id,
          session_id: input.session_id,
          revoked_at: input.revoked_at,
          reason_code: input.reason_code,
          source_ref: input.source_ref ?? null,
        });
    const invalidated_artifact_refs =
      await this.dependencies.revocationPropagationService.invalidateSessionLineage({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        invalidated_at: session.revoked_at ?? input.revoked_at,
        reason_code: session.revocation_reason ?? input.reason_code,
      });
    const invalidated_csrf_token_count =
      await this.dependencies.csrfTokenService.invalidateSessionTokens({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        invalidated_at: session.revoked_at ?? input.revoked_at,
        reason_code: SESSION_SECURITY_REASON_CODES.browser_csrf_token_invalidated,
      });
    return {
      already_revoked: alreadyRevoked,
      invalidated_artifact_refs,
      invalidated_csrf_token_count,
      reason_codes: session.revocation_reason ? [session.revocation_reason] : [],
      session,
    };
  }

  async invalidateDeviceBinding(input: {
    invalidated_at: string;
    session_id: string;
    source_ref?: string | null;
    tenant_id: string;
  }): Promise<SessionRevocationResult> {
    const current = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const alreadyRevoked = current.revoked_at !== null;
    const session = alreadyRevoked
      ? current
      : await this.dependencies.sessionLifecycleService.invalidateDeviceBinding({
          tenant_id: input.tenant_id,
          session_id: input.session_id,
          invalidated_at: input.invalidated_at,
          source_ref: input.source_ref ?? null,
        });
    const invalidated_artifact_refs =
      await this.dependencies.revocationPropagationService.invalidateSessionLineage({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        invalidated_at: session.revoked_at ?? input.invalidated_at,
        reason_code: session.revocation_reason ?? "DEVICE_BINDING_INVALIDATED",
      });
    const invalidated_csrf_token_count =
      await this.dependencies.csrfTokenService.invalidateSessionTokens({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        invalidated_at: session.revoked_at ?? input.invalidated_at,
        reason_code: SESSION_SECURITY_REASON_CODES.browser_csrf_token_invalidated,
      });
    return {
      already_revoked: alreadyRevoked,
      invalidated_artifact_refs,
      invalidated_csrf_token_count,
      reason_codes: session.revocation_reason ? [session.revocation_reason] : [],
      session,
    };
  }
}
