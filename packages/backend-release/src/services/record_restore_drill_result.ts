import {
  buildRestoreDrillResult,
  type BuildRestoreDrillResultInput,
  type RestoreDrillResultRecord,
} from "../models/restore_drill_result.ts";
import type { RestoreDrillResultRepository } from "../repositories/restore_drill_result_repository.ts";

export type RecordRestoreDrillResultInput = BuildRestoreDrillResultInput & {
  repository?: RestoreDrillResultRepository;
  persisted_at?: string;
};

export async function recordRestoreDrillResult(
  input: RecordRestoreDrillResultInput,
): Promise<RestoreDrillResultRecord> {
  const result = buildRestoreDrillResult(input);
  if (!input.repository) {
    return result;
  }
  const stored = await input.repository.persistRestoreDrillResult({
    persisted_at: input.persisted_at ?? result.executed_at,
    restore_drill_result: result,
  });
  return stored.restore_drill_result;
}
