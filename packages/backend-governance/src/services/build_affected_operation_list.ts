import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

export const authorityLinkAffectedOperationSectionOrder = [
  "PREFLIGHT",
  "SUBMISSION",
  "RECONCILIATION",
  "AMENDMENT",
] as const satisfies readonly AuthorityLinkInventoryItem["affected_operation_list"]["section_order"][number][];

export type AuthorityLinkAffectedOperationInput = {
  blockingCheckRefs?: readonly string[] | undefined;
  operationRef: string;
  section: AuthorityLinkInventoryItem["affected_operation_list"]["section_order"][number];
};

function unique(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function buildAffectedOperationList(input: {
  authorityLinkId: string;
  operations?: readonly AuthorityLinkAffectedOperationInput[] | undefined;
  preflightBlockingCheckRefs: readonly string[];
}): {
  affected_operation_counts: AuthorityLinkInventoryItem["affected_operation_counts"];
  affected_operation_list: AuthorityLinkInventoryItem["affected_operation_list"];
} {
  const blockingCheckSet = new Set(input.preflightBlockingCheckRefs);
  const operations = input.operations ? [...input.operations] : [];
  const hasMappedBlockedOperation = operations.some((operation) =>
    (operation.blockingCheckRefs ?? []).some((checkRef) => blockingCheckSet.has(checkRef)),
  );
  if (input.preflightBlockingCheckRefs.length > 0 && !hasMappedBlockedOperation) {
    operations.push({
      blockingCheckRefs: input.preflightBlockingCheckRefs,
      operationRef: `affected-operation.${input.authorityLinkId}.preflight-blocked`,
      section: "PREFLIGHT" as const,
    });
  }
  const refsBySection = new Map<
    AuthorityLinkAffectedOperationInput["section"],
    string[]
  >(
    authorityLinkAffectedOperationSectionOrder.map((section) => [section, []]),
  );
  for (const operation of operations) {
    refsBySection.get(operation.section)?.push(operation.operationRef);
  }

  const primary_blocked_operation_ref_or_null =
    input.preflightBlockingCheckRefs.length === 0
      ? null
      : operations.find((operation) =>
          (operation.blockingCheckRefs ?? []).some((checkRef) =>
            blockingCheckSet.has(checkRef),
          ),
        )?.operationRef ?? null;

  const preflight_refs = unique(refsBySection.get("PREFLIGHT") ?? []);
  const submission_refs = unique(refsBySection.get("SUBMISSION") ?? []);
  const reconciliation_refs = unique(refsBySection.get("RECONCILIATION") ?? []);
  const amendment_refs = unique(refsBySection.get("AMENDMENT") ?? []);

  return {
    affected_operation_counts: {
      amendment_count: amendment_refs.length,
      preflight_count: preflight_refs.length,
      reconciliation_count: reconciliation_refs.length,
      submission_count: submission_refs.length,
    },
    affected_operation_list: {
      amendment_refs,
      preflight_refs,
      primary_blocked_operation_ref_or_null,
      reconciliation_refs,
      section_order: [...authorityLinkAffectedOperationSectionOrder],
      submission_refs,
    },
  };
}
