import type { ActorSessionRecord } from "../models/actor_session.ts";
import {
  CsrfTokenService,
  loadBrowserSessionSecurityPolicy,
  type CsrfTokenValidationResult,
} from "./csrf_token_service.ts";
import {
  DeviceBindingService,
  type DeviceBindingEvaluationResult,
  type DeviceBindingHeuristicSignals,
} from "./device_binding_service.ts";
import {
  SessionRevocationService,
  SessionRevocationServiceError,
} from "./session_revocation_service.ts";

type BrowserSessionGuardProblemCode =
  | "BROWSER_CLIENT_CLASS_INVALID"
  | "BROWSER_SESSION_BINDING_REJECTED"
  | "BROWSER_SESSION_CSRF_REJECTED"
  | "BROWSER_SESSION_NOT_USABLE"
  | "BROWSER_SESSION_ORIGIN_REJECTED"
  | "BROWSER_SESSION_REVALIDATION_REQUIRED";

export class BrowserSessionGuardError extends Error {
  readonly code: BrowserSessionGuardProblemCode;
  readonly problem_code: BrowserSessionGuardProblemCode;
  readonly reason_codes: string[];

  constructor(
    code: BrowserSessionGuardProblemCode,
    detail: string,
    reason_codes: string[] = [],
  ) {
    super(`${code}: ${detail}`);
    this.name = "BrowserSessionGuardError";
    this.code = code;
    this.problem_code = code;
    this.reason_codes = reason_codes;
  }
}

export type BrowserSessionGuardResult = {
  binding_evaluation: DeviceBindingEvaluationResult;
  csrf_validation: CsrfTokenValidationResult | null;
  reason_codes: string[];
  session: ActorSessionRecord;
  state_changing_request: boolean;
};

function isSameOrigin(expectedOriginRef: string | null | undefined, originRef: string | null | undefined) {
  if (!expectedOriginRef || !originRef) {
    return true;
  }
  return expectedOriginRef.trim() === originRef.trim();
}

export class BrowserSessionGuard {
  constructor(
    private readonly dependencies: {
      csrfTokenService: CsrfTokenService;
      deviceBindingService: DeviceBindingService;
      sessionRevocationService: SessionRevocationService;
    },
  ) {}

  async guard(input: {
    as_of: string;
    expected_origin_ref?: string | null;
    heuristic_signals?: DeviceBindingHeuristicSignals;
    http_method: string;
    origin_ref?: string | null;
    presented_csrf_token?: string | null;
    presented_session_binding_hash?: string | null;
    session_id: string;
    tenant_id: string;
  }): Promise<BrowserSessionGuardResult> {
    const policy = await loadBrowserSessionSecurityPolicy();
    let posture;
    try {
      posture = await this.dependencies.sessionRevocationService.assertSessionAccepted({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        as_of: input.as_of,
      });
    } catch (error) {
      if (error instanceof SessionRevocationServiceError) {
        throw new BrowserSessionGuardError(
          "BROWSER_SESSION_NOT_USABLE",
          error.message,
          error.reason_codes,
        );
      }
      throw error;
    }
    const session = posture.session;
    if (session.session_client_class !== "BROWSER") {
      throw new BrowserSessionGuardError(
        "BROWSER_CLIENT_CLASS_INVALID",
        `session ${input.session_id} is not a browser session`,
      );
    }
    if (!posture.usable) {
      throw new BrowserSessionGuardError(
        "BROWSER_SESSION_NOT_USABLE",
        `session ${input.session_id} is not usable for browser request admission`,
        posture.reason_codes,
      );
    }

    const stateChangingRequest = policy.csrf_policy.state_changing_methods.includes(
      input.http_method.trim().toUpperCase(),
    );
    if (
      stateChangingRequest &&
      policy.origin_policy.same_origin_required_for_state_changing_requests &&
      !isSameOrigin(input.expected_origin_ref, input.origin_ref)
    ) {
      throw new BrowserSessionGuardError(
        "BROWSER_SESSION_ORIGIN_REJECTED",
        "browser state-changing request did not satisfy the same-origin policy",
        ["BROWSER_ORIGIN_MISMATCH"],
      );
    }

    const bindingEvaluation = await this.dependencies.deviceBindingService.evaluateSessionBinding({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      as_of: input.as_of,
      enforce_binding_proof: stateChangingRequest,
      ...(input.presented_session_binding_hash === undefined
        ? {}
        : {
            presented_session_binding_hash: input.presented_session_binding_hash,
          }),
      ...(input.heuristic_signals === undefined
        ? {}
        : {
            heuristic_signals: input.heuristic_signals,
          }),
    });

    if (bindingEvaluation.disposition === "CHALLENGE_REQUIRED") {
      throw new BrowserSessionGuardError(
        "BROWSER_SESSION_REVALIDATION_REQUIRED",
        "browser request requires revalidation before state-changing execution",
        [...bindingEvaluation.reason_codes],
      );
    }
    if (
      bindingEvaluation.disposition === "REJECT" ||
      bindingEvaluation.disposition === "REVOCATION_RECOMMENDED"
    ) {
      throw new BrowserSessionGuardError(
        "BROWSER_SESSION_BINDING_REJECTED",
        "browser request did not satisfy current session binding rules",
        [...bindingEvaluation.reason_codes],
      );
    }

    let csrfValidation: CsrfTokenValidationResult | null = null;
    if (stateChangingRequest) {
      csrfValidation = await this.dependencies.csrfTokenService.validateToken({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        as_of: input.as_of,
        presented_token: input.presented_csrf_token ?? null,
        presented_session_binding_hash: input.presented_session_binding_hash ?? null,
      });
      if (!csrfValidation.allowed) {
        throw new BrowserSessionGuardError(
          "BROWSER_SESSION_CSRF_REJECTED",
          "browser state-changing request failed anti-CSRF validation",
          [...csrfValidation.reason_codes],
        );
      }
    }

    return {
      session,
      state_changing_request: stateChangingRequest,
      binding_evaluation: bindingEvaluation,
      csrf_validation: csrfValidation,
      reason_codes: [
        ...new Set([
          ...bindingEvaluation.reason_codes,
          ...(csrfValidation?.reason_codes ?? []),
        ]),
      ],
    };
  }
}
