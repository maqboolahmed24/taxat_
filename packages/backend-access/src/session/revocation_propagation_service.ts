import type { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import { SessionLifecycleService } from "./session_lifecycle_service.ts";
import {
  SESSION_SECURITY_REASON_CODES,
} from "./session_security_reason_codes.ts";
import {
  type SessionChallengeArtifactKind,
} from "../services/session_challenge_rotation_service.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../services/principal_context_normalizer.ts";

export type SessionBoundArtifactKind =
  | SessionChallengeArtifactKind
  | "CACHED_CONTINUATION"
  | "STREAM_RESUME";

export type SessionBoundArtifactRecord = {
  artifact_kind: SessionBoundArtifactKind;
  artifact_ref: string;
  invalidated_at: string | null;
  invalidated_reason_code_or_null: string | null;
  issued_at: string;
  session_binding_hash: string;
  session_id: string;
  tenant_id: string;
};

type RevocationPropagationErrorCode =
  | "SESSION_BOUND_ARTIFACT_INVALIDATED"
  | "SESSION_BOUND_ARTIFACT_NOT_FOUND"
  | "SESSION_BOUND_ARTIFACT_STALE";

export class RevocationPropagationServiceError extends Error {
  readonly code: RevocationPropagationErrorCode;
  readonly reason_codes: string[];

  constructor(code: RevocationPropagationErrorCode, detail: string, reason_codes: string[] = []) {
    super(`${code}: ${detail}`);
    this.name = "RevocationPropagationServiceError";
    this.code = code;
    this.reason_codes = reason_codes;
  }
}

function artifactKey(tenantId: string, artifactRef: string) {
  return `${tenantId}::${artifactRef}`;
}

function cloneArtifactRecord(record: SessionBoundArtifactRecord) {
  return structuredClone(record);
}

export class RevocationPropagationService {
  private readonly artifacts = new Map<string, SessionBoundArtifactRecord>();

  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      sessionLifecycleService: SessionLifecycleService;
    },
  ) {}

  async registerArtifact(input: {
    artifact_kind: SessionBoundArtifactKind;
    artifact_ref: string;
    issued_at: string;
    session_id: string;
    tenant_id: string;
  }) {
    const session = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const record: SessionBoundArtifactRecord = {
      artifact_kind: input.artifact_kind,
      artifact_ref: requireTrimmedString("artifact_ref", input.artifact_ref),
      invalidated_at: null,
      invalidated_reason_code_or_null: null,
      issued_at: normalizeUtcInstantString(input.issued_at),
      session_binding_hash: session.session_binding_hash,
      session_id: session.session_id,
      tenant_id: session.tenant_id,
    };
    this.artifacts.set(artifactKey(record.tenant_id, record.artifact_ref), record);
    return cloneArtifactRecord(record);
  }

  async invalidateSessionLineage(input: {
    invalidated_at: string;
    reason_code: string;
    session_id: string;
    tenant_id: string;
  }) {
    const invalidatedAt = normalizeUtcInstantString(input.invalidated_at);
    const invalidatedArtifactRefs: string[] = [];
    for (const [key, artifact] of this.artifacts.entries()) {
      if (
        artifact.tenant_id === input.tenant_id &&
        artifact.session_id === input.session_id &&
        artifact.invalidated_at === null
      ) {
        this.artifacts.set(key, {
          ...artifact,
          invalidated_at: invalidatedAt,
          invalidated_reason_code_or_null: requireTrimmedString(
            "reason_code",
            input.reason_code,
          ),
        });
        invalidatedArtifactRefs.push(artifact.artifact_ref);
      }
    }
    return invalidatedArtifactRefs.sort((left, right) => left.localeCompare(right));
  }

  async assertArtifactActive(input: {
    artifact_ref: string;
    as_of: string;
    session_id: string;
    tenant_id: string;
  }) {
    const artifact = this.artifacts.get(artifactKey(input.tenant_id, input.artifact_ref));
    if (!artifact || artifact.session_id !== input.session_id) {
      throw new RevocationPropagationServiceError(
        "SESSION_BOUND_ARTIFACT_NOT_FOUND",
        `${input.artifact_ref} is not registered for session-bound replay`,
      );
    }
    const posture = await this.dependencies.sessionLifecycleService.resolveSessionPosture({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      as_of: input.as_of,
    });
    if (!posture.usable) {
      throw new RevocationPropagationServiceError(
        "SESSION_BOUND_ARTIFACT_INVALIDATED",
        `${input.artifact_ref} is no longer usable because the governing session is not usable`,
        [...posture.reason_codes],
      );
    }
    if (artifact.invalidated_at !== null) {
      throw new RevocationPropagationServiceError(
        "SESSION_BOUND_ARTIFACT_INVALIDATED",
        `${input.artifact_ref} has been invalidated`,
        [
          artifact.invalidated_reason_code_or_null ??
            SESSION_SECURITY_REASON_CODES.session_continuation_invalidated,
        ],
      );
    }
    if (artifact.session_binding_hash !== posture.session.session_binding_hash) {
      throw new RevocationPropagationServiceError(
        "SESSION_BOUND_ARTIFACT_STALE",
        `${input.artifact_ref} no longer matches the current session binding`,
        [SESSION_SECURITY_REASON_CODES.session_continuation_stale],
      );
    }
    return cloneArtifactRecord(artifact);
  }

  async listArtifactsForSession(tenantId: string, sessionId: string) {
    return [...this.artifacts.values()]
      .filter((artifact) => artifact.tenant_id === tenantId && artifact.session_id === sessionId)
      .sort((left, right) => left.issued_at.localeCompare(right.issued_at))
      .map((artifact) => cloneArtifactRecord(artifact));
  }
}
