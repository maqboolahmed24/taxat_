import { LateDataIndicatorSetSchemaLineage } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionRuntimeScopes,
  normalizeCollectionString,
} from "./collection_control_common.ts";
import {
  cloneLateDataIndicatorRecord,
  lateDataIndicatorRef,
  normalizeLateDataIndicatorRecord,
  type LateDataIndicatorRecord,
  type LateDataRuntimeScopeRefs,
} from "./late_data_indicator.ts";

export type LateDataIndicatorSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "LateDataIndicatorSet";
  collection_boundary_ref: string;
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  items: LateDataIndicatorRecord[];
  manifest_id: string;
  produced_at: string;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  set_hash: string;
  set_id: string;
  source_plan_ref: string;
};

export type LateDataIndicatorSetBase = Omit<
  LateDataIndicatorSetRecord,
  "artifact_contract_hash" | "contract" | "item_identity_hash" | "set_hash" | "set_id"
>;

export type LateDataIndicatorSetModelErrorCode =
  | "LATE_DATA_INDICATOR_SET_ARTIFACT_TYPE_INVALID"
  | "LATE_DATA_INDICATOR_SET_HASH_MISMATCH"
  | "LATE_DATA_INDICATOR_SET_ITEM_MISMATCH";

export class LateDataIndicatorSetModelError extends Error {
  readonly code: LateDataIndicatorSetModelErrorCode;

  constructor(code: LateDataIndicatorSetModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataIndicatorSetModelError";
    this.code = code;
  }
}

export function lateDataIndicatorSetRef(record: Pick<LateDataIndicatorSetRecord, "set_id">) {
  return `late-data-indicator-set://${record.set_id}`;
}

export function deriveLateDataIndicatorSetItemIdentityHash(
  indicators: readonly LateDataIndicatorRecord[],
) {
  const itemRefs = indicators
    .map((indicator) => lateDataIndicatorRef(normalizeLateDataIndicatorRecord(indicator)))
    .sort();
  return `late-data-indicator-set-item-identity-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_SET_ITEM_IDENTITY",
    payload: itemRefs,
  })}`;
}

export function deriveLateDataIndicatorSetId(input: {
  collection_boundary_ref: string;
  item_identity_hash: string;
  manifest_id: string;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  source_plan_ref: string;
}) {
  return `late-data-indicator-set.${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_SET_ID",
    payload: {
      collection_boundary_ref: input.collection_boundary_ref,
      item_identity_hash: input.item_identity_hash,
      manifest_id: input.manifest_id,
      runtime_scope_refs: input.runtime_scope_refs,
      source_plan_ref: input.source_plan_ref,
    },
  })}`;
}

export function deriveLateDataIndicatorSetContentHash(
  record: Omit<LateDataIndicatorSetRecord, "contract">,
) {
  return `late-data-indicator-set-content-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_SET_CONTENT",
    payload: record,
  })}`;
}

export function deriveLateDataIndicatorSetHash(
  record: Omit<LateDataIndicatorSetRecord, "contract" | "set_hash">,
) {
  return `late-data-indicator-set-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_SET",
    payload: record,
  })}`;
}

