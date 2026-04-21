import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  WORLD_W,
  WORLD_H,
  TICK_MS,
  POWER_COST,
  ERAS,
  FAITH_PER_TICK_PER_WORSHIPPER,
  MANA_REGEN_PER_TICK,
} from '../config.ts';
import { TileMap } from '../world/TileMap.ts';
import { BIOMES, type BiomeId, BIOME_ORDER } from '../world/Biomes.ts';
import { Creature } from '../entities/Creature.ts';
import { SPECIES, type SpeciesId } from '../entities/species.ts';
import { state } from '../state.ts';
import { bus } from '../events.ts';

/**
 * Main world scene. Renders a tilemap of biomes + creatures as
 * Phaser Images. Handles input (brush/spawn/power), tick loop,
 * and broadcasts state/selection events to the DOM HUD.
 */
export class WorldScene extends Phaser.Scene {
  private tileMap!: TileMap;
  /** Phaser Image per tile (for simplicity). */
  private tiles: Phaser.GameObjects.Image[] = [];
  private creatures: Creature[] = [];
  private creatureSprites = new Map<number, Phaser.GameObjects.Image>();
  private marker?: Phaser.GameObjects.Image;

  private tickAcc = 0;
  private simTick = 0;
  private lastMiniMap = 0;

  /** Used by pointer input. */
  private isDragging = false;
  private brushRadius = 1;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const w = WORLD_W * TILE_SIZE;
    const h = WORLD_H * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.setBackgroundColor('#030417');

    this.tileMap = new TileMap();
    this.tileMap.generate(Math.floor(Math.random() * 1_000_000));

