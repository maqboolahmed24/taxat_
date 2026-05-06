import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { AuditInvestigationFrameExportPosture } from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";

export type AuditOrEnquiryRouteSurface =
  | "GOVERNANCE_AUDIT_INVESTIGATIONS"
  | "MANIFEST_AUDIT_TRAIL"
  | "MANIFEST_ENQUIRY_PACK";

export type AuditOrEnquiryReadAuthorization =
  | {
      authorized: true;
      exportPosture: AuditInvestigationFrameExportPosture;
      includeStaffOnlySupportingRefs: boolean;
      reasonCodes: string[];
    }
  | {
      authorized: false;
      hidden?: true;
      reasonCodes: string[];
    };

export type AuditOrEnquiryReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  principalClass?: string | null;
  routeSurface: AuditOrEnquiryRouteSurface;
  tenantId: string;
}) =>
  | AuditOrEnquiryReadAuthorization
  | Promise<AuditOrEnquiryReadAuthorization>;

function isCustomerOrClientPrincipal(input: {
  actorContext: NorthboundActorContext;
  principalClass?: string | null;
}) {
  const principalClass = input.principalClass ?? "";
  return (
    input.actorContext.client_id_or_null !== null ||
    /^CLIENT|^CUSTOMER|^SUBJECT|.*PORTAL/.test(principalClass)
  );
}

function isMaskedStaffPrincipal(principalClass?: string | null) {
  return /MASKED|READ_ONLY_LIMITED|LIMITED_AUDITOR/.test(principalClass ?? "");
}

export async function authorizeAuditOrEnquiryRead(input: {
  actorContext: NorthboundActorContext;
  principalClass?: string | null;
  routeSurface: AuditOrEnquiryRouteSurface;
  tenantId: string;
}): Promise<AuditOrEnquiryReadAuthorization> {
  if (input.actorContext.tenant_id !== input.tenantId) {
    return {
      authorized: false,
      hidden: true,
      reasonCodes: ["AUDIT_READ_TENANT_MISMATCH"],
    };
  }
  if (isCustomerOrClientPrincipal(input)) {
    return {
      authorized: false,
      hidden: true,
      reasonCodes: ["AUDIT_READ_CUSTOMER_SESSION_BLOCKED"],
    };
  }
  if (isMaskedStaffPrincipal(input.principalClass)) {
    return {
      authorized: true,
      exportPosture: {
        reason_codes: ["MASKED_AUDIT_EXPORT_ONLY"],
        state: "MASKED_ONLY",
      },
      includeStaffOnlySupportingRefs: false,
      reasonCodes: ["AUDIT_READ_MASKED_STAFF_AUTHORIZED"],
    };
  }
  return {
    authorized: true,
    exportPosture: {
      reason_codes: [],
      state: "FULL_ALLOWED",
    },
    includeStaffOnlySupportingRefs: true,
    reasonCodes: ["AUDIT_READ_STAFF_AUTHORIZED"],
  };
}
