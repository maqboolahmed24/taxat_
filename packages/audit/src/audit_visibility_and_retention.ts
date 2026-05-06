import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RetentionLimitedExplainabilityContract } from "../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type AuditFamilyRef =
  | "AUTH"
  | "WORKFLOW"
  | "CONFIG"
  | "RETENTION"
  | "FAILURE"
  | "RELEASE"
  | "SECURITY";

export type AuditSignatureProfile = "NONE" | "OPTIONAL_BATCH" | "REQUIRED_BATCH";
export type AuditPayloadAvailabilityState = "FULL" | "HASH_ONLY" | "TOMBSTONED" | "ERASED";
export type AuditSufficiencyState = "SUFFICIENT" | "LIMITED";

export type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

export type AuditEventFamilyCatalogRow = {
  default_retention_class: string;
  default_visibility_class: string;
  event_types: string[];
  family_ref: AuditFamilyRef;
  label: string;
  notes: string[];
};

export type AuditEventFamilyCatalog = {
  basis_statement: string;
  catalog_id: string;
  contract_version: "AUDIT_EVENT_FAMILY_CATALOG_V1";
  family_rows: AuditEventFamilyCatalogRow[];
  source_lineage: SourceLineageEntry[];
};

export type AuditStreamPartitionPolicyRow = {
  notes: string[];
  partition_ref: "NIGHTLY" | "AUTHORITY" | "MANIFEST" | "WORKFLOW" | "FAMILY";
  required_context_keys: string[];
  resolution_priority: number;
  stream_ref_template: string;
};

export type AuditStreamPartitionPolicy = {
  basis_statement: string;
  contract_version: "AUDIT_STREAM_PARTITION_POLICY_V1";
  partition_resolution_order: Array<
    AuditStreamPartitionPolicyRow["partition_ref"]
  >;
  policy_id: string;
  source_lineage: SourceLineageEntry[];
  stream_partition_rows: AuditStreamPartitionPolicyRow[];
};

export type AuditOrderingPolicy = {
  basis_statement: string;
  canonical_stream_order: string;
  compare_and_swap_policy: string;
  contract_version: "AUDIT_ORDERING_POLICY_V1";
  duplicate_publication_policy: string;
  merged_view_order: string;
  notes: string[];
  policy_id: string;
  sequence_origin: "ONE_BASED_APPEND_ONLY";
  signature_failure_posture: string;
  source_lineage: SourceLineageEntry[];
};

export type AuditSignaturePolicyRow = {
  batch_bucket_granularity: "HOUR";
  family_ref: AuditFamilyRef;
  failure_follow_up_policy: string;
  notes: string[];
  requires_preallocated_signature_ref: boolean;
  signature_profile: AuditSignatureProfile;
};

export type AuditSignaturePolicy = {
  basis_statement: string;
  contract_version: "AUDIT_SIGNATURE_POLICY_V1";
  pending_reference_policy: string;
  policy_id: string;
  signature_rows: AuditSignaturePolicyRow[];
  source_lineage: SourceLineageEntry[];
};

export type AuditRetainedContext = {
  audit_sufficiency_state: AuditSufficiencyState;
  limitation_reason_codes: string[];
  lineage_refs: string[];
  payload_availability_state: AuditPayloadAvailabilityState;
  payload_expiry_at_or_null: string | null;
};

export type AuditPolicyBundle = {
  eventFamiliesByType: Map<string, AuditEventFamilyCatalogRow>;
  familyCatalog: AuditEventFamilyCatalog;
  familiesByRef: Map<AuditFamilyRef, AuditEventFamilyCatalogRow>;
  orderingPolicy: AuditOrderingPolicy;
  partitionPolicy: AuditStreamPartitionPolicy;
  partitionsByRef: Map<AuditStreamPartitionPolicyRow["partition_ref"], AuditStreamPartitionPolicyRow>;
  signaturePolicy: AuditSignaturePolicy;
  signatureRowsByFamily: Map<AuditFamilyRef, AuditSignaturePolicyRow>;
};

