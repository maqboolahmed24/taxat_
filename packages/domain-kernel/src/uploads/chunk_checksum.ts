import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stableJsonHash } from "../primitives/hash.ts";

export type ChecksumAggregationMode = "ORDERED_CHUNK_DIGEST_MANIFEST" | "RAW_BYTES_STREAM";
export type ChecksumAlgorithmRef =
  | "CRC32C_CHUNK_BASE64_V1"
  | "SHA256_CHUNK_HEX_V1"
  | "SHA512_CHUNK_HEX_V1";

export type ChecksumAlgorithmCatalogRow = {
  aggregation_mode: ChecksumAggregationMode;
  algorithm_ref: ChecksumAlgorithmRef;
  digest_encoding: "BASE64" | "HEX";
  display_name: string;
  expected_digest_length: number;
  node_digest_name_or_null: string | null;
  recommended_for_uploads: boolean;
  transport_scope: "CHUNK";
  vendor_lock_in_posture: "NONE";
  notes: string[];
};

export type ChecksumAlgorithmCatalog = {
  algorithms: ChecksumAlgorithmCatalogRow[];
  basis_statement: string;
  catalog_id: string;
  contract_version: "UPLOAD_CHECKSUM_ALGORITHM_CATALOG_V1";
  recommended_algorithm_ref: ChecksumAlgorithmRef;
};

export type UploadChunkDigest = {
  algorithmRef: ChecksumAlgorithmRef;
  byteLength: number;
  digest: string;
};

export type UploadChecksumCatalogBundle = {
  catalog: ChecksumAlgorithmCatalog;
  recommended: ChecksumAlgorithmCatalogRow;
  rowsByRef: Map<ChecksumAlgorithmRef, ChecksumAlgorithmCatalogRow>;
};

type ChunkChecksumErrorCode =
  | "CHECKSUM_ALGORITHM_UNKNOWN"
  | "CHECKSUM_DIGEST_MISMATCH"
  | "CHECKSUM_LENGTH_INVALID"
  | "CHECKSUM_RUNTIME_UNSUPPORTED";

type ChunkChecksumErrorInit = {
  code: ChunkChecksumErrorCode;
  detail: string;
};

export class ChunkChecksumError extends Error {
  readonly code: ChunkChecksumErrorCode;

  constructor(init: ChunkChecksumErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "ChunkChecksumError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const checksumCatalogPath = path.join(
  repoRoot,
  "config",
  "uploads",
  "checksum_algorithm_catalog.json",
);

let cachedBundle: Promise<UploadChecksumCatalogBundle> | null = null;

function assertCondition(condition: unknown, init: ChunkChecksumErrorInit): asserts condition {
  if (!condition) {
    throw new ChunkChecksumError(init);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validateCatalog(catalog: ChecksumAlgorithmCatalog) {
  assertCondition(
    catalog.contract_version === "UPLOAD_CHECKSUM_ALGORITHM_CATALOG_V1",
    {
      code: "CHECKSUM_ALGORITHM_UNKNOWN",
      detail: "checksum catalog contract version drifted",
    },
  );
  assertCondition(catalog.algorithms.length >= 2, {
    code: "CHECKSUM_ALGORITHM_UNKNOWN",
    detail: "checksum catalog must declare at least two algorithms",
  });

  const seen = new Set<ChecksumAlgorithmRef>();
  for (const row of catalog.algorithms) {
    assertCondition(!seen.has(row.algorithm_ref), {
      code: "CHECKSUM_ALGORITHM_UNKNOWN",
      detail: `duplicate checksum algorithm ${row.algorithm_ref}`,
    });
    seen.add(row.algorithm_ref);
    assertCondition(row.transport_scope === "CHUNK", {
      code: "CHECKSUM_ALGORITHM_UNKNOWN",
      detail: `${row.algorithm_ref} must remain a chunk-scoped algorithm`,
    });
    assertCondition(row.vendor_lock_in_posture === "NONE", {
      code: "CHECKSUM_ALGORITHM_UNKNOWN",
      detail: `${row.algorithm_ref} must not introduce provider lock-in`,
    });
    if (row.node_digest_name_or_null !== null) {
      assertCondition(
        row.expected_digest_length > 0,
        {
          code: "CHECKSUM_LENGTH_INVALID",
          detail: `${row.algorithm_ref} must publish a digest length`,
        },
      );
    }
  }

  assertCondition(seen.has(catalog.recommended_algorithm_ref), {
    code: "CHECKSUM_ALGORITHM_UNKNOWN",
    detail: "recommended checksum algorithm missing from catalog",
  });
}

function rowForRef(bundle: UploadChecksumCatalogBundle, algorithmRef: ChecksumAlgorithmRef) {
  const row = bundle.rowsByRef.get(algorithmRef);
  if (!row) {
    throw new ChunkChecksumError({
      code: "CHECKSUM_ALGORITHM_UNKNOWN",
      detail: `unknown checksum algorithm ${algorithmRef}`,
    });
  }
  return row;
}

export async function loadUploadChecksumCatalogBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const catalog = await readJson<ChecksumAlgorithmCatalog>(checksumCatalogPath);
      validateCatalog(catalog);
      const rowsByRef = new Map(
        catalog.algorithms.map((row) => [row.algorithm_ref, row] as const),
      );
      return {
        catalog,
        recommended: rowsByRef.get(catalog.recommended_algorithm_ref)!,
        rowsByRef,
      } satisfies UploadChecksumCatalogBundle;
    })();
  }

  return cachedBundle;
}

