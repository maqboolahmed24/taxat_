import {
  normalizeSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "../models/schema_reader_window_contract.ts";
import type { ConfigFreezeRecord } from "../models/config_freeze.ts";
import {
  assertCompleteConfigFreeze,
  assertWorkerFrozenConfigPacketMatches,
  configEntriesByType,
  createFrozenConfigWorkerPacket,
  projectConfigRefsByType,
  type FrozenConfigWorkerPacket,
} from "./config_completeness_validator.ts";

export type MaterializeFrozenConfigErrorCode =
  | "FROZEN_CONFIG_SCHEMA_READER_WINDOW_MISMATCH"
  | "FROZEN_CONFIG_SCHEMA_READER_WINDOW_REQUIRED";

export class MaterializeFrozenConfigError extends Error {
  readonly code: MaterializeFrozenConfigErrorCode;

  constructor(code: MaterializeFrozenConfigErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "MaterializeFrozenConfigError";
    this.code = code;
  }
}

export type MaterializedFrozenRuntimeConfig = {
  config_consumption_mode: "FROZEN_CONFIG_ONLY";
  config_freeze: {
    config_freeze_hash: string;
    config_freeze_id: string;
    config_resolution_basis: ConfigFreezeRecord["config_resolution_basis"];
    config_surface_hash: string;
    manifest_id: string;
    source_config_freeze_hash: string | null;
    source_config_freeze_ref: string | null;
    source_config_surface_hash: string | null;
  };
  entries_by_type: ReturnType<typeof configEntriesByType>;
  feature_flag_basis: {
    feature_flag_snapshot_hash: string | null;
  };
  profile_refs: Pick<
    ConfigFreezeRecord,
    | "amendment_materiality_profile_ref"
    | "approval_snapshot_ref"
    | "canonicalization_rules_ref"
    | "computation_rules_ref"
    | "connector_mapping_rules_ref"
    | "evidence_confidence_policy_ref"
    | "masking_export_policy_ref"
    | "materiality_profile_ref"
    | "override_policy_ref"
    | "parity_threshold_profile_ref"
    | "provider_contract_profile_ref"
    | "retention_profile_ref"
    | "risk_threshold_profile_ref"
    | "trust_threshold_profile_ref"
    | "workflow_policy_ref"
  >;
  refs_by_type: ReturnType<typeof projectConfigRefsByType>;
  required_config_types_present: ConfigFreezeRecord["required_config_types_present"];
  runtime_config_source: "CONFIG_FREEZE";
  schema_basis: {
    schema_bundle_hash: string;
    schema_reader_window_contract: SchemaReaderWindowContractRecord;
  };
  worker_packet: FrozenConfigWorkerPacket;
};

export type MaterializeCfgFromFreezeInput = {
  config_freeze: ConfigFreezeRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord | null;
  worker_packet?: FrozenConfigWorkerPacket | null;
};

function normalizeReaderWindow(input: {
  config_freeze: ConfigFreezeRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord | null;
}) {
  if (!input.schema_reader_window_contract) {
    throw new MaterializeFrozenConfigError(
      "FROZEN_CONFIG_SCHEMA_READER_WINDOW_REQUIRED",
      "runtime cfg materialization requires schema-reader window posture",
    );
  }
  const contract = normalizeSchemaReaderWindowContract(input.schema_reader_window_contract);
  if (contract.writer_schema_bundle_hash !== input.config_freeze.schema_bundle_hash) {
    throw new MaterializeFrozenConfigError(
      "FROZEN_CONFIG_SCHEMA_READER_WINDOW_MISMATCH",
      "schema_reader_window_contract.writer_schema_bundle_hash must match ConfigFreeze.schema_bundle_hash",
    );
  }
  return contract;
}

export function materializeCfgFromFreeze(
  input: MaterializeCfgFromFreezeInput,
): MaterializedFrozenRuntimeConfig {
  const freeze = assertCompleteConfigFreeze(input.config_freeze);
  const schemaReaderWindowContract = normalizeReaderWindow({
    config_freeze: freeze,
    schema_reader_window_contract: input.schema_reader_window_contract,
  });
  const workerPacket = input.worker_packet
    ? assertWorkerFrozenConfigPacketMatches({
        config_freeze: freeze,
        worker_packet: input.worker_packet,
      })
    : createFrozenConfigWorkerPacket(freeze);

  return {
    runtime_config_source: "CONFIG_FREEZE",
    config_consumption_mode: freeze.config_consumption_mode,
    config_freeze: {
      config_freeze_id: freeze.config_freeze_id,
      manifest_id: freeze.manifest_id,
      config_freeze_hash: freeze.config_freeze_hash,
      config_surface_hash: freeze.config_surface_hash,
      config_resolution_basis: freeze.config_resolution_basis,
      source_config_freeze_ref: freeze.source_config_freeze_ref,
      source_config_freeze_hash: freeze.source_config_freeze_hash,
      source_config_surface_hash: freeze.source_config_surface_hash,
    },
    schema_basis: {
      schema_bundle_hash: freeze.schema_bundle_hash,
      schema_reader_window_contract: schemaReaderWindowContract,
    },
    feature_flag_basis: {
      feature_flag_snapshot_hash: freeze.feature_flag_snapshot_hash,
    },
    required_config_types_present: [...freeze.required_config_types_present],
    entries_by_type: configEntriesByType(freeze),
    refs_by_type: projectConfigRefsByType(freeze),
    profile_refs: {
      approval_snapshot_ref: freeze.approval_snapshot_ref,
      materiality_profile_ref: freeze.materiality_profile_ref,
      amendment_materiality_profile_ref: freeze.amendment_materiality_profile_ref,
      retention_profile_ref: freeze.retention_profile_ref,
      provider_contract_profile_ref: freeze.provider_contract_profile_ref,
      workflow_policy_ref: freeze.workflow_policy_ref,
      override_policy_ref: freeze.override_policy_ref,
      masking_export_policy_ref: freeze.masking_export_policy_ref,
      canonicalization_rules_ref: freeze.canonicalization_rules_ref,
      connector_mapping_rules_ref: freeze.connector_mapping_rules_ref,
      parity_threshold_profile_ref: freeze.parity_threshold_profile_ref,
      trust_threshold_profile_ref: freeze.trust_threshold_profile_ref,
      risk_threshold_profile_ref: freeze.risk_threshold_profile_ref,
      evidence_confidence_policy_ref: freeze.evidence_confidence_policy_ref,
      computation_rules_ref: freeze.computation_rules_ref,
    },
    worker_packet: workerPacket,
  };
}
