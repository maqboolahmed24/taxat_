export type LowNoiseScanLoadInput = {
  concurrentPrimaryCount: number;
  persistentSurfaceCount: number;
  prominentMotionCount: number;
  visibleActionCount: number;
  visibleDetailEntryCount: number;
  visibleReasonCount: number;
  visibleShellCharCount: number;
  visibleWarningCount: number;
};

export function computeLowNoiseScanLoadQuarterUnits(input: LowNoiseScanLoadInput) {
  return (
    4 * input.persistentSurfaceCount +
    5 * input.concurrentPrimaryCount +
    3 * input.visibleReasonCount +
    4 * input.visibleWarningCount +
    3 * input.visibleActionCount +
    2 * input.visibleDetailEntryCount +
    Math.ceil(Math.max(0, input.visibleShellCharCount) / 80) +
    6 * input.prominentMotionCount
  );
}

export function computeScanLoad(input: LowNoiseScanLoadInput) {
  return computeLowNoiseScanLoadQuarterUnits(input) / 4;
}
