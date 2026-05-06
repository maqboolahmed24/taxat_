import {
  buildTwinMismatchSummaryRecord,
  type TwinMismatchSummaryRecord,
} from "../models/twin_mismatch_summary.ts";
import type { TwinDeltaArcRecord } from "../models/twin_delta_arc.ts";
import { TwinMismatchSummaryRepository } from "../repositories/twin_mismatch_summary_repository.ts";

export type SummarizeTwinMismatchesInput = {
  deltas: readonly TwinDeltaArcRecord[];
  generated_at: string;
  repository?: TwinMismatchSummaryRepository;
  top_limit?: number;
  twin_id: string;
};

export type SummarizeTwinMismatchesResult = {
  repository: TwinMismatchSummaryRepository;
  stored: Awaited<ReturnType<TwinMismatchSummaryRepository["persistTwinMismatchSummary"]>>;
  summary: TwinMismatchSummaryRecord;
};

export async function summarizeTwinMismatches(
  input: SummarizeTwinMismatchesInput,
): Promise<SummarizeTwinMismatchesResult> {
  const repository = input.repository ?? new TwinMismatchSummaryRepository();
  const summary = buildTwinMismatchSummaryRecord(input);
  const stored = await repository.persistTwinMismatchSummary({ summary });
  return {
    repository,
    stored,
    summary,
  };
}
