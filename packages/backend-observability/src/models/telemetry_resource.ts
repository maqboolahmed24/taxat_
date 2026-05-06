import type { TelemetryResource } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import {
  createTelemetryResource,
  type TelemetryResourceInput,
} from "../../../telemetry/src/telemetry_resource_builder.ts";
import { ObservabilityContractError } from "./observability_correlation_context.ts";

export type BackendTelemetryResource = TelemetryResource;
export type BackendTelemetryResourceInput = TelemetryResourceInput;

export const TELEMETRY_RESOURCE_REQUIRED_ATTRIBUTE_KEYS = [
  "service.name",
  "service.namespace",
  "deployment.environment.name",
  "service.instance.id",
  "taxat.release.candidate_hash",
  "taxat.build.artifact_digest",
  "taxat.schema.bundle_hash",
  "taxat.workspace.id",
] as const;

function assertForwardChronology(startedAt: string, endedAtOrNull: string | null | undefined) {
  if (!endedAtOrNull) {
    return;
  }
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAtOrNull);
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "telemetry resource deployment ended_at must not be earlier than started_at",
    );
  }
}

export function buildTelemetryResource(
  input: BackendTelemetryResourceInput,
): BackendTelemetryResource {
  assertForwardChronology(input.startedAt, input.endedAtOrNull);
  return createTelemetryResource(input);
}
