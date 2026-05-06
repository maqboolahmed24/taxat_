import { expect, test } from "@playwright/test";
import type { StoredDecisionBundleRecord } from "../../../packages/backend-compute/src/repositories/decision_bundle_repository.ts";
import {
  DecisionBundlePublicationError,
  validateDecisionBundlePublication,
} from "../../../packages/backend-northbound/src/index.ts";
import { persistedDecisionBundleFixture } from "./decision_bundle_fixtures.ts";

test("validates persisted bundle identity and ETag hash spine", async () => {
  const { stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-publication-valid",
  });

  const publication = validateDecisionBundlePublication({
    stored,
  });

  expect(publication.record.manifest_id).toBe(stored.manifest_id);
  expect(publication.decisionBundleHash).toBe(stored.decision_bundle_hash);
  expect(publication.record.contract.artifact_content_hash).toBe(stored.decision_bundle_hash);
});

test("fails closed when reason compression drifts", async () => {
  const { stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-publication-reason-drift",
  });
  const drifted = {
    ...stored,
    record: {
      ...stored.record,
      decision_reason_codes: ["DRIFTED_REASON"],
    },
  } satisfies StoredDecisionBundleRecord;

  expect(() =>
    validateDecisionBundlePublication({
      stored: drifted,
    }),
  ).toThrow(DecisionBundlePublicationError);
});

test("fails closed when primary action is no longer legal", async () => {
  const { stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-publication-action-drift",
    outcomeClass: "HUMAN_REVIEW",
  });
  const drifted = {
    ...stored,
    record: {
      ...stored.record,
      blocked_action_codes: [stored.record.primary_action_code as string],
    },
  } satisfies StoredDecisionBundleRecord;

  expect(() =>
    validateDecisionBundlePublication({
      stored: drifted,
    }),
  ).toThrow(DecisionBundlePublicationError);
});

test("fails closed when repository hash differs from artifact contract hash", async () => {
  const { stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-publication-hash-drift",
  });
  const drifted = {
    ...stored,
    decision_bundle_hash: `${stored.decision_bundle_hash}.drifted`,
  } satisfies StoredDecisionBundleRecord;

  expect(() =>
    validateDecisionBundlePublication({
      stored: drifted,
    }),
  ).toThrow(DecisionBundlePublicationError);
});
