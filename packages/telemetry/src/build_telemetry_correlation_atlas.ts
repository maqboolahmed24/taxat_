import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { summarizeCorrelationContext } from "./correlation_context.ts";
import { createTelemetryBootstrap } from "./otel_bootstrap.ts";

type SignalRef = "ROOT" | "TRACE" | "METRIC" | "LOG" | "HTTP" | "QUEUE" | "STREAM" | "CLIENT";

type AtlasSignalNode = {
  accessibleLabel: string;
  label: string;
  notes: string[];
  propagationMode: string;
  redactedKeys: string[];
  retainedKeys: string[];
  samplingOrTrustBadge: string;
  signalRef: SignalRef;
  summary: string;
  surfaceLimitedKeys: string[];
  tone: "success" | "warning" | "danger";
};

type AtlasScenario = {
  displayName: string;
  retentionChip: string;
  rootContract: {
    auditJoinBoundary: string;
    mandatoryKeys: string[];
    optionalKeys: string[];
    summaryLines: string[];
    trustPosture: string;
  };
  samplingBadge: string;
  scenarioId: string;
  signals: AtlasSignalNode[];
  summary: string;
};

type AtlasPayload = {
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  palette: Record<string, string>;
  routeId: "telemetry-correlation-atlas";
  scenarios: AtlasScenario[];
  selectedScenarioId: string;
  selectedSignalRef: SignalRef;
  signalRail: Array<{
    accessibleLabel: string;
    label: string;
    signalRef: Exclude<SignalRef, "ROOT">;
  }>;
  subtitle: string;
  title: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "telemetry-correlation-atlas",
  "data",
  "telemetry-correlation-atlas.json",
);

const inputPaths = {
  correlationKeyMatrix: path.join(repoRoot, "config", "telemetry", "correlation_key_matrix.json"),
  logRedactionPolicy: path.join(repoRoot, "config", "telemetry", "log_redaction_policy.json"),
  samplingClassPolicy: path.join(repoRoot, "config", "telemetry", "sampling_class_policy.json"),
  telemetrySignalCatalog: path.join(
    repoRoot,
    "config",
    "telemetry",
    "telemetry_signal_catalog.json",
  ),
} as const;

async function readUtf8(filePath: string) {
  return readFile(filePath, "utf8");
}

async function inputHashes() {
  const { stableJsonHash } = await import("../../domain-kernel/src/primitives/hash.ts");
  const entries = await Promise.all(
    Object.entries(inputPaths).map(
      async ([key, filePath]) => [key, stableJsonHash(await readUtf8(filePath))] as const,
    ),
  );
  return Object.fromEntries(entries);
}

async function emitAtlasPayload(payload: AtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: AtlasPayload) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

function byChannel(bundle: Awaited<ReturnType<typeof createTelemetryBootstrap>>["policyBundle"], channelRef: string) {
  const row = bundle.correlationKeyMatrix.channel_rows.find((entry) => entry.channel_ref === channelRef);
  if (!row) {
    throw new Error(`ATLAS_CHANNEL_MISSING:${channelRef}`);
  }
  return row;
}

function signalNode(init: {
  accessibleLabel: string;
  bundle: Awaited<ReturnType<typeof createTelemetryBootstrap>>["policyBundle"];
  channelRef:
    | "TRACE_SIGNAL"
    | "METRIC_SIGNAL"
    | "LOG_SIGNAL"
    | "HTTP_PUBLIC_INGRESS"
    | "QUEUE_MESSAGE"
    | "STREAM_PUBLICATION"
    | "UPLOAD_CONTINUATION"
    | "CLIENT_SURFACE";
  label: string;
  notes: string[];
  samplingOrTrustBadge: string;
  signalRef: Exclude<SignalRef, "ROOT">;
  summary: string;
  tone: "success" | "warning" | "danger";
}) {
  const row = byChannel(init.bundle, init.channelRef);
  return {
    accessibleLabel: init.accessibleLabel,
    label: init.label,
    notes: init.notes,
    propagationMode: row.propagation_mode,
    redactedKeys: row.redacted_keys,
    retainedKeys: row.retained_keys,
    samplingOrTrustBadge: init.samplingOrTrustBadge,
    signalRef: init.signalRef,
    summary: init.summary,
    surfaceLimitedKeys: row.surface_limited_keys,
    tone: init.tone,
  } satisfies AtlasSignalNode;
}

