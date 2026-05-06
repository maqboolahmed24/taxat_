export type ShellMotionMode = "standard" | "reduced";

export type ShellMotionTokenResolution = {
  mode: ShellMotionMode;
  duration_ms: number;
  easing: string;
  opacity_from: string;
  translate_y: string;
  transition_property: "opacity, transform, height";
};

export const shellMotionDurationCeilingMs = 180;

export const subtleCausalMotionTokens = {
  standard: {
    mode: "standard",
    duration_ms: 160,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    opacity_from: "0.94",
    translate_y: "6px",
    transition_property: "opacity, transform, height",
  },
  reduced: {
    mode: "reduced",
    duration_ms: 1,
    easing: "linear",
    opacity_from: "1",
    translate_y: "0px",
    transition_property: "opacity, transform, height",
  },
} as const satisfies Record<ShellMotionMode, ShellMotionTokenResolution>;

export function resolveShellMotionToken(
  motionToken: "SUBTLE_CAUSAL_MOTION_V1",
  reducedMotion = false,
) {
  if (motionToken !== "SUBTLE_CAUSAL_MOTION_V1") {
    throw new Error(`Unsupported shell motion token: ${motionToken}`);
  }

  return reducedMotion ? subtleCausalMotionTokens.reduced : subtleCausalMotionTokens.standard;
}
