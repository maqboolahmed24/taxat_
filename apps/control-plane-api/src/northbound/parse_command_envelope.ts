import {
  createCommandRequestTruthBoundaryContract,
  loadNorthboundPolicyBundle,
  NorthboundBoundaryError,
  type CommandFamilyPolicyRow,
  type CommandScopeClass,
  type NorthboundActorContext,
  type NorthboundPolicyBundle,
} from "./policy.ts";
import type {
  CommandEnvelope,
  GovernanceMutationBasisContract,
  MutationPreconditionBinding,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type ParsedCommandEnvelope = {
  command: CommandEnvelope;
  actorContext: NorthboundActorContext;
  commandFamily: CommandFamilyPolicyRow;
  policyBundle: NorthboundPolicyBundle;
};

const guardFieldNames = [
  "if_match_decision_bundle_hash",
  "if_match_shell_stability_token",
  "if_match_frame_epoch",
  "if_match_work_item_version",
  "if_match_internal_head_sequence",
  "if_match_customer_head_sequence",
  "if_match_request_state_version",
  "if_match_approval_pack_hash",
  "if_match_client_portal_workspace_version",
  "if_match_policy_snapshot_hash",
  "if_match_dependency_topology_hash",
  "simulation_basis_hash",
] as const satisfies readonly (keyof CommandEnvelope)[];

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [`${label}_NOT_OBJECT`]);
  }
  return value as Record<string, unknown>;
}

function expectLiteral<T extends string>(value: unknown, literal: T, field: string): T {
  if (value !== literal) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      `${field.toUpperCase()}_INVALID`,
    ]);
  }
  return literal;
}

function expectString(value: unknown, field: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      `${field.toUpperCase()}_REQUIRED`,
    ]);
  }
  return value;
}

function expectNullableString(value: unknown, field: string) {
  if (value === null) {
    return null;
  }
  return expectString(value, field);
}

function expectNullableInteger(value: unknown, field: string) {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      `${field.toUpperCase()}_INVALID`,
    ]);
  }
  return value;
}

function expectStringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      `${field.toUpperCase()}_INVALID`,
    ]);
  }
  const parsed = value.map((entry) => expectString(entry, field));
  if (new Set(parsed).size !== parsed.length) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      `${field.toUpperCase()}_DUPLICATE`,
    ]);
  }
  return parsed;
}

function readMutationPreconditionBinding(value: unknown): MutationPreconditionBinding {
  const record = asRecord(value, "mutation_precondition_binding");
  return {
    profile_code: expectString(record.profile_code, "profile_code") as MutationPreconditionBinding["profile_code"],
    target_scope_classes: expectStringArray(
      record.target_scope_classes,
      "target_scope_classes",
    ) as MutationPreconditionBinding["target_scope_classes"],
    required_guard_fields: expectStringArray(
      record.required_guard_fields,
      "required_guard_fields",
    ) as MutationPreconditionBinding["required_guard_fields"],
    stale_guard_families: expectStringArray(
      record.stale_guard_families,
      "stale_guard_families",
    ) as MutationPreconditionBinding["stale_guard_families"],
    requires_live_freshness:
      typeof record.requires_live_freshness === "boolean"
        ? record.requires_live_freshness
        : (() => {
            throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
              "MUTATION_PRECONDITION_BINDING_INVALID",
            ]);
          })(),
    invalidates_on_visibility_shift:
      typeof record.invalidates_on_visibility_shift === "boolean"
        ? record.invalidates_on_visibility_shift
        : (() => {
            throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
              "MUTATION_PRECONDITION_BINDING_INVALID",
            ]);
          })(),
  };
}

