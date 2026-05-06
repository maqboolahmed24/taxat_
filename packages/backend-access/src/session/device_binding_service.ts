import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ActorSessionRecord } from "../models/actor_session.ts";
import { SessionLifecycleService } from "./session_lifecycle_service.ts";
import {
  SESSION_SECURITY_REASON_CODES,
  dedupeReasonCodes,
} from "./session_security_reason_codes.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const deviceBindingPolicyPath = path.join(
  repoRoot,
  "config",
  "access",
  "device_binding_policy.json",
);

type BrowserSessionBindingPolicy = {
  canonical_session_binding_inputs: string[];
  heuristic_signal_fields: string[];
  large_environment_change_threshold: number;
  require_presented_session_binding: true;
};

type NativeDeviceBindingPolicy = {
  canonical_session_binding_inputs: string[];
  heuristic_signal_fields: string[];
  large_environment_change_threshold: number;
  mismatch_result: "REVOCATION_RECOMMENDED";
  require_presented_session_binding: true;
  strong_binding_mode: "SERVER_VERIFIED_SESSION_BINDING_HASH";
  unverified_device_state_result: "CHALLENGE_REQUIRED";
};

export type DeviceBindingPolicy = {
  automation_policy: {
    device_binding_mode: "NOT_APPLICABLE";
    session_binding_proof_optional: true;
  };
  basis_statement: string;
  browser_session_binding_policy: BrowserSessionBindingPolicy;
  contract_version: "DEVICE_BINDING_POLICY_V1";
  native_device_binding_policy: NativeDeviceBindingPolicy;
};

export type DeviceBindingHeuristicSignals = {
  client_instance_ref?: string | null;
  network_fingerprint?: string | null;
  timezone?: string | null;
  user_agent_family?: string | null;
};

export type DeviceBindingDisposition =
  | "ALLOW"
  | "CHALLENGE_REQUIRED"
  | "REJECT"
  | "REVOCATION_RECOMMENDED";

export type DeviceBindingEvaluationResult = {
  allowed: boolean;
  client_class: ActorSessionRecord["session_client_class"];
  disposition: DeviceBindingDisposition;
  heuristic_drift_fields: string[];
  reason_codes: string[];
  session: ActorSessionRecord;
  strong_binding_state:
    | "NOT_APPLICABLE"
    | "VERIFIED"
    | "MISSING"
    | "MISMATCH";
};

type StoredHeuristicBaseline = {
  client_instance_ref: string | null;
  network_fingerprint: string | null;
  timezone: string | null;
  user_agent_family: string | null;
};

let cachedDeviceBindingPolicy: Promise<DeviceBindingPolicy> | null = null;

function baselineKey(tenantId: string, sessionId: string) {
  return `${tenantId}::${sessionId}`;
}

function normalizeNullableSignal(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return requireTrimmedString("heuristic_signal", value);
}

function normalizeSignals(signals: DeviceBindingHeuristicSignals | undefined): StoredHeuristicBaseline {
  return {
    client_instance_ref: normalizeNullableSignal(signals?.client_instance_ref),
    network_fingerprint: normalizeNullableSignal(signals?.network_fingerprint),
    timezone: normalizeNullableSignal(signals?.timezone),
    user_agent_family: normalizeNullableSignal(signals?.user_agent_family),
  };
}

function compareBaseline(
  baseline: StoredHeuristicBaseline | undefined,
  current: StoredHeuristicBaseline,
  trackedFields: readonly string[],
) {
  if (!baseline) {
    return [];
  }
  const changedFields: string[] = [];
  for (const field of trackedFields) {
    const fieldName = field as keyof StoredHeuristicBaseline;
    if (
      baseline[fieldName] !== null &&
      current[fieldName] !== null &&
      baseline[fieldName] !== current[fieldName]
    ) {
      changedFields.push(field);
    }
  }
  return changedFields.sort((left, right) => left.localeCompare(right));
}

