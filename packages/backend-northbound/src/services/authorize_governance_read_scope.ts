import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";

export type GovernanceReadRouteSurface =
  | "GOVERNANCE_OVERVIEW"
  | "GOVERNANCE_POLICY_SNAPSHOT"
  | "GOVERNANCE_PRINCIPALS"
  | "GOVERNANCE_ROLE_MATRIX";

export type GovernanceReadAuthorization =
  | {
      authorized: true;
      principalClass: string;
      reasonCodes: string[];
    }
  | {
      authorized: false;
      hidden: true;
      principalClass: string | null;
      reasonCodes: string[];
    };

export type GovernanceReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  principalClass?: string | null;
  routeSurface: GovernanceReadRouteSurface;
  tenantId: string;
}) => GovernanceReadAuthorization | Promise<GovernanceReadAuthorization>;

const portalOnlyPrincipalClasses = new Set([
  "CLIENT_PORTAL",
  "CLIENT_SIGNATORY",
  "CLIENT_CONTRIBUTOR",
  "CLIENT_USER",
  "CLIENT_VIEWER",
  "CUSTOMER",
  "CUSTOMER_PORTAL",
  "PORTAL_ONLY",
]);

function actorPrincipalClass(actorContext: NorthboundActorContext, explicit?: string | null) {
  const actorWithOptionalClass = actorContext as NorthboundActorContext & {
    principalClass?: unknown;
    principal_class?: unknown;
  };
  const value =
    explicit ??
    (typeof actorWithOptionalClass.principal_class === "string"
      ? actorWithOptionalClass.principal_class
      : typeof actorWithOptionalClass.principalClass === "string"
        ? actorWithOptionalClass.principalClass
        : null);
  return value?.trim() || "STAFF_FULL";
}

export function authorizeGovernanceReadScope(input: {
  actorContext: NorthboundActorContext;
  principalClass?: string | null;
  routeSurface: GovernanceReadRouteSurface;
  tenantId: string;
}): GovernanceReadAuthorization {
  const principalClass = actorPrincipalClass(input.actorContext, input.principalClass);
  if (input.actorContext.tenant_id !== input.tenantId) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "GOVERNANCE_READ_TENANT_MISMATCH",
        `${input.routeSurface}_NOT_VISIBLE`,
      ],
    };
  }

  if (portalOnlyPrincipalClasses.has(principalClass)) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "GOVERNANCE_READ_CUSTOMER_PORTAL_SESSION_BLOCKED",
        `${input.routeSurface}_STAFF_SCOPE_REQUIRED`,
      ],
    };
  }

  return {
    authorized: true,
    principalClass,
    reasonCodes: ["GOVERNANCE_READ_SCOPE_AUTHORIZED", `${input.routeSurface}_VISIBLE`],
  };
}
