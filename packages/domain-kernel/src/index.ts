export const domainKernelBoundary = {
  packageId: "domain-kernel",
  note: "Business semantics and invariant-bearing abstractions converge here once phase-02 runtime foundations are in place.",
} as const;

export * from "./config/index.ts";
export * from "./primitives/index.ts";
export * from "./references/index.ts";
export * from "./cache/index.ts";
export * from "./messaging/index.ts";
export * from "./queue/index.ts";
export * from "./storage/index.ts";
export * from "./streaming/index.ts";
export * from "./uploads/index.ts";
