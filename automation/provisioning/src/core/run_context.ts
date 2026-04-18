import { randomUUID } from "node:crypto";

export type ProviderEnvironment = "sandbox" | "production" | "fixture";
export type ProvisioningExecutionMode = "fixture" | "sandbox" | "production";
export type BrowserStorageStatePolicy =
  | "FORBIDDEN_BY_DEFAULT"
  | "SECRET_REFERENCE_ONLY";
export type EvidenceCaptureDefault = "STANDARD" | "REDACT" | "SUPPRESS";

export interface RunContextInput {
  runId?: string;
  providerId: string;
  flowId: string;
  productEnvironmentId: string;
  providerEnvironment: ProviderEnvironment;
  executionMode: ProvisioningExecutionMode;
  operatorIdentityAlias: string;
  workspaceId: string;
  evidenceRoot: string;
  liveProviderExecutionAllowed?: boolean;
  browserStorageStatePolicy?: BrowserStorageStatePolicy;
  evidenceCaptureDefault?: EvidenceCaptureDefault;
}

export interface RunContext {
  runId: string;
  providerId: string;
  flowId: string;
  productEnvironmentId: string;
  providerEnvironment: ProviderEnvironment;
  executionMode: ProvisioningExecutionMode;
  operatorIdentityAlias: string;
  workspaceId: string;
  evidenceRoot: string;
  createdAt: string;
  liveProviderExecutionAllowed: boolean;
  browserStorageStatePolicy: BrowserStorageStatePolicy;
  evidenceCaptureDefault: EvidenceCaptureDefault;
  guardrails: {
    rawCredentialPersistenceForbidden: true;
    browserStorageStateIsSecretMaterial: true;
    manualCheckpointRequiredForMfaCaptchaOrEmail: true;
  };
}

export interface RunContextSummary {
  runId: string;
  providerId: string;
  flowId: string;
  productEnvironmentId: string;
  providerEnvironment: ProviderEnvironment;
  executionMode: ProvisioningExecutionMode;
  operatorIdentityAlias: string;
  workspaceId: string;
  evidenceRoot: string;
  liveProviderExecutionAllowed: boolean;
}

const DEFAULT_STORAGE_POLICY: BrowserStorageStatePolicy =
  "FORBIDDEN_BY_DEFAULT";
const DEFAULT_CAPTURE_MODE: EvidenceCaptureDefault = "REDACT";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeAlias(alias: string): string {
  return alias.trim().replace(/\s+/g, ".");
}

export function createRunContext(input: RunContextInput): RunContext {
  return {
    runId: input.runId ?? randomUUID(),
    providerId: input.providerId,
    flowId: input.flowId,
    productEnvironmentId: input.productEnvironmentId,
    providerEnvironment: input.providerEnvironment,
    executionMode: input.executionMode,
    operatorIdentityAlias: normalizeAlias(input.operatorIdentityAlias),
    workspaceId: input.workspaceId,
    evidenceRoot: input.evidenceRoot,
    createdAt: nowIso(),
    liveProviderExecutionAllowed: Boolean(input.liveProviderExecutionAllowed),
    browserStorageStatePolicy:
      input.browserStorageStatePolicy ?? DEFAULT_STORAGE_POLICY,
    evidenceCaptureDefault:
      input.evidenceCaptureDefault ?? DEFAULT_CAPTURE_MODE,
    guardrails: {
      rawCredentialPersistenceForbidden: true,
      browserStorageStateIsSecretMaterial: true,
      manualCheckpointRequiredForMfaCaptchaOrEmail: true,
    },
  };
}

export function summarizeRunContext(context: RunContext): RunContextSummary {
  return {
    runId: context.runId,
    providerId: context.providerId,
    flowId: context.flowId,
    productEnvironmentId: context.productEnvironmentId,
    providerEnvironment: context.providerEnvironment,
    executionMode: context.executionMode,
    operatorIdentityAlias: context.operatorIdentityAlias,
    workspaceId: context.workspaceId,
    evidenceRoot: context.evidenceRoot,
    liveProviderExecutionAllowed: context.liveProviderExecutionAllowed,
  };
}

export function isLiveProviderRun(context: RunContext): boolean {
  return context.executionMode !== "fixture";
}

export function assertLiveProviderGate(context: RunContext): void {
  if (isLiveProviderRun(context) && !context.liveProviderExecutionAllowed) {
    throw new Error(
      `Run ${context.runId} targets ${context.providerId}/${context.providerEnvironment} but live provider execution is not enabled.`,
    );
  }
}
