import {
  PortalHelpRequestProjectionError,
  type PortalHelpRequestSourceRoute,
} from "../types.ts";

export type BuildHelpCaseContextRefsInput = {
  additionalContextRefs?: readonly (string | null | undefined)[] | undefined;
  clientId: string;
  itemId?: string | null | undefined;
  linkedObjectRef?: string | null | undefined;
  manifestId?: string | null | undefined;
  maxRefs?: number | undefined;
  requestInfoRef?: string | null | undefined;
  sourceFocusAnchorRef: string;
  sourceRoute: PortalHelpRequestSourceRoute;
  tenantId: string;
  workspaceId?: string | null | undefined;
};

const defaultMaxRefs = 6;

const forbiddenContextRefFragments = [
  "audit",
  "authority_payload",
  "gate",
  "internal",
  "privileged",
  "queue",
  "raw",
  "secret",
  "staff",
  "token",
];

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new PortalHelpRequestProjectionError(message, reasonCodes);
}

function requiredRef(value: string | null | undefined, label: string) {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    fail(`${label} must be a non-empty ref`, ["PORTAL_HELP_CONTEXT_REF_REQUIRED"]);
  }
  return normalized;
}

function maybeRef(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function assertCustomerSafeContextRef(value: string) {
  const normalized = value.toLowerCase();
  const forbidden = forbiddenContextRefFragments.find((fragment) =>
    normalized.includes(fragment),
  );
  if (forbidden !== undefined) {
    fail(`case_context_refs[] contains a forbidden ${forbidden} ref`, [
      "PORTAL_HELP_CONTEXT_REF_FORBIDDEN",
    ]);
  }
}

function pushRef(refs: string[], value: string | null) {
  if (value === null) {
    return;
  }
  assertCustomerSafeContextRef(value);
  if (!refs.includes(value)) {
    refs.push(value);
  }
}

export function buildHelpCaseContextRefs(input: BuildHelpCaseContextRefsInput) {
  const maxRefs = input.maxRefs ?? defaultMaxRefs;
  if (!Number.isInteger(maxRefs) || maxRefs < 1 || maxRefs > 12) {
    fail("Portal help case_context_refs maxRefs must be between 1 and 12", [
      "PORTAL_HELP_CONTEXT_REF_LIMIT_INVALID",
    ]);
  }

  const workspaceId = maybeRef(input.workspaceId) ?? `portal.workspace.${input.clientId}`;
  const routeContextRef = `portal.route.${input.sourceRoute}`;
  const focusAnchorRef = requiredRef(input.sourceFocusAnchorRef, "source_focus_anchor_ref");
  const itemId = maybeRef(input.itemId);
  const linkedObjectRef = maybeRef(input.linkedObjectRef) ?? itemId;
  const requestInfoRef = maybeRef(input.requestInfoRef);
  const manifestId = maybeRef(input.manifestId);
  const refs: string[] = [];

  pushRef(refs, workspaceId);
  pushRef(refs, routeContextRef);
  pushRef(refs, focusAnchorRef);
  pushRef(refs, linkedObjectRef);
  pushRef(refs, requestInfoRef);
  pushRef(refs, manifestId);
  for (const additional of input.additionalContextRefs ?? []) {
    pushRef(refs, maybeRef(additional));
  }

  if (refs.length === 0) {
    fail("Portal help case_context_refs[] must not be empty", [
      "PORTAL_HELP_CONTEXT_REFS_EMPTY",
    ]);
  }

  return refs.slice(0, maxRefs);
}
