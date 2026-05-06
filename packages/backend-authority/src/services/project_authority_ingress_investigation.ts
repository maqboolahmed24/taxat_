import {
  type AuthorityIngressInvestigationSnapshot,
  buildAuthorityIngressInvestigationSnapshotFromReceipt,
} from "../models/authority_ingress_investigation_snapshot.ts";
import type { AuthorityIngressReceipt } from "../models/authority_ingress_receipt.ts";
import { AuthorityIngressInvestigationRepository } from "../repositories/authority_ingress_investigation_repository.ts";

export async function projectAuthorityIngressInvestigation(input: {
  receipt: AuthorityIngressReceipt;
  related_duplicate_receipt_refs?: readonly string[];
  repository?: AuthorityIngressInvestigationRepository;
  updated_at?: string;
}): Promise<ProjectAuthorityIngressInvestigationResult> {
  const repository = input.repository ?? new AuthorityIngressInvestigationRepository();
  const snapshot = buildAuthorityIngressInvestigationSnapshotFromReceipt({
    receipt: input.receipt,
    related_duplicate_receipt_refs: input.related_duplicate_receipt_refs,
    updated_at: input.updated_at,
  });
  const stored = await repository.upsertAuthorityIngressInvestigationSnapshot({ snapshot });
  return { repository, snapshot, stored };
}

export type ProjectAuthorityIngressInvestigationResult = {
  repository: AuthorityIngressInvestigationRepository;
  snapshot: AuthorityIngressInvestigationSnapshot;
  stored: Awaited<ReturnType<AuthorityIngressInvestigationRepository["upsertAuthorityIngressInvestigationSnapshot"]>>;
};
