import type { ActorSessionRecord } from "../models/actor_session.ts";
import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import {
  AuthenticationLevelPolicyService,
  type SessionAuthenticationPosture,
} from "./authentication_level_policy_service.ts";

const authnPriority = {
  BASIC: 0,
  MFA: 1,
  STEP_UP: 2,
} as const;

export type StepUpAuthorizationResolution = {
  policy_requirement_reason_code: string | null;
  principal_class_supported: boolean;
  reason_codes: string[];
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  step_up_required: boolean;
  step_up_satisfied: boolean;
};

export class StepUpPolicyService {
  private readonly authenticationLevelPolicyService: AuthenticationLevelPolicyService;

  constructor(dependencies?: {
    authenticationLevelPolicyService?: AuthenticationLevelPolicyService;
  }) {
    this.authenticationLevelPolicyService =
      dependencies?.authenticationLevelPolicyService ??
      new AuthenticationLevelPolicyService();
  }

  private authnSatisfies(
    actual: PrincipalContextRecord["authn_level"],
    required: Exclude<AuthorizationDecisionRecord["required_authn_level"], null>,
  ) {
    return authnPriority[actual] >= authnPriority[required];
  }

  async resolveForAuthorization(input: {
    action_family: string;
    exceptional_authority_active?: boolean;
    principal_context: PrincipalContextRecord;
    resource_class: string;
  }): Promise<StepUpAuthorizationResolution> {
    const resolution =
      await this.authenticationLevelPolicyService.resolveAuthorizationRequirement(
        input,
      );
    const requiredAuthnLevel = resolution.required_authn_level;
    const stepUpRequired = requiredAuthnLevel !== null;
    const stepUpSatisfied =
      requiredAuthnLevel !== null &&
      resolution.principal_class_supported &&
      this.authnSatisfies(input.principal_context.authn_level, requiredAuthnLevel);

    return {
      policy_requirement_reason_code: resolution.required_reason_code,
      required_authn_level: requiredAuthnLevel,
      step_up_required: stepUpRequired,
      step_up_satisfied: stepUpSatisfied,
      principal_class_supported: resolution.principal_class_supported,
      reason_codes:
        requiredAuthnLevel === null
          ? []
          : stepUpSatisfied
            ? [resolution.satisfied_reason_code]
            : resolution.required_reason_code === null
              ? [resolution.missing_reason_code]
              : [resolution.required_reason_code],
    };
  }

  async evaluateSession(input: {
    as_of: string;
    required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
    session: ActorSessionRecord;
  }): Promise<SessionAuthenticationPosture> {
    return this.authenticationLevelPolicyService.resolveSessionAuthenticationPosture(
      input,
    );
  }

  async assertStepUpCompletionSupported(session: ActorSessionRecord) {
    return this.authenticationLevelPolicyService.assertStepUpCompletionSupported(
      session,
    );
  }
}
