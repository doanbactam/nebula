# Nebula WorldBox

A browser **god-sim sandbox** inspired by [WorldBox](https://www.superworldbox.com/)
and the webnovel **Nền Văn Minh Nebula** by Wirae. Built with **Phaser 4 + TypeScript + Vite**
and a fully collapsible HUD overlay so you can hide any panel you don't need.

> Not just a sandbox — three "Nebula" meta-layers sit on top: Divinity (Faith /
> Mana / Rank), Civilization (Stone → Nebula Awakening eras), and Events
> (Mystic Battlegrounds, Lizardfolk covenants, rival god invasions).

## Run

```bash
npm install
npm run dev    # vite dev server on 5173
npm run build  # production build into dist/
```

## Controls

| Key            | Action                              |
| -------------- | ----------------------------------- |
| **1 – 7**      | Select tool group                   |
| **Click/Drag** | Apply the selected tool             |
| **W A S D**    | Pan camera                          |
| **Wheel / + −**| Zoom                                |
| **Space**      | Pause / resume                      |
| **H**          | Hide / show the whole HUD           |
| **?**          | Open help modal                     |
| **ESC**        | Close help                          |

Each HUD panel has a `–` button to collapse its body and `×` to hide it entirely.
Press `H` to bring everything back.

## Tools

- **Inspect** — click tile / creature → see stats in the right panel.
- **Terrain** — raise / lower elevation (cycles biome).
- **Biome** — paint grass / forest / jungle / desert / snow / ocean.
- **Spawn** — human, orc, dwarf, elf, sheep, wolf, dragon.
- **Power** — bless / curse followers (mana).
- **Disaster** — fire, quake, meteor, flood.
- **Nebula** — rift biome, summon Lizardfolk, open Mystic Battleground portal.

## Architecture

```
src/
  main.ts                 # boots Phaser game + HUD overlay
  style.css               # HUD theme (cosmic / pixel)
  game/
    config.ts             # tile / tick / cost constants
    state.ts              # shared god-state singleton
    events.ts             # typed event bus (game ⇄ HUD)
    world/
      Noise.ts            # value-noise + fBm (no deps)
      Biomes.ts           # biome registry
      TileMap.ts          # 80×50 grid, terrain generator
    entities/
      species.ts          # creature registry
      Creature.ts         # movement / hunger / reproduction tick
    tools/tools.ts        # left-tool catalogue
    sprites/generate.ts   # 32×32 pixel-art generated at boot
    scenes/
      BootScene.ts        # registers textures
      WorldScene.ts       # renders tiles, creatures, handles input + tick
  hud/
    HUD.ts                # mounts every panel + keyboard
    Panel.ts              # collapsible panel base
    TopBar.ts             # God / Faith / Mana / Era / Rank / Score
    LeftTools.ts          # tool groups + expandable sub-options
    RightPanel.ts         # tabbed: Quest · Inspector · Events · Rank
    BottomBar.ts          # time controls + year
    Minimap.ts            # live biome minimap
    Ticker.ts             # floating toast feed
```

All pixel-art (32 px) is generated procedurally at boot, so the repo has
zero binary assets. Drop-in replacement by real sprite sheets is trivial —
wire them up in `game/sprites/generate.ts`.

## What's "Nebula" about it?

The world tick feeds three Nebula-flavoured systems:

1. **Divinity** — each sentient, faithful creature contributes Faith every
   tick. Faith powers Mana regen and your Score which maps to a Nebula
   leaderboard rank (Bronze V → Silver III → … → Nebula).
2. **Eras** — civ progresses through Stone · Bronze · Iron · Arcane ·
   **Nebula Awakening** based on year + worshipper count.
3. **Events** — once you reach Arcane, portals may tear open on their own,
   spawning Lizardfolk (Wirae's "Nebula race"). You can also force-open one
   with the Nebula · Portal tool (40 mana).

Five quest chapters guide the early game: *Awakening → First Faith → Tower
of Trial → Rival Pantheon → Nebula Convergence*.

## License

MIT (see repo root — to be added).
