import { expect, test } from "@playwright/test";

import {
  buildManifestRouteGuardVectorComponents,
  buildManifestRouteStabilityContract,
} from "../../../packages/backend-northbound/src/index.ts";

test("manifest stability contract groups current decision, shell, epoch, sequence, and token", () => {
  const contract = buildManifestRouteStabilityContract({
    decisionBundleHash: "decision-hash-1",
    frameEpoch: 4,
    lastPublishedSequence: 12,
    publicationGeneration: 7,
    resumeToken: "resume-token-1",
    shellStabilityToken: "shell-token-1",
  });

  expect(contract.route_scope_class).toBe("MANIFEST_EXPERIENCE");
  expect(contract.publication_generation).toBe(7);
  expect(contract.guard_vector_components).toEqual(
    buildManifestRouteGuardVectorComponents({
      decisionBundleHash: "decision-hash-1",
      frameEpoch: 4,
      shellStabilityToken: "shell-token-1",
    }),
  );
  expect(contract.guard_vector_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(contract.last_published_sequence_or_null).toBe(12);
  expect(contract.resume_token_or_null).toBe("resume-token-1");
  expect(contract.resume_capability).toBe("STREAM_RESUMABLE");
});

test("guard vector hash changes only when governing manifest markers change", () => {
  const base = buildManifestRouteStabilityContract({
    decisionBundleHash: "decision-hash-1",
    frameEpoch: 4,
    lastPublishedSequence: 12,
    publicationGeneration: 7,
    resumeToken: "resume-token-1",
    shellStabilityToken: "shell-token-1",
  });
  const freshToken = buildManifestRouteStabilityContract({
    decisionBundleHash: "decision-hash-1",
    frameEpoch: 4,
    lastPublishedSequence: 12,
    publicationGeneration: 7,
    resumeToken: "resume-token-2",
    shellStabilityToken: "shell-token-1",
  });
  const epochAdvanced = buildManifestRouteStabilityContract({
    decisionBundleHash: "decision-hash-1",
    frameEpoch: 5,
    lastPublishedSequence: 12,
    publicationGeneration: 8,
    resumeToken: "resume-token-3",
    shellStabilityToken: "shell-token-1",
  });

  expect(freshToken.guard_vector_hash).toBe(base.guard_vector_hash);
  expect(freshToken.resume_token_or_null).not.toBe(base.resume_token_or_null);
  expect(epochAdvanced.guard_vector_hash).not.toBe(base.guard_vector_hash);
});
