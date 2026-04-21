# Nebula WorldBox — Current Plan (short horizon)

Snapshot of what is in flight and what's next. For the longer vision see [ROADMAP.md](./ROADMAP.md).

---

## Where we are

| PR | Scope | Status |
|---|---|---|
| [#1](https://github.com/doanbactam/nebula/pull/1) | MVP — HUD, terrain/biome/spawn/disaster tools, world sim, tick loop, Ch.1-2 quests, minimap, brush ring, inspector, camera lerp, era dual-gate, event feed | **open, polish pass tested, 7/8 + 1 partial** |
| [#2](https://github.com/doanbactam/nebula/pull/2) | Depth layer 1 — 5-node tech tree, rival god Morvak, Ch.3-5 quest wiring, disaster casualty count, minimap overlay polish, hunger rebalance v1 | **open, 6/6 + bonus tested** |
| [#3](https://github.com/doanbactam/nebula/pull/3) | Polish v2 — hunger v2 + passive sheep ecology, Morvak silence at pop=0, Ch.4 desc clarity | **open, 4/5 tested** (A3 hunger partial) |

Stack: `main` ← PR #1 ← PR #2 ← PR #3.

## What's blocking merge

- **PR #1** & **PR #2** are merge-ready from our side — no open code comments, CI does not exist on this repo.
- **PR #3** A3 (5-min idle self-sustain) is a partial fail — humans still starve out around simulated year ~985 under Iron-era wolf pressure. Ecosystem (sheep) is self-sustaining; humans are the remaining bottleneck.

## Immediate options (pick one before PR #4)

1. **Merge stack as-is.** Accept A3 partial — civ is clearly much more durable than PR #2 baseline. Move on to depth layer 2.
2. **PR #3b — config-only tuning pass (no code).** One small additional commit on top of PR #3:
   - `HUNGER_GAIN_PER_TICK` 0.42 → ~0.32
   - Agriculture fertility mult 1.55× → ~1.8×
   - Optional: let humans harvest adjacent sheep more aggressively to close the sheep-to-worshipper food pipe
   - Re-test A3 (5-min idle target), merge whole stack.
3. **Dual track.** Keep PR #3 as-is for merge and spin up PR #4 (depth 2) in parallel — tuning can land as a later chore-level PR after depth 2 is in.

## Known polish backlog (non-blocking)

Captured across PR #1-3 test reports. None block merge; all candidates for a future `chore/polish-v3` PR.

- Ch.4 progress bar renders only when `status !== 'locked'`. Could flip the gate so `0 / 16` shows even while locked to preview the win condition.
- Minimap gold rectangle could use a slightly brighter stroke at very low zoom levels.
- Event feed dedup: repeated `1 sheep perished` lines within a short window could be aggregated like the existing `N perished` throttle.
- Inspector tile-fertility readout doesn't surface the `state.buffs.fertilityMult` multiplier — currently invisible unless you read state directly.
- Rival strike area radius could scale with Morvak's score so late-game strikes feel more threatening.

## Engineering hygiene tasks

- **CI.** Repo has no CI. A minimal `typecheck + build` GitHub Actions workflow would protect future PRs. Proposed in ROADMAP § Engineering.
- **Pre-commit hook.** `husky` + `lint-staged` to gate commits on `tsc --noEmit`. Low priority.
- **Asset pipeline.** Sprites are currently generated in-memory on boot. Moving to a baked spritesheet PNG + JSON atlas would cut cold-start work. Low priority while world is tiny.

## How we ship

1. Every PR starts with a test plan (`*-test-plan.md`) before code — captured in session.
2. Every PR ends with a test comment on GitHub that links the session + annotated recording + pass/fail table + per-assertion evidence.
3. Stack PRs — new feature branches off the latest feature branch, never off `main` until the stack lands.
4. Branch naming: `devin/<unix-ts>-<slug>`.
5. No force-push, no amend, no skip-hooks. New commits only.

Updated: 2026-04-21 (PR #3 test complete)
