import {
  deriveActorSessionLifecycleState,
  type ActorSessionRecord,
} from "../models/actor_session.ts";
import type {
  StoredAuthorizationDecisionRecord,
} from "../repositories/principal_context_repository.ts";
import { PrincipalContextRepository } from "../repositories/principal_context_repository.ts";
import type { ActorSessionRepository } from "../repositories/actor_session_repository.ts";
import type { DelegationGrantRepository } from "../repositories/delegation_grant_repository.ts";
import type { GovernanceAccessSimulationRepository } from "../repositories/governance_access_simulation_repository.ts";
import type { PrincipalAccessViewRepository } from "../repositories/principal_access_view_repository.ts";
import { ActionMatrixAssembler } from "./action_matrix_assembler.ts";
import { loadAuthorizationPolicyRuntime } from "./authorization_tuple_evaluator.ts";
import { DelegationSummaryBuilder } from "./delegation_summary_builder.ts";
import { PrincipalAccessViewProjector } from "../projectors/principal_access_view_projector.ts";
import type { PrincipalAccessViewRecord } from "../read_models/principal_access_view.ts";

type QueryPrincipalAccessViewInput = {
  active_filters?: Partial<PrincipalAccessViewRecord["access_workspace"]["active_filters"]>;
  principal_context_access_binding_hash?: string;
  principal_id?: string;
  reviewed_policy_snapshot_hash?: string | null;
  role_editor_pending_change_refs?: readonly string[];
  selected_cell_ref?: string | null;
  selected_role_template_ref?: string | null;
  tenant_id: string;
  workspace_mode?: PrincipalAccessViewRecord["access_workspace"]["workspace_mode"];
};

type QueryPrincipalAccessViewResult = {
  principal_context_access_binding_hash: string;
  view: PrincipalAccessViewRecord;
};

type ResolvedFrozenContext = {
  authorization_decisions: StoredAuthorizationDecisionRecord[];
  principal_context: Awaited<
    ReturnType<PrincipalContextRepository["requirePrincipalContextByAccessBindingHash"]>
  >;
};

type PrincipalAccessViewQueryServiceErrorCode =
  | "PRINCIPAL_ACCESS_VIEW_CONTEXT_NOT_FOUND"
  | "PRINCIPAL_ACCESS_VIEW_INPUT_INVALID"
  | "PRINCIPAL_ACCESS_VIEW_NO_AUTHORIZATION_DECISIONS";

export class PrincipalAccessViewQueryServiceError extends Error {
  readonly code: PrincipalAccessViewQueryServiceErrorCode;

  constructor(code: PrincipalAccessViewQueryServiceErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalAccessViewQueryServiceError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: PrincipalAccessViewQueryServiceErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new PrincipalAccessViewQueryServiceError(code, detail);
  }
}

function mergeActiveFilters(input: {
  defaults: PrincipalAccessViewRecord["access_workspace"]["active_filters"];
  requested: Partial<PrincipalAccessViewRecord["access_workspace"]["active_filters"]> | undefined;
}) {
  return {
    principal_types:
      input.requested?.principal_types === undefined
        ? input.defaults.principal_types
        : [...input.requested.principal_types],
    principal_states:
      input.requested?.principal_states === undefined
        ? input.defaults.principal_states
        : [...input.requested.principal_states],
    role_refs:
      input.requested?.role_refs === undefined
        ? input.defaults.role_refs
        : [...input.requested.role_refs],
    delegated_client_refs:
      input.requested?.delegated_client_refs === undefined
        ? input.defaults.delegated_client_refs
        : [...input.requested.delegated_client_refs],
    recent_change_owner_refs:
      input.requested?.recent_change_owner_refs === undefined
        ? input.defaults.recent_change_owner_refs
        : [...input.requested.recent_change_owner_refs],
  } satisfies PrincipalAccessViewRecord["access_workspace"]["active_filters"];
}

function latestTimestamp(values: readonly string[]) {
  return [...values].sort((left, right) => right.localeCompare(left))[0]!;
}

function principalStateForView(sessionLifecycleState: string) {
  if (
    sessionLifecycleState === "ISSUED" ||
    sessionLifecycleState === "ACTIVE" ||
    sessionLifecycleState === "STEPPED_UP"
  ) {
    return "ACTIVE";
  }
  return sessionLifecycleState;
}

export class PrincipalAccessViewQueryService {
  private readonly actionMatrixAssembler: ActionMatrixAssembler;
  private readonly delegationSummaryBuilder: DelegationSummaryBuilder;
  private readonly projector: PrincipalAccessViewProjector;

