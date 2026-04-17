# AGENT Operating Protocol

This file defines how autonomous agents coordinate work in this repository.

The only live task board is `/Users/test/Code/taxat_/PROMPT/Checklist.md`.
Do not track task status in `AGENT.md`.
Do not duplicate or reorder tasks outside the checklist.

## Coordination Files

- `/Users/test/Code/taxat_/PROMPT/AGENT.md`: execution rules and claim protocol.
- `/Users/test/Code/taxat_/PROMPT/Checklist.md`: the only status board.
- `/Users/test/Code/taxat_/PROMPT/CARDS/pc_####.md`: task-local context, notes, and verification details.

## Status Markers

- `[ ]` Unclaimed and eligible when allowed by the protocol.
- `[-]` Claimed and currently in progress.
- `[X]` Completed and verified.

## Source Of Truth

1. Read `AGENT.md` first.
2. Read `/Users/test/Code/taxat_/PROMPT/Checklist.md` second.
3. Use `/Users/test/Code/taxat_/PROMPT/Checklist.md` as the only file for claiming and completing work.
4. Use the linked card file in `/Users/test/Code/taxat_/PROMPT/CARDS/` for task-specific notes, execution details, and verification evidence.
5. Do not add status markers inside card files. Status lives only in the checklist.

## Sequential Protocol

A task whose slug contains `_seq_` is sequential.
If any sequential task in `/Users/test/Code/taxat_/PROMPT/Checklist.md` is marked `[-]`, all other agents must wait.
No later task may be claimed until that active sequential task is marked `[X]`.

## Parallel Wave Protocol

A task whose slug contains `_parallel_wave_XX_` belongs to a parallel wave block.
When the first incomplete task is in a parallel wave block, agents may claim only tasks from the current contiguous block that shares the same `phase_XX_parallel_wave_YY` prefix.
Later waves and later sequential tasks remain blocked until every earlier task in the active wave block is marked `[X]`.

## Eligibility Rules

1. Scan `/Users/test/Code/taxat_/PROMPT/Checklist.md` from top to bottom.
2. Find the first task that is not `[X]`.
3. If that task is sequential, it is the only claimable task.
4. If that task is parallel, every consecutive task in the same active wave block is claimable if still `[ ]`.
5. Stop at the first task that belongs to a different wave block or a later sequential gate. That boundary is blocked.
6. Never skip forward past the next blocked gate.

## Claim Workflow

1. Read `AGENT.md`.
2. Read `/Users/test/Code/taxat_/PROMPT/Checklist.md`.
3. Identify the next eligible task under the rules above.
4. Open the linked card in `/Users/test/Code/taxat_/PROMPT/CARDS/`.
5. Change that task from `[ ]` to `[-]`.
6. Save and re-read `/Users/test/Code/taxat_/PROMPT/Checklist.md` to confirm the claim still holds.
7. Execute the task using the linked card file for working notes and verification details.
8. Read adjacent cards when dependency context is unclear.
9. Change the task from `[-]` to `[X]` only after successful implementation and verification.

## Card File Rules

1. Keep task status out of the card body.
2. Use the card for assumptions, implementation notes, dependencies, outputs, and verification evidence.
3. Preserve the card metadata header so the workflow stays machine-readable.
4. If the scope of a task changes, update the card notes without renaming the card ID.

## Concurrency Guardrails

1. Claim exactly one task at a time.
2. Never change another agent's `[-]` task unless a takeover policy has been explicitly established.
3. If the checklist changes while you are claiming work, stop, re-read it, and recompute eligibility.
4. If a task is blocked, leave it at `[-]` only if active work is ongoing. Otherwise release it according to team policy.
5. Complete the smallest valid claim set first. Do not widen scope inside a claimed card without documenting why in the card notes.
