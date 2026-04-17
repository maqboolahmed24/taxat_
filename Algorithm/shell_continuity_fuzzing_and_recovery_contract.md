# Shell Continuity Fuzzing and Recovery Contract

## Purpose
This contract turns same-object same-shell continuity from a prose aspiration into a deterministic
perturbation harness.
It is the executable regression boundary for lawful rebase, reconnect, resize, responsive collapse,
stream catch-up, frame-epoch advance, native scene restoration, and secondary-window restoration.

The goal is simple:

- the same lawful object stays mounted
- the same shell family stays in force
- the same route or scene identity survives
- the same dominant question and dominant meaning survive unless truth actually changes
- the same active module or context survives
- the same focus and return anchors survive
- any unavoidable continuity degradation becomes explicit inline recovery, never a silent remount

## Authoritative artifact
Every continuity regression pack SHALL serialize one `shell_continuity_fuzz_harness` validated by
`schemas/shell_continuity_fuzz_harness.schema.json`.

That artifact is authoritative for:

- the deterministic perturbation matrix and shrink policy
- the browser and native coverage requirement
- the continuity state snapshot before and after each perturbation case
- the exact invariants asserted for shell family, route identity, object anchor, dominant question,
  dominant meaning, settlement posture, active context, focus anchor, and return focus anchor
- whether the case must preserve continuity without visible recovery or preserve continuity with
  explicit inline recovery

## Required invariants
- If `truth_change_detected = false`, the harness SHALL treat shell family, route identity, object
  anchor, dominant question, dominant meaning, settlement state, active context, focus anchor, and
  return focus anchor as preserved values whenever the object remains lawful.
- `expected_outcome = PRESERVED` means recovery posture is also preserved; the renderer does not get
  to swap shell metaphors, route families, or action meaning during layout or stream churn.
- `expected_outcome = INLINE_RECOVERY` means the same route or scene, object, dominant question,
  active context, focus anchor, and dominant meaning survive, but the user sees one typed recovery
  posture instead of a silent remount or generic dashboard fallback.
- Native secondary windows SHALL retain a non-null parent return anchor through restore and close.
- Shrink sequences SHALL remain a subset of the injected perturbations so failures reproduce from the
  smallest lawful case.

## Coverage requirements
The harness SHALL cover both browser and native continuity:

- browser cases SHALL include rebase, reconnect, resize or responsive collapse, and stream catch-up
  or frame-epoch advance
- native cases SHALL include primary-scene or secondary-window restoration
- the suite SHALL include both preserved-continuity cases and inline-recovery cases

## Failure modes closed
- shell family or route identity changing during inline recovery
- resize or responsive collapse dropping the selected object, active context, or focus anchor
- reconnect or catch-up reopening a generic inbox or dashboard instead of the narrowest lawful object
- native primary restore losing the mounted work context
- native secondary restore losing the parent launch anchor
- action-strip or summary meaning changing during recovery without a real truth change
