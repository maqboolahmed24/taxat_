import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createIdempotencyAndDedupePolicy,
  createOrderingAndPartitioningPolicy,
  createRetryDeadLetterPolicy,
  validateIdempotencyAndDedupePolicy,
  validateOrderingAndPartitioningPolicy,
  validateRetryDeadLetterPolicy,
  type IdempotencyAndDedupePolicy,
  type OrderingAndPartitioningPolicy,
  type RetryDeadLetterPolicy,
} from "../../../../infra/messaging/bootstrap/provision_queue_or_broker_for_outbox_inbox_and_worker_coordination.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(
    await readFile(path.join(repoRoot, ...segments), "utf8"),
  ) as T;
}

test("checked-in retry, ordering, and dedupe policies match the builder", async () => {
  const persistedRetry = await readJson<RetryDeadLetterPolicy>([
    "config",
    "messaging",
    "retry_dead_letter_policy.json",
  ]);
  const persistedOrdering = await readJson<OrderingAndPartitioningPolicy>([
    "config",
    "messaging",
    "ordering_and_partitioning_policy.json",
  ]);
  const persistedDedupe = await readJson<IdempotencyAndDedupePolicy>([
    "config",
    "messaging",
    "idempotency_and_dedupe_policy.json",
  ]);

  expect(persistedRetry).toEqual(createRetryDeadLetterPolicy());
  expect(persistedOrdering).toEqual(createOrderingAndPartitioningPolicy());
  expect(persistedDedupe).toEqual(createIdempotencyAndDedupePolicy());
});

test("retry and dedupe law stays fail-closed for authority ingress and broker rebuild", () => {
  const retryPolicy = createRetryDeadLetterPolicy();
  const orderingPolicy = createOrderingAndPartitioningPolicy();
  const dedupePolicy = createIdempotencyAndDedupePolicy();

  validateRetryDeadLetterPolicy(retryPolicy);
  validateOrderingAndPartitioningPolicy(orderingPolicy);
  validateIdempotencyAndDedupePolicy(dedupePolicy);

  const authorityIngressRetry = retryPolicy.policy_rows.find(
    (row) => row.policy_ref === "retry.authority_callback_normalization",
  );
  expect(authorityIngressRetry?.dead_letter_mode).toBe("MANUAL_REVIEW_REQUIRED");
  expect(authorityIngressRetry?.redrive_gate).toContain(
    "canonical ingress receipt",
  );

  const authorityIngressOrdering = orderingPolicy.policy_rows.find(
    (row) => row.policy_ref === "ordering.authority_ingress_delivery",
  );
  expect(authorityIngressOrdering?.partition_key_fields).toEqual(
    expect.arrayContaining(["authority_profile_ref", "delivery_dedupe_key"]),
  );

  const authorityIngressDedupe = dedupePolicy.policy_rows.find(
    (row) => row.policy_ref === "dedupe.authority_delivery_identity",
  );
  expect(authorityIngressDedupe?.window_posture).toContain(
    "DURABLE_LEDGER_REQUIRED",
  );
  expect(authorityIngressDedupe?.mutation_gate).toContain(
    "Legal-state mutation is blocked",
  );

  const restoreRetry = retryPolicy.policy_rows.find(
    (row) => row.policy_ref === "retry.restore_rebuild",
  );
  expect(restoreRetry?.dead_letter_mode).toBe("DEAD_LETTER_QUEUE_REQUIRED");
  expect(restoreRetry?.redrive_gate).toContain("checkpoint");

  const authorityRequestDedupe = dedupePolicy.policy_rows.find(
    (row) => row.policy_ref === "dedupe.authority_request_identity",
  );
  expect(authorityRequestDedupe?.replay_protection).toMatch(
    /AuthorityInteractionRecord|ReconciliationControlContract/i,
  );

  const restoreDedupe = dedupePolicy.policy_rows.find(
    (row) => row.policy_ref === "dedupe.restore_checkpoint_identity",
  );
  expect(restoreDedupe?.replay_protection).toMatch(
    /RecoveryCheckpoint/i,
  );
});
