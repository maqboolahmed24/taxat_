import {
  cloneSourceDomainDeclarationRecord,
  normalizeSourceDomainDeclarationRecord,
  sourceDomainDeclarationKey,
  sourceDomainDeclarationRef,
  type SourceDomainDeclarationKind,
  type SourceDomainDeclarationRecord,
} from "../models/source_domain_declaration.ts";

export type StoredSourceDomainDeclarationRecord = {
  collection_boundary_ref: string;
  declaration: SourceDomainDeclarationRecord;
  declaration_hash: string;
  declaration_id: string;
  declaration_kind: SourceDomainDeclarationKind;
  declaration_ref: string;
  declaration_row_version: number;
  manifest_id: string;
  partition_scope_refs: string[];
  persisted_at: string;
  source_domain: string;
  source_plan_ref: string;
};

export type SourceDomainDeclarationRepositoryErrorCode =
  | "SOURCE_DOMAIN_DECLARATION_DUPLICATE"
  | "SOURCE_DOMAIN_DECLARATION_KEY_COLLISION"
  | "SOURCE_DOMAIN_DECLARATION_NOT_FOUND";

export class SourceDomainDeclarationRepositoryError extends Error {
  readonly code: SourceDomainDeclarationRepositoryErrorCode;

  constructor(code: SourceDomainDeclarationRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceDomainDeclarationRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSourceDomainDeclarationRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class SourceDomainDeclarationRepository {
  private readonly declarations = new Map<string, StoredSourceDomainDeclarationRecord>();
  private readonly idByDeclarationKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBoundary = new Map<string, string[]>();
  private readonly idsByKind = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsBySourceDomain = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.declarations.get(id))
      .filter((record): record is StoredSourceDomainDeclarationRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistSourceDomainDeclaration(input: {
    declaration: SourceDomainDeclarationRecord;
    persisted_at: string;
  }) {
    const declaration = normalizeSourceDomainDeclarationRecord(input.declaration);
    const existing = this.declarations.get(declaration.declaration_id);
    if (existing) {
      if (JSON.stringify(existing.declaration) !== JSON.stringify(declaration)) {
        throw new SourceDomainDeclarationRepositoryError(
          "SOURCE_DOMAIN_DECLARATION_DUPLICATE",
          `source-domain declaration ${declaration.declaration_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const declarationKey = sourceDomainDeclarationKey(declaration);
    const keyCollision = this.idByDeclarationKey.get(declarationKey);
    if (keyCollision !== undefined) {
      throw new SourceDomainDeclarationRepositoryError(
        "SOURCE_DOMAIN_DECLARATION_KEY_COLLISION",
        `source-domain declaration key already belongs to ${keyCollision}`,
      );
    }

    const ref = sourceDomainDeclarationRef(declaration);
    const stored: StoredSourceDomainDeclarationRecord = {
      collection_boundary_ref: declaration.collection_boundary_ref,
      declaration: cloneSourceDomainDeclarationRecord(declaration),
      declaration_hash: declaration.declaration_hash,
      declaration_id: declaration.declaration_id,
      declaration_kind: declaration.declaration_kind,
      declaration_ref: ref,
      declaration_row_version: 1,
      manifest_id: declaration.manifest_id,
      partition_scope_refs: [...declaration.partition_scope_refs],
      persisted_at: input.persisted_at,
      source_domain: declaration.source_domain,
      source_plan_ref: declaration.source_plan_ref,
    };
    this.declarations.set(stored.declaration_id, cloneStored(stored));
    this.idByDeclarationKey.set(declarationKey, stored.declaration_id);
    this.idByRef.set(stored.declaration_ref, stored.declaration_id);
    pushIndex(this.idsByBoundary, stored.collection_boundary_ref, stored.declaration_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.declaration_id);
    pushIndex(
      this.idsByKind,
      `${stored.manifest_id}::${stored.declaration_kind}`,
      stored.declaration_id,
    );
    pushIndex(
      this.idsBySourceDomain,
      `${stored.manifest_id}::${stored.source_domain}`,
      stored.declaration_id,
    );
    return cloneStored(stored);
  }

  async getSourceDomainDeclarationById(declarationId: string) {
    const stored = this.declarations.get(declarationId);
    return stored ? cloneStored(stored) : null;
  }

  async getSourceDomainDeclarationByRef(declarationRef: string) {
    const id = this.idByRef.get(declarationRef);
    return id ? this.getSourceDomainDeclarationById(id) : null;
  }

  async requireSourceDomainDeclarationById(declarationId: string) {
    const stored = await this.getSourceDomainDeclarationById(declarationId);
    if (!stored) {
      throw new SourceDomainDeclarationRepositoryError(
        "SOURCE_DOMAIN_DECLARATION_NOT_FOUND",
        `source-domain declaration ${declarationId} does not exist`,
      );
    }
    return stored;
  }

  async listSourceDomainDeclarationsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listSourceDomainDeclarationsByCollectionBoundaryRef(collectionBoundaryRef: string) {
    return this.listByIds(this.idsByBoundary.get(collectionBoundaryRef) ?? []);
  }

  async listSourceDomainDeclarationsByKind(
    manifestId: string,
    declarationKind: SourceDomainDeclarationKind,
  ) {
    return this.listByIds(this.idsByKind.get(`${manifestId}::${declarationKind}`) ?? []);
  }

  async listSourceDomainDeclarationsBySourceDomain(manifestId: string, sourceDomain: string) {
    return this.listByIds(this.idsBySourceDomain.get(`${manifestId}::${sourceDomain}`) ?? []);
  }
}
