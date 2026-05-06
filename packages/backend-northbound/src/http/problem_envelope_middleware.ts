import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  buildProblemEnvelope,
  northboundNoStoreHeaders,
  type BuildProblemEnvelopeInput,
} from "../services/build_problem_envelope.ts";
import {
  ProblemRecoveryFamilyError,
} from "../services/restrict_problem_recovery_family.ts";

export type ProblemEnvelopeHttpResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: number;
};

export class NorthboundProblemEnvelopeError extends Error {
  readonly response: ProblemEnvelopeHttpResponse;

  constructor(response: ProblemEnvelopeHttpResponse) {
    super(response.body.problem_code);
    this.name = "NorthboundProblemEnvelopeError";
    this.response = response;
  }
}

export function problemEnvelopeResponse(input: BuildProblemEnvelopeInput & { status: number }) {
  return {
    body: buildProblemEnvelope(input),
    headers: northboundNoStoreHeaders,
    status: input.status,
  } satisfies ProblemEnvelopeHttpResponse;
}

export async function withProblemEnvelopeMiddleware<T>(
  handler: () => Promise<T> | T,
  fallback: Omit<BuildProblemEnvelopeInput, "detail" | "problemCode" | "reasonCodes" | "title"> & {
    problemCode?: string;
    status?: number;
    title?: string;
  },
): Promise<T | ProblemEnvelopeHttpResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof NorthboundProblemEnvelopeError) {
      return error.response;
    }
    if (error instanceof ProblemRecoveryFamilyError) {
      return problemEnvelopeResponse({
        ...fallback,
        detail: error.message,
        problemCode: fallback.problemCode ?? "PROBLEM_ENVELOPE_MAPPING_FAILED",
        reasonCodes: error.reasonCodes,
        status: fallback.status ?? 500,
        title: fallback.title ?? "Problem envelope mapping failed",
      });
    }
    return problemEnvelopeResponse({
      ...fallback,
      detail: error instanceof Error ? error.message : String(error),
      problemCode: fallback.problemCode ?? "NORTHBOUND_FAILURE_UNMAPPED",
      reasonCodes: ["NORTHBOUND_FAILURE_UNMAPPED"],
      status: fallback.status ?? 500,
      title: fallback.title ?? "Northbound failure could not be mapped",
    });
  }
}

