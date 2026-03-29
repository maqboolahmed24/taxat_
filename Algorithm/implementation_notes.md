# Implementation Notes

This module set is organized for direct engineering use:
- Defines terms unambiguously (glossary + data model)
- States the end-to-end technical flow (core_engine.md)
- Includes implementation variants where relevant (core_engine.md, modules.md)
- Specifies required invariants and error handling (invariants_and_gates.md)
- Provides executable-style scenarios (test_vectors.md)

Schema posture:
- Sealed contracts should be schema-closed by default (`additionalProperties: false` for direct objects).
- For composed schemas (`allOf` / `oneOf`), use `unevaluatedProperties: false` to prevent silent shape drift.
- Intake artifacts should use versioned first-class schemas in `schemas/` and record schema identity on artifact envelopes.
