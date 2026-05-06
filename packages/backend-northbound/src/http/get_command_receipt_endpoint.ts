import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";
import { getCommandReceiptByCommandId } from "../query/get_command_receipt_by_command_id.ts";
import { ApiCommandReceiptRepository } from "../repositories/api_command_receipt_repository.ts";
import { authorizeCommandReceiptRead } from "../services/authorize_command_receipt_read.ts";
import {
  buildCommandReceiptProblemEnvelope,
  type CommandReceiptProblemEnvelope,
} from "../services/build_command_receipt_problem_envelope.ts";
import { buildCommandReceiptResponse } from "../services/build_command_receipt_response.ts";
import {
  CommandReceiptDuplicateLineageError,
  loadLatestReceiptForDuplicateLineage,
} from "../services/load_latest_receipt_for_duplicate_lineage.ts";
import {
  CommandReceiptRecoveryAnchorError,
  validateCommandReceiptRecoveryAnchors,
} from "../services/validate_command_receipt_recovery_anchors.ts";

export type GetCommandReceiptEndpointRequest = {
  actorContext: NorthboundActorContext;
  commandId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
};

export type GetCommandReceiptEndpointResponse =
  | {
      body: ApiCommandReceipt;
      headers: ReturnType<typeof buildCommandReceiptResponse>["headers"];
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: CommandReceiptProblemEnvelope["headers"];
      status: number;
    };

export type GetCommandReceiptEndpointDependencies = {
  receiptRepository: ApiCommandReceiptRepository;
};

const commandReceiptPathPrefix = "/v1/commands/";

function correlationId(request: GetCommandReceiptEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function commandIdFromPath(path: string) {
  if (!path.startsWith(commandReceiptPathPrefix)) {
    return null;
  }
  const encoded = path.slice(commandReceiptPathPrefix.length);
  if (encoded.length === 0 || encoded.includes("/")) {
    return null;
  }
  try {
    const commandId = decodeURIComponent(encoded);
    return commandId.length > 0 ? commandId : null;
  } catch {
    return null;
  }
}

function resolveCommandId(request: GetCommandReceiptEndpointRequest) {
  const pathCommandId =
    request.path === undefined ? undefined : commandIdFromPath(request.path);
  if (request.path !== undefined && pathCommandId === null) {
    return null;
  }
  if (
    request.commandId !== undefined &&
    pathCommandId !== undefined &&
    request.commandId !== pathCommandId
  ) {
    return null;
  }
  return request.commandId ?? pathCommandId ?? null;
}

function notFound(correlationIdValue: string) {
  return buildCommandReceiptProblemEnvelope({
    correlationId: correlationIdValue,
    kind: "NOT_FOUND",
  });
}

function corrupt(input: {
  correlationId: string;
  latestCommandReceiptRefOrNull?: string | null;
  manifestIdOrNull?: string | null;
  reasonCodes: string[];
}) {
  return buildCommandReceiptProblemEnvelope({
    correlationId: input.correlationId,
    kind: "CORRUPT",
    latestCommandReceiptRefOrNull: input.latestCommandReceiptRefOrNull ?? null,
    manifestIdOrNull: input.manifestIdOrNull ?? null,
    reasonCodes: input.reasonCodes,
  });
}

export async function getCommandReceiptEndpoint(
  request: GetCommandReceiptEndpointRequest,
  dependencies: GetCommandReceiptEndpointDependencies,
): Promise<GetCommandReceiptEndpointResponse> {
  const requestCorrelationId = correlationId(request);

  if (request.method !== undefined && request.method !== "GET") {
    return buildCommandReceiptProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
    });
  }

  const commandId = resolveCommandId(request);
  if (commandId === null) {
    return buildCommandReceiptProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
    });
  }

  const queryResult = await getCommandReceiptByCommandId({
    commandId,
    receiptRepository: dependencies.receiptRepository,
    tenantId: request.actorContext.tenant_id,
  });

  let latestVisible = null as (typeof queryResult.records)[number] | null;
  for (const record of [...queryResult.records].reverse()) {
    const authorization = authorizeCommandReceiptRead({
      actorContext: request.actorContext,
      storedReceipt: record,
    });
    if (!authorization.authorized) {
      continue;
    }
    if ("corruptionReasonCodes" in authorization) {
      return corrupt({
        correlationId: requestCorrelationId,
        latestCommandReceiptRefOrNull: record.receipt.receipt_id,
        manifestIdOrNull: record.receipt.manifest_id,
        reasonCodes: authorization.corruptionReasonCodes,
      });
    }
    latestVisible = record;
    break;
  }

  if (latestVisible === null) {
    return notFound(requestCorrelationId);
  }

  try {
    const lineage = await loadLatestReceiptForDuplicateLineage({
      latest: latestVisible,
      receiptRepository: dependencies.receiptRepository,
    });
    validateCommandReceiptRecoveryAnchors({
      duplicateSource: lineage.duplicateSource?.receipt ?? null,
      receipt: lineage.latest.receipt,
    });
    return buildCommandReceiptResponse(lineage.latest.receipt);
  } catch (error) {
    if (error instanceof CommandReceiptDuplicateLineageError) {
      return corrupt({
        correlationId: requestCorrelationId,
        latestCommandReceiptRefOrNull: latestVisible.receipt.receipt_id,
        manifestIdOrNull: latestVisible.receipt.manifest_id,
        reasonCodes: error.reasonCodes,
      });
    }
    if (error instanceof CommandReceiptRecoveryAnchorError) {
      return corrupt({
        correlationId: requestCorrelationId,
        latestCommandReceiptRefOrNull: latestVisible.receipt.receipt_id,
        manifestIdOrNull: latestVisible.receipt.manifest_id,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }
}

export function createGetCommandReceiptEndpointDependencies(input: {
  receiptRepository?: ApiCommandReceiptRepository;
} = {}): GetCommandReceiptEndpointDependencies {
  return {
    receiptRepository: input.receiptRepository ?? new ApiCommandReceiptRepository(),
  };
}
