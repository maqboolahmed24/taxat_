import {
  type AuthorityIngressReceipt,
  authorityIngressReceiptRef,
} from "../models/authority_ingress_receipt.ts";
import { AuthorityIngressReceiptRepository } from "../repositories/authority_ingress_receipt_repository.ts";
import { deriveAuthorityIngressDeliveryDedupeKey } from "./build_authority_ingress_proof_contract.ts";

export type AuthorityIngressDedupeResult =
  | {
      canonical_ingress_receipt_ref: null;
      canonical_receipt: null;
      delivery_dedupe_key: string;
      duplicate_suppressed: false;
    }
  | {
      canonical_ingress_receipt_ref: string;
      canonical_receipt: AuthorityIngressReceipt;
      delivery_dedupe_key: string;
      duplicate_suppressed: true;
    };

export async function dedupeAuthorityIngressReceipt(input: {
  ingress_channel_metadata_hash: string;
  provider_delivery_ref: string;
  repository: AuthorityIngressReceiptRepository;
  response_body_hash: string;
}): Promise<AuthorityIngressDedupeResult> {
  const deliveryDedupeKey = deriveAuthorityIngressDeliveryDedupeKey({
    ingress_channel_metadata_hash: input.ingress_channel_metadata_hash,
    provider_delivery_ref: input.provider_delivery_ref,
    response_body_hash: input.response_body_hash,
  });
  const canonical = await input.repository.getCanonicalAuthorityIngressReceiptByDeliveryDedupeKey(deliveryDedupeKey);
  if (canonical === null) {
    return {
      canonical_ingress_receipt_ref: null,
      canonical_receipt: null,
      delivery_dedupe_key: deliveryDedupeKey,
      duplicate_suppressed: false,
    };
  }
  return {
    canonical_ingress_receipt_ref: authorityIngressReceiptRef(canonical.record),
    canonical_receipt: canonical.record,
    delivery_dedupe_key: deliveryDedupeKey,
    duplicate_suppressed: true,
  };
}

