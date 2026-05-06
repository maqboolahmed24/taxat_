import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  ReplayBasisIntegrityContract,
  ReplayBasisIntegrityContractCounterfactualDimensionArray,
  ReplayBasisIntegrityContractSourceDimensionArray,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RunManifestReplayClass } from "../models/run_manifest.ts";

type BasisSourceDimension = ReplayBasisIntegrityContractSourceDimensionArray[number];
type CounterfactualDimension = ReplayBasisIntegrityContractCounterfactualDimensionArray[number];

export type BuildReplayBasisIntegrityContractInput = Partial<
  Omit<
    ReplayBasisIntegrityContract,
    | "integrity_profile_code"
    | "historical_basis_policy"
    | "deterministic_outcome_source_policy"
    | "publication_gate"
  >
> & {
  replay_class: RunManifestReplayClass;
};

const SOURCE_DIMENSION_ORDER: BasisSourceDimension[] = [
  "CONFIG",
  "INPUT",
  "PRESEAL_GATE_TAPE",
  "AUTHORITY_POST_SEAL",
  "BASELINE_POST_SEAL",
  "LATE_DATA_POST_SEAL",
  "TEMPORAL_PROPAGATION_POST_SEAL",
];

const COUNTERFACTUAL_DIMENSION_ORDER: CounterfactualDimension[] = [
  "IDENTITY_AUTHORITY",
  "EXECUTABLE",
  "CONFIG",
  "INPUT",
  "POST_SEAL",
  "DETERMINISM",
  "AUTHORITY_POST_SEAL",
  "BASELINE_POST_SEAL",
  "LATE_DATA_POST_SEAL",
  "TEMPORAL_PROPAGATION_POST_SEAL",
];

function orderedSourceDimensions(values: readonly BasisSourceDimension[]) {
  const sorted = sortSetLikeStrings(values);
  return SOURCE_DIMENSION_ORDER.filter((dimension) => sorted.includes(dimension));
}

function orderedCounterfactualDimensions(values: readonly CounterfactualDimension[]) {
  const sorted = sortSetLikeStrings(values);
  return COUNTERFACTUAL_DIMENSION_ORDER.filter((dimension) => sorted.includes(dimension));
}

export function buildReplayBasisIntegrityContract(
  input: BuildReplayBasisIntegrityContractInput,
): ReplayBasisIntegrityContract {
  const missing = new Set<BasisSourceDimension>(input.missing_basis_dimensions ?? []);
  const corrupt = new Set<BasisSourceDimension>(input.corrupt_basis_dimensions ?? []);
  const substituted = new Set<BasisSourceDimension>(
    input.substituted_basis_dimensions ?? [],
  );
  const declared = new Set<CounterfactualDimension>(
    input.declared_counterfactual_dimensions ?? [],
  );

  if (input.config_basis_source_class === "MISSING_HISTORICAL_FREEZE") {
    missing.add("CONFIG");
  }
  if (input.input_basis_source_class === "MISSING_HISTORICAL_FREEZE") {
    missing.add("INPUT");
  }
  if (input.preseal_gate_source_class === "MISSING_PRESEAL_TAPE") {
    missing.add("PRESEAL_GATE_TAPE");
  }
  if (input.config_basis_source_class === "CORRUPT_HISTORICAL_FREEZE") {
    corrupt.add("CONFIG");
  }
  if (input.input_basis_source_class === "CORRUPT_HISTORICAL_FREEZE") {
    corrupt.add("INPUT");
  }
  if (input.preseal_gate_source_class === "CORRUPT_PRESEAL_TAPE") {
    corrupt.add("PRESEAL_GATE_TAPE");
  }

  const replayClass = input.replay_class;
  if (replayClass === "COUNTERFACTUAL_ANALYSIS" && declared.size === 0) {
    declared.add("CONFIG");
    substituted.add("CONFIG");
  }

  return {
    integrity_profile_code: "REPLAY_BASIS_INTEGRITY_V1",
    replay_class: replayClass,
    historical_basis_policy: "NO_SILENT_HISTORICAL_SUBSTITUTION",
    config_basis_source_class:
      input.config_basis_source_class ??
      (replayClass === "COUNTERFACTUAL_ANALYSIS"
        ? "DECLARED_COUNTERFACTUAL_SUBSTITUTION"
        : "HISTORICAL_FROZEN_REUSED"),
    input_basis_source_class:
      input.input_basis_source_class ?? "HISTORICAL_FROZEN_REUSED",
    preseal_gate_source_class:
      input.preseal_gate_source_class ?? "HISTORICAL_PRESEAL_TAPE_REUSED",
    authority_basis_source_class:
      input.authority_basis_source_class ?? "HISTORICAL_POST_SEAL_REUSED",
    baseline_basis_source_class: input.baseline_basis_source_class ?? "NOT_MATERIAL",
    late_data_basis_source_class: input.late_data_basis_source_class ?? "NOT_MATERIAL",
    temporal_propagation_event_source_class:
      input.temporal_propagation_event_source_class ?? "NOT_MATERIAL",
    live_connector_read_class: input.live_connector_read_class ?? "NOT_PERFORMED",
    live_authority_read_class: input.live_authority_read_class ?? "NOT_PERFORMED",
    late_data_rescan_class: input.late_data_rescan_class ?? "NOT_PERFORMED",
    missing_basis_dimensions: orderedSourceDimensions([...missing]),
    corrupt_basis_dimensions: orderedSourceDimensions([...corrupt]),
    substituted_basis_dimensions: orderedSourceDimensions([...substituted]),
    declared_counterfactual_dimensions:
      replayClass === "COUNTERFACTUAL_ANALYSIS"
        ? orderedCounterfactualDimensions([...declared])
        : [],
    undeclared_basis_drift_dimensions: orderedCounterfactualDimensions(
      input.undeclared_basis_drift_dimensions ?? [],
    ),
    deterministic_outcome_source_policy: "PERSISTED_OR_TRANSACTIONALLY_STAGED_ONLY",
    non_persisted_outcome_component_classes: sortSetLikeStrings(
      input.non_persisted_outcome_component_classes ?? [],
    ) as ReplayBasisIntegrityContract["non_persisted_outcome_component_classes"],
    publication_gate: "ATTESTATION_REQUIRED_BEFORE_REPLAY_CLAIM",
  };
}
