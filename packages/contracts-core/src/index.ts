export const contractsCoreBoundary = {
  packageId: "contracts-core",
  sourceRoot: "packages/contracts-core/schemas",
  sourceBundleRoot: "Algorithm/schemas",
  note: "Authoritative schema, sample payload, and validator mirrors land here in pc_0060 with source-hash lineage back to Algorithm/.",
} as const;

export * from "./schemaCatalog";
