import type {
  SourcePlanDraft,
  SourcePlanPlannedSourceRecord,
  SourcePlanRecord,
} from "../models/source_plan.ts";
import { normalizeSourcePlanDraft } from "../models/source_plan.ts";

export type PlanCoverageValidationErrorCode =
  | "PLAN_AMBIGUOUS_DOMAIN_PARTITION_SOURCE"
  | "PLAN_REQUIRED_DOMAIN_UNCOVERED"
  | "PLAN_SOURCE_DOMAIN_OUT_OF_SCOPE";

export class PlanCoverageValidationError extends Error {
  readonly code: PlanCoverageValidationErrorCode;

  constructor(code: PlanCoverageValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PlanCoverageValidationError";
    this.code = code;
  }
}

function domainPartitionKey(source: SourcePlanPlannedSourceRecord) {
  return `${source.source_domain}\u001e${source.partition_scope_refs.join("\u001f")}`;
}

export function validatePlanCoverage(input: SourcePlanDraft | SourcePlanRecord) {
  const plan = normalizeSourcePlanDraft(input);
  const requiredDomains = new Set(plan.required_domains);
  const coveredDomains = new Set<string>();
  const seenDomainPartitionKeys = new Map<string, SourcePlanPlannedSourceRecord>();

  for (const source of plan.planned_sources) {
    if (!requiredDomains.has(source.source_domain)) {
      throw new PlanCoverageValidationError(
        "PLAN_SOURCE_DOMAIN_OUT_OF_SCOPE",
        `planned source domain ${source.source_domain} is not in required_domains`,
      );
    }
    coveredDomains.add(source.source_domain);

    const key = domainPartitionKey(source);
    const existing = seenDomainPartitionKeys.get(key);
    if (existing !== undefined) {
      throw new PlanCoverageValidationError(
        "PLAN_AMBIGUOUS_DOMAIN_PARTITION_SOURCE",
        `planned source domain ${source.source_domain} and partition set ${source.partition_scope_refs.join(",")} is ambiguous between ${existing.provider_binding_ref} and ${source.provider_binding_ref}`,
      );
    }
    seenDomainPartitionKeys.set(key, source);
  }

  for (const domain of plan.required_domains) {
    if (!coveredDomains.has(domain)) {
      throw new PlanCoverageValidationError(
        "PLAN_REQUIRED_DOMAIN_UNCOVERED",
        `required domain ${domain} is not covered by a planned source`,
      );
    }
  }

  return {
    covered_domain_count: coveredDomains.size,
    planned_source_count: plan.planned_sources.length,
    required_domain_count: plan.required_domains.length,
  };
}
