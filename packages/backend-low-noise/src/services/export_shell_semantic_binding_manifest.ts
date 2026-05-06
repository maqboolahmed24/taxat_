import type {
  InteractionLayerShellFamily,
  ShellFamilySemanticTokenAliases,
} from "../semantics/shell_family_token_registry.ts";
import {
  orderedInteractionLayerShellFamilies,
  shellFamilyTokenRegistry,
} from "../semantics/shell_family_token_registry.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";

export type ShellSemanticBindingManifestEntry = {
  cross_shell_semantic_fields: readonly string[];
  foundation_contract: ReturnType<typeof projectFoundationContractForShell>;
  renderer_binding_policy: "ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES";
  semantic_token_aliases: ShellFamilySemanticTokenAliases;
  shell_family: InteractionLayerShellFamily;
  shell_specific_semantic_fields: readonly string[];
};

export type ShellSemanticBindingManifest = {
  manifest_version: "SHELL_SEMANTIC_BINDING_MANIFEST_V1";
  sensitive_data_policy: "NO_TENANT_CLIENT_PRINCIPAL_OR_ROUTE_OBJECT_DATA";
  shell_families: ShellSemanticBindingManifestEntry[];
  source_registry: "packages/backend-low-noise/src/semantics/shell_family_token_registry.ts";
};

export function exportShellSemanticBindingManifest(): ShellSemanticBindingManifest {
  return {
    manifest_version: "SHELL_SEMANTIC_BINDING_MANIFEST_V1",
    sensitive_data_policy: "NO_TENANT_CLIENT_PRINCIPAL_OR_ROUTE_OBJECT_DATA",
    shell_families: orderedInteractionLayerShellFamilies.map((shellFamily) => {
      const registryEntry = shellFamilyTokenRegistry[shellFamily];
      return {
        cross_shell_semantic_fields: [...registryEntry.cross_shell_semantic_fields],
        foundation_contract: projectFoundationContractForShell({ shellFamily }),
        renderer_binding_policy: registryEntry.renderer_binding_policy,
        semantic_token_aliases: { ...registryEntry.semantic_token_aliases },
        shell_family: shellFamily,
        shell_specific_semantic_fields: [...registryEntry.shell_specific_semantic_fields],
      };
    }),
    source_registry: "packages/backend-low-noise/src/semantics/shell_family_token_registry.ts",
  };
}
