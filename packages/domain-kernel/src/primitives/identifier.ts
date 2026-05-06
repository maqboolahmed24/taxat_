export type IdentifierKind = "ID" | "REF" | "HASH" | "ROUTE_TOKEN";

type BrandedString<Brand extends string> = string & {
  readonly __taxatBrand: Brand;
};

export type TaxatId<Family extends string = string> = BrandedString<`${Family}:id`>;
export type TaxatRef<Family extends string = string> = BrandedString<`${Family}:ref`>;
export type TaxatHash<Family extends string = string> = BrandedString<`${Family}:hash`>;
export type TaxatRouteToken<Family extends string = string> =
  BrandedString<`${Family}:route-token`>;

type IdentifierErrorInit = {
  code: "IDENTIFIER_EMPTY" | "IDENTIFIER_STRING_REQUIRED";
  family: string;
  kind: IdentifierKind;
  detail: string;
};

export class IdentifierError extends Error {
  readonly code: IdentifierErrorInit["code"];
  readonly family: string;
  readonly kind: IdentifierKind;

  constructor(init: IdentifierErrorInit) {
    super(`${init.code}: ${init.detail} [family=${init.family}] [kind=${init.kind}]`);
    this.name = "IdentifierError";
    this.code = init.code;
    this.family = init.family;
    this.kind = init.kind;
  }
}

function assertIdentifierLiteral(value: unknown, family: string, kind: IdentifierKind) {
  if (typeof value !== "string") {
    throw new IdentifierError({
      code: "IDENTIFIER_STRING_REQUIRED",
      family,
      kind,
      detail:
        "identifiers remain schema-shaped strings and may not be derived from non-string inputs",
    });
  }

  if (value.length === 0) {
    throw new IdentifierError({
      code: "IDENTIFIER_EMPTY",
      family,
      kind,
      detail: "empty identifier strings are not allowed",
    });
  }

  return value;
}

export function asTaxatId<Family extends string>(value: unknown, family: Family): TaxatId<Family> {
  return assertIdentifierLiteral(value, family, "ID") as TaxatId<Family>;
}

export function asTaxatRef<Family extends string>(
  value: unknown,
  family: Family,
): TaxatRef<Family> {
  return assertIdentifierLiteral(value, family, "REF") as TaxatRef<Family>;
}

export function asTaxatHash<Family extends string>(
  value: unknown,
  family: Family,
): TaxatHash<Family> {
  return assertIdentifierLiteral(value, family, "HASH") as TaxatHash<Family>;
}

export function asTaxatRouteToken<Family extends string>(
  value: unknown,
  family: Family,
): TaxatRouteToken<Family> {
  return assertIdentifierLiteral(value, family, "ROUTE_TOKEN") as TaxatRouteToken<Family>;
}

export function unwrapIdentifier(value: string) {
  return value;
}