  constructor(
    private readonly dependencies: {
      actorSessionRepository: ActorSessionRepository;
      delegationGrantRepository?: DelegationGrantRepository;
      governanceAccessSimulationRepository?: GovernanceAccessSimulationRepository;
      principalAccessViewRepository?: PrincipalAccessViewRepository;
      principalContextRepository: PrincipalContextRepository;
      actionMatrixAssembler?: ActionMatrixAssembler;
      delegationSummaryBuilder?: DelegationSummaryBuilder;
      projector?: PrincipalAccessViewProjector;
    },
  ) {
    this.actionMatrixAssembler =
      dependencies.actionMatrixAssembler ?? new ActionMatrixAssembler();
    this.delegationSummaryBuilder =
      dependencies.delegationSummaryBuilder ?? new DelegationSummaryBuilder();
    this.projector = dependencies.projector ?? new PrincipalAccessViewProjector();
  }

  private async resolveFrozenContext(
    input: QueryPrincipalAccessViewInput,
  ): Promise<ResolvedFrozenContext> {
    if (input.principal_context_access_binding_hash) {
      return this.dependencies.principalContextRepository.reconstructFrozenAuthorizationContext(
        input.tenant_id,
        input.principal_context_access_binding_hash,
      );
    }
    assertCondition(
      input.principal_id,
      "PRINCIPAL_ACCESS_VIEW_INPUT_INVALID",
      "query input requires principal_context_access_binding_hash or principal_id",
    );
    const contexts =
      await this.dependencies.principalContextRepository.listPrincipalContextsByPrincipalId(
        input.tenant_id,
        input.principal_id,
      );
    const principal_context = contexts.at(-1);
    assertCondition(
      principal_context,
      "PRINCIPAL_ACCESS_VIEW_CONTEXT_NOT_FOUND",
      `no frozen principal context exists for principal ${input.principal_id}`,
    );
    const authorization_decisions =
      await this.dependencies.principalContextRepository.listAuthorizationDecisionsByContextAccessBindingHash(
        input.tenant_id,
        principal_context.access_binding_hash,
      );
    return {
      principal_context,
      authorization_decisions,
    };
  }

  private async resolveLatestSimulationRef(input: {
    selected_cell_ref: string | null;
    source_decision_by_cell_ref: ReadonlyMap<string, { access_binding_hash: string }>;
    tenant_id: string;
    workspace_mode: PrincipalAccessViewRecord["access_workspace"]["workspace_mode"] | undefined;
  }) {
    if (
      input.workspace_mode !== "SIMULATOR" ||
      input.selected_cell_ref === null ||
      !this.dependencies.governanceAccessSimulationRepository
    ) {
      return null;
    }
    const sourceDecision = input.source_decision_by_cell_ref.get(input.selected_cell_ref);
    if (!sourceDecision) {
      return null;
    }
    const simulations =
      await this.dependencies.governanceAccessSimulationRepository.listSimulationsByAuthorizationDecisionAccessBindingHash(
        input.tenant_id,
        sourceDecision.access_binding_hash,
      );
    return simulations.at(-1)?.simulation.simulation_id ?? null;
  }

  private buildDefaultActiveFilters(input: {
    actor_session: ActorSessionRecord;
    principal_context: ResolvedFrozenContext["principal_context"];
    principal_state: string;
  }) {
    return {
      principal_types: [input.principal_context.principal_type],
      principal_states: [input.principal_state],
      role_refs: [...input.principal_context.effective_role_set],
      delegated_client_refs: [...input.principal_context.client_scope],
      recent_change_owner_refs: [input.principal_context.principal_id],
    } satisfies PrincipalAccessViewRecord["access_workspace"]["active_filters"];
  }

