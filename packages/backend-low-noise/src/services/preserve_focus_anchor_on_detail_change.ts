import type { DetailDrawerStateDetailEntry } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseDetailModuleCode } from "../models/low_noise_frame.ts";

export function detailFocusAnchorFor(input: {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode;
  manifestId: string;
}) {
  return `focus://${input.manifestId}/${input.activeDetailSurfaceCode.toLowerCase()}`;
}

export function preserveFocusAnchorOnDetailChange(input: {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  expandedEntry: DetailDrawerStateDetailEntry | null;
  focusAnchorObjectRef?: string | undefined;
  manifestId: string;
  previousFocusAnchorRef?: string | null | undefined;
}) {
  if (input.activeDetailSurfaceCode === null) {
    return null;
  }
  const anchorObjectRef = input.focusAnchorObjectRef ?? input.manifestId;
  if (
    input.previousFocusAnchorRef &&
    input.expandedEntry?.anchorable_object_refs.includes(anchorObjectRef)
  ) {
    return input.previousFocusAnchorRef;
  }
  return detailFocusAnchorFor({
    activeDetailSurfaceCode: input.activeDetailSurfaceCode,
    manifestId: input.manifestId,
  });
}
