import { normalizeDecisionBundleRecord } from "../../../backend-compute/src/models/decision_bundle.ts";
import type { StoredDecisionBundleRecord } from "../../../backend-compute/src/repositories/decision_bundle_repository.ts";

export class DecisionBundlePublicationError extends Error {
  readonly code = "DECISION_BUNDLE_PUBLICATION_INVALID";
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "DecisionBundlePublicationError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new DecisionBundlePublicationError(message, reasonCodes);
}

function assertStoredFieldIntegrity(stored: StoredDecisionBundleRecord) {
  const record = stored.record;
  if (record.artifact_type !== "DecisionBundle") {
    fail("decision bundle artifact_type is invalid", ["DECISION_BUNDLE_SCHEMA_INVALID"]);
  }
  if (record.decision_bundle_id !== stored.decision_bundle_id) {
    fail("decision bundle id drifted from repository row", [
      "DECISION_BUNDLE_ROW_ID_DRIFT",
    ]);
  }
  if (record.manifest_id !== stored.manifest_id) {
    fail("decision bundle manifest id drifted from repository row", [
      "DECISION_BUNDLE_MANIFEST_DRIFT",
    ]);
  }
  if (record.decision_status !== stored.decision_status) {
    fail("decision bundle status drifted from repository row", [
      "DECISION_BUNDLE_STATUS_DRIFT",
    ]);
  }
  if (record.outcome_class !== stored.outcome_class) {
    fail("decision bundle outcome class drifted from repository row", [
      "DECISION_BUNDLE_OUTCOME_DRIFT",
    ]);
  }
  if (stored.decision_bundle_hash.length === 0) {
    fail("decision bundle hash is empty", ["DECISION_BUNDLE_HASH_INVALID"]);
  }
  if (record.contract.artifact_content_hash !== stored.decision_bundle_hash) {
    fail("decision bundle hash drifted from artifact contract", [
      "DECISION_BUNDLE_HASH_DRIFT",
    ]);
  }
}

export function validateDecisionBundlePublication(input: {
  stored: StoredDecisionBundleRecord;
}) {
  try {
    const record = normalizeDecisionBundleRecord(input.stored.record);
    const stored = {
      ...input.stored,
      record,
    };
    assertStoredFieldIntegrity(stored);
    return {
      decisionBundleHash: stored.decision_bundle_hash,
      decisionBundleRef: stored.decision_bundle_ref,
      record,
      stored,
    };
  } catch (error) {
    if (error instanceof DecisionBundlePublicationError) {
      throw error;
    }
    throw new DecisionBundlePublicationError(
      error instanceof Error ? error.message : "decision bundle schema validation failed",
      ["DECISION_BUNDLE_SCHEMA_INVALID"],
    );
  }
}
