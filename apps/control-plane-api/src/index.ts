export const controlPlaneApiBootstrap = {
  workspace: "apps/control-plane-api",
  note: "Northbound runtime and read-model composition will land here after the runtime packages are implemented.",
} as const;

export * from "./northbound/index.ts";
