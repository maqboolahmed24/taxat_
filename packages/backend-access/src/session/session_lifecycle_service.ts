import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveActorSessionLifecycleState,
  type ActorSessionLifecycleState,
  type ActorSessionRecord,
} from "../models/actor_session.ts";
import { isTenantActive } from "../models/tenant.ts";
import { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import { TenantRepository } from "../repositories/tenant_repository.ts";
import { UserRepository } from "../repositories/user_repository.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const policyPath = path.join(repoRoot, "config", "access", "session_lifecycle_policy.json");

export type SessionLifecyclePolicy = {
  contract_version: "SESSION_LIFECYCLE_POLICY_V1";
  basis_statement: string;
  issue_policy: {
    browser: {
      anti_csrf_binding_required: true;
      max_ttl_minutes: number;
      principal_class: "HUMAN";
      transition_reason_code: string;
    };
    native: {
      allowed_device_binding_states: Array<"BOUND" | "UNVERIFIED">;
      max_ttl_minutes: number;
      principal_class: "HUMAN";
      transition_reason_code: string;
    };
    automation: {
      allowed_principal_classes: Array<"SERVICE" | "EXTERNAL">;
      max_ttl_minutes: number;
      transition_reason_code: string;
    };
  };
  last_seen_policy: {
    minimum_update_interval_seconds: number;
    monotonic_write_policy: "GREATEST_ONLY";
  };
  step_up_policy: {
    authn_level_after_completion: "STEP_UP";
    completion_reason_code: string;
    completion_requires_binding_rotation: true;
  };
  device_binding_policy: {
    invalidated_reason_code: string;
    surface_state: "DEVICE_INVALIDATED";
  };
  revocation_policy: {
    admin_reason_codes: string[];
    compromise_reason_codes: string[];
    expiry_reason_code: string;
    state_precedence: Array<"DEVICE_INVALIDATED" | "REVOKED" | "EXPIRED">;
    user_initiated_reason_codes: string[];
  };
  sensitive_material_policy: {
    persist_posture: "REFERENCES_AND_HASHES_ONLY";
    prohibited_field_patterns: string[];
  };
};

export type SessionPostureResolution = {
  session: ActorSessionRecord;
  effective_state: ActorSessionLifecycleState;
  reason_codes: string[];
  revocation_class:
    | "USER_INITIATED"
    | "ADMINISTRATIVE"
    | "COMPROMISE_RESPONSE"
    | "DEVICE_BINDING_INVALIDATED"
    | "TENANT_STATE"
    | "SESSION_EXPIRY"
    | null;
  revoked: boolean;
  tenant_resolution: "ACTIVE" | "DISABLED" | "MISSING";
  usable: boolean;
};

type IssueBrowserSessionInput = {
  tenant_id: string;
  user_id: string;
  session_id: string;
  authn_level: "BASIC" | "MFA" | "STEP_UP";
  step_up_state: "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED";
  session_binding_hash: string;
  csrf_ref: string;
  issued_at: string;
  expires_at: string;
  source_ref?: string | null;
};

type IssueNativeSessionInput = {
  tenant_id: string;
  user_id: string;
  session_id: string;
  authn_level: "BASIC" | "MFA" | "STEP_UP";
  step_up_state: "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED";
  session_binding_hash: string;
  device_binding_state: "BOUND" | "UNVERIFIED";
  issued_at: string;
  expires_at: string;
  source_ref?: string | null;
};

type IssueAutomationSessionInput = {
  tenant_id: string;
  principal_ref: string;
  principal_class: "SERVICE" | "EXTERNAL";
  session_id: string;
  session_binding_hash: string;
  issued_at: string;
  expires_at: string;
  source_ref?: string | null;
};

function minutesBetween(start: string, end: string) {
  return (new Date(end).valueOf() - new Date(start).valueOf()) / 60_000;
}

function assertTtlWithinLimit(
  issuedAt: string,
  expiresAt: string,
  maxTtlMinutes: number,
  label: string,
) {
  const ttlMinutes = minutesBetween(issuedAt, expiresAt);
  if (ttlMinutes <= 0 || ttlMinutes > maxTtlMinutes) {
    throw new Error(`${label} TTL must be > 0 and <= ${maxTtlMinutes} minutes`);
  }
}

function classifyRevocation(policy: SessionLifecyclePolicy, reasonCode: string) {
  if (reasonCode === policy.device_binding_policy.invalidated_reason_code) {
    return "DEVICE_BINDING_INVALIDATED" as const;
  }
  if (reasonCode === policy.revocation_policy.expiry_reason_code) {
    return "SESSION_EXPIRY" as const;
  }
  if (policy.revocation_policy.user_initiated_reason_codes.includes(reasonCode)) {
    return "USER_INITIATED" as const;
  }
  if (policy.revocation_policy.compromise_reason_codes.includes(reasonCode)) {
    return "COMPROMISE_RESPONSE" as const;
  }
  if (policy.revocation_policy.admin_reason_codes.includes(reasonCode)) {
    return "ADMINISTRATIVE" as const;
  }
  return "ADMINISTRATIVE" as const;
}

let cachedPolicy: Promise<SessionLifecyclePolicy> | null = null;

export async function loadSessionLifecyclePolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = readFile(policyPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as SessionLifecyclePolicy;
      if (parsed.contract_version !== "SESSION_LIFECYCLE_POLICY_V1") {
        throw new Error("Unexpected session lifecycle policy version.");
      }
      return parsed;
    });
  }
  return cachedPolicy;
}

