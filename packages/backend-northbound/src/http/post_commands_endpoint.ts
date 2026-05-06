import { buildApiCommandReceipt } from "../../../../apps/control-plane-api/src/northbound/build_api_command_receipt.ts";
import {
  evaluateStalePreconditions,
  type StalePreconditionDecision,
} from "../../../../apps/control-plane-api/src/northbound/stale_precondition_guard.ts";
import {
  loadNorthboundPolicyBundle,
  NorthboundBoundaryError,
  type NorthboundActorContext,
  type NorthboundPolicyBundle,
  type NorthboundRouteState,
} from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";
import { ApiCommandReceiptRepository } from "../repositories/api_command_receipt_repository.ts";
import {
  buildProblemEnvelopeForCommandRejection,
  type CommandRejectionProblem,
} from "../services/build_problem_envelope_for_command_rejection.ts";
import { buildStaleViewProblemEnvelope } from "../services/build_stale_view_problem_envelope.ts";
import { buildDuplicateReplayReceipt } from "../services/build_duplicate_replay_receipt.ts";
import {
  dispatchCommandToDomainHandler,
  type DomainCommandHandler,
} from "../services/dispatch_command_to_domain_handler.ts";
import { findDuplicateCommandReceipt } from "../services/find_duplicate_command_receipt.ts";
import { hashCommandRequest } from "../services/hash_command_request.ts";
import { persistCommandReceiptBeforeDispatch } from "../services/persist_command_receipt_before_dispatch.ts";
import { validateCommandEnvelope } from "../services/validate_command_envelope.ts";

export type PostCommandsRouteStateResolver = (
  parsed: ParsedCommandEnvelope,
) => Promise<NorthboundRouteState> | NorthboundRouteState;

export type PostCommandsEndpointRequest = {
  actorContext: NorthboundActorContext;
  body: unknown;
  correlationId?: string;
  method?: string;
  path?: string;
};

export type PostCommandsEndpointResponse =
  | {
      body: ApiCommandReceipt;
      status: 200 | 202;
    }
  | {
      body: ProblemEnvelope;
      status: number;
    };

export type PostCommandsEndpointDependencies = {
  clock?: () => Date;
  domainCommandHandler?: DomainCommandHandler;
  policyBundle?: NorthboundPolicyBundle;
  receiptRepository: ApiCommandReceiptRepository;
  receiptTtlMs?: number;
  routeStateResolver: PostCommandsRouteStateResolver;
};

function iso(date: Date) {
  return date.toISOString();
}

function addMs(date: Date, ms: number) {
  return new Date(date.valueOf() + ms);
}

