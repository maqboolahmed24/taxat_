import type {
  ArtifactAffordanceContractRecord,
  ArtifactSelectionContractRecord,
  ExternalizationGovernanceContractRecord,
} from "../types.ts";
import { deriveArtifactPreviewOpenPolicy } from "./derive_artifact_affordance_contract.ts";
import { derivePortalExternalizationDeliveryBindingHash } from "./derive_portal_externalization_governance_contract.ts";

export class ArtifactTargetAlignmentError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ArtifactTargetAlignmentError";
    this.reasonCodes = [...reasonCodes];
  }
}

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new ArtifactTargetAlignmentError(message, reasonCodes);
}

function assertEqual(
  left: unknown,
  right: unknown,
  message: string,
  reasonCode: string,
) {
  if (left !== right) {
    fail(message, [reasonCode]);
  }
}

function assertNotHistoricalTarget(
  targetRef: string | null,
  historicalSubjectRefs: readonly string[],
  targetName: string,
) {
  if (targetRef !== null && historicalSubjectRefs.includes(targetRef)) {
    fail(`${targetName} must not point at a historical or superseded subject`, [
      "ARTIFACT_TARGET_ALIGNMENT_HISTORICAL_DEFAULT_FORBIDDEN",
    ]);
  }
}

export function validateArtifactTargetAlignment(input: {
  artifactAffordance: ArtifactAffordanceContractRecord;
  artifactSelection: ArtifactSelectionContractRecord;
  externalizationGovernanceContract: ExternalizationGovernanceContractRecord;
}) {
  const selection = input.artifactSelection;
  const affordance = input.artifactAffordance;
  const externalization = input.externalizationGovernanceContract;

  assertEqual(
    affordance.affordance_scope,
    selection.selection_scope,
    "artifact affordance scope must mirror artifact selection scope",
    "ARTIFACT_TARGET_ALIGNMENT_SCOPE_DRIFT",
  );
  assertEqual(
    externalization.boundary_scope,
    selection.selection_scope,
    "externalization boundary scope must mirror artifact selection scope",
    "ARTIFACT_TARGET_ALIGNMENT_EXTERNALIZATION_SCOPE_DRIFT",
  );

  for (const [affordanceField, externalizationField] of [
    ["default_preview_target_ref_or_null", "preview_target_ref_or_null"],
    ["default_download_target_ref_or_null", "download_target_ref_or_null"],
    ["default_print_target_ref_or_null", "print_target_ref_or_null"],
  ] as const) {
    assertEqual(
      affordance[affordanceField],
      selection[affordanceField],
      `${affordanceField} must match between artifact selection and affordance`,
      "ARTIFACT_TARGET_ALIGNMENT_SELECTION_AFFORDANCE_DRIFT",
    );
    assertEqual(
      affordance[affordanceField],
      externalization[externalizationField],
      `${affordanceField} must match the externalization target`,
      "ARTIFACT_TARGET_ALIGNMENT_EXTERNALIZATION_TARGET_DRIFT",
    );
  }

  assertEqual(
    affordance.preview_open_policy,
    deriveArtifactPreviewOpenPolicy(affordance.history_affordance_state),
    "preview_open_policy must be derived from history_affordance_state",
    "ARTIFACT_TARGET_ALIGNMENT_PREVIEW_POLICY_DRIFT",
  );
  if (
    affordance.primary_subject_role === "NO_CURRENT_ARTIFACT" &&
    affordance.visible_primary_subject_ref_or_null !== null
  ) {
    fail("NO_CURRENT_ARTIFACT must clear visible_primary_subject_ref_or_null", [
      "ARTIFACT_TARGET_ALIGNMENT_NO_CURRENT_VISIBLE_REF_DRIFT",
    ]);
  }
  if (
    selection.authoritative_subject_refs.length === 0 &&
    (selection.default_preview_target_ref_or_null !== null ||
      selection.default_download_target_ref_or_null !== null ||
      selection.default_print_target_ref_or_null !== null)
  ) {
    fail("non-authoritative artifact selections must clear default targets", [
      "ARTIFACT_TARGET_ALIGNMENT_NON_AUTHORITATIVE_DEFAULT_TARGET",
    ]);
  }

  assertNotHistoricalTarget(
    selection.default_preview_target_ref_or_null,
    selection.historical_subject_refs,
    "default preview target",
  );
  assertNotHistoricalTarget(
    selection.default_download_target_ref_or_null,
    selection.historical_subject_refs,
    "default download target",
  );
  assertNotHistoricalTarget(
    selection.default_print_target_ref_or_null,
    selection.historical_subject_refs,
    "default print target",
  );

  if (
    selection.selection_scope === "CLIENT_DOCUMENT_REQUEST" &&
    (selection.default_print_target_ref_or_null !== null ||
      externalization.print_target_ref_or_null !== null ||
      externalization.external_handoff_target_ref_or_null !== null)
  ) {
    fail("portal document requests must not publish print or external handoff targets", [
      "ARTIFACT_TARGET_ALIGNMENT_DOCUMENT_EXTERNAL_TARGET_FORBIDDEN",
    ]);
  }
  if (
    selection.selection_scope === "CLIENT_APPROVAL_PACK" &&
    externalization.external_handoff_target_ref_or_null !== null
  ) {
    fail("portal approval packs must keep external browser handoff blocked in this contract", [
      "ARTIFACT_TARGET_ALIGNMENT_APPROVAL_HANDOFF_FORBIDDEN",
    ]);
  }
  if (
    (externalization.eligibility_state === "BLOCKED" ||
      externalization.eligibility_state === "APPROVAL_REQUIRED") &&
    externalization.blocking_context_tokens.length === 0
  ) {
    fail("blocked or approval-gated externalization must retain blocking context tokens", [
      "ARTIFACT_TARGET_ALIGNMENT_BLOCKING_CONTEXT_REQUIRED",
    ]);
  }

  const expectedHash = derivePortalExternalizationDeliveryBindingHash(externalization);
  assertEqual(
    externalization.delivery_binding_hash,
    expectedHash,
    "externalization delivery_binding_hash must match the mounted slice and targets",
    "ARTIFACT_TARGET_ALIGNMENT_DELIVERY_HASH_DRIFT",
  );
}
