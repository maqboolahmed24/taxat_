export const generatedModelsBoundary = {
  packageId: "generated-models",
  upstream: "@taxat/contracts-core",
  note: "Generated bindings remain downstream-only and receive real codegen in pc_0061.",
} as const;

export * from "./generated/typescript/index";
