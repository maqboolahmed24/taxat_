import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stableJsonHash } from "../primitives/hash.ts";
import { assertReferenceFamily, assertReferenceKeyLiteral } from "../references/reference_key.ts";

export type QueueFamilyRef =
  | "STAGE_WORK"
  | "AUTHORITY_TRANSMIT"
  | "RECONCILIATION_FOLLOW_UP"
  | "PROJECTION_REFRESH"
  | "RECOVERY_JOB";

export type QueueWorkerClassRef =
  | "STAGE_RUNNER"
  | "AUTHORITY_GATEWAY_TRANSMITTER"
  | "AUTHORITY_RECONCILIATION_WORKER"
  | "READ_MODEL_PROJECTOR"
  | "RECOVERY_COORDINATOR";

export type QueueOrderingScopeRef =
  | "MANIFEST_STAGE_DOMAIN"
  | "AUTHORITY_TRANSMIT_DOMAIN"
  | "AUTHORITY_RECONCILIATION_DOMAIN"
  | "PROJECTION_MANIFEST_DOMAIN"
  | "ATTEMPT_RECOVERY_DOMAIN";

export type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

export type WorkerQueueCatalogRow = {
  queue_family_ref: QueueFamilyRef;
  display_name: string;
  rail_label: string;
  queue_ref: string;
  routing_key: string;
  lawful_producer_families: string[];
  consumer_worker_class_ref: QueueWorkerClassRef;
  ordering_scope_ref: QueueOrderingScopeRef;
  ordering_basis_statement: string;
  retry_budget_class: string;
  dead_letter_queue_ref: string;
  dead_letter_posture: string;
  notes: string[];
};

export type WorkerQueueCatalog = {
  contract_version: "WORKER_QUEUE_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  queue_family_rows: WorkerQueueCatalogRow[];
  source_lineage: SourceLineageEntry[];
};

export type OrderDomainScopeRow = {
  ordering_scope_ref: QueueOrderingScopeRef;
  display_name: string;
  scope_chip: string;
  lawful_component_fields: string[];
  formula_statement: string;
  concurrency_posture: string;
  notes: string[];
};

export type OrderDomainScopeMatrix = {
  contract_version: "ORDER_DOMAIN_SCOPE_MATRIX_V1";
  matrix_id: string;
  basis_statement: string;
  ordering_scope_rows: OrderDomainScopeRow[];
  source_lineage: SourceLineageEntry[];
};

export type QueuePolicyBundle = {
  orderDomainScopeMatrix: OrderDomainScopeMatrix;
  orderScopesByRef: Map<QueueOrderingScopeRef, OrderDomainScopeRow>;
  workerQueueCatalog: WorkerQueueCatalog;
  queueRowsByFamily: Map<QueueFamilyRef, WorkerQueueCatalogRow>;
};

type QueuePolicyErrorInit = {
  code:
    | "ORDER_DOMAIN_INPUT_MISSING"
    | "ORDER_SCOPE_UNKNOWN"
    | "POLICY_VALIDATION_FAILED"
    | "QUEUE_FAMILY_UNKNOWN";
  detail: string;
};

export class QueuePolicyError extends Error {
  readonly code: QueuePolicyErrorInit["code"];

  constructor(init: QueuePolicyErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "QueuePolicyError";
    this.code = init.code;
  }
}

export type BuildQueueOrderDomainPartsInput = {
  attemptLineageRefOrNull?: string | null;
  authorityInteractionRefOrNull?: string | null;
  clientIdOrNull?: string | null;
  duplicateMeaningKeyOrNull?: string | null;
  jobClassRefOrNull?: string | null;
  manifestRefOrNull?: string | null;
  operationFamilyOrNull?: string | null;
  orderingScopeRef?: QueueOrderingScopeRef;
  periodRefOrNull?: string | null;
  projectionFamilyRefOrNull?: string | null;
  queueFamilyRef?: QueueFamilyRef;
  runtimeScopeRefs?: readonly string[];
  stageCodeOrNull?: string | null;
  tenantIdOrNull?: string | null;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
export const queueConfigDir = path.join(repoRoot, "config", "queue");

const jsonPaths = {
  orderDomainScopeMatrix: path.join(queueConfigDir, "order_domain_scope_matrix.json"),
  workerQueueCatalog: path.join(queueConfigDir, "worker_queue_catalog.json"),
} as const;

let cachedBundle: Promise<QueuePolicyBundle> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new QueuePolicyError({
      code: "POLICY_VALIDATION_FAILED",
      detail,
    });
  }
}

