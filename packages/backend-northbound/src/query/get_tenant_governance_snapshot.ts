import type { TenantGovernanceSnapshot } from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import { buildGovernanceInteractionLayer } from "../../../backend-governance/src/projectors/build_governance_interaction_layer.ts";
import {
  governanceRefOrUndefined,
  normalizeGovernanceOverviewFilters,
  type GovernanceReadQueryInput,
} from "../services/normalize_governance_query_filters.ts";

export type TenantGovernanceSnapshotRecord = TenantGovernanceSnapshot;

export type StoredTenantGovernanceSnapshotRecord = {
  persisted_at: string;
  snapshot: TenantGovernanceSnapshotRecord;
  source_refs: string[];
};

export type TenantGovernanceSnapshotRepositoryLike = {
  listSnapshotsByTenantId: (
    tenantId: string,
  ) =>
    | Promise<StoredTenantGovernanceSnapshotRecord[]>
    | StoredTenantGovernanceSnapshotRecord[];
};

export type PersistTenantGovernanceSnapshotInput = {
  persistedAt?: string;
  snapshot: TenantGovernanceSnapshotRecord;
  sourceRefs?: readonly string[];
};

export type TenantGovernanceSnapshotPublicationErrorCode =
  | "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED"
  | "TENANT_GOVERNANCE_SNAPSHOT_INVALID";

export class TenantGovernanceSnapshotPublicationError extends Error {
  readonly code: TenantGovernanceSnapshotPublicationErrorCode;
  readonly reasonCodes: string[];

  constructor(
    code: TenantGovernanceSnapshotPublicationErrorCode,
    detail: string,
    reasonCodes: readonly string[],
  ) {
    super(`${code}: ${detail}`);
    this.name = "TenantGovernanceSnapshotPublicationError";
    this.code = code;
    this.reasonCodes = [...reasonCodes];
  }
}

function fail(
  code: TenantGovernanceSnapshotPublicationErrorCode,
  detail: string,
  reasonCodes: readonly string[],
): never {
  throw new TenantGovernanceSnapshotPublicationError(code, detail, reasonCodes);
}

function assertNonEmptyString(
  label: string,
  value: unknown,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
      `${label} must remain a non-empty string`,
      ["TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED"],
    );
  }
}

function assertStringArray(label: string, values: readonly unknown[], minItems = 0) {
  if (values.length < minItems) {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
      `${label} must include at least ${minItems} item(s)`,
      ["TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED"],
    );
  }
  for (const value of values) {
    assertNonEmptyString(label, value);
  }
}

const attentionFamilyToPrimaryQueueCode = {
  AUDIT_HOTSPOT: "AUDIT_HOTSPOTS",
  AUTHORITY_LINK_RISK: "AUTHORITY_LINK_RISKS",
  CONFIGURATION_DRIFT: "CONFIGURATION_DRIFT",
  PENDING_APPROVALS: "PENDING_APPROVALS",
  RETENTION_EXCEPTION: "RETENTION_EXCEPTIONS",
} as const satisfies Record<
  Exclude<TenantGovernanceSnapshot["attention_summary"]["attention_family"], "CALM">,
  TenantGovernanceSnapshot["primary_queue_code"]
>;

const primaryQueueWorklistFields = {
  AUDIT_HOTSPOTS: "audit_hotspot_worklist_ref",
  AUTHORITY_LINK_RISKS: "authority_link_risk_worklist_ref",
  CONFIGURATION_DRIFT: "configuration_drift_worklist_ref",
  PENDING_APPROVALS: "pending_approval_worklist_ref",
  RETENTION_EXCEPTIONS: "retention_exception_worklist_ref",
} as const satisfies Record<
  TenantGovernanceSnapshot["primary_queue_code"],
  keyof TenantGovernanceSnapshot
>;

const overviewFilterOrder = [
  "environment_ref",
  "client_refs",
  "principal_classes",
  "risk_families",
  "change_states",
] as const;
const overviewFilterChipLabel = {
  change_states: "change_state",
  client_refs: "client",
  principal_classes: "principal_class",
  risk_families: "risk_family",
} as const;

export function governanceOverviewFilterChipRefs(
  filters: TenantGovernanceSnapshot["active_filters"],
) {
  return overviewFilterOrder.flatMap((dimension) => {
    if (dimension === "environment_ref") {
      return [`environment:${filters.environment_ref}`];
    }
    return filters[dimension].map(
      (value) => `${overviewFilterChipLabel[dimension]}:${value}`,
    );
  });
}

