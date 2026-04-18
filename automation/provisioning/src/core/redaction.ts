export interface RedactionRule {
  id: string;
  category: "SECRET" | "PII";
  kind: "EXACT" | "REGEX";
  pattern: string | RegExp;
  replacement: string;
}

export interface RedactionNote {
  ruleId: string;
  category: "SECRET" | "PII";
  matchCount: number;
}

export interface RedactionResult {
  value: string;
  notes: RedactionNote[];
}

export interface StructuredRedactionResult<T> {
  value: T;
  notes: RedactionNote[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRegExp(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) {
    return pattern.flags.includes("g")
      ? pattern
      : new RegExp(pattern.source, `${pattern.flags}g`);
  }
  return new RegExp(escapeRegExp(pattern), "g");
}

export function createDefaultRedactionRules(
  secretValues: string[],
): RedactionRule[] {
  return [
    ...secretValues.map((value, index) => ({
      id: `exact-secret-${index + 1}`,
      category: "SECRET" as const,
      kind: "EXACT" as const,
      pattern: value,
      replacement: "[REDACTED_SECRET]",
    })),
    {
      id: "email-address",
      category: "PII",
      kind: "REGEX",
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      replacement: "[REDACTED_EMAIL]",
    },
    {
      id: "bearer-token",
      category: "SECRET",
      kind: "REGEX",
      pattern: /\bBearer\s+[A-Za-z0-9._-]+\b/g,
      replacement: "Bearer [REDACTED_TOKEN]",
    },
  ];
}

export function redactText(
  input: string,
  rules: readonly RedactionRule[],
): RedactionResult {
  let value = input;
  const notes: RedactionNote[] = [];

  for (const rule of rules) {
    const regexp = normalizeRegExp(rule.pattern);
    const matches = value.match(regexp);
    if (!matches || matches.length === 0) {
      continue;
    }
    value = value.replace(regexp, rule.replacement);
    notes.push({
      ruleId: rule.id,
      category: rule.category,
      matchCount: matches.length,
    });
  }

  return { value, notes };
}

export function redactStructuredValue<T>(
  input: T,
  rules: readonly RedactionRule[],
): StructuredRedactionResult<T> {
  const notes: RedactionNote[] = [];

  function visit(value: unknown): unknown {
    if (typeof value === "string") {
      const redacted = redactText(value, rules);
      notes.push(...redacted.notes);
      return redacted.value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => visit(entry));
    }

    if (value && typeof value === "object") {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        output[key] = visit(entry);
      }
      return output;
    }

    return value;
  }

  return {
    value: visit(input) as T,
    notes,
  };
}
