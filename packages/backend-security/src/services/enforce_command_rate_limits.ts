import {
  assertNonEmptySecretString,
  assertSecretVersion,
  SecretVersionModelError,
} from "../models/secret_version.ts";
import {
  buildRuntimeHardeningPolicy,
  type RuntimeHardeningPolicy,
  type RuntimeRateLimitProfile,
  type RuntimeRouteFamily,
} from "./build_runtime_hardening_policy.ts";

export type RateLimitRecord = {
  count: number;
  reset_at: number;
};

export class RuntimeRateLimitStore {
  private readonly records = new Map<string, RateLimitRecord>();

  increment(input: { key: string; now_ms: number; window_ms: number }) {
    const current = this.records.get(input.key);
    if (current === undefined || input.now_ms >= current.reset_at) {
      const next = {
        count: 1,
        reset_at: input.now_ms + input.window_ms,
      };
      this.records.set(input.key, next);
      return next;
    }
    const next = {
      count: current.count + 1,
      reset_at: current.reset_at,
    };
    this.records.set(input.key, next);
    return next;
  }
}

export type EnforceCommandRateLimitInput = {
  at_ms: number;
  policy?: RuntimeHardeningPolicy;
  principal_ref: string;
  route_family: RuntimeRouteFamily;
  session_ref: string;
  store: RuntimeRateLimitStore;
};

export type CommandRateLimitDecision = {
  allowed: true;
  limit: number;
  profile_code: RuntimeRateLimitProfile["profile_code"];
  rate_limit_keys: string[];
  remaining: number;
  reset_at_ms: number;
  route_family: RuntimeRouteFamily;
};

function rateLimitKeys(input: {
  principal_ref: string;
  profile: RuntimeRateLimitProfile;
  route_family: RuntimeRouteFamily;
  session_ref: string;
}) {
  return input.profile.dimensions.map((dimension) => {
    if (dimension === "SESSION") {
      return `session:${input.route_family}:${input.profile.profile_code}:${input.session_ref}`;
    }
    return `principal:${input.route_family}:${input.profile.profile_code}:${input.principal_ref}`;
  });
}

export function enforceCommandRateLimits(
  input: EnforceCommandRateLimitInput,
): CommandRateLimitDecision {
  const policy = input.policy ?? buildRuntimeHardeningPolicy();
  const routePolicy = policy.route_policies[input.route_family];
  const profile = policy.rate_limits[routePolicy.rate_limit_profile];
  const principalRef = assertNonEmptySecretString("principal_ref", input.principal_ref);
  const sessionRef = assertNonEmptySecretString("session_ref", input.session_ref);
  assertSecretVersion(
    Number.isFinite(input.at_ms) && input.at_ms >= 0,
    "SECRET_VERSION_FIELD_INVALID",
    "at_ms must be a non-negative finite timestamp",
  );
  const keys = rateLimitKeys({
    principal_ref: principalRef,
    profile,
    route_family: input.route_family,
    session_ref: sessionRef,
  });
  let remaining = profile.max_requests;
  let resetAt = input.at_ms + profile.window_ms;
  for (const key of keys) {
    const record = input.store.increment({
      key,
      now_ms: input.at_ms,
      window_ms: profile.window_ms,
    });
    if (record.count > profile.max_requests) {
      throw new SecretVersionModelError(
        "SECRET_VERSION_RESOLUTION_INVALID",
        `rate limit exhausted for ${input.route_family} using ${profile.profile_code}`,
      );
    }
    remaining = Math.min(remaining, profile.max_requests - record.count);
    resetAt = Math.min(resetAt, record.reset_at);
  }
  return {
    allowed: true,
    limit: profile.max_requests,
    profile_code: profile.profile_code,
    rate_limit_keys: keys,
    remaining,
    reset_at_ms: resetAt,
    route_family: input.route_family,
  };
}
