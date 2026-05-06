import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import {
  buildLateDataFindingFromIndicator,
  type LateDataFindingRecord,
} from "../models/late_data_finding.ts";
import {
  buildLateDataIndicatorSetRecord,
  type LateDataIndicatorSetRecord,
} from "../models/late_data_indicator_set.ts";
import {
  buildLateDataMonitorResultFromFindings,
  type LateDataMonitorResultRecord,
} from "../models/late_data_monitor_result.ts";
import type { LateDataPolicyBindingRecord } from "../models/late_data_indicator.ts";
import {
  normalizeCollectionRuntimeScopes,
  normalizeCollectionString,
} from "../models/collection_control_common.ts";
import type { LateDataFindingRepository } from "../repositories/late_data_finding_repository.ts";
import type { LateDataIndicatorSetRepository } from "../repositories/late_data_indicator_set_repository.ts";
import type { LateDataMonitorResultRepository } from "../repositories/late_data_monitor_result_repository.ts";
import {
  projectCollectionLateDataBindings,
  selectLateDataPolicyBinding,
} from "./collection_late_data_bindings.ts";
import {
  buildLateDataIndicator,
  type CollectionLateDataObservation,
} from "./late_data_indicator_builder.ts";

export type CollectionLateDataClassificationResult = {
  findings: LateDataFindingRecord[];
  indicator_set: LateDataIndicatorSetRecord;
  late_data_policy_bindings: LateDataPolicyBindingRecord[];
  monitor_result: LateDataMonitorResultRecord;
};

export async function classifyCollectionLateData(input: {
  classified_at: string;
  collection_boundary: CollectionBoundaryRecord;
  execution_basis_hash: string;
  finding_repository?: LateDataFindingRepository;
  indicator_set_repository?: LateDataIndicatorSetRepository;
  input_freeze_ref: string;
  late_data_policy_bindings?: readonly LateDataPolicyBindingRecord[];
  manifest_hash: string;
  monitor_result_repository?: LateDataMonitorResultRepository;
  observations?: readonly CollectionLateDataObservation[];
  persisted_at?: string;
  runtime_scope_refs: readonly string[];
  schema_bundle_hash?: string;
  source_window_ref: string;
  writer_build_id?: string;
}): Promise<CollectionLateDataClassificationResult> {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const runtimeScopeRefs = normalizeCollectionRuntimeScopes(
    "late_data_classification.runtime_scope_refs",
    input.runtime_scope_refs,
  );
  const bindings =
    input.late_data_policy_bindings === undefined
      ? projectCollectionLateDataBindings({
          collection_boundary: boundary,
          runtime_scope_refs: runtimeScopeRefs,
        })
      : [...input.late_data_policy_bindings];
  const observations = input.observations ?? [];
  const indicators = observations.map((observation) => {
    const binding = selectLateDataPolicyBinding({
      bindings,
      partition_scope_refs: observation.partition_scope_refs ?? [],
      runtime_scope_refs: observation.runtime_scope_refs ?? runtimeScopeRefs,
      source_class: observation.source_class ?? null,
      source_domain: observation.source_domain,
    });
    return buildLateDataIndicator({
      binding,
      collection_boundary: boundary,
      observation,
    });
  });

  const indicatorSet = buildLateDataIndicatorSetRecord({
    collection_boundary_ref: collectionBoundaryRef(boundary),
    items: indicators,
    manifest_id: boundary.manifest_id,
    produced_at: input.classified_at,
    runtime_scope_refs: runtimeScopeRefs,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    source_plan_ref: boundary.source_plan_ref,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const findings = indicators.map((indicator) => buildLateDataFindingFromIndicator({ indicator }));
  const monitorResult = buildLateDataMonitorResultFromFindings({
    classified_at: input.classified_at,
    collection_boundary_ref: collectionBoundaryRef(boundary),
    execution_basis_hash: normalizeCollectionString(
      "late_data_classification.execution_basis_hash",
      input.execution_basis_hash,
    ),
    findings,
    indicator_set: indicatorSet,
    input_freeze_ref: normalizeCollectionString(
      "late_data_classification.input_freeze_ref",
      input.input_freeze_ref,
    ),
    manifest_hash: normalizeCollectionString(
      "late_data_classification.manifest_hash",
      input.manifest_hash,
    ),
    manifest_id: boundary.manifest_id,
    runtime_scope_refs: runtimeScopeRefs,
    source_window_ref: normalizeCollectionString(
      "late_data_classification.source_window_ref",
      input.source_window_ref,
    ),
  });

  const persistedAt = input.persisted_at ?? input.classified_at;
  if (input.indicator_set_repository) {
    await input.indicator_set_repository.persistLateDataIndicatorSet({
      late_data_indicator_set: indicatorSet,
      persisted_at: persistedAt,
    });
  }
  if (input.finding_repository) {
    for (const finding of findings) {
      await input.finding_repository.persistLateDataFinding({
        late_data_finding: finding,
        persisted_at: persistedAt,
      });
    }
  }
  if (input.monitor_result_repository) {
    await input.monitor_result_repository.persistLateDataMonitorResult({
      late_data_monitor_result: monitorResult,
      persisted_at: persistedAt,
    });
  }

  return {
    findings,
    indicator_set: indicatorSet,
    late_data_policy_bindings: bindings,
    monitor_result: monitorResult,
  };
}
