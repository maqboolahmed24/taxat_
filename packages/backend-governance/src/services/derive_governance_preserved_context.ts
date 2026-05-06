import type { GovernanceInteractionLayer } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type { GovernanceInteractionRouteFamily } from "./derive_governance_filter_chip_echo.ts";

export type GovernancePreservedContextCode =
  GovernanceInteractionLayer["preserved_context_codes"][number];

const routePreservedContext = {
  audit_investigation: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "QUERY_SLICE",
  ],
  authority_link_inventory: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "GUIDED_HANDSHAKE_STEP",
  ],
  governance_policy_snapshot: [
    "ACTIVE_SECTION",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
    "CHANGE_BASKET",
  ],
  principal_access_view: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
  ],
  retention_governance: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
  ],
  role_template_matrix: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
  ],
  tenant_governance_snapshot: [
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
  ],
} as const satisfies Record<GovernanceInteractionRouteFamily, readonly GovernancePreservedContextCode[]>;

const supportedContextCodes = new Set<GovernancePreservedContextCode>([
  "ACTIVE_FILTERS",
  "ACTIVE_SECTION",
  "CHANGE_BASKET",
  "FOCUS_ANCHOR",
  "GUIDED_HANDSHAKE_STEP",
  "PROMOTED_SUPPORT_SURFACE",
  "QUERY_SLICE",
  "SELECTION",
  "STAGED_DIFF",
]);

export class GovernancePreservedContextError extends Error {
  readonly code:
    | "GOVERNANCE_CONTEXT_COMPACTION_UNBOUND"
    | "GOVERNANCE_CONTEXT_DUPLICATE"
    | "GOVERNANCE_CONTEXT_EMPTY"
    | "GOVERNANCE_CONTEXT_UNSUPPORTED";

  constructor(code: GovernancePreservedContextError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernancePreservedContextError";
    this.code = code;
  }
}

function assertContextCodes(
  values: readonly GovernancePreservedContextCode[],
): GovernanceInteractionLayer["preserved_context_codes"] {
  if (values.length === 0) {
    throw new GovernancePreservedContextError(
      "GOVERNANCE_CONTEXT_EMPTY",
      "GovernanceInteractionLayer requires at least one preserved context code",
    );
  }
  const seen = new Set<GovernancePreservedContextCode>();
  for (const value of values) {
    if (!supportedContextCodes.has(value)) {
      throw new GovernancePreservedContextError(
        "GOVERNANCE_CONTEXT_UNSUPPORTED",
        `unsupported governance preserved context code ${value}`,
      );
    }
    if (seen.has(value)) {
      throw new GovernancePreservedContextError(
        "GOVERNANCE_CONTEXT_DUPLICATE",
        `preserved_context_codes cannot repeat ${value}`,
      );
    }
    seen.add(value);
  }
  return [...values];
}

export function deriveGovernancePreservedContext(input: {
  compactionMode?: GovernanceInteractionLayer["compaction_mode"] | undefined;
  overrideContextCodes?: readonly GovernancePreservedContextCode[] | undefined;
  routeFamily: GovernanceInteractionRouteFamily;
}): GovernanceInteractionLayer["preserved_context_codes"] {
  const contextCodes = assertContextCodes(
    input.overrideContextCodes ?? routePreservedContext[input.routeFamily],
  );
  if (
    input.compactionMode !== undefined &&
    input.compactionMode !== "WIDE" &&
    !contextCodes.includes("PROMOTED_SUPPORT_SURFACE")
  ) {
    throw new GovernancePreservedContextError(
      "GOVERNANCE_CONTEXT_COMPACTION_UNBOUND",
      "compact governance postures must preserve PROMOTED_SUPPORT_SURFACE",
    );
  }
  return contextCodes;
}

