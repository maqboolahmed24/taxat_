import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import { SessionLifecycleService } from "../session/session_lifecycle_service.ts";
import { StepUpPolicyService } from "./step_up_policy_service.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "./principal_context_normalizer.ts";

export type SessionChallengeArtifactKind =
  | "COMMAND_TOKEN"
  | "RESUME_TOKEN"
  | "UPLOAD_CONTROL";

export type SessionChallengeArtifactRecord = {
  artifact_kind: SessionChallengeArtifactKind;
  artifact_ref: string;
  invalidated_at: string | null;
  issued_at: string;
  session_binding_hash: string;
  session_id: string;
  tenant_id: string;
};

type SessionChallengeRotationErrorCode =
  | "SESSION_CHALLENGE_ARTIFACT_INVALIDATED"
  | "SESSION_CHALLENGE_ARTIFACT_NOT_FOUND"
  | "SESSION_CHALLENGE_STEP_UP_NOT_FRESH";

export class SessionChallengeRotationServiceError extends Error {
  readonly code: SessionChallengeRotationErrorCode;
  readonly reason_codes: string[];

  constructor(
    code: SessionChallengeRotationErrorCode,
    detail: string,
    reason_codes: string[] = [],
  ) {
    super(`${code}: ${detail}`);
    this.name = "SessionChallengeRotationServiceError";
    this.code = code;
    this.reason_codes = reason_codes;
  }
}

function artifactKey(tenantId: string, artifactRef: string) {
  return `${tenantId}::${artifactRef}`;
}

export class SessionChallengeRotationService {
  private readonly artifacts = new Map<string, SessionChallengeArtifactRecord>();
  private readonly stepUpPolicyService: StepUpPolicyService;

  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      sessionLifecycleService: SessionLifecycleService;
      stepUpPolicyService?: StepUpPolicyService;
    },
  ) {
    this.stepUpPolicyService =
      dependencies.stepUpPolicyService ?? new StepUpPolicyService();
  }

  async registerArtifact(input: {
    artifact_kind: SessionChallengeArtifactKind;
    artifact_ref: string;
    issued_at: string;
    session_id: string;
    tenant_id: string;
  }) {
    const session = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const record: SessionChallengeArtifactRecord = {
      artifact_kind: input.artifact_kind,
      artifact_ref: requireTrimmedString("artifact_ref", input.artifact_ref),
      issued_at: normalizeUtcInstantString(input.issued_at),
      invalidated_at: null,
      session_binding_hash: session.session_binding_hash,
      session_id: session.session_id,
      tenant_id: session.tenant_id,
    };
    this.artifacts.set(artifactKey(record.tenant_id, record.artifact_ref), record);
    return structuredClone(record);
  }

  async completeStepUp(input: {
    completed_at: string;
    rotated_session_binding_hash: string;
    session_id: string;
    source_ref?: string | null;
    tenant_id: string;
  }) {
    const current = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const rotationPolicy =
      await this.stepUpPolicyService.assertStepUpCompletionSupported(current);
    const next = await this.dependencies.sessionLifecycleService.completeStepUp({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      completed_at: input.completed_at,
      rotated_session_binding_hash: input.rotated_session_binding_hash,
      source_ref: input.source_ref ?? null,
    });

    const invalidatedArtifactRefs: string[] = [];
    for (const [key, artifact] of this.artifacts.entries()) {
      if (
        artifact.tenant_id === input.tenant_id &&
        artifact.session_id === input.session_id &&
        artifact.invalidated_at === null &&
        rotationPolicy.invalidated_artifact_kinds.includes(artifact.artifact_kind) &&
        artifact.session_binding_hash === current.session_binding_hash
      ) {
        this.artifacts.set(key, {
          ...artifact,
          invalidated_at: normalizeUtcInstantString(input.completed_at),
        });
        invalidatedArtifactRefs.push(artifact.artifact_ref);
      }
    }

    return {
      session: next,
      invalidated_artifact_refs: invalidatedArtifactRefs.sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }

  async assertArtifactActive(input: {
    artifact_ref: string;
    session_id: string;
    tenant_id: string;
  }) {
    const key = artifactKey(input.tenant_id, input.artifact_ref);
    const artifact = this.artifacts.get(key);
    if (!artifact || artifact.session_id !== input.session_id) {
      throw new SessionChallengeRotationServiceError(
        "SESSION_CHALLENGE_ARTIFACT_NOT_FOUND",
        `artifact ${input.artifact_ref} is not registered for replay`,
      );
    }
    const current = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    if (
      artifact.invalidated_at !== null ||
      artifact.session_binding_hash !== current.session_binding_hash
    ) {
      throw new SessionChallengeRotationServiceError(
        "SESSION_CHALLENGE_ARTIFACT_INVALIDATED",
        `artifact ${input.artifact_ref} is stale after session challenge rotation`,
      );
    }
    return structuredClone(artifact);
  }

  async assertFreshStepUp(input: {
    as_of: string;
    required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
    session_id: string;
    tenant_id: string;
  }) {
    const session = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const posture = await this.stepUpPolicyService.evaluateSession({
      as_of: input.as_of,
      required_authn_level: input.required_authn_level,
      session,
    });
    if (!posture.satisfied) {
      throw new SessionChallengeRotationServiceError(
        "SESSION_CHALLENGE_STEP_UP_NOT_FRESH",
        "session challenge posture is not fresh for the requested operation",
        posture.reason_codes,
      );
    }
    return posture;
  }

  async listArtifactsForSession(tenantId: string, sessionId: string) {
    return [...this.artifacts.values()]
      .filter(
        (artifact) =>
          artifact.tenant_id === tenantId && artifact.session_id === sessionId,
      )
      .sort((left, right) => left.issued_at.localeCompare(right.issued_at))
      .map((artifact) => structuredClone(artifact));
  }
}
