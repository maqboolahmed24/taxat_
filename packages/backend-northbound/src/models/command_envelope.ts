import type {
  CommandEnvelope,
  CommandTruthBoundaryContract,
  MutationPreconditionBinding,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";

export type {
  CommandEnvelope,
  CommandTruthBoundaryContract,
  MutationPreconditionBinding,
  NorthboundActorContext,
};

export type CommandTargetScopeClass = CommandEnvelope["target_scope_class"];
export type CommandPayload = CommandEnvelope["payload"];

export const commandEnvelopeGuardFields = [
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

export type CommandEnvelopeGuardField = (typeof commandEnvelopeGuardFields)[number];

export const portalRouteMutationCommands = [
  "CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP",
  "CLIENT_PORTAL_FINALIZE_UPLOAD",
  "CLIENT_PORTAL_REQUEST_HELP",
] as const;

export const portalApprovalPackCommands = [
  "CLIENT_PORTAL_ACKNOWLEDGE_APPROVAL_PACK",
  "CLIENT_PORTAL_SIGN_APPROVAL_PACK",
] as const;

export const collaborationCommands = [
  "ASSIGN_WORK_ITEM",
  "REASSIGN_WORK_ITEM",
  "ESCALATE_WORK_ITEM",
  "ADD_INTERNAL_NOTE",
  "ADD_CUSTOMER_COMMENT",
  "REQUEST_CUSTOMER_INFO",
  "RESPOND_TO_REQUEST_INFO",
  "CHANGE_WORK_ITEM_STATUS",
  "SET_WORK_ITEM_DUE_DATES",
] as const;

export function cloneCommandEnvelope(command: CommandEnvelope): CommandEnvelope {
  return JSON.parse(JSON.stringify(command)) as CommandEnvelope;
}

export function commandTargetRef(command: CommandEnvelope) {
  switch (command.target_scope_class) {
    case "MANIFEST":
      return command.manifest_id;
    case "WORK_ITEM":
      return command.work_item_id;
    case "GOVERNANCE":
      return command.governance_target_ref;
  }
}

export function commandActorKey(command: CommandEnvelope, actorContext: NorthboundActorContext) {
  return [
    command.tenant_id,
    actorContext.principal_ref,
    actorContext.session_ref,
    command.client_id ?? actorContext.client_id_or_null ?? "client.system.control-plane",
  ].join("|");
}
