import type {
  PresealGateEvaluationContract,
  RunManifestAccessDecision,
  RunManifestConfigFreeze,
  RunManifestContinuationSet,
  RunManifestInputFreeze,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ScopeExecutionBindingRecord } from "../../../backend-access/src/models/scope_execution_binding.ts";
import type { CanonicalScopeToken } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";

export type PresealAccessBoundaryDecision =
  | "ALLOW"
  | "ALLOW_MASKED"
  | "REQUIRE_STEP_UP"
  | "REQUIRE_APPROVAL"
  | "DENY";

export type RuntimeAccessDecisionInput = {
  access_binding_hash?: string;
  authorization_decision_access_binding_hash: string;
  decision: PresealAccessBoundaryDecision;
  effective_scope: CanonicalScopeToken[];
  executable_partition_scope_refs?: string[];
  masking_rules?: string[];
  reason_codes: string[];
  required_approvals?: string[];
  required_authn_level?: "BASIC" | "MFA" | "STEP_UP" | null;
};

export type PresealContextPatch = {
  access_decision?: RuntimeAccessDecisionInput | RunManifestAccessDecision;
  config_freeze?: RunManifestConfigFreeze | null;
  continuation_set_patch?: Partial<RunManifestContinuationSet>;
  input_freeze?: RunManifestInputFreeze | null;
  preseal_gate_evaluation?: PresealGateEvaluationContract | null;
  scope_execution_binding?: (ScopeExecutionBindingRecord & { binding_scope_class: "RUN_MANIFEST" }) | null;
};

export type PresealContextPatchResult = {
  manifest: RunManifestRecord;
  patched_fields: string[];
};
