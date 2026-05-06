import {
  EnquiryPackRepository,
  type StoredEnquiryPackRecord,
} from "../../../backend-provenance/src/index.ts";
import { validateEnquiryExternalizationGovernance } from "../services/validate_enquiry_externalization_governance.ts";

export type EnquiryPackRepositoryLike = Pick<
  EnquiryPackRepository,
  "listEnquiryPacksByManifestId"
>;

export type LoadManifestEnquiryPackInput = {
  enquiryPackRepository: EnquiryPackRepositoryLike;
  manifestId: string;
  targetRef: string;
};

function sortMostRecent(
  left: StoredEnquiryPackRecord,
  right: StoredEnquiryPackRecord,
) {
  return (
    right.generated_at.localeCompare(left.generated_at) ||
    right.enquiry_pack_id.localeCompare(left.enquiry_pack_id)
  );
}

export async function loadManifestEnquiryPack(
  input: LoadManifestEnquiryPackInput,
): Promise<StoredEnquiryPackRecord | null> {
  const packs = await input.enquiryPackRepository.listEnquiryPacksByManifestId(
    input.manifestId,
  );
  const stored = packs
    .filter((pack) => pack.target_ref === input.targetRef)
    .sort(sortMostRecent)[0];
  if (stored === undefined) {
    return null;
  }
  return {
    ...stored,
    record: validateEnquiryExternalizationGovernance(stored.record),
  };
}
