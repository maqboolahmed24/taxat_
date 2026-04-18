import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createRecommendedNotificationOpenContinuityMatrix,
  createRecommendedPushChannelCatalog,
  validateNotificationOpenContinuityMatrix,
  type NotificationOpenContinuityMatrix,
} from "../../src/providers/push/flows/create_device_messaging_project_and_keys.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  const filePath = path.join(repoRoot, ...segments);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

test("checked-in continuity matrix matches the builder", async () => {
  const persistedMatrix = await readJson<NotificationOpenContinuityMatrix>([
    "config",
    "notifications",
    "notification_open_continuity_matrix.json",
  ]);

  expect(persistedMatrix).toEqual(
    createRecommendedNotificationOpenContinuityMatrix(),
  );
});

test("every push-eligible family maps to one continuity target and excluded families remain explicit", () => {
  const matrix = createRecommendedNotificationOpenContinuityMatrix();
  const catalog = createRecommendedPushChannelCatalog();

  validateNotificationOpenContinuityMatrix(matrix, catalog);

  expect(matrix.continuity_rows).toHaveLength(4);
  expect(
    new Set(matrix.continuity_rows.map((row) => row.notification_family)),
  ).toEqual(
    new Set(["ESCALATION", "CUSTOMER_REPLY", "SLA_OVERDUE", "SLA_BREACHED"]),
  );
  expect(
    matrix.excluded_notification_families.map((row) => row.notification_family),
  ).toEqual(
    expect.arrayContaining([
      "NEW_ASSIGNMENT",
      "REASSIGNMENT",
      "CUSTOMER_DUE_DATE_CHANGED",
      "REQUEST_INFO_OPENED",
      "CUSTOMER_VISIBLE_COMMENT",
    ]),
  );
});
