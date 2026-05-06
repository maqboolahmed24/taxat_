import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  createRootCorrelationContext,
  createTelemetryBootstrap,
} from "../../../packages/telemetry/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validateContract(
  kind: "telemetry_resource" | "trace_span" | "metric_event" | "log_record",
  payload: unknown,
) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    SCHEMA_DIR,
    build_registry,
    load_json,
)

payload = json.loads(sys.argv[3])
kind = sys.argv[2]
schema = load_json(SCHEMA_DIR / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(kind)
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

async function createBootstrap() {
  return createTelemetryBootstrap({
    buildArtifactDigest: "sha256:telemetry-foundation-075",
    buildRef: "build.telemetry.foundation.075",
    deploymentRef: "deploy.telemetry.foundation.075",
    environmentRef: "PRODUCTION",
    instanceRef: "instance.telemetry.foundation.075",
    releaseCandidateHash: "release-candidate.telemetry.foundation.075",
    schemaBundleHash: "schema-bundle.telemetry.foundation.075",
    serviceName: "control-plane-api",
    startedAt: "2026-04-23T09:00:00Z",
    workspaceId: "apps/control-plane-api",
  });
}

test("bootstrap normalizes public ingress safely and emits schema-aligned artifacts", async () => {
  const bootstrap = await createBootstrap();
  const spoofedInternalContext = createRootCorrelationContext({
    manifest_id: "manifest.spoofed.075",
    resource: bootstrap.resource,
    spanSeed: "spoof-span",
    tenant_id: "tenant.spoofed",
    traceSeed: "spoof-trace",
    workflow_item_id: "workflow.spoofed.075",
  });
  const spoofedHeaders = bootstrap.injectHttpContext({
    audience: "INTERNAL_SERVICE",
    context: spoofedInternalContext,
  });

  const extracted = bootstrap.extractHttpContext({
    authoritativeContext: {
      manifest_id: "manifest.authoritative.075",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.authoritative.075",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.telemetry.foundation.075",
    },
    headers: {
      traceparent: spoofedHeaders.traceparent,
      "x-taxat-correlation": spoofedHeaders["x-taxat-correlation"],
    },
    spanSeed: "public-ingress",
    trustBoundary: "PUBLIC_INGRESS",
  });

  expect(extracted.context.manifest_id).toBe("manifest.authoritative.075");
  expect(extracted.context.tenant_id).toBe("tenant.taxat");
  expect(extracted.warnings).toContain("INBOUND_BUSINESS_CONTEXT_IGNORED");

  const trace = bootstrap.createTraceSpan({
    correlationContext: extracted.context,
    endedAtOrNull: "2026-04-23T09:01:02Z",
    manifestId: "manifest.authoritative.075",
    parentSpanIdOrNull: null,
    spanCode: "RUN_ROOT",
    startedAt: "2026-04-23T09:01:00Z",
    statusCode: "OK",
  });
  const metric = bootstrap.createMetricEvent({
    correlationContext: extracted.context,
    dimensions: {
      module_code: "SNAPSHOT_BUILD",
      queue_family_ref: "worker.dispatch.runtime",
    },
    metricFamily: "MODULE_LATENCY",
    observedAt: "2026-04-23T09:02:00Z",
    unit: "ms",
    value: 142,
  });
  const log = bootstrap.createLogRecord({
    correlationContext: {
      ...extracted.context,
      error_id: "error.telemetry.foundation.075",
    },
    eventCode: "RUN_ROOT_FAILURE",
    logFamily: "RUNTIME",
    messageTemplate: "Run root failure remained correlation-safe",
    severity: "ERROR",
    structuredFields: {
      failure_class: "UPSTREAM_TIMEOUT",
      failure_phase: "HTTP_INGRESS",
      module_code: "RUN_ROOT",
      reason_code: "INBOUND_CONTEXT_IGNORED",
      route_family: "internal_operator_runs",
    },
    timestamp: "2026-04-23T09:03:00Z",
  });

  await Promise.all([
    validateContract("telemetry_resource", bootstrap.resource),
    validateContract("trace_span", trace),
    validateContract("metric_event", metric),
    validateContract("log_record", log),
  ]);
});

test("sampling lookup and client-surface redaction rules stay explicit", async () => {
  const bootstrap = await createBootstrap();

  expect(bootstrap.lookupSamplingClassForSpanCode("AUTHORITY_TRANSMIT")).toBe(
    "MANDATORY_FORENSIC",
  );
  expect(bootstrap.lookupSamplingClassForSpanCode("RUN_ROOT")).toBe("DETERMINISTIC_RETAIN");
  expect(bootstrap.lookupSamplingClassForSpanCode("SNAPSHOT_BUILD")).toBe("SAMPLED_OPERATIONAL");

  const context = createRootCorrelationContext({
    error_id: "error.telemetry.client.075",
    manifest_id: "manifest.client.075",
    resource: bootstrap.resource,
    spanSeed: "client-span",
    tenant_id: "tenant.taxat",
    traceSeed: "client-trace",
    workflow_item_id: "workflow.client.075",
  });

  expect(() =>
    bootstrap.createClientSurfaceLog({
      correlationContext: context,
      eventCode: "CLIENT_DISCLOSURE_FAILURE",
      messageTemplate: "Client surface rejected disclosure-heavy input",
      severity: "ERROR",
      structuredFields: {
        route_family: "client_timeline",
        shell_family: "CALM_SHELL",
        ui_text: "This copied UI text should never enter telemetry.",
      },
      timestamp: "2026-04-23T09:04:00Z",
    }),
  ).toThrow(/CLIENT_SURFACE_FIELD_FORBIDDEN/);
});
