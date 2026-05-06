import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";

export const REQUIRED_RESOURCE_ATTRIBUTE_KEYS = [
  "service.name",
  "service.namespace",
  "deployment.environment.name",
  "service.instance.id",
  "taxat.release.candidate_hash",
  "taxat.build.artifact_digest",
  "taxat.schema.bundle_hash",
  "taxat.workspace.id",
] as const;

export type TelemetryResourceInput = {
  additionalAttributes?: TelemetryResourceAttributeMap;
  buildArtifactDigest: string;
  buildRef: string;
  deploymentRef: string;
  endedAtOrNull?: string | null;
  environmentRef: string;
  instanceRef: string;
  releaseCandidateHash: string;
  schemaBundleHash: string;
  serviceName: string;
  serviceNamespace?: string;
  startedAt: string;
  workspaceId: string;
};

function assertNonEmpty(value: string, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`TELEMETRY_RESOURCE_${field.toUpperCase()}_REQUIRED`);
  }
  return value.trim();
}

function validateRequiredAttributes(attributes: TelemetryResourceAttributeMap) {
  for (const key of REQUIRED_RESOURCE_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0)
    ) {
      throw new Error(`TELEMETRY_RESOURCE_ATTRIBUTE_REQUIRED:${key}`);
    }
  }
}

export function createTelemetryResource(input: TelemetryResourceInput): TelemetryResource {
  const serviceName = assertNonEmpty(input.serviceName, "service_name");
  const serviceNamespace = assertNonEmpty(
    input.serviceNamespace ?? "@taxat",
    "service_namespace",
  );
  const environmentRef = assertNonEmpty(input.environmentRef, "environment_ref");
  const buildRef = assertNonEmpty(input.buildRef, "build_ref");
  const deploymentRef = assertNonEmpty(input.deploymentRef, "deployment_ref");
  const instanceRef = assertNonEmpty(input.instanceRef, "instance_ref");
  const workspaceId = assertNonEmpty(input.workspaceId, "workspace_id");
  const releaseCandidateHash = assertNonEmpty(
    input.releaseCandidateHash,
    "release_candidate_hash",
  );
  const buildArtifactDigest = assertNonEmpty(
    input.buildArtifactDigest,
    "build_artifact_digest",
  );
  const schemaBundleHash = assertNonEmpty(input.schemaBundleHash, "schema_bundle_hash");

  const resourceAttributes: TelemetryResourceAttributeMap = {
    "deployment.environment.name": environmentRef,
    "service.instance.id": instanceRef,
    "service.name": serviceName,
    "service.namespace": serviceNamespace,
    "taxat.build.artifact_digest": buildArtifactDigest,
    "taxat.release.candidate_hash": releaseCandidateHash,
    "taxat.schema.bundle_hash": schemaBundleHash,
    "taxat.workspace.id": workspaceId,
    ...(input.additionalAttributes ?? {}),
  };

  validateRequiredAttributes(resourceAttributes);

  return {
    resource_id: `telemetry-resource.${stableJsonHash({
      build_ref: buildRef,
      deployment_ref: deploymentRef,
      environment_ref: environmentRef,
      instance_ref: instanceRef,
      resource_attributes: resourceAttributes,
      service_name: serviceName,
    })}`,
    service_name: serviceName,
    environment_ref: environmentRef,
    build_ref: buildRef,
    deployment_identity: {
      deployment_ref: deploymentRef,
      instance_ref: instanceRef,
      started_at: normalizeUtcInstantString(input.startedAt),
      ...(input.endedAtOrNull
        ? { ended_at: normalizeUtcInstantString(input.endedAtOrNull) }
        : {}),
    },
    resource_attributes: resourceAttributes,
  };
}
