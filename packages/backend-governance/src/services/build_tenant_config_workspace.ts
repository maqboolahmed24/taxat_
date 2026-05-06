import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  GovernancePolicySnapshotSectionCode,
  GovernancePolicySnapshotTenantConfigWorkspace,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export const governancePolicySectionNavOrder = [
  "TENANT_PROFILE",
  "SECURITY_POSTURE",
  "AUTHORITY_AND_ENVIRONMENTS",
  "CONNECTOR_POLICY",
  "APPROVAL_AND_CHANGE_CONTROL",
  "NOTIFICATIONS_AND_EVIDENCE",
] as const satisfies GovernancePolicySnapshotTenantConfigWorkspace["section_nav_order"];

export const governancePolicySurfaceOrder = [
  "SECTION_NAV",
  "CONFIG_FORM",
  "INLINE_POLICY_HELP",
  "BLAST_RADIUS_PANEL",
  "CHANGE_BASKET",
  "APPROVAL_COMPOSER",
  "CONFIG_HISTORY_TIMELINE",
] as const satisfies GovernancePolicySnapshotTenantConfigWorkspace["surface_order"];

const sectionCodes = new Set<GovernancePolicySnapshotSectionCode>(
  governancePolicySectionNavOrder,
);

const sectionFormRefs = {
  APPROVAL_AND_CHANGE_CONTROL:
    "approval-and-change-control.step-up-and-approval-policy",
  AUTHORITY_AND_ENVIRONMENTS:
    "authority-and-environments.provider-environment-bindings",
  CONNECTOR_POLICY: "connector-policy.authority-link-and-session-binding",
  NOTIFICATIONS_AND_EVIDENCE:
    "notifications-and-evidence.audit-and-receipt-evidence",
  SECURITY_POSTURE: "security-posture.browser-and-native-session-security",
  TENANT_PROFILE: "tenant-profile.identity-and-roles",
} as const satisfies Record<GovernancePolicySnapshotSectionCode, string>;

export class TenantConfigWorkspaceProjectionError extends Error {
  constructor(detail: string) {
    super(`TENANT_CONFIG_WORKSPACE_INVALID: ${detail}`);
    this.name = "TenantConfigWorkspaceProjectionError";
  }
}

export type BuildTenantConfigWorkspaceInput = {
  activeSectionCode?: GovernancePolicySnapshotSectionCode | string | null | undefined;
  materialConfigHashes?: Record<string, string> | undefined;
  previousWorkspace?: GovernancePolicySnapshotTenantConfigWorkspace | null | undefined;
};

function requireActiveSection(
  value: GovernancePolicySnapshotSectionCode | string | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (!sectionCodes.has(value as GovernancePolicySnapshotSectionCode)) {
    throw new TenantConfigWorkspaceProjectionError(
      `activeSectionCode ${value} is not part of the governance policy section nav order`,
    );
  }
  return value as GovernancePolicySnapshotSectionCode;
}

function helpRefsFor(input: BuildTenantConfigWorkspaceInput) {
  const activeSection = requireActiveSection(
    input.activeSectionCode ?? input.previousWorkspace?.active_section_code,
  ) ?? "TENANT_PROFILE";
  const materialRefs = Object.entries(input.materialConfigHashes ?? {}).map(
    ([configRef, digest]) => `config://governance-policy/${configRef}?hash=${digest}`,
  );
  return sortSetLikeStrings([
    `policy-help://governance/tenant/${activeSection.toLowerCase()}`,
    ...(input.previousWorkspace?.inline_policy_help.help_refs ?? []),
    ...materialRefs,
  ]);
}

export function buildTenantConfigWorkspace(
  input: BuildTenantConfigWorkspaceInput = {},
): GovernancePolicySnapshotTenantConfigWorkspace {
  const active_section_code =
    requireActiveSection(input.activeSectionCode) ??
    requireActiveSection(input.previousWorkspace?.active_section_code) ??
    "TENANT_PROFILE";

  return {
    active_section_code,
    inline_policy_help: {
      help_mode: "INLINE",
      help_refs: helpRefsFor({
        ...input,
        activeSectionCode: active_section_code,
      }),
    },
    section_nav_order: [...governancePolicySectionNavOrder],
    surface_order: [...governancePolicySurfaceOrder],
    visible_form_section_refs: governancePolicySectionNavOrder.map(
      (sectionCode) => sectionFormRefs[sectionCode],
    ),
  };
}
