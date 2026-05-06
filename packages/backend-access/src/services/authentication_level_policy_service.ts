import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveActorSessionLifecycleState,
  type ActorSessionRecord,
} from "../models/actor_session.ts";
import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const authenticationLevelPolicyPath = path.join(
  repoRoot,
  "config",
  "access",
  "authentication_level_policy.json",
);
const nonDelegableActionFamilyCatalogPath = path.join(
  repoRoot,
  "config",
  "access",
  "non_delegable_action_family_catalog.json",
);

type AuthenticationLevelPolicyRule = {
  action_family: string;
  fresh_step_up_required: boolean;
  policy_path_ref: string;
  reason_code: string;
  required_authn_level: Exclude<
    AuthorizationDecisionRecord["required_authn_level"],
    null
  >;
  resource_class: string;
  rule_ref: string;
};

type SessionChallengePolicy = {
  expired_reason_code: string;
  invalidated_artifact_kinds: string[];
  missing_reason_code: string;
  rotation_required_after_completion: true;
  satisfied_reason_code: string;
  step_up_freshness_window_seconds: number;
};

type SessionClientTransitionRule = {
  issuable_authn_levels: ActorSessionRecord["authn_level"][];
  principal_classes: ActorSessionRecord["principal_class"][];
  session_client_class: ActorSessionRecord["session_client_class"];
  step_up_completion_allowed: boolean;
};

export type AuthenticationLevelPolicy = {
  basis_statement: string;
  contract_version: "AUTHENTICATION_LEVEL_POLICY_V1";
  rules: AuthenticationLevelPolicyRule[];
  session_challenge_policy: SessionChallengePolicy;
  session_client_transition_rules: SessionClientTransitionRule[];
};

type NonDelegableActionFamilyEntry = {
  action_family: string;
  exceptional_authority_requires_human_step_up: boolean;
  fresh_human_step_up_required: boolean;
  policy_path_ref: string;
};

export type NonDelegableActionFamilyCatalog = {
  action_families: NonDelegableActionFamilyEntry[];
  basis_statement: string;
  contract_version: "NON_DELEGABLE_ACTION_FAMILY_CATALOG_V1";
};

export type AuthorizationAuthenticationLevelResolution = {
  fresh_step_up_required: boolean;
  missing_reason_code: string;
  non_delegable: boolean;
  principal_class_supported: boolean;
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  required_reason_code: string | null;
  satisfied_reason_code: string;
};

export type SessionAuthenticationPosture = {
  reason_codes: string[];
  required: boolean;
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  rotation_required_after_completion: boolean;
  satisfied: boolean;
  state: "EXPIRED" | "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED" | "UNSUPPORTED";
  step_up_expires_at: string | null;
};

const authnPriority = {
  BASIC: 0,
  MFA: 1,
  STEP_UP: 2,
} as const;

let cachedAuthenticationLevelPolicy: Promise<AuthenticationLevelPolicy> | null =
  null;
let cachedNonDelegableCatalog: Promise<NonDelegableActionFamilyCatalog> | null =
  null;

function addSeconds(instant: string, seconds: number) {
  return new Date(new Date(instant).valueOf() + seconds * 1_000).toISOString();
}

function authnSatisfies(
  actual: PrincipalContextRecord["authn_level"] | ActorSessionRecord["authn_level"],
  required: Exclude<AuthorizationDecisionRecord["required_authn_level"], null>,
) {
  return authnPriority[actual] >= authnPriority[required];
}

function normalizeAuthnLevelPolicy(
  parsed: AuthenticationLevelPolicy,
): AuthenticationLevelPolicy {
  if (parsed.contract_version !== "AUTHENTICATION_LEVEL_POLICY_V1") {
    throw new Error("Unexpected authentication-level policy version.");
  }
  return {
    ...parsed,
    rules: parsed.rules.map((rule) => ({
      ...rule,
      action_family: requireTrimmedString(
        "authentication_level_policy.rules[].action_family",
        rule.action_family,
      ),
      resource_class: requireTrimmedString(
        "authentication_level_policy.rules[].resource_class",
        rule.resource_class,
      ),
      reason_code: requireTrimmedString(
        "authentication_level_policy.rules[].reason_code",
        rule.reason_code,
      ),
      policy_path_ref: requireTrimmedString(
        "authentication_level_policy.rules[].policy_path_ref",
        rule.policy_path_ref,
      ),
    })),
    session_challenge_policy: {
      ...parsed.session_challenge_policy,
      invalidated_artifact_kinds: normalizeStringSet(
        "authentication_level_policy.session_challenge_policy.invalidated_artifact_kinds",
        parsed.session_challenge_policy.invalidated_artifact_kinds,
        { minItems: 1 },
      ),
    },
    session_client_transition_rules: parsed.session_client_transition_rules.map(
      (rule) => ({
        ...rule,
        session_client_class: requireTrimmedString(
          "authentication_level_policy.session_client_transition_rules[].session_client_class",
          rule.session_client_class,
        ) as SessionClientTransitionRule["session_client_class"],
        principal_classes: normalizeStringSet(
          "authentication_level_policy.session_client_transition_rules[].principal_classes",
          rule.principal_classes,
          { minItems: 1 },
        ) as SessionClientTransitionRule["principal_classes"],
        issuable_authn_levels: normalizeStringSet(
          "authentication_level_policy.session_client_transition_rules[].issuable_authn_levels",
          rule.issuable_authn_levels,
          { minItems: 1 },
        ) as SessionClientTransitionRule["issuable_authn_levels"],
      }),
    ),
  };
}

