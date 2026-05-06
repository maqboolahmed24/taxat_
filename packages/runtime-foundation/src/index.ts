export const runtimeFoundationBoundary = {
  packageId: "runtime-foundation",
  note: "Typed config, deterministic primitives, and transport-neutral runtime helpers start here in pc_0063 through pc_0065.",
} as const;

export * from "./browser_safe_env";
export * from "./ephemeral_environment_contract";
export * from "./frozen_config_guard";
export * from "./local_runtime_contract";
export * from "./load_runtime_profile";
export * from "./runtime_environment";
export * from "./secret_handle";
