import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  cloneRecord,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  refFromId,
  requireString,
} from "./provenance_common.ts";

export const ENTITY_NODE_FAMILIES = [
  "EN_SOURCE_RECORD",
  "EN_EVIDENCE_ITEM",
  "EN_CANDIDATE_FACT",
  "EN_CANONICAL_FACT",
  "EN_DERIVED_VALUE",
  "EN_SNAPSHOT",
  "EN_CONFIG_FREEZE",
  "EN_RUN_MANIFEST",
  "EN_COMPUTE_RESULT",
  "EN_PARITY_RESULT",
  "EN_GATE_DECISION",
  "EN_TRUST_SUMMARY",
  "EN_EVIDENCE_GRAPH",
  "EN_TWIN_VIEW",
  "EN_WORKFLOW_ITEM",
  "EN_FILING_PACKET",
  "EN_FILING_FIELD",
  "EN_SUBMISSION_RECORD",
  "EN_PROOF_BUNDLE",
  "EN_DRIFT_RECORD",
  "EN_ERROR_RECORD",
  "EN_COMPENSATION_RECORD",
  "EN_AUDIT_EVENT",
  "EN_OVERRIDE",
  "EN_RETENTION_ACTION",
  "EN_AUTHORITY_RESPONSE",
] as const;

export const ACTIVITY_NODE_FAMILIES = [
  "AC_COLLECT_SOURCE_DATA",
  "AC_NORMALIZE",
  "AC_VALIDATE",
  "AC_PROMOTE_FACT",
  "AC_AGGREGATE",
  "AC_ADJUST",
  "AC_COMPUTE",
  "AC_COMPARE_PARITY",
  "AC_EVALUATE_GATE",
  "AC_SYNTHESIZE_TRUST",
  "AC_BUILD_GRAPH",
  "AC_VALIDATE_GRAPH",
  "AC_RECONSTRUCT_PROOF",
  "AC_RENDER_EXPLANATION",
  "AC_BUILD_TWIN",
  "AC_RESOLVE_CONTINUATION",
  "AC_PREPARE_FILING",
  "AC_SUBMIT_TO_AUTHORITY",
  "AC_RECONCILE_AUTHORITY_STATE",
  "AC_DETECT_DRIFT",
  "AC_EVALUATE_AMENDMENT",
  "AC_RECORD_AUDIT_EVENT",
  "AC_HANDLE_ERROR",
  "AC_APPLY_COMPENSATION",
  "AC_APPLY_OVERRIDE",
  "AC_APPLY_RETENTION",
  "AC_EXECUTE_ERASURE",
] as const;

export const AGENT_NODE_FAMILIES = [
  "AG_HUMAN_PRINCIPAL",
  "AG_SERVICE_PRINCIPAL",
  "AG_TENANT",
  "AG_REPORTING_SUBJECT",
  "AG_AUTHORITY_SYSTEM",
  "AG_EXTERNAL_PROVIDER",
] as const;

export type ProvenanceNodeClass = "ENTITY" | "ACTIVITY" | "AGENT";
export type ProvenanceEntityNodeFamily = (typeof ENTITY_NODE_FAMILIES)[number];
export type ProvenanceActivityNodeFamily = (typeof ACTIVITY_NODE_FAMILIES)[number];
export type ProvenanceAgentNodeFamily = (typeof AGENT_NODE_FAMILIES)[number];
export type ProvenanceNodeFamily =
  | ProvenanceEntityNodeFamily
  | ProvenanceActivityNodeFamily
  | ProvenanceAgentNodeFamily;
export type ProvenanceTombstoneState =
  | "ACTIVE"
  | "RETENTION_LIMITED"
  | "EXPIRED_PLACEHOLDER"
  | "ERASED_PLACEHOLDER"
  | "SUPERSEDED";

export type ProvenanceNodeRecord = {
  node_id: string;
  graph_id: string;
  graph_address: string;
  manifest_id: string;
  tenant_id: string;
  client_id: string | null;
  business_partition: string | null;
  period_scope: string | null;
  node_class: ProvenanceNodeClass;
  node_family: ProvenanceNodeFamily;
  object_ref: string;
  created_at: string;
  tombstone_state: ProvenanceTombstoneState;
  limitation_codes: string[];
};

export type ProvenanceNodeBuildInput = Partial<ProvenanceNodeRecord> & {
  graph_id: string;
  graph_address: string;
  manifest_id: string;
  tenant_id: string;
  node_family: ProvenanceNodeFamily;
  object_ref: string;
  created_at?: string;
};

const NODE_CLASS_BY_FAMILY = new Map<ProvenanceNodeFamily, ProvenanceNodeClass>([
  ...ENTITY_NODE_FAMILIES.map((family) => [family, "ENTITY"] as const),
  ...ACTIVITY_NODE_FAMILIES.map((family) => [family, "ACTIVITY"] as const),
  ...AGENT_NODE_FAMILIES.map((family) => [family, "AGENT"] as const),
]);

