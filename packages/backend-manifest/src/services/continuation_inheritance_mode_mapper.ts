import type { ManifestBranchAction } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { ContinuationConfigInheritanceMode } from "./config_basis_mapper.ts";

export type ContinuationInputInheritanceMode =
  | null
  | "FRESH_CHILD_COLLECTION"
  | "HISTORICAL_EXPLICIT"
  | "RECOVERY_EXACT"
  | "REPLAY_EXACT";

export type BranchActionInheritanceModes = {
  config_inheritance_mode_or_null: ContinuationConfigInheritanceMode;
  input_inheritance_mode_or_null: ContinuationInputInheritanceMode;
  selected_manifest_continuation_basis: RunManifestRecord["continuation_basis"] | null;
};

export function mapBranchActionToContinuationInheritance(
  action: ManifestBranchAction,
): BranchActionInheritanceModes {
  switch (action) {
    case "REPLAY_CHILD":
      return {
        selected_manifest_continuation_basis: "REPLAY_CHILD",
        config_inheritance_mode_or_null: "REPLAY_EXACT",
        input_inheritance_mode_or_null: "REPLAY_EXACT",
      };
    case "RECOVERY_CHILD":
      return {
        selected_manifest_continuation_basis: "RECOVERY_CHILD",
        config_inheritance_mode_or_null: "RECOVERY_EXACT",
        input_inheritance_mode_or_null: "RECOVERY_EXACT",
      };
    case "CONTINUATION_CHILD":
      return {
        selected_manifest_continuation_basis: "CONTINUATION_CHILD",
        config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION",
        input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION",
      };
    case "NEW_REQUEST_CHILD":
      return {
        selected_manifest_continuation_basis: "NEW_REQUEST_CHILD",
        config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION",
        input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION",
      };
    case "NEW_MANIFEST":
      return {
        selected_manifest_continuation_basis: "NEW_MANIFEST",
        config_inheritance_mode_or_null: null,
        input_inheritance_mode_or_null: null,
      };
    case "RETURN_EXISTING_BUNDLE":
    case "REUSE_SEALED_MANIFEST":
      return {
        selected_manifest_continuation_basis: null,
        config_inheritance_mode_or_null: null,
        input_inheritance_mode_or_null: null,
      };
  }
}
