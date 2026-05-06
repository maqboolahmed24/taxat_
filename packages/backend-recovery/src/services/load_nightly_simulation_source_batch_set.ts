import {
  nightlyBatchRunRef,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  deriveNightlyPortfolioSimulationSourceBatchSetHash,
  uniqueSortedNightlyPortfolioSimulationStrings,
} from "../models/nightly_portfolio_simulation_basis_contract.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";

export type NightlySimulationSourceBatchRecoveryState =
  | "SINGLE_BATCH"
  | "SUCCESSOR_RECOVERY_CHAIN";

export type NightlySimulationSourceBatchSet = {
  tenant_id: string;
  nightly_window_key: string;
  source_batch_run_refs: string[];
  source_batch_set_hash: string;
  source_batch_count: number;
  source_batch_window_state: "SINGLE_NIGHTLY_WINDOW";
  source_batch_recovery_state: NightlySimulationSourceBatchRecoveryState;
  source_batches: StoredNightlyBatchRunRecord[];
  source_batches_in_chain_order: StoredNightlyBatchRunRecord[];
  effective_batch: NightlyBatchRunRecord;
  selection_entries: NightlyBatchRunSelectionEntryRecord[];
  covered_selection_entry_refs: string[];
  covered_selection_entry_count: number;
};

export type LoadNightlySimulationSourceBatchSetInput = {
  repository: NightlyBatchRunRepository;
  tenant_id: string;
  nightly_window_key: string;
  source_batch_run_refs?: readonly string[];
};

function cloneStored(record: StoredNightlyBatchRunRecord) {
  return structuredClone(record);
}

