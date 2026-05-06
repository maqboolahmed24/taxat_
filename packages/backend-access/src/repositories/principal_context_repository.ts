import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";

export type StoredAuthorizationDecisionRecord = AuthorizationDecisionRecord & {
  principal_context_access_binding_hash: string;
  principal_id: string;
  session_id: string;
  tenant_id: string;
};

type PrincipalContextRepositoryErrorCode =
  | "AUTHORIZATION_DECISION_CONTEXT_MISMATCH"
  | "AUTHORIZATION_DECISION_DUPLICATE"
  | "PRINCIPAL_CONTEXT_DUPLICATE"
  | "PRINCIPAL_CONTEXT_NOT_FOUND";

export class PrincipalContextRepositoryError extends Error {
  readonly code: PrincipalContextRepositoryErrorCode;

  constructor(code: PrincipalContextRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalContextRepositoryError";
    this.code = code;
  }
}

function cloneContext(record: PrincipalContextRecord) {
  return structuredClone(record);
}

function cloneDecision(record: StoredAuthorizationDecisionRecord) {
  return structuredClone(record);
}

function contextKey(tenantId: string, accessBindingHash: string) {
  return `${tenantId}::${accessBindingHash}`;
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class PrincipalContextRepository {
  private readonly contexts = new Map<string, PrincipalContextRecord>();
  private readonly contextsBySession = new Map<string, string[]>();
  private readonly contextsByPrincipal = new Map<string, string[]>();
  private readonly contextsByPolicySnapshot = new Map<string, string[]>();
  private readonly decisions = new Map<string, StoredAuthorizationDecisionRecord>();
  private readonly decisionsByContext = new Map<string, string[]>();
  private readonly decisionsByAccessBindingHash = new Map<string, string[]>();
  private readonly decisionsByPolicySnapshot = new Map<string, string[]>();
  private readonly decisionsBySession = new Map<string, string[]>();
  private readonly decisionsBySimulationBasis = new Map<string, string[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storePrincipalContext(record: PrincipalContextRecord) {
    const key = contextKey(record.tenant_id, record.access_binding_hash);
    const existing = this.contexts.get(key);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new PrincipalContextRepositoryError(
          "PRINCIPAL_CONTEXT_DUPLICATE",
          `access binding ${record.access_binding_hash} is already used by a different principal-context payload`,
        );
      }
      return cloneContext(existing);
    }

    this.contexts.set(key, cloneContext(record));
    this.pushIndex(
      this.contextsBySession,
      compositeKey(record.tenant_id, record.session_id),
      key,
    );
    this.pushIndex(
      this.contextsByPrincipal,
      compositeKey(record.tenant_id, record.principal_id),
      key,
    );
    this.pushIndex(
      this.contextsByPolicySnapshot,
      compositeKey(record.tenant_id, record.policy_snapshot_hash),
      key,
    );
    return cloneContext(record);
  }

  async getPrincipalContextByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    const record = this.contexts.get(contextKey(tenantId, accessBindingHash));
    return record ? cloneContext(record) : null;
  }

  async requirePrincipalContextByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    const record = await this.getPrincipalContextByAccessBindingHash(tenantId, accessBindingHash);
    if (!record) {
      throw new PrincipalContextRepositoryError(
        "PRINCIPAL_CONTEXT_NOT_FOUND",
        `principal context ${accessBindingHash} does not exist in tenant ${tenantId}`,
      );
    }
    return record;
  }

  private listContexts(keys: string[]) {
    return keys
      .map((key) => this.contexts.get(key))
      .filter((record): record is PrincipalContextRecord => record !== undefined)
      .sort((left, right) =>
        left.authorization_evaluated_at.localeCompare(right.authorization_evaluated_at),
      )
      .map((record) => cloneContext(record));
  }

  async listPrincipalContextsBySessionId(tenantId: string, sessionId: string) {
    return this.listContexts(
      this.contextsBySession.get(compositeKey(tenantId, sessionId)) ?? [],
    );
  }

  async listPrincipalContextsByPrincipalId(tenantId: string, principalId: string) {
    return this.listContexts(
      this.contextsByPrincipal.get(compositeKey(tenantId, principalId)) ?? [],
    );
  }

  async listPrincipalContextsByPolicySnapshotHash(tenantId: string, policySnapshotHash: string) {
    return this.listContexts(
      this.contextsByPolicySnapshot.get(compositeKey(tenantId, policySnapshotHash)) ?? [],
    );
  }

  async storeAuthorizationDecision(input: {
    authorization_decision: AuthorizationDecisionRecord;
    principal_context: PrincipalContextRecord;
  }) {
    await this.storePrincipalContext(input.principal_context);

    if (
      input.authorization_decision.principal_context_ref !== input.principal_context.principal_id ||
      input.authorization_decision.policy_snapshot_hash !==
        input.principal_context.policy_snapshot_hash
    ) {
      throw new PrincipalContextRepositoryError(
        "AUTHORIZATION_DECISION_CONTEXT_MISMATCH",
        "authorization decision does not match the linked principal context",
      );
    }

    const record: StoredAuthorizationDecisionRecord = {
      ...input.authorization_decision,
      tenant_id: input.principal_context.tenant_id,
      session_id: input.principal_context.session_id,
      principal_id: input.principal_context.principal_id,
      principal_context_access_binding_hash: input.principal_context.access_binding_hash,
    };
    const existing = this.decisions.get(record.decision_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new PrincipalContextRepositoryError(
          "AUTHORIZATION_DECISION_DUPLICATE",
          `decision ${record.decision_id} already exists with a different frozen payload`,
        );
      }
      return cloneDecision(existing);
    }

    this.decisions.set(record.decision_id, cloneDecision(record));
    this.pushIndex(
      this.decisionsByContext,
      contextKey(record.tenant_id, record.principal_context_access_binding_hash),
      record.decision_id,
    );
    this.pushIndex(
      this.decisionsByAccessBindingHash,
      compositeKey(record.tenant_id, record.access_binding_hash),
      record.decision_id,
    );
    this.pushIndex(
      this.decisionsByPolicySnapshot,
      compositeKey(record.tenant_id, record.policy_snapshot_hash),
      record.decision_id,
    );
    this.pushIndex(
      this.decisionsBySession,
      compositeKey(record.tenant_id, record.session_id),
      record.decision_id,
    );
    if (record.simulation_basis_hash !== null) {
      this.pushIndex(
        this.decisionsBySimulationBasis,
        compositeKey(record.tenant_id, record.simulation_basis_hash),
        record.decision_id,
      );
    }
    return cloneDecision(record);
  }

  private listDecisions(ids: string[]) {
    return ids
      .map((id) => this.decisions.get(id))
      .filter((record): record is StoredAuthorizationDecisionRecord => record !== undefined)
      .sort((left, right) => left.evaluated_at.localeCompare(right.evaluated_at))
      .map((record) => cloneDecision(record));
  }

  async listAuthorizationDecisionsByContextAccessBindingHash(
    tenantId: string,
    principalContextAccessBindingHash: string,
  ) {
    return this.listDecisions(
      this.decisionsByContext.get(contextKey(tenantId, principalContextAccessBindingHash)) ?? [],
    );
  }

  async listAuthorizationDecisionsByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    return this.listDecisions(
      this.decisionsByAccessBindingHash.get(compositeKey(tenantId, accessBindingHash)) ?? [],
    );
  }

  async listAuthorizationDecisionsByPolicySnapshotHash(
    tenantId: string,
    policySnapshotHash: string,
  ) {
    return this.listDecisions(
      this.decisionsByPolicySnapshot.get(compositeKey(tenantId, policySnapshotHash)) ?? [],
    );
  }

  async listAuthorizationDecisionsBySessionId(tenantId: string, sessionId: string) {
    return this.listDecisions(
      this.decisionsBySession.get(compositeKey(tenantId, sessionId)) ?? [],
    );
  }

  async listAuthorizationDecisionsBySimulationBasisHash(
    tenantId: string,
    simulationBasisHash: string,
  ) {
    return this.listDecisions(
      this.decisionsBySimulationBasis.get(compositeKey(tenantId, simulationBasisHash)) ?? [],
    );
  }

  async reconstructFrozenAuthorizationContext(
    tenantId: string,
    principalContextAccessBindingHash: string,
  ) {
    const principal_context = await this.requirePrincipalContextByAccessBindingHash(
      tenantId,
      principalContextAccessBindingHash,
    );
    const authorization_decisions =
      await this.listAuthorizationDecisionsByContextAccessBindingHash(
        tenantId,
        principalContextAccessBindingHash,
      );
    return {
      principal_context,
      authorization_decisions,
    };
  }
}
