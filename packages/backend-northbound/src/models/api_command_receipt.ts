import type { ApiCommandReceipt } from "../../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type { ApiCommandReceipt, RouteStabilityContract };

export type ApiCommandReceiptAcceptanceState = ApiCommandReceipt["acceptance_state"];
export type ApiCommandReceiptStaleGuardFamily = NonNullable<ApiCommandReceipt["stale_guard_family"]>;

export class ApiCommandReceiptContractError extends Error {
  readonly code = "API_COMMAND_RECEIPT_CONTRACT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "ApiCommandReceiptContractError";
  }
}

const successAcceptanceStates = new Set<ApiCommandReceiptAcceptanceState>([
  "ACCEPTED",
  "DUPLICATE_REPLAY",
]);

const manifestStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "DECISION_BUNDLE_HASH",
  "SHELL_STABILITY_TOKEN",
  "FRAME_EPOCH",
  "APPROVAL_PACK_HASH",
]);

const workItemStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "WORK_ITEM_VERSION",
  "INTERNAL_THREAD_HEAD",
  "CUSTOMER_THREAD_HEAD",
  "REQUEST_STATE_VERSION",
]);

const portalStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "CLIENT_PORTAL_WORKSPACE_VERSION",
]);

const governanceStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "POLICY_SNAPSHOT_HASH",
  "DEPENDENCY_TOPOLOGY_HASH",
  "SIMULATION_BASIS_HASH",
  "MUTATION_BASIS_CONTRACT_HASH",
]);

const stringStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "DECISION_BUNDLE_HASH",
  "SHELL_STABILITY_TOKEN",
  "APPROVAL_PACK_HASH",
  "POLICY_SNAPSHOT_HASH",
  "DEPENDENCY_TOPOLOGY_HASH",
  "SIMULATION_BASIS_HASH",
  "MUTATION_BASIS_CONTRACT_HASH",
]);

const integerStaleGuardFamilies = new Set<ApiCommandReceiptStaleGuardFamily>([
  "FRAME_EPOCH",
  "WORK_ITEM_VERSION",
  "INTERNAL_THREAD_HEAD",
  "CUSTOMER_THREAD_HEAD",
  "REQUEST_STATE_VERSION",
  "CLIENT_PORTAL_WORKSPACE_VERSION",
]);

function fail(message: string): never {
  throw new ApiCommandReceiptContractError(message);
}

export function cloneApiCommandReceipt(receipt: ApiCommandReceipt): ApiCommandReceipt {
  return JSON.parse(JSON.stringify(receipt)) as ApiCommandReceipt;
}

export function receiptSuccessClass(receipt: ApiCommandReceipt) {
  const activeState =
    receipt.acceptance_state === "EXPIRED"
      ? receipt.original_acceptance_state
      : receipt.acceptance_state;
  return activeState !== null && successAcceptanceStates.has(activeState);
}

export function receiptHasDurableRecoveryAnchor(receipt: ApiCommandReceipt) {
  return (
    Boolean(receipt.result_ref) ||
    receipt.activity_refs.length > 0 ||
    receipt.audit_event_refs.length > 0
  );
}

