import type {
  StoredDecisionBundleRecord,
  StoredGateDecisionRecord,
  StoredTrustSummaryRecord,
} from "../../../backend-compute/src/index.ts";
import {
  projectDecisionBundleExplainabilityView,
  projectGateDecisionExplainabilityView,
  projectTrustSummaryExplainabilityView,
  type DecisionExplainabilityProjectionFamily,
  type DecisionExplainabilityView,
} from "../../../backend-compute/src/services/project_decision_explainability_view.ts";
import {
  buildGateDecisionExplainabilityProjection,
  type GateDecisionExplainabilityProjection,
} from "../projectors/build_gate_decision_explainability_projection.ts";

export type DecisionExplainabilityArtifactFamily = DecisionExplainabilityProjectionFamily;

export type GateDecisionExplainabilityGateReader = {
  getGateDecisionById(gateDecisionId: string): Promise<StoredGateDecisionRecord | null>;
  getGateDecisionByRef(ref: string): Promise<StoredGateDecisionRecord | null>;
};

export type GateDecisionExplainabilityTrustReader = {
  getTrustSummaryById(trustId: string): Promise<StoredTrustSummaryRecord | null>;
  getTrustSummaryByRef(ref: string): Promise<StoredTrustSummaryRecord | null>;
};

export type GateDecisionExplainabilityBundleReader = {
  getDecisionBundleById(decisionBundleId: string): Promise<StoredDecisionBundleRecord | null>;
  getDecisionBundleByRef(decisionBundleRef: string): Promise<StoredDecisionBundleRecord | null>;
};

export type GateDecisionExplainabilityQueryErrorCode =
  | "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING"
  | "DECISION_EXPLAINABILITY_QUERY_IDENTITY_INVALID"
  | "DECISION_EXPLAINABILITY_QUERY_NOT_FOUND";

export class GateDecisionExplainabilityQueryError extends Error {
  readonly code: GateDecisionExplainabilityQueryErrorCode;

  constructor(code: GateDecisionExplainabilityQueryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GateDecisionExplainabilityQueryError";
    this.code = code;
  }
}

function assertQuery(
  condition: unknown,
  code: GateDecisionExplainabilityQueryErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GateDecisionExplainabilityQueryError(code, detail);
  }
}

function assertSingleIdentity(input: {
  artifact_id?: string | undefined;
  artifact_ref?: string | undefined;
}) {
  assertQuery(
    (input.artifact_id === undefined) !== (input.artifact_ref === undefined),
    "DECISION_EXPLAINABILITY_QUERY_IDENTITY_INVALID",
    "exactly one of artifact_id or artifact_ref must be provided",
  );
}

export type GateDecisionExplainabilityQueryResult = {
  projection: GateDecisionExplainabilityProjection;
  query_contract_version: "GATE_DECISION_EXPLAINABILITY_QUERY_V1";
  query_family: DecisionExplainabilityArtifactFamily;
  row_source_policy: "PERSISTED_ARTIFACT_DECISION_EXPLAINABILITY_CONTRACT_ONLY";
  view: DecisionExplainabilityView;
};

export async function getGateDecisionExplainability(input: {
  artifact_family: DecisionExplainabilityArtifactFamily;
  artifact_id?: string | undefined;
  artifact_ref?: string | undefined;
  bundle_reader?: GateDecisionExplainabilityBundleReader | undefined;
  gate_reader?: GateDecisionExplainabilityGateReader | undefined;
  trust_reader?: GateDecisionExplainabilityTrustReader | undefined;
}): Promise<GateDecisionExplainabilityQueryResult> {
  assertSingleIdentity(input);
  let view: DecisionExplainabilityView;
  switch (input.artifact_family) {
    case "GATE_DECISION": {
      assertQuery(
        input.gate_reader !== undefined,
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "GATE_DECISION explainability queries require a gate_reader",
      );
      const stored =
        input.artifact_id !== undefined
          ? await input.gate_reader.getGateDecisionById(input.artifact_id)
          : await input.gate_reader.getGateDecisionByRef(input.artifact_ref as string);
      assertQuery(
        stored !== null,
        "DECISION_EXPLAINABILITY_QUERY_NOT_FOUND",
        `gate decision ${input.artifact_id ?? input.artifact_ref} was not found`,
      );
      view = projectGateDecisionExplainabilityView(stored.gate_decision_record);
      break;
    }
    case "TRUST_SUMMARY": {
      assertQuery(
        input.trust_reader !== undefined,
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "TRUST_SUMMARY explainability queries require a trust_reader",
      );
      const stored =
        input.artifact_id !== undefined
          ? await input.trust_reader.getTrustSummaryById(input.artifact_id)
          : await input.trust_reader.getTrustSummaryByRef(input.artifact_ref as string);
      assertQuery(
        stored !== null,
        "DECISION_EXPLAINABILITY_QUERY_NOT_FOUND",
        `trust summary ${input.artifact_id ?? input.artifact_ref} was not found`,
      );
      view = projectTrustSummaryExplainabilityView(stored.trust_summary);
      break;
    }
    case "DECISION_BUNDLE": {
      assertQuery(
        input.bundle_reader !== undefined,
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "DECISION_BUNDLE explainability queries require a bundle_reader",
      );
      const stored =
        input.artifact_id !== undefined
          ? await input.bundle_reader.getDecisionBundleById(input.artifact_id)
          : await input.bundle_reader.getDecisionBundleByRef(input.artifact_ref as string);
      assertQuery(
        stored !== null,
        "DECISION_EXPLAINABILITY_QUERY_NOT_FOUND",
        `decision bundle ${input.artifact_id ?? input.artifact_ref} was not found`,
      );
      view = projectDecisionBundleExplainabilityView(stored.record);
      break;
    }
  }
  return {
    projection: buildGateDecisionExplainabilityProjection(view),
    query_contract_version: "GATE_DECISION_EXPLAINABILITY_QUERY_V1",
    query_family: input.artifact_family,
    row_source_policy: "PERSISTED_ARTIFACT_DECISION_EXPLAINABILITY_CONTRACT_ONLY",
    view,
  };
}
