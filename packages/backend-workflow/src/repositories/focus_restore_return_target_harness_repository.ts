import {
  focusRestoreReturnTargetHarnessContentFingerprint,
  validateFocusRestoreReturnTargetHarness,
  type CanonicalFocusRestoreReturnTargetHarness,
} from "../contracts/build_focus_restore_return_target_harness.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredFocusRestoreReturnTargetHarness = {
  case_count: number;
  content_fingerprint: string;
  deterministic_seed: number;
  harness_id: string;
  record: CanonicalFocusRestoreReturnTargetHarness;
};

function cloneStored(stored: StoredFocusRestoreReturnTargetHarness) {
  return cloneWorkflowRecord(stored);
}

function sortStored(
  left: StoredFocusRestoreReturnTargetHarness,
  right: StoredFocusRestoreReturnTargetHarness,
) {
  return (
    left.harness_id.localeCompare(right.harness_id) ||
    left.deterministic_seed - right.deterministic_seed
  );
}

export class FocusRestoreReturnTargetHarnessRepository {
  private readonly records = new Map<string, StoredFocusRestoreReturnTargetHarness>();

  async persistFocusRestoreReturnTargetHarness(input: {
    harness: CanonicalFocusRestoreReturnTargetHarness;
  }) {
    const harness = validateFocusRestoreReturnTargetHarness(input.harness);
    const existing = this.records.get(harness.harness_id);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, harness)) {
        throw new WorkflowModelError(
          "WORKFLOW_ITEM_IMMUTABLE",
          "focus restore return-target harnesses are immutable by harness_id",
        );
      }
      return cloneStored(existing);
    }
    const stored: StoredFocusRestoreReturnTargetHarness = {
      case_count: harness.cases.length,
      content_fingerprint: focusRestoreReturnTargetHarnessContentFingerprint(harness),
      deterministic_seed: harness.deterministic_seed,
      harness_id: harness.harness_id,
      record: cloneWorkflowRecord(harness),
    };
    this.records.set(stored.harness_id, cloneStored(stored));
    return cloneStored(stored);
  }

  async getFocusRestoreReturnTargetHarnessById(harnessId: string) {
    const stored = this.records.get(harnessId);
    return stored ? cloneStored(stored) : null;
  }

  async listFocusRestoreReturnTargetHarnesses() {
    return [...this.records.values()].sort(sortStored).map(cloneStored);
  }
}
