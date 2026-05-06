import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { stableJsonHash } from "../primitives/hash.ts";

export type StreamScopeClass = StreamRecoveryContract["stream_scope_class"];
export type DeliveryWindowState = StreamRecoveryContract["delivery_window_state"];
export type RebaseReasonCode = NonNullable<StreamRecoveryContract["rebase_reason_code_or_null"]>;
export type ResumeBindingRepresentation = StreamRecoveryContract["resume_binding_representation"];

export type StreamCursorTuple = {
  access_binding_hash: string;
  compaction_floor_sequence_or_null: number | null;
  frame_epoch: number;
  masking_context_hash: string;
  publication_generation: number;
  route_key: string;
  session_binding_hash: string;
  session_ref: string;
  shell_stability_token: string;
  stream_scope_class: StreamScopeClass;
  subject_ref: string;
};

export type CreateStreamRecoveryContractInput = StreamCursorTuple & {
  delivery_window_state: DeliveryWindowState;
  last_published_sequence: number;
  rebase_reason_code_or_null: StreamRecoveryContract["rebase_reason_code_or_null"];
  resume_binding_ref_or_null: string | null;
  resume_binding_representation: ResumeBindingRepresentation;
};

type StreamRecoveryErrorInit = {
  code:
    | "DELIVERY_WINDOW_INVALID"
    | "RESUME_BINDING_FORBIDDEN"
    | "RESUME_BINDING_REQUIRED"
    | "SEQUENCE_WINDOW_INVALID"
    | "STRING_FIELD_REQUIRED"
    | "TRANSPORT_TOKEN_MISMATCH";
  detail: string;
};

export class StreamRecoveryError extends Error {
  readonly code: StreamRecoveryErrorInit["code"];

  constructor(init: StreamRecoveryErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "StreamRecoveryError";
    this.code = init.code;
  }
}

function assertCondition(condition: unknown, init: StreamRecoveryErrorInit): asserts condition {
  if (!condition) {
    throw new StreamRecoveryError(init);
  }
}

function assertNonNegativeInteger(label: string, value: number | null) {
  if (value === null) {
    return;
  }
  assertCondition(Number.isInteger(value) && value >= 0, {
    code: "SEQUENCE_WINDOW_INVALID",
    detail: `${label} must be a non-negative integer when present`,
  });
}

function assertString(label: string, value: string | null, required = true) {
  if (value === null) {
    assertCondition(!required, {
      code: "STRING_FIELD_REQUIRED",
      detail: `${label} is required`,
    });
    return;
  }
  assertCondition(typeof value === "string" && value.trim().length > 0, {
    code: "STRING_FIELD_REQUIRED",
    detail: `${label} must be a non-empty string`,
  });
}

function assertDeliveryWindowRules(input: CreateStreamRecoveryContractInput) {
  if (input.delivery_window_state === "LIVE_RESUMABLE") {
    assertString("resume_binding_ref_or_null", input.resume_binding_ref_or_null);
    assertCondition(input.rebase_reason_code_or_null === null, {
      code: "DELIVERY_WINDOW_INVALID",
      detail: "live resumable windows cannot publish a rebase reason",
    });
  } else if (input.delivery_window_state === "SNAPSHOT_ONLY") {
    assertCondition(input.resume_binding_ref_or_null === null, {
      code: "RESUME_BINDING_FORBIDDEN",
      detail: "snapshot-only windows cannot keep a resume binding",
    });
    assertCondition(input.rebase_reason_code_or_null === null, {
      code: "DELIVERY_WINDOW_INVALID",
      detail: "snapshot-only windows cannot publish a rebase reason",
    });
  } else {
    assertCondition(input.resume_binding_ref_or_null === null, {
      code: "RESUME_BINDING_FORBIDDEN",
      detail: `${input.delivery_window_state} windows cannot keep a stale resume binding`,
    });
    assertCondition(input.rebase_reason_code_or_null !== null, {
      code: "DELIVERY_WINDOW_INVALID",
      detail: `${input.delivery_window_state} windows must declare a reason code`,
    });
  }

  if (input.delivery_window_state === "ACCESS_REBIND_REQUIRED") {
    assertCondition(
      input.rebase_reason_code_or_null === "SESSION_BINDING_CHANGED" ||
        input.rebase_reason_code_or_null === "ACCESS_BINDING_CHANGED" ||
        input.rebase_reason_code_or_null === "MASKING_POSTURE_CHANGED" ||
        input.rebase_reason_code_or_null === "SCHEMA_INCOMPATIBLE",
      {
        code: "DELIVERY_WINDOW_INVALID",
        detail: "access rebind windows must use a session, access, masking, or schema reason",
      },
    );
  }
}

export function hashTransportResumeToken(rawResumeToken: string) {
  assertString("rawResumeToken", rawResumeToken);
  return stableJsonHash({
    contract_version: "STREAM_RESUME_TOKEN_BINDING_V1",
    raw_resume_token: rawResumeToken,
  });
}