type AuditPolicyErrorInit = {
  code: "AUDIT_POLICY_INVALID" | "AUDIT_STRING_REQUIRED";
  detail: string;
};

export class AuditPolicyError extends Error {
  readonly code: AuditPolicyErrorInit["code"];

  constructor(init: AuditPolicyErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "AuditPolicyError";
    this.code = init.code;
  }
}

const EXPECTED_FAMILIES = [
  "AUTH",
  "WORKFLOW",
  "CONFIG",
  "RETENTION",
  "FAILURE",
  "RELEASE",
  "SECURITY",
] as const satisfies readonly AuditFamilyRef[];

const EXPECTED_PARTITIONS = [
  "NIGHTLY",
  "AUTHORITY",
  "MANIFEST",
  "WORKFLOW",
  "FAMILY",
] as const satisfies readonly AuditStreamPartitionPolicyRow["partition_ref"][];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..");
export const auditConfigDir = path.join(repoRoot, "config", "audit");
export const auditConfigPaths = {
  familyCatalog: path.join(auditConfigDir, "audit_event_family_catalog.json"),
  orderingPolicy: path.join(auditConfigDir, "audit_ordering_policy.json"),
  partitionPolicy: path.join(auditConfigDir, "audit_stream_partition_policy.json"),
  signaturePolicy: path.join(auditConfigDir, "audit_signature_policy.json"),
} as const;

let cachedBundle: Promise<AuditPolicyBundle> | null = null;

