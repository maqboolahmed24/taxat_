# Focus Restoration and Return-Target Harness Contract

## Purpose
This contract turns focus restoration and return-target behavior into a deterministic regression
artifact instead of a browser-history side effect.
It proves that contextual routes, support regions, help handoffs, stale recovery, responsive
restack, and native secondary-window dismissal restore focus to the narrowest lawful target instead
of a generic shell root, a stale DOM node, or nowhere actionable.

## Authoritative artifact
Every release or regression pack that claims focus-restore and return-target closure SHALL
serialize one `focus_restore_return_target_harness` validated by
`schemas/focus_restore_return_target_harness.schema.json`.

That artifact is authoritative for:

- the keyboard-first action matrix for close, back, help-return, stale-rebase recovery, responsive
  restack, live-update interference, and secondary-window close
- the exact serialized invoker, parent-return, and fallback anchors carried before each action
- the browser `data-testid` and native `accessibilityIdentifier` parity assertions for active and
  return targets
- the lawful fallback ordering when the exact return target or object is no longer reopenable
- the active focus-lock assertions that prevent live updates from stealing focus from composers,
  pickers, or compare controls

## Required rules
- Every case SHALL include `KEYBOARD_ONLY`; pointer and assistive-tech parity are additive, never a
  substitute for keyboard-first proof.
- Browser cases SHALL mirror active and return anchors into `browser_*_identifier_or_null`;
  native-secondary cases SHALL mirror them into `native_*_identifier_or_null`.
- Closing a support region or backing out of a contextual route SHALL restore focus to the exact
  serialized invoker or parent-return anchor when that target remains lawful.
- If the exact return target cannot reopen, fallback order SHALL remain:
  1. remap within the same governed object
  2. object summary on the same governed object
  3. serialized parent return target
  4. the narrowest surviving list or queue target
- Live updates SHALL preserve the active focus lock for composers, pickers, and compare controls.
- Help handoff return SHALL restore the serialized source anchor instead of a generic tab root.
- Native secondary-window close SHALL restore the parent focus anchor on the owning primary scene.

## Failure modes closed
- drawers or inspectors closing without returning focus to the invoker
- contextual detail routes returning to a generic tab root instead of the serialized parent target
- stale or rebased detail routes reopening a broad home/dashboard route
- help handoff return losing the originating request/item anchor
- live updates stealing focus from active input, picker, or compare controls
- native secondary windows closing without restoring focus to the parent scene
