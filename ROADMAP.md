# Nebula WorldBox — Roadmap (long horizon)

The long-term vision. For the active engineering plan see [PLAN.md](./PLAN.md).

This game is a **Nebula-novel-flavored WorldBox** — a pixel god-sim sandbox whose sandbox freedom is layered on top of three meta-tiers drawn from *Nền Văn Minh Nebula* / Wirae:

- **Tier 1 — God layer**: your Faith / Mana / Rank on the Nebula leaderboard.
- **Tier 2 — Civilization layer**: civs tiered through eras, worshipping (or rejecting) you.
- **Tier 3 — Nebula events**: quest chapters, rival pantheons, Mystic Battlegrounds, ascension, end-game portals.

Everything below expands tiers 2 and 3 without losing the WorldBox-style free sandbox at the core.

---

## Milestones

### M0 — MVP foundations ✅ (shipped in PR #1 + PR #2 + PR #3)

- HUB with collapsible panels (Pantheon, Tools, Pantheon Log, Map, Time)
- World: 80×50 tile map, biome/terrain painting, creature spawn, disasters (meteor/fire/quake), Nebula portal power, time control (0×/1×/2×/4×)
- Creatures: sheep / wolf / dragon / human with species sheet, hunger + starve, combat, death fade
- Civ layer v1: sentient count, faith accrual, era progression (Stone → Bronze → Iron → Arcane → Nebula Awakening), tech tree (5 nodes), auto-research with permanent buffs
- Meta layer v1: quest chapters Ch.1–5, Nebula leaderboard, rival god Morvak with periodic strikes, Ch.3 Mystic Battleground portal gate
- UX polish: brush ring, live inspector, camera lerp, minimap viewport rectangle, event feed with meta/good/bad levels, toasts

### M1 — Depth layer 2 (next — PR #4)

Goal: the sandbox starts to *feel* like a civilization, not just a creature box.

- **Civ auto-builder** — villages, towns, cities as sprite upgrades based on local worshipper density + era. Settlements shelter humans against wolves/disasters (hunger decay slower inside city tiles).
- **Mystic Battleground mini-arena** — Ch.3 portal opens a small 20×15 sub-scene where your worshippers fight a Lizardfolk wave. Win → Ch.3 done, permanent `+10% faith` buff.
- **Season weather** — Spring fertility+, Summer baseline, Autumn food+, Winter fertility−; surfaced in top bar; ties into hunger mechanic.
- **Diplomacy with Morvak** — a new HUD action lets you either **Smite** (mana cost, reduce Morvak score), **Cede faith** (buy a tick-interval pause), or **Ignore** (default). Morvak card on Rank tab gets 3 action buttons.

Target: one PR, ~1–2 passes, stacked on PR #3 (or on main if PR #3 merges first).

### M2 — Depth layer 3 (PR #5)

Goal: longer game loops, replay hooks, player identity.

- **Civilization traits** — when worshippers reach city era, the civ rolls 1 of N ethos traits (Agrarian, Warlike, Mystic, Expansionist). Traits modify buffs, quest trajectory, and Morvak aggro.
- **Multiple rival pantheons** — Aether, Lithe, Orin become real NPC gods (not just leaderboard slots), each with unique strike signatures and aggro rules.
- **Alliance / vassal pacts** — Smite one rival, cede to another — the two-vs-one dynamic from the novel.
- **Persistent save** — `localStorage` slot + export/import JSON. One slot is enough for now.
- **Sound pass** — pixel-y bleeps for tick, strike, tech unlock, quest done, portal open, toast alerts.

### M3 — Endgame & polish (PR #6+)

- **Ch.5 Nebula Convergence** — a scripted sequence that plays when you Ascend a civ: zoom-out to cosmic map, your player rank settles on the final ladder, credits / stats screen.
- **New Game +** — carry over 1 permanent buff into next run.
- **Achievements / titles** — Silver III → Gold II → Platinum I already exists as a rank ladder; expand to 20+ titles tied to specific accomplishments.
- **Performance pass** — profile ≥100 creatures at 4×, add spatial hash for neighbor queries if needed, bake spritesheet.

### M∞ — Wishlist (anything here is subject to scope review)

- Bigger world (160×100 tiles) with chunked rendering.
- More biomes (jungle, tundra, volcanic, dreamscape).
- Player-crafted quests (in-browser quest editor → JSON). Exports as sharable preset.
- Multiplayer Mystic Battlegrounds: async tournament mode where players submit civs and a server resolves battles.
- Modding SDK: drop-in species JSON + spritesheet + behavior script.

---

## Cross-cutting tracks

### Engineering

- **CI workflow** (GitHub Actions): `typecheck + build` on every PR to `main`. Target: added in M1 or earlier.
- **Pre-commit hook**: `husky` + `lint-staged` running `tsc --noEmit` and a stubbed `eslint`. Target: M2.
- **Bundle budget**: Phaser + assets currently small; track and keep `<600 KB` total gzipped until M3.
- **Deployment**: consider a `gh-pages` static deploy so the user can click a link from every PR and play without cloning. Target: M1 (cheap to set up).

### Content

- **Art consolidation**: replace in-memory generated sprites with a baked spritesheet (`assets/sprites.png` + `assets/sprites.json`). Keep generated sprites as a dev-only fallback. Target: M3.
- **Copy polish**: all feed lines / toast strings / quest descriptions should have a short-enough-to-read, flavorful-enough-to-feel-Nebula voice. One copy-audit pass per milestone.

### UX

- **Onboarding overlay**: first-run tooltip trail pointing at Tools, Time, Quest tab, Rank tab. Target: M2.
- **Keyboard shortcut palette**: `?` opens a help sheet listing shortcuts. Already partially scaffolded.
- **Colorblind pass**: re-audit feed `good/bad/meta` colors + tech status badges for AA contrast. Target: M2.

---

## Design north-star

If in doubt about scope, ship the thing that best answers one of these two questions:

1. *Does it make the idle run more dramatic?* (new agency moment — a choice, a reveal, a threat)
2. *Does it make the map read more like a living civ?* (settlement upgrade, faction rise, ecology shift)

Features that are *just* more raw systems without a narrative payoff should be deferred.

Updated: 2026-04-21 (post PR #3)
