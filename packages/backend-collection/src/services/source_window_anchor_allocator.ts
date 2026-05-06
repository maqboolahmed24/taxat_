import { sourceWindowRef } from "../models/source_window.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";

export type SourceWindowAnchorAllocation = {
  allocation_reason_code: "SOURCE_WINDOW_ANCHOR_PREALLOCATED";
  manifest_id: string;
  source_window_id: string;
  source_window_ref: string;
};

export function allocateSourceWindowAnchor(input: {
  manifest_id: string;
  source_window_id?: string;
}): SourceWindowAnchorAllocation {
  const manifestId = normalizeCollectionString("source_window_anchor.manifest_id", input.manifest_id);
  const sourceWindowId = normalizeCollectionString(
    "source_window_anchor.source_window_id",
    input.source_window_id ?? `source-window.${manifestId}`,
  );
  return {
    allocation_reason_code: "SOURCE_WINDOW_ANCHOR_PREALLOCATED",
    manifest_id: manifestId,
    source_window_id: sourceWindowId,
    source_window_ref: sourceWindowRef({ source_window_id: sourceWindowId }),
  };
}
