import type { ConnectorBinding as GeneratedConnectorBinding } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { SourcePlanPlannedSourceRecord } from "../models/source_plan.ts";

export type ConnectorBindingRecord = Omit<
  GeneratedConnectorBinding,
  "expires_at" | "last_validated_at" | "revoked_at"
> & {
  expires_at: string | null;
  last_validated_at: string | null;
  revoked_at: string | null;
};

export type CollectionFetchReadModelContract =
  | {
      as_of_at: string;
      mode: "AS_OF";
      read_cutoff_at: string;
    }
  | {
      mode: "WINDOWED";
      read_cutoff_at: string;
      window_basis_ref: string;
      window_closed_at: string;
    }
  | {
      mode: "POINT_IN_TIME";
      point_in_time_at: string;
      read_cutoff_at: string;
    }
  | {
      latest_allowed_at: string;
      mode: "LATEST_ALLOWED";
      read_cutoff_at: string;
    };

export type CollectionFetchRequestEnvelope = {
  artifact_type: "CollectionFetchRequestEnvelope";
  binding_lineage_ref: string;
  client_id: string;
  collection_run_id: string;
  connector_binding_id: string;
  connector_binding_ref: string;
  created_at: string;
  cursor_strategy_ref: string;
  gateway_policy: {
    credential_material_policy: "GATEWAY_ISSUED_FROM_TOKEN_REF_ONLY";
    direct_provider_call_policy: "APPLICATION_CODE_FORBIDDEN";
    raw_payload_logging_policy: "FORBIDDEN";
  };
  idempotency_key: string;
  late_data_policy_ref: string;
  manifest_id: string;
  observed_binding_health_state: ConnectorBindingRecord["health_state"];
  partition_scope_refs: string[];
  planned_source: SourcePlanPlannedSourceRecord;
  provider: string;
  provider_api_version: string;
  provider_binding_ref: string;
  provider_environment_ref: string;
  query_basis_ref: string;
  read_model_contract: CollectionFetchReadModelContract;
  request_hash: string;
  request_id: string;
  required_schema_refs: string[];
  source_class: string;
  source_domain: string;
  source_window_ref: string;
  subject_ref: string;
  tenant_id: string;
  token_ref: string;
  token_version_ref: string;
};
