import { routeStabilityCanResume } from "../route_contracts/route_stability";
import type { RouteGuardComponentKey } from "./route_stability_store";
import {
  compareRouteStabilityFrames,
  type CacheIsolationContractSummary,
  type RouteStabilityFrame,
  type StreamRecoveryContractSummary,
} from "./route_stability_store";

export type CurrentnessPosture =
  | "CURRENT"
  | "STALE"
  | "REBASE_REQUIRED"
  | "ACCESS_REBIND_REQUIRED"
  | "SNAPSHOT_ONLY"
  | "ILLEGAL_MIXED_GENERATION_BASIS";

export type AccessRebindPurgeCue =
  | "PURGE_CACHE_ON_ACCESS_BINDING_DRIFT"
  | "PURGE_CACHE_ON_MASKING_POSTURE_DRIFT"
  | "PURGE_CACHE_ON_ROUTE_DRIFT"
  | "PURGE_CACHE_ON_SESSION_DRIFT";

export type CurrentnessEvaluation = {
  posture: CurrentnessPosture;
  can_form_command: boolean;
  drift_component_keys: readonly RouteGuardComponentKey[];
  guard_vector_hash: string;
  purge_cues: readonly AccessRebindPurgeCue[];
  rebase_reason_codes: readonly string[];
  route_scope_class: RouteStabilityFrame["stability_contract"]["route_scope_class"];
  stale_guard_families: readonly string[];
  stream_resume_controls_available: boolean;
};

export type CurrentnessEvaluationInput = {
  candidate_frame?: RouteStabilityFrame | undefined;
  current_frame: RouteStabilityFrame;
};

const rebaseGuardKeys = new Set<RouteGuardComponentKey>([
  "frame_epoch_or_null",
  "shell_stability_token_or_null",
]);

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function streamPosture(stream: StreamRecoveryContractSummary | null) {
  if (stream === null) {
    return null;
  }
  if (stream.delivery_window_state === "ACCESS_REBIND_REQUIRED") {
    return "ACCESS_REBIND_REQUIRED" as const;
  }
  if (stream.delivery_window_state === "REBASE_REQUIRED") {
    return "REBASE_REQUIRED" as const;
  }
  if (stream.delivery_window_state === "SNAPSHOT_ONLY") {
    return "SNAPSHOT_ONLY" as const;
  }
  return "CURRENT" as const;
}

function cacheAccessCueDelta(
  current: CacheIsolationContractSummary | null,
  next: CacheIsolationContractSummary | null,
) {
  if (current === null || next === null) {
    return [] as const;
  }

  const cues: AccessRebindPurgeCue[] = [];
  if (current.session_binding_hash !== next.session_binding_hash) {
    cues.push("PURGE_CACHE_ON_SESSION_DRIFT");
  }
  if (current.access_binding_hash_or_null !== next.access_binding_hash_or_null) {
    cues.push("PURGE_CACHE_ON_ACCESS_BINDING_DRIFT");
  }
  if (
    current.masking_posture_fingerprint_or_null !== next.masking_posture_fingerprint_or_null
  ) {
    cues.push("PURGE_CACHE_ON_MASKING_POSTURE_DRIFT");
  }
  if (current.route_identity_ref !== next.route_identity_ref) {
    cues.push("PURGE_CACHE_ON_ROUTE_DRIFT");
  }
  return cues;
}

function streamAccessCueDelta(
  current: StreamRecoveryContractSummary | null,
  next: StreamRecoveryContractSummary | null,
) {
  if (current === null || next === null) {
    return [] as const;
  }

  const cues: AccessRebindPurgeCue[] = [];
  if (current.session_binding_hash !== next.session_binding_hash) {
    cues.push("PURGE_CACHE_ON_SESSION_DRIFT");
  }
  if (current.access_binding_hash !== next.access_binding_hash) {
    cues.push("PURGE_CACHE_ON_ACCESS_BINDING_DRIFT");
  }
  if (current.masking_context_hash !== next.masking_context_hash) {
    cues.push("PURGE_CACHE_ON_MASKING_POSTURE_DRIFT");
  }
  if (current.route_key !== next.route_key) {
    cues.push("PURGE_CACHE_ON_ROUTE_DRIFT");
  }
  return cues;
}

