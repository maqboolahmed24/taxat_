export type LogicalFamilyRef = "AUTHORITY_AND_ACCESS" | "CLIENT_AND_COLLABORATION" | "GOVERNANCE_AND_POLICY" | "MANIFEST_AND_RELEASE" | "SURFACE_AND_EXPERIENCE" | "DECISIONING_AND_NIGHTLY" | "PROVENANCE_AND_EVIDENCE" | "RETENTION_FAILURE_AND_OBSERVABILITY" | "DOMAIN_WORKFLOW_AND_FILING";

export type SchemaCatalogEntry = {
  schemaName: string;
  schemaStem: string;
  label: string;
  schemaId: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  refTargets: string[];
  resolvedSchemaRefs: string[];
  sampleRefs: string[];
  validationPosture: string;
  importStrategy: string;
  importStatus: "IMPORTED";
};

export type SampleBindingEntry = {
  sampleName: string;
  label: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  inferredSchemaName: string;
  inferredSchemaId: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  bindingMethod: string;
  validationPosture: string;
};

export type ValidatorArtifact = {
  artifactRef: "validate_contracts.py" | "forensic_contract_guard.py";
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  adaptationPosture: string;
  command: string;
};

export const contractImportBundle = {
  "packagePath": "packages/contracts-core",
  "packageOverride": "packages/contracts -> packages/contracts-core",
  "sourceBundleRoot": "Algorithm",
  "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
  "importPosture": "MIRRORED_IMPORT_SYNCED",
  "counts": {
    "schemas": 237,
    "samples": 52,
    "validators": 2
  }
} as const;

export const validatorArtifacts = [
  {
    "artifactRef": "validate_contracts.py",
    "sourcePath": "Algorithm/scripts/validate_contracts.py",
    "destinationPath": "packages/contracts-core/python/validate_contracts.py",
    "sourceHash": "d32b0a4b768b951f823ca1ca46634b170bf36079828da1178694e90e741e0e4f",
    "destinationHash": "b7932e90403319ce9ae3ce011a3889f45f834b96f3c2b079883ed64d3687fbef",
    "adaptationPosture": "PATH_ADAPTER_ONLY_AUTHORITATIVE_LOGIC_PRESERVED",
    "command": "python3 packages/contracts-core/python/validate_contracts.py --self-test"
  },
  {
    "artifactRef": "forensic_contract_guard.py",
    "sourcePath": "Algorithm/tools/forensic_contract_guard.py",
    "destinationPath": "packages/contracts-core/python/forensic_contract_guard.py",
    "sourceHash": "9b693a183b269d89a6121e81c00ca84e511332e92260328a88ea08329398b71d",
    "destinationHash": "70d05b9ef5999ed86ed12b15c82f3c601208a07ce85f368e637dc69473d7ba17",
    "adaptationPosture": "PATH_ADAPTER_ONLY_AUTHORITATIVE_LOGIC_PRESERVED",
    "command": "python3 packages/contracts-core/python/forensic_contract_guard.py"
  }
] as const;