export async function loadDeviceBindingPolicy(options?: { reload?: boolean }) {
  if (!cachedDeviceBindingPolicy || options?.reload) {
    cachedDeviceBindingPolicy = readFile(deviceBindingPolicyPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as DeviceBindingPolicy;
      if (parsed.contract_version !== "DEVICE_BINDING_POLICY_V1") {
        throw new Error("Unexpected device binding policy version.");
      }
      return {
        ...parsed,
        browser_session_binding_policy: {
          ...parsed.browser_session_binding_policy,
          canonical_session_binding_inputs: normalizeStringSet(
            "device_binding_policy.browser_session_binding_policy.canonical_session_binding_inputs",
            parsed.browser_session_binding_policy.canonical_session_binding_inputs,
            { minItems: 1 },
          ),
          heuristic_signal_fields: normalizeStringSet(
            "device_binding_policy.browser_session_binding_policy.heuristic_signal_fields",
            parsed.browser_session_binding_policy.heuristic_signal_fields,
            { minItems: 1 },
          ),
        },
        native_device_binding_policy: {
          ...parsed.native_device_binding_policy,
          canonical_session_binding_inputs: normalizeStringSet(
            "device_binding_policy.native_device_binding_policy.canonical_session_binding_inputs",
            parsed.native_device_binding_policy.canonical_session_binding_inputs,
            { minItems: 1 },
          ),
          heuristic_signal_fields: normalizeStringSet(
            "device_binding_policy.native_device_binding_policy.heuristic_signal_fields",
            parsed.native_device_binding_policy.heuristic_signal_fields,
            { minItems: 1 },
          ),
        },
      };
    });
  }
  return cachedDeviceBindingPolicy;
}

export class DeviceBindingService {
  private readonly baselines = new Map<string, StoredHeuristicBaseline>();

  constructor(
    private readonly dependencies: {
      sessionLifecycleService: SessionLifecycleService;
    },
  ) {}

