import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  ArtifactRetentionSchemaLineage,
  type ArtifactRetention,
} from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import {
  RetentionTagSchemaLineage,
  type RetentionTag,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { ClientUploadSessionSchemaLineage } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { normalizeUtcInstantString, type ISO8601DateTimeString } from "../primitives/time.ts";
import { assertReferenceFamily, assertReferenceKeyLiteral } from "../references/reference_key.ts";

export type StorageLifecycleState =
  | "STAGED"
  | "SCANNING"
  | "QUARANTINED"
  | "PUBLISHED"
  | "DELIVERABLE"
  | "RETAINED"
  | "ERASURE_PENDING"
  | "ERASED";

export type ObjectMalwareScanState = "PENDING" | "CLEAN" | "QUARANTINED";
export type ObjectPublicationState =
  | "NOT_PUBLISHED"
  | "INTERNAL_ONLY"
  | "CUSTOMER_SAFE"
  | "DELIVERY_REVOKED";
export type ObjectCurrentHistoryPosture =
  | "NOT_APPLICABLE"
  | "CURRENT_PRIMARY_HISTORY_EXPLICIT"
  | "HISTORY_EXPLICIT_ONLY";
export type StorageDeliveryAffordance = "PREVIEW" | "DOWNLOAD" | "EXTERNALIZATION";
export type StorageDeliveryLaw = "DENY" | "ALLOW_GOVERNED_BINDING";

export type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

export type ObjectClassPolicyRow = {
  object_class_ref: string;
  display_name: string;
  storage_namespace_ref: string;
  storage_ref_prefix: string;
  initial_lifecycle_state: StorageLifecycleState;
  resumability_posture: string;
  exposure_posture: "INTERNAL_ONLY" | "CUSTOMER_SAFE";
  publication_posture: string;
  delivery_posture: string;
  current_history_posture: ObjectCurrentHistoryPosture;
  customer_safe_derivative_policy: string;
  retention_class: ArtifactRetention["retention_class"];
  notes: string[];
};

export type ObjectClassCatalog = {
  contract_version: "OBJECT_CLASS_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  object_class_rows: ObjectClassPolicyRow[];
  source_lineage: SourceLineageEntry[];
};

export type QuarantineTransitionPolicyRow = {
  transition_ref: string;
  trigger_ref: string;
  from_lifecycle_state: StorageLifecycleState;
  to_lifecycle_state: StorageLifecycleState;
  malware_scan_state: ObjectMalwareScanState;
  publication_posture: string;
  customer_delivery_effect: string;
  required_reason_codes: string[];
  history_mode: string;
  notes: string[];
};

export type QuarantineTransitionPolicy = {
  contract_version: "STORAGE_QUARANTINE_TRANSITION_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  transition_rows: QuarantineTransitionPolicyRow[];
  source_lineage: SourceLineageEntry[];
};

export type RetentionMetadataHookPolicyRow = {
  hook_ref: string;
  lifecycle_state: StorageLifecycleState;
  anchor_event: string;
  artifact_retention_state: ArtifactRetention["lifecycle_state"];
  erasure_eligibility: RetentionTag["erasure_eligibility"];
  limitation_behavior: RetentionTag["limitation_behavior"];
  default_checkpoint_offset_hours: number;
  applies_to_object_classes: string[];
  notes: string[];
};

export type RetentionMetadataHookPolicy = {
  contract_version: "STORAGE_RETENTION_METADATA_HOOK_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  hook_rows: RetentionMetadataHookPolicyRow[];
  source_lineage: SourceLineageEntry[];
};

export type StorageDeliveryBindingPolicyRow = {
  delivery_row_ref: string;
  object_class_ref: string;
  lifecycle_states: StorageLifecycleState[];
  affordances: StorageDeliveryAffordance[];
  delivery_law: StorageDeliveryLaw;
  current_history_posture: ObjectCurrentHistoryPosture;
  customer_safe_derivative_required: boolean;
  drift_response: string;
  signed_delivery_policy: string;
  notes: string[];
};

export type StorageDeliveryBindingPolicy = {
  contract_version: "STORAGE_DELIVERY_BINDING_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  delivery_rows: StorageDeliveryBindingPolicyRow[];
  source_lineage: SourceLineageEntry[];
};

type ReferenceStorageNamespaceCatalog = {
  namespace_rows: Array<{
    continuity_posture: string;
    delivery_posture: string;
    namespace_ref: string;
    storage_ref_prefix: string;
  }>;
};

export type GovernedObjectRecord = {
  objectRef: string;
  tenantId: string;
  objectClassRef: string;
  storageRef: string;
  lifecycleState: StorageLifecycleState;
  malwareScanState: ObjectMalwareScanState;
  publicationState: ObjectPublicationState;
  currentHistoryPosture: ObjectCurrentHistoryPosture;
  uploadSessionIdOrNull: string | null;
  requestVersionRefOrNull: string | null;
  derivativeSourceObjectRefOrNull: string | null;
  attachmentConfirmed: boolean;
  quarantineReasonCodes: string[];
  quarantineEventRefOrNull: string | null;
  currentArtifactRefs: string[];
  deliveryBindingHashOrNull: string | null;
  deliveryAffordanceOrNull: StorageDeliveryAffordance | null;
  deliveryTargetRefOrNull: string | null;
  downloadRefOrNull: string | null;
  previewTargetRefOrNull: string | null;
  retentionTagOrNull: RetentionTag | null;
  artifactRetentionOrNull: ArtifactRetention | null;
  lastTransitionAt: ISO8601DateTimeString;
  timeline: Array<{
    at: ISO8601DateTimeString;
    from_state_or_null: StorageLifecycleState | null;
    reason_codes: string[];
    to_state: StorageLifecycleState;
    trigger_ref: string;
  }>;
};

export type ObjectLifecyclePolicyBundle = {
  deliveryBindingPolicy: StorageDeliveryBindingPolicy;
  objectClassCatalog: ObjectClassCatalog;
  objectClassesByRef: Map<string, ObjectClassPolicyRow>;
  quarantineTransitionPolicy: QuarantineTransitionPolicy;
  referenceStorageCatalog: ReferenceStorageNamespaceCatalog;
  retentionMetadataHookPolicy: RetentionMetadataHookPolicy;
  retentionHooksByRef: Map<string, RetentionMetadataHookPolicyRow>;
  schemaHashes: {
    artifactRetention: string;
    clientUploadSession: string;
    retentionTag: string;
  };
  storageNamespacesByRef: Map<
    string,
    {
      continuity_posture: string;
      delivery_posture: string;
      namespace_ref: string;
      storage_ref_prefix: string;
    }
  >;
};

type StorageBoundaryErrorInit = {
  code:
    | "DELIVERY_BINDING_ROW_MISSING"
    | "LIFECYCLE_TRANSITION_FORBIDDEN"
    | "OBJECT_CLASS_UNKNOWN"
    | "OBJECT_STORAGE_NAMESPACE_MISMATCH"
    | "OBJECT_STORAGE_REF_PREFIX_MISMATCH"
    | "POLICY_VALIDATION_FAILED";
  detail: string;
};

export class StorageBoundaryError extends Error {
  readonly code: StorageBoundaryErrorInit["code"];

  constructor(init: StorageBoundaryErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "StorageBoundaryError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
export const storageConfigDir = path.join(repoRoot, "config", "storage");
export const objectLifecycleAtlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "object-lifecycle-atlas",
  "data",
  "object-lifecycle-atlas.json",
);

const jsonPaths = {
  deliveryBindingPolicy: path.join(storageConfigDir, "delivery_binding_policy.json"),
  objectClassCatalog: path.join(storageConfigDir, "object_class_catalog.json"),
  quarantineTransitionPolicy: path.join(storageConfigDir, "quarantine_transition_policy.json"),
  referenceStorageCatalog: path.join(
    repoRoot,
    "config",
    "references",
    "storage_ref_namespace_catalog.json",
  ),
  retentionMetadataHookPolicy: path.join(storageConfigDir, "retention_metadata_hook_policy.json"),
} as const;

const TERMINAL_DELIVERY_STATES = new Set<StorageLifecycleState>([
  "QUARANTINED",
  "ERASURE_PENDING",
  "ERASED",
]);

const ALLOWED_TRANSITIONS = new Map<StorageLifecycleState, Set<StorageLifecycleState>>([
  ["STAGED", new Set(["SCANNING", "QUARANTINED"])],
  ["SCANNING", new Set(["PUBLISHED", "QUARANTINED"])],
  ["QUARANTINED", new Set(["PUBLISHED", "RETAINED"])],
  ["PUBLISHED", new Set(["DELIVERABLE", "QUARANTINED", "RETAINED", "ERASURE_PENDING"])],
  ["DELIVERABLE", new Set(["QUARANTINED", "RETAINED", "ERASURE_PENDING"])],
  ["RETAINED", new Set(["ERASURE_PENDING", "ERASED"])],
  ["ERASURE_PENDING", new Set(["RETAINED", "ERASED"])],
  ["ERASED", new Set()],
]);

let cachedPolicyBundle: Promise<ObjectLifecyclePolicyBundle> | null = null;

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new StorageBoundaryError({
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

function relativeRepoPath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function validateObjectClassCatalog(
  catalog: ObjectClassCatalog,
  storageNamespacesByRef: Map<string, { storage_ref_prefix: string }>,
) {
  assertKeys("ObjectClassCatalog", catalog as unknown as Record<string, unknown>, [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "source_lineage",
    "object_class_rows",
  ]);
  assertCondition(
    catalog.contract_version === "OBJECT_CLASS_CATALOG_V1",
    "object class catalog contract version drifted",
  );
  const seen = new Set<string>();
  for (const row of catalog.object_class_rows) {
    assertKeys(
      `ObjectClassRow ${row.object_class_ref}`,
      row as unknown as Record<string, unknown>,
      [
        "object_class_ref",
        "display_name",
        "storage_namespace_ref",
        "storage_ref_prefix",
        "initial_lifecycle_state",
        "resumability_posture",
        "exposure_posture",
        "publication_posture",
        "delivery_posture",
        "current_history_posture",
        "customer_safe_derivative_policy",
        "retention_class",
        "notes",
      ],
    );
    assertCondition(
      !seen.has(row.object_class_ref),
      `duplicate object class ${row.object_class_ref}`,
    );
    seen.add(row.object_class_ref);

    const namespace = storageNamespacesByRef.get(row.storage_namespace_ref);
    assertCondition(
      Boolean(namespace),
      `object class ${row.object_class_ref} references unknown namespace ${row.storage_namespace_ref}`,
    );
    assertCondition(
      namespace?.storage_ref_prefix === row.storage_ref_prefix,
      `object class ${row.object_class_ref} storage prefix drifted from reference namespace`,
    );
  }
}

function validateQuarantineTransitionPolicy(policy: QuarantineTransitionPolicy) {
  assertKeys("QuarantineTransitionPolicy", policy as unknown as Record<string, unknown>, [
    "contract_version",
    "policy_id",
    "basis_statement",
    "source_lineage",
    "transition_rows",
  ]);
  assertCondition(
    policy.contract_version === "STORAGE_QUARANTINE_TRANSITION_POLICY_V1",
    "quarantine transition policy contract version drifted",
  );
  assertCondition(policy.transition_rows.length >= 4, "expected quarantine transition rows");
}

function validateRetentionMetadataHookPolicy(
  policy: RetentionMetadataHookPolicy,
  objectClassesByRef: Map<string, ObjectClassPolicyRow>,
) {
  assertKeys("RetentionMetadataHookPolicy", policy as unknown as Record<string, unknown>, [
    "contract_version",
    "policy_id",
    "basis_statement",
    "source_lineage",
    "hook_rows",
  ]);
  assertCondition(
    policy.contract_version === "STORAGE_RETENTION_METADATA_HOOK_POLICY_V1",
    "retention metadata hook policy contract version drifted",
  );
  for (const row of policy.hook_rows) {
    for (const objectClassRef of row.applies_to_object_classes) {
      assertCondition(
        objectClassesByRef.has(objectClassRef),
        `retention hook ${row.hook_ref} references unknown object class ${objectClassRef}`,
      );
    }
  }
}

function validateDeliveryBindingPolicy(
  policy: StorageDeliveryBindingPolicy,
  objectClassesByRef: Map<string, ObjectClassPolicyRow>,
) {
  assertKeys("StorageDeliveryBindingPolicy", policy as unknown as Record<string, unknown>, [
    "contract_version",
    "policy_id",
    "basis_statement",
    "source_lineage",
    "delivery_rows",
  ]);
  assertCondition(
    policy.contract_version === "STORAGE_DELIVERY_BINDING_POLICY_V1",
    "storage delivery binding policy contract version drifted",
  );
  for (const row of policy.delivery_rows) {
    assertCondition(
      objectClassesByRef.has(row.object_class_ref),
      `delivery binding row ${row.delivery_row_ref} references unknown object class`,
    );
  }
}

export async function loadObjectLifecyclePolicyBundle(options?: { reload?: boolean }) {
  if (!cachedPolicyBundle || options?.reload) {
    cachedPolicyBundle = (async () => {
      const [
        objectClassCatalog,
        quarantineTransitionPolicy,
        retentionMetadataHookPolicy,
        deliveryBindingPolicy,
        referenceStorageCatalog,
      ] = await Promise.all([
        readJson<ObjectClassCatalog>(jsonPaths.objectClassCatalog),
        readJson<QuarantineTransitionPolicy>(jsonPaths.quarantineTransitionPolicy),
        readJson<RetentionMetadataHookPolicy>(jsonPaths.retentionMetadataHookPolicy),
        readJson<StorageDeliveryBindingPolicy>(jsonPaths.deliveryBindingPolicy),
        readJson<ReferenceStorageNamespaceCatalog>(jsonPaths.referenceStorageCatalog),
      ]);

      const storageNamespacesByRef = new Map(
        referenceStorageCatalog.namespace_rows.map((row) => [row.namespace_ref, row] as const),
      );
      validateObjectClassCatalog(objectClassCatalog, storageNamespacesByRef);

      const objectClassesByRef = new Map(
        objectClassCatalog.object_class_rows.map((row) => [row.object_class_ref, row] as const),
      );
      validateQuarantineTransitionPolicy(quarantineTransitionPolicy);
      validateRetentionMetadataHookPolicy(retentionMetadataHookPolicy, objectClassesByRef);
      validateDeliveryBindingPolicy(deliveryBindingPolicy, objectClassesByRef);

      return {
        deliveryBindingPolicy,
        objectClassCatalog,
        objectClassesByRef,
        quarantineTransitionPolicy,
        referenceStorageCatalog,
        retentionMetadataHookPolicy,
        retentionHooksByRef: new Map(
          retentionMetadataHookPolicy.hook_rows.map((row) => [row.hook_ref, row] as const),
        ),
        schemaHashes: {
          artifactRetention: ArtifactRetentionSchemaLineage.sourceHash,
          clientUploadSession: ClientUploadSessionSchemaLineage.sourceHash,
          retentionTag: RetentionTagSchemaLineage.sourceHash,
        },
        storageNamespacesByRef,
      } satisfies ObjectLifecyclePolicyBundle;
    })();
  }

  return cachedPolicyBundle;
}

export function objectClassRow(bundle: ObjectLifecyclePolicyBundle, objectClassRef: string) {
  const row = bundle.objectClassesByRef.get(objectClassRef);
  if (!row) {
    throw new StorageBoundaryError({
      code: "OBJECT_CLASS_UNKNOWN",
      detail: `unknown object class ${objectClassRef}`,
    });
  }
  return row;
}

export function assertObjectStorageRefMatchesClass(
  bundle: ObjectLifecyclePolicyBundle,
  objectClassRef: string,
  storageRef: string,
) {
  assertReferenceFamily("storage_ref", "STORAGE_REF", storageRef);
  const row = objectClassRow(bundle, objectClassRef);
  const namespace = bundle.storageNamespacesByRef.get(row.storage_namespace_ref);
  if (!namespace) {
    throw new StorageBoundaryError({
      code: "OBJECT_STORAGE_NAMESPACE_MISMATCH",
      detail: `missing namespace ${row.storage_namespace_ref} for ${objectClassRef}`,
    });
  }
  if (!storageRef.startsWith(namespace.storage_ref_prefix)) {
    throw new StorageBoundaryError({
      code: "OBJECT_STORAGE_REF_PREFIX_MISMATCH",
      detail: `${storageRef} does not match ${namespace.storage_ref_prefix}`,
    });
  }
}

export function createGovernedObjectRecord(
  bundle: ObjectLifecyclePolicyBundle,
  init: {
    attachmentConfirmed?: boolean;
    createdAt: ISO8601DateTimeString;
    currentArtifactRefs?: string[];
    currentHistoryPosture?: ObjectCurrentHistoryPosture;
    derivativeSourceObjectRefOrNull?: string | null;
    lifecycleState?: StorageLifecycleState;
    malwareScanState?: ObjectMalwareScanState;
    objectClassRef: string;
    objectRef: string;
    publicationState?: ObjectPublicationState;
    requestVersionRefOrNull?: string | null;
    storageRef: string;
    tenantId: string;
    uploadSessionIdOrNull?: string | null;
  },
) {
  assertReferenceFamily("object_ref", "REFERENCE", init.objectRef);
  assertReferenceKeyLiteral("tenant_id", init.tenantId);
  assertObjectStorageRefMatchesClass(bundle, init.objectClassRef, init.storageRef);

  if (init.uploadSessionIdOrNull !== undefined && init.uploadSessionIdOrNull !== null) {
    assertReferenceFamily("upload_session_id", "IDENTITY", init.uploadSessionIdOrNull);
  }
  if (init.requestVersionRefOrNull !== undefined && init.requestVersionRefOrNull !== null) {
    assertReferenceFamily("request_version_ref", "REFERENCE", init.requestVersionRefOrNull);
  }
  if (
    init.derivativeSourceObjectRefOrNull !== undefined &&
    init.derivativeSourceObjectRefOrNull !== null
  ) {
    assertReferenceFamily("artifact_ref", "REFERENCE", init.derivativeSourceObjectRefOrNull);
  }
  for (const artifactRef of init.currentArtifactRefs ?? []) {
    assertReferenceFamily("artifact_ref", "REFERENCE", artifactRef);
  }

  const objectClass = objectClassRow(bundle, init.objectClassRef);
  const createdAt = normalizeUtcInstantString(init.createdAt);
  const lifecycleState = init.lifecycleState ?? objectClass.initial_lifecycle_state;

  return {
    objectRef: init.objectRef,
    tenantId: init.tenantId,
    objectClassRef: init.objectClassRef,
    storageRef: init.storageRef,
    lifecycleState,
    malwareScanState: init.malwareScanState ?? "PENDING",
    publicationState: init.publicationState ?? "NOT_PUBLISHED",
    currentHistoryPosture: init.currentHistoryPosture ?? objectClass.current_history_posture,
    uploadSessionIdOrNull: init.uploadSessionIdOrNull ?? null,
    requestVersionRefOrNull: init.requestVersionRefOrNull ?? null,
    derivativeSourceObjectRefOrNull: init.derivativeSourceObjectRefOrNull ?? null,
    attachmentConfirmed: init.attachmentConfirmed ?? false,
    quarantineReasonCodes: [],
    quarantineEventRefOrNull: null,
    currentArtifactRefs: [...(init.currentArtifactRefs ?? [])],
    deliveryBindingHashOrNull: null,
    deliveryAffordanceOrNull: null,
    deliveryTargetRefOrNull: null,
    downloadRefOrNull: null,
    previewTargetRefOrNull: null,
    retentionTagOrNull: null,
    artifactRetentionOrNull: null,
    lastTransitionAt: createdAt,
    timeline: [
      {
        at: createdAt,
        from_state_or_null: null,
        reason_codes: ["OBJECT_CREATED"],
        to_state: lifecycleState,
        trigger_ref: "OBJECT_CREATED",
      },
    ],
  } satisfies GovernedObjectRecord;
}

export function transitionLifecycleState(
  record: GovernedObjectRecord,
  nextState: StorageLifecycleState,
  init: {
    at: ISO8601DateTimeString;
    reasonCodes: string[];
    triggerRef: string;
  },
) {
  if (record.lifecycleState === nextState) {
    return {
      ...record,
      lastTransitionAt: normalizeUtcInstantString(init.at),
      timeline: [
        ...record.timeline,
        {
          at: normalizeUtcInstantString(init.at),
          from_state_or_null: record.lifecycleState,
          reason_codes: [...init.reasonCodes],
          to_state: nextState,
          trigger_ref: init.triggerRef,
        },
      ],
    } satisfies GovernedObjectRecord;
  }

  const allowed = ALLOWED_TRANSITIONS.get(record.lifecycleState);
  if (!allowed?.has(nextState)) {
    throw new StorageBoundaryError({
      code: "LIFECYCLE_TRANSITION_FORBIDDEN",
      detail: `cannot move ${record.lifecycleState} to ${nextState}`,
    });
  }

  const timestamp = normalizeUtcInstantString(init.at);
  return {
    ...record,
    lifecycleState: nextState,
    deliveryBindingHashOrNull: TERMINAL_DELIVERY_STATES.has(nextState)
      ? null
      : record.deliveryBindingHashOrNull,
    deliveryAffordanceOrNull: TERMINAL_DELIVERY_STATES.has(nextState)
      ? null
      : record.deliveryAffordanceOrNull,
    deliveryTargetRefOrNull: TERMINAL_DELIVERY_STATES.has(nextState)
      ? null
      : record.deliveryTargetRefOrNull,
    downloadRefOrNull: TERMINAL_DELIVERY_STATES.has(nextState) ? null : record.downloadRefOrNull,
    previewTargetRefOrNull: TERMINAL_DELIVERY_STATES.has(nextState)
      ? null
      : record.previewTargetRefOrNull,
    lastTransitionAt: timestamp,
    timeline: [
      ...record.timeline,
      {
        at: timestamp,
        from_state_or_null: record.lifecycleState,
        reason_codes: [...init.reasonCodes],
        to_state: nextState,
        trigger_ref: init.triggerRef,
      },
    ],
  } satisfies GovernedObjectRecord;
}

export function findDeliveryBindingRows(
  bundle: ObjectLifecyclePolicyBundle,
  objectClassRef: string,
  lifecycleState: StorageLifecycleState,
  affordance: StorageDeliveryAffordance,
) {
  return bundle.deliveryBindingPolicy.delivery_rows.filter(
    (row) =>
      row.object_class_ref === objectClassRef &&
      row.lifecycle_states.includes(lifecycleState) &&
      row.affordances.includes(affordance),
  );
}

export function stableObjectLifecycleDigest(record: GovernedObjectRecord) {
  return stableJsonHash({
    artifact_retention_id_or_null: record.artifactRetentionOrNull?.retention_id ?? null,
    delivery_binding_hash_or_null: record.deliveryBindingHashOrNull,
    lifecycle_state: record.lifecycleState,
    object_class_ref: record.objectClassRef,
    object_ref: record.objectRef,
    preview_target_ref_or_null: record.previewTargetRefOrNull,
    quarantine_reason_codes: record.quarantineReasonCodes,
    retention_tag_id_or_null: record.retentionTagOrNull?.retention_tag_id ?? null,
    storage_ref: record.storageRef,
  });
}

export async function emitObjectLifecycleAtlasPayload(payload: unknown) {
  await mkdir(path.dirname(objectLifecycleAtlasDataPath), { recursive: true });
  await writeFile(objectLifecycleAtlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function checkObjectLifecycleAtlasPayload(payload: unknown) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(objectLifecycleAtlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(
      `Out-of-sync generated file: ${relativeRepoPath(objectLifecycleAtlasDataPath)}`,
    );
  }
}

export async function mainValidateObjectLifecyclePolicies() {
  const mode = new Set(process.argv.slice(2)).has("--emit") ? "emit" : "check";
  const bundle = await loadObjectLifecyclePolicyBundle({ reload: true });
  console.log(`${mode === "emit" ? "loaded" : "verified"} object lifecycle policy bundle`);
  console.log(`object classes: ${bundle.objectClassCatalog.object_class_rows.length}`);
  console.log(
    `quarantine transitions: ${bundle.quarantineTransitionPolicy.transition_rows.length}`,
  );
  console.log(`retention hooks: ${bundle.retentionMetadataHookPolicy.hook_rows.length}`);
  console.log(`delivery rows: ${bundle.deliveryBindingPolicy.delivery_rows.length}`);
  console.log(
    `policy digest: ${sha256Hex(
      JSON.stringify({
        deliveryBindingPolicy: bundle.deliveryBindingPolicy,
        objectClassCatalog: bundle.objectClassCatalog,
        quarantineTransitionPolicy: bundle.quarantineTransitionPolicy,
        retentionMetadataHookPolicy: bundle.retentionMetadataHookPolicy,
      }),
    )}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainValidateObjectLifecyclePolicies().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
