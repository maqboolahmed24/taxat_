import {
  assertOperatorMorningDigest,
  type OperatorMorningDigestRecord,
} from "../../../backend-recovery/src/index.ts";
import {
  OperatorMorningDigestRepository,
  operatorMorningDigestRef,
  type StoredOperatorMorningDigestRecord,
} from "./operator_morning_digest_repository.ts";

export type OperatorMorningDigestPublicationState =
  | "CURRENT_AUTHORITATIVE"
  | "SUPERSEDED";

export type OperatorMorningDigestPublicationPosture = {
  current_digest_id: string;
  lineage_digest_ids_in_order: string[];
  publication_state: OperatorMorningDigestPublicationState;
  superseded_by_digest_id_or_null: string | null;
  supersedes_digest_id_or_null: string | null;
  supersession_root_digest_id: string;
};

export type OperatorMorningDigestQueryResult = {
  cache_key: string;
  digest: OperatorMorningDigestRecord;
  digest_ref: string;
  publication_posture: OperatorMorningDigestPublicationPosture;
};

export type GetOperatorMorningDigestInput = {
  coverage_date: string;
  digest_id?: string | undefined;
  repository: OperatorMorningDigestRepository;
  tenant_id: string;
};

export class OperatorMorningDigestQueryError extends Error {
  readonly code:
    | "OPERATOR_MORNING_DIGEST_NOT_FOUND"
    | "OPERATOR_MORNING_DIGEST_PUBLICATION_INVALID";

  constructor(code: OperatorMorningDigestQueryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "OperatorMorningDigestQueryError";
    this.code = code;
  }
}

function assertDateOrder(input: {
  earlier_label: string;
  earlier_value: string;
  later_label: string;
  later_value: string;
}) {
  if (Date.parse(input.later_value) < Date.parse(input.earlier_value)) {
    throw new OperatorMorningDigestQueryError(
      "OPERATOR_MORNING_DIGEST_PUBLICATION_INVALID",
      `${input.later_label} must not predate ${input.earlier_label}`,
    );
  }
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertSameSet(label: string, left: readonly string[], right: readonly string[]) {
  if (JSON.stringify(sortedUnique(left)) !== JSON.stringify(sortedUnique(right))) {
    throw new OperatorMorningDigestQueryError(
      "OPERATOR_MORNING_DIGEST_PUBLICATION_INVALID",
      `${label} must preserve the exact persisted digest partition`,
    );
  }
}

function assertDigestReadIntegrity(digest: OperatorMorningDigestRecord) {
  const normalized = assertOperatorMorningDigest(digest);
  const derivation = normalized.derivation_contract;
  assertDateOrder({
    earlier_label: "workflow_publication_settled_at",
    earlier_value: derivation.workflow_publication_settled_at,
    later_label: "publication_qa_completed_at",
    later_value: derivation.publication_qa_completed_at,
  });
  assertDateOrder({
    earlier_label: "notification_publication_settled_at",
    earlier_value: derivation.notification_publication_settled_at,
    later_label: "publication_qa_completed_at",
    later_value: derivation.publication_qa_completed_at,
  });
  assertDateOrder({
    earlier_label: "publication_qa_completed_at",
    earlier_value: derivation.publication_qa_completed_at,
    later_label: "generated_at",
    later_value: normalized.generated_at,
  });
  assertDateOrder({
    earlier_label: "generated_at",
    earlier_value: normalized.generated_at,
    later_label: "published_at",
    later_value: normalized.published_at,
  });
  const queueItemRefs = normalized.queue_summaries.flatMap((queue) => queue.item_refs);
  assertSameSet(
    "queue_summaries[].item_refs[] and published_workflow_item_refs[]",
    queueItemRefs,
    normalized.published_workflow_item_refs,
  );
  const publishedWorkItems = new Set(normalized.published_workflow_item_refs);
  for (const outcome of normalized.highlighted_client_outcomes) {
    if (outcome.work_item_ref !== null && !publishedWorkItems.has(outcome.work_item_ref)) {
      throw new OperatorMorningDigestQueryError(
        "OPERATOR_MORNING_DIGEST_PUBLICATION_INVALID",
        "highlighted_client_outcomes[].work_item_ref must come from published_workflow_item_refs[]",
      );
    }
  }
  if (
    derivation.supersession_state === "RECOVERY_SUPERSESSION" &&
    (normalized.supersedes_digest_id === null ||
      derivation.supersession_root_digest_id === normalized.digest_id)
  ) {
    throw new OperatorMorningDigestQueryError(
      "OPERATOR_MORNING_DIGEST_PUBLICATION_INVALID",
      "recovery supersession digests must preserve the earlier digest lineage",
    );
  }
  return normalized;
}

function lineageFor(
  stored: StoredOperatorMorningDigestRecord,
  supersededByDigestId: string | null,
) {
  const digest = stored.digest;
  const ordered = [
    digest.derivation_contract.supersession_root_digest_id,
    digest.supersedes_digest_id ?? "",
    digest.digest_id,
    supersededByDigestId ?? "",
  ].filter((value) => value.length > 0);
  const seen = new Set<string>();
  return ordered.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function cacheKey(input: {
  coverage_date: string;
  digest_id: string;
  tenant_id: string;
}) {
  return [
    "operator_morning_digest",
    input.tenant_id,
    input.coverage_date,
    input.digest_id,
  ].join(":");
}

async function storedForInput(input: GetOperatorMorningDigestInput) {
  if (input.digest_id !== undefined) {
    const stored = await input.repository.getOperatorMorningDigestById(input.digest_id);
    if (
      stored !== null &&
      stored.tenant_id === input.tenant_id &&
      stored.coverage_date === input.coverage_date
    ) {
      return stored;
    }
    return null;
  }
  return input.repository.getCurrentOperatorMorningDigest({
    coverage_date: input.coverage_date,
    tenant_id: input.tenant_id,
  });
}

export async function getOperatorMorningDigest(
  input: GetOperatorMorningDigestInput,
): Promise<OperatorMorningDigestQueryResult> {
  const stored = await storedForInput(input);
  if (stored === null) {
    throw new OperatorMorningDigestQueryError(
      "OPERATOR_MORNING_DIGEST_NOT_FOUND",
      `no operator morning digest found for ${input.tenant_id}/${input.coverage_date}`,
    );
  }
  const digest = assertDigestReadIntegrity(stored.digest);
  const supersededByDigestId = input.repository.supersededByDigestId(digest.digest_id);
  const current =
    supersededByDigestId === null
      ? digest.digest_id
      : (await input.repository.getCurrentOperatorMorningDigest({
          coverage_date: digest.coverage_date,
          tenant_id: digest.tenant_id,
        }))?.digest_id ?? supersededByDigestId;
  return {
    cache_key: cacheKey({
      coverage_date: digest.coverage_date,
      digest_id: digest.digest_id,
      tenant_id: digest.tenant_id,
    }),
    digest,
    digest_ref: operatorMorningDigestRef(digest),
    publication_posture: {
      current_digest_id: current,
      lineage_digest_ids_in_order: lineageFor(stored, supersededByDigestId),
      publication_state:
        supersededByDigestId === null ? "CURRENT_AUTHORITATIVE" : "SUPERSEDED",
      superseded_by_digest_id_or_null: supersededByDigestId,
      supersedes_digest_id_or_null: digest.supersedes_digest_id,
      supersession_root_digest_id: digest.derivation_contract.supersession_root_digest_id,
    },
  };
}