function assertKeys(label: string, value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    assertCondition(key in value, `${label} missing required key ${key}`);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function requireInputField(
  fieldName: string,
  value: string | null | undefined,
  validator?: (value: string) => void,
) {
  if (!value) {
    throw new QueuePolicyError({
      code: "ORDER_DOMAIN_INPUT_MISSING",
      detail: `missing ${fieldName} for order-domain derivation`,
    });
  }
  validator?.(value);
  return value;
}

function validateWorkerQueueCatalog(
  catalog: WorkerQueueCatalog,
  orderScopesByRef: Map<QueueOrderingScopeRef, OrderDomainScopeRow>,
) {
  assertKeys("WorkerQueueCatalog", catalog as unknown as Record<string, unknown>, [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "queue_family_rows",
    "source_lineage",
  ]);
  assertCondition(
    catalog.contract_version === "WORKER_QUEUE_CATALOG_V1",
    "worker queue catalog contract version drifted",
  );
  assertCondition(catalog.queue_family_rows.length === 5, "expected five queue family rows");

  const seenFamilies = new Set<QueueFamilyRef>();
  for (const row of catalog.queue_family_rows) {
    assertKeys(
      `WorkerQueueCatalogRow ${row.queue_family_ref}`,
      row as unknown as Record<string, unknown>,
      [
        "queue_family_ref",
        "display_name",
        "rail_label",
        "queue_ref",
        "routing_key",
        "lawful_producer_families",
        "consumer_worker_class_ref",
        "ordering_scope_ref",
        "ordering_basis_statement",
        "retry_budget_class",
        "dead_letter_queue_ref",
        "dead_letter_posture",
        "notes",
      ],
    );
    assertCondition(
      !seenFamilies.has(row.queue_family_ref),
      `duplicate queue family ${row.queue_family_ref}`,
    );
    seenFamilies.add(row.queue_family_ref);
    assertCondition(
      orderScopesByRef.has(row.ordering_scope_ref),
      `queue family ${row.queue_family_ref} references unknown ordering scope ${row.ordering_scope_ref}`,
    );
  }
}

function validateOrderDomainScopeMatrix(matrix: OrderDomainScopeMatrix) {
  assertKeys("OrderDomainScopeMatrix", matrix as unknown as Record<string, unknown>, [
    "contract_version",
    "matrix_id",
    "basis_statement",
    "ordering_scope_rows",
    "source_lineage",
  ]);
  assertCondition(
    matrix.contract_version === "ORDER_DOMAIN_SCOPE_MATRIX_V1",
    "order-domain scope matrix contract version drifted",
  );
  assertCondition(matrix.ordering_scope_rows.length === 5, "expected five ordering scopes");

  const seenScopes = new Set<QueueOrderingScopeRef>();
  for (const row of matrix.ordering_scope_rows) {
    assertKeys(
      `OrderDomainScopeRow ${row.ordering_scope_ref}`,
      row as unknown as Record<string, unknown>,
      [
        "ordering_scope_ref",
        "display_name",
        "scope_chip",
        "lawful_component_fields",
        "formula_statement",
        "concurrency_posture",
        "notes",
      ],
    );
    assertCondition(
      !seenScopes.has(row.ordering_scope_ref),
      `duplicate ordering scope ${row.ordering_scope_ref}`,
    );
    seenScopes.add(row.ordering_scope_ref);
  }
}

export async function loadQueuePolicyBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const [workerQueueCatalog, orderDomainScopeMatrix] = await Promise.all([
        readJson<WorkerQueueCatalog>(jsonPaths.workerQueueCatalog),
        readJson<OrderDomainScopeMatrix>(jsonPaths.orderDomainScopeMatrix),
      ]);

      validateOrderDomainScopeMatrix(orderDomainScopeMatrix);
      const orderScopesByRef = new Map(
        orderDomainScopeMatrix.ordering_scope_rows.map(
          (row) => [row.ordering_scope_ref, row] as const,
        ),
      );
      validateWorkerQueueCatalog(workerQueueCatalog, orderScopesByRef);

      return {
        orderDomainScopeMatrix,
        orderScopesByRef,
        workerQueueCatalog,
        queueRowsByFamily: new Map(
          workerQueueCatalog.queue_family_rows.map((row) => [row.queue_family_ref, row] as const),
        ),
      } satisfies QueuePolicyBundle;
    })();
  }

  return cachedBundle;
}