function assertCondition(condition: unknown, code: AuditPolicyErrorInit["code"], detail: string) {
  if (!condition) {
    throw new AuditPolicyError({
      code,
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function normalizeStringArray(values: readonly string[] | null | undefined) {
  return [...new Set((values ?? []).map((entry) => assertNonEmptyString("audit policy string", entry)))];
}

function assertNonEmptyString(fieldName: string, value: unknown) {
  assertCondition(
    typeof value === "string" && value.trim().length > 0,
    "AUDIT_STRING_REQUIRED",
    `${fieldName} must remain a non-empty string`,
  );
  return value.trim();
}

function validateFamilyCatalog(catalog: AuditEventFamilyCatalog) {
  assertCondition(
    catalog.contract_version === "AUDIT_EVENT_FAMILY_CATALOG_V1",
    "AUDIT_POLICY_INVALID",
    "audit family catalog contract version drifted",
  );
  assertCondition(
    catalog.family_rows.length === EXPECTED_FAMILIES.length,
    "AUDIT_POLICY_INVALID",
    "audit family catalog must declare exactly seven governed families",
  );

  const seenFamilies = new Set<AuditFamilyRef>();
  const seenEventTypes = new Set<string>();
  for (const row of catalog.family_rows) {
    assertCondition(
      !seenFamilies.has(row.family_ref),
      "AUDIT_POLICY_INVALID",
      `duplicate audit family row ${row.family_ref}`,
    );
    seenFamilies.add(row.family_ref);
    assertCondition(
      row.event_types.length > 0,
      "AUDIT_POLICY_INVALID",
      `audit family ${row.family_ref} must bind at least one event type`,
    );
    for (const eventType of row.event_types) {
      const normalized = assertNonEmptyString("audit event type", eventType);
      assertCondition(
        !seenEventTypes.has(normalized),
        "AUDIT_POLICY_INVALID",
        `audit event type ${normalized} is assigned to multiple families`,
      );
      seenEventTypes.add(normalized);
    }
  }

  for (const family of EXPECTED_FAMILIES) {
    assertCondition(
      seenFamilies.has(family),
      "AUDIT_POLICY_INVALID",
      `audit family catalog is missing ${family}`,
    );
  }
}

function validatePartitionPolicy(policy: AuditStreamPartitionPolicy) {
  assertCondition(
    policy.contract_version === "AUDIT_STREAM_PARTITION_POLICY_V1",
    "AUDIT_POLICY_INVALID",
    "audit stream partition policy contract version drifted",
  );
  assertCondition(
    policy.partition_resolution_order.length === EXPECTED_PARTITIONS.length,
    "AUDIT_POLICY_INVALID",
    "audit stream partition policy must retain every governed partition stage",
  );
  assertCondition(
    policy.stream_partition_rows.length === EXPECTED_PARTITIONS.length,
    "AUDIT_POLICY_INVALID",
    "audit stream partition policy rows must match the governed partition set",
  );

  const seenOrder = new Set<AuditStreamPartitionPolicyRow["partition_ref"]>();
  for (const partition of policy.partition_resolution_order) {
    assertCondition(
      !seenOrder.has(partition),
      "AUDIT_POLICY_INVALID",
      `duplicate partition in audit resolution order ${partition}`,
    );
    seenOrder.add(partition);
  }

  const seenRows = new Set<AuditStreamPartitionPolicyRow["partition_ref"]>();
  for (const row of policy.stream_partition_rows) {
    assertCondition(
      !seenRows.has(row.partition_ref),
      "AUDIT_POLICY_INVALID",
      `duplicate audit stream partition row ${row.partition_ref}`,
    );
    seenRows.add(row.partition_ref);
  }

  for (const partition of EXPECTED_PARTITIONS) {
    assertCondition(
      seenOrder.has(partition) && seenRows.has(partition),
      "AUDIT_POLICY_INVALID",
      `audit stream partition policy is missing ${partition}`,
    );
  }
}

function validateOrderingPolicy(policy: AuditOrderingPolicy) {
  assertCondition(
    policy.contract_version === "AUDIT_ORDERING_POLICY_V1",
    "AUDIT_POLICY_INVALID",
    "audit ordering policy contract version drifted",
  );
  assertCondition(
    policy.sequence_origin === "ONE_BASED_APPEND_ONLY",
    "AUDIT_POLICY_INVALID",
    "audit ordering policy must remain one-based append-only",
  );
}

function validateSignaturePolicy(policy: AuditSignaturePolicy) {
  assertCondition(
    policy.contract_version === "AUDIT_SIGNATURE_POLICY_V1",
    "AUDIT_POLICY_INVALID",
    "audit signature policy contract version drifted",
  );
  assertCondition(
    policy.signature_rows.length === EXPECTED_FAMILIES.length,
    "AUDIT_POLICY_INVALID",
    "audit signature policy must cover every audit family",
  );

  const seenFamilies = new Set<AuditFamilyRef>();
  for (const row of policy.signature_rows) {
    assertCondition(
      !seenFamilies.has(row.family_ref),
      "AUDIT_POLICY_INVALID",
      `duplicate signature policy row ${row.family_ref}`,
    );
    seenFamilies.add(row.family_ref);
  }

  for (const family of EXPECTED_FAMILIES) {
    assertCondition(
      seenFamilies.has(family),
      "AUDIT_POLICY_INVALID",
      `audit signature policy is missing ${family}`,
    );
  }
}

export function createAuditExplainabilityContract(): RetentionLimitedExplainabilityContract {
  return {
    audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM",
    boundary_scope: "AUDIT_EVENT",
    contract_version: "RETENTION_EXPLAINABILITY_V1",
    decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT",
    explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES",
    omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE",
    present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED",
    silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN",
    surface_role: "AUDIT_RECONSTRUCTION_EVIDENCE",
    surface_specific_binding_policy:
      "AUDIT_EVENT_RETAINS_MINIMUM_RECONSTRUCTION_CONTEXT_AFTER_PAYLOAD_EXPIRY",
  };
}

export function createAuditRetainedContext(init?: {
  limitationReasonCodes?: readonly string[] | null;
  lineageRefs?: readonly string[] | null;
  payloadAvailabilityState?: AuditPayloadAvailabilityState;
  payloadExpiryAtOrNull?: string | null;
}): AuditRetainedContext {
  const payloadAvailabilityState = init?.payloadAvailabilityState ?? "FULL";
  const lineageRefs = normalizeStringArray(init?.lineageRefs);
  const limitationReasonCodes = normalizeStringArray(init?.limitationReasonCodes);

  if (payloadAvailabilityState === "FULL") {
    return {
      audit_sufficiency_state: "SUFFICIENT",
      limitation_reason_codes: [],
      lineage_refs: lineageRefs.length > 0 ? lineageRefs : ["audit.payload.full"],
      payload_availability_state: payloadAvailabilityState,
      payload_expiry_at_or_null: null,
    };
  }

  assertCondition(
    typeof init?.payloadExpiryAtOrNull === "string" && init.payloadExpiryAtOrNull.length > 0,
    "AUDIT_POLICY_INVALID",
    "post-expiry audit retained context must retain payload expiry",
  );
  assertCondition(
    lineageRefs.length > 0,
    "AUDIT_POLICY_INVALID",
    "post-expiry audit retained context must retain lineage refs",
  );
  assertCondition(
    limitationReasonCodes.length > 0,
    "AUDIT_POLICY_INVALID",
    "post-expiry audit retained context must retain limitation reason codes",
  );
  return {
    audit_sufficiency_state: "LIMITED",
    limitation_reason_codes: limitationReasonCodes,
    lineage_refs: lineageRefs,
    payload_availability_state: payloadAvailabilityState,
    payload_expiry_at_or_null: init.payloadExpiryAtOrNull,
  };
}

export function resolveAuditFamilyRule(bundle: AuditPolicyBundle, eventType: string) {
  const row = bundle.eventFamiliesByType.get(eventType);
  assertCondition(
    row,
    "AUDIT_POLICY_INVALID",
    `audit event type ${eventType} is not declared in the family catalog`,
  );
  return row;
}

export function resolveSignatureProfile(
  signaturePolicy: AuditSignaturePolicy,
  familyRef: AuditFamilyRef,
) {
  const row = signaturePolicy.signature_rows.find((entry) => entry.family_ref === familyRef);
  assertCondition(
    row,
    "AUDIT_POLICY_INVALID",
    `missing signature policy row for ${familyRef}`,
  );
  return row.signature_profile;
}

export async function loadAuditPolicyBundle(options?: { reload?: boolean }) {
  if (options?.reload) {
    cachedBundle = null;
  }

  cachedBundle ??= (async (): Promise<AuditPolicyBundle> => {
    const [familyCatalog, orderingPolicy, partitionPolicy, signaturePolicy] = await Promise.all([
      readJson<AuditEventFamilyCatalog>(auditConfigPaths.familyCatalog),
      readJson<AuditOrderingPolicy>(auditConfigPaths.orderingPolicy),
      readJson<AuditStreamPartitionPolicy>(auditConfigPaths.partitionPolicy),
      readJson<AuditSignaturePolicy>(auditConfigPaths.signaturePolicy),
    ]);

    validateFamilyCatalog(familyCatalog);
    validateOrderingPolicy(orderingPolicy);
    validatePartitionPolicy(partitionPolicy);
    validateSignaturePolicy(signaturePolicy);

    const familiesByRef = new Map<AuditFamilyRef, AuditEventFamilyCatalogRow>();
    const eventFamiliesByType = new Map<string, AuditEventFamilyCatalogRow>();
    for (const row of familyCatalog.family_rows) {
      familiesByRef.set(row.family_ref, row);
      for (const eventType of row.event_types) {
        eventFamiliesByType.set(eventType, row);
      }
    }

    return {
      eventFamiliesByType,
      familiesByRef,
      familyCatalog,
      orderingPolicy,
      partitionPolicy,
      partitionsByRef: new Map(
        partitionPolicy.stream_partition_rows.map((row) => [row.partition_ref, row] as const),
      ),
      signaturePolicy,
      signatureRowsByFamily: new Map(
        signaturePolicy.signature_rows.map((row) => [row.family_ref, row] as const),
      ),
    };
  })();

  return cachedBundle;
}