export function assertApiCommandReceiptContract(receipt: ApiCommandReceipt) {
  if (receipt.artifact_type !== "ApiCommandReceipt") {
    fail("receipt artifact_type must be ApiCommandReceipt");
  }
  if (
    receipt.duplicate_of_receipt_id !== null &&
    receipt.duplicate_of_receipt_id === receipt.receipt_id
  ) {
    fail("duplicate_of_receipt_id must not point at the same receipt");
  }
  if (Date.parse(receipt.expires_at) <= Date.parse(receipt.accepted_at)) {
    fail("expires_at must be later than accepted_at");
  }
  switch (receipt.target_scope_class) {
    case "MANIFEST":
      if (
        receipt.manifest_id === null ||
        receipt.work_item_id !== null ||
        receipt.governance_target_ref !== null
      ) {
        fail("MANIFEST receipts must retain only manifest_id as their target ref");
      }
      break;
    case "WORK_ITEM":
      if (
        receipt.work_item_id === null ||
        receipt.manifest_id !== null ||
        receipt.governance_target_ref !== null
      ) {
        fail("WORK_ITEM receipts must retain only work_item_id as their target ref");
      }
      break;
    case "GOVERNANCE":
      if (
        receipt.governance_target_ref === null ||
        receipt.manifest_id !== null ||
        receipt.work_item_id !== null
      ) {
        fail("GOVERNANCE receipts must retain only governance_target_ref as their target ref");
      }
      break;
  }

  if (receiptSuccessClass(receipt)) {
    if (receipt.latest_projection_ref !== null && !receiptHasDurableRecoveryAnchor(receipt)) {
      fail("latest_projection_ref cannot be the sole success-class recovery anchor");
    }
    if (!receiptHasDurableRecoveryAnchor(receipt)) {
      fail("success-class receipts must retain a durable recovery anchor");
    }
    if (receipt.semantic_action_id === null) {
      fail("success-class receipts must retain semantic_action_id");
    }
  }

  if (
    receipt.acceptance_state === "DUPLICATE_REPLAY" &&
    receipt.duplicate_of_receipt_id === null
  ) {
    fail("duplicate replay receipts must retain duplicate_of_receipt_id");
  }
  if (receipt.acceptance_state === "EXPIRED") {
    if (receipt.original_acceptance_state === null) {
      fail("expired receipts must retain original_acceptance_state");
    }
    if (
      receipt.original_acceptance_state === "ACCEPTED" &&
      receipt.duplicate_of_receipt_id !== null
    ) {
      fail("expired accepted receipts must not retain duplicate_of_receipt_id");
    }
    if (
      receipt.original_acceptance_state === "DUPLICATE_REPLAY" &&
      receipt.duplicate_of_receipt_id === null
    ) {
      fail("expired duplicate receipts must retain duplicate_of_receipt_id");
    }
  }

  if (receipt.acceptance_state === "REJECTED_STALE_VIEW") {
    if (receipt.stale_guard_family === null) {
      fail("stale-view receipts must retain stale_guard_family");
    }
    if (receipt.latest_stale_guard_value === null) {
      fail("stale-view receipts must retain latest_stale_guard_value");
    }
    if (receipt.latest_stability_contract_or_null === null) {
      fail("stale-view receipts must retain latest_stability_contract_or_null");
    }
    if (receipt.latest_projection_ref === null) {
      fail("stale-view receipts must retain latest_projection_ref");
    }
  }

  const family = receipt.stale_guard_family;
  if (family === null) {
    if (receipt.latest_stale_guard_value !== null) {
      fail("latest_stale_guard_value must be null without stale_guard_family");
    }
    return;
  }

  if (!receipt.mutation_precondition_binding.stale_guard_families.includes(family)) {
    fail("stale_guard_family must be inside mutation_precondition_binding.stale_guard_families");
  }

  if (manifestStaleGuardFamilies.has(family) && receipt.target_scope_class !== "MANIFEST") {
    fail(`${family} must target MANIFEST receipts`);
  }
  if (workItemStaleGuardFamilies.has(family) && receipt.target_scope_class !== "WORK_ITEM") {
    fail(`${family} must target WORK_ITEM receipts`);
  }
  if (portalStaleGuardFamilies.has(family) && receipt.target_scope_class === "GOVERNANCE") {
    fail("CLIENT_PORTAL_WORKSPACE_VERSION must not target GOVERNANCE receipts");
  }
  if (governanceStaleGuardFamilies.has(family) && receipt.target_scope_class !== "GOVERNANCE") {
    fail(`${family} must target GOVERNANCE receipts`);
  }
  if (family === "REQUEST_STATE_VERSION" && receipt.command_type !== "RESPOND_TO_REQUEST_INFO") {
    fail("REQUEST_STATE_VERSION must bind RESPOND_TO_REQUEST_INFO");
  }
  if (stringStaleGuardFamilies.has(family) && typeof receipt.latest_stale_guard_value !== "string") {
    fail(`${family} must retain a string latest_stale_guard_value`);
  }
  if (
    integerStaleGuardFamilies.has(family) &&
    (!Number.isInteger(receipt.latest_stale_guard_value) || Number(receipt.latest_stale_guard_value) < 0)
  ) {
    fail(`${family} must retain a non-negative integer latest_stale_guard_value`);
  }

  if (receipt.target_scope_class !== "GOVERNANCE") {
    if (
      receipt.dependency_topology_hash !== null ||
      receipt.simulation_basis_hash !== null ||
      receipt.latest_mutation_basis_contract_or_null !== null
    ) {
      fail("only GOVERNANCE receipts may retain governance mutation basis hashes");
    }
  }
}