function readGovernanceMutationBasisContract(
  value: unknown,
): GovernanceMutationBasisContract | null {
  if (value === null) {
    return null;
  }
  const record = asRecord(value, "mutation_basis_contract");
  return {
    contract_version: expectLiteral(
      record.contract_version,
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_V1",
      "contract_version",
    ),
    basis_contract_hash: expectString(record.basis_contract_hash, "basis_contract_hash"),
    policy_snapshot_hash: expectString(record.policy_snapshot_hash, "policy_snapshot_hash"),
    access_binding_hash: expectString(record.access_binding_hash, "access_binding_hash"),
    dependency_topology_hash: expectString(
      record.dependency_topology_hash,
      "dependency_topology_hash",
    ),
    simulation_basis_hash: expectString(record.simulation_basis_hash, "simulation_basis_hash"),
    hazard_contract_hash: expectString(record.hazard_contract_hash, "hazard_contract_hash"),
    commit_authority_posture: expectString(
      record.commit_authority_posture,
      "commit_authority_posture",
    ) as GovernanceMutationBasisContract["commit_authority_posture"],
    approval_requirement: expectString(
      record.approval_requirement,
      "approval_requirement",
    ) as GovernanceMutationBasisContract["approval_requirement"],
    bounded_safe_mutation:
      record.bounded_safe_mutation === 0 || record.bounded_safe_mutation === 1
        ? record.bounded_safe_mutation
        : (() => {
            throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
              "MUTATION_BASIS_CONTRACT_INVALID",
            ]);
          })(),
    required_approvals: expectStringArray(record.required_approvals, "required_approvals"),
    simulation_confidence_score:
      typeof record.simulation_confidence_score === "number"
        ? record.simulation_confidence_score
        : (() => {
            throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
              "MUTATION_BASIS_CONTRACT_INVALID",
            ]);
          })(),
    predictability_score:
      typeof record.predictability_score === "number"
        ? record.predictability_score
        : (() => {
            throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
              "MUTATION_BASIS_CONTRACT_INVALID",
            ]);
          })(),
  };
}

function readTruthBoundaryContract(value: unknown) {
  const record = asRecord(value, "truth_boundary_contract");
  return {
    contract_version: expectString(record.contract_version, "contract_version"),
    artifact_role: expectString(record.artifact_role, "artifact_role"),
    authoritative_source_policy: expectString(
      record.authoritative_source_policy,
      "authoritative_source_policy",
    ),
    projection_input_policy: expectString(
      record.projection_input_policy,
      "projection_input_policy",
    ),
    durable_writeback_policy: expectString(
      record.durable_writeback_policy,
      "durable_writeback_policy",
    ),
    recovery_basis_policy: expectString(record.recovery_basis_policy, "recovery_basis_policy"),
    authoritative_record_families: expectStringArray(
      record.authoritative_record_families,
      "authoritative_record_families",
    ),
    observable_projection_families: expectStringArray(
      record.observable_projection_families,
      "observable_projection_families",
    ),
  };
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateExpectedMutationBinding(
  binding: MutationPreconditionBinding,
  commandFamily: CommandFamilyPolicyRow,
) {
  if (!sameJson(binding, commandFamily.mutation_precondition_binding)) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      "MUTATION_PRECONDITION_PROFILE_MISMATCH",
    ]);
  }
}

function validateExpectedTruthBoundary(command: CommandEnvelope) {
  if (!sameJson(command.truth_boundary_contract, createCommandRequestTruthBoundaryContract())) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      "COMMAND_TRUTH_BOUNDARY_INVALID",
    ]);
  }
}

function validateTargetRefs(command: CommandEnvelope, commandFamily: CommandFamilyPolicyRow) {
  const targetScope = commandFamily.target_scope_class;
  const targetMismatchReason = "TARGET_SCOPE_MISMATCH";

  switch (targetScope satisfies CommandScopeClass) {
    case "MANIFEST":
      if (!command.manifest_id || command.work_item_id !== null || command.governance_target_ref !== null) {
        throw new NorthboundBoundaryError("COMMAND_SCOPE_TARGET_MISMATCH", [targetMismatchReason]);
      }
      break;
    case "WORK_ITEM":
      if (!command.work_item_id || command.manifest_id !== null || command.governance_target_ref !== null) {
        throw new NorthboundBoundaryError("COMMAND_SCOPE_TARGET_MISMATCH", [targetMismatchReason]);
      }
      break;
    case "GOVERNANCE":
      if (!command.governance_target_ref || command.manifest_id !== null || command.work_item_id !== null) {
        throw new NorthboundBoundaryError("COMMAND_SCOPE_TARGET_MISMATCH", [targetMismatchReason]);
      }
      break;
  }
}