function assertNonEmptyString(label: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

async function loadStoredByRefOrId(input: {
  repository: NightlyBatchRunRepository;
  source_batch_run_ref_or_id: string;
}) {
  const refOrId = input.source_batch_run_ref_or_id;
  if (refOrId.startsWith("nightly-batch-run://")) {
    const stored = await input.repository.findNightlyBatchRunByRef(refOrId);
    if (!stored) {
      throw new Error(`source batch ref ${refOrId} does not exist`);
    }
    return stored;
  }
  return input.repository.getNightlyBatchRunById(refOrId);
}

function assertSameWindow(input: {
  tenant_id: string;
  nightly_window_key: string;
  records: readonly StoredNightlyBatchRunRecord[];
}) {
  for (const record of input.records) {
    if (
      record.tenant_id !== input.tenant_id ||
      record.nightly_window_key !== input.nightly_window_key ||
      record.nightly_batch_run.tenant_id !== input.tenant_id ||
      record.nightly_batch_run.nightly_window_key !== input.nightly_window_key
    ) {
      throw new Error(
        `source batch ${record.batch_run_id} is outside tenant/window ${input.tenant_id}/${input.nightly_window_key}`,
      );
    }
  }
}

function assertSameFrozenBaseline(records: readonly StoredNightlyBatchRunRecord[]) {
  const [first] = records;
  if (!first) {
    throw new Error("source batch set must not be empty");
  }
  for (const record of records.slice(1)) {
    const batch = record.nightly_batch_run;
    const baseline = first.nightly_batch_run;
    for (const field of [
      "selection_universe_hash",
      "selection_universe_count",
      "policy_snapshot_hash",
      "autopilot_policy_hash",
      "release_verification_manifest_ref",
      "schema_bundle_hash",
      "code_build_id",
      "environment_ref",
    ] as const) {
      if (batch[field] !== baseline[field]) {
        throw new Error(`source batch set mixes baseline field ${field}`);
      }
    }
  }
}

function sortChain(records: readonly StoredNightlyBatchRunRecord[]) {
  if (records.length === 1) {
    return [cloneStored(records[0]!)];
  }
  const byRef = new Map(records.map((record) => [record.nightly_batch_run_ref, record]));
  const roots = records.filter((record) => {
    const predecessorRef = record.nightly_batch_run.reclaimed_predecessor_batch_run_ref;
    return predecessorRef === null || !byRef.has(predecessorRef);
  });
  if (roots.length !== 1) {
    throw new Error("successor source batch set must contain one root batch");
  }
  const ordered: StoredNightlyBatchRunRecord[] = [];
  const seen = new Set<string>();
  let current: StoredNightlyBatchRunRecord | undefined = roots[0];
  while (current !== undefined) {
    if (seen.has(current.nightly_batch_run_ref)) {
      throw new Error("successor source batch set contains a cycle");
    }
    ordered.push(cloneStored(current));
    seen.add(current.nightly_batch_run_ref);
    const nextRef = current.nightly_batch_run.successor_batch_run_ref;
    if (nextRef === null || !byRef.has(nextRef)) {
      current = undefined;
      continue;
    }
    const next = byRef.get(nextRef)!;
    if (next.nightly_batch_run.reclaimed_predecessor_batch_run_ref !== current.nightly_batch_run_ref) {
      throw new Error("successor source batch set has broken predecessor linkage");
    }
    current = next;
  }
  if (ordered.length !== records.length) {
    throw new Error("source batch refs must form one complete successor chain");
  }
  for (const record of ordered.slice(1)) {
    if (record.nightly_batch_run.trigger_class !== "RECOVERY_RECLAIM_WINDOW") {
      throw new Error("multi-batch source set may include only recovery successors after the root");
    }
  }
  return ordered;
}

function latestSelectionEntryProjection(
  recordsInChainOrder: readonly StoredNightlyBatchRunRecord[],
) {
  const byEntryRef = new Map<string, NightlyBatchRunSelectionEntryRecord>();
  for (const record of recordsInChainOrder) {
    for (const entry of record.nightly_batch_run.selection_entries) {
      byEntryRef.set(entry.entry_id, structuredClone(entry));
    }
  }
  return [...byEntryRef.values()].sort((left, right) =>
    left.entry_id.localeCompare(right.entry_id),
  );
}

function assertEntriesReplayable(entries: readonly NightlyBatchRunSelectionEntryRecord[]) {
  if (entries.length === 0) {
    throw new Error("nightly simulation requires at least one persisted selection entry");
  }
  for (const entry of entries) {
    assertNonEmptyString("selection_entries[].entry_id", entry.entry_id);
    assertNonEmptyString("selection_entries[].candidate_identity_hash", entry.candidate_identity_hash);
    assertNonEmptyString("selection_entries[].selection_basis_hash", entry.selection_basis_hash);
    if (entry.outcome_bucket === null) {
      throw new Error(`selection entry ${entry.entry_id} is missing persisted outcome_bucket`);
    }
  }
}

export async function loadNightlySimulationSourceBatchSet(
  input: LoadNightlySimulationSourceBatchSetInput,
): Promise<NightlySimulationSourceBatchSet> {
  assertNonEmptyString("tenant_id", input.tenant_id);
  assertNonEmptyString("nightly_window_key", input.nightly_window_key);
  const loaded = input.source_batch_run_refs
    ? await Promise.all(
        uniqueSortedNightlyPortfolioSimulationStrings(
          "source_batch_run_refs",
          input.source_batch_run_refs,
          { allow_empty: false },
        ).map((ref) =>
          loadStoredByRefOrId({
            repository: input.repository,
            source_batch_run_ref_or_id: ref,
          }),
        ),
      )
    : await input.repository.listNightlyBatchRunsByTenantWindow({
        tenant_id: input.tenant_id,
        nightly_window_key: input.nightly_window_key,
      });
  if (loaded.length === 0) {
    throw new Error(
      `no persisted nightly source batches found for ${input.tenant_id}/${input.nightly_window_key}`,
    );
  }
  const sourceBatches = loaded
    .map(cloneStored)
    .sort((left, right) => left.nightly_batch_run_ref.localeCompare(right.nightly_batch_run_ref));
  const sourceRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "source_batch_run_refs",
    sourceBatches.map((record) => nightlyBatchRunRef(record.nightly_batch_run)),
    { allow_empty: false },
  );
  assertSameWindow({
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    records: sourceBatches,
  });
  assertSameFrozenBaseline(sourceBatches);
  const chainOrder = sortChain(sourceBatches);
  const effectiveBatch = structuredClone(chainOrder.at(-1)!.nightly_batch_run);
  const selectionEntries = latestSelectionEntryProjection(chainOrder);
  assertEntriesReplayable(selectionEntries);
  const coveredSelectionEntryRefs = uniqueSortedNightlyPortfolioSimulationStrings(
    "covered_selection_entry_refs",
    selectionEntries.map((entry) => entry.entry_id),
    { allow_empty: false },
  );
  return {
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    source_batch_run_refs: sourceRefs,
    source_batch_set_hash: deriveNightlyPortfolioSimulationSourceBatchSetHash({
      nightly_window_key: input.nightly_window_key,
      source_batch_run_refs: sourceRefs,
    }),
    source_batch_count: sourceRefs.length,
    source_batch_window_state: "SINGLE_NIGHTLY_WINDOW",
    source_batch_recovery_state:
      sourceRefs.length === 1 ? "SINGLE_BATCH" : "SUCCESSOR_RECOVERY_CHAIN",
    source_batches: sourceBatches,
    source_batches_in_chain_order: chainOrder,
    effective_batch: effectiveBatch,
    selection_entries: selectionEntries,
    covered_selection_entry_refs: coveredSelectionEntryRefs,
    covered_selection_entry_count: coveredSelectionEntryRefs.length,
  };
}