function baseEvaluation(frame: RouteStabilityFrame): CurrentnessEvaluation {
  const stream = streamPosture(frame.stream_recovery_contract_or_null);
  const isSnapshotOnly =
    frame.stability_contract.resume_capability === "SNAPSHOT_ONLY" || stream === "SNAPSHOT_ONLY";
  const isAccessRebind =
    frame.stability_contract.resume_capability === "ACCESS_REBIND_REQUIRED" ||
    stream === "ACCESS_REBIND_REQUIRED";
  const isRebase = stream === "REBASE_REQUIRED";
  const posture: CurrentnessPosture = isAccessRebind
    ? "ACCESS_REBIND_REQUIRED"
    : isRebase
      ? "REBASE_REQUIRED"
      : isSnapshotOnly
        ? "SNAPSHOT_ONLY"
        : "CURRENT";

  return {
    can_form_command: posture === "CURRENT",
    drift_component_keys: [],
    guard_vector_hash: frame.stability_contract.guard_vector_hash,
    posture,
    purge_cues: [],
    rebase_reason_codes:
      frame.stream_recovery_contract_or_null?.rebase_reason_code_or_null === null ||
      frame.stream_recovery_contract_or_null === null
        ? []
        : [frame.stream_recovery_contract_or_null.rebase_reason_code_or_null],
    route_scope_class: frame.stability_contract.route_scope_class,
    stale_guard_families: [],
    stream_resume_controls_available: posture === "CURRENT" && routeStabilityCanResume(frame.stability_contract),
  };
}

export function evaluateCurrentness(input: CurrentnessEvaluationInput): CurrentnessEvaluation {
  const baseline = baseEvaluation(input.current_frame);
  if (input.candidate_frame === undefined) {
    return baseline;
  }

  const comparison = compareRouteStabilityFrames(input.current_frame, input.candidate_frame);
  const purgeCues = unique([
    ...cacheAccessCueDelta(
      input.current_frame.cache_isolation_contract_or_null,
      input.candidate_frame.cache_isolation_contract_or_null,
    ),
    ...streamAccessCueDelta(
      input.current_frame.stream_recovery_contract_or_null,
      input.candidate_frame.stream_recovery_contract_or_null,
    ),
  ]);
  const candidateBaseline = baseEvaluation(input.candidate_frame);
  const rebaseReasons = unique([
    ...baseline.rebase_reason_codes,
    ...candidateBaseline.rebase_reason_codes,
  ]);

  if (comparison.illegal_mixed_generation_basis) {
    return {
      ...candidateBaseline,
      can_form_command: false,
      drift_component_keys: comparison.drift_component_keys,
      posture: "ILLEGAL_MIXED_GENERATION_BASIS",
      purge_cues: purgeCues,
      rebase_reason_codes: unique([
        ...rebaseReasons,
        comparison.newer_frame_epoch_with_old_shell_token ? "FRAME_EPOCH_ADVANCED_WITH_OLD_SHELL_TOKEN" : "",
      ]).filter((reason) => reason.length > 0),
      stale_guard_families: comparison.drift_component_keys,
      stream_resume_controls_available: false,
    };
  }

  if (
    purgeCues.includes("PURGE_CACHE_ON_SESSION_DRIFT") ||
    purgeCues.includes("PURGE_CACHE_ON_ACCESS_BINDING_DRIFT") ||
    purgeCues.includes("PURGE_CACHE_ON_MASKING_POSTURE_DRIFT") ||
    candidateBaseline.posture === "ACCESS_REBIND_REQUIRED"
  ) {
    return {
      ...candidateBaseline,
      can_form_command: false,
      drift_component_keys: comparison.drift_component_keys,
      posture: "ACCESS_REBIND_REQUIRED",
      purge_cues: purgeCues,
      rebase_reason_codes: unique([...rebaseReasons, "ACCESS_OR_MASKING_BINDING_DRIFT"]),
      stale_guard_families: comparison.drift_component_keys,
      stream_resume_controls_available: false,
    };
  }

  if (
    comparison.route_identity_drift ||
    candidateBaseline.posture === "REBASE_REQUIRED" ||
    comparison.drift_component_keys.some((key) => rebaseGuardKeys.has(key))
  ) {
    return {
      ...candidateBaseline,
      can_form_command: false,
      drift_component_keys: comparison.drift_component_keys,
      posture: "REBASE_REQUIRED",
      purge_cues: purgeCues,
      rebase_reason_codes: unique([
        ...rebaseReasons,
        comparison.route_identity_drift ? "ROUTE_CONTEXT_CHANGED" : "",
        comparison.drift_component_keys.includes("frame_epoch_or_null") ? "FRAME_EPOCH_ADVANCED" : "",
        comparison.drift_component_keys.includes("shell_stability_token_or_null")
          ? "SHELL_STABILITY_CHANGED"
          : "",
      ]).filter((reason) => reason.length > 0),
      stale_guard_families: comparison.drift_component_keys,
      stream_resume_controls_available: false,
    };
  }

  if (
    !comparison.guard_vector_hash_equal ||
    comparison.publication_generation_delta !== 0 ||
    comparison.drift_component_keys.length > 0
  ) {
    return {
      ...candidateBaseline,
      can_form_command: false,
      drift_component_keys: comparison.drift_component_keys,
      posture: "STALE",
      purge_cues: purgeCues,
      rebase_reason_codes: rebaseReasons,
      stale_guard_families: comparison.drift_component_keys,
      stream_resume_controls_available: false,
    };
  }

  return {
    ...candidateBaseline,
    purge_cues: purgeCues,
  };
}