function validateGuardFieldSpine(command: CommandEnvelope, commandFamily: CommandFamilyPolicyRow) {
  const required = new Set(commandFamily.mutation_precondition_binding.required_guard_fields);
  for (const fieldName of guardFieldNames) {
    const value = command[fieldName];
    if (required.has(fieldName)) {
      if (value === null) {
        throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
          `${fieldName.toUpperCase()}_REQUIRED`,
        ]);
      }
    } else if (value !== null) {
      throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
        `${fieldName.toUpperCase()}_UNEXPECTED`,
      ]);
    }
  }

  if (
    commandFamily.mutation_precondition_binding.stale_guard_families.includes(
      "MUTATION_BASIS_CONTRACT_HASH",
    )
  ) {
    if (command.mutation_basis_contract === null) {
      throw new NorthboundBoundaryError("GOVERNANCE_SIMULATION_BASIS_REQUIRED", [
        "MUTATION_BASIS_CONTRACT_REQUIRED",
      ]);
    }
  } else if (command.mutation_basis_contract !== null) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [
      "MUTATION_BASIS_CONTRACT_UNEXPECTED",
    ]);
  }
}

function validateGovernanceInputs(command: CommandEnvelope, commandFamily: CommandFamilyPolicyRow) {
  if (commandFamily.requires_governance_simulation_basis) {
    if (
      !command.if_match_policy_snapshot_hash ||
      !command.if_match_dependency_topology_hash ||
      !command.simulation_basis_hash ||
      command.mutation_basis_contract === null
    ) {
      throw new NorthboundBoundaryError("GOVERNANCE_SIMULATION_BASIS_REQUIRED", [
        "SIMULATION_BASIS_REQUIRED",
      ]);
    }
    if (command.mutation_basis_contract.commit_authority_posture === "PREVIEW_ONLY") {
      throw new NorthboundBoundaryError("GOVERNANCE_PREVIEW_ONLY_COMMIT_BLOCKED", [
        "MUTATION_BASIS_PREVIEW_ONLY",
      ]);
    }
  }
}

function validateActorContext(command: CommandEnvelope, actorContext: NorthboundActorContext) {
  if (command.tenant_id !== actorContext.tenant_id) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", ["TENANT_ID_MISMATCH"]);
  }
  if (command.actor_session_ref !== actorContext.session_ref) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", ["ACTOR_SESSION_MISMATCH"]);
  }
  if (command.client_id !== null && actorContext.client_id_or_null !== null) {
    if (command.client_id !== actorContext.client_id_or_null) {
      throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", ["CLIENT_ID_MISMATCH"]);
    }
  }
}