export function nodeClassForFamily(nodeFamily: ProvenanceNodeFamily): ProvenanceNodeClass {
  const nodeClass = NODE_CLASS_BY_FAMILY.get(nodeFamily);
  if (!nodeClass) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `unsupported provenance node family ${String(nodeFamily)}`,
    );
  }
  return nodeClass;
}

export function deriveProvenanceNodeId(input: {
  graph_id: string;
  manifest_id: string;
  node_family: ProvenanceNodeFamily;
  object_ref: string;
  business_partition?: string | null;
  period_scope?: string | null;
}) {
  return `provenance-node.${stableJsonHash({
    graph_id: requireString("graph_id", input.graph_id),
    manifest_id: requireString("manifest_id", input.manifest_id),
    node_family: input.node_family,
    object_ref: requireString("object_ref", input.object_ref),
    business_partition: normalizeNullableString("business_partition", input.business_partition),
    period_scope: normalizeNullableString("period_scope", input.period_scope),
  })}`;
}

export function provenanceNodeRef(node: Pick<ProvenanceNodeRecord, "node_id"> | string) {
  return refFromId("provenance-node", typeof node === "string" ? node : node.node_id);
}

function assertNodeRetentionPosture(record: ProvenanceNodeRecord) {
  if (record.tombstone_state === "ACTIVE" && record.limitation_codes.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "ACTIVE provenance nodes must not carry limitation_codes",
    );
  }
  if (
    ["RETENTION_LIMITED", "EXPIRED_PLACEHOLDER", "ERASED_PLACEHOLDER"].includes(
      record.tombstone_state,
    ) &&
    record.limitation_codes.length === 0
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `${record.tombstone_state} provenance nodes must carry limitation_codes`,
    );
  }
}

export function normalizeProvenanceNodeRecord(input: ProvenanceNodeRecord): ProvenanceNodeRecord {
  const nodeFamily = requireString("node_family", input.node_family) as ProvenanceNodeFamily;
  const expectedClass = nodeClassForFamily(nodeFamily);
  const nodeClass = (input.node_class ?? expectedClass) as ProvenanceNodeClass;
  if (nodeClass !== expectedClass) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `node_class ${nodeClass} does not match node_family ${nodeFamily}`,
    );
  }

  const record: ProvenanceNodeRecord = {
    node_id: requireString("node_id", input.node_id),
    graph_id: requireString("graph_id", input.graph_id),
    graph_address: requireString("graph_address", input.graph_address),
    manifest_id: requireString("manifest_id", input.manifest_id),
    tenant_id: requireString("tenant_id", input.tenant_id),
    client_id: normalizeNullableString("client_id", input.client_id),
    business_partition: normalizeNullableString("business_partition", input.business_partition),
    period_scope: normalizeNullableString("period_scope", input.period_scope),
    node_class: nodeClass,
    node_family: nodeFamily,
    object_ref: requireString("object_ref", input.object_ref),
    created_at: normalizeTimestamp("created_at", input.created_at),
    tombstone_state: (input.tombstone_state ?? "ACTIVE") as ProvenanceTombstoneState,
    limitation_codes: normalizeSortedStringSet("limitation_codes", input.limitation_codes ?? []),
  };

  if (
    !["ACTIVE", "RETENTION_LIMITED", "EXPIRED_PLACEHOLDER", "ERASED_PLACEHOLDER", "SUPERSEDED"].includes(
      record.tombstone_state,
    )
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_FIELD_INVALID",
      `unsupported tombstone_state ${String(record.tombstone_state)}`,
    );
  }
  assertNodeRetentionPosture(record);
  return record;
}

export function buildProvenanceNodeRecord(input: ProvenanceNodeBuildInput): ProvenanceNodeRecord {
  const nodeFamily = requireString("node_family", input.node_family) as ProvenanceNodeFamily;
  const draft = {
    ...input,
    node_id:
      input.node_id ??
      deriveProvenanceNodeId({
        graph_id: input.graph_id,
        manifest_id: input.manifest_id,
        node_family: nodeFamily,
        object_ref: input.object_ref,
        business_partition: input.business_partition ?? null,
        period_scope: input.period_scope ?? null,
      }),
    node_class: input.node_class ?? nodeClassForFamily(nodeFamily),
    node_family: nodeFamily,
    client_id: input.client_id ?? null,
    business_partition: input.business_partition ?? null,
    period_scope: input.period_scope ?? null,
    created_at: input.created_at ?? "2026-04-28T00:00:00Z",
    tombstone_state: input.tombstone_state ?? "ACTIVE",
    limitation_codes: input.limitation_codes ?? [],
  } satisfies ProvenanceNodeRecord;
  return normalizeProvenanceNodeRecord(draft);
}

export function deriveProvenanceNodeContentHash(record: ProvenanceNodeRecord) {
  return stableJsonHash(normalizeProvenanceNodeRecord(record));
}

export function cloneProvenanceNodeRecord(record: ProvenanceNodeRecord) {
  return cloneRecord(normalizeProvenanceNodeRecord(record));
}
