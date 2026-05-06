import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  normalizeLateDataPolicyRef,
  type CollectionLateDataPolicyRef,
  type CollectionSourceClassOrNull,
} from "./collection_control_common.ts";

export const SOURCE_DOMAIN_DECLARATION_SCHEMA_ID =
  "https://taxat.dev/schemas/source_domain_declaration.schema.json";
export const SOURCE_DOMAIN_DECLARATION_SCHEMA_SOURCE_HASH =
  "schema-source-hash.backend-collection.source-domain-declaration.v1";

export const SOURCE_DOMAIN_DECLARATION_KINDS = [
  "EXCLUDED_BY_POLICY",
  "NO_DATA_CONFIRMED_AT_CUTOFF",
  "MISSING_AT_CUTOFF",
  "STALE_AT_CUTOFF",
] as const;

export const SOURCE_DOMAIN_DECLARATION_REASON_CODES = [
  "POLICY_EXCLUDED",
  "CLIENT_DECLARED_EXCLUSION",
  "EMPTY_RESPONSE_CONFIRMED",
  "NO_DATA_BOUNDARY_DISPOSITION",
  "NO_BOUNDARY_DISPOSITION",
  "NO_DATA_CONFIRMATION_MISSING",
  "MISSING_AT_CUTOFF",
  "STALE_AT_CUTOFF",
  "SCHEMA_DRIFT",
  "REVISION_DRIFT",
  "FRESHNESS_POLICY_VIOLATION",
] as const;

export type SourceDomainDeclarationKind = (typeof SOURCE_DOMAIN_DECLARATION_KINDS)[number];
export type SourceDomainDeclarationReasonCode =
  (typeof SOURCE_DOMAIN_DECLARATION_REASON_CODES)[number];

export type SourceDomainDeclarationRecord = {
  artifact_type: "SourceDomainDeclaration";
  boundary_disposition: SourceDomainDeclarationKind;
  collection_boundary_ref: string;
  contract: SchemaBundleArtifactContract;
  declaration_hash: string;
  declaration_id: string;
  declaration_kind: SourceDomainDeclarationKind;
  evidence_refs: string[];
  late_data_policy_ref: CollectionLateDataPolicyRef;
  manifest_id: string;
  partition_scope_refs: string[];
  produced_at: string;
  reason_code: SourceDomainDeclarationReasonCode;
  runtime_scope_refs: string[];
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
  source_plan_ref: string;
};

export type SourceDomainDeclarationDraft = Omit<
  SourceDomainDeclarationRecord,
  "contract" | "declaration_hash"
>;

export type SourceDomainDeclarationBuildInput = Omit<
  SourceDomainDeclarationDraft,
  "artifact_type" | "declaration_id"
> & {
  declaration_id?: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export type SourceDomainDeclarationModelErrorCode =
  | "SOURCE_DOMAIN_DECLARATION_ARTIFACT_TYPE_INVALID"
  | "SOURCE_DOMAIN_DECLARATION_DISPOSITION_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_HASH_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_KIND_INVALID"
  | "SOURCE_DOMAIN_DECLARATION_REASON_INVALID";

export class SourceDomainDeclarationModelError extends Error {
  readonly code: SourceDomainDeclarationModelErrorCode;

  constructor(code: SourceDomainDeclarationModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceDomainDeclarationModelError";
    this.code = code;
  }
}

const REASON_CODES_BY_KIND: Record<
  SourceDomainDeclarationKind,
  readonly SourceDomainDeclarationReasonCode[]
> = {
  EXCLUDED_BY_POLICY: ["POLICY_EXCLUDED", "CLIENT_DECLARED_EXCLUSION"],
  MISSING_AT_CUTOFF: [
    "NO_BOUNDARY_DISPOSITION",
    "NO_DATA_CONFIRMATION_MISSING",
    "MISSING_AT_CUTOFF",
  ],
  NO_DATA_CONFIRMED_AT_CUTOFF: ["EMPTY_RESPONSE_CONFIRMED", "NO_DATA_BOUNDARY_DISPOSITION"],
  STALE_AT_CUTOFF: [
    "STALE_AT_CUTOFF",
    "SCHEMA_DRIFT",
    "REVISION_DRIFT",
    "FRESHNESS_POLICY_VIOLATION",
  ],
};

function normalizeDeclarationKind(value: unknown): SourceDomainDeclarationKind {
  const normalized = normalizeCollectionString(
    "source_domain_declaration.declaration_kind",
    value,
  );
  if (!SOURCE_DOMAIN_DECLARATION_KINDS.includes(normalized as SourceDomainDeclarationKind)) {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_KIND_INVALID",
      "declaration_kind must be canonical",
    );
  }
  return normalized as SourceDomainDeclarationKind;
}

