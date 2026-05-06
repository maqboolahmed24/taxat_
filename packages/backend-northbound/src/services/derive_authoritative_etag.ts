import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type AuthoritativeEtagBasis =
  | {
      basis: "GUARD_VALUE";
      staleGuardFamily: NonNullable<ProblemEnvelope["stale_guard_family"]>;
      value: number | string;
    }
  | {
      basis: "ROUTE_STABILITY_CONTRACT";
      stabilityContract: RouteStabilityContract;
    };

export class AuthoritativeEtagError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "AuthoritativeEtagError";
    this.reasonCodes = [...reasonCodes];
  }
}

function assertNonEmpty(value: string, fieldName: string) {
  if (value.trim().length === 0) {
    throw new AuthoritativeEtagError(`${fieldName} cannot be empty`, [
      "AUTHORITATIVE_ETAG_EMPTY",
    ]);
  }
}

export function deriveAuthoritativeEtag(input: AuthoritativeEtagBasis) {
  if (input.basis === "ROUTE_STABILITY_CONTRACT") {
    assertNonEmpty(input.stabilityContract.guard_vector_hash, "guard_vector_hash");
    return input.stabilityContract.guard_vector_hash;
  }
  if (typeof input.value === "number") {
    if (!Number.isInteger(input.value) || input.value < 0) {
      throw new AuthoritativeEtagError("integer ETag guard values must be non-negative", [
        "AUTHORITATIVE_ETAG_INTEGER_INVALID",
      ]);
    }
    return String(input.value);
  }
  assertNonEmpty(input.value, input.staleGuardFamily);
  return input.value;
}

export function deriveCompositeAuthoritativeEtag(input: {
  basisCode: string;
  components: Record<string, unknown>;
}) {
  assertNonEmpty(input.basisCode, "basisCode");
  return stableJsonHash({
    basis_code: input.basisCode,
    components: input.components,
  });
}

