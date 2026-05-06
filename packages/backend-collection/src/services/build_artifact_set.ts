import { deriveCollectionControlHash, normalizeCollectionString } from "../models/collection_control_common.ts";

export type ArtifactSetBuildErrorCode =
  | "ARTIFACT_SET_DUPLICATE_CONFLICT"
  | "ARTIFACT_SET_ITEM_MANIFEST_MISMATCH";

export class ArtifactSetBuildError extends Error {
  readonly code: ArtifactSetBuildErrorCode;

  constructor(code: ArtifactSetBuildErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ArtifactSetBuildError";
    this.code = code;
  }
}

export type BuildArtifactSetResult<TItem> = {
  item_identity_keys: string[];
  items: TItem[];
  manifest_id: string;
};

function itemPayloadHash(item: unknown) {
  return deriveCollectionControlHash({
    artifact_family: "ARTIFACT_SET_ITEM_PAYLOAD",
    payload: item,
  });
}

export function buildArtifactSet<TItem>(input: {
  identity_key: (item: TItem) => string;
  item_manifest_id: (item: TItem) => string;
  items: readonly TItem[];
  manifest_id: string;
  normalize_item: (item: TItem) => TItem;
  set_label: string;
  sort_key?: (item: TItem) => string;
}): BuildArtifactSetResult<TItem> {
  const manifestId = normalizeCollectionString(`${input.set_label}.manifest_id`, input.manifest_id);
  const byIdentity = new Map<string, { item: TItem; payload_hash: string }>();
  for (const itemInput of input.items) {
    const item = input.normalize_item(itemInput);
    const itemManifestId = normalizeCollectionString(
      `${input.set_label}.item_manifest_id`,
      input.item_manifest_id(item),
    );
    if (itemManifestId !== manifestId) {
      throw new ArtifactSetBuildError(
        "ARTIFACT_SET_ITEM_MANIFEST_MISMATCH",
        `${input.set_label} items must share manifest_id ${manifestId}`,
      );
    }
    const identityKey = normalizeCollectionString(
      `${input.set_label}.item_identity_key`,
      input.identity_key(item),
    );
    const payloadHash = itemPayloadHash(item);
    const existing = byIdentity.get(identityKey);
    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        throw new ArtifactSetBuildError(
          "ARTIFACT_SET_DUPLICATE_CONFLICT",
          `${input.set_label} contains duplicate identity ${identityKey} with different payload`,
        );
      }
      continue;
    }
    byIdentity.set(identityKey, { item: structuredClone(item), payload_hash: payloadHash });
  }

  const records = [...byIdentity.entries()]
    .map(([identityKey, value]) => ({
      identity_key: identityKey,
      item: value.item,
      sort_key: input.sort_key?.(value.item) ?? identityKey,
    }))
    .sort(
      (left, right) =>
        left.sort_key.localeCompare(right.sort_key) ||
        left.identity_key.localeCompare(right.identity_key),
    );
  return {
    item_identity_keys: records.map((record) => record.identity_key),
    items: records.map((record) => structuredClone(record.item)),
    manifest_id: manifestId,
  };
}