export function validateTenantGovernanceSnapshotPublication(
  snapshot: TenantGovernanceSnapshotRecord,
) {
  assertNonEmptyString("snapshot_id", snapshot.snapshot_id);
  assertNonEmptyString("tenant_id", snapshot.tenant_id);
  assertNonEmptyString("object_anchor_ref", snapshot.object_anchor_ref);
  assertNonEmptyString("environment_ref", snapshot.environment_ref);
  assertNonEmptyString("policy_snapshot_hash", snapshot.policy_snapshot_hash);
  assertNonEmptyString("dominant_question", snapshot.dominant_question);
  assertNonEmptyString("primary_worklist_ref", snapshot.primary_worklist_ref);
  if (snapshot.artifact_type !== "TenantGovernanceSnapshot") {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
      "artifact_type must be TenantGovernanceSnapshot",
      ["TENANT_GOVERNANCE_SNAPSHOT_ARTIFACT_TYPE_INVALID"],
    );
  }
  if (snapshot.shell_family !== "GOVERNANCE_DENSITY_SHELL") {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
      "shell_family must remain GOVERNANCE_DENSITY_SHELL",
      ["TENANT_GOVERNANCE_SNAPSHOT_SHELL_FAMILY_INVALID"],
    );
  }
  if (
    snapshot.cache_isolation_contract.cache_scope_class !==
    "TENANT_GOVERNANCE_SNAPSHOT"
  ) {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_INVALID",
      "cache isolation contract must keep TENANT_GOVERNANCE_SNAPSHOT scope",
      ["TENANT_GOVERNANCE_SNAPSHOT_CACHE_SCOPE_INVALID"],
    );
  }
  if (snapshot.interaction_layer.density_profile !== "GOVERNANCE_DENSITY_PROFILE_V1") {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_INVALID",
      "interaction_layer must keep the governance density profile",
      ["TENANT_GOVERNANCE_SNAPSHOT_INTERACTION_LAYER_INVALID"],
    );
  }
  if (snapshot.attention_summary.attention_family !== "CALM") {
    const expectedQueue =
      attentionFamilyToPrimaryQueueCode[snapshot.attention_summary.attention_family];
    if (snapshot.primary_queue_code !== expectedQueue) {
      fail(
        "TENANT_GOVERNANCE_SNAPSHOT_INVALID",
        "attention_summary.attention_family must agree with primary_queue_code",
        ["TENANT_GOVERNANCE_ATTENTION_PRIMARY_QUEUE_MISMATCH"],
      );
    }
    if (snapshot.attention_summary.primary_worklist_ref !== snapshot.primary_worklist_ref) {
      fail(
        "TENANT_GOVERNANCE_SNAPSHOT_INVALID",
        "attention_summary.primary_worklist_ref must match primary_worklist_ref",
        ["TENANT_GOVERNANCE_ATTENTION_WORKLIST_MISMATCH"],
      );
    }
  }

  const primaryWorklistField = primaryQueueWorklistFields[snapshot.primary_queue_code];
  if (snapshot.primary_worklist_ref !== snapshot[primaryWorklistField]) {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_INVALID",
      "primary_worklist_ref must match the promoted queue worklist ref",
      ["TENANT_GOVERNANCE_PRIMARY_WORKLIST_MISMATCH"],
    );
  }

  if (snapshot.risk_ledger_entries.length !== 5) {
    fail(
      "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
      "risk_ledger_entries must carry exactly the five governance families",
      ["TENANT_GOVERNANCE_RISK_LEDGER_INCOMPLETE"],
    );
  }
  const ledgerQueues = new Set(snapshot.risk_ledger_entries.map((entry) => entry.queue_code));
  for (const queueCode of Object.keys(primaryQueueWorklistFields)) {
    if (!ledgerQueues.has(queueCode as TenantGovernanceSnapshot["primary_queue_code"])) {
      fail(
        "TENANT_GOVERNANCE_SNAPSHOT_FIELD_REQUIRED",
        `risk_ledger_entries missing ${queueCode}`,
        ["TENANT_GOVERNANCE_RISK_LEDGER_INCOMPLETE"],
      );
    }
  }
  for (const entry of snapshot.risk_ledger_entries) {
    assertNonEmptyString("risk_ledger_entries[].worklist_ref", entry.worklist_ref);
    if (entry.open_count > 0) {
      assertNonEmptyString(
        "risk_ledger_entries[].affected_scope_label",
        entry.affected_scope_label,
      );
      assertNonEmptyString("risk_ledger_entries[].next_action_label", entry.next_action_label);
    }
  }
  if (snapshot.focus_anchor_ref !== null) {
    assertNonEmptyString("focus_anchor_ref", snapshot.focus_anchor_ref);
    assertNonEmptyString(
      "selected_canvas_object_ref",
      snapshot.selected_canvas_object_ref,
    );
  }
  if (snapshot.support_region_state.mode !== "NONE") {
    assertNonEmptyString(
      "support_region_state.selected_object_ref",
      snapshot.support_region_state.selected_object_ref,
    );
    assertNonEmptyString("support_region_state.reason_code", snapshot.support_region_state.reason_code);
    assertNonEmptyString(
      "selected_canvas_object_ref",
      snapshot.selected_canvas_object_ref,
    );
  }
  assertStringArray("authority_link_risk_refs", snapshot.authority_link_risk_refs);
  assertStringArray("retention_exception_refs", snapshot.retention_exception_refs);
  assertStringArray("audit_hotspot_refs", snapshot.audit_hotspot_refs);
  assertStringArray("recent_change_refs", snapshot.recent_change_refs);
  assertStringArray("pending_change_refs", snapshot.pending_change_refs);
  return structuredClone(snapshot);
}