export async function computeChunkChecksum(input: {
  algorithmRef: ChecksumAlgorithmRef;
  chunkBytes: Uint8Array;
}) {
  const bundle = await loadUploadChecksumCatalogBundle();
  const row = rowForRef(bundle, input.algorithmRef);
  assertCondition(row.node_digest_name_or_null !== null, {
    code: "CHECKSUM_RUNTIME_UNSUPPORTED",
    detail: `${input.algorithmRef} cannot be computed by the current runtime`,
  });

  const digest =
    row.digest_encoding === "HEX"
      ? createHash(row.node_digest_name_or_null).update(input.chunkBytes).digest("hex")
      : createHash(row.node_digest_name_or_null).update(input.chunkBytes).digest("base64");

  assertCondition(digest.length === row.expected_digest_length, {
    code: "CHECKSUM_LENGTH_INVALID",
    detail: `${input.algorithmRef} produced ${digest.length} bytes instead of ${row.expected_digest_length}`,
  });

  return {
    algorithmRef: input.algorithmRef,
    byteLength: input.chunkBytes.byteLength,
    digest,
  } satisfies UploadChunkDigest;
}

export function verifyChunkChecksum(input: {
  actual: UploadChunkDigest;
  expectedDigest: string;
}) {
  if (input.actual.digest !== input.expectedDigest) {
    throw new ChunkChecksumError({
      code: "CHECKSUM_DIGEST_MISMATCH",
      detail: `chunk digest mismatch for ${input.actual.algorithmRef}`,
    });
  }
  return true;
}

export async function finalizeUploadChecksum(input: {
  algorithmRef: ChecksumAlgorithmRef;
  byteCount: number;
  orderedChunkDigests: readonly string[];
}) {
  const bundle = await loadUploadChecksumCatalogBundle();
  const row = rowForRef(bundle, input.algorithmRef);
  assertCondition(
    row.aggregation_mode === "ORDERED_CHUNK_DIGEST_MANIFEST",
    {
      code: "CHECKSUM_RUNTIME_UNSUPPORTED",
      detail: `${input.algorithmRef} requires a streaming runtime that is not implemented here`,
    },
  );
  return stableJsonHash({
    aggregation_mode: row.aggregation_mode,
    algorithm_ref: row.algorithm_ref,
    byte_count: input.byteCount,
    ordered_chunk_digests: [...input.orderedChunkDigests],
  });
}