function normalizeNonDelegableCatalog(
  parsed: NonDelegableActionFamilyCatalog,
): NonDelegableActionFamilyCatalog {
  if (parsed.contract_version !== "NON_DELEGABLE_ACTION_FAMILY_CATALOG_V1") {
    throw new Error("Unexpected non-delegable action-family catalog version.");
  }
  return {
    ...parsed,
    action_families: parsed.action_families.map((entry) => ({
      ...entry,
      action_family: requireTrimmedString(
        "non_delegable_action_family_catalog.action_families[].action_family",
        entry.action_family,
      ),
      policy_path_ref: requireTrimmedString(
        "non_delegable_action_family_catalog.action_families[].policy_path_ref",
        entry.policy_path_ref,
      ),
    })),
  };
}

export async function loadAuthenticationLevelPolicy(options?: { reload?: boolean }) {
  if (!cachedAuthenticationLevelPolicy || options?.reload) {
    cachedAuthenticationLevelPolicy = readFile(
      authenticationLevelPolicyPath,
      "utf8",
    ).then((raw) =>
      normalizeAuthnLevelPolicy(JSON.parse(raw) as AuthenticationLevelPolicy),
    );
  }
  return cachedAuthenticationLevelPolicy;
}

export async function loadNonDelegableActionFamilyCatalog(options?: {
  reload?: boolean;
}) {
  if (!cachedNonDelegableCatalog || options?.reload) {
    cachedNonDelegableCatalog = readFile(
      nonDelegableActionFamilyCatalogPath,
      "utf8",
    ).then((raw) =>
      normalizeNonDelegableCatalog(
        JSON.parse(raw) as NonDelegableActionFamilyCatalog,
      ),
    );
  }
  return cachedNonDelegableCatalog;
}

export class AuthenticationLevelPolicyService {
  async load(options?: { reload?: boolean }) {
    return loadAuthenticationLevelPolicy(options);
  }

  async loadNonDelegableCatalog(options?: { reload?: boolean }) {
    return loadNonDelegableActionFamilyCatalog(options);
  }

  async resolveAuthorizationRequirement(input: {
    action_family: string;
    exceptional_authority_active?: boolean;
    principal_context: PrincipalContextRecord;
    resource_class: string;
  }): Promise<AuthorizationAuthenticationLevelResolution> {
    const [policy, nonDelegableCatalog] = await Promise.all([
      this.load(),
      this.loadNonDelegableCatalog(),
    ]);
    const actionFamily = requireTrimmedString("action_family", input.action_family);
    const resourceClass = requireTrimmedString("resource_class", input.resource_class);
    const rule =
      policy.rules.find(
        (candidate) =>
          candidate.resource_class === resourceClass &&
          candidate.action_family === actionFamily,
      ) ?? null;
    const nonDelegable =
      nonDelegableCatalog.action_families.find(
        (candidate) => candidate.action_family === actionFamily,
      ) ?? null;
    const exceptionalAuthorityActive = input.exceptional_authority_active === true;
    const freshStepUpRequired =
      rule?.fresh_step_up_required === true ||
      (exceptionalAuthorityActive &&
        nonDelegable?.exceptional_authority_requires_human_step_up === true);
    const requiredAuthnLevel =
      rule?.required_authn_level ??
      (freshStepUpRequired ? "STEP_UP" : null);
    const principalClassSupported =
      requiredAuthnLevel === null
        ? true
        : input.principal_context.principal_type === "HUMAN";

    return {
      required_authn_level: requiredAuthnLevel,
      required_reason_code:
        requiredAuthnLevel === null ? null : (rule?.reason_code ?? null),
      satisfied_reason_code: policy.session_challenge_policy.satisfied_reason_code,
      missing_reason_code: policy.session_challenge_policy.missing_reason_code,
      fresh_step_up_required: freshStepUpRequired,
      non_delegable: nonDelegable !== null,
      principal_class_supported: principalClassSupported,
    };
  }

