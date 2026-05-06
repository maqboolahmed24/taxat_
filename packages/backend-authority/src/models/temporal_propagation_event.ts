import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";

export const TEMPORAL_PROPAGATION_EVENT_CLASSES = [
  "LATE_DATA_INVALIDATION",
  "AUTHORITY_CORRECTION",
  "OUT_OF_BAND_DISCOVERY",
  "TEMPORAL_UNCERTAINTY_BLOCK",
] as const;

export const TEMPORAL_TRUST_EFFECTS = ["NONE", "RECALC_REQUIRED"] as const;
export const TEMPORAL_PROOF_EFFECTS = ["NONE", "STALE_REVALIDATION_REQUIRED"] as const;
export const TEMPORAL_BASELINE_EFFECTS = ["NONE", "SCOPE_SLICED_REBUILD_REQUIRED"] as const;
export const TEMPORAL_RETROACTIVE_EFFECTS = ["NONE", "ANALYSIS_REQUIRED"] as const;
export const TEMPORAL_AMENDMENT_EFFECTS = [
  "NONE",
  "INVALIDATE_READINESS_REUSE",
  "RECONCILE_FIRST",
] as const;
export const TEMPORAL_REPLAY_EFFECTS = [
  "NOT_MATERIAL",
  "HISTORICAL_EVENT_REQUIRED",
  "LIMITED_COMPARISON_ONLY",
] as const;
export const TEMPORAL_MIRROR_REOPEN_EFFECTS = ["NONE", "REOPEN_REQUIRED"] as const;

export type TemporalPropagationEventClass = (typeof TEMPORAL_PROPAGATION_EVENT_CLASSES)[number];
export type TemporalTrustEffect = (typeof TEMPORAL_TRUST_EFFECTS)[number];
export type TemporalProofEffect = (typeof TEMPORAL_PROOF_EFFECTS)[number];
export type TemporalBaselineEffect = (typeof TEMPORAL_BASELINE_EFFECTS)[number];
export type TemporalRetroactiveEffect = (typeof TEMPORAL_RETROACTIVE_EFFECTS)[number];
export type TemporalAmendmentEffect = (typeof TEMPORAL_AMENDMENT_EFFECTS)[number];
export type TemporalReplayEffect = (typeof TEMPORAL_REPLAY_EFFECTS)[number];
export type TemporalMirrorReopenEffect = (typeof TEMPORAL_MIRROR_REOPEN_EFFECTS)[number];

export type TemporalPropagationEventRecord = {
  active_exact_scope_key: string;
  affected_scope_refs: string[];
  affected_submission_refs: string[];
  amendment_effect: TemporalAmendmentEffect;
  artifact_type: "TemporalPropagationEvent";
  baseline_effect: TemporalBaselineEffect;
  emitted_at: string;
  event_class: TemporalPropagationEventClass;
  event_hash: string;
  historical_reuse_policy: "NO_FRESH_RECLASSIFICATION";
  manifest_id: string;
  mirror_reopen_effect: TemporalMirrorReopenEffect;
  proof_effect: TemporalProofEffect;
  reason_codes: string[];
  replay_effect: TemporalReplayEffect;
  retroactive_effect: TemporalRetroactiveEffect;
  source_authority_basis_refs: string[];
  source_baseline_envelope_ref_or_null: string | null;
  source_drift_ref_or_null: string | null;
  source_late_data_finding_refs: string[];
  source_late_data_monitor_ref_or_null: string | null;
  temporal_event_id: string;
  trust_effect: TemporalTrustEffect;
};

export type TemporalPropagationEventBuildInput = Partial<
  Omit<
    TemporalPropagationEventRecord,
    | "active_exact_scope_key"
    | "affected_scope_refs"
    | "affected_submission_refs"
    | "artifact_type"
    | "event_class"
    | "event_hash"
    | "historical_reuse_policy"
    | "manifest_id"
    | "reason_codes"
    | "source_authority_basis_refs"
    | "source_late_data_finding_refs"
    | "temporal_event_id"
  >
> & {
  active_exact_scope_key?: string;
  affected_scope_refs: readonly string[];
  affected_submission_refs?: readonly string[];
  event_class: TemporalPropagationEventClass;
  event_hash?: string;
  manifest_id: string;
  reason_codes?: readonly string[];
  source_authority_basis_refs?: readonly string[];
  source_late_data_finding_refs?: readonly string[];
  temporal_event_id?: string;
};