function normalizeReasonCode(
  kind: SourceDomainDeclarationKind,
  value: unknown,
): SourceDomainDeclarationReasonCode {
  const normalized = normalizeCollectionString("source_domain_declaration.reason_code", value);
  if (!SOURCE_DOMAIN_DECLARATION_REASON_CODES.includes(normalized as SourceDomainDeclarationReasonCode)) {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_REASON_INVALID",
      "reason_code must be canonical",
    );
  }
  if (!REASON_CODES_BY_KIND[kind].includes(normalized as SourceDomainDeclarationReasonCode)) {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_REASON_INVALID",
      "reason_code must be valid for declaration_kind",
    );
  }
  return normalized as SourceDomainDeclarationReasonCode;
}

export function sourceDomainDeclarationRef(
  declaration: Pick<SourceDomainDeclarationRecord, "declaration_id">,
) {
  return `source-domain-declaration://${declaration.declaration_id}`;
}

export function sourceDomainDeclarationKey(
  declaration: Pick<
    SourceDomainDeclarationRecord,
    "manifest_id" | "partition_scope_refs" | "source_class" | "source_domain"
  >,
) {
  return [
    declaration.manifest_id,
    declaration.source_domain,
    declaration.source_class ?? "<null>",
    declaration.partition_scope_refs.join("\u001f"),
  ].join("\u001e");
}

export function deriveSourceDomainDeclarationId(input: {
  collection_boundary_ref: string;
  declaration_kind: SourceDomainDeclarationKind;
  manifest_id: string;
  partition_scope_refs: readonly string[];
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
  source_plan_ref: string;
}) {
  return `source-domain-declaration.${deriveCollectionControlHash({
    artifact_family: "SOURCE_DOMAIN_DECLARATION_ID",
    payload: {
      collection_boundary_ref: normalizeCollectionString(
        "source_domain_declaration.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      declaration_kind: input.declaration_kind,
      manifest_id: normalizeCollectionString("source_domain_declaration.manifest_id", input.manifest_id),
      partition_scope_refs: normalizeCollectionStringSet(
        "source_domain_declaration.partition_scope_refs",
        input.partition_scope_refs,
        { minItems: 1 },
      ),
      source_class: input.source_class,
      source_domain: normalizeCollectionString(
        "source_domain_declaration.source_domain",
        input.source_domain,
      ),
      source_plan_ref: normalizeCollectionString(
        "source_domain_declaration.source_plan_ref",
        input.source_plan_ref,
      ),
    },
  })}`;
}