async function createAtlasPayload(): Promise<AtlasPayload> {
  const bootstrap = await createTelemetryBootstrap({
    buildArtifactDigest: "sha256:telemetry-bootstrap-075",
    buildRef: "build.telemetry.075",
    deploymentRef: "deploy.production.075",
    environmentRef: "PRODUCTION",
    instanceRef: "instance.api.075",
    releaseCandidateHash: "release-candidate.2026-04-23.075",
    schemaBundleHash: "schema-bundle.telemetry.075",
    serviceName: "control-plane-api",
    serviceNamespace: "@taxat",
    startedAt: "2026-04-23T08:00:00Z",
    workspaceId: "apps/control-plane-api",
  });
  const bundle = bootstrap.policyBundle;

  const httpNoInbound = bootstrap.extractHttpContext({
    authoritativeContext: {
      client_id: "client.telemetry.075",
      manifest_id: "manifest.telemetry.http-root",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.telemetry.http-root",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.075",
    },
    headers: {},
    spanSeed: "http-public-ingress",
    trustBoundary: "PUBLIC_INGRESS",
  });

  const malformedQueue = bootstrap.extractMessageContext({
    authoritativeContext: {
      manifest_id: "manifest.telemetry.queue-worker",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.075",
    },
    envelope: {
      channel_ref: "QUEUE_MESSAGE",
      correlation_baggage_or_null: "not-base64",
      safe_refs: {
        queue_family_ref: "worker.dispatch.runtime",
      },
      traceparent: bootstrap.injectHttpContext({
        audience: "INTERNAL_SERVICE",
        context: httpNoInbound.context,
      }).traceparent,
      transport_ref_hash_or_null: null,
    },
    spanSeed: "queue-consume",
  });

  const sampledTraceContext = bootstrap.extractHttpContext({
    authoritativeContext: {
      manifest_id: "manifest.telemetry.sampled",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.075",
    },
    headers: {},
    spanSeed: "sampled-http-root",
    trustBoundary: "PUBLIC_INGRESS",
  }).context;
  const sampledTrace = bootstrap.createTraceSpan({
    correlationContext: sampledTraceContext,
    endedAtOrNull: "2026-04-23T08:11:02Z",
    manifestId: "manifest.telemetry.sampled",
    spanAttributes: {
      module_code: "SNAPSHOT_BUILD",
    },
    spanCode: "SNAPSHOT_BUILD",
    startedAt: "2026-04-23T08:11:00Z",
    statusCode: "OK",
  });

  const clientContext = bootstrap.extractHttpContext({
    authoritativeContext: {
      manifest_id: "manifest.telemetry.client",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.client",
    },
    headers: {},
    spanSeed: "client-surface",
    trustBoundary: "BROWSER_CLIENT",
  }).context;
  const clientLog = bootstrap.createClientSurfaceLog({
    correlationContext: {
      ...clientContext,
      error_id: "error.telemetry.client.075",
    },
    eventCode: "CLIENT_ROUTE_FAILURE",
    messageTemplate: "Client route failed without copying regulated UI text",
    severity: "ERROR",
    structuredFields: {
      action_code: "RECOVER_ROUTE",
      accessibility_pref: "REDUCED_MOTION",
      module_code: "CLIENT_TIMELINE",
      opaque_object_ref: "object.preview.075",
      performance_bucket_ms: 240,
      posture_code: "REGULATED_SURFACE",
      recovery_outcome: "REBASE_REQUIRED",
      route_family: "client_timeline",
      shell_family: "CALM_SHELL"
    },
    timestamp: "2026-04-23T08:12:00Z",
  });

  const streamEnvelope = bootstrap.createMessageEnvelope({
    channel: "STREAM_PUBLICATION",
    context: httpNoInbound.context,
    opaqueTransportRefOrNull: "resume-token-raw-075",
    safeRefs: {
      stream_scope_class: "MANIFEST_RUNTIME",
    },
  });

  const uploadEnvelope = bootstrap.createMessageEnvelope({
    channel: "UPLOAD_CONTINUATION",
    context: httpNoInbound.context,
    opaqueTransportRefOrNull: "upload-retry-token-075",
    safeRefs: {
      storage_ref: "storage.ref.075",
      upload_session_id: "upload.session.075",
    },
  });
  const uploadRetry = bootstrap.extractMessageContext({
    authoritativeContext: {
      manifest_id: "manifest.telemetry.upload",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.upload",
    },
    envelope: uploadEnvelope,
    spanSeed: "upload-retry-consume",
  });

  const signalRail = [
    {
      accessibleLabel: "Trace signal rail",
      label: "TRACE",
      signalRef: "TRACE",
    },
    {
      accessibleLabel: "Metric signal rail",
      label: "METRIC",
      signalRef: "METRIC",
    },
    {
      accessibleLabel: "Log signal rail",
      label: "LOG",
      signalRef: "LOG",
    },
    {
      accessibleLabel: "HTTP boundary signal rail",
      label: "HTTP",
      signalRef: "HTTP",
    },
    {
      accessibleLabel: "Queue boundary signal rail",
      label: "QUEUE",
      signalRef: "QUEUE",
    },
    {
      accessibleLabel: "Stream boundary signal rail",
      label: "STREAM",
      signalRef: "STREAM",
    },
    {
      accessibleLabel: "Client signal rail",
      label: "CLIENT",
      signalRef: "CLIENT",
    },
  ] satisfies AtlasPayload["signalRail"];

  const scenarios: AtlasScenario[] = [
    {
      displayName: "HTTP root without inbound trace",
      retentionChip: bundle.samplingClassPolicy.default_trace_retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(httpNoInbound.context),
        trustPosture: httpNoInbound.transportTrustState,
      },
      samplingBadge: "DETERMINISTIC_RETAIN",
      scenarioId: "http-no-inbound",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: [
            "Business lineage comes from server-authored manifest context, not inbound headers.",
            "The same root can fan out into trace, metric, log, queue, stream, and client signals without collapsing audit into telemetry.",
          ],
          propagationMode: "SERVER_AUTHORED_CORRELATION_ROOT",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: httpNoInbound.transportTrustState,
          signalRef: "ROOT",
          summary: "No inbound traceparent existed, so the bootstrap minted a new trace root and kept audit joining explicit.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "warning",
        },
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: [
            "Run-root and lineage-sensitive spans keep manifest ancestry plus explicit sampling posture.",
            "Transport continuity stays separate from authoritative business truth.",
          ],
          samplingOrTrustBadge: "DETERMINISTIC_RETAIN",
          signalRef: "TRACE",
          summary: "New root span minted because public ingress had no inbound trace context.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: [
            "Metrics stay low-cardinality and rely on opaque refs rather than copied payload text.",
          ],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Metric events reuse the same root context but keep only query-safe dimensions.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: [
            "Logs keep event codes, structured fields, and join keys without becoming the audit system.",
          ],
          samplingOrTrustBadge: "REDACTION_SAFE",
          signalRef: "LOG",
          summary: "Structured logs share correlation keys yet remain retention- and access-tier bounded.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: [
            "Public ingress can contribute transport trace continuity only.",
            "Any business carrier from the browser is ignored unless the boundary is explicitly internal.",
          ],
          samplingOrTrustBadge: httpNoInbound.transportTrustState,
          signalRef: "HTTP",
          summary: "No inbound trace headers existed, so the server authored a fresh root safely.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "QUEUE_MESSAGE",
          label: "QUEUE",
          notes: [
            "Queue dispatch keeps trace continuity plus safe baggage fields only.",
          ],
          samplingOrTrustBadge: "INTERNAL_PROPAGATION",
          signalRef: "QUEUE",
          summary: "Dispatch envelopes retain trace continuity and safe manifest/workflow anchors for workers.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: [
            "Resume or continuation tokens are hashed before telemetry propagation.",
          ],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "SSE publication correlates to the same manifest without surfacing raw resume tokens.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: [
            "Client surfaces emit route/posture/module codes and opaque refs only.",
          ],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Browser-owned telemetry remains disclosure-safe by construction.",
          tone: "success",
        }),
      ],
      summary: "Fresh public ingress root with no inbound trace context.",
    },
    {
      displayName: "Malformed queue packet recovered safely",
      retentionChip: bundle.samplingClassPolicy.default_trace_retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(malformedQueue.context),
        trustPosture: malformedQueue.transportTrustState,
      },
      samplingBadge: "DETERMINISTIC_RETAIN",
      scenarioId: "queue-malformed",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: [
            "Malformed queue baggage does not block correlation; authoritative worker fields still win.",
          ],
          propagationMode: "AUTHORITATIVE_WORKER_CONTEXT",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: malformedQueue.transportTrustState,
          signalRef: "ROOT",
          summary: "Malformed message baggage was dropped, but the worker kept the upstream trace id and authoritative manifest binding.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "danger",
        },
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "QUEUE_MESSAGE",
          label: "QUEUE",
          notes: malformedQueue.warnings,
          samplingOrTrustBadge: malformedQueue.transportTrustState,
          signalRef: "QUEUE",
          summary:
            "Malformed queue correlation baggage was dropped, traceparent continuity survived, and authoritative worker refs stayed in control.",
          tone: "danger",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: ["The original public ingress still seeded the trace root without trusting browser-authored business keys."],
          samplingOrTrustBadge: "MISSING_INBOUND_CONTEXT",
          signalRef: "HTTP",
          summary: "Public ingress created the original trace root before queue dispatch occurred.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: ["Malformed queue carriers do not force trace loss or blind trust."],
          samplingOrTrustBadge: "DETERMINISTIC_RETAIN",
          signalRef: "TRACE",
          summary: "Trace continuity survives malformed queue baggage because transport and business trust are separated.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: ["Worker-side logs can record the malformed carrier reason code without leaking payload fragments."],
          samplingOrTrustBadge: "SECURITY_SAFE",
          signalRef: "LOG",
          summary: "Malformed queue context becomes a typed log cause, not an opaque blob dump.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: ["Malformed carrier counts can be emitted without recording raw queue payloads."],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Metrics stay useful even when queue carriers are malformed or incomplete.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: ["Downstream stream publication still uses the worker-authored context after the malformed queue input is discarded."],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "Later stream publication still correlates cleanly because the worker rebuilt safe context.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: ["Client surfaces never receive the malformed queue payload or baggage blob."],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Client telemetry remains decoupled from malformed worker transport payloads.",
          tone: "success",
        }),
      ],
      summary: "Malformed worker queue context dropped without losing safe correlation.",
    },
    {
      displayName: "Sampled operational trace with retained audit join",
      retentionChip: sampledTrace.retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(sampledTraceContext),
        trustPosture: "SAMPLED_OPERATIONAL_TRACE",
      },
      samplingBadge: sampledTrace.sampling_class,
      scenarioId: "sampled-trace-audit-retained",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: [
            "Sampling reduces operational trace volume but does not change audit retention or chronology.",
          ],
          propagationMode: "TRACE_AND_AUDIT_SEPARATED",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: sampledTrace.sampling_class,
          signalRef: "ROOT",
          summary: "Operational spans may sample out, but audit evidence keeps the same manifest and workflow join anchors.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "warning",
        },
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: [
            `Span code ${sampledTrace.span_code} resolved to ${sampledTrace.sampling_class}.`,
          ],
          samplingOrTrustBadge: sampledTrace.sampling_class,
          signalRef: "TRACE",
          summary: "Operational span uses sampled retention posture without weakening the audit proof path.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: ["Metrics remain queryable even if the corresponding operational span is sampled."],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Metric and audit joins keep the event explainable even when trace volume is reduced.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: ["Logs can still carry event codes and workflow anchors while audit remains the proof system."],
          samplingOrTrustBadge: "REDACTION_SAFE",
          signalRef: "LOG",
          summary: "Logs and traces remain operational explanation only; audit retains canonical evidence.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: ["Transport continuity stays decoupled from later sampling decisions."],
          samplingOrTrustBadge: "PUBLIC_ROOT",
          signalRef: "HTTP",
          summary: "HTTP ingress establishes the root, while sampling policy applies later at span emission time.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "QUEUE_MESSAGE",
          label: "QUEUE",
          notes: ["Queue propagation keeps enough context for downstream audit joins even if the trace is sampled."],
          samplingOrTrustBadge: "INTERNAL_PROPAGATION",
          signalRef: "QUEUE",
          summary: "Queue messages carry stable join keys independent of span sampling.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: ["Stream publications remain joinable by manifest and trace ids without exposing transport tokens."],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "Stream continuity remains correlated even when operational traces are sampled.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: ["Client telemetry stays low-noise and does not infer extra retention rights."],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Client telemetry keeps safe route/posture codes only.",
          tone: "success",
        }),
      ],
      summary: "Operational trace sampled while audit join remains durable.",
    },
    {
      displayName: "Client regulated surface failure",
      retentionChip: clientLog.retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(clientLog.correlation_context),
        trustPosture: "CLIENT_LOW_NOISE",
      },
      samplingBadge: "CLIENT_LOW_NOISE",
      scenarioId: "client-regulated-surface",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: [
            "Client crash capture uses the same manifest and workflow anchors but cannot copy regulated UI content.",
          ],
          propagationMode: "CLIENT_TO_SERVER_OPAQUE_ONLY",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "ROOT",
          summary: "Client and server share one correlation spine, but the browser only emits route/module/posture codes and opaque refs.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "danger",
        },
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: [
            "Copied UI text, document filenames, clipboard contents, DOM snapshots, and evidence excerpts are forbidden.",
            `Safe client log fields: ${Object.keys(clientLog.structured_fields).join(", ")}`,
          ],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Client-side error logging from a regulated surface retained only shell, route, module, posture, action, and opaque refs.",
          tone: "danger",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: ["The resulting log record is schema-aligned and carries an explicit error id."],
          samplingOrTrustBadge: "REDACTION_SAFE",
          signalRef: "LOG",
          summary: "Client error logs stay structured and redaction-safe by default.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: ["Client failures may still correlate to server spans through trace and manifest ids."],
          samplingOrTrustBadge: "DETERMINISTIC_RETAIN",
          signalRef: "TRACE",
          summary: "Trace continuity survives client failures without copying regulated UI content into spans.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: ["Client performance metrics remain low-cardinality and disclosure-safe."],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Client-side metrics keep route family and posture codes without copied text.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: ["Browser transport remains correlation-only and never authoritative for manifest lineage."],
          samplingOrTrustBadge: "BROWSER_CLIENT",
          signalRef: "HTTP",
          summary: "Browser-to-server propagation keeps safe trace continuity only.",
          tone: "warning",
        }),
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "QUEUE_MESSAGE",
          label: "QUEUE",
          notes: ["Any later async processing uses the same server-authored correlation root."],
          samplingOrTrustBadge: "INTERNAL_PROPAGATION",
          signalRef: "QUEUE",
          summary: "Worker fan-out remains safe after a client-side failure.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: ["Stream recovery outcomes can still correlate without copying raw resume tokens or client payloads."],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "SSE surfaces stay correlated while respecting disclosure boundaries.",
          tone: "success",
        }),
      ],
      summary: "Regulated client surface remains telemetry-safe by construction.",
    },
    {
      displayName: "SSE publication with hashed resume binding",
      retentionChip: bundle.samplingClassPolicy.default_trace_retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(httpNoInbound.context),
        trustPosture: "HASHED_TRANSPORT_REF",
      },
      samplingBadge: "DETERMINISTIC_RETAIN",
      scenarioId: "sse-publication",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: ["Stream publication reuses the same trace and manifest root without exposing raw resume tokens."],
          propagationMode: "STREAM_PUBLICATION_SAFE_RESUME_HASH",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "ROOT",
          summary: "The same correlation root fans into stream publication while transport-only resume state stays opaque.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "success",
        },
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: [
            `Transport ref hash: ${streamEnvelope.transport_ref_hash_or_null}`,
            "The raw resume token never appears in viewer data or baggage.",
          ],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "SSE publication correlates to the same manifest using a hashed transport ref only.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: ["Stream publication spans keep trace ids and manifest lineage but not raw transport material."],
          samplingOrTrustBadge: "DETERMINISTIC_RETAIN",
          signalRef: "TRACE",
          summary: "Trace continuity remains intact across stream publication.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: ["The root came from public ingress and remained authoritative through stream publication."],
          samplingOrTrustBadge: "PUBLIC_ROOT",
          signalRef: "HTTP",
          summary: "HTTP ingress seeded the lineage that the stream publisher reuses.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "QUEUE_MESSAGE",
          label: "QUEUE",
          notes: ["Queue workers can fan into stream publication without leaking raw resume bindings."],
          samplingOrTrustBadge: "INTERNAL_PROPAGATION",
          signalRef: "QUEUE",
          summary: "Worker propagation stays safe and reusable before stream publish.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: ["Resume/rebase outcome metrics can reuse the same root without raw token leakage."],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Metrics explain stream outcomes without carrying transport secrets.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: ["Logs can mention stream scope class and rebase outcome codes only."],
          samplingOrTrustBadge: "REDACTION_SAFE",
          signalRef: "LOG",
          summary: "Structured logs stay redaction-safe around stream publication too.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: ["Client surfaces can report resume or rebase outcomes as codes only."],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Client stream telemetry stays low-noise and opaque.",
          tone: "success",
        }),
      ],
      summary: "Same-manifest SSE publication with hashed resume transport material.",
    },
    {
      displayName: "Upload retry preserves correlation",
      retentionChip: bundle.samplingClassPolicy.default_trace_retention_class,
      rootContract: {
        auditJoinBoundary: bundle.telemetrySignalCatalog.audit_join_boundary,
        mandatoryKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
        optionalKeys: bundle.correlationKeyMatrix.context_contract.optional_keys,
        summaryLines: summarizeCorrelationContext(uploadRetry.context),
        trustPosture: uploadRetry.transportTrustState,
      },
      samplingBadge: "DETERMINISTIC_RETAIN",
      scenarioId: "upload-retry",
      signals: [
        {
          accessibleLabel:
            "root correlation context defines authoritative manifest lineage and audit join boundary",
          label: "ROOT",
          notes: ["Upload transfer retries preserve trace continuity and workflow anchors across attempts."],
          propagationMode: "UPLOAD_CONTINUATION_SAFE_RETRY",
          redactedKeys: [],
          retainedKeys: bundle.correlationKeyMatrix.context_contract.mandatory_keys,
          samplingOrTrustBadge: uploadRetry.transportTrustState,
          signalRef: "ROOT",
          summary: "Upload retry reuses the same trace root and workflow anchors across attempts.",
          surfaceLimitedKeys: bundle.correlationKeyMatrix.context_contract.authoritative_only_keys,
          tone: "success",
        },
        signalNode({
          accessibleLabel:
            "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
          bundle,
          channelRef: "UPLOAD_CONTINUATION",
          label: "QUEUE",
          notes: [
            `Upload transport ref hash: ${uploadEnvelope.transport_ref_hash_or_null}`,
            `Safe refs: ${Object.entries(uploadEnvelope.safe_refs)
              .map(([key, value]) => `${key}=${value}`)
              .join(", ")}`,
          ],
          samplingOrTrustBadge: "UPLOAD_CONTINUATION",
          signalRef: "QUEUE",
          summary: "Upload retry propagation keeps trace continuity plus safe session/storage refs only.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "trace signal carries manifest id and trace id but not masked field payloads",
          bundle,
          channelRef: "TRACE_SIGNAL",
          label: "TRACE",
          notes: ["Upload retries remain part of the same trace lineage instead of becoming isolated attempts."],
          samplingOrTrustBadge: "DETERMINISTIC_RETAIN",
          signalRef: "TRACE",
          summary: "Retry attempts preserve trace correlation across upload continuation boundaries.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "metric signal carries environment and workflow anchors without free-form payload fragments",
          bundle,
          channelRef: "METRIC_SIGNAL",
          label: "METRIC",
          notes: ["Retry counters or latency histograms still use opaque upload session refs only."],
          samplingOrTrustBadge: "LOW_CARDINALITY",
          signalRef: "METRIC",
          summary: "Upload retry metrics stay query-safe and correlated.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "log signal carries authority safe refs and error ids but not masked field payloads",
          bundle,
          channelRef: "LOG_SIGNAL",
          label: "LOG",
          notes: ["Upload retry logs keep safe session and storage refs only."],
          samplingOrTrustBadge: "REDACTION_SAFE",
          signalRef: "LOG",
          summary: "Logs stay redaction-safe even when retries occur across upload continuation.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "http signal carries traceparent continuity while ignoring public business baggage",
          bundle,
          channelRef: "HTTP_PUBLIC_INGRESS",
          label: "HTTP",
          notes: ["Retry continuity still traces back to the original HTTP root."],
          samplingOrTrustBadge: "PUBLIC_ROOT",
          signalRef: "HTTP",
          summary: "Original ingress lineage remains visible across upload retries.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
          bundle,
          channelRef: "STREAM_PUBLICATION",
          label: "STREAM",
          notes: ["Later stream or notification fan-out can still correlate to the same upload retry lineage."],
          samplingOrTrustBadge: "HASHED_TRANSPORT_REF",
          signalRef: "STREAM",
          summary: "Upload retry correlation remains compatible with later stream publication.",
          tone: "success",
        }),
        signalNode({
          accessibleLabel:
            "client signal carries route family and opaque refs but not copied ui text or payload fragments",
          bundle,
          channelRef: "CLIENT_SURFACE",
          label: "CLIENT",
          notes: ["Client retry telemetry can show resume outcome codes and opaque upload refs only."],
          samplingOrTrustBadge: "CLIENT_LOW_NOISE",
          signalRef: "CLIENT",
          summary: "Browser retry telemetry stays low-noise and disclosure-safe.",
          tone: "success",
        }),
      ],
      summary: "Upload retry continuity preserved without raw retry-token leakage.",
    },
  ];

  return {
    basisStatement:
      "One authoritative correlation context propagates across traces, metrics, logs, HTTP, queue, stream, and browser surfaces while audit remains a separate append-only proof system.",
    generationBasis: {
      emittedAtBasis: "2026-04-23T08:30:00Z",
      inputHashes: await inputHashes(),
    },
    palette: {
      accentCobalt: "#47627C",
      accentEvergreen: "#5C725E",
      accentSmokePlum: "#655B70",
      background: "#F4F5F2",
      danger: "#A53A31",
      hairline: "rgba(16,20,24,0.08)",
      ink: "#101418",
      muted: "#69717A",
      secondary: "#EEF0EC",
      success: "#17614B",
      surface: "#FFFFFF",
      warning: "#8C5D1B",
    },
    routeId: "telemetry-correlation-atlas",
    scenarios,
    selectedScenarioId: "http-no-inbound",
    selectedSignalRef: "TRACE",
    signalRail,
    subtitle:
      "Read-only correlation observatory for signal families, propagation boundaries, redaction posture, and the explicit audit join boundary.",
    title: "Telemetry Correlation Atlas",
  };
}

async function main() {
  const payload = await createAtlasPayload();
  if (process.argv.includes("--check")) {
    await checkAtlasPayload(payload);
    return;
  }
  await emitAtlasPayload(payload);
}

await main();