    // Create tile sprites (80x50 = 4000, fine for MVP).
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const biome = this.tileMap.biomeAt(x, y);
        const img = this.add.image(
          x * TILE_SIZE,
          y * TILE_SIZE,
          `tile-${biome}`,
        );
        img.setOrigin(0, 0);
        this.tiles.push(img);
      }
    }

    this.tileMap.onChange((x, y) => this.refreshTile(x, y));

    this.marker = this.add
      .image(0, 0, 'marker')
      .setOrigin(0, 0)
      .setDepth(1000)
      .setAlpha(0.6);

    // Camera controls.
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const zoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.0015, 0.5, 3);
      this.cameras.main.setZoom(zoom);
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', () => (this.isDragging = false));

    // Keyboard pan.
    const keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      plus: Phaser.Input.Keyboard.KeyCodes.PLUS,
      minus: Phaser.Input.Keyboard.KeyCodes.MINUS,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.events.on('update', () => {
      const cam = this.cameras.main;
      const spd = 6 / cam.zoom;
      if (keys.up.isDown) cam.scrollY -= spd;
      if (keys.down.isDown) cam.scrollY += spd;
      if (keys.left.isDown) cam.scrollX -= spd;
      if (keys.right.isDown) cam.scrollX += spd;
      if (keys.plus.isDown) cam.setZoom(Phaser.Math.Clamp(cam.zoom + 0.02, 0.5, 3));
      if (keys.minus.isDown) cam.setZoom(Phaser.Math.Clamp(cam.zoom - 0.02, 0.5, 3));
    });

    // Spawn initial life.
    this.seedInitialCreatures();
    this.emitState();
    this.updateMinimap(true);

    // Toast "the universe awakens".
    bus.emit({
      type: 'feed',
      level: 'meta',
      text: 'The Nebula pantheon awakens. Your civilization begins.',
    });
  }

  /** Scatter some starter life on fertile land so the sim is lively. */
  private seedInitialCreatures(): void {
    const candidates: Array<[number, number]> = [];
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const b = this.tileMap.biomeAt(x, y);
        if (BIOMES[b].walkable && BIOMES[b].fertility > 0.4)
          candidates.push([x, y]);
      }
    }
    if (candidates.length === 0) return;
    const pickN = (n: number): Array<[number, number]> => {
      const out: Array<[number, number]> = [];
      for (let i = 0; i < n; i++)
        out.push(candidates[(Math.random() * candidates.length) | 0]!);
      return out;
    };
    for (const [x, y] of pickN(12)) this.spawnCreature('sheep', x + 0.5, y + 0.5);
    for (const [x, y] of pickN(4)) this.spawnCreature('wolf', x + 0.5, y + 0.5);
    for (const [x, y] of pickN(8)) this.spawnCreature('human', x + 0.5, y + 0.5);
  }

  update(_time: number, delta: number): void {
    if (!state.paused) {
      this.tickAcc += delta * state.speedMult;
      while (this.tickAcc >= TICK_MS) {
        this.tickAcc -= TICK_MS;
        this.simTick++;
        this.advanceWorld();
      }
    }

    // Smooth sprite positions every frame.
    for (const c of this.creatures) {
      if (c.dead) continue;
      const spr = this.creatureSprites.get(c.id);
      if (spr) {
        spr.x = c.pixelX();
        spr.y = c.pixelY();
      }
    }
  }

  private advanceWorld(): void {
    // move/eat/reproduce
    const offspring: Creature[] = [];
    for (const c of this.creatures) {
      if (c.dead) continue;
      const near = this.neighborsOf(c, 2);
      offspring.push(...c.tick(this.tileMap, near));
    }

    // prune dead, add offspring
    for (const c of this.creatures) {
      if (c.dead) {
        const s = this.creatureSprites.get(c.id);
        if (s) {
          s.destroy();
          this.creatureSprites.delete(c.id);
        }
      }
    }
    this.creatures = this.creatures.filter((c) => !c.dead);
    for (const o of offspring) {
      this.creatures.push(o);
      this.addCreatureSprite(o);
    }

    // faith + mana + score
    let worshippers = 0;
    for (const c of this.creatures)
      if (c.def.faithful && c.def.sentient) worshippers++;
    state.addFaith(worshippers * FAITH_PER_TICK_PER_WORSHIPPER);
    state.regenMana(MANA_REGEN_PER_TICK);
    state.year = Math.floor(this.simTick / 4); // 4 ticks per year
    state.score = Math.floor(state.faith + worshippers * 3);
    state.updateRank();

    // era progression: unlock next era every ~75 years of sustained growth
    const targetIdx = Math.min(
      ERAS.length - 1,
      Math.floor(state.year / 75) +
        Math.floor(worshippers / 40),
    );
    const current = ERAS.indexOf(state.era);
    if (targetIdx > current) {
      state.era = ERAS[targetIdx]!;
      bus.emit({
        type: 'feed',
        level: 'good',
        text: `Civilization advanced to the ${state.era} era.`,
      });
      bus.emit({
        type: 'toast',
        level: 'good',
        text: `NEW ERA — ${state.era}`,
      });
    }

    // nebula portal spontaneous event
    if (
      state.era === 'Arcane' &&
      this.simTick % 160 === 0 &&
      Math.random() < 0.35
    ) {
      const x = (Math.random() * WORLD_W) | 0;
      const y = (Math.random() * WORLD_H) | 0;
      if (BIOMES[this.tileMap.biomeAt(x, y)].walkable) {
        this.openNebulaPortal(x, y, false);
        bus.emit({
          type: 'feed',
          level: 'meta',
          text: 'A wild Nebula rift tears open on its own…',
        });
      }
    }

    this.emitState();
    if (this.simTick - this.lastMiniMap > 4) {
      this.updateMinimap(false);
      this.lastMiniMap = this.simTick;
    }
  }

  private neighborsOf(c: Creature, r: number): Creature[] {
    const r2 = r * r;
    const out: Creature[] = [];
    for (const o of this.creatures) {
      if (o === c || o.dead) continue;
      const dx = o.x - c.x;
      const dy = o.y - c.y;
      if (dx * dx + dy * dy <= r2) out.push(o);
    }
    return out;
  }

  private emitState(): void {
    bus.emit({
      type: 'state',
      faith: state.faith,
      mana: state.mana,
      year: state.year,
      era: state.era,
      rank: state.rank,
      score: state.score,
    });
  }

  /* ---------------------- input / tools ---------------------- */

  private onPointerDown(p: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.handleTool(p);
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);
    if (this.marker) {
      this.marker.x = tx * TILE_SIZE;
      this.marker.y = ty * TILE_SIZE;
    }
    if (this.isDragging) this.handleTool(p);
  }

  private handleTool(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);
    if (!this.tileMap.inBounds(tx, ty)) return;

    const { group, sub } = state.tool;

    switch (group) {
      case 'inspect':
        this.inspectAt(tx, ty);
        break;
      case 'biome':
        this.tileMap.paintBrush(tx, ty, this.brushRadius, sub as BiomeId);
        break;
      case 'terrain':
        this.raiseLower(tx, ty, sub === 'raise' ? 1 : -1);
        break;
      case 'spawn':
        this.spawnCreature(sub as SpeciesId, tx + 0.5, ty + 0.5);
        break;
      case 'power':
        if (sub === 'bless' && state.spendMana(POWER_COST.bless!)) {
          this.blessAt(tx, ty);
        } else if (sub === 'curse' && state.spendMana(POWER_COST.curse!)) {
          this.curseAt(tx, ty);
        }
        break;
      case 'disaster':
        this.disaster(sub, tx, ty);
        break;
      case 'nebula':
        this.nebulaTool(sub, tx, ty);
        break;
    }

    this.emitState();
  }

  /** Raise/lower single tile by cycling biome ladder. */
  private raiseLower(x: number, y: number, dir: 1 | -1): void {
    const order: BiomeId[] = [
      'deep-ocean',
      'ocean',
      'beach',
      'grass',
      'forest',
      'mountain',
    ];
    const cur = this.tileMap.biomeAt(x, y);
    const idx = order.indexOf(cur);
    const next = order[
      Math.max(0, Math.min(order.length - 1, idx === -1 ? 3 : idx + dir))
    ]!;
    this.tileMap.setBiome(x, y, next);
  }

  private blessAt(x: number, y: number): void {
    for (const c of this.creatures) {
      if (Math.hypot(c.x - x, c.y - y) < 3) {
        c.hp = Math.min(c.hp + 5, c.def.hp);
        c.faith = Math.min(1, c.faith + 0.2);
      }
    }
    state.addFaith(3);
    bus.emit({ type: 'toast', level: 'good', text: 'Blessing granted.' });
  }

  private curseAt(x: number, y: number): void {
    for (const c of this.creatures) {
      if (Math.hypot(c.x - x, c.y - y) < 3) {
        c.hp -= 3;
        if (c.hp <= 0) c.dead = true;
      }
    }
    state.addFaith(-2);
    bus.emit({ type: 'toast', level: 'bad', text: 'Curse unleashed.' });
  }

  private disaster(kind: string, x: number, y: number): void {
    const cost = POWER_COST[kind] ?? 0;
    if (!state.spendMana(cost)) {
      bus.emit({ type: 'toast', level: 'bad', text: 'Not enough mana.' });
      return;
    }
    switch (kind) {
      case 'fire':
        this.spawnFx('fx-fire', x, y, 2, 220);
        this.damageArea(x, y, 2, 5);
        break;
      case 'quake':
        this.damageArea(x, y, 4, 8);
        this.cameras.main.shake(400, 0.012);
        break;
      case 'meteor':
        this.tileMap.setBiome(x, y, 'lava');
        this.spawnFx('fx-fire', x, y, 3, 400);
        this.damageArea(x, y, 3, 40);
        this.cameras.main.shake(500, 0.02);
        break;
      case 'flood':
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            if (dx * dx + dy * dy <= 4)
              this.tileMap.setBiome(x + dx, y + dy, 'ocean');
        break;
    }
    bus.emit({ type: 'feed', level: 'bad', text: `${kind.toUpperCase()} struck (${x},${y}).` });
  }

  private damageArea(x: number, y: number, r: number, dmg: number): void {
    for (const c of this.creatures) {
      if (Math.hypot(c.x - x, c.y - y) <= r) {
        c.hp -= dmg;
        if (c.hp <= 0) c.dead = true;
      }
    }
  }

  private spawnFx(key: string, x: number, y: number, r: number, ms: number): void {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const img = this.add
          .image((x + dx) * TILE_SIZE, (y + dy) * TILE_SIZE, key)
          .setOrigin(0, 0)
          .setDepth(900);
        this.tweens.add({
          targets: img,
          alpha: 0,
          duration: ms,
          onComplete: () => img.destroy(),
        });
      }
    }
  }

  private nebulaTool(sub: string, x: number, y: number): void {
    if (sub === 'rift') {
      this.tileMap.setBiome(x, y, 'nebula-rift');
    } else if (sub === 'lizardfolk') {
      this.spawnCreature('lizardfolk', x + 0.5, y + 0.5);
      bus.emit({
        type: 'feed',
        level: 'meta',
        text: 'A Lizardfolk heralds the Nebula Covenant.',
      });
    } else if (sub === 'portal') {
      if (!state.spendMana(POWER_COST['nebula-portal']!)) {
        bus.emit({ type: 'toast', level: 'bad', text: 'Not enough mana.' });
        return;
      }
      this.openNebulaPortal(x, y, true);
    }
  }

  private openNebulaPortal(x: number, y: number, intentional: boolean): void {
    // paint rift cluster
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (dx * dx + dy * dy <= 1) this.tileMap.setBiome(x + dx, y + dy, 'nebula-rift');
    // fx
    const img = this.add
      .image(x * TILE_SIZE, y * TILE_SIZE, 'fx-portal')
      .setOrigin(0, 0)
      .setDepth(950);
    this.tweens.add({
      targets: img,
      scale: { from: 0.2, to: 1.4 },
      alpha: { from: 1, to: 0 },
      duration: 1600,
      onComplete: () => img.destroy(),
    });
    // spawn a few lizardfolk
    for (let i = 0; i < 3; i++) {
      this.spawnCreature('lizardfolk', x + 0.5 + (Math.random() - 0.5), y + 0.5 + (Math.random() - 0.5));
    }
    bus.emit({
      type: 'feed',
      level: 'meta',
      text: intentional
        ? 'You tore open a Mystic Battleground portal.'
        : 'A Mystic Battleground portal ruptures reality!',
    });
    bus.emit({ type: 'quest', id: 'portal', status: 'progress', text: 'Nebula portal opened' });
  }

  private spawnCreature(sp: SpeciesId, x: number, y: number): Creature {
    const c = new Creature(sp, x, y);
    this.creatures.push(c);
    this.addCreatureSprite(c);
    return c;
  }

  private addCreatureSprite(c: Creature): void {
    const img = this.add
      .image(c.pixelX(), c.pixelY(), `cre-${c.species}`)
      .setOrigin(0.5, 0.5)
      .setDepth(500);
    this.creatureSprites.set(c.id, img);
  }

  private inspectAt(x: number, y: number): void {
    // Creature click?
    let best: Creature | null = null;
    let bestD = 1.4;
    for (const c of this.creatures) {
      const d = Math.hypot(c.x - (x + 0.5), c.y - (y + 0.5));
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best) {
      const d = best.def;
      bus.emit({
        type: 'selection',
        target: {
          kind: 'creature',
          title: `${d.label} #${best.id}`,
          lines: [
            `HP: ${Math.max(0, Math.round(best.hp))}/${d.hp}`,
            `Age: ${best.age}`,
            `Faith: ${(best.faith * 100).toFixed(0)}%`,
            `Species: ${d.sentient ? 'sentient' : 'beast'}${d.nebula ? ' · nebula' : ''}`,
          ],
        },
      });
      return;
    }
    const biome = this.tileMap.biomeAt(x, y);
    const def = BIOMES[biome];
    bus.emit({
      type: 'selection',
      target: {
        kind: 'tile',
        title: `${def.label} (${x},${y})`,
        lines: [
          `Walkable: ${def.walkable ? 'yes' : 'no'}`,
          `Fertility: ${(def.fertility * 100).toFixed(0)}%`,
          def.nebula ? 'Nebula-aligned terrain' : '',
        ].filter(Boolean),
      },
    });
  }

  /** Re-skin a tile image after a biome change. */
  private refreshTile(x: number, y: number): void {
    const i = y * WORLD_W + x;
    const img = this.tiles[i];
    if (!img) return;
    img.setTexture(`tile-${this.tileMap.biomeAt(x, y)}`);
  }

  /** Render minimap image data → HUD. */
  private updateMinimap(_initial: boolean): void {
    const w = WORLD_W;
    const h = WORLD_H;
    const img = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const b = this.tileMap.biomeAt(x, y);
        const color = BIOMES[b].palette[1]!;
        const [r, g, bl] = hexToRgb(color);
        const i = (y * w + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = bl;
        img.data[i + 3] = 255;
      }
    }
    // overlay creature dots
    for (const c of this.creatures) {
      const x = Math.floor(c.x);
      const y = Math.floor(c.y);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 230;
      img.data[i + 2] = 140;
      img.data[i + 3] = 255;
    }
    bus.emit({ type: 'minimap', imageData: img });
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// mild "compile-time" sanity check that all biomes have textures via import
void BIOME_ORDER;
void SPECIES;
