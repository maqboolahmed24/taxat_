export type AccessRebindReasonCode =
  | "ACCESS_BINDING_CHANGED"
  | "MASKING_POSTURE_CHANGED"
  | "PRINCIPAL_CLASS_CHANGED"
  | "SCHEMA_INCOMPATIBLE"
  | "SESSION_BINDING_CHANGED"
  | "SESSION_REVOKED"
  | "TENANT_SWITCHED";

export type AccessBindingSnapshot = {
  accessBindingHash: string;
  maskingContextHash: string;
  principalClass?: string | null;
  principalRef?: string | null;
  schemaCompatibilityRef?: string | null;
  sessionBindingHash: string;
  sessionRef: string;
  tenantId?: string | null;
};

export type AccessRebindRequirement = {
  kind: "ACCESS_REBIND_REQUIRED";
  reasonCode: AccessRebindReasonCode;
  reasonCodes: AccessRebindReasonCode[];
};

export function detectAccessBindingOrMaskingRebindRequirement(input: {
  current: AccessBindingSnapshot;
  expected: AccessBindingSnapshot;
}): AccessRebindRequirement | null {
  if (
    input.current.tenantId !== undefined &&
    input.expected.tenantId !== undefined &&
    input.current.tenantId !== input.expected.tenantId
  ) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "TENANT_SWITCHED",
      reasonCodes: ["TENANT_SWITCHED"],
    };
  }
  if (
    input.current.principalRef !== undefined &&
    input.expected.principalRef !== undefined &&
    input.current.principalRef !== input.expected.principalRef
  ) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "SESSION_BINDING_CHANGED",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    };
  }
  if (
    input.current.principalClass !== undefined &&
    input.expected.principalClass !== undefined &&
    input.current.principalClass !== input.expected.principalClass
  ) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "PRINCIPAL_CLASS_CHANGED",
      reasonCodes: ["PRINCIPAL_CLASS_CHANGED"],
    };
  }
  if (
    input.current.sessionRef !== input.expected.sessionRef ||
    input.current.sessionBindingHash !== input.expected.sessionBindingHash
  ) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "SESSION_BINDING_CHANGED",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    };
  }
  if (input.current.accessBindingHash !== input.expected.accessBindingHash) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "ACCESS_BINDING_CHANGED",
      reasonCodes: ["ACCESS_BINDING_CHANGED"],
    };
  }
  if (input.current.maskingContextHash !== input.expected.maskingContextHash) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "MASKING_POSTURE_CHANGED",
      reasonCodes: ["MASKING_POSTURE_CHANGED"],
    };
  }
  if (
    input.current.schemaCompatibilityRef !== undefined &&
    input.expected.schemaCompatibilityRef !== undefined &&
    input.current.schemaCompatibilityRef !== input.expected.schemaCompatibilityRef
  ) {
    return {
      kind: "ACCESS_REBIND_REQUIRED",
      reasonCode: "SCHEMA_INCOMPATIBLE",
      reasonCodes: ["SCHEMA_INCOMPATIBLE"],
    };
  }
  return null;
}
