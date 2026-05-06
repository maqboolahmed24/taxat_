import { expect, test } from "@playwright/test";

import {
  defaultComposeSnapshot,
  defaultLocalRuntimeStateManifest,
  evaluateLocalRuntimeHealth,
  loadLocalRuntimeContractBundle,
} from "../../../packages/runtime-foundation/src/local_runtime_contract.ts";

test("local runtime bundle preserves durable versus disposable boundaries and passes the default semantic health evaluation", async () => {
  const bundle = await loadLocalRuntimeContractBundle();
  const topology = bundle.topology;

  expect(topology.default_bootstrap_profile_ref).toBe("local");
  expect(topology.durable_volume_refs).toEqual(["postgres-data", "minio-data"]);
  expect(topology.disposable_volume_refs).toEqual(["rabbitmq-data", "redis-data"]);

  const queue = topology.services.find((service) => service.service_ref === "QUEUE");
  const cache = topology.services.find((service) => service.service_ref === "CACHE");
  const control = topology.services.find((service) => service.service_ref === "CONTROL_STORE");

  expect(queue?.persistence_class).toBe("DISPOSABLE_ACCELERATION");
  expect(cache?.persistence_class).toBe("DISPOSABLE_ACCELERATION");
  expect(control?.persistence_class).toBe("DURABLE_TRUTH");

  const snapshot = {
    compose_service_states: defaultComposeSnapshot(bundle),
    state_markers: defaultLocalRuntimeStateManifest(bundle).markers,
  };
  const result = evaluateLocalRuntimeHealth(bundle, snapshot, "SEMANTIC");

  expect(result.ok).toBe(true);
  expect(result.failureCodes).toEqual([]);
  expect(result.readinessCodes).toEqual(
    expect.arrayContaining([
      "CONTROL_SCHEMA_BUNDLE_ALIGNED",
      "OBJECT_STORAGE_BUCKETS_PRESENT",
      "QUEUE_NAMESPACES_PRESENT",
      "CACHE_NAMESPACES_PRESENT",
      "AUTHORITATIVE_VALIDATORS_PASSED",
    ]),
  );
});

test("semantic readiness fails closed when a durable bucket marker or queue service disappears", async () => {
  const bundle = await loadLocalRuntimeContractBundle();
  const defaultState = defaultLocalRuntimeStateManifest(bundle);
  const snapshot = {
    compose_service_states: defaultComposeSnapshot(bundle).map((service) =>
      service.compose_service_ref === "rabbitmq"
        ? { ...service, health: "unhealthy" as const, state: "running" as const }
        : service,
    ),
    state_markers: {
      ...defaultState.markers,
      object_storage_bucket_refs: ["taxat-local-upload-staging"],
    },
  };

  const result = evaluateLocalRuntimeHealth(bundle, snapshot, "SEMANTIC");
  expect(result.ok).toBe(false);
  expect(result.failureCodes).toEqual(
    expect.arrayContaining(["OBJECT_STORAGE_BUCKET_MISSING", "QUEUE_PROCESS_DOWN"]),
  );
});