export async function parseCommandEnvelope(
  input: unknown,
  actorContext: NorthboundActorContext,
  options?: {
    policyBundle?: NorthboundPolicyBundle;
  },
): Promise<ParsedCommandEnvelope> {
  const policyBundle = options?.policyBundle ?? (await loadNorthboundPolicyBundle());
  const record = asRecord(input, "command_envelope");
  const mutationPreconditionBinding = readMutationPreconditionBinding(
    record.mutation_precondition_binding,
  );

  const command = {
    artifact_type: expectLiteral(record.artifact_type, "CommandEnvelope", "artifact_type"),
    command_id: expectString(record.command_id, "command_id"),
    command_type: expectString(record.command_type, "command_type"),
    idempotency_key: expectString(record.idempotency_key, "idempotency_key"),
    actor_session_ref: expectString(record.actor_session_ref, "actor_session_ref"),
    target_scope_class: expectString(record.target_scope_class, "target_scope_class") as CommandEnvelope["target_scope_class"],
    tenant_id: expectString(record.tenant_id, "tenant_id"),
    client_id: expectNullableString(record.client_id, "client_id"),
    manifest_id: expectNullableString(record.manifest_id, "manifest_id"),
    work_item_id: expectNullableString(record.work_item_id, "work_item_id"),
    governance_target_ref: expectNullableString(
      record.governance_target_ref,
      "governance_target_ref",
    ),
    period: expectNullableString(record.period, "period"),
    requested_scope: expectStringArray(record.requested_scope, "requested_scope"),
    if_match_decision_bundle_hash: expectNullableString(
      record.if_match_decision_bundle_hash,
      "if_match_decision_bundle_hash",
    ),
    if_match_shell_stability_token: expectNullableString(
      record.if_match_shell_stability_token,
      "if_match_shell_stability_token",
    ),
    if_match_frame_epoch: expectNullableInteger(record.if_match_frame_epoch, "if_match_frame_epoch"),
    if_match_work_item_version: expectNullableInteger(
      record.if_match_work_item_version,
      "if_match_work_item_version",
    ),
    if_match_internal_head_sequence: expectNullableInteger(
      record.if_match_internal_head_sequence,
      "if_match_internal_head_sequence",
    ),
    if_match_customer_head_sequence: expectNullableInteger(
      record.if_match_customer_head_sequence,
      "if_match_customer_head_sequence",
    ),
    if_match_request_state_version: expectNullableInteger(
      record.if_match_request_state_version,
      "if_match_request_state_version",
    ),
    if_match_approval_pack_hash: expectNullableString(
      record.if_match_approval_pack_hash,
      "if_match_approval_pack_hash",
    ),
    if_match_client_portal_workspace_version: expectNullableInteger(
      record.if_match_client_portal_workspace_version,
      "if_match_client_portal_workspace_version",
    ),
    if_match_policy_snapshot_hash: expectNullableString(
      record.if_match_policy_snapshot_hash,
      "if_match_policy_snapshot_hash",
    ),
    if_match_dependency_topology_hash: expectNullableString(
      record.if_match_dependency_topology_hash,
      "if_match_dependency_topology_hash",
    ),
    simulation_basis_hash: expectNullableString(record.simulation_basis_hash, "simulation_basis_hash"),
    mutation_basis_contract: readGovernanceMutationBasisContract(record.mutation_basis_contract),
    truth_boundary_contract: readTruthBoundaryContract(record.truth_boundary_contract),
    mutation_precondition_binding: mutationPreconditionBinding,
    payload: asRecord(record.payload, "payload"),
    requested_at: expectString(record.requested_at, "requested_at"),
  } satisfies CommandEnvelope;

  const commandFamily = policyBundle.commandFamiliesByType.get(command.command_type);
  if (!commandFamily) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", ["COMMAND_TYPE_UNSUPPORTED"]);
  }

  if (command.target_scope_class !== commandFamily.target_scope_class) {
    throw new NorthboundBoundaryError("COMMAND_SCOPE_TARGET_MISMATCH", ["TARGET_SCOPE_MISMATCH"]);
  }

  if (commandFamily.requires_client_id && command.client_id === null) {
    throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", ["CLIENT_ID_REQUIRED"]);
  }

  validateExpectedMutationBinding(command.mutation_precondition_binding, commandFamily);
  validateExpectedTruthBoundary(command);
  validateTargetRefs(command, commandFamily);
  validateGovernanceInputs(command, commandFamily);
  validateGuardFieldSpine(command, commandFamily);
  validateActorContext(command, actorContext);

  return {
    command,
    actorContext,
    commandFamily,
    policyBundle,
  };
}
