import type { ChecksumAlgorithmRef } from "../../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";
import {
  computeChunkChecksum,
  finalizeUploadChecksum,
  verifyChunkChecksum,
} from "../../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";

export type UploadChunkChecksumPlan = {
  checksum: string;
  chunkDigests: string[];
};

export class UploadChecksumVerificationError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(code: string, detail: string, reasonCodes: readonly string[]) {
    super(`${code}: ${detail}`);
    this.name = "UploadChecksumVerificationError";
    this.code = code;
    this.reasonCodes = [...reasonCodes];
  }
}

export async function verifyUploadIntegrityAndChecksum(input: {
  algorithmRef: ChecksumAlgorithmRef;
  chunkBytes: Uint8Array;
  expectedChunkDigest: string;
}) {
  const actual = await computeChunkChecksum({
    algorithmRef: input.algorithmRef,
    chunkBytes: input.chunkBytes,
  });
  try {
    verifyChunkChecksum({
      actual,
      expectedDigest: input.expectedChunkDigest,
    });
  } catch (error) {
    throw new UploadChecksumVerificationError(
      "UPLOAD_SESSION_CHUNK_CHECKSUM_INVALID",
      error instanceof Error ? error.message : "chunk digest did not match supplied checksum",
      ["UPLOAD_SESSION_CHUNK_CHECKSUM_INVALID", "UPLOAD_SESSION_RETRY_UPLOAD_REQUIRED"],
    );
  }
  return actual;
}

export async function buildUploadBlobChecksumPlan(input: {
  algorithmRef?: ChecksumAlgorithmRef;
  chunks: readonly Uint8Array[];
}): Promise<UploadChunkChecksumPlan> {
  const algorithmRef = input.algorithmRef ?? "SHA256_CHUNK_HEX_V1";
  const digests = await Promise.all(
    input.chunks.map((chunkBytes) =>
      computeChunkChecksum({
        algorithmRef,
        chunkBytes,
      }),
    ),
  );
  return {
    checksum: await finalizeUploadChecksum({
      algorithmRef,
      byteCount: input.chunks.reduce((sum, chunkBytes) => sum + chunkBytes.byteLength, 0),
      orderedChunkDigests: digests.map((entry) => entry.digest),
    }),
    chunkDigests: digests.map((entry) => entry.digest),
  };
}