  async evaluateSessionBinding(input: {
    as_of: string;
    enforce_binding_proof?: boolean;
    heuristic_signals?: DeviceBindingHeuristicSignals;
    presented_session_binding_hash?: string | null;
    record_successful_observation?: boolean;
    session_id: string;
    tenant_id: string;
  }): Promise<DeviceBindingEvaluationResult> {
    const [policy, posture] = await Promise.all([
      loadDeviceBindingPolicy(),
      this.dependencies.sessionLifecycleService.resolveSessionPosture({
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        as_of: input.as_of,
      }),
    ]);
    const session = posture.session;
    if (!posture.usable) {
      return {
        allowed: false,
        client_class: session.session_client_class,
        disposition: "REJECT",
        heuristic_drift_fields: [],
        reason_codes: [...posture.reason_codes],
        session,
        strong_binding_state: "NOT_APPLICABLE",
      };
    }

    const presentedBinding =
      input.presented_session_binding_hash === null ||
      input.presented_session_binding_hash === undefined
        ? null
        : requireTrimmedString(
            "presented_session_binding_hash",
            input.presented_session_binding_hash,
          );
    const signals = normalizeSignals(input.heuristic_signals);
    const enforceBindingProof = input.enforce_binding_proof === true;
    const baseline = this.baselines.get(baselineKey(session.tenant_id, session.session_id));

    if (session.session_client_class === "AUTOMATION") {
      return {
        allowed:
          presentedBinding === null || presentedBinding === session.session_binding_hash,
        client_class: session.session_client_class,
        disposition:
          presentedBinding !== null && presentedBinding !== session.session_binding_hash
            ? "REJECT"
            : "ALLOW",
        heuristic_drift_fields: [],
        reason_codes:
          presentedBinding !== null && presentedBinding !== session.session_binding_hash
            ? [SESSION_SECURITY_REASON_CODES.session_binding_mismatch]
            : [],
        session,
        strong_binding_state: "NOT_APPLICABLE",
      };
    }

    if (session.session_client_class === "BROWSER") {
      if (presentedBinding === null) {
        if (enforceBindingProof) {
          return {
            allowed: false,
            client_class: session.session_client_class,
            disposition: "REJECT",
            heuristic_drift_fields: [],
            reason_codes: [SESSION_SECURITY_REASON_CODES.session_binding_proof_required],
            session,
            strong_binding_state: "MISSING",
          };
        }
      } else if (presentedBinding !== session.session_binding_hash) {
        return {
          allowed: false,
          client_class: session.session_client_class,
          disposition: "REJECT",
          heuristic_drift_fields: [],
          reason_codes: [SESSION_SECURITY_REASON_CODES.session_binding_mismatch],
          session,
          strong_binding_state: "MISMATCH",
        };
      }

      const driftFields = compareBaseline(
        baseline,
        signals,
        policy.browser_session_binding_policy.heuristic_signal_fields,
      );
      if (
        driftFields.length >=
        policy.browser_session_binding_policy.large_environment_change_threshold
      ) {
        return {
          allowed: false,
          client_class: session.session_client_class,
          disposition: "CHALLENGE_REQUIRED",
          heuristic_drift_fields: driftFields,
          reason_codes: [SESSION_SECURITY_REASON_CODES.session_environment_change_challenge],
          session,
          strong_binding_state: presentedBinding === null ? "NOT_APPLICABLE" : "VERIFIED",
        };
      }

      if (input.record_successful_observation !== false) {
        this.baselines.set(baselineKey(session.tenant_id, session.session_id), signals);
      }
      return {
        allowed: true,
        client_class: session.session_client_class,
        disposition: "ALLOW",
        heuristic_drift_fields: [],
        reason_codes: [],
        session,
        strong_binding_state: presentedBinding === null ? "NOT_APPLICABLE" : "VERIFIED",
      };
    }

    if (presentedBinding === null) {
      if (enforceBindingProof) {
        return {
          allowed: false,
          client_class: session.session_client_class,
          disposition: "REJECT",
          heuristic_drift_fields: [],
          reason_codes: [SESSION_SECURITY_REASON_CODES.device_binding_proof_required],
          session,
          strong_binding_state: "MISSING",
        };
      }
    } else if (presentedBinding !== session.session_binding_hash) {
      return {
        allowed: false,
        client_class: session.session_client_class,
        disposition: "REVOCATION_RECOMMENDED",
        heuristic_drift_fields: [],
        reason_codes: dedupeReasonCodes([
          SESSION_SECURITY_REASON_CODES.device_binding_mismatch,
          SESSION_SECURITY_REASON_CODES.device_binding_revocation_recommended,
        ]),
        session,
        strong_binding_state: "MISMATCH",
      };
    }

    if (session.device_binding_state === "UNVERIFIED") {
      return {
        allowed: false,
        client_class: session.session_client_class,
        disposition: "CHALLENGE_REQUIRED",
        heuristic_drift_fields: [],
        reason_codes: [SESSION_SECURITY_REASON_CODES.device_binding_unverified],
        session,
        strong_binding_state: presentedBinding === null ? "NOT_APPLICABLE" : "VERIFIED",
      };
    }

    const driftFields = compareBaseline(
      baseline,
      signals,
      policy.native_device_binding_policy.heuristic_signal_fields,
    );
    if (driftFields.length >= policy.native_device_binding_policy.large_environment_change_threshold) {
      return {
        allowed: false,
        client_class: session.session_client_class,
        disposition: "CHALLENGE_REQUIRED",
        heuristic_drift_fields: driftFields,
        reason_codes: [SESSION_SECURITY_REASON_CODES.device_environment_change_challenge],
        session,
        strong_binding_state: presentedBinding === null ? "NOT_APPLICABLE" : "VERIFIED",
      };
    }

    if (input.record_successful_observation !== false) {
      this.baselines.set(baselineKey(session.tenant_id, session.session_id), signals);
    }
    return {
      allowed: true,
      client_class: session.session_client_class,
      disposition: "ALLOW",
      heuristic_drift_fields: [],
      reason_codes: [],
      session,
      strong_binding_state: presentedBinding === null ? "NOT_APPLICABLE" : "VERIFIED",
    };
  }

  async getHeuristicBaseline(tenantId: string, sessionId: string) {
    const baseline = this.baselines.get(baselineKey(tenantId, sessionId));
    return baseline ? structuredClone(baseline) : null;
  }
}