export function normalizeSourceDomainDeclarationDraft(
  input: SourceDomainDeclarationDraft,
): SourceDomainDeclarationDraft {
  if (input.artifact_type !== "SourceDomainDeclaration") {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_ARTIFACT_TYPE_INVALID",
      "source-domain declarations must carry artifact_type SourceDomainDeclaration",
    );
  }
  const declarationKind = normalizeDeclarationKind(input.declaration_kind);
  const boundaryDisposition = normalizeDeclarationKind(input.boundary_disposition);
  if (boundaryDisposition !== declarationKind) {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_DISPOSITION_MISMATCH",
      "boundary_disposition must match declaration_kind",
    );
  }

  return {
    artifact_type: "SourceDomainDeclaration",
    boundary_disposition: boundaryDisposition,
    collection_boundary_ref: normalizeCollectionString(
      "source_domain_declaration.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    declaration_id: normalizeCollectionString(
      "source_domain_declaration.declaration_id",
      input.declaration_id,
    ),
    declaration_kind: declarationKind,
    evidence_refs: normalizeCollectionStringSet(
      "source_domain_declaration.evidence_refs",
      input.evidence_refs,
      { minItems: 1 },
    ),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "source_domain_declaration.late_data_policy_ref",
      input.late_data_policy_ref,
    ),
    manifest_id: normalizeCollectionString(
      "source_domain_declaration.manifest_id",
      input.manifest_id,
    ),
    partition_scope_refs: normalizeCollectionStringSet(
      "source_domain_declaration.partition_scope_refs",
      input.partition_scope_refs,
      { minItems: 1 },
    ),
    produced_at: normalizeUtcInstantString(input.produced_at),
    reason_code: normalizeReasonCode(declarationKind, input.reason_code),
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "source_domain_declaration.runtime_scope_refs",
      input.runtime_scope_refs,
    ),
    source_class: normalizeCollectionSourceClassOrNull(
      "source_domain_declaration.source_class",
      input.source_class,
    ),
    source_domain: normalizeCollectionString(
      "source_domain_declaration.source_domain",
      input.source_domain,
    ),
    source_plan_ref: normalizeCollectionString(
      "source_domain_declaration.source_plan_ref",
      input.source_plan_ref,
    ),
  };
}

export function deriveSourceDomainDeclarationHash(input: SourceDomainDeclarationDraft) {
  return `source-domain-declaration-hash://${deriveCollectionControlHash({
    artifact_family: "SOURCE_DOMAIN_DECLARATION",
    payload: normalizeSourceDomainDeclarationDraft(input),
  })}`;
}

export function buildSourceDomainDeclarationContract(input: {
  declaration_hash: string;
  declaration_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.declaration_hash,
    artifact_id: sourceDomainDeclarationRef({ declaration_id: input.declaration_id }),
    artifact_type: "SourceDomainDeclaration",
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: SOURCE_DOMAIN_DECLARATION_SCHEMA_ID,
    schema_source_hash: SOURCE_DOMAIN_DECLARATION_SCHEMA_SOURCE_HASH,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0113",
  });
}

export function buildSourceDomainDeclarationRecord(
  input: SourceDomainDeclarationBuildInput,
): SourceDomainDeclarationRecord {
  const declarationKind = normalizeDeclarationKind(input.declaration_kind);
  const declarationId =
    input.declaration_id ??
    deriveSourceDomainDeclarationId({
      collection_boundary_ref: input.collection_boundary_ref,
      declaration_kind: declarationKind,
      manifest_id: input.manifest_id,
      partition_scope_refs: input.partition_scope_refs,
      source_class: input.source_class,
      source_domain: input.source_domain,
      source_plan_ref: input.source_plan_ref,
    });
  const draft = normalizeSourceDomainDeclarationDraft({
    ...input,
    artifact_type: "SourceDomainDeclaration",
    boundary_disposition: declarationKind,
    declaration_id: declarationId,
    declaration_kind: declarationKind,
  });
  const declarationHash = deriveSourceDomainDeclarationHash(draft);
  return normalizeSourceDomainDeclarationRecord({
    ...draft,
    contract: buildSourceDomainDeclarationContract({
      declaration_hash: declarationHash,
      declaration_id: declarationId,
      ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
    declaration_hash: declarationHash,
  });
}

export function normalizeSourceDomainDeclarationRecord(
  input: SourceDomainDeclarationRecord,
): SourceDomainDeclarationRecord {
  const draft = normalizeSourceDomainDeclarationDraft(input);
  const expectedHash = deriveSourceDomainDeclarationHash(draft);
  if (input.declaration_hash !== expectedHash) {
    throw new SourceDomainDeclarationModelError(
      "SOURCE_DOMAIN_DECLARATION_HASH_MISMATCH",
      "declaration_hash must match the canonical declaration payload",
    );
  }
  return {
    ...draft,
    contract: structuredClone(input.contract),
    declaration_hash: expectedHash,
  };
}

export function cloneSourceDomainDeclarationRecord(record: SourceDomainDeclarationRecord) {
  return structuredClone(record);
}
