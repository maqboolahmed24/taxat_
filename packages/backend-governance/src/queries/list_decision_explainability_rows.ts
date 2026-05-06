import type {
  StoredDecisionBundleRecord,
  StoredGateDecisionRecord,
  StoredTrustSummaryRecord,
} from "../../../backend-compute/src/index.ts";
import {
  projectDecisionBundleExplainabilityView,
  projectGateDecisionExplainabilityView,
  projectTrustSummaryExplainabilityView,
  type DecisionExplainabilityView,
} from "../../../backend-compute/src/services/project_decision_explainability_view.ts";
import {
  buildGateDecisionExplainabilityProjection,
  type GateDecisionExplainabilityProjection,
} from "../projectors/build_gate_decision_explainability_projection.ts";
import {
  GateDecisionExplainabilityQueryError,
  type DecisionExplainabilityArtifactFamily,
} from "./get_gate_decision_explainability.ts";

export type DecisionExplainabilityRowsGateReader = {
  listGateDecisionsByManifestId(manifestId: string): Promise<StoredGateDecisionRecord[]>;
};

export type DecisionExplainabilityRowsTrustReader = {
  listTrustSummariesByManifestId(manifestId: string): Promise<StoredTrustSummaryRecord[]>;
};

export type DecisionExplainabilityRowsBundleReader = {
  listDecisionBundlesByManifestId(manifestId: string): Promise<StoredDecisionBundleRecord[]>;
};

export type DecisionExplainabilityRow = {
  artifact_family: DecisionExplainabilityArtifactFamily;
  artifact_id: string;
  artifact_ref: string;
  dominant_reason_code: string;
  manifest_id: string;
  persisted_at: string;
  projection: GateDecisionExplainabilityProjection;
  row_contract_version: "DECISION_EXPLAINABILITY_ROW_V1";
  row_source_policy: "PERSISTED_ARTIFACT_DECISION_EXPLAINABILITY_CONTRACT_ONLY";
  suppressed_reason_count: number;
  view: DecisionExplainabilityView;
};

export type DecisionExplainabilityRowsResult = {
  list_contract_version: "DECISION_EXPLAINABILITY_ROWS_V1";
  manifest_id: string;
  row_count: number;
  rows: DecisionExplainabilityRow[];
};

const FAMILY_ORDER = ["GATE_DECISION", "TRUST_SUMMARY", "DECISION_BUNDLE"] as const;

function familyRank(family: DecisionExplainabilityArtifactFamily) {
  return FAMILY_ORDER.indexOf(family);
}

function buildRow(input: {
  artifact_family: DecisionExplainabilityArtifactFamily;
  persisted_at: string;
  view: DecisionExplainabilityView;
}): DecisionExplainabilityRow {
  return {
    artifact_family: input.artifact_family,
    artifact_id: input.view.artifact_id,
    artifact_ref: input.view.artifact_ref,
    dominant_reason_code: input.view.dominant_reason_code,
    manifest_id: input.view.manifest_id,
    persisted_at: input.persisted_at,
    projection: buildGateDecisionExplainabilityProjection(input.view),
    row_contract_version: "DECISION_EXPLAINABILITY_ROW_V1",
    row_source_policy: "PERSISTED_ARTIFACT_DECISION_EXPLAINABILITY_CONTRACT_ONLY",
    suppressed_reason_count: input.view.suppressed_reason_count,
    view: input.view,
  };
}

export async function listDecisionExplainabilityRows(input: {
  artifact_families?: readonly DecisionExplainabilityArtifactFamily[] | undefined;
  bundle_reader?: DecisionExplainabilityRowsBundleReader | undefined;
  gate_reader?: DecisionExplainabilityRowsGateReader | undefined;
  manifest_id: string;
  trust_reader?: DecisionExplainabilityRowsTrustReader | undefined;
}): Promise<DecisionExplainabilityRowsResult> {
  const families = input.artifact_families ?? FAMILY_ORDER;
  const rows: DecisionExplainabilityRow[] = [];

  if (families.includes("GATE_DECISION")) {
    if (input.gate_reader === undefined) {
      throw new GateDecisionExplainabilityQueryError(
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "GATE_DECISION explainability row listings require a gate_reader",
      );
    }
    const storedRows = await input.gate_reader.listGateDecisionsByManifestId(input.manifest_id);
    rows.push(
      ...storedRows.map((stored) =>
        buildRow({
          artifact_family: "GATE_DECISION",
          persisted_at: stored.persisted_at,
          view: projectGateDecisionExplainabilityView(stored.gate_decision_record),
        }),
      ),
    );
  }

  if (families.includes("TRUST_SUMMARY")) {
    if (input.trust_reader === undefined) {
      throw new GateDecisionExplainabilityQueryError(
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "TRUST_SUMMARY explainability row listings require a trust_reader",
      );
    }
    const storedRows = await input.trust_reader.listTrustSummariesByManifestId(input.manifest_id);
    rows.push(
      ...storedRows.map((stored) =>
        buildRow({
          artifact_family: "TRUST_SUMMARY",
          persisted_at: stored.persisted_at,
          view: projectTrustSummaryExplainabilityView(stored.trust_summary),
        }),
      ),
    );
  }

  if (families.includes("DECISION_BUNDLE")) {
    if (input.bundle_reader === undefined) {
      throw new GateDecisionExplainabilityQueryError(
        "DECISION_EXPLAINABILITY_QUERY_ARTIFACT_READER_MISSING",
        "DECISION_BUNDLE explainability row listings require a bundle_reader",
      );
    }
    const storedRows = await input.bundle_reader.listDecisionBundlesByManifestId(input.manifest_id);
    rows.push(
      ...storedRows.map((stored) =>
        buildRow({
          artifact_family: "DECISION_BUNDLE",
          persisted_at: stored.persisted_at,
          view: projectDecisionBundleExplainabilityView(stored.record),
        }),
      ),
    );
  }

  rows.sort((left, right) => {
    const familyOrder = familyRank(left.artifact_family) - familyRank(right.artifact_family);
    if (familyOrder !== 0) {
      return familyOrder;
    }
    const persistedOrder = left.persisted_at.localeCompare(right.persisted_at);
    if (persistedOrder !== 0) {
      return persistedOrder;
    }
    return left.artifact_id.localeCompare(right.artifact_id);
  });

  return {
    list_contract_version: "DECISION_EXPLAINABILITY_ROWS_V1",
    manifest_id: input.manifest_id,
    row_count: rows.length,
    rows,
  };
}