export class TenantGovernanceSnapshotRepository
  implements TenantGovernanceSnapshotRepositoryLike
{
  readonly #snapshotsByTenantId = new Map<string, StoredTenantGovernanceSnapshotRecord[]>();

  async persistSnapshot(input: PersistTenantGovernanceSnapshotInput) {
    const snapshot = validateTenantGovernanceSnapshotPublication(input.snapshot);
    const stored = {
      persisted_at: input.persistedAt ?? snapshot.updated_at,
      snapshot,
      source_refs: [...(input.sourceRefs ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
    } satisfies StoredTenantGovernanceSnapshotRecord;
    const existing = this.#snapshotsByTenantId.get(snapshot.tenant_id) ?? [];
    this.#snapshotsByTenantId.set(snapshot.tenant_id, [
      ...existing,
      structuredClone(stored),
    ]);
    return structuredClone(stored);
  }

  async listSnapshotsByTenantId(tenantId: string) {
    return [...(this.#snapshotsByTenantId.get(tenantId) ?? [])]
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => structuredClone(record));
  }
}

function applyOverviewQueryContinuity(input: {
  query?: GovernanceReadQueryInput;
  snapshot: TenantGovernanceSnapshotRecord;
}) {
  const snapshot = structuredClone(input.snapshot);
  snapshot.active_filters = normalizeGovernanceOverviewFilters(
    input.query,
    snapshot.active_filters,
  );
  snapshot.interaction_layer = buildGovernanceInteractionLayer({
    activeFilters: snapshot.active_filters,
    routeFamily: "tenant_governance_snapshot",
  });

  const selectedCanvasObjectRef = governanceRefOrUndefined(input.query, [
    "selected_canvas_object_ref",
    "selectedCanvasObjectRef",
  ]);
  if (selectedCanvasObjectRef !== undefined) {
    snapshot.selected_canvas_object_ref = selectedCanvasObjectRef;
  }
  const focusAnchorRef = governanceRefOrUndefined(input.query, [
    "focus_anchor_ref",
    "focusAnchorRef",
  ]);
  if (focusAnchorRef !== undefined) {
    snapshot.focus_anchor_ref = focusAnchorRef;
  }
  if (snapshot.focus_anchor_ref !== null && snapshot.selected_canvas_object_ref === null) {
    snapshot.selected_canvas_object_ref = snapshot.focus_anchor_ref;
  }
  return validateTenantGovernanceSnapshotPublication(snapshot);
}

export async function getTenantGovernanceSnapshot(input: {
  query?: GovernanceReadQueryInput;
  tenantGovernanceSnapshotRepository: TenantGovernanceSnapshotRepositoryLike;
  tenantId: string;
}) {
  const snapshots = await input.tenantGovernanceSnapshotRepository.listSnapshotsByTenantId(
    input.tenantId,
  );
  const current = snapshots
    .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
    .at(-1);
  if (!current) {
    return null;
  }
  return {
    ...current,
    snapshot: applyOverviewQueryContinuity({
      query: input.query,
      snapshot: current.snapshot,
    }),
  } satisfies StoredTenantGovernanceSnapshotRecord;
}
