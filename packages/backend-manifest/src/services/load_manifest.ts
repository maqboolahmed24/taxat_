import type { RunManifestRecord } from "../models/run_manifest.ts";
import type {
  RunManifestRepository,
  StoredRunManifestRecord,
} from "../repositories/run_manifest_repository.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";

export class LoadManifestService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  private validateStored(record: StoredRunManifestRecord) {
    const manifest = validateRunManifestMirrorConsistency(record.manifest);
    return {
      ...structuredClone(record),
      manifest,
    };
  }

  async loadById(tenantId: string, manifestId: string) {
    const record = await this.dependencies.runManifestRepository.getManifestById(
      tenantId,
      manifestId,
    );
    return record ? this.validateStored(record) : null;
  }

  async requireById(tenantId: string, manifestId: string) {
    const record = await this.loadById(tenantId, manifestId);
    if (!record) {
      throw new Error(`RUN_MANIFEST_NOT_FOUND: ${tenantId}/${manifestId}`);
    }
    return record;
  }

  async loadLatestByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    const record =
      await this.dependencies.runManifestRepository.getLatestManifestByAccessBindingHash(
        tenantId,
        accessBindingHash,
      );
    return record ? this.validateStored(record) : null;
  }

  async loadByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    const record =
      await this.dependencies.runManifestRepository.getManifestByIdempotencyKey(
        tenantId,
        idempotencyKey,
      );
    return record ? this.validateStored(record) : null;
  }

  async projectCurrentManifest(record: StoredRunManifestRecord): Promise<RunManifestRecord> {
    return validateRunManifestMirrorConsistency(record.manifest);
  }
}