export function temporalPropagationEventRef(
  event: Pick<TemporalPropagationEventRecord, "temporal_event_id"> | string,
) {
  return refFromId(
    "temporal-propagation-event",
    typeof event === "string" ? event : event.temporal_event_id,
  );
}

function deriveExactScopeKey(affectedScopeRefs: readonly string[]) {
  return `exact-scope:${affectedScopeRefs.join("|")}`;
}

function defaultReasonCodes(eventClass: TemporalPropagationEventClass) {
  const map: Record<TemporalPropagationEventClass, string[]> = {
    AUTHORITY_CORRECTION: [
      "AUTHORITY_CORRECTION_REOPENS_TRUST",
      "BASELINE_AND_REPLAY_REBUILD_REQUIRED",
    ],
    LATE_DATA_INVALIDATION: [
      "LATE_DATA_INVALIDATES_TRUST",
      "BASELINE_AND_REPLAY_REBUILD_REQUIRED",
    ],
    OUT_OF_BAND_DISCOVERY: [
      "OUT_OF_BAND_AUTHORITY_TRUTH_REQUIRES_RECONCILIATION",
      "BASELINE_AND_REPLAY_REBUILD_REQUIRED",
    ],
    TEMPORAL_UNCERTAINTY_BLOCK: [
      "TEMPORAL_UNCERTAINTY_BLOCKS_REUSE",
      "HISTORICAL_COMPARISON_LIMITED",
    ],
  };
  return map[eventClass];
}

function defaultEffects(input: {
  affected_submission_refs: readonly string[];
  event_class: TemporalPropagationEventClass;
}): Pick<
  TemporalPropagationEventRecord,
  | "amendment_effect"
  | "baseline_effect"
  | "mirror_reopen_effect"
  | "proof_effect"
  | "replay_effect"
  | "retroactive_effect"
  | "trust_effect"
> {
  if (input.event_class === "TEMPORAL_UNCERTAINTY_BLOCK") {
    return {
      amendment_effect: "RECONCILE_FIRST",
      baseline_effect: "NONE",
      mirror_reopen_effect: input.affected_submission_refs.length > 0 ? "REOPEN_REQUIRED" : "NONE",
      proof_effect: "STALE_REVALIDATION_REQUIRED",
      replay_effect: "LIMITED_COMPARISON_ONLY",
      retroactive_effect: "NONE",
      trust_effect: "RECALC_REQUIRED",
    };
  }
  return {
    amendment_effect:
      input.event_class === "OUT_OF_BAND_DISCOVERY"
        ? "RECONCILE_FIRST"
        : "INVALIDATE_READINESS_REUSE",
    baseline_effect: "SCOPE_SLICED_REBUILD_REQUIRED",
    mirror_reopen_effect: "REOPEN_REQUIRED",
    proof_effect: "STALE_REVALIDATION_REQUIRED",
    replay_effect: "HISTORICAL_EVENT_REQUIRED",
    retroactive_effect: input.affected_submission_refs.length > 0 ? "ANALYSIS_REQUIRED" : "NONE",
    trust_effect: "RECALC_REQUIRED",
  };
}

function eventHashMaterial(record: Omit<
  TemporalPropagationEventRecord,
  "artifact_type" | "event_hash" | "temporal_event_id"
>) {
  return {
    active_exact_scope_key: record.active_exact_scope_key,
    affected_scope_refs: record.affected_scope_refs,
    affected_submission_refs: record.affected_submission_refs,
    amendment_effect: record.amendment_effect,
    baseline_effect: record.baseline_effect,
    emitted_at: record.emitted_at,
    event_class: record.event_class,
    historical_reuse_policy: record.historical_reuse_policy,
    manifest_id: record.manifest_id,
    mirror_reopen_effect: record.mirror_reopen_effect,
    proof_effect: record.proof_effect,
    reason_codes: record.reason_codes,
    replay_effect: record.replay_effect,
    retroactive_effect: record.retroactive_effect,
    source_authority_basis_refs: record.source_authority_basis_refs,
    source_baseline_envelope_ref_or_null: record.source_baseline_envelope_ref_or_null,
    source_drift_ref_or_null: record.source_drift_ref_or_null,
    source_late_data_finding_refs: record.source_late_data_finding_refs,
    source_late_data_monitor_ref_or_null: record.source_late_data_monitor_ref_or_null,
    trust_effect: record.trust_effect,
  };
}