export function deriveLateDataIndicatorSetArtifactContractHash(
  contract: SchemaBundleArtifactContract,
) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_SET_ARTIFACT_CONTRACT",
    payload: contract,
  })}`;
}

export function buildLateDataIndicatorSetContract(input: {
  indicator_set_content_hash: string;
  schema_bundle_hash?: string;
  set_id: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.indicator_set_content_hash,
    artifact_id: lateDataIndicatorSetRef({ set_id: input.set_id }),
    artifact_type: "LateDataIndicatorSet",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: LateDataIndicatorSetSchemaLineage.schemaId,
    schema_source_hash: LateDataIndicatorSetSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0117",
  });
}

function normalizeLateDataIndicatorSetBase(
  input: LateDataIndicatorSetBase,
): LateDataIndicatorSetBase {
  if (input.artifact_type !== "LateDataIndicatorSet") {
    throw new LateDataIndicatorSetModelError(
      "LATE_DATA_INDICATOR_SET_ARTIFACT_TYPE_INVALID",
      "late-data indicator sets must carry artifact_type LateDataIndicatorSet",
    );
  }
  const manifestId = normalizeCollectionString(
    "late_data_indicator_set.manifest_id",
    input.manifest_id,
  );
  const collectionBoundaryRef = normalizeCollectionString(
    "late_data_indicator_set.collection_boundary_ref",
    input.collection_boundary_ref,
  );
  const sourcePlanRef = normalizeCollectionString(
    "late_data_indicator_set.source_plan_ref",
    input.source_plan_ref,
  );
  const items = input.items
    .map((item) => normalizeLateDataIndicatorRecord(item))
    .sort((left, right) => left.indicator_id.localeCompare(right.indicator_id));
  const seen = new Set<string>();
  for (const item of items) {
    if (
      item.manifest_id !== manifestId ||
      item.collection_boundary_ref !== collectionBoundaryRef ||
      item.source_plan_ref !== sourcePlanRef
    ) {
      throw new LateDataIndicatorSetModelError(
        "LATE_DATA_INDICATOR_SET_ITEM_MISMATCH",
        "indicator-set items must match manifest, collection boundary, and source plan",
      );
    }
    if (seen.has(item.indicator_id)) {
      throw new LateDataIndicatorSetModelError(
        "LATE_DATA_INDICATOR_SET_ITEM_MISMATCH",
        `duplicate late-data indicator ${item.indicator_id}`,
      );
    }
    seen.add(item.indicator_id);
  }

  return {
    artifact_type: "LateDataIndicatorSet",
    collection_boundary_ref: collectionBoundaryRef,
    items: items.map((item) => cloneLateDataIndicatorRecord(item)),
    manifest_id: manifestId,
    produced_at: normalizeUtcInstantString(input.produced_at),
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "late_data_indicator_set.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    source_plan_ref: sourcePlanRef,
  };
}

export function normalizeLateDataIndicatorSetRecord(
  input: LateDataIndicatorSetRecord,
): LateDataIndicatorSetRecord {
  const base = normalizeLateDataIndicatorSetBase(input);
  const itemIdentityHash = deriveLateDataIndicatorSetItemIdentityHash(base.items);
  if (input.item_identity_hash !== itemIdentityHash) {
    throw new LateDataIndicatorSetModelError(
      "LATE_DATA_INDICATOR_SET_HASH_MISMATCH",
      "item_identity_hash must match the ordered indicator population",
    );
  }
  const setId = normalizeCollectionString("late_data_indicator_set.set_id", input.set_id);
  const artifactContractHash = normalizeCollectionString(
    "late_data_indicator_set.artifact_contract_hash",
    input.artifact_contract_hash,
  );
  const expectedSetHash = deriveLateDataIndicatorSetHash({
    ...base,
    artifact_contract_hash: artifactContractHash,
    item_identity_hash: itemIdentityHash,
    set_id: setId,
  });
  if (input.set_hash !== expectedSetHash) {
    throw new LateDataIndicatorSetModelError(
      "LATE_DATA_INDICATOR_SET_HASH_MISMATCH",
      "set_hash must match the canonical late-data indicator-set payload",
    );
  }
  return {
    ...base,
    artifact_contract_hash: artifactContractHash,
    contract: structuredClone(input.contract),
    item_identity_hash: itemIdentityHash,
    set_hash: expectedSetHash,
    set_id: setId,
  };
}

export function buildLateDataIndicatorSetRecord(input: {
  collection_boundary_ref: string;
  items: readonly LateDataIndicatorRecord[];
  manifest_id: string;
  produced_at: string;
  runtime_scope_refs: readonly string[];
  schema_bundle_hash?: string;
  source_plan_ref: string;
  writer_build_id?: string;
}): LateDataIndicatorSetRecord {
  const base = normalizeLateDataIndicatorSetBase({
    artifact_type: "LateDataIndicatorSet",
    collection_boundary_ref: input.collection_boundary_ref,
    items: [...input.items],
    manifest_id: input.manifest_id,
    produced_at: input.produced_at,
    runtime_scope_refs: input.runtime_scope_refs as LateDataRuntimeScopeRefs,
    source_plan_ref: input.source_plan_ref,
  });
  const itemIdentityHash = deriveLateDataIndicatorSetItemIdentityHash(base.items);
  const setId = deriveLateDataIndicatorSetId({
    collection_boundary_ref: base.collection_boundary_ref,
    item_identity_hash: itemIdentityHash,
    manifest_id: base.manifest_id,
    runtime_scope_refs: base.runtime_scope_refs,
    source_plan_ref: base.source_plan_ref,
  });
  const provisionalContentHash = deriveLateDataIndicatorSetContentHash({
    ...base,
    artifact_contract_hash: "artifact-contract-hash://pending",
    item_identity_hash: itemIdentityHash,
    set_hash: "late-data-indicator-set-hash://pending",
    set_id: setId,
  });
  const contract = buildLateDataIndicatorSetContract({
    indicator_set_content_hash: provisionalContentHash,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    set_id: setId,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const artifactContractHash = deriveLateDataIndicatorSetArtifactContractHash(contract);
  const setHash = deriveLateDataIndicatorSetHash({
    ...base,
    artifact_contract_hash: artifactContractHash,
    item_identity_hash: itemIdentityHash,
    set_id: setId,
  });
  return normalizeLateDataIndicatorSetRecord({
    ...base,
    artifact_contract_hash: artifactContractHash,
    contract,
    item_identity_hash: itemIdentityHash,
    set_hash: setHash,
    set_id: setId,
  });
}

export function cloneLateDataIndicatorSetRecord(record: LateDataIndicatorSetRecord) {
  return structuredClone(record);
}