export const schemaCatalog = [
  {
    "schemaName": "accepted_risk_approval.schema.json",
    "schemaStem": "accepted_risk_approval",
    "label": "Accepted Risk Approval",
    "schemaId": "https://taxat.dev/schemas/accepted_risk_approval.schema.json",
    "sourcePath": "Algorithm/schemas/accepted_risk_approval.schema.json",
    "destinationPath": "packages/contracts-core/schemas/accepted_risk_approval.schema.json",
    "sourceHash": "4a813e45226ffac57abbba56b162d2e41a26ceac425e5ff6728a55204f4d09d1",
    "destinationHash": "4a813e45226ffac57abbba56b162d2e41a26ceac425e5ff6728a55204f4d09d1",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "https://taxat.dev/schemas/failure_resolution_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "failure_resolution_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "action_authority_contract.schema.json",
    "schemaStem": "action_authority_contract",
    "label": "Action Authority Contract",
    "schemaId": "https://taxat.dev/schemas/action_authority_contract.schema.json",
    "sourcePath": "Algorithm/schemas/action_authority_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/action_authority_contract.schema.json",
    "sourceHash": "1f7f036e3b8b69d1a342905380a79eb2e4dd840befd8d4aefcacd990c58233d6",
    "destinationHash": "1f7f036e3b8b69d1a342905380a79eb2e4dd840befd8d4aefcacd990c58233d6",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "action_strip_state.schema.json",
    "schemaStem": "action_strip_state",
    "label": "Action Strip State",
    "schemaId": "https://taxat.dev/schemas/action_strip_state.schema.json",
    "sourcePath": "Algorithm/schemas/action_strip_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/action_strip_state.schema.json",
    "sourceHash": "c234d4ddcbc3cffd75eefe529dc0c734e3c7ebf9d67ff2a737dc7ba94d839559",
    "destinationHash": "c234d4ddcbc3cffd75eefe529dc0c734e3c7ebf9d67ff2a737dc7ba94d839559",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/action",
      "#/$defs/detailModuleCode",
      "https://taxat.dev/schemas/mutation_precondition_binding.schema.json"
    ],
    "resolvedSchemaRefs": [
      "mutation_precondition_binding.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "actor_session.schema.json",
    "schemaStem": "actor_session",
    "label": "Actor Session",
    "schemaId": "https://taxat.dev/schemas/actor_session.schema.json",
    "sourcePath": "Algorithm/schemas/actor_session.schema.json",
    "destinationPath": "packages/contracts-core/schemas/actor_session.schema.json",
    "sourceHash": "a75ec9cb55c8dc2926180ee7fda3ca436631049d07d9ba90fe83d1ea842a6b3a",
    "destinationHash": "a75ec9cb55c8dc2926180ee7fda3ca436631049d07d9ba90fe83d1ea842a6b3a",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "amendment_bundle.schema.json",
    "schemaStem": "amendment_bundle",
    "label": "Amendment Bundle",
    "schemaId": "https://taxat.dev/schemas/amendment_bundle.schema.json",
    "sourcePath": "Algorithm/schemas/amendment_bundle.schema.json",
    "destinationPath": "packages/contracts-core/schemas/amendment_bundle.schema.json",
    "sourceHash": "62e75b6c443c3734cbe28923b78ba3c5e55009cc1feb4dfcf87dd1e1d3470a9c",
    "destinationHash": "62e75b6c443c3734cbe28923b78ba3c5e55009cc1feb4dfcf87dd1e1d3470a9c",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "amendment_case.schema.json",
    "schemaStem": "amendment_case",
    "label": "Amendment Case",
    "schemaId": "https://taxat.dev/schemas/amendment_case.schema.json",
    "sourcePath": "Algorithm/schemas/amendment_case.schema.json",
    "destinationPath": "packages/contracts-core/schemas/amendment_case.schema.json",
    "sourceHash": "2555ffbc214915ab844f9312260648fb75882b8ca2f5166705a4ef31b6929beb",
    "destinationHash": "2555ffbc214915ab844f9312260648fb75882b8ca2f5166705a4ef31b6929beb",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/amendment_eligibility_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "amendment_eligibility_contract.schema.json",
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "amendment_eligibility_contract.schema.json",
    "schemaStem": "amendment_eligibility_contract",
    "label": "Amendment Eligibility Contract",
    "schemaId": "https://taxat.dev/schemas/amendment_eligibility_contract.schema.json",
    "sourcePath": "Algorithm/schemas/amendment_eligibility_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/amendment_eligibility_contract.schema.json",
    "sourceHash": "a056971ede42adf3dfb0cf6109654f9062ae72f7359cdc8b8116f860a7480cf4",
    "destinationHash": "a056971ede42adf3dfb0cf6109654f9062ae72f7359cdc8b8116f860a7480cf4",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "amendment_window_context.schema.json",
    "schemaStem": "amendment_window_context",
    "label": "Amendment Window Context",
    "schemaId": "https://taxat.dev/schemas/amendment_window_context.schema.json",
    "sourcePath": "Algorithm/schemas/amendment_window_context.schema.json",
    "destinationPath": "packages/contracts-core/schemas/amendment_window_context.schema.json",
    "sourceHash": "565f26a7a5d54a11b887b610f361189878c5dd9b9a91c02acdbdf507678a541f",
    "destinationHash": "565f26a7a5d54a11b887b610f361189878c5dd9b9a91c02acdbdf507678a541f",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "api_command_receipt.schema.json",
    "schemaStem": "api_command_receipt",
    "label": "Api Command Receipt",
    "schemaId": "https://taxat.dev/schemas/api_command_receipt.schema.json",
    "sourcePath": "Algorithm/schemas/api_command_receipt.schema.json",
    "destinationPath": "packages/contracts-core/schemas/api_command_receipt.schema.json",
    "sourceHash": "fe995f1540fa1295edffbce7fef87cc9f63da5b0d8e05b45c08c6dbb06a12ad6",
    "destinationHash": "fe995f1540fa1295edffbce7fef87cc9f63da5b0d8e05b45c08c6dbb06a12ad6",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
      "https://taxat.dev/schemas/mutation_precondition_binding.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "governance_mutation_basis_contract.schema.json",
      "mutation_precondition_binding.schema.json",
      "route_stability_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "artifact_affordance_contract.schema.json",
    "schemaStem": "artifact_affordance_contract",
    "label": "Artifact Affordance Contract",
    "schemaId": "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
    "sourcePath": "Algorithm/schemas/artifact_affordance_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/artifact_affordance_contract.schema.json",
    "sourceHash": "af947513eb536bf6ef4870acb48ed2dda57ed4fa9451e7347a30bb736b2276a8",
    "destinationHash": "af947513eb536bf6ef4870acb48ed2dda57ed4fa9451e7347a30bb736b2276a8",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "artifact_retention.schema.json",
    "schemaStem": "artifact_retention",
    "label": "Artifact Retention",
    "schemaId": "https://taxat.dev/schemas/artifact_retention.schema.json",
    "sourcePath": "Algorithm/schemas/artifact_retention.schema.json",
    "destinationPath": "packages/contracts-core/schemas/artifact_retention.schema.json",
    "sourceHash": "e363e549cba2beef1dcf37b8f737dfa0ee6d93e31c54f74e962283f9c03fba65",
    "destinationHash": "e363e549cba2beef1dcf37b8f737dfa0ee6d93e31c54f74e962283f9c03fba65",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "artifact_selection_contract.schema.json",
    "schemaStem": "artifact_selection_contract",
    "label": "Artifact Selection Contract",
    "schemaId": "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
    "sourcePath": "Algorithm/schemas/artifact_selection_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/artifact_selection_contract.schema.json",
    "sourceHash": "de32be087b747f594e253f51f95696cc13b303e474ca4ed225f3578e292d45ac",
    "destinationHash": "de32be087b747f594e253f51f95696cc13b303e474ca4ed225f3578e292d45ac",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "audit_event.schema.json",
    "schemaStem": "audit_event",
    "label": "Audit Event",
    "schemaId": "https://taxat.dev/schemas/audit_event.schema.json",
    "sourcePath": "Algorithm/schemas/audit_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/audit_event.schema.json",
    "sourceHash": "06e7edebf67e57edd998238bd42b5200ba334178157d272501ccc23b5feb51c2",
    "destinationHash": "06e7edebf67e57edd998238bd42b5200ba334178157d272501ccc23b5feb51c2",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "./telemetry_resource.schema.json#/$defs/correlationContext",
      "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
      "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json",
      "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "manifest_branch_decision_contract.schema.json",
      "manifest_start_claim_contract.schema.json",
      "retention_limited_explainability_contract.schema.json",
      "telemetry_resource.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "audit_investigation_frame.schema.json",
    "schemaStem": "audit_investigation_frame",
    "label": "Audit Investigation Frame",
    "schemaId": "https://taxat.dev/schemas/audit_investigation_frame.schema.json",
    "sourcePath": "Algorithm/schemas/audit_investigation_frame.schema.json",
    "destinationPath": "packages/contracts-core/schemas/audit_investigation_frame.schema.json",
    "sourceHash": "da722027734a4912d7c128864c83942c88c373ebcbf473022eece8970e4e61f4",
    "destinationHash": "da722027734a4912d7c128864c83942c88c373ebcbf473022eece8970e4e61f4",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/activeFilters",
      "#/$defs/auditTape",
      "#/$defs/auditTapeRow",
      "#/$defs/auditWorkspace",
      "#/$defs/eventDiffInspector",
      "#/$defs/eventDiffPanelMode",
      "#/$defs/exportEligibilityPanel",
      "#/$defs/exportPanelMode",
      "#/$defs/exportPosture",
      "#/$defs/invocationPosture",
      "#/$defs/neighborhoodMode",
      "#/$defs/objectNeighborhood",
      "#/$defs/promotedSupportSurface",
      "#/$defs/rawPayloadPosture",
      "#/$defs/recoveryPosture",
      "#/$defs/settlementState",
      "#/$defs/timelineMode",
      "#/$defs/workspaceMode",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json"
    ],
    "resolvedSchemaRefs": [
      "externalization_governance_contract.schema.json",
      "governance_interaction_layer.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_binding.schema.json",
    "schemaStem": "authority_binding",
    "label": "Authority Binding",
    "schemaId": "https://taxat.dev/schemas/authority_binding.schema.json",
    "sourcePath": "Algorithm/schemas/authority_binding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_binding.schema.json",
    "sourceHash": "02882fc03c78975fa445787e7133885b4088882cb36a58c874004ffd5c37a1ad",
    "destinationHash": "02882fc03c78975fa445787e7133885b4088882cb36a58c874004ffd5c37a1ad",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_layer_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_binding_drift_sentinel_contract.schema.json",
    "schemaStem": "authority_binding_drift_sentinel_contract",
    "label": "Authority Binding Drift Sentinel Contract",
    "schemaId": "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_binding_drift_sentinel_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_binding_drift_sentinel_contract.schema.json",
    "sourceHash": "a1612b481daf34c09c7567f71e922f0bf3d18aec7ba082d522271f7c98f40e0e",
    "destinationHash": "a1612b481daf34c09c7567f71e922f0bf3d18aec7ba082d522271f7c98f40e0e",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_authority_binding_drift_sentinel_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_calculation_readiness_context.schema.json",
    "schemaStem": "authority_calculation_readiness_context",
    "label": "Authority Calculation Readiness Context",
    "schemaId": "https://taxat.dev/schemas/authority_calculation_readiness_context.schema.json",
    "sourcePath": "Algorithm/schemas/authority_calculation_readiness_context.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_calculation_readiness_context.schema.json",
    "sourceHash": "6c4f7e1ec5b76862ce49eed3ddb5a0c4acf6ad58fabe87cbae5a104ae756108b",
    "destinationHash": "6c4f7e1ec5b76862ce49eed3ddb5a0c4acf6ad58fabe87cbae5a104ae756108b",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_calculation_request.schema.json",
    "schemaStem": "authority_calculation_request",
    "label": "Authority Calculation Request",
    "schemaId": "https://taxat.dev/schemas/authority_calculation_request.schema.json",
    "sourcePath": "Algorithm/schemas/authority_calculation_request.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_calculation_request.schema.json",
    "sourceHash": "9c0694f3b15563bbbafbec392744cc00d40888ce0fefeb183dab49b52958791b",
    "destinationHash": "9c0694f3b15563bbbafbec392744cc00d40888ce0fefeb183dab49b52958791b",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/scope_execution_binding.schema.json"
    ],
    "resolvedSchemaRefs": [
      "scope_execution_binding.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_calculation_result.schema.json",
    "schemaStem": "authority_calculation_result",
    "label": "Authority Calculation Result",
    "schemaId": "https://taxat.dev/schemas/authority_calculation_result.schema.json",
    "sourcePath": "Algorithm/schemas/authority_calculation_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_calculation_result.schema.json",
    "sourceHash": "4a6579811ba343cb6f81a17986aba91960e65ed0c626062a31426a7d1e3b0d73",
    "destinationHash": "4a6579811ba343cb6f81a17986aba91960e65ed0c626062a31426a7d1e3b0d73",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_ingress_correlation_contract.schema.json",
    "schemaStem": "authority_ingress_correlation_contract",
    "label": "Authority Ingress Correlation Contract",
    "schemaId": "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_ingress_correlation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_ingress_correlation_contract.schema.json",
    "sourceHash": "8622939e089e1d3e56cf0fe145ec76aabdffabca8ffd897ac3a3ad9c54c114cb",
    "destinationHash": "8622939e089e1d3e56cf0fe145ec76aabdffabca8ffd897ac3a3ad9c54c114cb",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/candidateLineage"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_authority_ingress_correlation_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_ingress_investigation_snapshot.schema.json",
    "schemaStem": "authority_ingress_investigation_snapshot",
    "label": "Authority Ingress Investigation Snapshot",
    "schemaId": "https://taxat.dev/schemas/authority_ingress_investigation_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/authority_ingress_investigation_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_ingress_investigation_snapshot.schema.json",
    "sourceHash": "2c30cad1b59e20e100b52cd010fa9c35020bef7c2182eace9e6b72e381d1f9e4",
    "destinationHash": "2c30cad1b59e20e100b52cd010fa9c35020bef7c2182eace9e6b72e381d1f9e4",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/deliveryLineage",
      "#/$defs/quarantineExplainability",
      "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json",
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_ingress_correlation_contract.schema.json",
      "authority_ingress_proof_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_authority_ingress_investigation_snapshot.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_ingress_proof_contract.schema.json",
    "schemaStem": "authority_ingress_proof_contract",
    "label": "Authority Ingress Proof Contract",
    "schemaId": "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_ingress_proof_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_ingress_proof_contract.schema.json",
    "sourceHash": "dda61f1e59d20ef5ca63737f2130a041ec946e46ea545b7bf833959e63fa4194",
    "destinationHash": "dda61f1e59d20ef5ca63737f2130a041ec946e46ea545b7bf833959e63fa4194",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_ingress_receipt.schema.json",
    "schemaStem": "authority_ingress_receipt",
    "label": "Authority Ingress Receipt",
    "schemaId": "https://taxat.dev/schemas/authority_ingress_receipt.schema.json",
    "sourcePath": "Algorithm/schemas/authority_ingress_receipt.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_ingress_receipt.schema.json",
    "sourceHash": "e4815200450d19e9488f76eeab7f2ec31b77d0c9bcf23cd54664895b62d9f797",
    "destinationHash": "e4815200450d19e9488f76eeab7f2ec31b77d0c9bcf23cd54664895b62d9f797",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json",
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
      "https://taxat.dev/schemas/authority_truth_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_ingress_correlation_contract.schema.json",
      "authority_ingress_proof_contract.schema.json",
      "authority_truth_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_interaction_record.schema.json",
    "schemaStem": "authority_interaction_record",
    "label": "Authority Interaction Record",
    "schemaId": "https://taxat.dev/schemas/authority_interaction_record.schema.json",
    "sourcePath": "Algorithm/schemas/authority_interaction_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_interaction_record.schema.json",
    "sourceHash": "bf1f6d39bb02f320e92165a709e657f4148c0a191ce40b7e17d2f83bb357085d",
    "destinationHash": "bf1f6d39bb02f320e92165a709e657f4148c0a191ce40b7e17d2f83bb357085d",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json",
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
      "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json",
      "https://taxat.dev/schemas/authority_request_identity_contract.schema.json",
      "https://taxat.dev/schemas/authority_truth_contract.schema.json",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_binding_drift_sentinel_contract.schema.json",
      "authority_ingress_proof_contract.schema.json",
      "authority_reconciliation_control_contract.schema.json",
      "authority_request_identity_contract.schema.json",
      "authority_truth_contract.schema.json",
      "command_truth_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_layer_boundary_contract.schema.json",
    "schemaStem": "authority_layer_boundary_contract",
    "label": "Authority Layer Boundary Contract",
    "schemaId": "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_layer_boundary_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_layer_boundary_contract.schema.json",
    "sourceHash": "5d8379487b939b840bb99ae8ffa83124517b2f7d9106ef9c6289342aa0333952",
    "destinationHash": "5d8379487b939b840bb99ae8ffa83124517b2f7d9106ef9c6289342aa0333952",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_link.schema.json",
    "schemaStem": "authority_link",
    "label": "Authority Link",
    "schemaId": "https://taxat.dev/schemas/authority_link.schema.json",
    "sourcePath": "Algorithm/schemas/authority_link.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_link.schema.json",
    "sourceHash": "c4d35be54a4a6ceb5d2887d97890b07daef144c69fc96f5b04a7e6368a226af3",
    "destinationHash": "c4d35be54a4a6ceb5d2887d97890b07daef144c69fc96f5b04a7e6368a226af3",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_link_inventory_item.schema.json",
    "schemaStem": "authority_link_inventory_item",
    "label": "Authority Link Inventory Item",
    "schemaId": "https://taxat.dev/schemas/authority_link_inventory_item.schema.json",
    "sourcePath": "Algorithm/schemas/authority_link_inventory_item.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_link_inventory_item.schema.json",
    "sourceHash": "dafa503e1d5b0152f01acad4406a7855c71cf5e1d2116cb6de6fbdeb09fea8e8",
    "destinationHash": "dafa503e1d5b0152f01acad4406a7855c71cf5e1d2116cb6de6fbdeb09fea8e8",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/affectedOperationCounts",
      "#/$defs/affectedOperationList",
      "#/$defs/authorityLinkWorkspace",
      "#/$defs/authorityLinkWorkspaceFilters",
      "#/$defs/bindingHealth",
      "#/$defs/bindingHealthTimeline",
      "#/$defs/delegationState",
      "#/$defs/expiryRiskBand",
      "#/$defs/guidedFlowMode",
      "#/$defs/guidedHandshakeStepper",
      "#/$defs/handshakeAttemptState",
      "#/$defs/handshakeFlowState",
      "#/$defs/handshakeHistory",
      "#/$defs/handshakeStepCode",
      "#/$defs/lifecycleState",
      "#/$defs/preflightCheck",
      "#/$defs/preflightCheckCode",
      "#/$defs/preflightCheckState",
      "#/$defs/preflightChecklist",
      "#/$defs/recoveryPosture",
      "#/$defs/settlementState",
      "#/$defs/tokenClientBindingState",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json"
    ],
    "resolvedSchemaRefs": [
      "externalization_governance_contract.schema.json",
      "governance_interaction_layer.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_operation.schema.json",
    "schemaStem": "authority_operation",
    "label": "Authority Operation",
    "schemaId": "https://taxat.dev/schemas/authority_operation.schema.json",
    "sourcePath": "Algorithm/schemas/authority_operation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_operation.schema.json",
    "sourceHash": "a9c6f872ed9d6613cc2e75106a8df872de571c352e31b5c9aad593ee387daabd",
    "destinationHash": "a9c6f872ed9d6613cc2e75106a8df872de571c352e31b5c9aad593ee387daabd",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/scopeArray",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json",
      "https://taxat.dev/schemas/scope_execution_binding.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_layer_boundary_contract.schema.json",
      "schema_bundle.schema.json",
      "scope_execution_binding.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_operation_profile.schema.json",
    "schemaStem": "authority_operation_profile",
    "label": "Authority Operation Profile",
    "schemaId": "https://taxat.dev/schemas/authority_operation_profile.schema.json",
    "sourcePath": "Algorithm/schemas/authority_operation_profile.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_operation_profile.schema.json",
    "sourceHash": "39364a825e050a50d41e7ccc1ea580fe449621d21ef3bbbfcdd8eb0f2a92e303",
    "destinationHash": "39364a825e050a50d41e7ccc1ea580fe449621d21ef3bbbfcdd8eb0f2a92e303",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/legalStateRules",
      "#/$defs/pendingUnknownRules",
      "#/$defs/reconciliationRules",
      "#/$defs/successResponseRules",
      "#/$defs/transportRules",
      "./authority_operation.schema.json#/$defs/scopeArray"
    ],
    "resolvedSchemaRefs": [
      "authority_operation.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_reconciliation_analytics_snapshot.schema.json",
    "schemaStem": "authority_reconciliation_analytics_snapshot",
    "label": "Authority Reconciliation Analytics Snapshot",
    "schemaId": "https://taxat.dev/schemas/authority_reconciliation_analytics_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/authority_reconciliation_analytics_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_reconciliation_analytics_snapshot.schema.json",
    "sourceHash": "53ba434c4a60165d0f9aed061cce6c7c47a326584ded40c1209cb7761aefe022",
    "destinationHash": "53ba434c4a60165d0f9aed061cce6c7c47a326584ded40c1209cb7761aefe022",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/budgetCountEntry",
      "#/$defs/outcomeCountEntry",
      "#/$defs/resendReasonCountEntry",
      "#/$defs/stringCountEntry"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_reconciliation_control_contract.schema.json",
    "schemaStem": "authority_reconciliation_control_contract",
    "label": "Authority Reconciliation Control Contract",
    "schemaId": "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_reconciliation_control_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_reconciliation_control_contract.schema.json",
    "sourceHash": "b15e49aa0ca2d3675756e87e592c9110574cf155992bc121aece0e8949a2fc53",
    "destinationHash": "b15e49aa0ca2d3675756e87e592c9110574cf155992bc121aece0e8949a2fc53",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_request_envelope.schema.json",
    "schemaStem": "authority_request_envelope",
    "label": "Authority Request Envelope",
    "schemaId": "https://taxat.dev/schemas/authority_request_envelope.schema.json",
    "sourcePath": "Algorithm/schemas/authority_request_envelope.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_request_envelope.schema.json",
    "sourceHash": "a294dc0c10460ae07a910e085db9200635dd7d505e2c902ac6ee130618572167",
    "destinationHash": "a294dc0c10460ae07a910e085db9200635dd7d505e2c902ac6ee130618572167",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json",
      "https://taxat.dev/schemas/authority_request_identity_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_layer_boundary_contract.schema.json",
      "authority_request_identity_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_request_identity_contract.schema.json",
    "schemaStem": "authority_request_identity_contract",
    "label": "Authority Request Identity Contract",
    "schemaId": "https://taxat.dev/schemas/authority_request_identity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_request_identity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_request_identity_contract.schema.json",
    "sourceHash": "954f6c22434059cf165cf46282cfda7dff722425849659ddeba5ba316e885f7c",
    "destinationHash": "954f6c22434059cf165cf46282cfda7dff722425849659ddeba5ba316e885f7c",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_response_envelope.schema.json",
    "schemaStem": "authority_response_envelope",
    "label": "Authority Response Envelope",
    "schemaId": "https://taxat.dev/schemas/authority_response_envelope.schema.json",
    "sourcePath": "Algorithm/schemas/authority_response_envelope.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_response_envelope.schema.json",
    "sourceHash": "3d667a68a2ebb0d4d83d955fa5ffb80a41fd77a557eff9ef6607b9c430800cac",
    "destinationHash": "3d667a68a2ebb0d4d83d955fa5ffb80a41fd77a557eff9ef6607b9c430800cac",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_ingress_proof_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_sandbox_coverage_contract.schema.json",
    "schemaStem": "authority_sandbox_coverage_contract",
    "label": "Authority Sandbox Coverage Contract",
    "schemaId": "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_sandbox_coverage_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_sandbox_coverage_contract.schema.json",
    "sourceHash": "030242cf15ff1373792ad946c7279751d810864c94cfa8c9d11d0d3945b7e471",
    "destinationHash": "030242cf15ff1373792ad946c7279751d810864c94cfa8c9d11d0d3945b7e471",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/negativePathCoverageEntry",
      "#/$defs/operationCoverageEntry",
      "#/$defs/operationFamily"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authority_truth_contract.schema.json",
    "schemaStem": "authority_truth_contract",
    "label": "Authority Truth Contract",
    "schemaId": "https://taxat.dev/schemas/authority_truth_contract.schema.json",
    "sourcePath": "Algorithm/schemas/authority_truth_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authority_truth_contract.schema.json",
    "sourceHash": "8ec4d21bb7ff13d5042ef87335b48f3b1920525111ccc4a12968bf2dc2dd9a0b",
    "destinationHash": "8ec4d21bb7ff13d5042ef87335b48f3b1920525111ccc4a12968bf2dc2dd9a0b",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_authority_truth_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "authorization_decision.schema.json",
    "schemaStem": "authorization_decision",
    "label": "Authorization Decision",
    "schemaId": "https://taxat.dev/schemas/authorization_decision.schema.json",
    "sourcePath": "Algorithm/schemas/authorization_decision.schema.json",
    "destinationPath": "packages/contracts-core/schemas/authorization_decision.schema.json",
    "sourceHash": "0e6c1e709c90ed63c93c8549abc297df5a9fa989dff4d00ac331e88c299c8ede",
    "destinationHash": "0e6c1e709c90ed63c93c8549abc297df5a9fa989dff4d00ac331e88c299c8ede",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_layer_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "backfill_execution_contract.schema.json",
    "schemaStem": "backfill_execution_contract",
    "label": "Backfill Execution Contract",
    "schemaId": "https://taxat.dev/schemas/backfill_execution_contract.schema.json",
    "sourcePath": "Algorithm/schemas/backfill_execution_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/backfill_execution_contract.schema.json",
    "sourceHash": "5aad8237fd5fa59c1aafae3d0379ac3582dc186d0ec4030ae9e100fe31161b93",
    "destinationHash": "5aad8237fd5fa59c1aafae3d0379ac3582dc186d0ec4030ae9e100fe31161b93",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "baseline_selection_contract.schema.json",
    "schemaStem": "baseline_selection_contract",
    "label": "Baseline Selection Contract",
    "schemaId": "https://taxat.dev/schemas/baseline_selection_contract.schema.json",
    "sourcePath": "Algorithm/schemas/baseline_selection_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/baseline_selection_contract.schema.json",
    "sourceHash": "1c219c5b517176385f35befd559727c5aa7f38607d2110ef2efa1c3f2410e377",
    "destinationHash": "1c219c5b517176385f35befd559727c5aa7f38607d2110ef2efa1c3f2410e377",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "build_artifact.schema.json",
    "schemaStem": "build_artifact",
    "label": "Build Artifact",
    "schemaId": "https://taxat.dev/schemas/build_artifact.schema.json",
    "sourcePath": "Algorithm/schemas/build_artifact.schema.json",
    "destinationPath": "packages/contracts-core/schemas/build_artifact.schema.json",
    "sourceHash": "c3beec556ae7f806aa1e8cb64911e1fef389ae8b92297d7cadde58f5257ed2dc",
    "destinationHash": "c3beec556ae7f806aa1e8cb64911e1fef389ae8b92297d7cadde58f5257ed2dc",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "cache_isolation_contract.schema.json",
    "schemaStem": "cache_isolation_contract",
    "label": "Cache Isolation Contract",
    "schemaId": "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/cache_isolation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/cache_isolation_contract.schema.json",
    "sourceHash": "d6ee2b1f1d0423e342016eebc1f159c93030131382a7094e78afea84ee6bd30a",
    "destinationHash": "d6ee2b1f1d0423e342016eebc1f159c93030131382a7094e78afea84ee6bd30a",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_cache_isolation_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "calculation_basis.schema.json",
    "schemaStem": "calculation_basis",
    "label": "Calculation Basis",
    "schemaId": "https://taxat.dev/schemas/calculation_basis.schema.json",
    "sourcePath": "Algorithm/schemas/calculation_basis.schema.json",
    "destinationPath": "packages/contracts-core/schemas/calculation_basis.schema.json",
    "sourceHash": "e17f23654c175b0a6bd0c05a6a581c97b121b53b02c359b1b134f2defeffd7fe",
    "destinationHash": "e17f23654c175b0a6bd0c05a6a581c97b121b53b02c359b1b134f2defeffd7fe",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "calculation_user_confirmation.schema.json",
    "schemaStem": "calculation_user_confirmation",
    "label": "Calculation User Confirmation",
    "schemaId": "https://taxat.dev/schemas/calculation_user_confirmation.schema.json",
    "sourcePath": "Algorithm/schemas/calculation_user_confirmation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/calculation_user_confirmation.schema.json",
    "sourceHash": "1b5d67e3a1f9c3a37c41ebfeb4ffc6df274008cece89aaa840055c7c17343837",
    "destinationHash": "1b5d67e3a1f9c3a37c41ebfeb4ffc6df274008cece89aaa840055c7c17343837",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "canary_health_summary.schema.json",
    "schemaStem": "canary_health_summary",
    "label": "Canary Health Summary",
    "schemaId": "https://taxat.dev/schemas/canary_health_summary.schema.json",
    "sourcePath": "Algorithm/schemas/canary_health_summary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/canary_health_summary.schema.json",
    "sourceHash": "dae0f978bc9c36ce668547a631f996ab2d657274a9ed55c2264d9466ccce81b8",
    "destinationHash": "dae0f978bc9c36ce668547a631f996ab2d657274a9ed55c2264d9466ccce81b8",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "candidate_fact.schema.json",
    "schemaStem": "candidate_fact",
    "label": "Candidate Fact",
    "schemaId": "https://taxat.dev/schemas/candidate_fact.schema.json",
    "sourcePath": "Algorithm/schemas/candidate_fact.schema.json",
    "destinationPath": "packages/contracts-core/schemas/candidate_fact.schema.json",
    "sourceHash": "b0ebfc0d9fc8ec7cdcb1c0fe76853b677cdf3c5bdd57f1a48e4557cb5043f5dc",
    "destinationHash": "b0ebfc0d9fc8ec7cdcb1c0fe76853b677cdf3c5bdd57f1a48e4557cb5043f5dc",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/adjustmentBinding",
      "#/$defs/promotionReadiness",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [
      "sample_candidate_fact.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "candidate_fact_set.schema.json",
    "schemaStem": "candidate_fact_set",
    "label": "Candidate Fact Set",
    "schemaId": "https://taxat.dev/schemas/candidate_fact_set.schema.json",
    "sourcePath": "Algorithm/schemas/candidate_fact_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/candidate_fact_set.schema.json",
    "sourceHash": "c7f5ba11892b262a54cb34920735c6c7a3a5a301fb92b13df7e14988fec6b59c",
    "destinationHash": "c7f5ba11892b262a54cb34920735c6c7a3a5a301fb92b13df7e14988fec6b59c",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./candidate_fact.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "candidate_fact.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "canonical_fact.schema.json",
    "schemaStem": "canonical_fact",
    "label": "Canonical Fact",
    "schemaId": "https://taxat.dev/schemas/canonical_fact.schema.json",
    "sourcePath": "Algorithm/schemas/canonical_fact.schema.json",
    "destinationPath": "packages/contracts-core/schemas/canonical_fact.schema.json",
    "sourceHash": "6edafb833e2866207b7a6164d1c5e10b8979a2cdb8ef6bab79d1a91b023125e7",
    "destinationHash": "6edafb833e2866207b7a6164d1c5e10b8979a2cdb8ef6bab79d1a91b023125e7",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/adjustmentBinding",
      "#/$defs/promotionRecord",
      "./retention_tag.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "retention_tag.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [
      "sample_canonical_fact.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "canonical_fact_set.schema.json",
    "schemaStem": "canonical_fact_set",
    "label": "Canonical Fact Set",
    "schemaId": "https://taxat.dev/schemas/canonical_fact_set.schema.json",
    "sourcePath": "Algorithm/schemas/canonical_fact_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/canonical_fact_set.schema.json",
    "sourceHash": "be94df6e04292bb3d5ba408b1dfa3357131bdac7a3a900abdc4e7b4a5b2e5838",
    "destinationHash": "be94df6e04292bb3d5ba408b1dfa3357131bdac7a3a900abdc4e7b4a5b2e5838",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./canonical_fact.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "canonical_fact.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_approval_pack.schema.json",
    "schemaStem": "client_approval_pack",
    "label": "Client Approval Pack",
    "schemaId": "https://taxat.dev/schemas/client_approval_pack.schema.json",
    "sourcePath": "Algorithm/schemas/client_approval_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_approval_pack.schema.json",
    "sourceHash": "ffc0b5884b0dab94cc27ad9cc85bd7d2ed3b5dabcca1e159388a01120d172b1f",
    "destinationHash": "ffc0b5884b0dab94cc27ad9cc85bd7d2ed3b5dabcca1e159388a01120d172b1f",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "artifact_affordance_contract.schema.json",
      "artifact_selection_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "externalization_governance_contract.schema.json",
      "portal_language_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_compatibility_matrix.schema.json",
    "schemaStem": "client_compatibility_matrix",
    "label": "Client Compatibility Matrix",
    "schemaId": "https://taxat.dev/schemas/client_compatibility_matrix.schema.json",
    "sourcePath": "Algorithm/schemas/client_compatibility_matrix.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_compatibility_matrix.schema.json",
    "sourceHash": "f3f9d9ec2381f28c47a98f434db2cd0ae906d35cd2a2c8c8350b450306e625cf",
    "destinationHash": "f3f9d9ec2381f28c47a98f434db2cd0ae906d35cd2a2c8c8350b450306e625cf",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/matrixRow",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json",
      "schema_bundle_compatibility_gate_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_document_request.schema.json",
    "schemaStem": "client_document_request",
    "label": "Client Document Request",
    "schemaId": "https://taxat.dev/schemas/client_document_request.schema.json",
    "sourcePath": "Algorithm/schemas/client_document_request.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_document_request.schema.json",
    "sourceHash": "85398a562c880754b21b13e9d4831d93e0df2c560821983a3b3517ab80eb1c27",
    "destinationHash": "85398a562c880754b21b13e9d4831d93e0df2c560821983a3b3517ab80eb1c27",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "artifact_affordance_contract.schema.json",
      "artifact_selection_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "externalization_governance_contract.schema.json",
      "portal_language_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_onboarding_journey.schema.json",
    "schemaStem": "client_onboarding_journey",
    "label": "Client Onboarding Journey",
    "schemaId": "https://taxat.dev/schemas/client_onboarding_journey.schema.json",
    "sourcePath": "Algorithm/schemas/client_onboarding_journey.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_onboarding_journey.schema.json",
    "sourceHash": "074aca6d593700df000b390594b693ffd20dc2a39daef8c06a480729f9a10444",
    "destinationHash": "074aca6d593700df000b390594b693ffd20dc2a39daef8c06a480729f9a10444",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/stepCode",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "customer_safe_projection_contract.schema.json",
      "portal_language_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_portal_workspace.schema.json",
    "schemaStem": "client_portal_workspace",
    "label": "Client Portal Workspace",
    "schemaId": "https://taxat.dev/schemas/client_portal_workspace.schema.json",
    "sourcePath": "Algorithm/schemas/client_portal_workspace.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_portal_workspace.schema.json",
    "sourceHash": "fd0d29044ef9bc4a3865beca37e7365f19de90e07c8ef34e210b49a679bdd45e",
    "destinationHash": "fd0d29044ef9bc4a3865beca37e7365f19de90e07c8ef34e210b49a679bdd45e",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/actionToken",
      "#/$defs/approvalCenter",
      "#/$defs/approvalPack",
      "#/$defs/caseContextPanel",
      "#/$defs/contactOption",
      "#/$defs/contextFallbackTarget",
      "#/$defs/contextNarrowScreenMode",
      "#/$defs/contextRouteCode",
      "#/$defs/documentCenter",
      "#/$defs/documentRequest",
      "#/$defs/draftResume",
      "#/$defs/helpSurfaceCode",
      "#/$defs/identityContext",
      "#/$defs/limitationNotice",
      "#/$defs/navigationTab",
      "#/$defs/onboardingJourney",
      "#/$defs/onboardingStepCode",
      "#/$defs/progressStep",
      "#/$defs/recoveryPosture",
      "#/$defs/reliabilitySummary",
      "#/$defs/routeCode",
      "#/$defs/routeContext",
      "#/$defs/settlementState",
      "#/$defs/statusHero",
      "#/$defs/supportPanel",
      "#/$defs/task",
      "#/$defs/taskGroup",
      "#/$defs/timelineEvent",
      "#/$defs/uploadItem",
      "#/$defs/workspacePosture",
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
      "https://taxat.dev/schemas/portal_interaction_layer.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
      "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
      "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
      "https://taxat.dev/schemas/upload_request_binding_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "artifact_affordance_contract.schema.json",
      "artifact_selection_contract.schema.json",
      "cache_isolation_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "externalization_governance_contract.schema.json",
      "focus_restoration_contract.schema.json",
      "portal_interaction_layer.schema.json",
      "portal_language_contract.schema.json",
      "route_stability_contract.schema.json",
      "semantic_accessibility_contract.schema.json",
      "shell_dominance_contract.schema.json",
      "shell_state_taxonomy_contract.schema.json",
      "upload_request_binding_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_timeline_event.schema.json",
    "schemaStem": "client_timeline_event",
    "label": "Client Timeline Event",
    "schemaId": "https://taxat.dev/schemas/client_timeline_event.schema.json",
    "sourcePath": "Algorithm/schemas/client_timeline_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_timeline_event.schema.json",
    "sourceHash": "394ff4411a746a2f7d3ef3bec12cba6b0d959f3c4b0d565f1d21b284d4ceb901",
    "destinationHash": "394ff4411a746a2f7d3ef3bec12cba6b0d959f3c4b0d565f1d21b284d4ceb901",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/authority_truth_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_truth_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "portal_language_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "client_upload_session.schema.json",
    "schemaStem": "client_upload_session",
    "label": "Client Upload Session",
    "schemaId": "https://taxat.dev/schemas/client_upload_session.schema.json",
    "sourcePath": "Algorithm/schemas/client_upload_session.schema.json",
    "destinationPath": "packages/contracts-core/schemas/client_upload_session.schema.json",
    "sourceHash": "fdddce78ce8db065d6443d6674cb535f0b1276ff926211fe1bd0272758179552",
    "destinationHash": "fdddce78ce8db065d6443d6674cb535f0b1276ff926211fe1bd0272758179552",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/upload_request_binding_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "upload_request_binding_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_activity_slice.schema.json",
    "schemaStem": "collaboration_activity_slice",
    "label": "Collaboration Activity Slice",
    "schemaId": "https://taxat.dev/schemas/collaboration_activity_slice.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_activity_slice.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_activity_slice.schema.json",
    "sourceHash": "0440134b8b268183385279b5fd5ef4cc72a0743170adf10473d2c4714d4eb23f",
    "destinationHash": "0440134b8b268183385279b5fd5ef4cc72a0743170adf10473d2c4714d4eb23f",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/activeFilters",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "customer_safe_projection_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_attachment.schema.json",
    "schemaStem": "collaboration_attachment",
    "label": "Collaboration Attachment",
    "schemaId": "https://taxat.dev/schemas/collaboration_attachment.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_attachment.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_attachment.schema.json",
    "sourceHash": "f8d97e1fe2bb45987dcc9f2a3db9cb0d28204f453fd99d2918e9ef9699de09d7",
    "destinationHash": "f8d97e1fe2bb45987dcc9f2a3db9cb0d28204f453fd99d2918e9ef9699de09d7",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_attachment_slice.schema.json",
    "schemaStem": "collaboration_attachment_slice",
    "label": "Collaboration Attachment Slice",
    "schemaId": "https://taxat.dev/schemas/collaboration_attachment_slice.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_attachment_slice.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_attachment_slice.schema.json",
    "sourceHash": "036d2cb7dafe1541e284cea12b57d74ca84e94608c0063d16a6a2d58d9ed8dcc",
    "destinationHash": "036d2cb7dafe1541e284cea12b57d74ca84e94608c0063d16a6a2d58d9ed8dcc",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/activeFilters",
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "artifact_affordance_contract.schema.json",
      "artifact_selection_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_entry.schema.json",
    "schemaStem": "collaboration_entry",
    "label": "Collaboration Entry",
    "schemaId": "https://taxat.dev/schemas/collaboration_entry.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_entry.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_entry.schema.json",
    "sourceHash": "5f16f8f72a8d6d74606a69bab0094e0685e2794dd9b402c8a0ae1abf19279eb8",
    "destinationHash": "5f16f8f72a8d6d74606a69bab0094e0685e2794dd9b402c8a0ae1abf19279eb8",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_queue_projection_contract.schema.json",
    "schemaStem": "collaboration_queue_projection_contract",
    "label": "Collaboration Queue Projection Contract",
    "schemaId": "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_queue_projection_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_queue_projection_contract.schema.json",
    "sourceHash": "faee41ad3d85a1b29c9e7be58468a2f7698f99d279be4a0ffcf70cf4ce051227",
    "destinationHash": "faee41ad3d85a1b29c9e7be58468a2f7698f99d279be4a0ffcf70cf4ce051227",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/collaboration_routing_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "collaboration_routing_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_routing_contract.schema.json",
    "schemaStem": "collaboration_routing_contract",
    "label": "Collaboration Routing Contract",
    "schemaId": "https://taxat.dev/schemas/collaboration_routing_contract.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_routing_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_routing_contract.schema.json",
    "sourceHash": "0c282041910d617200386bd615b00e91396767e7b51d886177832f355ea0909d",
    "destinationHash": "0c282041910d617200386bd615b00e91396767e7b51d886177832f355ea0909d",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collaboration_thread.schema.json",
    "schemaStem": "collaboration_thread",
    "label": "Collaboration Thread",
    "schemaId": "https://taxat.dev/schemas/collaboration_thread.schema.json",
    "sourcePath": "Algorithm/schemas/collaboration_thread.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collaboration_thread.schema.json",
    "sourceHash": "4241551fc3d68764f6f82cb53ba6a83f69ce2e3185bc4501e4fd504c7ba58231",
    "destinationHash": "4241551fc3d68764f6f82cb53ba6a83f69ce2e3185bc4501e4fd504c7ba58231",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "collection_boundary.schema.json",
    "schemaStem": "collection_boundary",
    "label": "Collection Boundary",
    "schemaId": "https://taxat.dev/schemas/collection_boundary.schema.json",
    "sourcePath": "Algorithm/schemas/collection_boundary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/collection_boundary.schema.json",
    "sourceHash": "77dcb01e5a32802132ced8c55d69d39154d9585161d45564eb28b6d8aa8f0088",
    "destinationHash": "77dcb01e5a32802132ced8c55d69d39154d9585161d45564eb28b6d8aa8f0088",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/sourceBoundary",
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/partitionScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/sourceClassOrNull",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "late_data_policy_binding.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "command_envelope.schema.json",
    "schemaStem": "command_envelope",
    "label": "Command Envelope",
    "schemaId": "https://taxat.dev/schemas/command_envelope.schema.json",
    "sourcePath": "Algorithm/schemas/command_envelope.schema.json",
    "destinationPath": "packages/contracts-core/schemas/command_envelope.schema.json",
    "sourceHash": "7bcc8aca262314bba58ef65c15f0c3d035ed76ea3989ec64a003f89b0835afb1",
    "destinationHash": "7bcc8aca262314bba58ef65c15f0c3d035ed76ea3989ec64a003f89b0835afb1",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
      "https://taxat.dev/schemas/mutation_precondition_binding.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "governance_mutation_basis_contract.schema.json",
      "mutation_precondition_binding.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "command_truth_boundary_contract.schema.json",
    "schemaStem": "command_truth_boundary_contract",
    "label": "Command Truth Boundary Contract",
    "schemaId": "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
    "sourcePath": "Algorithm/schemas/command_truth_boundary_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/command_truth_boundary_contract.schema.json",
    "sourceHash": "9aee47831658515a13123efd6fa028dea43706b7f6e030a0e788cba697a02232",
    "destinationHash": "9aee47831658515a13123efd6fa028dea43706b7f6e030a0e788cba697a02232",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/authoritativeRecordFamily",
      "#/$defs/observableProjectionFamily"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "compensation_record.schema.json",
    "schemaStem": "compensation_record",
    "label": "Compensation Record",
    "schemaId": "https://taxat.dev/schemas/compensation_record.schema.json",
    "sourcePath": "Algorithm/schemas/compensation_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/compensation_record.schema.json",
    "sourceHash": "a4ee32a01880d7f4b65b3da141d2f4dce1af5bd49b716f36e4417e0237e30146",
    "destinationHash": "a4ee32a01880d7f4b65b3da141d2f4dce1af5bd49b716f36e4417e0237e30146",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "https://taxat.dev/schemas/failure_resolution_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "failure_resolution_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "compute_result.schema.json",
    "schemaStem": "compute_result",
    "label": "Compute Result",
    "schemaId": "https://taxat.dev/schemas/compute_result.schema.json",
    "sourcePath": "Algorithm/schemas/compute_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/compute_result.schema.json",
    "sourceHash": "ad76df96a95d97fde3b86c5a65394097c6c62969fed0bfdd7e523a546f4b1e21",
    "destinationHash": "ad76df96a95d97fde3b86c5a65394097c6c62969fed0bfdd7e523a546f4b1e21",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "./schema_bundle.schema.json#/$defs/moneyProfile",
      "./schema_bundle.schema.json#/$defs/moneyValue"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [
      "sample_compute_result.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "config_change_request.schema.json",
    "schemaStem": "config_change_request",
    "label": "Config Change Request",
    "schemaId": "https://taxat.dev/schemas/config_change_request.schema.json",
    "sourcePath": "Algorithm/schemas/config_change_request.schema.json",
    "destinationPath": "packages/contracts-core/schemas/config_change_request.schema.json",
    "sourceHash": "93226f7dd63647dcc8861f2241aaa60be2fbd27738fd600abaea363f9513f862",
    "destinationHash": "93226f7dd63647dcc8861f2241aaa60be2fbd27738fd600abaea363f9513f862",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "config_freeze.schema.json",
    "schemaStem": "config_freeze",
    "label": "Config Freeze",
    "schemaId": "https://taxat.dev/schemas/config_freeze.schema.json",
    "sourcePath": "Algorithm/schemas/config_freeze.schema.json",
    "destinationPath": "packages/contracts-core/schemas/config_freeze.schema.json",
    "sourceHash": "1f26e4494c27f052e93e42c424741fb32830b22a938be7c46c2754ca0d531c3e",
    "destinationHash": "1f26e4494c27f052e93e42c424741fb32830b22a938be7c46c2754ca0d531c3e",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/configEntry"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_config_freeze.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "config_version.schema.json",
    "schemaStem": "config_version",
    "label": "Config Version",
    "schemaId": "https://taxat.dev/schemas/config_version.schema.json",
    "sourcePath": "Algorithm/schemas/config_version.schema.json",
    "destinationPath": "packages/contracts-core/schemas/config_version.schema.json",
    "sourceHash": "0f529937c9f6f689a0e1fbf82c23a121b7c0fea1175aa9305168cfff69d1ffd0",
    "destinationHash": "0f529937c9f6f689a0e1fbf82c23a121b7c0fea1175aa9305168cfff69d1ffd0",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "conflict_record.schema.json",
    "schemaStem": "conflict_record",
    "label": "Conflict Record",
    "schemaId": "https://taxat.dev/schemas/conflict_record.schema.json",
    "sourcePath": "Algorithm/schemas/conflict_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/conflict_record.schema.json",
    "sourceHash": "ff7eb1d4469526c3102b7a3cf7eb64c4d6e59d6aeede19e238dcaabd383838c9",
    "destinationHash": "ff7eb1d4469526c3102b7a3cf7eb64c4d6e59d6aeede19e238dcaabd383838c9",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "conflict_set.schema.json",
    "schemaStem": "conflict_set",
    "label": "Conflict Set",
    "schemaId": "https://taxat.dev/schemas/conflict_set.schema.json",
    "sourcePath": "Algorithm/schemas/conflict_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/conflict_set.schema.json",
    "sourceHash": "9adb3f8124c70e4f71d59da9e3e97f0162879c031bf8c62d81bc3e9c562bb5b4",
    "destinationHash": "9adb3f8124c70e4f71d59da9e3e97f0162879c031bf8c62d81bc3e9c562bb5b4",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./conflict_record.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "conflict_record.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [
      "sample_conflict_set.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "connector_binding.schema.json",
    "schemaStem": "connector_binding",
    "label": "Connector Binding",
    "schemaId": "https://taxat.dev/schemas/connector_binding.schema.json",
    "sourcePath": "Algorithm/schemas/connector_binding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/connector_binding.schema.json",
    "sourceHash": "5acd5da296acb854028adc3f1e848c1da3557e47996a7e78510ecb45b4ba3b49",
    "destinationHash": "5acd5da296acb854028adc3f1e848c1da3557e47996a7e78510ecb45b4ba3b49",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "constraint_traceability_register.schema.json",
    "schemaStem": "constraint_traceability_register",
    "label": "Constraint Traceability Register",
    "schemaId": "https://taxat.dev/schemas/constraint_traceability_register.schema.json",
    "sourcePath": "Algorithm/schemas/constraint_traceability_register.schema.json",
    "destinationPath": "packages/contracts-core/schemas/constraint_traceability_register.schema.json",
    "sourceHash": "8c2cb165ae3a12b369fe1d1e4a7806d3c5381490b276d53249eb1d9aeb096827",
    "destinationHash": "8c2cb165ae3a12b369fe1d1e4a7806d3c5381490b276d53249eb1d9aeb096827",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/constraintEntry",
      "#/$defs/traceabilityRef"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "context_bar_state.schema.json",
    "schemaStem": "context_bar_state",
    "label": "Context Bar State",
    "schemaId": "https://taxat.dev/schemas/context_bar_state.schema.json",
    "sourcePath": "Algorithm/schemas/context_bar_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/context_bar_state.schema.json",
    "sourceHash": "d4d16da7d94a1046bb5b8686f9be4bdce4764cc6f6f5988439253342b1fa3588",
    "destinationHash": "d4d16da7d94a1046bb5b8686f9be4bdce4764cc6f6f5988439253342b1fa3588",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "cross_device_continuity_contract.schema.json",
    "schemaStem": "cross_device_continuity_contract",
    "label": "Cross Device Continuity Contract",
    "schemaId": "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/cross_device_continuity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/cross_device_continuity_contract.schema.json",
    "sourceHash": "62be8c89a0d472a84eb5b3fca1ba4603ed3aad667048382a337c40707973ce83",
    "destinationHash": "62be8c89a0d472a84eb5b3fca1ba4603ed3aad667048382a337c40707973ce83",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_cross_device_continuity_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "customer_request_list_snapshot.schema.json",
    "schemaStem": "customer_request_list_snapshot",
    "label": "Customer Request List Snapshot",
    "schemaId": "https://taxat.dev/schemas/customer_request_list_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/customer_request_list_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/customer_request_list_snapshot.schema.json",
    "sourceHash": "7a4872905f3e52ee333128546dadd28ab8ea4633757487d553675605d1c83fe2",
    "destinationHash": "7a4872905f3e52ee333128546dadd28ab8ea4633757487d553675605d1c83fe2",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/activeFilters",
      "#/$defs/artifactHistoryState",
      "#/$defs/dueState",
      "#/$defs/recoveryPosture",
      "#/$defs/requestRow",
      "#/$defs/settlementState",
      "#/$defs/statusCode",
      "https://taxat.dev/schemas/action_authority_contract.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/portal_interaction_layer.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "action_authority_contract.schema.json",
      "cache_isolation_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "portal_interaction_layer.schema.json",
      "portal_language_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "customer_safe_projection_contract.schema.json",
    "schemaStem": "customer_safe_projection_contract",
    "label": "Customer Safe Projection Contract",
    "schemaId": "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
    "sourcePath": "Algorithm/schemas/customer_safe_projection_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/customer_safe_projection_contract.schema.json",
    "sourceHash": "509f152350698005aec20351981b8db2a0f7b81ff78cd65139dcc2cbf436dbb3",
    "destinationHash": "509f152350698005aec20351981b8db2a0f7b81ff78cd65139dcc2cbf436dbb3",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/blockedSignalClass"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "decision_bundle.schema.json",
    "schemaStem": "decision_bundle",
    "label": "Decision Bundle",
    "schemaId": "https://taxat.dev/schemas/decision_bundle.schema.json",
    "sourcePath": "Algorithm/schemas/decision_bundle.schema.json",
    "destinationPath": "packages/contracts-core/schemas/decision_bundle.schema.json",
    "sourceHash": "175c3018abea47d20ef8538949e31da9c3ab101c87550d7241b23d412010392f",
    "destinationHash": "175c3018abea47d20ef8538949e31da9c3ab101c87550d7241b23d412010392f",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "decision_explainability_contract.schema.json",
      "execution_mode_boundary_contract.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [
      "sample_decision_bundle.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "decision_explainability_contract.schema.json",
    "schemaStem": "decision_explainability_contract",
    "label": "Decision Explainability Contract",
    "schemaId": "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
    "sourcePath": "Algorithm/schemas/decision_explainability_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/decision_explainability_contract.schema.json",
    "sourceHash": "0e3a392f771fe04c24f057cf9cbcf6fc5414c2e582bb98de93b4dca3e6b2479d",
    "destinationHash": "0e3a392f771fe04c24f057cf9cbcf6fc5414c2e582bb98de93b4dca3e6b2479d",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_decision_explainability_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "decision_summary_state.schema.json",
    "schemaStem": "decision_summary_state",
    "label": "Decision Summary State",
    "schemaId": "https://taxat.dev/schemas/decision_summary_state.schema.json",
    "sourcePath": "Algorithm/schemas/decision_summary_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/decision_summary_state.schema.json",
    "sourceHash": "0a38e778b730005dd065ea63a6a3bdf581bec00b88518b0611d9f43379d428de",
    "destinationHash": "0a38e778b730005dd065ea63a6a3bdf581bec00b88518b0611d9f43379d428de",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/visibleReason"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "delegation_grant.schema.json",
    "schemaStem": "delegation_grant",
    "label": "Delegation Grant",
    "schemaId": "https://taxat.dev/schemas/delegation_grant.schema.json",
    "sourcePath": "Algorithm/schemas/delegation_grant.schema.json",
    "destinationPath": "packages/contracts-core/schemas/delegation_grant.schema.json",
    "sourceHash": "0a8ff2754ea385ca0a0278cf49baed409fbbd6d9f717ef0c6fdffa8681182276",
    "destinationHash": "0a8ff2754ea385ca0a0278cf49baed409fbbd6d9f717ef0c6fdffa8681182276",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "deployment_release.schema.json",
    "schemaStem": "deployment_release",
    "label": "Deployment Release",
    "schemaId": "https://taxat.dev/schemas/deployment_release.schema.json",
    "sourcePath": "Algorithm/schemas/deployment_release.schema.json",
    "destinationPath": "packages/contracts-core/schemas/deployment_release.schema.json",
    "sourceHash": "aadebeda257a73863828b7d26a512e42abdf1c0cc06ec73768df2e8922595154",
    "destinationHash": "aadebeda257a73863828b7d26a512e42abdf1c0cc06ec73768df2e8922595154",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/recovery_governance_contract.schema.json",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "recovery_governance_contract.schema.json",
      "release_candidate_identity_contract.schema.json",
      "schema_bundle_compatibility_gate_contract.schema.json",
      "schema_reader_window_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "detail_drawer_state.schema.json",
    "schemaStem": "detail_drawer_state",
    "label": "Detail Drawer State",
    "schemaId": "https://taxat.dev/schemas/detail_drawer_state.schema.json",
    "sourcePath": "Algorithm/schemas/detail_drawer_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/detail_drawer_state.schema.json",
    "sourceHash": "73dfa5a384deca11fc8f136b73ddad3e76ed10bbc9504dce8e2b946608d2d940",
    "destinationHash": "73dfa5a384deca11fc8f136b73ddad3e76ed10bbc9504dce8e2b946608d2d940",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/detailEntry",
      "#/$defs/detailModuleCode"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "deterministic_golden_pack.schema.json",
    "schemaStem": "deterministic_golden_pack",
    "label": "Deterministic Golden Pack",
    "schemaId": "https://taxat.dev/schemas/deterministic_golden_pack.schema.json",
    "sourcePath": "Algorithm/schemas/deterministic_golden_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/deterministic_golden_pack.schema.json",
    "sourceHash": "f83bf3c5f265358b73c11893797564a683e566fbf9b23a290b84125ef7d36ea1",
    "destinationHash": "f83bf3c5f265358b73c11893797564a683e566fbf9b23a290b84125ef7d36ea1",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/cadenceFixture",
      "#/$defs/decimalFieldExpectation",
      "#/$defs/moduleFixture",
      "#/$defs/orderedArrayExpectation",
      "#/$defs/replayFixture",
      "#/$defs/stateTransitionFixture",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_deterministic_golden_pack.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "drift_baseline_envelope.schema.json",
    "schemaStem": "drift_baseline_envelope",
    "label": "Drift Baseline Envelope",
    "schemaId": "https://taxat.dev/schemas/drift_baseline_envelope.schema.json",
    "sourcePath": "Algorithm/schemas/drift_baseline_envelope.schema.json",
    "destinationPath": "packages/contracts-core/schemas/drift_baseline_envelope.schema.json",
    "sourceHash": "4f0a58614377051612837fe22f95db23839d52c2da3efc609a437a3cc60c7648",
    "destinationHash": "4f0a58614377051612837fe22f95db23839d52c2da3efc609a437a3cc60c7648",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/baseline_selection_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "baseline_selection_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "drift_baseline_selection_visualization.schema.json",
    "schemaStem": "drift_baseline_selection_visualization",
    "label": "Drift Baseline Selection Visualization",
    "schemaId": "https://taxat.dev/schemas/drift_baseline_selection_visualization.schema.json",
    "sourcePath": "Algorithm/schemas/drift_baseline_selection_visualization.schema.json",
    "destinationPath": "packages/contracts-core/schemas/drift_baseline_selection_visualization.schema.json",
    "sourceHash": "6c5718f79c5505356276ca898375df182526bc67aaf4884fbcfa4ea64b7ba940",
    "destinationHash": "6c5718f79c5505356276ca898375df182526bc67aaf4884fbcfa4ea64b7ba940",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/baselineSubmissionState",
      "#/$defs/baselineType",
      "#/$defs/candidateResult",
      "#/$defs/candidateSupersessionState",
      "#/$defs/dominanceKey",
      "#/$defs/lineageDisposition",
      "#/$defs/lineageEntry",
      "#/$defs/scopeCompatibilityState",
      "#/$defs/selectionOutcome",
      "https://taxat.dev/schemas/baseline_selection_contract.schema.json",
      "https://taxat.dev/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "baseline_selection_contract.schema.json",
      "drift_baseline_selection_visualization_basis_contract.schema.json",
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_drift_baseline_selection_visualization.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "drift_baseline_selection_visualization_basis_contract.schema.json",
    "schemaStem": "drift_baseline_selection_visualization_basis_contract",
    "label": "Drift Baseline Selection Visualization Basis Contract",
    "schemaId": "https://taxat.dev/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
    "sourceHash": "ed1bae438975cf7c318494faa7cb07ddae4254016f6701a1f195157faa6ebc12",
    "destinationHash": "ed1bae438975cf7c318494faa7cb07ddae4254016f6701a1f195157faa6ebc12",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_drift_baseline_selection_visualization_basis_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "drift_record.schema.json",
    "schemaStem": "drift_record",
    "label": "Drift Record",
    "schemaId": "https://taxat.dev/schemas/drift_record.schema.json",
    "sourcePath": "Algorithm/schemas/drift_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/drift_record.schema.json",
    "sourceHash": "dd55b48689d7c55a7afe41a937e1de1c80c05e8055fff53be0b0671506478ed2",
    "destinationHash": "dd55b48689d7c55a7afe41a937e1de1c80c05e8055fff53be0b0671506478ed2",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/fieldDelta",
      "#/$defs/planePressures",
      "./schema_bundle.schema.json#/$defs/moneyProfile",
      "./schema_bundle.schema.json#/$defs/moneyValue",
      "https://taxat.dev/schemas/amendment_eligibility_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "amendment_eligibility_contract.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "enquiry_pack.schema.json",
    "schemaStem": "enquiry_pack",
    "label": "Enquiry Pack",
    "schemaId": "https://taxat.dev/schemas/enquiry_pack.schema.json",
    "sourcePath": "Algorithm/schemas/enquiry_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/enquiry_pack.schema.json",
    "sourceHash": "868b2c4fe7ccb706b0787bc115ccc20e0fb9d022624884e5644976a8a214a353",
    "destinationHash": "868b2c4fe7ccb706b0787bc115ccc20e0fb9d022624884e5644976a8a214a353",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/limitationNote",
      "#/$defs/lineageBoundary",
      "#/$defs/omissionEntry",
      "./provenance_partition_contract.schema.json",
      "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
      "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "externalization_governance_contract.schema.json",
      "provenance_partition_contract.schema.json",
      "retention_limited_explainability_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "erasure_proof.schema.json",
    "schemaStem": "erasure_proof",
    "label": "Erasure Proof",
    "schemaId": "https://taxat.dev/schemas/erasure_proof.schema.json",
    "sourcePath": "Algorithm/schemas/erasure_proof.schema.json",
    "destinationPath": "packages/contracts-core/schemas/erasure_proof.schema.json",
    "sourceHash": "b14acee99b4f8291f68134c51c1090a4749b66858be7af9da7a790ef4c19eeca",
    "destinationHash": "b14acee99b4f8291f68134c51c1090a4749b66858be7af9da7a790ef4c19eeca",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "error_record.schema.json",
    "schemaStem": "error_record",
    "label": "Error Record",
    "schemaId": "https://taxat.dev/schemas/error_record.schema.json",
    "sourcePath": "Algorithm/schemas/error_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/error_record.schema.json",
    "sourceHash": "f0ff4f9d08f635a0b85b985738fafbf226292817153040ddd609d4af4acf281c",
    "destinationHash": "f0ff4f9d08f635a0b85b985738fafbf226292817153040ddd609d4af4acf281c",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "#/$defs/blockingEffect",
      "https://taxat.dev/schemas/failure_resolution_contract.schema.json",
      "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "failure_resolution_contract.schema.json",
      "invariant_enforcement_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "evidence_graph.schema.json",
    "schemaStem": "evidence_graph",
    "label": "Evidence Graph",
    "schemaId": "https://taxat.dev/schemas/evidence_graph.schema.json",
    "sourcePath": "Algorithm/schemas/evidence_graph.schema.json",
    "destinationPath": "packages/contracts-core/schemas/evidence_graph.schema.json",
    "sourceHash": "f551b62ae3f539c70fe6d11d313c809d0ccf895c2d9e8e6fbca83455bf67ce96",
    "destinationHash": "f551b62ae3f539c70fe6d11d313c809d0ccf895c2d9e8e6fbca83455bf67ce96",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/limitationNote",
      "#/$defs/lineageBoundary",
      "#/$defs/rankingBasisItem",
      "#/$defs/targetAssessment",
      "./proof_closure_contract.schema.json",
      "./provenance_partition_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "proof_closure_contract.schema.json",
      "provenance_partition_contract.schema.json",
      "retention_limited_explainability_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "evidence_item.schema.json",
    "schemaStem": "evidence_item",
    "label": "Evidence Item",
    "schemaId": "https://taxat.dev/schemas/evidence_item.schema.json",
    "sourcePath": "Algorithm/schemas/evidence_item.schema.json",
    "destinationPath": "packages/contracts-core/schemas/evidence_item.schema.json",
    "sourceHash": "ce99fa0dcae0c2329b0750eb9d066ee3a293f942d8c6cbe39b39320bf1a6e50c",
    "destinationHash": "ce99fa0dcae0c2329b0750eb9d066ee3a293f942d8c6cbe39b39320bf1a6e50c",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./retention_tag.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "retention_tag.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "evidence_item_set.schema.json",
    "schemaStem": "evidence_item_set",
    "label": "Evidence Item Set",
    "schemaId": "https://taxat.dev/schemas/evidence_item_set.schema.json",
    "sourcePath": "Algorithm/schemas/evidence_item_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/evidence_item_set.schema.json",
    "sourceHash": "1c2a53f4f76b5e7e10df0ab0497e8730c59f1e807430cad1a5833123b98b7b17",
    "destinationHash": "1c2a53f4f76b5e7e10df0ab0497e8730c59f1e807430cad1a5833123b98b7b17",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./evidence_item.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "evidence_item.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "exceptional_authority_grant.schema.json",
    "schemaStem": "exceptional_authority_grant",
    "label": "Exceptional Authority Grant",
    "schemaId": "https://taxat.dev/schemas/exceptional_authority_grant.schema.json",
    "sourcePath": "Algorithm/schemas/exceptional_authority_grant.schema.json",
    "destinationPath": "packages/contracts-core/schemas/exceptional_authority_grant.schema.json",
    "sourceHash": "4ac571c4c0de79a0a212bd8194dd409108127629a5dada7b891535c7963e4e43",
    "destinationHash": "4ac571c4c0de79a0a212bd8194dd409108127629a5dada7b891535c7963e4e43",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "execution_mode_boundary_contract.schema.json",
    "schemaStem": "execution_mode_boundary_contract",
    "label": "Execution Mode Boundary Contract",
    "schemaId": "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
    "sourcePath": "Algorithm/schemas/execution_mode_boundary_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/execution_mode_boundary_contract.schema.json",
    "sourceHash": "60d71142dc223155c01080d292def49fa6eaa53823d39f575a63fca5c8d4eca8",
    "destinationHash": "60d71142dc223155c01080d292def49fa6eaa53823d39f575a63fca5c8d4eca8",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "experience_cursor.schema.json",
    "schemaStem": "experience_cursor",
    "label": "Experience Cursor",
    "schemaId": "https://taxat.dev/schemas/experience_cursor.schema.json",
    "sourcePath": "Algorithm/schemas/experience_cursor.schema.json",
    "destinationPath": "packages/contracts-core/schemas/experience_cursor.schema.json",
    "sourceHash": "60057dfc5655cd1617426dacc34a92af2c5697b24a1ef6f3ab302d6ef92ceb22",
    "destinationHash": "60057dfc5655cd1617426dacc34a92af2c5697b24a1ef6f3ab302d6ef92ceb22",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "native_cache_hydration_contract.schema.json",
      "route_stability_contract.schema.json",
      "stream_recovery_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "experience_delta.schema.json",
    "schemaStem": "experience_delta",
    "label": "Experience Delta",
    "schemaId": "https://taxat.dev/schemas/experience_delta.schema.json",
    "sourcePath": "Algorithm/schemas/experience_delta.schema.json",
    "destinationPath": "packages/contracts-core/schemas/experience_delta.schema.json",
    "sourceHash": "ef74b4f037aa98d644513856236ba44c1c6518ee738edbfd87b71c1b41a068ec",
    "destinationHash": "ef74b4f037aa98d644513856236ba44c1c6518ee738edbfd87b71c1b41a068ec",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/actionStripPayload",
      "#/$defs/actionToken",
      "#/$defs/attentionPolicy",
      "#/$defs/cognitiveBudget",
      "#/$defs/contextBarPayload",
      "#/$defs/decisionSummaryPayload",
      "#/$defs/detailDrawerPayload",
      "#/$defs/detailModule",
      "#/$defs/detailModuleCode",
      "#/$defs/emptyStateKind",
      "#/$defs/lowNoiseSurfaceCode",
      "#/$defs/reasonItem",
      "#/$defs/surfaceUpdate",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "experience_stream_event.schema.json",
    "schemaStem": "experience_stream_event",
    "label": "Experience Stream Event",
    "schemaId": "https://taxat.dev/schemas/experience_stream_event.schema.json",
    "sourcePath": "Algorithm/schemas/experience_stream_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/experience_stream_event.schema.json",
    "sourceHash": "21494b4d725acca39deb7b31108f1bf0b779cbb4ebf735f756b7913760f3ba0b",
    "destinationHash": "21494b4d725acca39deb7b31108f1bf0b779cbb4ebf735f756b7913760f3ba0b",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "route_stability_contract.schema.json",
      "stream_recovery_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "externalization_governance_contract.schema.json",
    "schemaStem": "externalization_governance_contract",
    "label": "Externalization Governance Contract",
    "schemaId": "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
    "sourcePath": "Algorithm/schemas/externalization_governance_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/externalization_governance_contract.schema.json",
    "sourceHash": "973875f67a124bfdb5b2477e2c3457210cf1aa183f2c04ebe46b860546494b2a",
    "destinationHash": "973875f67a124bfdb5b2477e2c3457210cf1aa183f2c04ebe46b860546494b2a",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "failure_investigation.schema.json",
    "schemaStem": "failure_investigation",
    "label": "Failure Investigation",
    "schemaId": "https://taxat.dev/schemas/failure_investigation.schema.json",
    "sourcePath": "Algorithm/schemas/failure_investigation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/failure_investigation.schema.json",
    "sourceHash": "4408a97aad3eaeec2a269e73db3bd44163792e958db1192d75a30d02371b5849",
    "destinationHash": "4408a97aad3eaeec2a269e73db3bd44163792e958db1192d75a30d02371b5849",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "https://taxat.dev/schemas/failure_resolution_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "failure_resolution_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "failure_lifecycle_dashboard.schema.json",
    "schemaStem": "failure_lifecycle_dashboard",
    "label": "Failure Lifecycle Dashboard",
    "schemaId": "https://taxat.dev/schemas/failure_lifecycle_dashboard.schema.json",
    "sourcePath": "Algorithm/schemas/failure_lifecycle_dashboard.schema.json",
    "destinationPath": "packages/contracts-core/schemas/failure_lifecycle_dashboard.schema.json",
    "sourceHash": "eaf04798471c8509a9ef22e7c6ed20f1e1cc833449d7f0b4bae29606ed25a2a9",
    "destinationHash": "eaf04798471c8509a9ef22e7c6ed20f1e1cc833449d7f0b4bae29606ed25a2a9",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "#/$defs/acceptedRiskPosture",
      "#/$defs/blockingScope",
      "#/$defs/closurePosture",
      "#/$defs/compensationPosture",
      "#/$defs/currentOwner",
      "#/$defs/investigationPosture",
      "#/$defs/lineageRefs",
      "#/$defs/nextLegalAction",
      "#/$defs/ownerType",
      "#/$defs/remediationSummary",
      "#/$defs/sourceArtifactType",
      "#/$defs/stateSource",
      "#/$defs/workflowCoordination"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_failure_lifecycle_dashboard.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "failure_resolution_contract.schema.json",
    "schemaStem": "failure_resolution_contract",
    "label": "Failure Resolution Contract",
    "schemaId": "https://taxat.dev/schemas/failure_resolution_contract.schema.json",
    "sourcePath": "Algorithm/schemas/failure_resolution_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/failure_resolution_contract.schema.json",
    "sourceHash": "8f2aa4dfc10855f3385abe43ad110e6317c3391b5ee0b5911662a1f565fb896f",
    "destinationHash": "8f2aa4dfc10855f3385abe43ad110e6317c3391b5ee0b5911662a1f565fb896f",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_failure_resolution_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "feature_flag_snapshot.schema.json",
    "schemaStem": "feature_flag_snapshot",
    "label": "Feature Flag Snapshot",
    "schemaId": "https://taxat.dev/schemas/feature_flag_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/feature_flag_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/feature_flag_snapshot.schema.json",
    "sourceHash": "78887a7dd894d2e27f63927e213319c44fde362719cc0d3d6bab1756b39731ce",
    "destinationHash": "78887a7dd894d2e27f63927e213319c44fde362719cc0d3d6bab1756b39731ce",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/entry",
      "#/$defs/jsonValue"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_feature_flag_snapshot.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "filing_case.schema.json",
    "schemaStem": "filing_case",
    "label": "Filing Case",
    "schemaId": "https://taxat.dev/schemas/filing_case.schema.json",
    "sourcePath": "Algorithm/schemas/filing_case.schema.json",
    "destinationPath": "packages/contracts-core/schemas/filing_case.schema.json",
    "sourceHash": "4ac49e59054e9e251f437bc8aeb2108a1bc8284d8450c2cb31bbafb44579d598",
    "destinationHash": "4ac49e59054e9e251f437bc8aeb2108a1bc8284d8450c2cb31bbafb44579d598",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "filing_notice_resolution.schema.json",
    "schemaStem": "filing_notice_resolution",
    "label": "Filing Notice Resolution",
    "schemaId": "https://taxat.dev/schemas/filing_notice_resolution.schema.json",
    "sourcePath": "Algorithm/schemas/filing_notice_resolution.schema.json",
    "destinationPath": "packages/contracts-core/schemas/filing_notice_resolution.schema.json",
    "sourceHash": "c20cb5718eb58ce5b11f4a8909500fedf18f41e52e1a9ef52cf4b1439698bb0f",
    "destinationHash": "c20cb5718eb58ce5b11f4a8909500fedf18f41e52e1a9ef52cf4b1439698bb0f",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "filing_notice_step.schema.json",
    "schemaStem": "filing_notice_step",
    "label": "Filing Notice Step",
    "schemaId": "https://taxat.dev/schemas/filing_notice_step.schema.json",
    "sourcePath": "Algorithm/schemas/filing_notice_step.schema.json",
    "destinationPath": "packages/contracts-core/schemas/filing_notice_step.schema.json",
    "sourceHash": "3cbf1abd3f5e335c626cf154b8c5fe0b2f53e19a41dc48cfbb67e1714258a4b9",
    "destinationHash": "3cbf1abd3f5e335c626cf154b8c5fe0b2f53e19a41dc48cfbb67e1714258a4b9",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "filing_packet.schema.json",
    "schemaStem": "filing_packet",
    "label": "Filing Packet",
    "schemaId": "https://taxat.dev/schemas/filing_packet.schema.json",
    "sourcePath": "Algorithm/schemas/filing_packet.schema.json",
    "destinationPath": "packages/contracts-core/schemas/filing_packet.schema.json",
    "sourceHash": "4ffab96fe91fcf225680c0365635275ecf93b626c8e14d2a698f5d26e26278eb",
    "destinationHash": "4ffab96fe91fcf225680c0365635275ecf93b626c8e14d2a698f5d26e26278eb",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "focus_restoration_contract.schema.json",
    "schemaStem": "focus_restoration_contract",
    "label": "Focus Restoration Contract",
    "schemaId": "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
    "sourcePath": "Algorithm/schemas/focus_restoration_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/focus_restoration_contract.schema.json",
    "sourceHash": "d6de8729efa37d6b4154c7adb4ec6a93423919ee6557b5d09a26fdf16eaab7ef",
    "destinationHash": "d6de8729efa37d6b4154c7adb4ec6a93423919ee6557b5d09a26fdf16eaab7ef",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "focus_restore_return_target_harness.schema.json",
    "schemaStem": "focus_restore_return_target_harness",
    "label": "Focus Restore Return Target Harness",
    "schemaId": "https://taxat.dev/schemas/focus_restore_return_target_harness.schema.json",
    "sourcePath": "Algorithm/schemas/focus_restore_return_target_harness.schema.json",
    "destinationPath": "packages/contracts-core/schemas/focus_restore_return_target_harness.schema.json",
    "sourceHash": "d5ebd72b42c2b8999c4f1033f251d7e89954996bb49e678161e512f71ea34f20",
    "destinationHash": "d5ebd72b42c2b8999c4f1033f251d7e89954996bb49e678161e512f71ea34f20",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/activeFocusLockKind",
      "#/$defs/expectedTargetKind",
      "#/$defs/focusScope",
      "#/$defs/harnessCase",
      "#/$defs/modality",
      "#/$defs/objectLossState",
      "#/$defs/restorationDisposition",
      "#/$defs/stateSnapshot",
      "#/$defs/supportSurfaceKind",
      "#/$defs/surfaceType",
      "#/$defs/triggerAction"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_focus_restore_return_target_harness.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "forecast_set.schema.json",
    "schemaStem": "forecast_set",
    "label": "Forecast Set",
    "schemaId": "https://taxat.dev/schemas/forecast_set.schema.json",
    "sourcePath": "Algorithm/schemas/forecast_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/forecast_set.schema.json",
    "sourceHash": "e3d40985841690f8f7afaee3fe993e0170a4ee23eb0a9bc0ba2edd7a93b7b7dd",
    "destinationHash": "e3d40985841690f8f7afaee3fe993e0170a4ee23eb0a9bc0ba2edd7a93b7b7dd",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/pointForecast",
      "#/$defs/scenario",
      "#/$defs/scenarioSeed",
      "#/$defs/scenarioValue",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "./schema_bundle.schema.json#/$defs/moneyProfile",
      "./schema_bundle.schema.json#/$defs/moneyValue"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "gate_admissibility_record.schema.json",
    "schemaStem": "gate_admissibility_record",
    "label": "Gate Admissibility Record",
    "schemaId": "https://taxat.dev/schemas/gate_admissibility_record.schema.json",
    "sourcePath": "Algorithm/schemas/gate_admissibility_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/gate_admissibility_record.schema.json",
    "sourceHash": "8f4832153cb12678309654a6fc3a8da810ad3e29f2ae026eed1920ee500167ff",
    "destinationHash": "8f4832153cb12678309654a6fc3a8da810ad3e29f2ae026eed1920ee500167ff",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_sandbox_coverage_contract.schema.json",
      "release_candidate_identity_contract.schema.json",
      "schema_bundle_compatibility_gate_contract.schema.json",
      "schema_reader_window_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "gate_decision_record.schema.json",
    "schemaStem": "gate_decision_record",
    "label": "Gate Decision Record",
    "schemaId": "https://taxat.dev/schemas/gate_decision_record.schema.json",
    "sourcePath": "Algorithm/schemas/gate_decision_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/gate_decision_record.schema.json",
    "sourceHash": "b7a32a1995617d4e480527da97335aaec796bfe2f91c3f0c75bd8f86c7fbcf0e",
    "destinationHash": "b7a32a1995617d4e480527da97335aaec796bfe2f91c3f0c75bd8f86c7fbcf0e",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
      "https://taxat.dev/schemas/gate_semantics_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "decision_explainability_contract.schema.json",
      "gate_semantics_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "gate_semantics_contract.schema.json",
    "schemaStem": "gate_semantics_contract",
    "label": "Gate Semantics Contract",
    "schemaId": "https://taxat.dev/schemas/gate_semantics_contract.schema.json",
    "sourcePath": "Algorithm/schemas/gate_semantics_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/gate_semantics_contract.schema.json",
    "sourceHash": "1dc4ae82eee7f90560117ce92c9bce34f67f695330e24787680076e9c3d59671",
    "destinationHash": "1dc4ae82eee7f90560117ce92c9bce34f67f695330e24787680076e9c3d59671",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "governance_access_simulation.schema.json",
    "schemaStem": "governance_access_simulation",
    "label": "Governance Access Simulation",
    "schemaId": "https://taxat.dev/schemas/governance_access_simulation.schema.json",
    "sourcePath": "Algorithm/schemas/governance_access_simulation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/governance_access_simulation.schema.json",
    "sourceHash": "55616c7b0580b9de0f26f63079a791f68bded02f3cb803c25dee8259bd2665cc",
    "destinationHash": "55616c7b0580b9de0f26f63079a791f68bded02f3cb803c25dee8259bd2665cc",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/authorityChainLayerBase",
      "#/$defs/authorityChainLayerStack",
      "#/$defs/authorityOfRecordOutcomeLayer",
      "#/$defs/chainLayerOutcome",
      "#/$defs/clientDelegationCoverageLayer",
      "#/$defs/externalAuthorityLinkReadinessLayer",
      "#/$defs/mutationHazard",
      "#/$defs/sessionAuthnLayer",
      "#/$defs/simulatorPosture",
      "#/$defs/tenantOperationalAuthorityLayer",
      "./authorization_decision.schema.json",
      "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json",
      "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
      "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_layer_boundary_contract.schema.json",
      "authorization_decision.schema.json",
      "governance_mutation_basis_contract.schema.json",
      "governance_mutation_hazard_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "governance_interaction_layer.schema.json",
    "schemaStem": "governance_interaction_layer",
    "label": "Governance Interaction Layer",
    "schemaId": "https://taxat.dev/schemas/governance_interaction_layer.schema.json",
    "sourcePath": "Algorithm/schemas/governance_interaction_layer.schema.json",
    "destinationPath": "packages/contracts-core/schemas/governance_interaction_layer.schema.json",
    "sourceHash": "c0a51af44c626ce29574e93da9bdab4aa0afb58f94bc5c0697864a8de1efdce5",
    "destinationHash": "c0a51af44c626ce29574e93da9bdab4aa0afb58f94bc5c0697864a8de1efdce5",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "interaction_layer_foundation_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "governance_mutation_basis_contract.schema.json",
    "schemaStem": "governance_mutation_basis_contract",
    "label": "Governance Mutation Basis Contract",
    "schemaId": "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/governance_mutation_basis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/governance_mutation_basis_contract.schema.json",
    "sourceHash": "1064ce38b226d23fcb44181e3d6b41353a6a567cc99e0e1bc702350fecddbfbc",
    "destinationHash": "1064ce38b226d23fcb44181e3d6b41353a6a567cc99e0e1bc702350fecddbfbc",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "governance_mutation_hazard_contract.schema.json",
    "schemaStem": "governance_mutation_hazard_contract",
    "label": "Governance Mutation Hazard Contract",
    "schemaId": "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json",
    "sourcePath": "Algorithm/schemas/governance_mutation_hazard_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/governance_mutation_hazard_contract.schema.json",
    "sourceHash": "d944e53b431440ebfa2e437888ce2726377e69e88d3aed78877373d9b5320b5a",
    "destinationHash": "d944e53b431440ebfa2e437888ce2726377e69e88d3aed78877373d9b5320b5a",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/approvalTriggerCode",
      "#/$defs/boundedSafetyBlockerCode",
      "#/$defs/confidenceLimiterCode",
      "#/$defs/impactedCountClass",
      "#/$defs/riskDriverCode"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_governance_mutation_hazard_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "governance_policy_snapshot.schema.json",
    "schemaStem": "governance_policy_snapshot",
    "label": "Governance Policy Snapshot",
    "schemaId": "https://taxat.dev/schemas/governance_policy_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/governance_policy_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/governance_policy_snapshot.schema.json",
    "sourceHash": "7c1c26fae0b4f05b0cdfdba8ba26090359cafb3c616bc11083a3d90746473f35",
    "destinationHash": "7c1c26fae0b4f05b0cdfdba8ba26090359cafb3c616bc11083a3d90746473f35",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/approvalComposer",
      "#/$defs/approvalRequirementNullable",
      "#/$defs/approvalRule",
      "#/$defs/blastRadiusPanel",
      "#/$defs/changeBasket",
      "#/$defs/configHistoryTimeline",
      "#/$defs/environmentBinding",
      "#/$defs/inlinePolicyHelp",
      "#/$defs/recoveryPosture",
      "#/$defs/sectionCode",
      "#/$defs/sessionSecurityPosture",
      "#/$defs/settlementState",
      "#/$defs/stagedChange",
      "#/$defs/stagedChangeGroup",
      "#/$defs/stepUpRule",
      "#/$defs/tenantConfigWorkspace",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json",
      "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
      "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "cache_isolation_contract.schema.json",
      "governance_interaction_layer.schema.json",
      "governance_mutation_basis_contract.schema.json",
      "governance_mutation_hazard_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "input_freeze.schema.json",
    "schemaStem": "input_freeze",
    "label": "Input Freeze",
    "schemaId": "https://taxat.dev/schemas/input_freeze.schema.json",
    "sourcePath": "Algorithm/schemas/input_freeze.schema.json",
    "destinationPath": "packages/contracts-core/schemas/input_freeze.schema.json",
    "sourceHash": "9caa78a33404ca8166946c590fcf07beb2b494ae695fa61ff4580ab60d33c45c",
    "destinationHash": "9caa78a33404ca8166946c590fcf07beb2b494ae695fa61ff4580ab60d33c45c",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/sourceDomainPosture",
      "./late_data_policy_binding.schema.json",
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/partitionScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/sourceClassOrNull",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "late_data_policy_binding.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "interaction_layer_foundation_contract.schema.json",
    "schemaStem": "interaction_layer_foundation_contract",
    "label": "Interaction Layer Foundation Contract",
    "schemaId": "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/interaction_layer_foundation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/interaction_layer_foundation_contract.schema.json",
    "sourceHash": "1400be63482ef4a193e04e687caabf09957571df5e2626ea07abfcefd6bb5ff1",
    "destinationHash": "1400be63482ef4a193e04e687caabf09957571df5e2626ea07abfcefd6bb5ff1",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_interaction_layer_foundation_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "invariant_enforcement_contract.schema.json",
    "schemaStem": "invariant_enforcement_contract",
    "label": "Invariant Enforcement Contract",
    "schemaId": "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json",
    "sourcePath": "Algorithm/schemas/invariant_enforcement_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/invariant_enforcement_contract.schema.json",
    "sourceHash": "5438c9995521d16b98ceaef16984ff821d2431fce5c851813f79507e2f1c91aa",
    "destinationHash": "5438c9995521d16b98ceaef16984ff821d2431fce5c851813f79507e2f1c91aa",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_invariant_enforcement_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_consequence_summary.schema.json",
    "schemaStem": "late_data_consequence_summary",
    "label": "Late Data Consequence Summary",
    "schemaId": "https://taxat.dev/schemas/late_data_consequence_summary.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_consequence_summary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_consequence_summary.schema.json",
    "sourceHash": "6fba4f5d4c59c261243981380cefb5d5d1511d72e33f15098ed59f8460f0de41",
    "destinationHash": "6fba4f5d4c59c261243981380cefb5d5d1511d72e33f15098ed59f8460f0de41",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_finding.schema.json",
    "schemaStem": "late_data_finding",
    "label": "Late Data Finding",
    "schemaId": "https://taxat.dev/schemas/late_data_finding.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_finding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_finding.schema.json",
    "sourceHash": "3c2661f4f4c7a27b45e2aaca01edb4525a37d2b41c77d3356d75fc0508f9a0ac",
    "destinationHash": "3c2661f4f4c7a27b45e2aaca01edb4525a37d2b41c77d3356d75fc0508f9a0ac",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/partitionScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/sourceClassOrNull",
      "./late_data_temporal_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "late_data_policy_binding.schema.json",
      "late_data_temporal_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_indicator.schema.json",
    "schemaStem": "late_data_indicator",
    "label": "Late Data Indicator",
    "schemaId": "https://taxat.dev/schemas/late_data_indicator.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_indicator.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_indicator.schema.json",
    "sourceHash": "26565dc5354c23c822edbd6b20f9bd3a4d33d86fa43494019aeadfa92a7fdce9",
    "destinationHash": "26565dc5354c23c822edbd6b20f9bd3a4d33d86fa43494019aeadfa92a7fdce9",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/partitionScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/sourceClassOrNull",
      "./late_data_temporal_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "late_data_policy_binding.schema.json",
      "late_data_temporal_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_indicator_set.schema.json",
    "schemaStem": "late_data_indicator_set",
    "label": "Late Data Indicator Set",
    "schemaId": "https://taxat.dev/schemas/late_data_indicator_set.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_indicator_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_indicator_set.schema.json",
    "sourceHash": "f821b361be87c9b110fcbee7a08dc5a99763f27c0c2209c883f02b2db2c51de5",
    "destinationHash": "f821b361be87c9b110fcbee7a08dc5a99763f27c0c2209c883f02b2db2c51de5",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "./late_data_indicator.schema.json",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "late_data_indicator.schema.json",
      "late_data_policy_binding.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_monitor_result.schema.json",
    "schemaStem": "late_data_monitor_result",
    "label": "Late Data Monitor Result",
    "schemaId": "https://taxat.dev/schemas/late_data_monitor_result.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_monitor_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_monitor_result.schema.json",
    "sourceHash": "4618a96169467eec2ae352b8559746ce40af398c0ca325a103da8fb3f5ee9a5a",
    "destinationHash": "4618a96169467eec2ae352b8559746ce40af398c0ca325a103da8fb3f5ee9a5a",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "./late_data_consequence_summary.schema.json",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs"
    ],
    "resolvedSchemaRefs": [
      "late_data_consequence_summary.schema.json",
      "late_data_policy_binding.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_policy_binding.schema.json",
    "schemaStem": "late_data_policy_binding",
    "label": "Late Data Policy Binding",
    "schemaId": "https://taxat.dev/schemas/late_data_policy_binding.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_policy_binding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_policy_binding.schema.json",
    "sourceHash": "87d4ee1a12c91761a34f79fdcaad68e113c1fc7e66e74b88f442329097543ce7",
    "destinationHash": "87d4ee1a12c91761a34f79fdcaad68e113c1fc7e66e74b88f442329097543ce7",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/bindingScope",
      "#/$defs/lateDataPolicyRef",
      "#/$defs/partitionScopeRefs",
      "#/$defs/runtimeScopeRefs",
      "#/$defs/sourceClass",
      "#/$defs/sourceClassOrNull"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_retroactive_impact_simulation.schema.json",
    "schemaStem": "late_data_retroactive_impact_simulation",
    "label": "Late Data Retroactive Impact Simulation",
    "schemaId": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_retroactive_impact_simulation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_retroactive_impact_simulation.schema.json",
    "sourceHash": "60b38510166727600d60bca0fb716d6335081e5e4ffb295038e1be4e843a9541",
    "destinationHash": "60b38510166727600d60bca0fb716d6335081e5e4ffb295038e1be4e843a9541",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/amendmentEffect",
      "#/$defs/baselineScopeClass",
      "#/$defs/boundedRetroactivityClass",
      "#/$defs/highestLegalConsequence",
      "#/$defs/historicalPositionHandling",
      "#/$defs/lateDataStatus",
      "#/$defs/legalEffectBasis",
      "#/$defs/outcomeClass",
      "#/$defs/proofEffect",
      "#/$defs/replayRequirement",
      "#/$defs/scenarioResult",
      "#/$defs/temporalCertaintyState",
      "#/$defs/temporalClass",
      "#/$defs/trustCurrencyState",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "late_data_retroactive_impact_simulation_basis_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_late_data_retroactive_impact_simulation.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "schemaStem": "late_data_retroactive_impact_simulation_basis_contract",
    "label": "Late Data Retroactive Impact Simulation Basis Contract",
    "schemaId": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "sourceHash": "acb388e46f3e8d43be81c582b224d580200ad773285ebd792528709a5ae5ac44",
    "destinationHash": "acb388e46f3e8d43be81c582b224d580200ad773285ebd792528709a5ae5ac44",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/outcomeClass",
      "#/$defs/temporalClass"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_late_data_retroactive_impact_simulation_basis_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "late_data_temporal_contract.schema.json",
    "schemaStem": "late_data_temporal_contract",
    "label": "Late Data Temporal Contract",
    "schemaId": "https://taxat.dev/schemas/late_data_temporal_contract.schema.json",
    "sourcePath": "Algorithm/schemas/late_data_temporal_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/late_data_temporal_contract.schema.json",
    "sourceHash": "99511eb06531115230f8885406e6abfbf541f8222e3ed879b21e0f378e873823",
    "destinationHash": "99511eb06531115230f8885406e6abfbf541f8222e3ed879b21e0f378e873823",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "log_record.schema.json",
    "schemaStem": "log_record",
    "label": "Log Record",
    "schemaId": "https://taxat.dev/schemas/log_record.schema.json",
    "sourcePath": "Algorithm/schemas/log_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/log_record.schema.json",
    "sourceHash": "19c4427772a90b4ac60cec4d74c311015eba6aa7d4932845d1e6eaff449095a4",
    "destinationHash": "19c4427772a90b4ac60cec4d74c311015eba6aa7d4932845d1e6eaff449095a4",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "./telemetry_resource.schema.json#/$defs/attributeValue",
      "./telemetry_resource.schema.json#/$defs/correlationContext",
      "./telemetry_resource.schema.json#/$defs/resourceRef"
    ],
    "resolvedSchemaRefs": [
      "telemetry_resource.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "low_noise_budget_audit.schema.json",
    "schemaStem": "low_noise_budget_audit",
    "label": "Low Noise Budget Audit",
    "schemaId": "https://taxat.dev/schemas/low_noise_budget_audit.schema.json",
    "sourcePath": "Algorithm/schemas/low_noise_budget_audit.schema.json",
    "destinationPath": "packages/contracts-core/schemas/low_noise_budget_audit.schema.json",
    "sourceHash": "8776c4cb2e34e4646075949cd4bb22be38b01c26e65191932b9e9e19eea6e7d1",
    "destinationHash": "8776c4cb2e34e4646075949cd4bb22be38b01c26e65191932b9e9e19eea6e7d1",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_low_noise_budget_audit.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "low_noise_budget_audit_pack.schema.json",
    "schemaStem": "low_noise_budget_audit_pack",
    "label": "Low Noise Budget Audit Pack",
    "schemaId": "https://taxat.dev/schemas/low_noise_budget_audit_pack.schema.json",
    "sourcePath": "Algorithm/schemas/low_noise_budget_audit_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/low_noise_budget_audit_pack.schema.json",
    "sourceHash": "2532fc8f24933f6ee6860df950b5119ba81570e76b6dedd42fdf54ce6d41dbcd",
    "destinationHash": "2532fc8f24933f6ee6860df950b5119ba81570e76b6dedd42fdf54ce6d41dbcd",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/actionabilityState",
      "#/$defs/auditCase",
      "#/$defs/coalescingOutcome",
      "#/$defs/detailFallbackState",
      "#/$defs/detailModuleCode",
      "#/$defs/modePosture",
      "#/$defs/scenarioClass",
      "https://taxat.dev/schemas/low_noise_budget_audit.schema.json"
    ],
    "resolvedSchemaRefs": [
      "low_noise_budget_audit.schema.json"
    ],
    "sampleRefs": [
      "sample_low_noise_budget_audit_pack.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "low_noise_experience_frame.schema.json",
    "schemaStem": "low_noise_experience_frame",
    "label": "Low Noise Experience Frame",
    "schemaId": "https://taxat.dev/schemas/low_noise_experience_frame.schema.json",
    "sourcePath": "Algorithm/schemas/low_noise_experience_frame.schema.json",
    "destinationPath": "packages/contracts-core/schemas/low_noise_experience_frame.schema.json",
    "sourceHash": "bb5663b9f5f82e6bca819caee2748edd976dc5db3de0e83796fb7b86d6773f97",
    "destinationHash": "bb5663b9f5f82e6bca819caee2748edd976dc5db3de0e83796fb7b86d6773f97",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/attentionPolicy",
      "#/$defs/cognitiveBudget",
      "#/$defs/copyBudget",
      "#/$defs/detailModuleCode",
      "#/$defs/lowNoiseSurfaceCode",
      "#/$defs/recoveryPosture",
      "#/$defs/settlementState",
      "https://taxat.dev/schemas/action_strip_state.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/context_bar_state.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/decision_summary_state.schema.json",
      "https://taxat.dev/schemas/detail_drawer_state.schema.json",
      "https://taxat.dev/schemas/low_noise_budget_audit.schema.json",
      "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
      "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
      "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "action_strip_state.schema.json",
      "cache_isolation_contract.schema.json",
      "command_truth_boundary_contract.schema.json",
      "context_bar_state.schema.json",
      "cross_device_continuity_contract.schema.json",
      "decision_summary_state.schema.json",
      "detail_drawer_state.schema.json",
      "low_noise_budget_audit.schema.json",
      "operator_interaction_layer.schema.json",
      "route_stability_contract.schema.json",
      "semantic_accessibility_contract.schema.json",
      "shell_dominance_contract.schema.json",
      "shell_state_taxonomy_contract.schema.json",
      "stream_recovery_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "manifest_branch_decision_contract.schema.json",
    "schemaStem": "manifest_branch_decision_contract",
    "label": "Manifest Branch Decision Contract",
    "schemaId": "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
    "sourcePath": "Algorithm/schemas/manifest_branch_decision_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/manifest_branch_decision_contract.schema.json",
    "sourceHash": "8f8fc12d22eb147ce194ad6d6970f68aaaa4b124eaa858c0c34237593dee545c",
    "destinationHash": "8f8fc12d22eb147ce194ad6d6970f68aaaa4b124eaa858c0c34237593dee545c",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/scopeArray"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_manifest_branch_decision_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "manifest_lineage_trace.schema.json",
    "schemaStem": "manifest_lineage_trace",
    "label": "Manifest Lineage Trace",
    "schemaId": "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
    "sourcePath": "Algorithm/schemas/manifest_lineage_trace.schema.json",
    "destinationPath": "packages/contracts-core/schemas/manifest_lineage_trace.schema.json",
    "sourceHash": "cd09f533c78f7b4580cafbf4ce26d515759094c9df230f82e6f67bcfcdc53335",
    "destinationHash": "cd09f533c78f7b4580cafbf4ce26d515759094c9df230f82e6f67bcfcdc53335",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/candidateEvaluation",
      "#/$defs/scopeArray"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_manifest_lineage_trace.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "manifest_start_claim_contract.schema.json",
    "schemaStem": "manifest_start_claim_contract",
    "label": "Manifest Start Claim Contract",
    "schemaId": "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json",
    "sourcePath": "Algorithm/schemas/manifest_start_claim_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/manifest_start_claim_contract.schema.json",
    "sourceHash": "43f25058c5b8c17c08d2c0e0f764f551f26d42a6af824f15382123bcae4beb00",
    "destinationHash": "43f25058c5b8c17c08d2c0e0f764f551f26d42a6af824f15382123bcae4beb00",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_manifest_start_claim_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "metric_event.schema.json",
    "schemaStem": "metric_event",
    "label": "Metric Event",
    "schemaId": "https://taxat.dev/schemas/metric_event.schema.json",
    "sourcePath": "Algorithm/schemas/metric_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/metric_event.schema.json",
    "sourceHash": "f3a375bab8664cf2375fc3a01b12e4967c19c12e6a6a3aab61bb8bc8cf639768",
    "destinationHash": "f3a375bab8664cf2375fc3a01b12e4967c19c12e6a6a3aab61bb8bc8cf639768",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "./telemetry_resource.schema.json#/$defs/attributeMap",
      "./telemetry_resource.schema.json#/$defs/correlationContext",
      "./telemetry_resource.schema.json#/$defs/resourceRef"
    ],
    "resolvedSchemaRefs": [
      "telemetry_resource.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "mutation_precondition_binding.schema.json",
    "schemaStem": "mutation_precondition_binding",
    "label": "Mutation Precondition Binding",
    "schemaId": "https://taxat.dev/schemas/mutation_precondition_binding.schema.json",
    "sourcePath": "Algorithm/schemas/mutation_precondition_binding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/mutation_precondition_binding.schema.json",
    "sourceHash": "3ecd94abd5e8e79e464ab47c4d54308a64289a23cda088bf96824f15b0cf8f1e",
    "destinationHash": "3ecd94abd5e8e79e464ab47c4d54308a64289a23cda088bf96824f15b0cf8f1e",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "native_cache_hydration_automation_pack.schema.json",
    "schemaStem": "native_cache_hydration_automation_pack",
    "label": "Native Cache Hydration Automation Pack",
    "schemaId": "https://taxat.dev/schemas/native_cache_hydration_automation_pack.schema.json",
    "sourcePath": "Algorithm/schemas/native_cache_hydration_automation_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/native_cache_hydration_automation_pack.schema.json",
    "sourceHash": "7020281be9a0755ba71075eec73827ca8cd1d67410bd557ad531699794b34344",
    "destinationHash": "7020281be9a0755ba71075eec73827ca8cd1d67410bd557ad531699794b34344",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/actionOutcome",
      "#/$defs/artifactClass",
      "#/$defs/automationCase",
      "#/$defs/automationHarness",
      "#/$defs/firstPaintOutcome",
      "#/$defs/hydrationScopeClass",
      "#/$defs/purgeReason",
      "#/$defs/resumeBindingState",
      "#/$defs/scenarioClass"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_native_cache_hydration_automation_pack.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "native_cache_hydration_contract.schema.json",
    "schemaStem": "native_cache_hydration_contract",
    "label": "Native Cache Hydration Contract",
    "schemaId": "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
    "sourcePath": "Algorithm/schemas/native_cache_hydration_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/native_cache_hydration_contract.schema.json",
    "sourceHash": "1fe7671d934377786466e683c784b9837bf08445cb7d246143e5a030a3e86a99",
    "destinationHash": "1fe7671d934377786466e683c784b9837bf08445cb7d246143e5a030a3e86a99",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_native_cache_hydration_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "native_operator_secondary_window_scene.schema.json",
    "schemaStem": "native_operator_secondary_window_scene",
    "label": "Native Operator Secondary Window Scene",
    "schemaId": "https://taxat.dev/schemas/native_operator_secondary_window_scene.schema.json",
    "sourcePath": "Algorithm/schemas/native_operator_secondary_window_scene.schema.json",
    "destinationPath": "packages/contracts-core/schemas/native_operator_secondary_window_scene.schema.json",
    "sourceHash": "a5b333cc1a53dfb216275f64063a6914c64d3f414cd8119b2c5270e398810610",
    "destinationHash": "a5b333cc1a53dfb216275f64063a6914c64d3f414cd8119b2c5270e398810610",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/focusHandoff",
      "#/$defs/identityHeader",
      "#/$defs/sceneIdentity",
      "#/$defs/sceneRestoration",
      "#/$defs/summaryLoading",
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
      "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
      "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "artifact_affordance_contract.schema.json",
      "cache_isolation_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "focus_restoration_contract.schema.json",
      "native_cache_hydration_contract.schema.json",
      "operator_interaction_layer.schema.json",
      "route_stability_contract.schema.json",
      "semantic_accessibility_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "native_operator_workspace_scene.schema.json",
    "schemaStem": "native_operator_workspace_scene",
    "label": "Native Operator Workspace Scene",
    "schemaId": "https://taxat.dev/schemas/native_operator_workspace_scene.schema.json",
    "sourcePath": "Algorithm/schemas/native_operator_workspace_scene.schema.json",
    "destinationPath": "packages/contracts-core/schemas/native_operator_workspace_scene.schema.json",
    "sourceHash": "8437b846bcb9b095516a5850088b14e42b4b26389f456e7f262d652d7519e3a2",
    "destinationHash": "8437b846bcb9b095516a5850088b14e42b4b26389f456e7f262d652d7519e3a2",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/detailSurfaceCode",
      "#/$defs/leadingSidebar",
      "#/$defs/primaryCanvas",
      "#/$defs/recoveryPosture",
      "#/$defs/sceneIdentity",
      "#/$defs/sceneRestoration",
      "#/$defs/settlementState",
      "#/$defs/shortcutPosture",
      "#/$defs/trailingInspector",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
      "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
      "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
      "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
      "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "cache_isolation_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "focus_restoration_contract.schema.json",
      "native_cache_hydration_contract.schema.json",
      "operator_interaction_layer.schema.json",
      "route_stability_contract.schema.json",
      "semantic_accessibility_contract.schema.json",
      "shell_dominance_contract.schema.json",
      "shell_state_taxonomy_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "nightly_batch_identity_contract.schema.json",
    "schemaStem": "nightly_batch_identity_contract",
    "label": "Nightly Batch Identity Contract",
    "schemaId": "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/nightly_batch_identity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/nightly_batch_identity_contract.schema.json",
    "sourceHash": "7dd3ba6dc2bfee171db16a79c73cb12b716a27b73fa7eb4c5a50d182b4d8c19a",
    "destinationHash": "7dd3ba6dc2bfee171db16a79c73cb12b716a27b73fa7eb4c5a50d182b4d8c19a",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_nightly_batch_identity_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "nightly_batch_run.schema.json",
    "schemaStem": "nightly_batch_run",
    "label": "Nightly Batch Run",
    "schemaId": "https://taxat.dev/schemas/nightly_batch_run.schema.json",
    "sourcePath": "Algorithm/schemas/nightly_batch_run.schema.json",
    "destinationPath": "packages/contracts-core/schemas/nightly_batch_run.schema.json",
    "sourceHash": "c0797420d911474626316c8a02011f63d9336cf14be63ee298868e1d822d18cc",
    "destinationHash": "c0797420d911474626316c8a02011f63d9336cf14be63ee298868e1d822d18cc",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/globalConcurrencyProfile",
      "#/$defs/priorityTuple",
      "#/$defs/selectionEntry",
      "#/$defs/shardPlanEntry",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json",
      "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "nightly_batch_identity_contract.schema.json",
      "operator_digest_derivation_contract.schema.json",
      "schema_reader_window_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "nightly_portfolio_simulation_basis_contract.schema.json",
    "schemaStem": "nightly_portfolio_simulation_basis_contract",
    "label": "Nightly Portfolio Simulation Basis Contract",
    "schemaId": "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/nightly_portfolio_simulation_basis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/nightly_portfolio_simulation_basis_contract.schema.json",
    "sourceHash": "efb21415923f226f89e6471da2bb55a7532220f715dfb9d9c0f9941c50906c81",
    "destinationHash": "efb21415923f226f89e6471da2bb55a7532220f715dfb9d9c0f9941c50906c81",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/candidateCounterfactual",
      "#/$defs/globalConcurrencyProfile",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_nightly_portfolio_simulation_basis_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "nightly_portfolio_what_if_simulation.schema.json",
    "schemaStem": "nightly_portfolio_what_if_simulation",
    "label": "Nightly Portfolio What If Simulation",
    "schemaId": "https://taxat.dev/schemas/nightly_portfolio_what_if_simulation.schema.json",
    "sourcePath": "Algorithm/schemas/nightly_portfolio_what_if_simulation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/nightly_portfolio_what_if_simulation.schema.json",
    "sourceHash": "c601ad2b4e0b46a6276dc14f859569e03707c7bfc92d1ca0da31d460dfab2870",
    "destinationHash": "c601ad2b4e0b46a6276dc14f859569e03707c7bfc92d1ca0da31d460dfab2870",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/entryDiff",
      "#/$defs/highlightDiff",
      "#/$defs/outcomeBucket",
      "#/$defs/selectionDisposition",
      "#/$defs/summaryCounts",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "nightly_portfolio_simulation_basis_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_nightly_portfolio_what_if_simulation.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "normalization_context.schema.json",
    "schemaStem": "normalization_context",
    "label": "Normalization Context",
    "schemaId": "https://taxat.dev/schemas/normalization_context.schema.json",
    "sourcePath": "Algorithm/schemas/normalization_context.schema.json",
    "destinationPath": "packages/contracts-core/schemas/normalization_context.schema.json",
    "sourceHash": "8676029cc275c3822cea5b4b1ed71ac5181c601314f1c282cc98298e16d0eb91",
    "destinationHash": "8676029cc275c3822cea5b4b1ed71ac5181c601314f1c282cc98298e16d0eb91",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "obligation_mirror.schema.json",
    "schemaStem": "obligation_mirror",
    "label": "Obligation Mirror",
    "schemaId": "https://taxat.dev/schemas/obligation_mirror.schema.json",
    "sourcePath": "Algorithm/schemas/obligation_mirror.schema.json",
    "destinationPath": "packages/contracts-core/schemas/obligation_mirror.schema.json",
    "sourceHash": "77ca99c8e2523ca82c718ab5b99f10654c62b84551bfd8c62784904af17414a2",
    "destinationHash": "77ca99c8e2523ca82c718ab5b99f10654c62b84551bfd8c62784904af17414a2",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
      "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json",
      "https://taxat.dev/schemas/authority_truth_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_ingress_proof_contract.schema.json",
      "authority_reconciliation_control_contract.schema.json",
      "authority_truth_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "operator_digest_derivation_contract.schema.json",
    "schemaStem": "operator_digest_derivation_contract",
    "label": "Operator Digest Derivation Contract",
    "schemaId": "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/operator_digest_derivation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/operator_digest_derivation_contract.schema.json",
    "sourceHash": "99ef020118ac754fbd2f7ff93cfa2fce256017ea05e161d905e49ddf7120622b",
    "destinationHash": "99ef020118ac754fbd2f7ff93cfa2fce256017ea05e161d905e49ddf7120622b",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/summaryCounts",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "operator_interaction_layer.schema.json",
    "schemaStem": "operator_interaction_layer",
    "label": "Operator Interaction Layer",
    "schemaId": "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
    "sourcePath": "Algorithm/schemas/operator_interaction_layer.schema.json",
    "destinationPath": "packages/contracts-core/schemas/operator_interaction_layer.schema.json",
    "sourceHash": "09c6f385e74b009d4fb76743a66f4c0596a2643a075e17940457a7ce9ffb30e9",
    "destinationHash": "09c6f385e74b009d4fb76743a66f4c0596a2643a075e17940457a7ce9ffb30e9",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "interaction_layer_foundation_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "operator_morning_digest.schema.json",
    "schemaStem": "operator_morning_digest",
    "label": "Operator Morning Digest",
    "schemaId": "https://taxat.dev/schemas/operator_morning_digest.schema.json",
    "sourcePath": "Algorithm/schemas/operator_morning_digest.schema.json",
    "destinationPath": "packages/contracts-core/schemas/operator_morning_digest.schema.json",
    "sourceHash": "34c24e3559dbfc2eaf90d636f1f17995103c9e5506bd4c41c7ab4212fc321363",
    "destinationHash": "34c24e3559dbfc2eaf90d636f1f17995103c9e5506bd4c41c7ab4212fc321363",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/highlightedClientOutcome",
      "#/$defs/outcomeEntryRefs",
      "#/$defs/prioritySummary",
      "#/$defs/queueSummary",
      "#/$defs/selectionEntryRefList",
      "#/$defs/summaryCounts",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "operator_digest_derivation_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "parity_result.schema.json",
    "schemaStem": "parity_result",
    "label": "Parity Result",
    "schemaId": "https://taxat.dev/schemas/parity_result.schema.json",
    "sourcePath": "Algorithm/schemas/parity_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/parity_result.schema.json",
    "sourceHash": "6b8c5145216d3ab2f64d3dd5d61f2775c1c5f4cecb97c6c680dabb8f16057c14",
    "destinationHash": "6b8c5145216d3ab2f64d3dd5d61f2775c1c5f4cecb97c6c680dabb8f16057c14",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/fieldDelta",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "./schema_bundle.schema.json#/$defs/moneyProfile",
      "./schema_bundle.schema.json#/$defs/moneyValue"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "portal_help_request.schema.json",
    "schemaStem": "portal_help_request",
    "label": "Portal Help Request",
    "schemaId": "https://taxat.dev/schemas/portal_help_request.schema.json",
    "sourcePath": "Algorithm/schemas/portal_help_request.schema.json",
    "destinationPath": "packages/contracts-core/schemas/portal_help_request.schema.json",
    "sourceHash": "a1ca4f1acd72c786999e88d9a56c3b3c07e2b2f956477db3fb3cb8d69e585c05",
    "destinationHash": "a1ca4f1acd72c786999e88d9a56c3b3c07e2b2f956477db3fb3cb8d69e585c05",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "portal_interaction_layer.schema.json",
    "schemaStem": "portal_interaction_layer",
    "label": "Portal Interaction Layer",
    "schemaId": "https://taxat.dev/schemas/portal_interaction_layer.schema.json",
    "sourcePath": "Algorithm/schemas/portal_interaction_layer.schema.json",
    "destinationPath": "packages/contracts-core/schemas/portal_interaction_layer.schema.json",
    "sourceHash": "1b88474a2e418c513ca6fb12ef8b971b2ceb5646b93620c6ec587522f0cc7ec5",
    "destinationHash": "1b88474a2e418c513ca6fb12ef8b971b2ceb5646b93620c6ec587522f0cc7ec5",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "interaction_layer_foundation_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "portal_language_contract.schema.json",
    "schemaStem": "portal_language_contract",
    "label": "Portal Language Contract",
    "schemaId": "https://taxat.dev/schemas/portal_language_contract.schema.json",
    "sourcePath": "Algorithm/schemas/portal_language_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/portal_language_contract.schema.json",
    "sourceHash": "e79c46591e1daa87fd488a76f04a784ad7d738ef4d7c9e8c2455e91dd549a298",
    "destinationHash": "e79c46591e1daa87fd488a76f04a784ad7d738ef4d7c9e8c2455e91dd549a298",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "preseal_gate_evaluation_contract.schema.json",
    "schemaStem": "preseal_gate_evaluation_contract",
    "label": "Preseal Gate Evaluation Contract",
    "schemaId": "https://taxat.dev/schemas/preseal_gate_evaluation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/preseal_gate_evaluation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/preseal_gate_evaluation_contract.schema.json",
    "sourceHash": "658e41fcac6a3b20ec0f8320aad4d1ceaff56faab9eee3edb1c60256d24a81d1",
    "destinationHash": "658e41fcac6a3b20ec0f8320aad4d1ceaff56faab9eee3edb1c60256d24a81d1",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/presealGateCodeArray",
      "#/$defs/scopeArray"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "principal_access_view.schema.json",
    "schemaStem": "principal_access_view",
    "label": "Principal Access View",
    "schemaId": "https://taxat.dev/schemas/principal_access_view.schema.json",
    "sourcePath": "Algorithm/schemas/principal_access_view.schema.json",
    "destinationPath": "packages/contracts-core/schemas/principal_access_view.schema.json",
    "sourceHash": "d14cf60086be7f6f1e7029ee705dd381471465fb7e48add6807a1412daa865f2",
    "destinationHash": "d14cf60086be7f6f1e7029ee705dd381471465fb7e48add6807a1412daa865f2",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/accessWorkspace",
      "#/$defs/actionMatrixCell",
      "#/$defs/activeFilters",
      "#/$defs/authorityChainLayerBase",
      "#/$defs/authorityChainLayerStack",
      "#/$defs/authorityOfRecordOutcomeLayer",
      "#/$defs/chainLayerOutcome",
      "#/$defs/clientDelegationCoverageLayer",
      "#/$defs/delegationSummary",
      "#/$defs/externalAuthorityLinkReadinessLayer",
      "#/$defs/inspectorState",
      "#/$defs/promotedSupportSurface",
      "#/$defs/recoveryPosture",
      "#/$defs/selectedActionDetail",
      "#/$defs/sessionAuthnLayer",
      "#/$defs/settlementState",
      "#/$defs/tenantOperationalAuthorityLayer",
      "#/$defs/workspaceMode",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json"
    ],
    "resolvedSchemaRefs": [
      "cache_isolation_contract.schema.json",
      "governance_interaction_layer.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "principal_context.schema.json",
    "schemaStem": "principal_context",
    "label": "Principal Context",
    "schemaId": "https://taxat.dev/schemas/principal_context.schema.json",
    "sourcePath": "Algorithm/schemas/principal_context.schema.json",
    "destinationPath": "packages/contracts-core/schemas/principal_context.schema.json",
    "sourceHash": "28b2fdf11d31ba4d2a7a4b7328c36798b8416df04abdf364ba65399ecb5d2696",
    "destinationHash": "28b2fdf11d31ba4d2a7a4b7328c36798b8416df04abdf364ba65399ecb5d2696",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "problem_envelope.schema.json",
    "schemaStem": "problem_envelope",
    "label": "Problem Envelope",
    "schemaId": "https://taxat.dev/schemas/problem_envelope.schema.json",
    "sourcePath": "Algorithm/schemas/problem_envelope.schema.json",
    "destinationPath": "packages/contracts-core/schemas/problem_envelope.schema.json",
    "sourceHash": "d0ecad4da0b4ef69fbacb2a378c835ec510fd9ba0488f32267415789fce81206",
    "destinationHash": "d0ecad4da0b4ef69fbacb2a378c835ec510fd9ba0488f32267415789fce81206",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/mutation_precondition_binding.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "mutation_precondition_binding.schema.json",
      "route_stability_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "proof_bundle.schema.json",
    "schemaStem": "proof_bundle",
    "label": "Proof Bundle",
    "schemaId": "https://taxat.dev/schemas/proof_bundle.schema.json",
    "sourcePath": "Algorithm/schemas/proof_bundle.schema.json",
    "destinationPath": "packages/contracts-core/schemas/proof_bundle.schema.json",
    "sourceHash": "b0f8a6a12eb03cf6e689d6b41c51b51374321423f21f4ae82adb86933911e379",
    "destinationHash": "b0f8a6a12eb03cf6e689d6b41c51b51374321423f21f4ae82adb86933911e379",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./proof_closure_contract.schema.json",
      "./provenance_partition_contract.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/enquiry_pack.schema.json#/$defs/limitationNote",
      "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "enquiry_pack.schema.json",
      "proof_closure_contract.schema.json",
      "provenance_partition_contract.schema.json",
      "retention_limited_explainability_contract.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "proof_closure_contract.schema.json",
    "schemaStem": "proof_closure_contract",
    "label": "Proof Closure Contract",
    "schemaId": "https://taxat.dev/schemas/proof_closure_contract.schema.json",
    "sourcePath": "Algorithm/schemas/proof_closure_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/proof_closure_contract.schema.json",
    "sourceHash": "0ec2ee3f713cd051764255d16433a92783b3f99ff6b4ed6762f682d5278c9888",
    "destinationHash": "0ec2ee3f713cd051764255d16433a92783b3f99ff6b4ed6762f682d5278c9888",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "provenance_edge.schema.json",
    "schemaStem": "provenance_edge",
    "label": "Provenance Edge",
    "schemaId": "https://taxat.dev/schemas/provenance_edge.schema.json",
    "sourcePath": "Algorithm/schemas/provenance_edge.schema.json",
    "destinationPath": "packages/contracts-core/schemas/provenance_edge.schema.json",
    "sourceHash": "945684bc14f15e6a218537ea8c17583759c2d846d235dddc71ae7315b1be66ac",
    "destinationHash": "945684bc14f15e6a218537ea8c17583759c2d846d235dddc71ae7315b1be66ac",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "provenance_node.schema.json",
    "schemaStem": "provenance_node",
    "label": "Provenance Node",
    "schemaId": "https://taxat.dev/schemas/provenance_node.schema.json",
    "sourcePath": "Algorithm/schemas/provenance_node.schema.json",
    "destinationPath": "packages/contracts-core/schemas/provenance_node.schema.json",
    "sourceHash": "b2e2af163a56ca0105799a8ea030bc8014e22734f355a534d1f7d0a12d325173",
    "destinationHash": "b2e2af163a56ca0105799a8ea030bc8014e22734f355a534d1f7d0a12d325173",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "provenance_partition_contract.schema.json",
    "schemaStem": "provenance_partition_contract",
    "label": "Provenance Partition Contract",
    "schemaId": "https://taxat.dev/schemas/provenance_partition_contract.schema.json",
    "sourcePath": "Algorithm/schemas/provenance_partition_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/provenance_partition_contract.schema.json",
    "sourceHash": "82d7a1aa15815fafc0d16a2b178b2c2704102f710058e7b9ea882f4a98df72fb",
    "destinationHash": "82d7a1aa15815fafc0d16a2b178b2c2704102f710058e7b9ea882f4a98df72fb",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "provenance_path.schema.json",
    "schemaStem": "provenance_path",
    "label": "Provenance Path",
    "schemaId": "https://taxat.dev/schemas/provenance_path.schema.json",
    "sourcePath": "Algorithm/schemas/provenance_path.schema.json",
    "destinationPath": "packages/contracts-core/schemas/provenance_path.schema.json",
    "sourceHash": "63b698086079de200ffd20c9c14adeb2a91caa1e14b67e7654c104158b5c1cab",
    "destinationHash": "63b698086079de200ffd20c9c14adeb2a91caa1e14b67e7654c104158b5c1cab",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/rankingBasisItem",
      "./provenance_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "provenance_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "recovery_checkpoint.schema.json",
    "schemaStem": "recovery_checkpoint",
    "label": "Recovery Checkpoint",
    "schemaId": "https://taxat.dev/schemas/recovery_checkpoint.schema.json",
    "sourcePath": "Algorithm/schemas/recovery_checkpoint.schema.json",
    "destinationPath": "packages/contracts-core/schemas/recovery_checkpoint.schema.json",
    "sourceHash": "ff731ca38252d78d1bb84979fc46c20f4527d8acc52b19bbafd7f31641134dce",
    "destinationHash": "ff731ca38252d78d1bb84979fc46c20f4527d8acc52b19bbafd7f31641134dce",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/recovery_governance_contract.schema.json",
      "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "recovery_governance_contract.schema.json",
      "restore_privacy_reconciliation_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_recovery_checkpoint.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "recovery_governance_contract.schema.json",
    "schemaStem": "recovery_governance_contract",
    "label": "Recovery Governance Contract",
    "schemaId": "https://taxat.dev/schemas/recovery_governance_contract.schema.json",
    "sourcePath": "Algorithm/schemas/recovery_governance_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/recovery_governance_contract.schema.json",
    "sourceHash": "34f94dd39c5e0d3f88b505641986bfb1ec497fea2e98baede2729f22b3b87952",
    "destinationHash": "34f94dd39c5e0d3f88b505641986bfb1ec497fea2e98baede2729f22b3b87952",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_recovery_governance_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "release_candidate_identity_contract.schema.json",
    "schemaStem": "release_candidate_identity_contract",
    "label": "Release Candidate Identity Contract",
    "schemaId": "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/release_candidate_identity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/release_candidate_identity_contract.schema.json",
    "sourceHash": "c37f45e4b5bd4ad16bc3849f65e102d0f0c0b3d63c89c2b9d4e6620809b64656",
    "destinationHash": "c37f45e4b5bd4ad16bc3849f65e102d0f0c0b3d63c89c2b9d4e6620809b64656",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_release_candidate_identity_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "release_verification_manifest.schema.json",
    "schemaStem": "release_verification_manifest",
    "label": "Release Verification Manifest",
    "schemaId": "https://taxat.dev/schemas/release_verification_manifest.schema.json",
    "sourcePath": "Algorithm/schemas/release_verification_manifest.schema.json",
    "destinationPath": "packages/contracts-core/schemas/release_verification_manifest.schema.json",
    "sourceHash": "f3aa0e66b6ccb71a8a0e8f39d538dbd4611b07942b62ad3b2024e64ac446d8a6",
    "destinationHash": "f3aa0e66b6ccb71a8a0e8f39d538dbd4611b07942b62ad3b2024e64ac446d8a6",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/gateResult",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json",
      "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json",
      "release_verification_manifest_assembly_contract.schema.json",
      "schema_bundle_compatibility_gate_contract.schema.json",
      "schema_reader_window_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "release_verification_manifest_assembly_contract.schema.json",
    "schemaStem": "release_verification_manifest_assembly_contract",
    "label": "Release Verification Manifest Assembly Contract",
    "schemaId": "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json",
    "sourcePath": "Algorithm/schemas/release_verification_manifest_assembly_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/release_verification_manifest_assembly_contract.schema.json",
    "sourceHash": "7862e41c2a9073354e350cfe2bba3821df32b3e765a7e3a30d5949d68d85eb9c",
    "destinationHash": "7862e41c2a9073354e350cfe2bba3821df32b3e765a7e3a30d5949d68d85eb9c",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/gateBinding"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_release_verification_manifest_assembly_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "remediation_task.schema.json",
    "schemaStem": "remediation_task",
    "label": "Remediation Task",
    "schemaId": "https://taxat.dev/schemas/remediation_task.schema.json",
    "sourcePath": "Algorithm/schemas/remediation_task.schema.json",
    "destinationPath": "packages/contracts-core/schemas/remediation_task.schema.json",
    "sourceHash": "7667724987bf13d3a9a0fc1a45b2394d48806e34907050a038986a67fe302897",
    "destinationHash": "7667724987bf13d3a9a0fc1a45b2394d48806e34907050a038986a67fe302897",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "https://taxat.dev/schemas/failure_resolution_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "failure_resolution_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "replay_attestation.schema.json",
    "schemaStem": "replay_attestation",
    "label": "Replay Attestation",
    "schemaId": "https://taxat.dev/schemas/replay_attestation.schema.json",
    "sourcePath": "Algorithm/schemas/replay_attestation.schema.json",
    "destinationPath": "packages/contracts-core/schemas/replay_attestation.schema.json",
    "sourceHash": "47b616c74105f9d95cb779da399ae23526279da6e9dddaffdf33e0efe9e57e79",
    "destinationHash": "47b616c74105f9d95cb779da399ae23526279da6e9dddaffdf33e0efe9e57e79",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/basisDimensionResult",
      "#/$defs/mismatchItem",
      "#/$defs/outcomeComponentResult",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/replay_basis_integrity_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json",
      "replay_basis_integrity_contract.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "replay_basis_integrity_contract.schema.json",
    "schemaStem": "replay_basis_integrity_contract",
    "label": "Replay Basis Integrity Contract",
    "schemaId": "https://taxat.dev/schemas/replay_basis_integrity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/replay_basis_integrity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/replay_basis_integrity_contract.schema.json",
    "sourceHash": "b6514b696dc09cf7d3280a515f078a463f9bb297813da390552a3c9fbdfb4b87",
    "destinationHash": "b6514b696dc09cf7d3280a515f078a463f9bb297813da390552a3c9fbdfb4b87",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/counterfactualDimensionArray",
      "#/$defs/sourceDimensionArray"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "request_info_record.schema.json",
    "schemaStem": "request_info_record",
    "label": "Request Info Record",
    "schemaId": "https://taxat.dev/schemas/request_info_record.schema.json",
    "sourcePath": "Algorithm/schemas/request_info_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/request_info_record.schema.json",
    "sourceHash": "44b34797f0d758edce1cb46f3eba2b5455220ec61b002d26cd267a28acd6ce49",
    "destinationHash": "44b34797f0d758edce1cb46f3eba2b5455220ec61b002d26cd267a28acd6ce49",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "restore_drill_result.schema.json",
    "schemaStem": "restore_drill_result",
    "label": "Restore Drill Result",
    "schemaId": "https://taxat.dev/schemas/restore_drill_result.schema.json",
    "sourcePath": "Algorithm/schemas/restore_drill_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/restore_drill_result.schema.json",
    "sourceHash": "819473b6d28a889373b01749e3970634bb682884a7fc44ec95bc09cc69b7a4bb",
    "destinationHash": "819473b6d28a889373b01749e3970634bb682884a7fc44ec95bc09cc69b7a4bb",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json",
      "restore_privacy_reconciliation_contract.schema.json",
      "schema_reader_window_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "restore_privacy_reconciliation_contract.schema.json",
    "schemaStem": "restore_privacy_reconciliation_contract",
    "label": "Restore Privacy Reconciliation Contract",
    "schemaId": "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json",
    "sourcePath": "Algorithm/schemas/restore_privacy_reconciliation_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/restore_privacy_reconciliation_contract.schema.json",
    "sourceHash": "7157d0d667ba768df915443b04f67d9474abca3625c0a4074af73511e307bf47",
    "destinationHash": "7157d0d667ba768df915443b04f67d9474abca3625c0a4074af73511e307bf47",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_restore_privacy_reconciliation_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "retention_governance_frame.schema.json",
    "schemaStem": "retention_governance_frame",
    "label": "Retention Governance Frame",
    "schemaId": "https://taxat.dev/schemas/retention_governance_frame.schema.json",
    "sourcePath": "Algorithm/schemas/retention_governance_frame.schema.json",
    "destinationPath": "packages/contracts-core/schemas/retention_governance_frame.schema.json",
    "sourceHash": "75ef270714451fb6cff625372d7365bf01c3813d8ca5b6d5ecdbc617fac9a5df",
    "destinationHash": "75ef270714451fb6cff625372d7365bf01c3813d8ca5b6d5ecdbc617fac9a5df",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/erasureQueue",
      "#/$defs/erasureReadinessState",
      "#/$defs/legalHoldRegister",
      "#/$defs/legalHoldState",
      "#/$defs/overrideState",
      "#/$defs/promotedSupportSurface",
      "#/$defs/recoveryPosture",
      "#/$defs/releaseEligibilityState",
      "#/$defs/retentionArtifactRow",
      "#/$defs/retentionImpactPreview",
      "#/$defs/retentionPolicyMatrix",
      "#/$defs/retentionWorkspace",
      "#/$defs/retentionWorkspaceFilters",
      "#/$defs/settlementState",
      "#/$defs/warningPosture",
      "#/$defs/workspaceMode",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json"
    ],
    "resolvedSchemaRefs": [
      "governance_interaction_layer.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "retention_limited_explainability_contract.schema.json",
    "schemaStem": "retention_limited_explainability_contract",
    "label": "Retention Limited Explainability Contract",
    "schemaId": "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json",
    "sourcePath": "Algorithm/schemas/retention_limited_explainability_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/retention_limited_explainability_contract.schema.json",
    "sourceHash": "6d3d1889f4d75ec9cb46fe0fae9a901c7d5c06db8d9b81b35e7782f2d74634d4",
    "destinationHash": "6d3d1889f4d75ec9cb46fe0fae9a901c7d5c06db8d9b81b35e7782f2d74634d4",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_retention_limited_explainability_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "retention_tag.schema.json",
    "schemaStem": "retention_tag",
    "label": "Retention Tag",
    "schemaId": "https://taxat.dev/schemas/retention_tag.schema.json",
    "sourcePath": "Algorithm/schemas/retention_tag.schema.json",
    "destinationPath": "packages/contracts-core/schemas/retention_tag.schema.json",
    "sourceHash": "fe63f3a9a6a0aa79d2ab39160757ae58196b2659551c4308da4429c7e381e9e9",
    "destinationHash": "fe63f3a9a6a0aa79d2ab39160757ae58196b2659551c4308da4429c7e381e9e9",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "retroactive_impact_analysis.schema.json",
    "schemaStem": "retroactive_impact_analysis",
    "label": "Retroactive Impact Analysis",
    "schemaId": "https://taxat.dev/schemas/retroactive_impact_analysis.schema.json",
    "sourcePath": "Algorithm/schemas/retroactive_impact_analysis.schema.json",
    "destinationPath": "packages/contracts-core/schemas/retroactive_impact_analysis.schema.json",
    "sourceHash": "15d02e2b9e597dad0694a23b12ddc13ef1c1b50b3946a5d03f21fb5d2c896c46",
    "destinationHash": "15d02e2b9e597dad0694a23b12ddc13ef1c1b50b3946a5d03f21fb5d2c896c46",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "risk_report.schema.json",
    "schemaStem": "risk_report",
    "label": "Risk Report",
    "schemaId": "https://taxat.dev/schemas/risk_report.schema.json",
    "sourcePath": "Algorithm/schemas/risk_report.schema.json",
    "destinationPath": "packages/contracts-core/schemas/risk_report.schema.json",
    "sourceHash": "98e8db8465dd015ebed3bf89ce059c7db07b210a177df960f3a19c2eabb90440",
    "destinationHash": "98e8db8465dd015ebed3bf89ce059c7db07b210a177df960f3a19c2eabb90440",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "#/$defs/featureScore",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "role_template_matrix.schema.json",
    "schemaStem": "role_template_matrix",
    "label": "Role Template Matrix",
    "schemaId": "https://taxat.dev/schemas/role_template_matrix.schema.json",
    "sourcePath": "Algorithm/schemas/role_template_matrix.schema.json",
    "destinationPath": "packages/contracts-core/schemas/role_template_matrix.schema.json",
    "sourceHash": "cfea778dcba20ea75b73d43872b22603cb1c3e163c639da8ad128afd655a0f5d",
    "destinationHash": "cfea778dcba20ea75b73d43872b22603cb1c3e163c639da8ad128afd655a0f5d",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/activeFilters",
      "#/$defs/cellDetailCore",
      "#/$defs/matrixCell",
      "#/$defs/matrixColumn",
      "#/$defs/matrixDecision",
      "#/$defs/matrixRow",
      "#/$defs/recoveryPosture",
      "#/$defs/roleMatrixWorkspace",
      "#/$defs/selectedActionDetail",
      "#/$defs/settlementState",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json"
    ],
    "resolvedSchemaRefs": [
      "cache_isolation_contract.schema.json",
      "governance_interaction_layer.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "route_stability_contract.schema.json",
    "schemaStem": "route_stability_contract",
    "label": "Route Stability Contract",
    "schemaId": "https://taxat.dev/schemas/route_stability_contract.schema.json",
    "sourcePath": "Algorithm/schemas/route_stability_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/route_stability_contract.schema.json",
    "sourceHash": "ae13fc174b6924f8525c5b26fa8615663cb48634fdaa730a3f33f85bcbc72bfc",
    "destinationHash": "ae13fc174b6924f8525c5b26fa8615663cb48634fdaa730a3f33f85bcbc72bfc",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/guardVectorComponents"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "run_manifest.schema.json",
    "schemaStem": "run_manifest",
    "label": "Run Manifest",
    "schemaId": "https://taxat.dev/schemas/run_manifest.schema.json",
    "sourcePath": "Algorithm/schemas/run_manifest.schema.json",
    "destinationPath": "packages/contracts-core/schemas/run_manifest.schema.json",
    "sourceHash": "17d4fad61503e2a8ebd437a2398de9ea3ec466af2537fc7cc2e7d2777ef232a4",
    "destinationHash": "17d4fad61503e2a8ebd437a2398de9ea3ec466af2537fc7cc2e7d2777ef232a4",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/accessDecision",
      "#/$defs/appendOnlyOutcomeProjection",
      "#/$defs/configEntry",
      "#/$defs/configFreeze",
      "#/$defs/continuationSet",
      "#/$defs/frozenExecutionBinding",
      "#/$defs/hashSet",
      "#/$defs/inputFreeze",
      "#/$defs/outputLinkEntry",
      "#/$defs/outputLinkMap",
      "#/$defs/postSealBasis",
      "#/$defs/providerEnvironment",
      "#/$defs/scopeArray",
      "./gate_decision_record.schema.json",
      "./late_data_policy_binding.schema.json",
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/partitionScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/runtimeScopeRefs",
      "./late_data_policy_binding.schema.json#/$defs/sourceClassOrNull",
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json",
      "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
      "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json",
      "https://taxat.dev/schemas/preseal_gate_evaluation_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
      "https://taxat.dev/schemas/scope_execution_binding.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "command_truth_boundary_contract.schema.json",
      "gate_decision_record.schema.json",
      "invariant_enforcement_contract.schema.json",
      "late_data_policy_binding.schema.json",
      "manifest_branch_decision_contract.schema.json",
      "manifest_start_claim_contract.schema.json",
      "preseal_gate_evaluation_contract.schema.json",
      "schema_bundle.schema.json",
      "schema_reader_window_contract.schema.json",
      "scope_execution_binding.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "schema_bundle.schema.json",
    "schemaStem": "schema_bundle",
    "label": "Schema Bundle",
    "schemaId": "https://taxat.dev/schemas/schema_bundle.schema.json",
    "sourcePath": "Algorithm/schemas/schema_bundle.schema.json",
    "destinationPath": "packages/contracts-core/schemas/schema_bundle.schema.json",
    "sourceHash": "901500d2d44a2c6b76bc64dd2afe5daa5a8a0f1d853f04f6ea7555f994086bb8",
    "destinationHash": "901500d2d44a2c6b76bc64dd2afe5daa5a8a0f1d853f04f6ea7555f994086bb8",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "#/$defs/exactDecimalString",
      "#/$defs/schemaBundleEntry",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "schema_reader_window_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "schema_bundle_compatibility_gate_contract.schema.json",
    "schemaStem": "schema_bundle_compatibility_gate_contract",
    "label": "Schema Bundle Compatibility Gate Contract",
    "schemaId": "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
    "sourcePath": "Algorithm/schemas/schema_bundle_compatibility_gate_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/schema_bundle_compatibility_gate_contract.schema.json",
    "sourceHash": "7e87b2e2b66221a56cae5df34ebce70e45b3dee0cb6131fd4905af4321f666a6",
    "destinationHash": "7e87b2e2b66221a56cae5df34ebce70e45b3dee0cb6131fd4905af4321f666a6",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "release_candidate_identity_contract.schema.json",
      "schema_reader_window_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_schema_bundle_compatibility_gate_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "schema_migration_ledger.schema.json",
    "schemaStem": "schema_migration_ledger",
    "label": "Schema Migration Ledger",
    "schemaId": "https://taxat.dev/schemas/schema_migration_ledger.schema.json",
    "sourcePath": "Algorithm/schemas/schema_migration_ledger.schema.json",
    "destinationPath": "packages/contracts-core/schemas/schema_migration_ledger.schema.json",
    "sourceHash": "f76ac0227adfa99b463e48fc219d02067b26bb53762b7fc7e3839398f1fca9d5",
    "destinationHash": "f76ac0227adfa99b463e48fc219d02067b26bb53762b7fc7e3839398f1fca9d5",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [
      "https://taxat.dev/schemas/backfill_execution_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "backfill_execution_contract.schema.json",
      "schema_reader_window_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "schema_reader_window_contract.schema.json",
    "schemaStem": "schema_reader_window_contract",
    "label": "Schema Reader Window Contract",
    "schemaId": "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
    "sourcePath": "Algorithm/schemas/schema_reader_window_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/schema_reader_window_contract.schema.json",
    "sourceHash": "8f24727857ddc21e7524291ded9f10b82329d8462dd18640f36b95b03356285f",
    "destinationHash": "8f24727857ddc21e7524291ded9f10b82329d8462dd18640f36b95b03356285f",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "scope_execution_binding.schema.json",
    "schemaStem": "scope_execution_binding",
    "label": "Scope Execution Binding",
    "schemaId": "https://taxat.dev/schemas/scope_execution_binding.schema.json",
    "sourcePath": "Algorithm/schemas/scope_execution_binding.schema.json",
    "destinationPath": "packages/contracts-core/schemas/scope_execution_binding.schema.json",
    "sourceHash": "6470a226c64bfe14f18840f2e4c6b3aec5b9081ea5355e901b3f09e3999fc9ee",
    "destinationHash": "6470a226c64bfe14f18840f2e4c6b3aec5b9081ea5355e901b3f09e3999fc9ee",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "refTargets": [
      "#/$defs/scopeArray"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "secret_version.schema.json",
    "schemaStem": "secret_version",
    "label": "Secret Version",
    "schemaId": "https://taxat.dev/schemas/secret_version.schema.json",
    "sourcePath": "Algorithm/schemas/secret_version.schema.json",
    "destinationPath": "packages/contracts-core/schemas/secret_version.schema.json",
    "sourceHash": "3dc107ec7c8b931bfda08cc44feff3af06eef169afb4d708bc2c82f62d870364",
    "destinationHash": "3dc107ec7c8b931bfda08cc44feff3af06eef169afb4d708bc2c82f62d870364",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "semantic_accessibility_contract.schema.json",
    "schemaStem": "semantic_accessibility_contract",
    "label": "Semantic Accessibility Contract",
    "schemaId": "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
    "sourcePath": "Algorithm/schemas/semantic_accessibility_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/semantic_accessibility_contract.schema.json",
    "sourceHash": "83be304f9b057ad506807e18b1018f2274c02aa0eb32fd564931c6c4a29c567c",
    "destinationHash": "83be304f9b057ad506807e18b1018f2274c02aa0eb32fd564931c6c4a29c567c",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/anchorCode",
      "#/$defs/announcedChangeKind",
      "#/$defs/focusRegionCode"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_semantic_accessibility_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "semantic_accessibility_regression_pack.schema.json",
    "schemaStem": "semantic_accessibility_regression_pack",
    "label": "Semantic Accessibility Regression Pack",
    "schemaId": "https://taxat.dev/schemas/semantic_accessibility_regression_pack.schema.json",
    "sourcePath": "Algorithm/schemas/semantic_accessibility_regression_pack.schema.json",
    "destinationPath": "packages/contracts-core/schemas/semantic_accessibility_regression_pack.schema.json",
    "sourceHash": "448a34f8195646d69811f038825b487582e94b3d4d8ede6ba92cde30f8fc7fe3",
    "destinationHash": "448a34f8195646d69811f038825b487582e94b3d4d8ede6ba92cde30f8fc7fe3",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/anchorBinding",
      "#/$defs/automationHarness",
      "#/$defs/modality",
      "#/$defs/regressionCase",
      "#/$defs/selectorProfile",
      "#/$defs/shellFamily",
      "#/$defs/surfaceType",
      "#/$defs/transitionClass"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_semantic_accessibility_regression_pack.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "shell_continuity_fuzz_harness.schema.json",
    "schemaStem": "shell_continuity_fuzz_harness",
    "label": "Shell Continuity Fuzz Harness",
    "schemaId": "https://taxat.dev/schemas/shell_continuity_fuzz_harness.schema.json",
    "sourcePath": "Algorithm/schemas/shell_continuity_fuzz_harness.schema.json",
    "destinationPath": "packages/contracts-core/schemas/shell_continuity_fuzz_harness.schema.json",
    "sourceHash": "d8b67626c4ad07ba4152195744702c3579235d468bcf22cdc379f1f60dc9cf51",
    "destinationHash": "d8b67626c4ad07ba4152195744702c3579235d468bcf22cdc379f1f60dc9cf51",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/assertedInvariant",
      "#/$defs/continuityScope",
      "#/$defs/fuzzCase",
      "#/$defs/perturbation",
      "#/$defs/shellFamily",
      "#/$defs/stateSnapshot",
      "#/$defs/surfaceType"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_shell_continuity_fuzz_harness.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "shell_dominance_contract.schema.json",
    "schemaStem": "shell_dominance_contract",
    "label": "Shell Dominance Contract",
    "schemaId": "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
    "sourcePath": "Algorithm/schemas/shell_dominance_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/shell_dominance_contract.schema.json",
    "sourceHash": "dc69c82897d2e421cd337c3a719e8ea924fafbc739178aa535e3916dc71e4fa0",
    "destinationHash": "dc69c82897d2e421cd337c3a719e8ea924fafbc739178aa535e3916dc71e4fa0",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "#/$defs/supportSurfaceCode",
      "#/$defs/surfaceCode"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "shell_state_taxonomy_contract.schema.json",
    "schemaStem": "shell_state_taxonomy_contract",
    "label": "Shell State Taxonomy Contract",
    "schemaId": "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
    "sourcePath": "Algorithm/schemas/shell_state_taxonomy_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/shell_state_taxonomy_contract.schema.json",
    "sourceHash": "307e14e9eb39a2ad49c092cbc24d9a9ddf5fffb5b85f126647549f9ce3238e6e",
    "destinationHash": "307e14e9eb39a2ad49c092cbc24d9a9ddf5fffb5b85f126647549f9ce3238e6e",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_shell_state_taxonomy_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "snapshot.schema.json",
    "schemaStem": "snapshot",
    "label": "Snapshot",
    "schemaId": "https://taxat.dev/schemas/snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/snapshot.schema.json",
    "sourceHash": "5ffe832a9c9d6bc7dbb56a1d24ffe084b681329f834203cc9faf3e80de104941",
    "destinationHash": "5ffe832a9c9d6bc7dbb56a1d24ffe084b681329f834203cc9faf3e80de104941",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "source_collection_run.schema.json",
    "schemaStem": "source_collection_run",
    "label": "Source Collection Run",
    "schemaId": "https://taxat.dev/schemas/source_collection_run.schema.json",
    "sourcePath": "Algorithm/schemas/source_collection_run.schema.json",
    "destinationPath": "packages/contracts-core/schemas/source_collection_run.schema.json",
    "sourceHash": "d2040d67870f4592ab4aaa5619c5017efc782cc9751e14e78f69ba1024f7550e",
    "destinationHash": "d2040d67870f4592ab4aaa5619c5017efc782cc9751e14e78f69ba1024f7550e",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "source_plan.schema.json",
    "schemaStem": "source_plan",
    "label": "Source Plan",
    "schemaId": "https://taxat.dev/schemas/source_plan.schema.json",
    "sourcePath": "Algorithm/schemas/source_plan.schema.json",
    "destinationPath": "packages/contracts-core/schemas/source_plan.schema.json",
    "sourceHash": "6870c19228a405cfbcb6c53c6480d7b1d463fa47d42411d2be5e7344cfe6d7b9",
    "destinationHash": "6870c19228a405cfbcb6c53c6480d7b1d463fa47d42411d2be5e7344cfe6d7b9",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "#/$defs/plannedSource",
      "./late_data_policy_binding.schema.json#/$defs/lateDataPolicyRef",
      "./late_data_policy_binding.schema.json#/$defs/sourceClass",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "late_data_policy_binding.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "source_record.schema.json",
    "schemaStem": "source_record",
    "label": "Source Record",
    "schemaId": "https://taxat.dev/schemas/source_record.schema.json",
    "sourcePath": "Algorithm/schemas/source_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/source_record.schema.json",
    "sourceHash": "e4333598d1ceab21c9df8002cf9f1eca22a229c9f521e76e8af4a549945b4f3d",
    "destinationHash": "e4333598d1ceab21c9df8002cf9f1eca22a229c9f521e76e8af4a549945b4f3d",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./retention_tag.schema.json",
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "retention_tag.schema.json",
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "source_record_set.schema.json",
    "schemaStem": "source_record_set",
    "label": "Source Record Set",
    "schemaId": "https://taxat.dev/schemas/source_record_set.schema.json",
    "sourcePath": "Algorithm/schemas/source_record_set.schema.json",
    "destinationPath": "packages/contracts-core/schemas/source_record_set.schema.json",
    "sourceHash": "3f480a4bb9c20b9cc0680318f31182a59d03081face81e1d7ec89f8c512614d7",
    "destinationHash": "3f480a4bb9c20b9cc0680318f31182a59d03081face81e1d7ec89f8c512614d7",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "./source_record.schema.json"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json",
      "source_record.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "source_window.schema.json",
    "schemaStem": "source_window",
    "label": "Source Window",
    "schemaId": "https://taxat.dev/schemas/source_window.schema.json",
    "sourcePath": "Algorithm/schemas/source_window.schema.json",
    "destinationPath": "packages/contracts-core/schemas/source_window.schema.json",
    "sourceHash": "b3def4a9a64cfdd2d059a440c392a9e0a8816c5cad8282657cf385ccf361f0aa",
    "destinationHash": "b3def4a9a64cfdd2d059a440c392a9e0a8816c5cad8282657cf385ccf361f0aa",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract"
    ],
    "resolvedSchemaRefs": [
      "schema_bundle.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "state_transition_contract.schema.json",
    "schemaStem": "state_transition_contract",
    "label": "State Transition Contract",
    "schemaId": "https://taxat.dev/schemas/state_transition_contract.schema.json",
    "sourcePath": "Algorithm/schemas/state_transition_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/state_transition_contract.schema.json",
    "sourceHash": "af225ca70a88d2193c3a7d9ed722233b7379aed6ad45674e2c3814cfd7738c47",
    "destinationHash": "af225ca70a88d2193c3a7d9ed722233b7379aed6ad45674e2c3814cfd7738c47",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "stream_recovery_contract.schema.json",
    "schemaStem": "stream_recovery_contract",
    "label": "Stream Recovery Contract",
    "schemaId": "https://taxat.dev/schemas/stream_recovery_contract.schema.json",
    "sourcePath": "Algorithm/schemas/stream_recovery_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/stream_recovery_contract.schema.json",
    "sourceHash": "06cb7418b7e2c3b762fb82c9e487b14747c15d356a56303d00c9b8e3f3c7c416",
    "destinationHash": "06cb7418b7e2c3b762fb82c9e487b14747c15d356a56303d00c9b8e3f3c7c416",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_stream_recovery_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "submission_record.schema.json",
    "schemaStem": "submission_record",
    "label": "Submission Record",
    "schemaId": "https://taxat.dev/schemas/submission_record.schema.json",
    "sourcePath": "Algorithm/schemas/submission_record.schema.json",
    "destinationPath": "packages/contracts-core/schemas/submission_record.schema.json",
    "sourceHash": "17da58f11a731851ab655f4508b62869419f372addc0bb4d764c7b0e33ff279a",
    "destinationHash": "17da58f11a731851ab655f4508b62869419f372addc0bb4d764c7b0e33ff279a",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
      "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json",
      "https://taxat.dev/schemas/authority_request_identity_contract.schema.json",
      "https://taxat.dev/schemas/authority_truth_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_ingress_proof_contract.schema.json",
      "authority_reconciliation_control_contract.schema.json",
      "authority_request_identity_contract.schema.json",
      "authority_truth_contract.schema.json",
      "execution_mode_boundary_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "telemetry_resource.schema.json",
    "schemaStem": "telemetry_resource",
    "label": "Telemetry Resource",
    "schemaId": "https://taxat.dev/schemas/telemetry_resource.schema.json",
    "sourcePath": "Algorithm/schemas/telemetry_resource.schema.json",
    "destinationPath": "packages/contracts-core/schemas/telemetry_resource.schema.json",
    "sourceHash": "6fcd25e2766afe7043d8fc5573fd4a43cf657c5c697e0833588a5599ea491ec9",
    "destinationHash": "6fcd25e2766afe7043d8fc5573fd4a43cf657c5c697e0833588a5599ea491ec9",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "#/$defs/attributeMap",
      "#/$defs/attributeValue",
      "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
      "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "manifest_branch_decision_contract.schema.json",
      "manifest_start_claim_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "temporal_propagation_event.schema.json",
    "schemaStem": "temporal_propagation_event",
    "label": "Temporal Propagation Event",
    "schemaId": "https://taxat.dev/schemas/temporal_propagation_event.schema.json",
    "sourcePath": "Algorithm/schemas/temporal_propagation_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/temporal_propagation_event.schema.json",
    "sourceHash": "34a5ef1377692154a184249f80f6346d88dcaf91119cb300d029f78f6eb943f9",
    "destinationHash": "34a5ef1377692154a184249f80f6346d88dcaf91119cb300d029f78f6eb943f9",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_temporal_propagation_event.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "tenant_governance_snapshot.schema.json",
    "schemaStem": "tenant_governance_snapshot",
    "label": "Tenant Governance Snapshot",
    "schemaId": "https://taxat.dev/schemas/tenant_governance_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/tenant_governance_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/tenant_governance_snapshot.schema.json",
    "sourceHash": "c1fab84295a29dae9bcc9cede9c4a32281bdb8665174bb9923d2682711fdba82",
    "destinationHash": "c1fab84295a29dae9bcc9cede9c4a32281bdb8665174bb9923d2682711fdba82",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "refTargets": [
      "#/$defs/activeFilters",
      "#/$defs/attentionSummary",
      "#/$defs/recoveryPosture",
      "#/$defs/riskLedgerEntry",
      "#/$defs/settlementState",
      "#/$defs/supportRegionState",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/governance_interaction_layer.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
      "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
      "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "cache_isolation_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "governance_interaction_layer.schema.json",
      "semantic_accessibility_contract.schema.json",
      "shell_dominance_contract.schema.json",
      "shell_state_taxonomy_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "trace_span.schema.json",
    "schemaStem": "trace_span",
    "label": "Trace Span",
    "schemaId": "https://taxat.dev/schemas/trace_span.schema.json",
    "sourcePath": "Algorithm/schemas/trace_span.schema.json",
    "destinationPath": "packages/contracts-core/schemas/trace_span.schema.json",
    "sourceHash": "824e99148781a7cb5ba8aaeb88a23762c676aef65996cac7108179af857bbf13",
    "destinationHash": "824e99148781a7cb5ba8aaeb88a23762c676aef65996cac7108179af857bbf13",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "refTargets": [
      "./telemetry_resource.schema.json#/$defs/attributeMap",
      "./telemetry_resource.schema.json#/$defs/correlationContext",
      "./telemetry_resource.schema.json#/$defs/resourceRef",
      "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
      "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "manifest_branch_decision_contract.schema.json",
      "manifest_start_claim_contract.schema.json",
      "telemetry_resource.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "trust_input_basis_contract.schema.json",
    "schemaStem": "trust_input_basis_contract",
    "label": "Trust Input Basis Contract",
    "schemaId": "https://taxat.dev/schemas/trust_input_basis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/trust_input_basis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/trust_input_basis_contract.schema.json",
    "sourceHash": "e37d8e0ed7fc7df509cecc72f45f449842205647235bc16bcaeacb13033f3409",
    "destinationHash": "e37d8e0ed7fc7df509cecc72f45f449842205647235bc16bcaeacb13033f3409",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "trust_sensitivity_analysis_contract.schema.json",
    "schemaStem": "trust_sensitivity_analysis_contract",
    "label": "Trust Sensitivity Analysis Contract",
    "schemaId": "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json",
    "sourcePath": "Algorithm/schemas/trust_sensitivity_analysis_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/trust_sensitivity_analysis_contract.schema.json",
    "sourceHash": "013af2f88e375b8b3c252b49339dcd690cb09a0e70955fea8a315790ac64ed66",
    "destinationHash": "013af2f88e375b8b3c252b49339dcd690cb09a0e70955fea8a315790ac64ed66",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "https://taxat.dev/schemas/trust_sensitivity_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "trust_sensitivity_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_trust_sensitivity_analysis_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "trust_sensitivity_contract.schema.json",
    "schemaStem": "trust_sensitivity_contract",
    "label": "Trust Sensitivity Contract",
    "schemaId": "https://taxat.dev/schemas/trust_sensitivity_contract.schema.json",
    "sourcePath": "Algorithm/schemas/trust_sensitivity_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/trust_sensitivity_contract.schema.json",
    "sourceHash": "529519a523af2e5fab5bb1420aa28727a2627f1776af5c9ea6427835e626dd25",
    "destinationHash": "529519a523af2e5fab5bb1420aa28727a2627f1776af5c9ea6427835e626dd25",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "trust_summary.schema.json",
    "schemaStem": "trust_summary",
    "label": "Trust Summary",
    "schemaId": "https://taxat.dev/schemas/trust_summary.schema.json",
    "sourcePath": "Algorithm/schemas/trust_summary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/trust_summary.schema.json",
    "sourceHash": "9db7af8cb93e8d0e774abb562f8bc61e0fc531fadc29381d37c732fc35144866",
    "destinationHash": "9db7af8cb93e8d0e774abb562f8bc61e0fc531fadc29381d37c732fc35144866",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "refTargets": [
      "./schema_bundle.schema.json#/$defs/artifactContract",
      "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/trust_input_basis_contract.schema.json",
      "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "decision_explainability_contract.schema.json",
      "execution_mode_boundary_contract.schema.json",
      "schema_bundle.schema.json",
      "trust_input_basis_contract.schema.json",
      "trust_sensitivity_analysis_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_delta_arc.schema.json",
    "schemaStem": "twin_delta_arc",
    "label": "Twin Delta Arc",
    "schemaId": "https://taxat.dev/schemas/twin_delta_arc.schema.json",
    "sourcePath": "Algorithm/schemas/twin_delta_arc.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_delta_arc.schema.json",
    "sourceHash": "bd4a4ca534d8f8a7da711ff6a72af7db915c80fabca4b3e6ea042bced49be276",
    "destinationHash": "bd4a4ca534d8f8a7da711ff6a72af7db915c80fabca4b3e6ea042bced49be276",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_interpretation_state.schema.json",
    "schemaStem": "twin_interpretation_state",
    "label": "Twin Interpretation State",
    "schemaId": "https://taxat.dev/schemas/twin_interpretation_state.schema.json",
    "sourcePath": "Algorithm/schemas/twin_interpretation_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_interpretation_state.schema.json",
    "sourceHash": "b9b7492d2965f7c2fa93a24ef203c710e8b60a6cf1538c2ad16699ad1ec33fff",
    "destinationHash": "b9b7492d2965f7c2fa93a24ef203c710e8b60a6cf1538c2ad16699ad1ec33fff",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_mismatch_summary.schema.json",
    "schemaStem": "twin_mismatch_summary",
    "label": "Twin Mismatch Summary",
    "schemaId": "https://taxat.dev/schemas/twin_mismatch_summary.schema.json",
    "sourcePath": "Algorithm/schemas/twin_mismatch_summary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_mismatch_summary.schema.json",
    "sourceHash": "095d3484945ed224163d79bcba81df7584d198ffba0786aca4f5c8b8d712651a",
    "destinationHash": "095d3484945ed224163d79bcba81df7584d198ffba0786aca4f5c8b8d712651a",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_portfolio_summary.schema.json",
    "schemaStem": "twin_portfolio_summary",
    "label": "Twin Portfolio Summary",
    "schemaId": "https://taxat.dev/schemas/twin_portfolio_summary.schema.json",
    "sourcePath": "Algorithm/schemas/twin_portfolio_summary.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_portfolio_summary.schema.json",
    "sourceHash": "4733c74716b13f756f7839348a0aa7a6091baa9e9929fcee98a498e0b796c494",
    "destinationHash": "4733c74716b13f756f7839348a0aa7a6091baa9e9929fcee98a498e0b796c494",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_readiness_state.schema.json",
    "schemaStem": "twin_readiness_state",
    "label": "Twin Readiness State",
    "schemaId": "https://taxat.dev/schemas/twin_readiness_state.schema.json",
    "sourcePath": "Algorithm/schemas/twin_readiness_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_readiness_state.schema.json",
    "sourceHash": "0c586923439fa2a11ca21f1601e98ce3fec612fd2dd5041df2e44c12768f46d7",
    "destinationHash": "0c586923439fa2a11ca21f1601e98ce3fec612fd2dd5041df2e44c12768f46d7",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_reconciliation_state.schema.json",
    "schemaStem": "twin_reconciliation_state",
    "label": "Twin Reconciliation State",
    "schemaId": "https://taxat.dev/schemas/twin_reconciliation_state.schema.json",
    "sourcePath": "Algorithm/schemas/twin_reconciliation_state.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_reconciliation_state.schema.json",
    "sourceHash": "8c71a8d61bbe56290267892c39e57dcf2badf0efd8120945c6879094cee59117",
    "destinationHash": "8c71a8d61bbe56290267892c39e57dcf2badf0efd8120945c6879094cee59117",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_state_snapshot.schema.json",
    "schemaStem": "twin_state_snapshot",
    "label": "Twin State Snapshot",
    "schemaId": "https://taxat.dev/schemas/twin_state_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/twin_state_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_state_snapshot.schema.json",
    "sourceHash": "b0c6017af313b4c1caecc879f3b6171483c6a241438dd12cf67a722d71236c9f",
    "destinationHash": "b0c6017af313b4c1caecc879f3b6171483c6a241438dd12cf67a722d71236c9f",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_timeline.schema.json",
    "schemaStem": "twin_timeline",
    "label": "Twin Timeline",
    "schemaId": "https://taxat.dev/schemas/twin_timeline.schema.json",
    "sourcePath": "Algorithm/schemas/twin_timeline.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_timeline.schema.json",
    "sourceHash": "1762f32657400ba9c519d49beb89129a175ef86c1ae4e1a3e3255fbe78b7e495",
    "destinationHash": "1762f32657400ba9c519d49beb89129a175ef86c1ae4e1a3e3255fbe78b7e495",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "twin_view.schema.json",
    "schemaStem": "twin_view",
    "label": "Twin View",
    "schemaId": "https://taxat.dev/schemas/twin_view.schema.json",
    "sourcePath": "Algorithm/schemas/twin_view.schema.json",
    "destinationPath": "packages/contracts-core/schemas/twin_view.schema.json",
    "sourceHash": "64311e1d1bb5398904767c42b445844ba7005b35f6ab05e04f8b2aeca19b75d3",
    "destinationHash": "64311e1d1bb5398904767c42b445844ba7005b35f6ab05e04f8b2aeca19b75d3",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "execution_mode_boundary_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "upload_request_binding_contract.schema.json",
    "schemaStem": "upload_request_binding_contract",
    "label": "Upload Request Binding Contract",
    "schemaId": "https://taxat.dev/schemas/upload_request_binding_contract.schema.json",
    "sourcePath": "Algorithm/schemas/upload_request_binding_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/upload_request_binding_contract.schema.json",
    "sourceHash": "7b18e6aa410b184c61ce007a45da048e816fbeda8a4a2edec2e6fe2791e160a4",
    "destinationHash": "7b18e6aa410b184c61ce007a45da048e816fbeda8a4a2edec2e6fe2791e160a4",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_upload_request_binding_contract.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "upload_session_recovery_harness.schema.json",
    "schemaStem": "upload_session_recovery_harness",
    "label": "Upload Session Recovery Harness",
    "schemaId": "https://taxat.dev/schemas/upload_session_recovery_harness.schema.json",
    "sourcePath": "Algorithm/schemas/upload_session_recovery_harness.schema.json",
    "destinationPath": "packages/contracts-core/schemas/upload_session_recovery_harness.schema.json",
    "sourceHash": "68c683f58ddb2795f1d5d905bd37b659ef6e16c16eca6303731b7588c701d96c",
    "destinationHash": "68c683f58ddb2795f1d5d905bd37b659ef6e16c16eca6303731b7588c701d96c",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "#/$defs/completionState",
      "#/$defs/harnessCase",
      "#/$defs/requestProjectionSnapshot",
      "#/$defs/scenarioCode",
      "#/$defs/sessionSnapshot",
      "#/$defs/surfaceClass"
    ],
    "resolvedSchemaRefs": [],
    "sampleRefs": [
      "sample_upload_session_recovery_harness.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "verification_suite_result.schema.json",
    "schemaStem": "verification_suite_result",
    "label": "Verification Suite Result",
    "schemaId": "https://taxat.dev/schemas/verification_suite_result.schema.json",
    "sourcePath": "Algorithm/schemas/verification_suite_result.schema.json",
    "destinationPath": "packages/contracts-core/schemas/verification_suite_result.schema.json",
    "sourceHash": "16d98c98d60378245e8ec9761a60f24e67d2033ffb5161d9f31a86a59d3ab307",
    "destinationHash": "16d98c98d60378245e8ec9761a60f24e67d2033ffb5161d9f31a86a59d3ab307",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json",
      "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
      "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_sandbox_coverage_contract.schema.json",
      "release_candidate_identity_contract.schema.json",
      "schema_bundle_compatibility_gate_contract.schema.json",
      "schema_reader_window_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "visibility_partition_contract.schema.json",
    "schemaStem": "visibility_partition_contract",
    "label": "Visibility Partition Contract",
    "schemaId": "https://taxat.dev/schemas/visibility_partition_contract.schema.json",
    "sourcePath": "Algorithm/schemas/visibility_partition_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/visibility_partition_contract.schema.json",
    "sourceHash": "12b1bdad17162a04e0943cf9a89a50f94544d65334d329311625f6a57f634a12",
    "destinationHash": "12b1bdad17162a04e0943cf9a89a50f94544d65334d329311625f6a57f634a12",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "work_inbox_delta.schema.json",
    "schemaStem": "work_inbox_delta",
    "label": "Work Inbox Delta",
    "schemaId": "https://taxat.dev/schemas/work_inbox_delta.schema.json",
    "sourcePath": "Algorithm/schemas/work_inbox_delta.schema.json",
    "destinationPath": "packages/contracts-core/schemas/work_inbox_delta.schema.json",
    "sourceHash": "bab33fe29004fd26359c22a1ac0d73d18853e03d7d2fbf86aae1f4737f609ffe",
    "destinationHash": "bab33fe29004fd26359c22a1ac0d73d18853e03d7d2fbf86aae1f4737f609ffe",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/badgeUpdate",
      "#/$defs/rowRemoval",
      "#/$defs/rowUpsert",
      "./work_inbox_snapshot.schema.json#/$defs/row",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "visibility_partition_contract.schema.json",
      "work_inbox_snapshot.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "work_inbox_snapshot.schema.json",
    "schemaStem": "work_inbox_snapshot",
    "label": "Work Inbox Snapshot",
    "schemaId": "https://taxat.dev/schemas/work_inbox_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/work_inbox_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/work_inbox_snapshot.schema.json",
    "sourceHash": "7936b537901dc5d302d42f49cfa36253efe54dfc41850dd7b42d2dc15d6bada9",
    "destinationHash": "7936b537901dc5d302d42f49cfa36253efe54dfc41850dd7b42d2dc15d6bada9",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/activeFilters",
      "#/$defs/customerStatusProjection",
      "#/$defs/dueState",
      "#/$defs/filterChipCode",
      "#/$defs/recoveryPosture",
      "#/$defs/row",
      "#/$defs/rowActions",
      "#/$defs/settlementState",
      "#/$defs/sortKey",
      "#/$defs/waitingOnActor",
      "#/$defs/workflowLifecycleState",
      "https://taxat.dev/schemas/action_authority_contract.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
      "https://taxat.dev/schemas/mutation_precondition_binding.schema.json",
      "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json",
      "https://taxat.dev/schemas/work_queue_health_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "action_authority_contract.schema.json",
      "cache_isolation_contract.schema.json",
      "collaboration_queue_projection_contract.schema.json",
      "mutation_precondition_binding.schema.json",
      "operator_interaction_layer.schema.json",
      "visibility_partition_contract.schema.json",
      "work_queue_health_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "work_item_notification.schema.json",
    "schemaStem": "work_item_notification",
    "label": "Work Item Notification",
    "schemaId": "https://taxat.dev/schemas/work_item_notification.schema.json",
    "sourcePath": "Algorithm/schemas/work_item_notification.schema.json",
    "destinationPath": "packages/contracts-core/schemas/work_item_notification.schema.json",
    "sourceHash": "e675b25673a25b05297ad110b6214150e7f60406b0cc717f9f7d11589f7d5d56",
    "destinationHash": "e675b25673a25b05297ad110b6214150e7f60406b0cc717f9f7d11589f7d5d56",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "collaboration_queue_projection_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "focus_restoration_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "work_item_participant.schema.json",
    "schemaStem": "work_item_participant",
    "label": "Work Item Participant",
    "schemaId": "https://taxat.dev/schemas/work_item_participant.schema.json",
    "sourcePath": "Algorithm/schemas/work_item_participant.schema.json",
    "destinationPath": "packages/contracts-core/schemas/work_item_participant.schema.json",
    "sourceHash": "e7a8bba88b2549451d348d63d7da2782b67f548efd510cdf20d59a9ae4605add",
    "destinationHash": "e7a8bba88b2549451d348d63d7da2782b67f548efd510cdf20d59a9ae4605add",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "work_queue_health_contract.schema.json",
    "schemaStem": "work_queue_health_contract",
    "label": "Work Queue Health Contract",
    "schemaId": "https://taxat.dev/schemas/work_queue_health_contract.schema.json",
    "sourcePath": "Algorithm/schemas/work_queue_health_contract.schema.json",
    "destinationPath": "packages/contracts-core/schemas/work_queue_health_contract.schema.json",
    "sourceHash": "a7a2fd062ddb5b74d8510437df68eb977ded72932b1615cb16dd59336b93fe5d",
    "destinationHash": "a7a2fd062ddb5b74d8510437df68eb977ded72932b1615cb16dd59336b93fe5d",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [],
    "resolvedSchemaRefs": [],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "workflow_item.schema.json",
    "schemaStem": "workflow_item",
    "label": "Workflow Item",
    "schemaId": "https://taxat.dev/schemas/workflow_item.schema.json",
    "sourcePath": "Algorithm/schemas/workflow_item.schema.json",
    "destinationPath": "packages/contracts-core/schemas/workflow_item.schema.json",
    "sourceHash": "8272d23e3a9a0c66800f155d377f96df0a97f733c1669451a97cf4e6cff9fc57",
    "destinationHash": "8272d23e3a9a0c66800f155d377f96df0a97f733c1669451a97cf4e6cff9fc57",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "refTargets": [
      "https://taxat.dev/schemas/authority_truth_contract.schema.json",
      "https://taxat.dev/schemas/collaboration_routing_contract.schema.json",
      "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
      "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
      "https://taxat.dev/schemas/state_transition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "authority_truth_contract.schema.json",
      "collaboration_routing_contract.schema.json",
      "command_truth_boundary_contract.schema.json",
      "execution_mode_boundary_contract.schema.json",
      "state_transition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "workspace_cursor.schema.json",
    "schemaStem": "workspace_cursor",
    "label": "Workspace Cursor",
    "schemaId": "https://taxat.dev/schemas/workspace_cursor.schema.json",
    "sourcePath": "Algorithm/schemas/workspace_cursor.schema.json",
    "destinationPath": "packages/contracts-core/schemas/workspace_cursor.schema.json",
    "sourceHash": "5d5637c30712f2619950628f5fcdf541199d959b3ac62e4c51e93192dfaa034d",
    "destinationHash": "5d5637c30712f2619950628f5fcdf541199d959b3ac62e4c51e93192dfaa034d",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "refTargets": [
      "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "native_cache_hydration_contract.schema.json",
      "route_stability_contract.schema.json",
      "stream_recovery_contract.schema.json"
    ],
    "sampleRefs": [
      "sample_workspace_cursor.json"
    ],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "workspace_snapshot.schema.json",
    "schemaStem": "workspace_snapshot",
    "label": "Workspace Snapshot",
    "schemaId": "https://taxat.dev/schemas/workspace_snapshot.schema.json",
    "sourcePath": "Algorithm/schemas/workspace_snapshot.schema.json",
    "destinationPath": "packages/contracts-core/schemas/workspace_snapshot.schema.json",
    "sourceHash": "47a79ceeb06d68483fd8baca9146fc297049848ef5fd1a6d92ec6bc2089dddea",
    "destinationHash": "47a79ceeb06d68483fd8baca9146fc297049848ef5fd1a6d92ec6bc2089dddea",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "#/$defs/actionStrip",
      "#/$defs/attachmentPicker",
      "#/$defs/composerLayer",
      "#/$defs/contextBar",
      "#/$defs/customerRequestWorkspace",
      "#/$defs/decisionSummary",
      "#/$defs/detailDrawer",
      "#/$defs/moduleState",
      "#/$defs/permissions",
      "#/$defs/publishConfirmation",
      "#/$defs/recoveryPosture",
      "#/$defs/routeContext",
      "#/$defs/settlementState",
      "#/$defs/workItemParticipant",
      "https://taxat.dev/schemas/action_authority_contract.schema.json",
      "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
      "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
      "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
      "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
      "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
      "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
      "https://taxat.dev/schemas/portal_language_contract.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
      "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
      "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "action_authority_contract.schema.json",
      "artifact_affordance_contract.schema.json",
      "artifact_selection_contract.schema.json",
      "cache_isolation_contract.schema.json",
      "collaboration_queue_projection_contract.schema.json",
      "cross_device_continuity_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "focus_restoration_contract.schema.json",
      "operator_interaction_layer.schema.json",
      "portal_language_contract.schema.json",
      "route_stability_contract.schema.json",
      "semantic_accessibility_contract.schema.json",
      "shell_dominance_contract.schema.json",
      "shell_state_taxonomy_contract.schema.json",
      "stream_recovery_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  },
  {
    "schemaName": "workspace_stream_event.schema.json",
    "schemaStem": "workspace_stream_event",
    "label": "Workspace Stream Event",
    "schemaId": "https://taxat.dev/schemas/workspace_stream_event.schema.json",
    "sourcePath": "Algorithm/schemas/workspace_stream_event.schema.json",
    "destinationPath": "packages/contracts-core/schemas/workspace_stream_event.schema.json",
    "sourceHash": "aaab80fcae970968d9466994590f711726f2d4221d5ee69644d24c1e893c46fa",
    "destinationHash": "aaab80fcae970968d9466994590f711726f2d4221d5ee69644d24c1e893c46fa",
    "logicalFamilyRef": "CLIENT_AND_COLLABORATION",
    "logicalFamilyLabel": "Client & Collaboration",
    "refTargets": [
      "https://taxat.dev/schemas/collaboration_queue_projection_contract.schema.json",
      "https://taxat.dev/schemas/customer_safe_projection_contract.schema.json",
      "https://taxat.dev/schemas/route_stability_contract.schema.json",
      "https://taxat.dev/schemas/stream_recovery_contract.schema.json",
      "https://taxat.dev/schemas/visibility_partition_contract.schema.json"
    ],
    "resolvedSchemaRefs": [
      "collaboration_queue_projection_contract.schema.json",
      "customer_safe_projection_contract.schema.json",
      "route_stability_contract.schema.json",
      "stream_recovery_contract.schema.json",
      "visibility_partition_contract.schema.json"
    ],
    "sampleRefs": [],
    "validationPosture": "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
    "importStrategy": "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE",
    "importStatus": "IMPORTED"
  }
] as const;

export const sampleBindingCatalog = [
  {
    "sampleName": "sample_authority_binding_drift_sentinel_contract.json",
    "label": "Sample Authority Binding Drift Sentinel Contract",
    "sourcePath": "Algorithm/schemas/sample_authority_binding_drift_sentinel_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_authority_binding_drift_sentinel_contract.json",
    "sourceHash": "ee61b8d6646dd5421555f93497ac56531605fe9a0422360601b48641621ebc40",
    "destinationHash": "ee61b8d6646dd5421555f93497ac56531605fe9a0422360601b48641621ebc40",
    "inferredSchemaName": "authority_binding_drift_sentinel_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_authority_ingress_correlation_contract.json",
    "label": "Sample Authority Ingress Correlation Contract",
    "sourcePath": "Algorithm/schemas/sample_authority_ingress_correlation_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_authority_ingress_correlation_contract.json",
    "sourceHash": "090f3181e0d03c1d943bf2ce61675de97c33ffa2e6d11c29e220c92467d0db46",
    "destinationHash": "090f3181e0d03c1d943bf2ce61675de97c33ffa2e6d11c29e220c92467d0db46",
    "inferredSchemaName": "authority_ingress_correlation_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_authority_ingress_investigation_snapshot.json",
    "label": "Sample Authority Ingress Investigation Snapshot",
    "sourcePath": "Algorithm/schemas/sample_authority_ingress_investigation_snapshot.json",
    "destinationPath": "packages/contracts-core/samples/sample_authority_ingress_investigation_snapshot.json",
    "sourceHash": "4d82e0f084e211f755c2fad832608f642585b6d428156bdb24cbfecb0f597a94",
    "destinationHash": "4d82e0f084e211f755c2fad832608f642585b6d428156bdb24cbfecb0f597a94",
    "inferredSchemaName": "authority_ingress_investigation_snapshot.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/authority_ingress_investigation_snapshot.schema.json",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_authority_truth_contract.json",
    "label": "Sample Authority Truth Contract",
    "sourcePath": "Algorithm/schemas/sample_authority_truth_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_authority_truth_contract.json",
    "sourceHash": "d879fe6d9462429259dd5b067aa2e47a93bc0b24921de5e05891ef8dfe93c737",
    "destinationHash": "d879fe6d9462429259dd5b067aa2e47a93bc0b24921de5e05891ef8dfe93c737",
    "inferredSchemaName": "authority_truth_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/authority_truth_contract.schema.json",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_cache_isolation_contract.json",
    "label": "Sample Cache Isolation Contract",
    "sourcePath": "Algorithm/schemas/sample_cache_isolation_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_cache_isolation_contract.json",
    "sourceHash": "ec4d96c2df7160a8734a49afc331da8291daa7087d1214f88cddb168edb7a78b",
    "destinationHash": "ec4d96c2df7160a8734a49afc331da8291daa7087d1214f88cddb168edb7a78b",
    "inferredSchemaName": "cache_isolation_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_candidate_fact.json",
    "label": "Sample Candidate Fact",
    "sourcePath": "Algorithm/schemas/sample_candidate_fact.json",
    "destinationPath": "packages/contracts-core/samples/sample_candidate_fact.json",
    "sourceHash": "17d0722f915f6023a4513530e020e5c2cce7baf8dc5ab63f62f4c330ff46805e",
    "destinationHash": "17d0722f915f6023a4513530e020e5c2cce7baf8dc5ab63f62f4c330ff46805e",
    "inferredSchemaName": "candidate_fact.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/candidate_fact.schema.json",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_canonical_fact.json",
    "label": "Sample Canonical Fact",
    "sourcePath": "Algorithm/schemas/sample_canonical_fact.json",
    "destinationPath": "packages/contracts-core/samples/sample_canonical_fact.json",
    "sourceHash": "ab807a427905e3268694b1187d5fe18b003c6db693c69ffc08ef362ecc9c925a",
    "destinationHash": "ab807a427905e3268694b1187d5fe18b003c6db693c69ffc08ef362ecc9c925a",
    "inferredSchemaName": "canonical_fact.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/canonical_fact.schema.json",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_compute_result.json",
    "label": "Sample Compute Result",
    "sourcePath": "Algorithm/schemas/sample_compute_result.json",
    "destinationPath": "packages/contracts-core/samples/sample_compute_result.json",
    "sourceHash": "9607114d3d061a28a4649a540439b28ebcca30a8a74f85d9ec173d733ae479c6",
    "destinationHash": "9607114d3d061a28a4649a540439b28ebcca30a8a74f85d9ec173d733ae479c6",
    "inferredSchemaName": "compute_result.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/compute_result.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_config_freeze.json",
    "label": "Sample Config Freeze",
    "sourcePath": "Algorithm/schemas/sample_config_freeze.json",
    "destinationPath": "packages/contracts-core/samples/sample_config_freeze.json",
    "sourceHash": "4b589a71640974574bd5cbb812b6dd2a7145fb494b3ba5ca37aea10907faea25",
    "destinationHash": "4b589a71640974574bd5cbb812b6dd2a7145fb494b3ba5ca37aea10907faea25",
    "inferredSchemaName": "config_freeze.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/config_freeze.schema.json",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_conflict_set.json",
    "label": "Sample Conflict Set",
    "sourcePath": "Algorithm/schemas/sample_conflict_set.json",
    "destinationPath": "packages/contracts-core/samples/sample_conflict_set.json",
    "sourceHash": "694292edafa17c5b1648d4fd40f9f65490a65152fb72ee4083c273a494085c10",
    "destinationHash": "694292edafa17c5b1648d4fd40f9f65490a65152fb72ee4083c273a494085c10",
    "inferredSchemaName": "conflict_set.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/conflict_set.schema.json",
    "logicalFamilyRef": "PROVENANCE_AND_EVIDENCE",
    "logicalFamilyLabel": "Provenance & Evidence",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_cross_device_continuity_contract.json",
    "label": "Sample Cross Device Continuity Contract",
    "sourcePath": "Algorithm/schemas/sample_cross_device_continuity_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_cross_device_continuity_contract.json",
    "sourceHash": "ea820bcfa61f3c57ae9fa3ed20f9a980bfdd086badf77e349b4ebbf0c6fb4362",
    "destinationHash": "ea820bcfa61f3c57ae9fa3ed20f9a980bfdd086badf77e349b4ebbf0c6fb4362",
    "inferredSchemaName": "cross_device_continuity_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_decision_bundle.json",
    "label": "Sample Decision Bundle",
    "sourcePath": "Algorithm/schemas/sample_decision_bundle.json",
    "destinationPath": "packages/contracts-core/samples/sample_decision_bundle.json",
    "sourceHash": "b85e594c03a5d9d0b2a85925d0ce71f083962b35e30f49609075bbba782b73e5",
    "destinationHash": "b85e594c03a5d9d0b2a85925d0ce71f083962b35e30f49609075bbba782b73e5",
    "inferredSchemaName": "decision_bundle.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/decision_bundle.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_decision_explainability_contract.json",
    "label": "Sample Decision Explainability Contract",
    "sourcePath": "Algorithm/schemas/sample_decision_explainability_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_decision_explainability_contract.json",
    "sourceHash": "acf2389592fc2acdff74f0577a3e1f11916f586dd0a5d2744b3ec6108a6d5313",
    "destinationHash": "acf2389592fc2acdff74f0577a3e1f11916f586dd0a5d2744b3ec6108a6d5313",
    "inferredSchemaName": "decision_explainability_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_deterministic_golden_pack.json",
    "label": "Sample Deterministic Golden Pack",
    "sourcePath": "Algorithm/schemas/sample_deterministic_golden_pack.json",
    "destinationPath": "packages/contracts-core/samples/sample_deterministic_golden_pack.json",
    "sourceHash": "51b68545c64df517d8ce75099f2c0b89cf3f9143a56b7b469aecafbe3e52e377",
    "destinationHash": "51b68545c64df517d8ce75099f2c0b89cf3f9143a56b7b469aecafbe3e52e377",
    "inferredSchemaName": "deterministic_golden_pack.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/deterministic_golden_pack.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_drift_baseline_selection_visualization.json",
    "label": "Sample Drift Baseline Selection Visualization",
    "sourcePath": "Algorithm/schemas/sample_drift_baseline_selection_visualization.json",
    "destinationPath": "packages/contracts-core/samples/sample_drift_baseline_selection_visualization.json",
    "sourceHash": "f6a84a10cb6379061153cbf432e6e137c34086a5cf31dce276174b500d87ab76",
    "destinationHash": "f6a84a10cb6379061153cbf432e6e137c34086a5cf31dce276174b500d87ab76",
    "inferredSchemaName": "drift_baseline_selection_visualization.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/drift_baseline_selection_visualization.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_drift_baseline_selection_visualization_basis_contract.json",
    "label": "Sample Drift Baseline Selection Visualization Basis Contract",
    "sourcePath": "Algorithm/schemas/sample_drift_baseline_selection_visualization_basis_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_drift_baseline_selection_visualization_basis_contract.json",
    "sourceHash": "39022616b4f903156364d6032541e176d85a8c835854109e87bb63d30bf107da",
    "destinationHash": "39022616b4f903156364d6032541e176d85a8c835854109e87bb63d30bf107da",
    "inferredSchemaName": "drift_baseline_selection_visualization_basis_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_failure_lifecycle_dashboard.json",
    "label": "Sample Failure Lifecycle Dashboard",
    "sourcePath": "Algorithm/schemas/sample_failure_lifecycle_dashboard.json",
    "destinationPath": "packages/contracts-core/samples/sample_failure_lifecycle_dashboard.json",
    "sourceHash": "b960e7db06cc56c20a647923736c5e64817122ad143079e140e14fe6b0f8d28e",
    "destinationHash": "b960e7db06cc56c20a647923736c5e64817122ad143079e140e14fe6b0f8d28e",
    "inferredSchemaName": "failure_lifecycle_dashboard.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/failure_lifecycle_dashboard.schema.json",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_failure_resolution_contract.json",
    "label": "Sample Failure Resolution Contract",
    "sourcePath": "Algorithm/schemas/sample_failure_resolution_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_failure_resolution_contract.json",
    "sourceHash": "873cf2ca8cf377063b4c7da7707436abd8f2c49334c2cfc5e84bdef02cfb2785",
    "destinationHash": "873cf2ca8cf377063b4c7da7707436abd8f2c49334c2cfc5e84bdef02cfb2785",
    "inferredSchemaName": "failure_resolution_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/failure_resolution_contract.schema.json",
    "logicalFamilyRef": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "logicalFamilyLabel": "Retention, Failure & Observability",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_feature_flag_snapshot.json",
    "label": "Sample Feature Flag Snapshot",
    "sourcePath": "Algorithm/schemas/sample_feature_flag_snapshot.json",
    "destinationPath": "packages/contracts-core/samples/sample_feature_flag_snapshot.json",
    "sourceHash": "5981bb61cf2c377b56fa12c0e39baf896007e7f4bbee9ae3e1eede5a2edc29bf",
    "destinationHash": "5981bb61cf2c377b56fa12c0e39baf896007e7f4bbee9ae3e1eede5a2edc29bf",
    "inferredSchemaName": "feature_flag_snapshot.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/feature_flag_snapshot.schema.json",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_focus_restore_return_target_harness.json",
    "label": "Sample Focus Restore Return Target Harness",
    "sourcePath": "Algorithm/schemas/sample_focus_restore_return_target_harness.json",
    "destinationPath": "packages/contracts-core/samples/sample_focus_restore_return_target_harness.json",
    "sourceHash": "128de74f34111fafac9711dd595d243ebd983e4ddda3dd6bd4a6ed6530e04592",
    "destinationHash": "128de74f34111fafac9711dd595d243ebd983e4ddda3dd6bd4a6ed6530e04592",
    "inferredSchemaName": "focus_restore_return_target_harness.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/focus_restore_return_target_harness.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_governance_mutation_hazard_contract.json",
    "label": "Sample Governance Mutation Hazard Contract",
    "sourcePath": "Algorithm/schemas/sample_governance_mutation_hazard_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_governance_mutation_hazard_contract.json",
    "sourceHash": "b6ebfa4641bfa6f789a9c7e472dd7ecbb11e23226355ce1ccab43cc7c3fd8cbe",
    "destinationHash": "b6ebfa4641bfa6f789a9c7e472dd7ecbb11e23226355ce1ccab43cc7c3fd8cbe",
    "inferredSchemaName": "governance_mutation_hazard_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_interaction_layer_foundation_contract.json",
    "label": "Sample Interaction Layer Foundation Contract",
    "sourcePath": "Algorithm/schemas/sample_interaction_layer_foundation_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_interaction_layer_foundation_contract.json",
    "sourceHash": "78a246466c959c13ee8e5e6398c0d48fd2a6967a2dcebd615147bfdcbcefa15b",
    "destinationHash": "78a246466c959c13ee8e5e6398c0d48fd2a6967a2dcebd615147bfdcbcefa15b",
    "inferredSchemaName": "interaction_layer_foundation_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_invariant_enforcement_contract.json",
    "label": "Sample Invariant Enforcement Contract",
    "sourcePath": "Algorithm/schemas/sample_invariant_enforcement_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_invariant_enforcement_contract.json",
    "sourceHash": "4f21ed748289fa6ec4ffd65ecd01bb31c8af8e2f3e7c6059bffd957ea857c3d6",
    "destinationHash": "4f21ed748289fa6ec4ffd65ecd01bb31c8af8e2f3e7c6059bffd957ea857c3d6",
    "inferredSchemaName": "invariant_enforcement_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_late_data_retroactive_impact_simulation.json",
    "label": "Sample Late Data Retroactive Impact Simulation",
    "sourcePath": "Algorithm/schemas/sample_late_data_retroactive_impact_simulation.json",
    "destinationPath": "packages/contracts-core/samples/sample_late_data_retroactive_impact_simulation.json",
    "sourceHash": "fd3d66309b5018e5ff9da1f24bfa23f0c1c1ff2815a9b94804886ba75df201e7",
    "destinationHash": "fd3d66309b5018e5ff9da1f24bfa23f0c1c1ff2815a9b94804886ba75df201e7",
    "inferredSchemaName": "late_data_retroactive_impact_simulation.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_late_data_retroactive_impact_simulation_basis_contract.json",
    "label": "Sample Late Data Retroactive Impact Simulation Basis Contract",
    "sourcePath": "Algorithm/schemas/sample_late_data_retroactive_impact_simulation_basis_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_late_data_retroactive_impact_simulation_basis_contract.json",
    "sourceHash": "d2f53753dde065ac75b4a684945783310286ef9295bb4557b8dfdde569b2dfdf",
    "destinationHash": "d2f53753dde065ac75b4a684945783310286ef9295bb4557b8dfdde569b2dfdf",
    "inferredSchemaName": "late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_low_noise_budget_audit.json",
    "label": "Sample Low Noise Budget Audit",
    "sourcePath": "Algorithm/schemas/sample_low_noise_budget_audit.json",
    "destinationPath": "packages/contracts-core/samples/sample_low_noise_budget_audit.json",
    "sourceHash": "2090d6ab33f8a8c172a23c35b2111e5b001e355fa53ff9fe9131407ea517aac7",
    "destinationHash": "2090d6ab33f8a8c172a23c35b2111e5b001e355fa53ff9fe9131407ea517aac7",
    "inferredSchemaName": "low_noise_budget_audit.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/low_noise_budget_audit.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_low_noise_budget_audit_pack.json",
    "label": "Sample Low Noise Budget Audit Pack",
    "sourcePath": "Algorithm/schemas/sample_low_noise_budget_audit_pack.json",
    "destinationPath": "packages/contracts-core/samples/sample_low_noise_budget_audit_pack.json",
    "sourceHash": "51affd091cb8d6b7757baa15204479d8770b68773d1ce3a057842f16d8189d80",
    "destinationHash": "51affd091cb8d6b7757baa15204479d8770b68773d1ce3a057842f16d8189d80",
    "inferredSchemaName": "low_noise_budget_audit_pack.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/low_noise_budget_audit_pack.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_manifest_branch_decision_contract.json",
    "label": "Sample Manifest Branch Decision Contract",
    "sourcePath": "Algorithm/schemas/sample_manifest_branch_decision_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_manifest_branch_decision_contract.json",
    "sourceHash": "c82dff28baa3d6c261a4c6ea2311d17c50f11d8eb57006dfa1ce694f99c608bf",
    "destinationHash": "c82dff28baa3d6c261a4c6ea2311d17c50f11d8eb57006dfa1ce694f99c608bf",
    "inferredSchemaName": "manifest_branch_decision_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_manifest_lineage_trace.json",
    "label": "Sample Manifest Lineage Trace",
    "sourcePath": "Algorithm/schemas/sample_manifest_lineage_trace.json",
    "destinationPath": "packages/contracts-core/samples/sample_manifest_lineage_trace.json",
    "sourceHash": "755b8b19f41daa994952deeabf587879837f764e3a21fd1908f64d1941841042",
    "destinationHash": "755b8b19f41daa994952deeabf587879837f764e3a21fd1908f64d1941841042",
    "inferredSchemaName": "manifest_lineage_trace.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_manifest_start_claim_contract.json",
    "label": "Sample Manifest Start Claim Contract",
    "sourcePath": "Algorithm/schemas/sample_manifest_start_claim_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_manifest_start_claim_contract.json",
    "sourceHash": "13e12ae3f0e7e2f389015c3302028a747bc34881d3cb7193e76216efcca2a2a5",
    "destinationHash": "13e12ae3f0e7e2f389015c3302028a747bc34881d3cb7193e76216efcca2a2a5",
    "inferredSchemaName": "manifest_start_claim_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_native_cache_hydration_automation_pack.json",
    "label": "Sample Native Cache Hydration Automation Pack",
    "sourcePath": "Algorithm/schemas/sample_native_cache_hydration_automation_pack.json",
    "destinationPath": "packages/contracts-core/samples/sample_native_cache_hydration_automation_pack.json",
    "sourceHash": "55ed2ab8ecc885f2cda6b0ad8b5d8893247e637303b630c244a9257753c5890f",
    "destinationHash": "55ed2ab8ecc885f2cda6b0ad8b5d8893247e637303b630c244a9257753c5890f",
    "inferredSchemaName": "native_cache_hydration_automation_pack.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/native_cache_hydration_automation_pack.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_native_cache_hydration_contract.json",
    "label": "Sample Native Cache Hydration Contract",
    "sourcePath": "Algorithm/schemas/sample_native_cache_hydration_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_native_cache_hydration_contract.json",
    "sourceHash": "7c50d3dd6394cbd0c9d264fec13455a210672a09642898fcd917b85ef8d11118",
    "destinationHash": "7c50d3dd6394cbd0c9d264fec13455a210672a09642898fcd917b85ef8d11118",
    "inferredSchemaName": "native_cache_hydration_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_nightly_batch_identity_contract.json",
    "label": "Sample Nightly Batch Identity Contract",
    "sourcePath": "Algorithm/schemas/sample_nightly_batch_identity_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_nightly_batch_identity_contract.json",
    "sourceHash": "bdc57d6375b1e3a44a2fcfca8bfc8f1ed0e6712b4bd4f0cf96250ae1242d1dd1",
    "destinationHash": "bdc57d6375b1e3a44a2fcfca8bfc8f1ed0e6712b4bd4f0cf96250ae1242d1dd1",
    "inferredSchemaName": "nightly_batch_identity_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json",
    "logicalFamilyRef": "AUTHORITY_AND_ACCESS",
    "logicalFamilyLabel": "Authority & Access",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_nightly_portfolio_simulation_basis_contract.json",
    "label": "Sample Nightly Portfolio Simulation Basis Contract",
    "sourcePath": "Algorithm/schemas/sample_nightly_portfolio_simulation_basis_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_nightly_portfolio_simulation_basis_contract.json",
    "sourceHash": "2e8cf4d302f05360fb8e0ef76eefbf0bdc10305c81444f52e03a96019cf10cc1",
    "destinationHash": "2e8cf4d302f05360fb8e0ef76eefbf0bdc10305c81444f52e03a96019cf10cc1",
    "inferredSchemaName": "nightly_portfolio_simulation_basis_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_nightly_portfolio_what_if_simulation.json",
    "label": "Sample Nightly Portfolio What If Simulation",
    "sourcePath": "Algorithm/schemas/sample_nightly_portfolio_what_if_simulation.json",
    "destinationPath": "packages/contracts-core/samples/sample_nightly_portfolio_what_if_simulation.json",
    "sourceHash": "4e1cb1b4fcbfdf5de72500160ce6314b45fe5053be64e53b8d4d2053f7867711",
    "destinationHash": "4e1cb1b4fcbfdf5de72500160ce6314b45fe5053be64e53b8d4d2053f7867711",
    "inferredSchemaName": "nightly_portfolio_what_if_simulation.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/nightly_portfolio_what_if_simulation.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_recovery_checkpoint.json",
    "label": "Sample Recovery Checkpoint",
    "sourcePath": "Algorithm/schemas/sample_recovery_checkpoint.json",
    "destinationPath": "packages/contracts-core/samples/sample_recovery_checkpoint.json",
    "sourceHash": "8837b15a535a9abb1a810b69d53e5db2cf671d11fde25b4473f427775101c43e",
    "destinationHash": "8837b15a535a9abb1a810b69d53e5db2cf671d11fde25b4473f427775101c43e",
    "inferredSchemaName": "recovery_checkpoint.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/recovery_checkpoint.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_recovery_governance_contract.json",
    "label": "Sample Recovery Governance Contract",
    "sourcePath": "Algorithm/schemas/sample_recovery_governance_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_recovery_governance_contract.json",
    "sourceHash": "8ca8ab279be1ced4c6d12d07f709c1a63c43a4f787d93f8c64e15d6b6857041e",
    "destinationHash": "8ca8ab279be1ced4c6d12d07f709c1a63c43a4f787d93f8c64e15d6b6857041e",
    "inferredSchemaName": "recovery_governance_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/recovery_governance_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_release_candidate_identity_contract.json",
    "label": "Sample Release Candidate Identity Contract",
    "sourcePath": "Algorithm/schemas/sample_release_candidate_identity_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_release_candidate_identity_contract.json",
    "sourceHash": "603dd1a19df38ef06a3b02765da85fbb143aae6a850eed8dd345de44ac477cc9",
    "destinationHash": "603dd1a19df38ef06a3b02765da85fbb143aae6a850eed8dd345de44ac477cc9",
    "inferredSchemaName": "release_candidate_identity_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_release_verification_manifest_assembly_contract.json",
    "label": "Sample Release Verification Manifest Assembly Contract",
    "sourcePath": "Algorithm/schemas/sample_release_verification_manifest_assembly_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_release_verification_manifest_assembly_contract.json",
    "sourceHash": "1f0c91ff52f9c825c4ce7b8ed19c58e84ff61986a54d92aeb7482592c312128b",
    "destinationHash": "1f0c91ff52f9c825c4ce7b8ed19c58e84ff61986a54d92aeb7482592c312128b",
    "inferredSchemaName": "release_verification_manifest_assembly_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_restore_privacy_reconciliation_contract.json",
    "label": "Sample Restore Privacy Reconciliation Contract",
    "sourcePath": "Algorithm/schemas/sample_restore_privacy_reconciliation_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_restore_privacy_reconciliation_contract.json",
    "sourceHash": "2c6714bf5bb91810f860a070c902bdf0f633daa168ace4dd91d2a7c7d6e65631",
    "destinationHash": "2c6714bf5bb91810f860a070c902bdf0f633daa168ace4dd91d2a7c7d6e65631",
    "inferredSchemaName": "restore_privacy_reconciliation_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_retention_limited_explainability_contract.json",
    "label": "Sample Retention Limited Explainability Contract",
    "sourcePath": "Algorithm/schemas/sample_retention_limited_explainability_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_retention_limited_explainability_contract.json",
    "sourceHash": "d392de800ea6846362aaabb8b696d74d17713e8db7e4a641613f0fc71e9d48e3",
    "destinationHash": "d392de800ea6846362aaabb8b696d74d17713e8db7e4a641613f0fc71e9d48e3",
    "inferredSchemaName": "retention_limited_explainability_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json",
    "logicalFamilyRef": "GOVERNANCE_AND_POLICY",
    "logicalFamilyLabel": "Governance & Policy",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_schema_bundle_compatibility_gate_contract.json",
    "label": "Sample Schema Bundle Compatibility Gate Contract",
    "sourcePath": "Algorithm/schemas/sample_schema_bundle_compatibility_gate_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_schema_bundle_compatibility_gate_contract.json",
    "sourceHash": "31ba342cdb77f719e9a08bde434677b22b11d9c24d6e17901c13070fcf3747dd",
    "destinationHash": "31ba342cdb77f719e9a08bde434677b22b11d9c24d6e17901c13070fcf3747dd",
    "inferredSchemaName": "schema_bundle_compatibility_gate_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
    "logicalFamilyRef": "MANIFEST_AND_RELEASE",
    "logicalFamilyLabel": "Manifest & Release",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_semantic_accessibility_contract.json",
    "label": "Sample Semantic Accessibility Contract",
    "sourcePath": "Algorithm/schemas/sample_semantic_accessibility_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_semantic_accessibility_contract.json",
    "sourceHash": "da0745ecf2ca5766914393244a8067a967157ceab730790644c233632028f7da",
    "destinationHash": "da0745ecf2ca5766914393244a8067a967157ceab730790644c233632028f7da",
    "inferredSchemaName": "semantic_accessibility_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_semantic_accessibility_regression_pack.json",
    "label": "Sample Semantic Accessibility Regression Pack",
    "sourcePath": "Algorithm/schemas/sample_semantic_accessibility_regression_pack.json",
    "destinationPath": "packages/contracts-core/samples/sample_semantic_accessibility_regression_pack.json",
    "sourceHash": "37a03cface5fef9b03f5bab6fb72676fa6761496a825fc14f1fbfbb824c8cbb4",
    "destinationHash": "37a03cface5fef9b03f5bab6fb72676fa6761496a825fc14f1fbfbb824c8cbb4",
    "inferredSchemaName": "semantic_accessibility_regression_pack.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/semantic_accessibility_regression_pack.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_shell_continuity_fuzz_harness.json",
    "label": "Sample Shell Continuity Fuzz Harness",
    "sourcePath": "Algorithm/schemas/sample_shell_continuity_fuzz_harness.json",
    "destinationPath": "packages/contracts-core/samples/sample_shell_continuity_fuzz_harness.json",
    "sourceHash": "48e6b2044513de6d22a2d18ccae9690b301580aa4b60b735a3855bed9b0b5fc1",
    "destinationHash": "48e6b2044513de6d22a2d18ccae9690b301580aa4b60b735a3855bed9b0b5fc1",
    "inferredSchemaName": "shell_continuity_fuzz_harness.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/shell_continuity_fuzz_harness.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_shell_state_taxonomy_contract.json",
    "label": "Sample Shell State Taxonomy Contract",
    "sourcePath": "Algorithm/schemas/sample_shell_state_taxonomy_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_shell_state_taxonomy_contract.json",
    "sourceHash": "26f518c9d72ccdc9e9f17de2db0881563a4e519f50911660d8b7f65e0953fcd2",
    "destinationHash": "26f518c9d72ccdc9e9f17de2db0881563a4e519f50911660d8b7f65e0953fcd2",
    "inferredSchemaName": "shell_state_taxonomy_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_stream_recovery_contract.json",
    "label": "Sample Stream Recovery Contract",
    "sourcePath": "Algorithm/schemas/sample_stream_recovery_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_stream_recovery_contract.json",
    "sourceHash": "058d16d4ade424501a13363d737a08e84eb3d8db28d560dc0d615960ed602f67",
    "destinationHash": "058d16d4ade424501a13363d737a08e84eb3d8db28d560dc0d615960ed602f67",
    "inferredSchemaName": "stream_recovery_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/stream_recovery_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_temporal_propagation_event.json",
    "label": "Sample Temporal Propagation Event",
    "sourcePath": "Algorithm/schemas/sample_temporal_propagation_event.json",
    "destinationPath": "packages/contracts-core/samples/sample_temporal_propagation_event.json",
    "sourceHash": "15d14cf93658b58033b2858a44a96aee5a6035928d3283e9be968c105d3da897",
    "destinationHash": "15d14cf93658b58033b2858a44a96aee5a6035928d3283e9be968c105d3da897",
    "inferredSchemaName": "temporal_propagation_event.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/temporal_propagation_event.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_trust_sensitivity_analysis_contract.json",
    "label": "Sample Trust Sensitivity Analysis Contract",
    "sourcePath": "Algorithm/schemas/sample_trust_sensitivity_analysis_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_trust_sensitivity_analysis_contract.json",
    "sourceHash": "c70e31b5da8da87c85bf2dabd466e801895cc708f2a3f19040d8f994b24c028f",
    "destinationHash": "c70e31b5da8da87c85bf2dabd466e801895cc708f2a3f19040d8f994b24c028f",
    "inferredSchemaName": "trust_sensitivity_analysis_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json",
    "logicalFamilyRef": "DECISIONING_AND_NIGHTLY",
    "logicalFamilyLabel": "Decisioning & Nightly",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_upload_request_binding_contract.json",
    "label": "Sample Upload Request Binding Contract",
    "sourcePath": "Algorithm/schemas/sample_upload_request_binding_contract.json",
    "destinationPath": "packages/contracts-core/samples/sample_upload_request_binding_contract.json",
    "sourceHash": "fb0a8b9809efbe83b82626a4804f415330c3713d904abd2250d4569dfb07f5f5",
    "destinationHash": "fb0a8b9809efbe83b82626a4804f415330c3713d904abd2250d4569dfb07f5f5",
    "inferredSchemaName": "upload_request_binding_contract.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/upload_request_binding_contract.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_upload_session_recovery_harness.json",
    "label": "Sample Upload Session Recovery Harness",
    "sourcePath": "Algorithm/schemas/sample_upload_session_recovery_harness.json",
    "destinationPath": "packages/contracts-core/samples/sample_upload_session_recovery_harness.json",
    "sourceHash": "0529e7de158033b463b76ceaea70f3d9abbec8de5d99afb166b9674278a22021",
    "destinationHash": "0529e7de158033b463b76ceaea70f3d9abbec8de5d99afb166b9674278a22021",
    "inferredSchemaName": "upload_session_recovery_harness.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/upload_session_recovery_harness.schema.json",
    "logicalFamilyRef": "DOMAIN_WORKFLOW_AND_FILING",
    "logicalFamilyLabel": "Domain Workflow & Filing",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  },
  {
    "sampleName": "sample_workspace_cursor.json",
    "label": "Sample Workspace Cursor",
    "sourcePath": "Algorithm/schemas/sample_workspace_cursor.json",
    "destinationPath": "packages/contracts-core/samples/sample_workspace_cursor.json",
    "sourceHash": "d8d0d12885b3b3899acf0e7f3dbcc126b6462338e2a42f487722a98a04d6e6bf",
    "destinationHash": "d8d0d12885b3b3899acf0e7f3dbcc126b6462338e2a42f487722a98a04d6e6bf",
    "inferredSchemaName": "workspace_cursor.schema.json",
    "inferredSchemaId": "https://taxat.dev/schemas/workspace_cursor.schema.json",
    "logicalFamilyRef": "SURFACE_AND_EXPERIENCE",
    "logicalFamilyLabel": "Surface & Experience",
    "bindingMethod": "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    "validationPosture": "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND"
  }
] as const;

export const schemaCatalogByName = Object.fromEntries(
  schemaCatalog.map((entry) => [entry.schemaName, entry]),
) as Record<string, SchemaCatalogEntry>;

export const schemaCatalogById = Object.fromEntries(
  schemaCatalog.map((entry) => [entry.schemaId, entry]),
) as Record<string, SchemaCatalogEntry>;

export const sampleBindingsBySchemaName = Object.fromEntries(
  schemaCatalog.map((entry) => [
    entry.schemaName,
    sampleBindingCatalog.filter((sample) => sample.inferredSchemaName === entry.schemaName),
  ]),
) as Record<string, SampleBindingEntry[]>;

export const schemaFamilies = [
  {
    "ref": "AUTHORITY_AND_ACCESS",
    "label": "Authority & Access",
    "summary": "Authority bindings, access posture, connector delegation, request envelopes, and fraud-bound ingress identity.",
    "schemaCount": 32
  },
  {
    "ref": "CLIENT_AND_COLLABORATION",
    "label": "Client & Collaboration",
    "summary": "Client portal, collaboration workspace, uploads, approvals, and customer-safe route projections.",
    "schemaCount": 27
  },
  {
    "ref": "GOVERNANCE_AND_POLICY",
    "label": "Governance & Policy",
    "summary": "Governance read models, role and access policy, mutation hazard controls, retention posture, and tenant-scoped policy state.",
    "schemaCount": 17
  },
  {
    "ref": "MANIFEST_AND_RELEASE",
    "label": "Manifest & Release",
    "summary": "Schema windows, manifest lineage, deployment and release evidence, restore posture, and replay-safe promotion controls.",
    "schemaCount": 22
  },
  {
    "ref": "SURFACE_AND_EXPERIENCE",
    "label": "Surface & Experience",
    "summary": "Shell continuity, reduced-noise surfaces, native hydration, semantic accessibility, and interaction-layer presentation law.",
    "schemaCount": 26
  },
  {
    "ref": "DECISIONING_AND_NIGHTLY",
    "label": "Decisioning & Nightly",
    "summary": "Computation outputs, trust and parity scoring, gate semantics, and nightly digest or simulation artifacts.",
    "schemaCount": 21
  },
  {
    "ref": "PROVENANCE_AND_EVIDENCE",
    "label": "Provenance & Evidence",
    "summary": "Canonical/source evidence artifacts, provenance graph closure, intake lineage, proof bundles, and normalized conflict sets.",
    "schemaCount": 28
  },
  {
    "ref": "RETENTION_FAILURE_AND_OBSERVABILITY",
    "label": "Retention, Failure & Observability",
    "summary": "Retention proofs, error and remediation artifacts, accepted-risk evidence, and audit or telemetry records.",
    "schemaCount": 12
  },
  {
    "ref": "DOMAIN_WORKFLOW_AND_FILING",
    "label": "Domain Workflow & Filing",
    "summary": "Workflow items, filing and amendment law, drift and late-data handling, and durable operational domain records.",
    "schemaCount": 52
  }
] as const;
