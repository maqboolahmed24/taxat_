import {
  cloneEnquiryPackRecord,
  enquiryPackRef,
  normalizeEnquiryPackRecord,
  type EnquiryPackRecord,
} from "../models/enquiry_pack.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredEnquiryPackRecord = {
  enquiry_pack_id: string;
  enquiry_pack_ref: string;
  enquiry_pack_row_version: 1;
  manifest_id: string;
  graph_ref: string;
  target_ref: string;
  proof_bundle_ref: string | null;
  primary_path_ref: string;
  explanation_status: string;
  masking_posture: string;
  generated_at: string;
  record: EnquiryPackRecord;
};

export class EnquiryPackRepositoryError extends Error {
  readonly code: "ENQUIRY_PACK_DUPLICATE" | "ENQUIRY_PACK_NOT_FOUND" | "ENQUIRY_PACK_REF_COLLISION";

  constructor(code: EnquiryPackRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EnquiryPackRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredEnquiryPackRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredEnquiryPackRecord, right: StoredEnquiryPackRecord) {
  return (
    left.target_ref.localeCompare(right.target_ref) ||
    left.generated_at.localeCompare(right.generated_at) ||
    left.enquiry_pack_id.localeCompare(right.enquiry_pack_id)
  );
}

export class EnquiryPackRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByGraphTarget = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByProofBundle = new Map<string, string[]>();
  private readonly records = new Map<string, StoredEnquiryPackRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByGraphTarget.clear();
    this.idsByManifest.clear();
    this.idsByProofBundle.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.enquiry_pack_ref, stored.enquiry_pack_id);
      pushIndex(this.idsByGraphTarget, `${stored.graph_ref}:${stored.target_ref}`, stored.enquiry_pack_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.enquiry_pack_id);
      if (stored.proof_bundle_ref) {
        pushIndex(this.idsByProofBundle, stored.proof_bundle_ref, stored.enquiry_pack_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredEnquiryPackRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }

  async persistEnquiryPack(input: { pack: EnquiryPackRecord }) {
    const pack = normalizeEnquiryPackRecord(input.pack);
    const stored: StoredEnquiryPackRecord = {
      enquiry_pack_id: pack.enquiry_pack_id,
      enquiry_pack_ref: enquiryPackRef(pack),
      enquiry_pack_row_version: 1,
      explanation_status: pack.explanation_status,
      generated_at: pack.generated_at,
      graph_ref: pack.graph_ref,
      manifest_id: pack.manifest_id,
      masking_posture: pack.masking_posture,
      primary_path_ref: pack.primary_path_ref,
      proof_bundle_ref: pack.proof_bundle_ref,
      record: cloneEnquiryPackRecord(pack),
      target_ref: pack.target_ref,
    };
    const existing = this.records.get(stored.enquiry_pack_id);
    if (existing) {
      if (!stableEqual(existing.record, pack)) {
        throw new EnquiryPackRepositoryError(
          "ENQUIRY_PACK_DUPLICATE",
          `enquiry pack ${stored.enquiry_pack_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.enquiry_pack_ref);
    if (existingRefOwner !== undefined) {
      throw new EnquiryPackRepositoryError(
        "ENQUIRY_PACK_REF_COLLISION",
        `enquiry pack ref ${stored.enquiry_pack_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.enquiry_pack_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getEnquiryPackById(enquiryPackId: string) {
    const stored = this.records.get(enquiryPackId);
    return stored ? cloneStored(stored) : null;
  }

  async requireEnquiryPackById(enquiryPackId: string) {
    const stored = await this.getEnquiryPackById(enquiryPackId);
    if (!stored) {
      throw new EnquiryPackRepositoryError("ENQUIRY_PACK_NOT_FOUND", `enquiry pack ${enquiryPackId} does not exist`);
    }
    return stored;
  }

  async listEnquiryPacksByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listEnquiryPacksByGraphTarget(graphRef: string, targetRef: string) {
    return this.listByIds(this.idsByGraphTarget.get(`${graphRef}:${targetRef}`) ?? []);
  }

  async listEnquiryPacksByProofBundleRef(proofBundleRef: string) {
    return this.listByIds(this.idsByProofBundle.get(proofBundleRef) ?? []);
  }
}
