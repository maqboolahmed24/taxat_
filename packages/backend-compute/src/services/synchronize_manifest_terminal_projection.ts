import {
  buildEmptyRunManifestAppendOnlyOutcomeProjection,
  synchronizeManifestOutcomeProjectionMirrors,
  type RunManifestOutputLinkMapRecord,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import { decisionBundleRef, type DecisionBundleRecord } from "../models/decision_bundle.ts";
import type { GateDecisionRecord } from "../models/gate_decision_record.ts";

type TerminalOutputRef = {
  artifact_hash_or_null?: string | null;
  artifact_ref: string | null | undefined;
  artifact_type: string;
  key: string;
  linkage_role_code:
    | "DECISION_BUNDLE"
    | "FILING_CASE"
    | "AMENDMENT_CASE"
    | "PRIMARY_PROOF_BUNDLE"
    | "EVIDENCE_GRAPH"
    | "PARITY_RESULT"
    | "TWIN_VIEW"
    | "FILING_PACKET"
    | "SUBMISSION_RECORD"
    | "REPLAY_ATTESTATION"
    | "DRIFT_RECORD"
    | "OTHER";
};

function addOutputRef(
  outputRefs: RunManifestOutputLinkMapRecord,
  manifest: RunManifestRecord,
  dependencyRefs: readonly string[],
  ref: TerminalOutputRef,
) {
  if (ref.artifact_ref == null) {
    return;
  }
  outputRefs[ref.key] = {
    artifact_hash_or_null: ref.artifact_hash_or_null ?? null,
    artifact_ref: ref.artifact_ref,
    artifact_type: ref.artifact_type,
    dependency_identity_refs: [...dependencyRefs],
    linkage_role_code: ref.linkage_role_code,
    produced_by_manifest_id: manifest.manifest_id,
  };
}

export function synchronizeManifestTerminalProjection(input: {
  audit_refs?: readonly string[];
  decision_bundle: DecisionBundleRecord;
  decision_bundle_hash: string;
  deterministic_outcome_hash: string;
  drift_refs?: readonly string[];
  gate_records?: readonly GateDecisionRecord[];
  manifest: RunManifestRecord;
}): RunManifestRecord {
  const manifest = structuredClone(input.manifest);
  const projection = structuredClone(
    manifest.append_only_outcome_projection ?? buildEmptyRunManifestAppendOnlyOutcomeProjection(),
  );
  const dependencyRefs = [
    manifest.hash_set?.execution_basis_hash,
    input.decision_bundle.snapshot_id,
    input.decision_bundle.compute_id,
    input.decision_bundle.forecast_id,
    input.decision_bundle.risk_id,
    input.decision_bundle.parity_id,
    input.decision_bundle.trust_id,
    input.decision_bundle.graph_id,
    input.decision_bundle.twin_id,
    input.decision_bundle.filing_packet_id,
    input.decision_bundle.submission_record_id,
    input.decision_bundle.primary_proof_bundle_ref,
  ].filter((ref): ref is string => typeof ref === "string" && ref.length > 0);

  const outputRefs: RunManifestOutputLinkMapRecord = {
    ...(projection.output_refs ?? {}),
  };
  addOutputRef(outputRefs, manifest, dependencyRefs, {
    artifact_hash_or_null: input.decision_bundle_hash,
    artifact_ref: decisionBundleRef(input.decision_bundle),
    artifact_type: "DecisionBundle",
    key: "decision_bundle",
    linkage_role_code: "DECISION_BUNDLE",
  });
  for (const ref of [
    {
      artifact_ref: input.decision_bundle.snapshot_id,
      artifact_type: "Snapshot",
      key: "snapshot",
      linkage_role_code: "OTHER" as const,
    },
    {
      artifact_ref: input.decision_bundle.compute_id,
      artifact_type: "ComputeResult",
      key: "compute_result",
      linkage_role_code: "OTHER" as const,
    },
    {
      artifact_ref: input.decision_bundle.forecast_id,
      artifact_type: "ForecastSet",
      key: "forecast_set",
      linkage_role_code: "OTHER" as const,
    },
    {
      artifact_ref: input.decision_bundle.risk_id,
      artifact_type: "RiskReport",
      key: "risk_report",
      linkage_role_code: "OTHER" as const,
    },
    {
      artifact_ref: input.decision_bundle.parity_id,
      artifact_type: "ParityResult",
      key: "parity_result",
      linkage_role_code: "PARITY_RESULT" as const,
    },
    {
      artifact_ref: input.decision_bundle.trust_id,
      artifact_type: "TrustSummary",
      key: "trust_summary",
      linkage_role_code: "OTHER" as const,
    },
    {
      artifact_ref: input.decision_bundle.graph_id,
      artifact_type: "EvidenceGraph",
      key: "evidence_graph",
      linkage_role_code: "EVIDENCE_GRAPH" as const,
    },
    {
      artifact_ref: input.decision_bundle.primary_proof_bundle_ref,
      artifact_type: "ProofBundle",
      key: "primary_proof_bundle",
      linkage_role_code: "PRIMARY_PROOF_BUNDLE" as const,
    },
    {
      artifact_ref: input.decision_bundle.twin_id,
      artifact_type: "TwinView",
      key: "twin_view",
      linkage_role_code: "TWIN_VIEW" as const,
    },
    {
      artifact_ref: input.decision_bundle.filing_packet_id,
      artifact_type: "FilingPacket",
      key: "filing_packet",
      linkage_role_code: "FILING_PACKET" as const,
    },
    {
      artifact_ref: input.decision_bundle.submission_record_id,
      artifact_type: "SubmissionRecord",
      key: "submission_record",
      linkage_role_code: "SUBMISSION_RECORD" as const,
    },
    {
      artifact_ref: input.decision_bundle.filing_case_id,
      artifact_type: "FilingCase",
      key: "filing_case",
      linkage_role_code: "FILING_CASE" as const,
    },
    {
      artifact_ref: input.decision_bundle.amendment_case_id,
      artifact_type: "AmendmentCase",
      key: "amendment_case",
      linkage_role_code: "AMENDMENT_CASE" as const,
    },
    {
      artifact_ref: input.decision_bundle.replay_attestation_ref,
      artifact_type: "ReplayAttestation",
      key: "replay_attestation",
      linkage_role_code: "REPLAY_ATTESTATION" as const,
    },
  ]) {
    addOutputRef(outputRefs, manifest, dependencyRefs, ref);
  }
  for (const [index, driftRef] of (input.drift_refs ?? []).entries()) {
    addOutputRef(outputRefs, manifest, dependencyRefs, {
      artifact_ref: driftRef,
      artifact_type: "DriftRecord",
      key: `drift_record_${index + 1}`,
      linkage_role_code: "DRIFT_RECORD",
    });
  }

  projection.projection_generation += 1;
  projection.gating_decisions =
    input.gate_records === undefined
      ? projection.gating_decisions
      : input.gate_records.map((gate) => structuredClone(gate));
  projection.output_refs = outputRefs;
  projection.audit_refs = Array.from(
    new Set([...(projection.audit_refs ?? []), ...(input.audit_refs ?? [])]),
  ).sort((left, right) => left.localeCompare(right));
  projection.submission_refs = Array.from(
    new Set([
      ...(projection.submission_refs ?? []),
      ...(input.decision_bundle.submission_record_id == null
        ? []
        : [input.decision_bundle.submission_record_id]),
    ]),
  ).sort((left, right) => left.localeCompare(right));
  projection.drift_refs = Array.from(
    new Set([...(projection.drift_refs ?? []), ...(input.drift_refs ?? [])]),
  ).sort((left, right) => left.localeCompare(right));
  projection.decision_bundle_hash = input.decision_bundle_hash;
  projection.deterministic_outcome_hash = input.deterministic_outcome_hash;
  projection.replay_attestation_ref =
    input.decision_bundle.replay_attestation_ref ?? projection.replay_attestation_ref ?? null;

  return synchronizeManifestOutcomeProjectionMirrors({
    ...manifest,
    append_only_outcome_projection: projection,
  });
}
