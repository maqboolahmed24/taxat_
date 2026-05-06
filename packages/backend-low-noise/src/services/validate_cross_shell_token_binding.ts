import { isDeepStrictEqual } from "node:util";

import type { PortalInteractionLayer } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type {
  GovernanceInteractionLayer,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { ShellSemanticBindingManifest } from "./export_shell_semantic_binding_manifest.ts";
import { exportShellSemanticBindingManifest } from "./export_shell_semantic_binding_manifest.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";
import { projectGovernanceInteractionSemanticsSeed } from "./project_governance_interaction_semantics_seed.ts";
import { projectPortalInteractionLayer } from "./project_portal_interaction_layer.ts";

export class CrossShellTokenBindingError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "CrossShellTokenBindingError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new CrossShellTokenBindingError(message, reasonCodes);
}

const allowedGovernancePreservedContextCodes = new Set([
  "ACTIVE_FILTERS",
  "ACTIVE_SECTION",
  "SELECTION",
  "FOCUS_ANCHOR",
  "PROMOTED_SUPPORT_SURFACE",
  "STAGED_DIFF",
  "CHANGE_BASKET",
  "GUIDED_HANDSHAKE_STEP",
  "QUERY_SLICE",
]);

function assertUniqueNonEmptyStrings(values: readonly string[], label: string) {
  if (values.some((value) => value.trim().length === 0)) {
    fail(`${label} cannot contain blank values`, ["CROSS_SHELL_BLANK_BINDING_VALUE"]);
  }
  if (new Set(values).size !== values.length) {
    fail(`${label} cannot contain duplicates`, ["CROSS_SHELL_DUPLICATE_BINDING_VALUE"]);
  }
}

export function validateCrossShellTokenBinding(input: {
  foundationContract?: InteractionLayerFoundationContract | undefined;
  governanceInteractionLayer?: GovernanceInteractionLayer | undefined;
  manifest?: ShellSemanticBindingManifest | undefined;
  portalInteractionLayer?: PortalInteractionLayer | undefined;
}) {
  if (input.foundationContract !== undefined) {
    const expectedFoundation = projectFoundationContractForShell({
      shellFamily: input.foundationContract.shell_family,
    });
    if (!isDeepStrictEqual(input.foundationContract, expectedFoundation)) {
      fail("Interaction foundation drifted from the cross-shell semantic registry", [
        "CROSS_SHELL_FOUNDATION_DRIFT",
      ]);
    }
  }

  if (input.portalInteractionLayer !== undefined) {
    const expectedPortalLayer = projectPortalInteractionLayer();
    if (!isDeepStrictEqual(input.portalInteractionLayer, expectedPortalLayer)) {
      fail("Portal interaction layer drifted from the cross-shell semantic registry", [
        "CROSS_SHELL_PORTAL_INTERACTION_DRIFT",
      ]);
    }
  }

  if (input.governanceInteractionLayer !== undefined) {
    const layer = input.governanceInteractionLayer;
    const expectedStaticSeed = projectGovernanceInteractionSemanticsSeed({
      auxiliarySurfacePresentation: layer.auxiliary_surface_presentation,
      compactionMode: layer.compaction_mode,
      focusTrapMode: layer.focus_trap_mode,
      preservedContextCodes: layer.preserved_context_codes,
      selectedFilterChipRefs: layer.selected_filter_chip_refs,
    });
    if (!isDeepStrictEqual(layer, expectedStaticSeed)) {
      fail("Governance interaction seed drifted from the cross-shell semantic registry", [
        "CROSS_SHELL_GOVERNANCE_INTERACTION_DRIFT",
      ]);
    }
    assertUniqueNonEmptyStrings(layer.selected_filter_chip_refs, "selected_filter_chip_refs");
    if (layer.preserved_context_codes.length === 0) {
      fail("preserved_context_codes must keep at least one governance context", [
        "CROSS_SHELL_GOVERNANCE_CONTEXT_EMPTY",
      ]);
    }
    assertUniqueNonEmptyStrings(layer.preserved_context_codes, "preserved_context_codes");
    if (
      layer.preserved_context_codes.some(
        (contextCode) => !allowedGovernancePreservedContextCodes.has(contextCode),
      )
    ) {
      fail("preserved_context_codes contains an unknown governance context", [
        "CROSS_SHELL_GOVERNANCE_CONTEXT_UNKNOWN",
      ]);
    }
  }

  if (input.manifest !== undefined) {
    if (!isDeepStrictEqual(input.manifest, exportShellSemanticBindingManifest())) {
      fail("Shell semantic binding manifest drifted from the cross-shell semantic registry", [
        "CROSS_SHELL_MANIFEST_DRIFT",
      ]);
    }
  }

  return input;
}