  async resolveSessionAuthenticationPosture(input: {
    as_of: string;
    required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
    session: ActorSessionRecord;
  }): Promise<SessionAuthenticationPosture> {
    const policy = await this.load();
    const requiredAuthnLevel = input.required_authn_level;
    if (requiredAuthnLevel === null) {
      return {
        required: false,
        required_authn_level: null,
        satisfied: true,
        state: "NOT_REQUIRED",
        reason_codes: [],
        step_up_expires_at: null,
        rotation_required_after_completion:
          policy.session_challenge_policy.rotation_required_after_completion,
      };
    }

    const asOf = normalizeUtcInstantString(input.as_of);
    const lifecycleState = deriveActorSessionLifecycleState(input.session, asOf);
    if (input.session.principal_class !== "HUMAN") {
      return {
        required: true,
        required_authn_level: requiredAuthnLevel,
        satisfied: false,
        state: "UNSUPPORTED",
        reason_codes: ["SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED"],
        step_up_expires_at: null,
        rotation_required_after_completion:
          policy.session_challenge_policy.rotation_required_after_completion,
      };
    }

    if (
      lifecycleState === "REVOKED" ||
      lifecycleState === "DEVICE_INVALIDATED" ||
      lifecycleState === "EXPIRED"
    ) {
      return {
        required: true,
        required_authn_level: requiredAuthnLevel,
        satisfied: false,
        state: "EXPIRED",
        reason_codes: [policy.session_challenge_policy.expired_reason_code],
        step_up_expires_at: null,
        rotation_required_after_completion:
          policy.session_challenge_policy.rotation_required_after_completion,
      };
    }

    if (requiredAuthnLevel !== "STEP_UP") {
      const satisfied = authnSatisfies(input.session.authn_level, requiredAuthnLevel);
      return {
        required: true,
        required_authn_level: requiredAuthnLevel,
        satisfied,
        state: satisfied ? "SATISFIED" : "REQUIRED_PENDING",
        reason_codes: satisfied
          ? [policy.session_challenge_policy.satisfied_reason_code]
          : [policy.session_challenge_policy.missing_reason_code],
        step_up_expires_at: null,
        rotation_required_after_completion:
          policy.session_challenge_policy.rotation_required_after_completion,
      };
    }

    if (
      input.session.step_up_state === "SATISFIED" &&
      input.session.authn_level === "STEP_UP" &&
      input.session.step_up_completed_at !== null
    ) {
      const stepUpExpiresAt = addSeconds(
        input.session.step_up_completed_at,
        policy.session_challenge_policy.step_up_freshness_window_seconds,
      );
      const satisfied = asOf <= stepUpExpiresAt;
      return {
        required: true,
        required_authn_level: requiredAuthnLevel,
        satisfied,
        state: satisfied ? "SATISFIED" : "EXPIRED",
        reason_codes: satisfied
          ? [policy.session_challenge_policy.satisfied_reason_code]
          : [policy.session_challenge_policy.expired_reason_code],
        step_up_expires_at: stepUpExpiresAt,
        rotation_required_after_completion:
          policy.session_challenge_policy.rotation_required_after_completion,
      };
    }

    return {
      required: true,
      required_authn_level: requiredAuthnLevel,
      satisfied: false,
      state:
        input.session.step_up_state === "EXPIRED" ? "EXPIRED" : "REQUIRED_PENDING",
      reason_codes: [
        input.session.step_up_state === "EXPIRED"
          ? policy.session_challenge_policy.expired_reason_code
          : policy.session_challenge_policy.missing_reason_code,
      ],
      step_up_expires_at: null,
      rotation_required_after_completion:
        policy.session_challenge_policy.rotation_required_after_completion,
    };
  }

  async assertStepUpCompletionSupported(session: ActorSessionRecord) {
    const policy = await this.load();
    const rule =
      policy.session_client_transition_rules.find(
        (candidate) =>
          candidate.session_client_class === session.session_client_class &&
          candidate.principal_classes.includes(session.principal_class),
      ) ?? null;
    if (!rule || !rule.step_up_completion_allowed) {
      throw new Error(
        `step-up completion is not supported for ${session.principal_class}/${session.session_client_class} sessions`,
      );
    }
    return {
      rotation_required_after_completion:
        policy.session_challenge_policy.rotation_required_after_completion,
      invalidated_artifact_kinds: [
        ...policy.session_challenge_policy.invalidated_artifact_kinds,
      ],
    };
  }
}
