import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  type CacheIsolationComparableField,
  collectCacheIsolationMismatchFields,
} from "./cache_isolation_key.ts";

export type CachePurgeTriggerCode =
  | "ACCESS_BINDING_CHANGE"
  | "CLIENT_BINDING_CHANGE"
  | "DELIVERY_BINDING_DRIFT"
  | "MASKING_CHANGE"
  | "PREVIEW_SELECTION_DRIFT"
  | "PRINCIPAL_CLASS_CHANGE"
  | "ROUTE_OR_OBJECT_DRIFT"
  | "SCHEMA_INCOMPATIBLE"
  | "SESSION_BINDING_CHANGE"
  | "TENANT_SWITCH"
  | "VISIBILITY_PARTITION_CHANGE";

export type CachePurgeArtifactClass =
  | "LOCAL_SEARCH_INDEX"
  | "NSUSERACTIVITY"
  | "PREVIEW_CACHE"
  | "RESUME_METADATA"
  | "SCENE_RESTORATION_PAYLOAD"
  | "SHARED_CACHE_ENTRY"
  | "STRUCTURED_CACHE"
  | "TEMP_EXPORT_FILE";

export type CachePurgeTriggerRow = {
  display_name: string;
  local_restore_posture: "DENY_RESTORE" | "READ_ONLY_ONLY";
  mismatch_fields: CacheIsolationComparableField[];
  notes: string[];
  purge_artifact_classes: CachePurgeArtifactClass[];
  shared_cache_action: "PURGE_ALL_SCOPE_VARIANTS" | "PURGE_MATCHING_SCOPE";
  trigger_code: CachePurgeTriggerCode;
};

export type CachePurgeTriggerMatrix = {
  basis_statement: string;
  contract_version: "CACHE_PURGE_TRIGGER_MATRIX_V1";
  matrix_id: string;
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
  trigger_rows: CachePurgeTriggerRow[];
};

export type CachePurgePlan = {
  localPurgeRequired: boolean;
  mismatchFields: CacheIsolationComparableField[];
  purgeArtifactClasses: CachePurgeArtifactClass[];
  readOnlyRestoreAllowed: boolean;
  sharedCachePurgeRequired: boolean;
  scopeVariantPurgeRequired: boolean;
  triggerCodes: CachePurgeTriggerCode[];
};

type CachePurgePlanErrorInit = {
  code: "POLICY_VALIDATION_FAILED";
  detail: string;
};

export class CachePurgePlanError extends Error {
  readonly code: CachePurgePlanErrorInit["code"];

  constructor(init: CachePurgePlanErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "CachePurgePlanError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const cachePurgeMatrixPath = path.join(
  repoRoot,
  "config",
  "cache",
  "cache_purge_trigger_matrix.json",
);
let cachedMatrix: Promise<CachePurgeTriggerMatrix> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new CachePurgePlanError({
      code: "POLICY_VALIDATION_FAILED",
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validateMatrix(matrix: CachePurgeTriggerMatrix) {
  assertCondition(
    matrix.contract_version === "CACHE_PURGE_TRIGGER_MATRIX_V1",
    "cache purge trigger matrix contract version drifted",
  );
  assertCondition(
    matrix.trigger_rows.length >= 6,
    "cache purge trigger matrix must declare the core drift rows",
  );
  const seen = new Set<CachePurgeTriggerCode>();
  for (const row of matrix.trigger_rows) {
    assertCondition(
      !seen.has(row.trigger_code),
      `duplicate cache purge trigger ${row.trigger_code}`,
    );
    seen.add(row.trigger_code);
  }
}

export async function loadCachePurgeTriggerMatrix(options?: { reload?: boolean }) {
  if (!cachedMatrix || options?.reload) {
    cachedMatrix = (async () => {
      const matrix = await readJson<CachePurgeTriggerMatrix>(cachePurgeMatrixPath);
      validateMatrix(matrix);
      return matrix;
    })();
  }
  return cachedMatrix;
}

export async function buildCachePurgePlan(
  input: {
    requestedContract: CacheIsolationContract;
    storedContract: CacheIsolationContract;
  },
  options?: { reload?: boolean },
) {
  const matrix = await loadCachePurgeTriggerMatrix(options);
  const mismatchFields = collectCacheIsolationMismatchFields(
    input.storedContract,
    input.requestedContract,
  );
  const matchingRows = matrix.trigger_rows.filter((row) =>
    row.mismatch_fields.some((field) => mismatchFields.includes(field)),
  );

  const triggerCodes = [...new Set(matchingRows.map((row) => row.trigger_code))];
  const purgeArtifactClasses = [
    ...new Set(matchingRows.flatMap((row) => row.purge_artifact_classes)),
  ] as CachePurgeArtifactClass[];

  return {
    localPurgeRequired: purgeArtifactClasses.length > 0,
    mismatchFields,
    purgeArtifactClasses,
    readOnlyRestoreAllowed:
      matchingRows.length > 0 &&
      matchingRows.every((row) => row.local_restore_posture === "READ_ONLY_ONLY"),
    scopeVariantPurgeRequired: matchingRows.some(
      (row) => row.shared_cache_action === "PURGE_ALL_SCOPE_VARIANTS",
    ),
    sharedCachePurgeRequired: matchingRows.length > 0,
    triggerCodes,
  } satisfies CachePurgePlan;
}
