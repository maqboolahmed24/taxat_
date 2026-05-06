import type { RunManifestAppendOnlyOutcomeProjectionRecord } from "../models/run_manifest.ts";
import {
  normalizeMaterialOutcomeComponent,
  OUTCOME_COMPONENT_CLASSES,
  type MaterialOutcomeComponentInput,
  type NormalizedMaterialOutcomeComponent,
  type OutcomeComponentClass,
  type OutcomeComponentMateriality,
} from "./normalize_material_outcome_surface.ts";

export class OutcomeComponentInventoryError extends Error {
  constructor(detail: string) {
    super(`OUTCOME_COMPONENT_INVENTORY_INVALID: ${detail}`);
    this.name = "OutcomeComponentInventoryError";
  }
}

const DEFAULT_MATERIALITY: Record<OutcomeComponentClass, OutcomeComponentMateriality> = {
  DECISION_BUNDLE: "BLOCKING",
  GATE_SEQUENCE: "BLOCKING",
  SNAPSHOT: "MATERIAL",
  COMPUTE_RESULT: "MATERIAL",
  FORECAST_SET: "MATERIAL",
  RISK_REPORT: "MATERIAL",
  PARITY_RESULT: "MATERIAL",
  TRUST_SUMMARY: "MATERIAL",
  EVIDENCE_GRAPH: "MATERIAL",
  TWIN_VIEW: "MATERIAL",
  FILING_PACKET: "BLOCKING",
  AUTHORITY_RESULT: "BLOCKING",
  LATE_DATA_BASIS: "MATERIAL",
  DRIFT_RECORD: "MATERIAL",
};

const OUTPUT_ROLE_BY_COMPONENT: Partial<Record<OutcomeComponentClass, string[]>> = {
  DECISION_BUNDLE: ["DECISION_BUNDLE"],
  PARITY_RESULT: ["PARITY_RESULT"],
  EVIDENCE_GRAPH: ["EVIDENCE_GRAPH", "PRIMARY_PROOF_BUNDLE"],
  TWIN_VIEW: ["TWIN_VIEW"],
  FILING_PACKET: ["FILING_PACKET"],
  AUTHORITY_RESULT: ["SUBMISSION_RECORD"],
  DRIFT_RECORD: ["DRIFT_RECORD"],
};

function findProjectionLink(
  projection: RunManifestAppendOnlyOutcomeProjectionRecord,
  componentClass: OutcomeComponentClass,
) {
  const roles = OUTPUT_ROLE_BY_COMPONENT[componentClass] ?? [];
  return Object.values(projection.output_refs).find(
    (entry) =>
      roles.includes(entry.linkage_role_code) ||
      entry.artifact_type.toUpperCase().replaceAll(" ", "_") === componentClass,
  );
}

export function buildOutcomeComponentInventory(input: {
  components: readonly MaterialOutcomeComponentInput[];
}): NormalizedMaterialOutcomeComponent[] {
  const byClass = new Map<OutcomeComponentClass, MaterialOutcomeComponentInput>();
  for (const component of input.components) {
    if (byClass.has(component.component_class)) {
      throw new OutcomeComponentInventoryError(
        `${component.component_class} appears more than once`,
      );
    }
    byClass.set(component.component_class, component);
  }

  return OUTCOME_COMPONENT_CLASSES.map((componentClass) =>
    normalizeMaterialOutcomeComponent({
      component_class: componentClass,
      component_ref: byClass.get(componentClass)?.component_ref ?? null,
      materiality: byClass.get(componentClass)?.materiality ?? DEFAULT_MATERIALITY[componentClass],
      payload: byClass.get(componentClass)?.payload ?? null,
    }),
  );
}

export function buildOutcomeComponentInventoryFromProjection(
  projection: RunManifestAppendOnlyOutcomeProjectionRecord,
) {
  return buildOutcomeComponentInventory({
    components: OUTCOME_COMPONENT_CLASSES.map((componentClass) => {
      if (componentClass === "GATE_SEQUENCE") {
        return {
          component_class: componentClass,
          component_ref: `gate-sequence://${projection.projection_hash}`,
          payload: projection.gating_decisions.map((gate) => ({
            gate_code: gate.gate_code,
            gate_stage_index: gate.gate_stage_index,
            decision: gate.decision,
            reason_codes: gate.reason_codes,
            dominant_reason_code: gate.dominant_reason_code,
            severity: gate.severity,
            overrideability: gate.overrideability,
            override_resolution_state: gate.override_resolution_state,
          })),
        };
      }
      if (componentClass === "LATE_DATA_BASIS") {
        return {
          component_class: componentClass,
          component_ref: projection.post_seal_basis.late_data_monitor_result_ref,
          payload: {
            late_data_monitor_result_hash:
              projection.post_seal_basis.late_data_monitor_result_hash,
            basis_state: projection.post_seal_basis.basis_state,
          },
        };
      }

      const link = findProjectionLink(projection, componentClass);
      return {
        component_class: componentClass,
        component_ref: link?.artifact_ref ?? null,
        payload:
          link == null
            ? null
            : {
                artifact_hash_or_null: link.artifact_hash_or_null,
                artifact_ref: link.artifact_ref,
                artifact_type: link.artifact_type,
                dependency_identity_refs: link.dependency_identity_refs,
                linkage_role_code: link.linkage_role_code,
              },
      };
    }),
  });
}
