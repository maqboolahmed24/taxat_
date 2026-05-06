import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createCacheAndDeliveryBindingPolicy,
  createDnsAndOriginMatrix,
  createEdgeBoundaryAtlasViewModel,
  validateCacheAndDeliveryBindingPolicy,
  type CacheAndDeliveryBindingPolicy,
  type EdgeBoundaryAtlasViewModel,
} from "../../../../infra/edge/bootstrap/provision_dns_tls_waf_and_edge_delivery.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in cache policy and sample atlas match the builder", async () => {
  const persistedPolicy = await readJson<CacheAndDeliveryBindingPolicy>([
    "config",
    "edge",
    "cache_and_delivery_binding_policy.json",
  ]);
  const sampleRun = await readJson<{
    edgeBoundaryAtlas: EdgeBoundaryAtlasViewModel;
  }>(["automation", "provisioning", "report_viewer", "data", "sample_run.json"]);

  expect(persistedPolicy).toEqual(createCacheAndDeliveryBindingPolicy());
  expect(sampleRun.edgeBoundaryAtlas).toEqual(createEdgeBoundaryAtlasViewModel());
});

test("stream, signed-delivery, preview, and immutable-asset routes keep explicit cache law", () => {
  const matrix = createDnsAndOriginMatrix();
  const policy = createCacheAndDeliveryBindingPolicy();

  validateCacheAndDeliveryBindingPolicy(policy, matrix);

  const policyRefs = new Set(policy.policy_rows.map((row) => row.policy_ref));
  for (const row of matrix.host_origin_rows) {
    expect(policyRefs.has(row.cache_policy_ref)).toBe(true);
  }

  const streamPolicy = policy.policy_rows.find((row) => row.policy_ref === "cache.api-stream");
  expect(streamPolicy?.cache_mode).toBe("BYPASS_EDGE_CACHE");
  expect(streamPolicy?.transform_posture).toBe("NO_EDGE_TRANSFORM");

  const signedDeliveryPolicy = policy.policy_rows.find(
    (row) => row.policy_ref === "cache.signed-delivery-no-store",
  );
  expect(signedDeliveryPolicy?.cache_mode).toBe("BYPASS_EDGE_CACHE");
  expect(signedDeliveryPolicy?.requires_delivery_binding_hash).toBe(true);
  expect(signedDeliveryPolicy?.signed_delivery_required).toBe(true);

  const previewPolicy = policy.policy_rows.find((row) => row.policy_ref === "cache.preview-bypass");
  expect(previewPolicy?.cache_mode).toBe("BYPASS_EDGE_CACHE");
  expect(previewPolicy?.preview_binding_required).toBe(true);

  const assetPolicy = policy.policy_rows.find((row) => row.policy_ref === "cache.immutable-assets");
  expect(assetPolicy?.cache_mode).toBe("IMMUTABLE_EDGE_CACHE");
  expect(assetPolicy?.header_contract).toEqual(
    expect.arrayContaining(["Cache-Control: public, max-age=31536000, immutable"]),
  );

  const updatePackagePolicy = policy.policy_rows.find(
    (row) => row.policy_ref === "cache.update-package",
  );
  expect(updatePackagePolicy?.cache_mode).toBe("SIGNED_DELIVERY_DIGEST_PINNED_EDGE_CACHE");
  expect(updatePackagePolicy?.signed_delivery_required).toBe(true);
});