export function deriveTemporalPropagationEventHash(
  record: Omit<TemporalPropagationEventRecord, "artifact_type" | "event_hash" | "temporal_event_id">,
) {
  return hashObject("TEMPORAL_PROPAGATION_EVENT_V1", eventHashMaterial(record));
}

function defaultEventId(input: {
  active_exact_scope_key: string;
  event_class: TemporalPropagationEventClass;
  event_hash: string;
  manifest_id: string;
}) {
  return [
    "temporal-propagation-event",
    requireString("manifest_id", input.manifest_id),
    input.event_class.toLowerCase(),
    requireString("active_exact_scope_key", input.active_exact_scope_key).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48),
    requireString("event_hash", input.event_hash).slice(0, 16),
  ].join(".");
}

function assertSchemaLikeInvariants(record: TemporalPropagationEventRecord) {
  if (record.affected_scope_refs.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "TemporalPropagationEvent requires affected_scope_refs",
    );
  }
  if (record.reason_codes.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "TemporalPropagationEvent requires reason_codes",
    );
  }
  if (record.historical_reuse_policy !== "NO_FRESH_RECLASSIFICATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "temporal events must freeze NO_FRESH_RECLASSIFICATION",
    );
  }
  if (
    (record.event_class === "AUTHORITY_CORRECTION" ||
      record.event_class === "OUT_OF_BAND_DISCOVERY") &&
    record.source_authority_basis_refs.length === 0
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${record.event_class} requires source_authority_basis_refs`,
    );
  }
  if (
    (record.event_class === "LATE_DATA_INVALIDATION" ||
      record.event_class === "TEMPORAL_UNCERTAINTY_BLOCK") &&
    record.source_late_data_monitor_ref_or_null === null &&
    record.source_late_data_finding_refs.length === 0
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${record.event_class} requires a late-data monitor or finding ref`,
    );
  }
  if (record.event_class === "AUTHORITY_CORRECTION") {
    for (const [label, value] of [
      ["trust_effect", record.trust_effect === "RECALC_REQUIRED"],
      ["proof_effect", record.proof_effect === "STALE_REVALIDATION_REQUIRED"],
      ["baseline_effect", record.baseline_effect === "SCOPE_SLICED_REBUILD_REQUIRED"],
      ["replay_effect", record.replay_effect === "HISTORICAL_EVENT_REQUIRED"],
      ["mirror_reopen_effect", record.mirror_reopen_effect === "REOPEN_REQUIRED"],
    ] as const) {
      if (!value) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          `AUTHORITY_CORRECTION requires ${label}`,
        );
      }
    }
  }
  if (record.event_class === "OUT_OF_BAND_DISCOVERY") {
    if (
      record.trust_effect !== "RECALC_REQUIRED" ||
      record.proof_effect !== "STALE_REVALIDATION_REQUIRED" ||
      record.baseline_effect !== "SCOPE_SLICED_REBUILD_REQUIRED" ||
      record.amendment_effect !== "RECONCILE_FIRST" ||
      record.replay_effect !== "HISTORICAL_EVENT_REQUIRED" ||
      record.mirror_reopen_effect !== "REOPEN_REQUIRED"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "OUT_OF_BAND_DISCOVERY requires reconcile-first propagation effects",
      );
    }
  }
  if (
    record.event_class === "TEMPORAL_UNCERTAINTY_BLOCK" &&
    record.replay_effect !== "LIMITED_COMPARISON_ONLY"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "TEMPORAL_UNCERTAINTY_BLOCK requires LIMITED_COMPARISON_ONLY replay effect",
    );
  }
  if (record.retroactive_effect === "ANALYSIS_REQUIRED" && record.affected_submission_refs.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "retroactive ANALYSIS_REQUIRED requires affected_submission_refs",
    );
  }
}