function correlationId(request: PostCommandsEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function staleProjectionRef(stale: Extract<StalePreconditionDecision, { outcome: "STALE" }>) {
  return (
    stale.recoveryRefs.latest_decision_bundle_ref ??
    stale.recoveryRefs.latest_workspace_snapshot_ref ??
    stale.recoveryRefs.latest_approval_pack_ref ??
    stale.recoveryRefs.latest_client_portal_workspace_ref ??
    stale.recoveryRefs.latest_upload_session_ref ??
    stale.recoveryRefs.latest_policy_snapshot_ref
  );
}

function canPersistStaleReceipt(
  parsed: ParsedCommandEnvelope,
  stale: Extract<StalePreconditionDecision, { outcome: "STALE" }>,
) {
  if (parsed.commandFamily.projection_stream_class === "NONE") {
    return false;
  }
  switch (parsed.command.target_scope_class) {
    case "MANIFEST":
      return [
        "CLIENT_PORTAL_WORKSPACE_VERSION",
        "APPROVAL_PACK_HASH",
        "DECISION_BUNDLE_HASH",
        "FRAME_EPOCH",
        "SHELL_STABILITY_TOKEN",
      ].includes(stale.staleGuardFamily);
    case "WORK_ITEM":
      return [
        "CLIENT_PORTAL_WORKSPACE_VERSION",
        "CUSTOMER_THREAD_HEAD",
        "INTERNAL_THREAD_HEAD",
        "REQUEST_STATE_VERSION",
        "WORK_ITEM_VERSION",
      ].includes(stale.staleGuardFamily);
    case "GOVERNANCE":
      return [
        "DEPENDENCY_TOPOLOGY_HASH",
        "MUTATION_BASIS_CONTRACT_HASH",
        "POLICY_SNAPSHOT_HASH",
        "SIMULATION_BASIS_HASH",
      ].includes(stale.staleGuardFamily);
  }
}

function staleProblemAudience(
  stale: Extract<StalePreconditionDecision, { outcome: "STALE" }>,
) {
  return stale.recoveryRefs.latest_approval_pack_ref !== null ||
    stale.recoveryRefs.latest_client_portal_workspace_ref !== null ||
    stale.recoveryRefs.latest_upload_session_ref !== null
    ? "PORTAL"
    : undefined;
}

async function reject(input: {
  correlationId: string;
  detailOverride?: string | null;
  latestCommandReceiptRefOrNull?: string | null;
  parsed?: ParsedCommandEnvelope;
  policyBundle: NorthboundPolicyBundle;
  problemCode: string;
  reasonCodes?: string[];
}): Promise<CommandRejectionProblem> {
  const rejectionInput = {
    correlationId: input.correlationId,
    latestCommandReceiptRefOrNull: input.latestCommandReceiptRefOrNull ?? null,
    policyBundle: input.policyBundle,
    problemCode: input.problemCode,
  } as Parameters<typeof buildProblemEnvelopeForCommandRejection>[0];
  if (input.detailOverride !== undefined) {
    rejectionInput.detailOverride = input.detailOverride;
  }
  if (input.parsed !== undefined) {
    rejectionInput.parsed = input.parsed;
  }
  if (input.reasonCodes !== undefined) {
    rejectionInput.reasonCodes = input.reasonCodes;
  }
  return buildProblemEnvelopeForCommandRejection(rejectionInput);
}

async function buildStaleProblemAndReceipt(input: {
  acceptedAt: string;
  correlationId: string;
  duplicateSuppressionKey: string;
  expiresAt: string;
  parsed: ParsedCommandEnvelope;
  policyBundle: NorthboundPolicyBundle;
  receiptRepository: ApiCommandReceiptRepository;
  requestHash: string;
  routeState: NorthboundRouteState;
  stale: Extract<StalePreconditionDecision, { outcome: "STALE" }>;
}): Promise<CommandRejectionProblem> {
  let latestCommandReceiptRefOrNull = input.stale.latestCommandReceiptRefOrNull;

  if (canPersistStaleReceipt(input.parsed, input.stale)) {
    const projectionRef = staleProjectionRef(input.stale);
    if (projectionRef !== null) {
      const receipt = buildApiCommandReceipt({
        acceptedAt: input.acceptedAt,
        acceptanceState: "REJECTED_STALE_VIEW",
        expiresAt: input.expiresAt,
        latestStabilityContractOrNull: input.stale.routeStabilityContract,
        latestStaleGuardValue: input.stale.latestStaleGuardValue,
        parsed: input.parsed,
        projectionRefOrNull: projectionRef,
        projectionSequenceOrNull: input.routeState.last_published_sequence_or_null,
        reasonCodes: input.stale.reasonCodes,
        requestHash: input.requestHash,
        staleGuardFamily: input.stale.staleGuardFamily,
      });
      await input.receiptRepository.persistApiCommandReceipt({
        command: input.parsed.command,
        duplicate_suppression_key: input.duplicateSuppressionKey,
        persisted_at: input.acceptedAt,
        receipt,
      });
      latestCommandReceiptRefOrNull = receipt.receipt_id;
    }
  }

  const staleProblem = buildStaleViewProblemEnvelope({
    audience: staleProblemAudience(input.stale),
    correlationId: input.correlationId,
    problemCode: input.stale.problemCode,
    latestStabilityContract: input.stale.routeStabilityContract,
    latestStaleGuardValue: input.stale.latestStaleGuardValue,
    manifestId: input.parsed.command.manifest_id,
    mutationPreconditionBinding: input.parsed.command.mutation_precondition_binding,
    reasonCodes: input.stale.reasonCodes,
    recoveryRefs: {
      latestApprovalPackRef: input.stale.recoveryRefs.latest_approval_pack_ref,
      latestClientPortalWorkspaceRef:
        input.stale.recoveryRefs.latest_client_portal_workspace_ref,
      latestCommandReceiptRef: latestCommandReceiptRefOrNull,
      latestDecisionBundleRef: input.stale.recoveryRefs.latest_decision_bundle_ref,
      latestPolicySnapshotRef: input.stale.recoveryRefs.latest_policy_snapshot_ref,
      latestResumeToken: input.stale.recoveryRefs.latest_resume_token,
      latestUploadSessionRef: input.stale.recoveryRefs.latest_upload_session_ref,
      latestWorkspaceSnapshotRef: input.stale.recoveryRefs.latest_workspace_snapshot_ref,
    },
    staleGuardFamily: input.stale.staleGuardFamily,
  });
  return {
    problem: staleProblem.body,
    status: staleProblem.status,
  };
}

export async function postCommandsEndpoint(
  request: PostCommandsEndpointRequest,
  dependencies: PostCommandsEndpointDependencies,
): Promise<PostCommandsEndpointResponse> {
  const policyBundle = dependencies.policyBundle ?? (await loadNorthboundPolicyBundle());
  const requestCorrelationId = correlationId(request);

  if (request.method !== undefined && request.method !== "POST") {
    const rejected = await reject({
      correlationId: requestCorrelationId,
      policyBundle,
      problemCode: "INVALID_COMMAND_ENVELOPE",
      reasonCodes: ["HTTP_METHOD_INVALID"],
    });
    return {
      body: rejected.problem,
      status: rejected.status,
    };
  }
  if (request.path !== undefined && request.path !== "/v1/commands") {
    const rejected = await reject({
      correlationId: requestCorrelationId,
      policyBundle,
      problemCode: "INVALID_COMMAND_ENVELOPE",
      reasonCodes: ["HTTP_ROUTE_INVALID"],
    });
    return {
      body: rejected.problem,
      status: rejected.status,
    };
  }

  let parsed: ParsedCommandEnvelope;
  try {
    parsed = await validateCommandEnvelope({
      actorContext: request.actorContext,
      envelope: request.body,
      policyBundle,
    });
  } catch (error) {
    if (error instanceof NorthboundBoundaryError) {
      const rejected = await reject({
        correlationId: requestCorrelationId,
        detailOverride: error.detailOverride,
        policyBundle,
        problemCode: error.problemCode,
        reasonCodes: error.reasonCodes,
      });
      return {
        body: rejected.problem,
        status: rejected.status,
      };
    }
    throw error;
  }

  const now = dependencies.clock?.() ?? new Date();
  const acceptedAt = iso(now);
  const expiresAt = iso(addMs(now, dependencies.receiptTtlMs ?? 86_400_000));
  const hash = hashCommandRequest(parsed);

  const duplicate = await findDuplicateCommandReceipt({
    parsed,
    receiptRepository: dependencies.receiptRepository,
    requestHash: hash.request_hash,
  });
  if (duplicate.outcome === "DUPLICATE_REPLAY") {
    const duplicateReceipt = buildDuplicateReplayReceipt({
      existing: duplicate.existing,
      parsed,
    });
    await dependencies.receiptRepository.persistApiCommandReceipt({
      command: parsed.command,
      duplicate_suppression_key: hash.duplicate_suppression_key,
      persisted_at: duplicateReceipt.accepted_at,
      receipt: duplicateReceipt,
    });
    return {
      body: duplicateReceipt,
      status: 200,
    };
  }
  if (duplicate.outcome === "IDEMPOTENCY_COLLISION") {
    const rejected = await reject({
      correlationId: requestCorrelationId,
      latestCommandReceiptRefOrNull: duplicate.existing.receipt.receipt_id,
      parsed,
      policyBundle,
      problemCode: "IDEMPOTENCY_COLLISION",
      reasonCodes: ["IDEMPOTENCY_COLLISION"],
    });
    return {
      body: rejected.problem,
      status: rejected.status,
    };
  }

  const routeState = await dependencies.routeStateResolver(parsed);
  const stale = evaluateStalePreconditions(parsed, routeState);
  if (stale.outcome === "STALE") {
    const staleProblem = await buildStaleProblemAndReceipt({
      acceptedAt,
      correlationId: requestCorrelationId,
      duplicateSuppressionKey: hash.duplicate_suppression_key,
      expiresAt,
      parsed,
      policyBundle,
      receiptRepository: dependencies.receiptRepository,
      requestHash: hash.request_hash,
      routeState,
      stale,
    });
    return {
      body: staleProblem.problem,
      status: staleProblem.status,
    };
  }

  const receipt = await persistCommandReceiptBeforeDispatch({
    acceptedAt,
    duplicateSuppressionKey: hash.duplicate_suppression_key,
    expiresAt,
    parsed,
    receiptRepository: dependencies.receiptRepository,
    requestHash: hash.request_hash,
    routeState,
  });
  const dispatchInput = {
    parsed,
    persistedReceipt: receipt,
  } as Parameters<typeof dispatchCommandToDomainHandler>[0];
  if (dependencies.domainCommandHandler !== undefined) {
    dispatchInput.handler = dependencies.domainCommandHandler;
  }
  await dispatchCommandToDomainHandler(dispatchInput);

  return {
    body: receipt,
    status: 202,
  };
}

export function createPostCommandsEndpointDependencies(input: {
  routeStateResolver: PostCommandsRouteStateResolver;
  clock?: () => Date;
  domainCommandHandler?: DomainCommandHandler;
  policyBundle?: NorthboundPolicyBundle;
  receiptRepository?: ApiCommandReceiptRepository;
  receiptTtlMs?: number;
}): PostCommandsEndpointDependencies {
  const dependencies = {
    receiptRepository: input.receiptRepository ?? new ApiCommandReceiptRepository(),
    routeStateResolver: input.routeStateResolver,
  } as PostCommandsEndpointDependencies;
  if (input.clock !== undefined) {
    dependencies.clock = input.clock;
  }
  if (input.domainCommandHandler !== undefined) {
    dependencies.domainCommandHandler = input.domainCommandHandler;
  }
  if (input.policyBundle !== undefined) {
    dependencies.policyBundle = input.policyBundle;
  }
  if (input.receiptTtlMs !== undefined) {
    dependencies.receiptTtlMs = input.receiptTtlMs;
  }
  return dependencies;
}