export function queueCatalogRow(bundle: QueuePolicyBundle, queueFamilyRef: QueueFamilyRef) {
  const row = bundle.queueRowsByFamily.get(queueFamilyRef);
  if (!row) {
    throw new QueuePolicyError({
      code: "QUEUE_FAMILY_UNKNOWN",
      detail: `unknown queue family ${queueFamilyRef}`,
    });
  }
  return row;
}

export function orderDomainScopeRow(
  bundle: QueuePolicyBundle,
  orderingScopeRef: QueueOrderingScopeRef,
) {
  const row = bundle.orderScopesByRef.get(orderingScopeRef);
  if (!row) {
    throw new QueuePolicyError({
      code: "ORDER_SCOPE_UNKNOWN",
      detail: `unknown ordering scope ${orderingScopeRef}`,
    });
  }
  return row;
}

export function buildQueueOrderDomainParts(
  bundle: QueuePolicyBundle,
  input: BuildQueueOrderDomainPartsInput,
) {
  const orderingScopeRef =
    input.orderingScopeRef ??
    (input.queueFamilyRef ? queueCatalogRow(bundle, input.queueFamilyRef).ordering_scope_ref : null);

  if (!orderingScopeRef) {
    throw new QueuePolicyError({
      code: "ORDER_SCOPE_UNKNOWN",
      detail: "queue family or ordering scope is required to derive an order-domain key",
    });
  }

  switch (orderingScopeRef) {
    case "MANIFEST_STAGE_DOMAIN": {
      const manifestRef = requireInputField("manifest_ref", input.manifestRefOrNull, (value) => {
        assertReferenceFamily("manifest_ref", "REFERENCE", value);
      });
      const stageCode = requireInputField("stage_code", input.stageCodeOrNull);
      return [manifestRef, "POST_SEAL_STAGE", stageCode];
    }
    case "AUTHORITY_TRANSMIT_DOMAIN": {
      const tenantId = requireInputField("tenant_id", input.tenantIdOrNull, (value) => {
        assertReferenceKeyLiteral("tenant_id", value);
      });
      const clientId = requireInputField("client_id", input.clientIdOrNull, (value) => {
        assertReferenceKeyLiteral("client_id", value);
      });
      const periodRef = requireInputField("period_ref", input.periodRefOrNull, (value) => {
        assertReferenceKeyLiteral("period_ref", value);
      });
      const operationFamily = requireInputField("operation_family", input.operationFamilyOrNull);
      return [
        tenantId,
        clientId,
        periodRef,
        operationFamily,
        ...[...(input.runtimeScopeRefs ?? [])].sort(),
      ];
    }
    case "AUTHORITY_RECONCILIATION_DOMAIN": {
      const authorityInteractionRef = requireInputField(
        "authority_interaction_ref",
        input.authorityInteractionRefOrNull,
        (value) => {
          assertReferenceFamily("authority_interaction_ref", "REFERENCE", value);
        },
      );
      const duplicateMeaningKey = requireInputField(
        "duplicate_meaning_key",
        input.duplicateMeaningKeyOrNull,
        (value) => {
          assertReferenceFamily("duplicate_meaning_key", "HASH", value);
        },
      );
      return [authorityInteractionRef, duplicateMeaningKey];
    }
    case "PROJECTION_MANIFEST_DOMAIN": {
      const manifestRef = requireInputField("manifest_ref", input.manifestRefOrNull, (value) => {
        assertReferenceFamily("manifest_ref", "REFERENCE", value);
      });
      const projectionFamilyRef = requireInputField(
        "projection_family_ref",
        input.projectionFamilyRefOrNull,
      );
      return [manifestRef, projectionFamilyRef];
    }
    case "ATTEMPT_RECOVERY_DOMAIN": {
      const attemptLineageRef = requireInputField(
        "attempt_lineage_ref",
        input.attemptLineageRefOrNull,
        (value) => {
          assertReferenceFamily("attempt_lineage_ref", "REFERENCE", value);
        },
      );
      const jobClassRef = requireInputField("job_class_ref", input.jobClassRefOrNull);
      return [attemptLineageRef, jobClassRef];
    }
  }
}

export function deriveQueueOrderDomainKey(
  bundle: QueuePolicyBundle,
  input: BuildQueueOrderDomainPartsInput,
) {
  return stableJsonHash({
    order_domain_parts: buildQueueOrderDomainParts(bundle, input),
  });
}
