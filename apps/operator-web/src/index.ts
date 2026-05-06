export const operatorWebBootstrap = {
  workspace: "apps/operator-web",
  internalRouteSeed: "workspace-topology-atlas",
} as const;

export { operatorWebRoot } from "./app/root";
export { operatorCalmRoute } from "./routes/calm/index";
export { operatorGovernanceRoute } from "./routes/governance/index";
export { governanceAccessSimulatorRoute } from "./routes/governance/access/simulator";
export { governanceAccessWorkspaceRoute } from "./routes/governance/access/index";
export { contractsObservatoryArtifactRoute } from "./routes/internal/contracts-observatory/[artifact]";
export { contractsObservatoryIndexRoute } from "./routes/internal/contracts-observatory/index";
export { auditStreamAtlasRoute } from "./routes/internal/audit-stream-atlas";
export { bindingCoverageAtlasRoute } from "./routes/internal/binding-coverage-atlas";
export { cacheIsolationAtlasRoute } from "./routes/internal/cache-isolation-atlas";
export { canonicalDomainExampleAtlasRoute } from "./routes/internal/canonical-domain-example-atlas";
export { canonicalPrimitivesAtlasRoute } from "./routes/internal/canonical-primitives-atlas";
export { codeQualityAtlasRoute } from "./routes/internal/code-quality-atlas";
export { configResolutionAtlasRoute } from "./routes/internal/config-resolution-atlas";
export { environmentBasisAtlasRoute } from "./routes/internal/environment-basis-atlas";
export { eventEnvelopeAtlasRoute } from "./routes/internal/event-envelope-atlas";
export { frontendShellFoundationAtlasRoute } from "./routes/internal/frontend-shell-foundation-atlas";
export { localRuntimeObservatoryRoute } from "./routes/internal/local-runtime-observatory";
export { migrationWindowAtlasRoute } from "./routes/internal/migration-window-atlas";
export { northboundBoundaryAtlasRoute } from "./routes/internal/northbound-boundary-atlas";
export { objectLifecycleAtlasRoute } from "./routes/internal/object-lifecycle-atlas";
export { queueFabricAtlasRoute } from "./routes/internal/queue-fabric-atlas";
export { referenceGrammarAtlasRoute } from "./routes/internal/reference-grammar-atlas";
export { schemaCatalogAtlasRoute } from "./routes/internal/schema-catalog-atlas";
export { schemaCompatibilityAtlasRoute } from "./routes/internal/schema-compatibility-atlas";
export { streamRecoveryAtlasRoute } from "./routes/internal/stream-recovery-atlas";
export { telemetryCorrelationAtlasRoute } from "./routes/internal/telemetry-correlation-atlas";
export { uploadTransferAtlasRoute } from "./routes/internal/upload-transfer-atlas";
export { workspaceTopologyAtlasRoute } from "./routes/internal/workspace-topology-atlas";