export function buildTemporalPropagationEventRecord(
  input: TemporalPropagationEventBuildInput,
): TemporalPropagationEventRecord {
  const eventClass = assertEnum("event_class", input.event_class, TEMPORAL_PROPAGATION_EVENT_CLASSES);
  const affectedScopeRefs = normalizeSortedStringSet("affected_scope_refs", input.affected_scope_refs, {
    minItems: 1,
  });
  const affectedSubmissionRefs = normalizeSortedStringSet(
    "affected_submission_refs",
    input.affected_submission_refs,
  );
  const effects = defaultEffects({
    affected_submission_refs: affectedSubmissionRefs,
    event_class: eventClass,
  });
  const hashable = {
    active_exact_scope_key: requireString(
      "active_exact_scope_key",
      input.active_exact_scope_key ?? deriveExactScopeKey(affectedScopeRefs),
    ),
    affected_scope_refs: affectedScopeRefs,
    affected_submission_refs: affectedSubmissionRefs,
    amendment_effect: assertEnum(
      "amendment_effect",
      input.amendment_effect ?? effects.amendment_effect,
      TEMPORAL_AMENDMENT_EFFECTS,
    ),
    baseline_effect: assertEnum(
      "baseline_effect",
      input.baseline_effect ?? effects.baseline_effect,
      TEMPORAL_BASELINE_EFFECTS,
    ),
    emitted_at: normalizeTimestamp("emitted_at", input.emitted_at),
    event_class: eventClass,
    historical_reuse_policy: "NO_FRESH_RECLASSIFICATION" as const,
    manifest_id: requireString("manifest_id", input.manifest_id),
    mirror_reopen_effect: assertEnum(
      "mirror_reopen_effect",
      input.mirror_reopen_effect ?? effects.mirror_reopen_effect,
      TEMPORAL_MIRROR_REOPEN_EFFECTS,
    ),
    proof_effect: assertEnum(
      "proof_effect",
      input.proof_effect ?? effects.proof_effect,
      TEMPORAL_PROOF_EFFECTS,
    ),
    reason_codes: normalizeSortedStringSet(
      "reason_codes",
      input.reason_codes ?? defaultReasonCodes(eventClass),
      { minItems: 1 },
    ),
    replay_effect: assertEnum(
      "replay_effect",
      input.replay_effect ?? effects.replay_effect,
      TEMPORAL_REPLAY_EFFECTS,
    ),
    retroactive_effect: assertEnum(
      "retroactive_effect",
      input.retroactive_effect ?? effects.retroactive_effect,
      TEMPORAL_RETROACTIVE_EFFECTS,
    ),
    source_authority_basis_refs: normalizeSortedStringSet(
      "source_authority_basis_refs",
      input.source_authority_basis_refs,
    ),
    source_baseline_envelope_ref_or_null: normalizeNullableString(
      "source_baseline_envelope_ref_or_null",
      input.source_baseline_envelope_ref_or_null,
    ),
    source_drift_ref_or_null: normalizeNullableString("source_drift_ref_or_null", input.source_drift_ref_or_null),
    source_late_data_finding_refs: normalizeSortedStringSet(
      "source_late_data_finding_refs",
      input.source_late_data_finding_refs,
    ),
    source_late_data_monitor_ref_or_null: normalizeNullableString(
      "source_late_data_monitor_ref_or_null",
      input.source_late_data_monitor_ref_or_null,
    ),
    trust_effect: assertEnum(
      "trust_effect",
      input.trust_effect ?? effects.trust_effect,
      TEMPORAL_TRUST_EFFECTS,
    ),
  };
  const derivedHash = deriveTemporalPropagationEventHash(hashable);
  const eventHash = input.event_hash ?? derivedHash;
  if (eventHash !== derivedHash) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "TemporalPropagationEvent.event_hash does not match canonical event material",
    );
  }
  const record: TemporalPropagationEventRecord = {
    ...hashable,
    artifact_type: "TemporalPropagationEvent",
    event_hash: eventHash,
    temporal_event_id:
      input.temporal_event_id ??
      defaultEventId({
        active_exact_scope_key: hashable.active_exact_scope_key,
        event_class: eventClass,
        event_hash: eventHash,
        manifest_id: hashable.manifest_id,
      }),
  };
  assertSchemaLikeInvariants(record);
  return record;
}

export function normalizeTemporalPropagationEventRecord(
  input: TemporalPropagationEventRecord,
): TemporalPropagationEventRecord {
  return buildTemporalPropagationEventRecord(input);
}

export function temporalPropagationEventContentFingerprint(record: TemporalPropagationEventRecord) {
  return hashObject(
    "TEMPORAL_PROPAGATION_EVENT_CONTENT_V1",
    eventHashMaterial(normalizeTemporalPropagationEventRecord(record)),
  );
}

export function cloneTemporalPropagationEventRecord(record: TemporalPropagationEventRecord) {
  return cloneRecord(record);
}
