import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  defaultComposeSnapshot,
  defaultLocalRuntimeStateManifest,
  evaluateLocalRuntimeHealth,
  loadLocalRuntimeContractBundle,
  repoRoot,
} from "./local_runtime_contract.ts";

type ObservatoryPayload = {
  routeId: string;
  title: string;
  environmentBadge: string;
  seedProfileChip: string;
  validatorStatusChip: string;
  basisStatement: string;
  legend: Array<{
    label: string;
    tone: "danger" | "neutral" | "success" | "warning";
  }>;
  services: Array<{
    service_ref: string;
    label: string;
    family: string;
    provider_family: string;
    provider_status: string;
    persistence_class: string;
    reset_class: string;
    compose_service_refs: string[];
    port_bindings: string[];
    namespace_refs: string[];
    dependency_service_refs: string[];
    phase_refs: string[];
    readiness_codes: string[];
    status: "READY";
    accessible_label: string;
    safe_rebuild_instructions: string[];
    notes: string[];
  }>;
  connections: Array<{
    edge_ref: string;
    label: string;
    edge_class: string;
    from_service_ref: string;
    to_service_ref: string;
    summary: string;
    accessible_label: string;
  }>;
  selectedServiceRef: string;
  selectedEdgeRef: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "local-runtime-observatory",
  "data",
  "local-runtime-observatory.json",
);

function labelForProfile(profileRef: string) {
  if (profileRef === "local") {
    return "Local authoring";
  }
  if (profileRef === "devcontainer") {
    return "Devcontainer";
  }
  return "Local provisioning";
}

function serviceTone(persistenceClass: string) {
  if (persistenceClass === "DURABLE_TRUTH") {
    return "success";
  }
  if (persistenceClass === "DISPOSABLE_ACCELERATION") {
    return "warning";
  }
  return "neutral";
}

function accessibleLabelForService(serviceRef: string) {
  if (serviceRef === "CONTROL_STORE") {
    return "control store service is durable truth and protects mutable workflow law";
  }
  if (serviceRef === "AUDIT_STORE") {
    return "audit store service is durable truth and preserves append only evidence continuity";
  }
  if (serviceRef === "OBJECT_STORAGE") {
    return "object storage service is durable truth for immutable bodies and restore archives";
  }
  if (serviceRef === "QUEUE") {
    return "queue service is disposable delivery fabric and rebuilds from outbox truth";
  }
  if (serviceRef === "CACHE") {
    return "cache service is disposable acceleration and purges on partition drift";
  }
  if (serviceRef === "APP") {
    return "app service is host process gated until schema buckets queues cache and seed checks pass";
  }
  return "workers service is host process gated until queue audit and smoke checks pass";
}

function buildPayload() {
  return loadLocalRuntimeContractBundle().then((bundle) => {
    const state = defaultLocalRuntimeStateManifest(bundle);
    const snapshot = {
      compose_service_states: defaultComposeSnapshot(bundle),
      state_markers: state.markers,
    };
    const evaluation = evaluateLocalRuntimeHealth(bundle, snapshot, "SEMANTIC");
    if (!evaluation.ok) {
      throw new Error(`default observatory state must pass semantic readiness: ${evaluation.failureCodes.join(", ")}`);
    }

    const phaseRefsByService = new Map<string, string[]>();
    for (const phase of bundle.bootOrder.phases) {
      for (const serviceRef of phase.service_refs) {
        const existing = phaseRefsByService.get(serviceRef) ?? [];
        existing.push(phase.phase_ref);
        phaseRefsByService.set(serviceRef, existing);
      }
    }
    const readinessCodesByService = new Map(
      evaluation.serviceStatuses.map((status) => [status.serviceRef, status.readinessCodes] as const),
    );

    return {
      routeId: "local-runtime-observatory",
      title: "Local Runtime Observatory",
      environmentBadge: labelForProfile(state.runtime_profile_ref),
      seedProfileChip: state.seed_profile_ref,
      validatorStatusChip:
        state.validator_status === "PASSED" ? "Authoritative validators wired" : "Validators skipped",
      basisStatement: bundle.topology.basis_statement,
      legend: [
        { label: "Durable truth", tone: "success" },
        { label: "Disposable acceleration", tone: "warning" },
        { label: "Host process gate", tone: "neutral" },
      ],
      services: bundle.topology.services.map((service) => ({
        service_ref: service.service_ref,
        label: service.label,
        family: service.family,
        provider_family: service.provider_family,
        provider_status: service.provider_status,
        persistence_class: service.persistence_class,
        reset_class: service.reset_class,
        compose_service_refs: service.compose_service_refs,
        port_bindings: service.port_bindings,
        namespace_refs: service.namespace_refs,
        dependency_service_refs: service.dependency_service_refs,
        phase_refs: phaseRefsByService.get(service.service_ref) ?? [],
        readiness_codes: readinessCodesByService.get(service.service_ref) ?? [],
        status: "READY" as const,
        accessible_label: accessibleLabelForService(service.service_ref),
        safe_rebuild_instructions: service.safe_rebuild_instructions,
        notes: service.notes,
      })),
      connections: bundle.topology.connections.map((connection) => ({
        edge_ref: connection.edge_ref,
        label: connection.label,
        edge_class: connection.edge_class,
        from_service_ref: connection.from_service_ref,
        to_service_ref: connection.to_service_ref,
        summary: connection.summary,
        accessible_label: `${connection.label} is ${connection.edge_class.toLowerCase().replaceAll("_", " ")} from ${connection.from_service_ref.toLowerCase()} to ${connection.to_service_ref.toLowerCase()}`,
      })),
      selectedServiceRef: "CONTROL_STORE",
      selectedEdgeRef: "EDGE_CONTROL_TO_QUEUE",
    } satisfies ObservatoryPayload;
  });
}

async function main() {
  const mode = process.argv.includes("--check") ? "check" : "emit";
  const payload = await buildPayload();
  const next = `${JSON.stringify(payload, null, 2)}\n`;

  if (mode === "emit") {
    await mkdir(path.dirname(atlasDataPath), { recursive: true });
    await writeFile(atlasDataPath, next, "utf8");
  } else {
    const current = await readFile(atlasDataPath, "utf8");
    if (current !== next) {
      throw new Error("local runtime observatory data is out of sync. Run --emit.");
    }
  }

  console.log(`${mode === "emit" ? "wrote" : "verified"} local runtime observatory`);
  console.log(`services: ${payload.services.length}`);
  console.log(`connections: ${payload.connections.length}`);
}

await main();