export class SessionLifecycleService {
  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      tenantRepository: TenantRepository;
      userRepository: UserRepository;
    },
  ) {}

  async issueBrowserSession(input: IssueBrowserSessionInput) {
    const policy = await loadSessionLifecyclePolicy();
    assertTtlWithinLimit(
      input.issued_at,
      input.expires_at,
      policy.issue_policy.browser.max_ttl_minutes,
      "Browser session",
    );
    await this.dependencies.tenantRepository.requireActiveTenant(input.tenant_id);
    await this.dependencies.userRepository.requireActiveUser(input.tenant_id, input.user_id);
    return this.dependencies.actorSessionRepository.issueSession({
      artifact_type: "ActorSession",
      session_id: input.session_id,
      tenant_id: input.tenant_id,
      principal_ref: input.user_id,
      principal_user_id_or_null: input.user_id,
      principal_class: policy.issue_policy.browser.principal_class,
      session_client_class: "BROWSER",
      authn_level: input.authn_level,
      step_up_state: input.step_up_state,
      session_binding_hash: input.session_binding_hash,
      csrf_ref: input.csrf_ref,
      device_binding_state: "NOT_APPLICABLE",
      issued_at: input.issued_at,
      expires_at: input.expires_at,
      revoked_at: null,
      revocation_reason: null,
      step_up_completed_at: input.step_up_state === "SATISFIED" ? input.issued_at : null,
      last_seen_at: null,
      lifecycle_state: input.step_up_state === "SATISFIED" ? "STEPPED_UP" : "ISSUED",
      transition_reason_code: policy.issue_policy.browser.transition_reason_code,
      source_ref: input.source_ref ?? null,
    });
  }

  async issueNativeSession(input: IssueNativeSessionInput) {
    const policy = await loadSessionLifecyclePolicy();
    assertTtlWithinLimit(
      input.issued_at,
      input.expires_at,
      policy.issue_policy.native.max_ttl_minutes,
      "Native session",
    );
    if (!policy.issue_policy.native.allowed_device_binding_states.includes(input.device_binding_state)) {
      throw new Error(`Native session device binding ${input.device_binding_state} is not issuable.`);
    }
    await this.dependencies.tenantRepository.requireActiveTenant(input.tenant_id);
    await this.dependencies.userRepository.requireActiveUser(input.tenant_id, input.user_id);
    return this.dependencies.actorSessionRepository.issueSession({
      artifact_type: "ActorSession",
      session_id: input.session_id,
      tenant_id: input.tenant_id,
      principal_ref: input.user_id,
      principal_user_id_or_null: input.user_id,
      principal_class: policy.issue_policy.native.principal_class,
      session_client_class: "NATIVE",
      authn_level: input.authn_level,
      step_up_state: input.step_up_state,
      session_binding_hash: input.session_binding_hash,
      csrf_ref: null,
      device_binding_state: input.device_binding_state,
      issued_at: input.issued_at,
      expires_at: input.expires_at,
      revoked_at: null,
      revocation_reason: null,
      step_up_completed_at: input.step_up_state === "SATISFIED" ? input.issued_at : null,
      last_seen_at: null,
      lifecycle_state: input.step_up_state === "SATISFIED" ? "STEPPED_UP" : "ISSUED",
      transition_reason_code: policy.issue_policy.native.transition_reason_code,
      source_ref: input.source_ref ?? null,
    });
  }

  async issueAutomationSession(input: IssueAutomationSessionInput) {
    const policy = await loadSessionLifecyclePolicy();
    assertTtlWithinLimit(
      input.issued_at,
      input.expires_at,
      policy.issue_policy.automation.max_ttl_minutes,
      "Automation session",
    );
    if (!policy.issue_policy.automation.allowed_principal_classes.includes(input.principal_class)) {
      throw new Error(`Automation principal_class ${input.principal_class} is not permitted.`);
    }
    await this.dependencies.tenantRepository.requireActiveTenant(input.tenant_id);
    return this.dependencies.actorSessionRepository.issueSession({
      artifact_type: "ActorSession",
      session_id: input.session_id,
      tenant_id: input.tenant_id,
      principal_ref: input.principal_ref,
      principal_user_id_or_null: null,
      principal_class: input.principal_class,
      session_client_class: "AUTOMATION",
      authn_level: "BASIC",
      step_up_state: "NOT_REQUIRED",
      session_binding_hash: input.session_binding_hash,
      csrf_ref: null,
      device_binding_state: "NOT_APPLICABLE",
      issued_at: input.issued_at,
      expires_at: input.expires_at,
      revoked_at: null,
      revocation_reason: null,
      step_up_completed_at: null,
      last_seen_at: null,
      lifecycle_state: "ISSUED",
      transition_reason_code: policy.issue_policy.automation.transition_reason_code,
      source_ref: input.source_ref ?? null,
    });
  }

  async recordLastSeen(input: { tenant_id: string; session_id: string; observed_at: string }) {
    const policy = await loadSessionLifecyclePolicy();
    const current = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    if (current.last_seen_at !== null) {
      const secondsSinceLastSeen =
        (new Date(input.observed_at).valueOf() - new Date(current.last_seen_at).valueOf()) / 1_000;
      if (secondsSinceLastSeen < policy.last_seen_policy.minimum_update_interval_seconds) {
        return current;
      }
    }
    return this.dependencies.actorSessionRepository.recordLastSeen(
      input.tenant_id,
      input.session_id,
      input.observed_at,
    );
  }

  async completeStepUp(input: {
    tenant_id: string;
    session_id: string;
    completed_at: string;
    rotated_session_binding_hash: string;
    source_ref?: string | null;
  }) {
    const policy = await loadSessionLifecyclePolicy();
    if (!policy.step_up_policy.completion_requires_binding_rotation) {
      throw new Error("The session lifecycle policy requires explicit binding rotation on step-up.");
    }
    return this.dependencies.actorSessionRepository.completeStepUp(input.tenant_id, input.session_id, {
      completed_at: input.completed_at,
      rotated_session_binding_hash: input.rotated_session_binding_hash,
      reason_code: policy.step_up_policy.completion_reason_code,
      source_ref: input.source_ref ?? null,
    });
  }

  async revokeSession(input: {
    tenant_id: string;
    session_id: string;
    revoked_at: string;
    reason_code: string;
    source_ref?: string | null;
  }) {
    const policy = await loadSessionLifecyclePolicy();
    return this.dependencies.actorSessionRepository.revokeSession(input.tenant_id, input.session_id, {
      revoked_at: input.revoked_at,
      revocation_reason: input.reason_code,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      revocation_class: classifyRevocation(policy, input.reason_code),
    });
  }

  async invalidateDeviceBinding(input: {
    tenant_id: string;
    session_id: string;
    invalidated_at: string;
    source_ref?: string | null;
  }) {
    const policy = await loadSessionLifecyclePolicy();
    return this.dependencies.actorSessionRepository.revokeSession(input.tenant_id, input.session_id, {
      revoked_at: input.invalidated_at,
      revocation_reason: policy.device_binding_policy.invalidated_reason_code,
      reason_code: policy.device_binding_policy.invalidated_reason_code,
      source_ref: input.source_ref ?? null,
      revocation_class: "DEVICE_BINDING_INVALIDATED",
      device_binding_invalidated: true,
    });
  }

  async expireIfDue(input: {
    tenant_id: string;
    session_id: string;
    evaluated_at: string;
    source_ref?: string | null;
  }) {
    const policy = await loadSessionLifecyclePolicy();
    return this.dependencies.actorSessionRepository.expireSession(input.tenant_id, input.session_id, {
      evaluated_at: input.evaluated_at,
      reason_code: policy.revocation_policy.expiry_reason_code,
      source_ref: input.source_ref ?? null,
    });
  }

  async resolveSessionPosture(input: {
    tenant_id: string;
    session_id: string;
    as_of: string;
  }): Promise<SessionPostureResolution> {
    let session = await this.dependencies.actorSessionRepository.requireBySessionId(
      input.tenant_id,
      input.session_id,
    );
    const tenant = await this.dependencies.tenantRepository.getById(input.tenant_id);

    if (!tenant) {
      return {
        session,
        effective_state: "REVOKED",
        reason_codes: ["TENANT_MISSING"],
        revocation_class: "TENANT_STATE",
        revoked: true,
        tenant_resolution: "MISSING",
        usable: false,
      };
    }

    if (!isTenantActive(tenant)) {
      return {
        session,
        effective_state: "REVOKED",
        reason_codes: ["TENANT_DISABLED"],
        revocation_class: "TENANT_STATE",
        revoked: true,
        tenant_resolution: "DISABLED",
        usable: false,
      };
    }

    let effective_state = deriveActorSessionLifecycleState(session, input.as_of);
    if (effective_state === "EXPIRED" && session.lifecycle_state !== "EXPIRED" && session.revoked_at === null) {
      session = await this.expireIfDue({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        evaluated_at: input.as_of,
      });
      effective_state = "EXPIRED";
    }

    if (effective_state === "DEVICE_INVALIDATED") {
      return {
        session,
        effective_state,
        reason_codes: ["DEVICE_BINDING_INVALIDATED"],
        revocation_class: "DEVICE_BINDING_INVALIDATED",
        revoked: true,
        tenant_resolution: "ACTIVE",
        usable: false,
      };
    }

    if (effective_state === "REVOKED") {
      const policy = await loadSessionLifecyclePolicy();
      return {
        session,
        effective_state,
        reason_codes: session.revocation_reason ? [session.revocation_reason] : ["SESSION_REVOKED"],
        revocation_class: session.revocation_reason
          ? classifyRevocation(policy, session.revocation_reason)
          : "ADMINISTRATIVE",
        revoked: true,
        tenant_resolution: "ACTIVE",
        usable: false,
      };
    }

    if (effective_state === "EXPIRED") {
      return {
        session,
        effective_state,
        reason_codes: ["SESSION_EXPIRED"],
        revocation_class: "SESSION_EXPIRY",
        revoked: false,
        tenant_resolution: "ACTIVE",
        usable: false,
      };
    }

    return {
      session,
      effective_state,
      reason_codes:
        effective_state === "STEPPED_UP"
          ? ["STEP_UP_SATISFIED"]
          : effective_state === "ACTIVE"
            ? ["SESSION_ACTIVE"]
            : ["SESSION_ISSUED"],
      revocation_class: null,
      revoked: false,
      tenant_resolution: "ACTIVE",
      usable: true,
    };
  }
}
