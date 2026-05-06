import type {
  CurrentnessEvaluation,
  CurrentnessPosture,
} from "../../../frontend-shell-core/src/index";

export type StabilityDebugPillProps = {
  evaluation: CurrentnessEvaluation;
  etagOrNull?: string | null | undefined;
  label?: string | undefined;
  shellTokenOrNull?: string | null | undefined;
};

export type StabilityDebugPillSnapshot = {
  attributes: Readonly<Record<string, string>>;
  component_id: "stability-debug-pill";
  label: string;
  posture: CurrentnessPosture;
  safe_refs: {
    etag: string;
    guard_vector_hash: string;
    shell_token: string;
  };
  visible_text: string;
};

function checksum(input: string) {
  let total = 0;
  for (let index = 0; index < input.length; index += 1) {
    total = (total + input.charCodeAt(index) * (index + 1)) % 9973;
  }
  return total.toString(16).padStart(4, "0");
}

export function formatOpaqueStabilityRef(value: string | null | undefined) {
  if (value === null || value === undefined || value.length === 0) {
    return "opaque:none";
  }
  return `opaque:${value.length}:${checksum(value)}`;
}

function postureLabel(posture: CurrentnessPosture) {
  return posture.toLowerCase().replaceAll("_", " ");
}

export function createStabilityDebugPillSnapshot(
  props: StabilityDebugPillProps,
): StabilityDebugPillSnapshot {
  const label = props.label ?? "Route stability";
  const safeRefs = {
    etag: formatOpaqueStabilityRef(props.etagOrNull),
    guard_vector_hash: formatOpaqueStabilityRef(props.evaluation.guard_vector_hash),
    shell_token: formatOpaqueStabilityRef(props.shellTokenOrNull),
  };
  const visibleText = `${label}: ${postureLabel(props.evaluation.posture)} / ${safeRefs.guard_vector_hash}`;

  return {
    attributes: {
      "aria-label": `${label} ${postureLabel(props.evaluation.posture)}`,
      "data-currentness-posture": props.evaluation.posture,
      "data-guard-vector-ref": safeRefs.guard_vector_hash,
      "data-route-scope-class": props.evaluation.route_scope_class,
      "data-testid": "stability-debug-pill",
      role: "status",
    },
    component_id: "stability-debug-pill",
    label,
    posture: props.evaluation.posture,
    safe_refs: safeRefs,
    visible_text: visibleText,
  };
}

export function StabilityDebugPill(props: StabilityDebugPillProps) {
  return createStabilityDebugPillSnapshot(props);
}