  async getView(
    input: QueryPrincipalAccessViewInput,
  ): Promise<QueryPrincipalAccessViewResult> {
    const frozenContext = await this.resolveFrozenContext(input);
    assertCondition(
      frozenContext.authorization_decisions.length > 0,
      "PRINCIPAL_ACCESS_VIEW_NO_AUTHORIZATION_DECISIONS",
      "principal access view requires at least one frozen authorization decision",
    );

    const actor_session =
      await this.dependencies.actorSessionRepository.requireBySessionId(
        frozenContext.principal_context.tenant_id,
        frozenContext.principal_context.session_id,
      );
    const principal_state = principalStateForView(
      deriveActorSessionLifecycleState(
        actor_session,
        frozenContext.principal_context.authorization_evaluated_at,
      ),
    );
    const [runtime, actionMatrix, delegation_summaries] = await Promise.all([
      loadAuthorizationPolicyRuntime(),
      this.actionMatrixAssembler.assemble({
        authorization_decisions: frozenContext.authorization_decisions,
        effective_role_set: frozenContext.principal_context.effective_role_set,
        frozen_policy_snapshot_hash:
          frozenContext.principal_context.policy_snapshot_hash,
      }),
      this.delegationSummaryBuilder.build({
        authorization_decisions: frozenContext.authorization_decisions,
        delegation_grant_repository: this.dependencies.delegationGrantRepository,
        principal_context: frozenContext.principal_context,
      }),
    ]);

    const defaultActiveFilters = this.buildDefaultActiveFilters({
      actor_session,
      principal_context: frozenContext.principal_context,
      principal_state,
    });
    const active_filters = mergeActiveFilters({
      defaults: defaultActiveFilters,
      requested: input.active_filters,
    });
    const initialProjected = await this.projector.project({
      action_matrix: actionMatrix.action_matrix,
      active_filters,
      actor_session,
      current_policy_snapshot_hash: runtime.policy_snapshot_hash,
      delegation_summaries,
      last_modified_at: latestTimestamp([
        frozenContext.principal_context.authorization_evaluated_at,
        ...frozenContext.authorization_decisions.map((decision) => decision.evaluated_at),
      ]),
      latest_simulation_ref: undefined,
      principal_context: frozenContext.principal_context,
      principal_state,
      recent_change_owner_ref: frozenContext.principal_context.principal_id,
      reviewed_policy_snapshot_hash: input.reviewed_policy_snapshot_hash,
      role_editor_pending_change_refs: input.role_editor_pending_change_refs,
      selected_cell_ref: input.selected_cell_ref,
      selected_role_template_ref: input.selected_role_template_ref,
      source_decision_by_cell_ref: actionMatrix.source_decision_by_cell_ref,
      workspace_mode:
        input.workspace_mode === "SIMULATOR" ? "PRINCIPALS" : input.workspace_mode,
    });

    const latest_simulation_ref = await this.resolveLatestSimulationRef({
      selected_cell_ref: initialProjected.access_workspace.selected_cell_ref,
      source_decision_by_cell_ref: actionMatrix.source_decision_by_cell_ref,
      tenant_id: frozenContext.principal_context.tenant_id,
      workspace_mode: input.workspace_mode,
    });
    const last_modified_at = latestTimestamp(
      [
        frozenContext.principal_context.authorization_evaluated_at,
        ...frozenContext.authorization_decisions.map((decision) => decision.evaluated_at),
      ].concat(
        latest_simulation_ref && this.dependencies.governanceAccessSimulationRepository
          ? (
              await this.dependencies.governanceAccessSimulationRepository.requireSimulationById(
                latest_simulation_ref,
              )
            ).persisted_at
          : [],
      ),
    );
    const view = await this.projector.project({
      action_matrix: actionMatrix.action_matrix,
      active_filters,
      actor_session,
      current_policy_snapshot_hash: runtime.policy_snapshot_hash,
      delegation_summaries,
      last_modified_at,
      latest_simulation_ref,
      principal_context: frozenContext.principal_context,
      principal_state,
      recent_change_owner_ref: frozenContext.principal_context.principal_id,
      reviewed_policy_snapshot_hash: input.reviewed_policy_snapshot_hash,
      role_editor_pending_change_refs: input.role_editor_pending_change_refs,
      selected_cell_ref: input.selected_cell_ref,
      selected_role_template_ref: input.selected_role_template_ref,
      source_decision_by_cell_ref: actionMatrix.source_decision_by_cell_ref,
      workspace_mode: input.workspace_mode,
    });

    if (this.dependencies.principalAccessViewRepository) {
      await this.dependencies.principalAccessViewRepository.storeView({
        persisted_at: last_modified_at,
        principal_context_access_binding_hash:
          frozenContext.principal_context.access_binding_hash,
        source_refs: [
          frozenContext.principal_context.access_binding_hash,
          ...frozenContext.authorization_decisions.map((decision) => decision.decision_id),
          ...(latest_simulation_ref ? [latest_simulation_ref] : []),
        ],
        view,
      });
    }

    return {
      principal_context_access_binding_hash:
        frozenContext.principal_context.access_binding_hash,
      view,
    };
  }
}

export type { QueryPrincipalAccessViewInput, QueryPrincipalAccessViewResult };
