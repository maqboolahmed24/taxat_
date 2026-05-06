import { AuthorityModelError } from "../models/authority_common.ts";
import {
  buildObligationMirrorRecord,
  type ObligationMirrorBuildInput,
  type ObligationMirrorRecord,
} from "../models/obligation_mirror.ts";
import { ObligationMirrorRepository } from "../repositories/obligation_mirror_repository.ts";

export type UpsertObligationMirrorInput = ObligationMirrorBuildInput & {
  existing?: ObligationMirrorRecord | null;
  preserve_confirmed_settlement?: boolean;
  repository?: ObligationMirrorRepository;
};

export async function upsertObligationMirror(input: UpsertObligationMirrorInput) {
  const repository = input.repository ?? new ObligationMirrorRepository();
  const existing =
    input.existing ??
    (input.obligation_mirror_id
      ? (await repository.getObligationMirrorById(input.obligation_mirror_id))?.record ?? null
      : null);
  if (
    existing?.last_confirmed_submission_ref &&
    input.preserve_confirmed_settlement !== false &&
    input.lifecycle_state !== "MET_CONFIRMED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "upserting an obligation mirror must not discard prior confirmed legal settlement",
    );
  }
  const mirror = buildObligationMirrorRecord({
    ...existing,
    ...input,
    authority_refs: input.authority_refs ?? existing?.authority_refs ?? [],
    blocked_reason_codes: input.blocked_reason_codes ?? existing?.blocked_reason_codes ?? [],
  });
  const stored = await repository.persistObligationMirror({ mirror });
  return { mirror, repository, stored };
}