export function materializeResumeBindingRef(
  resumeBindingRepresentation: ResumeBindingRepresentation,
  rawResumeToken: string,
) {
  return resumeBindingRepresentation === "HASHED_TOKEN"
    ? hashTransportResumeToken(rawResumeToken)
    : rawResumeToken;
}

export function streamCursorTuple(contract: StreamRecoveryContract): StreamCursorTuple {
  return {
    access_binding_hash: contract.access_binding_hash,
    compaction_floor_sequence_or_null: contract.compaction_floor_sequence_or_null,
    frame_epoch: contract.frame_epoch,
    masking_context_hash: contract.masking_context_hash,
    publication_generation: contract.publication_generation,
    route_key: contract.route_key,
    session_binding_hash: contract.session_binding_hash,
    session_ref: contract.session_ref,
    shell_stability_token: contract.shell_stability_token,
    stream_scope_class: contract.stream_scope_class,
    subject_ref: contract.subject_ref,
  };
}

export function streamRecoveryFingerprint(contract: StreamRecoveryContract) {
  return stableJsonHash({
    ...streamCursorTuple(contract),
    delivery_window_state: contract.delivery_window_state,
    duplicate_delivery_policy: contract.duplicate_delivery_policy,
    last_published_sequence: contract.last_published_sequence,
  });
}

export function hashLiveStreamRecoveryContract(
  contract: StreamRecoveryContract,
  rawResumeToken: string,
) {
  return createStreamRecoveryContract({
    ...streamCursorTuple(contract),
    delivery_window_state: "LIVE_RESUMABLE",
    last_published_sequence: contract.last_published_sequence,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: hashTransportResumeToken(rawResumeToken),
    resume_binding_representation: "HASHED_TOKEN",
  });
}

export function createStreamRecoveryContract(
  input: CreateStreamRecoveryContractInput,
): StreamRecoveryContract {
  assertString("route_key", input.route_key);
  assertString("subject_ref", input.subject_ref);
  assertString("shell_stability_token", input.shell_stability_token);
  assertString("session_ref", input.session_ref);
  assertString("session_binding_hash", input.session_binding_hash);
  assertString("access_binding_hash", input.access_binding_hash);
  assertString("masking_context_hash", input.masking_context_hash);
  assertNonNegativeInteger("publication_generation", input.publication_generation);
  assertNonNegativeInteger("frame_epoch", input.frame_epoch);
  assertNonNegativeInteger("last_published_sequence", input.last_published_sequence);
  assertNonNegativeInteger(
    "compaction_floor_sequence_or_null",
    input.compaction_floor_sequence_or_null,
  );
  assertCondition(
    input.compaction_floor_sequence_or_null === null ||
      input.compaction_floor_sequence_or_null <= input.last_published_sequence,
    {
      code: "SEQUENCE_WINDOW_INVALID",
      detail: "compaction floor cannot move beyond the published frontier",
    },
  );
  if (input.resume_binding_ref_or_null !== null) {
    assertString("resume_binding_ref_or_null", input.resume_binding_ref_or_null);
  }
  assertDeliveryWindowRules(input);

  return {
    access_binding_hash: input.access_binding_hash,
    catch_up_policy: "CATCH_UP_BEFORE_LIVE",
    compaction_floor_sequence_or_null: input.compaction_floor_sequence_or_null,
    contract_version: "STREAM_RECOVERY_V1",
    delivery_window_state: input.delivery_window_state,
    duplicate_delivery_policy: "IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE",
    frame_epoch: input.frame_epoch,
    last_published_sequence: input.last_published_sequence,
    masking_context_hash: input.masking_context_hash,
    publication_generation: input.publication_generation,
    rebase_reason_code_or_null: input.rebase_reason_code_or_null,
    rebase_trigger_policy: "REBASE_ON_EPOCH_ADVANCE_OR_COMPACTION_OR_CONTEXT_DRIFT",
    resume_binding_ref_or_null: input.resume_binding_ref_or_null,
    resume_binding_representation: input.resume_binding_representation,
    resume_token_binding_mode: "EXACT_ROUTE_SESSION_SCOPE_MASKING",
    route_key: input.route_key,
    sequence_application_policy: "STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH",
    session_binding_hash: input.session_binding_hash,
    session_ref: input.session_ref,
    shell_stability_token: input.shell_stability_token,
    stream_scope_class: input.stream_scope_class,
    subject_ref: input.subject_ref,
  };
}

export function verifyTransportResumeBinding(
  contract: StreamRecoveryContract,
  rawResumeToken: string,
) {
  assertCondition(contract.delivery_window_state === "LIVE_RESUMABLE", {
    code: "RESUME_BINDING_REQUIRED",
    detail: "transport resume tokens are only meaningful for live resumable windows",
  });
  const expectedRef = materializeResumeBindingRef(
    contract.resume_binding_representation,
    rawResumeToken,
  );
  assertCondition(expectedRef === contract.resume_binding_ref_or_null, {
    code: "TRANSPORT_TOKEN_MISMATCH",
    detail: "raw transport resume token does not match the authoritative recovery contract",
  });
  return true;
}
