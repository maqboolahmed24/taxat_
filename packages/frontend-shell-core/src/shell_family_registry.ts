import webShellContractFixture from "./fixtures/web_shell_contract_packets.json" with { type: "json" };
import type { InteractionLayerFoundationContract } from "./route_contracts/interaction_layer_foundation";
import type { RouteScopeClass, RouteStabilityContract } from "./route_contracts/route_stability";
import type {
  SelectorProfile,
  SemanticAccessibilityContract,
  SemanticAnchor,
  ShellFamilyCode,
} from "./route_contracts/semantic_accessibility";
import type { ShellStateTaxonomyContract } from "./route_contracts/shell_state_taxonomy";

export type ShellFamilyRegistryEntry = {
  shell_family: ShellFamilyCode;
  app_boundaries: readonly string[];
  selector_profile: SelectorProfile;
  layout_density_token: string;
  primary_route_ids: readonly string[];
  theme: Readonly<Record<string, string>>;
  layout_budget: Readonly<Record<string, number>>;
};

export type SharedWebRouteContract = {
  route_id: string;
  app_boundary: "operator-web" | "client-portal-web";
  title: string;
  route_path: string;
  public_path: string;
  shell_family: ShellFamilyCode;
  selector_profile: SelectorProfile;
  route_scope_class: RouteScopeClass;
  surface_type: string;
  shell_route_key: string;
  workspace_route_key: string;
  object_anchor_ref: string;
  focus_anchor_ref: string;
  support_surface_kind: string;
  primary_question: string;
  primary_action_label: string;
  support_action_label: string;
  route_contract: {
    shell_route_key: string;
    workspace_route_key: string;
    route_context: {
      shell_stability_token: string;
      view_guard_ref: string;
      publication_generation: number;
      object_anchor_ref: string;
      focus_anchor_ref: string;
    };
  };
  route_stability_contract: RouteStabilityContract;
  semantic_accessibility_contract: SemanticAccessibilityContract;
  interaction_layer_foundation_contract: InteractionLayerFoundationContract;
  shell_state_taxonomy_contract: ShellStateTaxonomyContract;
  semantic_anchors: readonly SemanticAnchor[];
};

export type SemanticRegressionCase = {
  case_id: string;
  shell_family: ShellFamilyCode;
  selector_profile: SelectorProfile;
  automation_harness: "PLAYWRIGHT" | "XCUITEST";
  covered_modalities: readonly string[];
  live_update_focus_theft_detected: boolean;
  excessive_live_noise_detected: boolean;
  support_surface_modal_trap_detected: boolean;
  reduced_motion_semantics_preserved: boolean;
};

export type SemanticRegressionPack = {
  contract_version: "SEMANTIC_ACCESSIBILITY_REGRESSION_PACK_V1";
  pack_id: string;
  deterministic_seed: number;
  suite_profile: "CROSS_SHELL_SEMANTIC_ACCESSIBILITY_AND_ASSISTIVE_TECH_MATRIX";
  run_mode: "DETERMINISTIC_SEEDED_ENUMERATION";
  modality_policy: "EVERY_CASE_COVERS_KEYBOARD_SCREEN_READER_AND_REDUCED_MOTION";
  identifier_binding_policy: "AUTOMATION_IDENTIFIERS_MUST_EQUAL_SEMANTIC_ANCHOR_REFS";
  landmark_heading_policy: "LANDMARKS_AND_HEADINGS_MIRROR_VISIBLE_SHELL_STRUCTURE";
  live_update_announcement_policy: "DECISIVE_CHANGE_ANNOUNCED_WITHOUT_NOISE_OR_FOCUS_THEFT";
  support_surface_policy: "PROMOTED_SUPPORT_AND_DETAIL_SURFACES_REMAIN_NON_MODAL_AND_ESCAPABLE";
  transition_stability_policy: "RESPONSIVE_REBASE_RECONNECT_AND_COLLAPSE_KEEP_SEMANTIC_ANCHORS_STABLE";
  return_path_policy: "RETURN_PATH_CONTROLS_REMAIN_ADDRESSABLE_ACROSS_CONTEXTUAL_AND_SECONDARY_FLOWS";
  cases: readonly SemanticRegressionCase[];
};

export type SharedWebShellContractFixture = {
  contract_fixture_version: "SHARED_WEB_WORKSPACE_ROUTE_CONTRACT_SCAFFOLD_V1";
  fixture_id: string;
  source_contract_paths: readonly string[];
  shell_families: readonly ShellFamilyRegistryEntry[];
  routes: readonly SharedWebRouteContract[];
  semantic_regression_pack: SemanticRegressionPack;
};

export const sharedWebShellContractFixture =
  webShellContractFixture as SharedWebShellContractFixture;

export const shellFamilyRegistry = sharedWebShellContractFixture.shell_families;

export const sharedWebShellRouteContracts = sharedWebShellContractFixture.routes;

export const sharedWebShellSemanticRegressionPack =
  sharedWebShellContractFixture.semantic_regression_pack;

export function getShellFamilyRegistryEntry(shellFamily: ShellFamilyCode) {
  const entry = shellFamilyRegistry.find((candidate) => candidate.shell_family === shellFamily);
  if (!entry) {
    throw new Error(`Unknown shell family registry entry: ${shellFamily}`);
  }
  return entry;
}

export function getSharedRouteContract(routeId: string) {
  const route = sharedWebShellRouteContracts.find((candidate) => candidate.route_id === routeId);
  if (!route) {
    throw new Error(`Unknown shared web shell route contract: ${routeId}`);
  }
  return route;
}

export function getSharedRouteContractsForApp(appBoundary: SharedWebRouteContract["app_boundary"]) {
  return sharedWebShellRouteContracts.filter((route) => route.app_boundary === appBoundary);
}
