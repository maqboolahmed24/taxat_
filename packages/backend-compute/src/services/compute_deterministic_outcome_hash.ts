import {
  computeDeterministicOutcomeHash,
  type DeterministicOutcomeHashResult,
  type MaterialOutcomeComponentInput,
} from "../../../backend-manifest/src/index.ts";
import { decisionBundleRef, type DecisionBundleRecord } from "../models/decision_bundle.ts";
import { gateDecisionRef, type GateDecisionRecord } from "../models/gate_decision_record.ts";

function artifactPayload(ref: string | null | undefined, artifactType: string) {
  return ref == null ? null : { artifact_ref: ref, artifact_type: artifactType };
}

function gateSequencePayload(gateRecords: readonly GateDecisionRecord[]) {
  return gateRecords.map((gate) => ({
    decision: gate.decision,
    dominant_reason_code: gate.dominant_reason_code,
    gate_code: gate.gate_code,
    gate_stage_index: gate.gate_stage_index,
    override_resolution_state: gate.override_resolution_state,
    overrideability: gate.overrideability,
    reason_codes: gate.reason_codes,
    severity: gate.severity,
  }));
}

export function computeDecisionBundleDeterministicOutcomeHash(input: {
  decision_bundle: DecisionBundleRecord;
  extra_components?: readonly MaterialOutcomeComponentInput[];
  gate_records?: readonly GateDecisionRecord[];
}): DeterministicOutcomeHashResult {
  const bundle = input.decision_bundle;
  const gateRecords = input.gate_records ?? [];
  return computeDeterministicOutcomeHash({
    components: [
      {
        component_class: "DECISION_BUNDLE",
        component_ref: decisionBundleRef(bundle),
        materiality: "BLOCKING",
        payload: bundle,
      },
      {
        component_class: "GATE_SEQUENCE",
        component_ref:
          gateRecords.length === 0
            ? null
            : `gate-sequence://${gateRecords.map(gateDecisionRef).join("+")}`,
        materiality: "BLOCKING",
        payload: gateSequencePayload(gateRecords),
      },
      {
        component_class: "SNAPSHOT",
        component_ref: bundle.snapshot_id ?? null,
        payload: artifactPayload(bundle.snapshot_id, "Snapshot"),
      },
      {
        component_class: "COMPUTE_RESULT",
        component_ref: bundle.compute_id ?? null,
        payload: artifactPayload(bundle.compute_id, "ComputeResult"),
      },
      {
        component_class: "FORECAST_SET",
        component_ref: bundle.forecast_id ?? null,
        payload: artifactPayload(bundle.forecast_id, "ForecastSet"),
      },
      {
        component_class: "RISK_REPORT",
        component_ref: bundle.risk_id ?? null,
        payload: artifactPayload(bundle.risk_id, "RiskReport"),
      },
      {
        component_class: "PARITY_RESULT",
        component_ref: bundle.parity_id ?? null,
        payload: artifactPayload(bundle.parity_id, "ParityResult"),
      },
      {
        component_class: "TRUST_SUMMARY",
        component_ref: bundle.trust_id ?? null,
        payload: artifactPayload(bundle.trust_id, "TrustSummary"),
      },
      {
        component_class: "EVIDENCE_GRAPH",
        component_ref: bundle.graph_id ?? bundle.primary_proof_bundle_ref ?? null,
        payload:
          bundle.graph_id == null && bundle.primary_proof_bundle_ref == null
            ? null
            : {
                graph_id: bundle.graph_id ?? null,
                primary_proof_bundle_ref: bundle.primary_proof_bundle_ref ?? null,
              },
      },
      {
        component_class: "TWIN_VIEW",
        component_ref: bundle.twin_id ?? null,
        payload: artifactPayload(bundle.twin_id, "TwinView"),
      },
      {
        component_class: "FILING_PACKET",
        component_ref: bundle.filing_packet_id ?? null,
        materiality: "BLOCKING",
        payload: artifactPayload(bundle.filing_packet_id, "FilingPacket"),
      },
      {
        component_class: "AUTHORITY_RESULT",
        component_ref: bundle.submission_record_id ?? null,
        materiality: "BLOCKING",
        payload: artifactPayload(bundle.submission_record_id, "SubmissionRecord"),
      },
      {
        component_class: "LATE_DATA_BASIS",
        component_ref:
          bundle.outcome_class === "LATE_DATA_PENDING"
            ? `late-data-basis://${bundle.manifest_id}`
            : null,
        payload:
          bundle.outcome_class === "LATE_DATA_PENDING"
            ? {
                checkpoint_state: bundle.checkpoint_state,
                next_checkpoint_at: bundle.next_checkpoint_at,
              }
            : null,
      },
      {
        component_class: "DRIFT_RECORD",
        component_ref: null,
        payload: null,
      },
      ...(input.extra_components ?? []),
    ],
  });
}
