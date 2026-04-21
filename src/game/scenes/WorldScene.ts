import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  WORLD_W,
  WORLD_H,
  TICK_MS,
  POWER_COST,
  ERAS,
  type Era,
  ERA_SCORE,
  ERA_WORSHIPPERS,
  FAITH_PER_TICK_PER_WORSHIPPER,
  MANA_REGEN_PER_TICK,
  BRUSH_RADIUS,
  CAMERA_LERP,
  CAMERA_PAN_SPEED,
  QUEST_AWAKENING_TARGET,
  QUEST_FAITH_TARGET,
} from '../config.ts';
import { TileMap } from '../world/TileMap.ts';
import { BIOMES, type BiomeId, BIOME_ORDER } from '../world/Biomes.ts';
import { Creature } from '../entities/Creature.ts';
import { SPECIES, type SpeciesId } from '../entities/species.ts';
import { state } from '../state.ts';
import { bus } from '../events.ts';

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

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
  private creatureBob = new Map<number, number>();
  private marker?: Phaser.GameObjects.Image;
  private brushRing?: Phaser.GameObjects.Graphics;

  private tickAcc = 0;
  private simTick = 0;
  private lastMiniMap = 0;

  /** Tracks who the inspector is showing so we can refresh live. */
  private selectedCreatureId: number | null = null;
  private selectedTile: [number, number] | null = null;

  /** Camera pan target (lerped each frame for smoothness). */
  private camTargetX = 0;
  private camTargetY = 0;

  /** Questlines — very lightweight, enough for MVP linkage. */
  private questDone = new Set<string>();

  /** Used by pointer input. */
  private isDragging = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const w = WORLD_W * TILE_SIZE;
    const h = WORLD_H * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.setBackgroundColor('#030417');
    this.cameras.main.centerOn(w / 2, h / 2);
    this.camTargetX = this.cameras.main.scrollX;
    this.camTargetY = this.cameras.main.scrollY;

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
      .setAlpha(0.45);

    // Brush preview ring — a translucent circle at cursor showing the
    // affected area. Re-drawn on tool change / pointer move.
    this.brushRing = this.add.graphics();
    this.brushRing.setDepth(1001);
    this.redrawBrushRing();

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
      const spd = CAMERA_PAN_SPEED / cam.zoom;
      if (keys.up.isDown) this.camTargetY -= spd;
      if (keys.down.isDown) this.camTargetY += spd;
      if (keys.left.isDown) this.camTargetX -= spd;
      if (keys.right.isDown) this.camTargetX += spd;
      if (keys.plus.isDown) cam.setZoom(Phaser.Math.Clamp(cam.zoom + 0.02, 0.5, 3));
      if (keys.minus.isDown) cam.setZoom(Phaser.Math.Clamp(cam.zoom - 0.02, 0.5, 3));
      // Clamp target to bounds
      const maxX = WORLD_W * TILE_SIZE - cam.width / cam.zoom;
      const maxY = WORLD_H * TILE_SIZE - cam.height / cam.zoom;
      this.camTargetX = Phaser.Math.Clamp(this.camTargetX, 0, Math.max(0, maxX));
      this.camTargetY = Phaser.Math.Clamp(this.camTargetY, 0, Math.max(0, maxY));
    });

    // React to HUD tool changes — redraw brush ring.
    bus.on((ev) => {
      if (ev.type === 'tool-changed') this.redrawBrushRing();
    });

    // Spawn initial life.
    this.seedInitialCreatures();
    this.emitState();
    this.updateMinimap();
    this.emitCameraViewport();

    // Kick off chapter 1 quest.
    bus.emit({
      type: 'quest',
      id: 'awakening',
      status: 'started',
      text: `Awakening — spawn & keep ${QUEST_AWAKENING_TARGET} sentient followers alive`,
      progress: this.countWorshippers(),
      target: QUEST_AWAKENING_TARGET,
    });

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
    for (const [x, y] of pickN(14)) this.spawnCreature('sheep', x + 0.5, y + 0.5);
    for (const [x, y] of pickN(4)) this.spawnCreature('wolf', x + 0.5, y + 0.5);
    for (const [x, y] of pickN(8)) this.spawnCreature('human', x + 0.5, y + 0.5);
  }

  update(time: number, delta: number): void {
    // Smooth camera lerp toward target — runs even while paused so
    // the world still feels alive when the user pans.
    const cam = this.cameras.main;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, this.camTargetX, CAMERA_LERP);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, this.camTargetY, CAMERA_LERP);

    if (!state.paused) {
      this.tickAcc += delta * state.speedMult;
      while (this.tickAcc >= TICK_MS) {
        this.tickAcc -= TICK_MS;
        this.simTick++;
        this.advanceWorld();
      }
    }

    // Smooth sprite positions + idle bob animation every frame.
    const bobT = time * 0.006;
    for (const c of this.creatures) {
      if (c.dead) continue;
      const spr = this.creatureSprites.get(c.id);
      if (!spr) continue;
      const phase = this.creatureBob.get(c.id) ?? 0;
      const bob = Math.sin(bobT + phase) * (state.paused ? 0.2 : 0.8);
      spr.x = c.pixelX();
      spr.y = c.pixelY() + bob;
    }

    this.emitCameraViewport();
  }

  private advanceWorld(): void {
    // move/eat/reproduce
    const offspring: Creature[] = [];
    const births: SpeciesId[] = [];
    const deaths: SpeciesId[] = [];
    for (const c of this.creatures) {
      if (c.dead) continue;
      const near = this.neighborsOf(c, 2);
      const kids = c.tick(this.tileMap, near);
      offspring.push(...kids);
      for (const k of kids) births.push(k.species);
    }

    // prune dead, add offspring + fade-out tween on death sprites
    for (const c of this.creatures) {
      if (c.dead) {
        deaths.push(c.species);
        const s = this.creatureSprites.get(c.id);
        if (s) {
          this.tweens.add({
            targets: s,
            alpha: 0,
            scale: 0.6,
            duration: 400,
            onComplete: () => s.destroy(),
          });
        }
        this.creatureSprites.delete(c.id);
        this.creatureBob.delete(c.id);
        if (this.selectedCreatureId === c.id) this.selectedCreatureId = null;
      }
    }
    this.creatures = this.creatures.filter((c) => !c.dead);
    for (const o of offspring) {
      this.creatures.push(o);
      this.addCreatureSprite(o);
    }

    // faith + mana + score
    const worshippers = this.countWorshippers();
    state.addFaith(worshippers * FAITH_PER_TICK_PER_WORSHIPPER);
    // Small faith decay when there's nobody praying — keeps sandbox honest.
    if (worshippers === 0 && state.faith > 0)
      state.addFaith(-0.05);
    state.regenMana(MANA_REGEN_PER_TICK);
    state.year = Math.floor(this.simTick / 4); // 4 ticks per year
    state.score = Math.floor(state.faith + worshippers * 3 + state.year * 0.5);
    state.updateRank();

    // era progression — score + worshipper gated (both conditions).
    const currentIdx = ERAS.indexOf(state.era);
    let targetIdx = currentIdx;
    for (let i = ERAS.length - 1; i > currentIdx; i--) {
      const era = ERAS[i]!;
      if (state.score >= ERA_SCORE[era] && worshippers >= ERA_WORSHIPPERS[era]) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx > currentIdx) {
      state.era = ERAS[targetIdx]! as Era;
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

    // quest progression
    this.updateQuests(worshippers);

    // event feed: births / deaths (compact, throttled to avoid spam)
    if (this.simTick % 4 === 0 && (births.length || deaths.length)) {
      if (births.length) {
        bus.emit({
          type: 'feed',
          level: 'good',
          text: `${births.length} new ${summarizeSpecies(births)} born.`,
        });
      }
      if (deaths.length) {
        bus.emit({
          type: 'feed',
          level: 'bad',
          text: `${deaths.length} ${summarizeSpecies(deaths)} perished.`,
        });
      }
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
      }
    }

    // refresh the inspector if it's pinned on a creature/tile.
    this.refreshSelection();

    this.emitState();
    if (this.simTick - this.lastMiniMap > 3) {
      this.updateMinimap();
      this.lastMiniMap = this.simTick;
    }
  }

  private updateQuests(worshippers: number): void {
    // Ch.1 Awakening: reach N sentient worshippers alive.
    if (!this.questDone.has('awakening')) {
      bus.emit({
        type: 'quest',
        id: 'awakening',
        status: worshippers >= QUEST_AWAKENING_TARGET ? 'completed' : 'progress',
        text: `Awakening — ${worshippers}/${QUEST_AWAKENING_TARGET} sentient followers`,
        progress: worshippers,
        target: QUEST_AWAKENING_TARGET,
      });
      if (worshippers >= QUEST_AWAKENING_TARGET) {
        this.questDone.add('awakening');
        bus.emit({
          type: 'toast',
          level: 'good',
          text: 'QUEST DONE — Awakening',
        });
        bus.emit({
          type: 'feed',
          level: 'meta',
          text: `Awakening complete — ${worshippers} sentient followers walk the world.`,
        });
      }
    }
    // Ch.2 First Faith: reach N faith.
    if (this.questDone.has('awakening') && !this.questDone.has('first-faith')) {
      bus.emit({
        type: 'quest',
        id: 'first-faith',
        status: state.faith >= QUEST_FAITH_TARGET ? 'completed' : 'progress',
        text: `First Faith — ${Math.floor(state.faith)}/${QUEST_FAITH_TARGET} faith`,
        progress: Math.floor(state.faith),
        target: QUEST_FAITH_TARGET,
      });
      if (state.faith >= QUEST_FAITH_TARGET) {
        this.questDone.add('first-faith');
        bus.emit({
          type: 'toast',
          level: 'good',
          text: 'QUEST DONE — First Faith',
        });
        bus.emit({
          type: 'feed',
          level: 'meta',
          text: `First Faith complete — you're named on the Nebula ladder.`,
        });
      }
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

  private countWorshippers(): number {
    let n = 0;
    for (const c of this.creatures)
      if (!c.dead && c.def.faithful && c.def.sentient) n++;
    return n;
  }

  private emitState(): void {
    const season = SEASONS[Math.floor(state.year / 4) % SEASONS.length]!;
    bus.emit({
      type: 'state',
      faith: state.faith,
      mana: state.mana,
      year: state.year,
      era: state.era,
      rank: state.rank,
      score: state.score,
      population: this.creatures.length,
      worshippers: this.countWorshippers(),
      season,
    });
  }

  private emitCameraViewport(): void {
    const cam = this.cameras.main;
    const wpx = WORLD_W * TILE_SIZE;
    const hpx = WORLD_H * TILE_SIZE;
    bus.emit({
      type: 'camera',
      x: cam.scrollX / wpx,
      y: cam.scrollY / hpx,
      w: cam.width / cam.zoom / wpx,
      h: cam.height / cam.zoom / hpx,
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
    if (this.brushRing) {
      this.brushRing.x = tx * TILE_SIZE + TILE_SIZE / 2;
      this.brushRing.y = ty * TILE_SIZE + TILE_SIZE / 2;
    }
    if (this.isDragging) this.handleTool(p);
  }

  /** Re-draw brush ring whenever the tool changes. */
  private redrawBrushRing(): void {
    if (!this.brushRing) return;
    this.brushRing.clear();
    const r = BRUSH_RADIUS[state.tool.group] ?? 0;
    const sizePx = (r + 0.5) * TILE_SIZE;
    const color = ({
      biome: 0x4fd1ff,
      terrain: 0xc89e6b,
      spawn: 0xffffff,
      power: 0xffd860,
      disaster: 0xff5d5d,
      nebula: 0xff7ad1,
      inspect: 0x8b7cff,
    } as Record<string, number>)[state.tool.group] ?? 0xffffff;
    this.brushRing.lineStyle(2, color, 0.75);
    this.brushRing.strokeCircle(0, 0, sizePx);
    this.brushRing.fillStyle(color, 0.08);
    this.brushRing.fillCircle(0, 0, sizePx);
  }

  private handleTool(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);
    if (!this.tileMap.inBounds(tx, ty)) return;

    const { group, sub } = state.tool;
    const r = BRUSH_RADIUS[group] ?? 0;

    switch (group) {
      case 'inspect':
        this.inspectAt(tx, ty);
        break;
      case 'biome':
        this.tileMap.paintBrush(tx, ty, r, sub as BiomeId);
        break;
      case 'terrain':
        this.raiseLower(tx, ty, sub === 'raise' ? 1 : -1);
        break;
      case 'spawn':
        this.spawnCreature(sub as SpeciesId, tx + 0.5, ty + 0.5);
        bus.emit({ type: 'feed', level: 'good', text: `Spawned a ${sub} at (${tx},${ty}).` });
        break;
      case 'power':
        if (sub === 'bless' && state.spendMana(POWER_COST.bless!)) {
          this.blessAt(tx, ty);
        } else if (sub === 'curse' && state.spendMana(POWER_COST.curse!)) {
          this.curseAt(tx, ty);
        } else {
          bus.emit({ type: 'toast', level: 'bad', text: 'Not enough mana.' });
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
    let n = 0;
    for (const c of this.creatures) {
      if (Math.hypot(c.x - x, c.y - y) < 3) {
        c.hp = Math.min(c.hp + 5, c.def.hp);
        c.faith = Math.min(1, c.faith + 0.2);
        n++;
      }
    }
    state.addFaith(3 + n);
    bus.emit({ type: 'toast', level: 'good', text: `Blessing granted (${n} touched).` });
    bus.emit({ type: 'feed', level: 'good', text: `Blessed ${n} souls at (${x},${y}).` });
  }

  private curseAt(x: number, y: number): void {
    let n = 0;
    for (const c of this.creatures) {
      if (Math.hypot(c.x - x, c.y - y) < 3) {
        c.hp -= 3;
        if (c.hp <= 0) c.dead = true;
        n++;
      }
    }
    state.addFaith(-2);
    bus.emit({ type: 'toast', level: 'bad', text: `Curse unleashed (${n} touched).` });
    bus.emit({ type: 'feed', level: 'bad', text: `Cursed ${n} souls at (${x},${y}).` });
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
    bus.emit({
      type: 'feed',
      level: 'bad',
      text: `${kind.toUpperCase()} struck (${x},${y}).`,
    });
    bus.emit({ type: 'toast', level: 'bad', text: `${kind.toUpperCase()}!` });
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
      bus.emit({ type: 'feed', level: 'meta', text: `Nebula rift painted at (${x},${y}).` });
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
      this.spawnCreature(
        'lizardfolk',
        x + 0.5 + (Math.random() - 0.5),
        y + 0.5 + (Math.random() - 0.5),
      );
    }
    bus.emit({
      type: 'feed',
      level: 'meta',
      text: intentional
        ? 'You tore open a Mystic Battleground portal.'
        : 'A Mystic Battleground portal ruptures reality!',
    });
    bus.emit({
      type: 'toast',
      level: 'meta',
      text: intentional ? 'NEBULA PORTAL' : 'WILD NEBULA RIFT',
    });
    bus.emit({
      type: 'quest',
      id: 'portal',
      status: 'progress',
      text: 'Nebula portal opened',
    });
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
    // spawn pop-in tween
    img.setScale(0.3);
    this.tweens.add({
      targets: img,
      scale: 1,
      duration: 220,
      ease: 'Back.Out',
    });
    this.creatureSprites.set(c.id, img);
    this.creatureBob.set(c.id, Math.random() * Math.PI * 2);
  }

  private inspectAt(x: number, y: number): void {
    // Creature click?
    let best: Creature | null = null;
    let bestD = 1.4;
    for (const c of this.creatures) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - (x + 0.5), c.y - (y + 0.5));
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best) {
      this.selectedCreatureId = best.id;
      this.selectedTile = null;
      this.emitCreatureSelection(best);
      return;
    }
    this.selectedCreatureId = null;
    this.selectedTile = [x, y];
    this.emitTileSelection(x, y);
  }

  private emitCreatureSelection(c: Creature): void {
    const d = c.def;
    bus.emit({
      type: 'selection',
      target: {
        kind: 'creature',
        title: `${d.label} #${c.id}`,
        lines: [
          `HP: ${Math.max(0, Math.round(c.hp))}/${d.hp}`,
          `Age: ${c.age} yr`,
          `Hunger: ${Math.round(c.hunger)}`,
          `Faith: ${(c.faith * 100).toFixed(0)}%`,
          `Kind: ${d.sentient ? 'sentient' : 'beast'}${d.nebula ? ' · nebula' : ''}`,
          `Tile: ${BIOMES[this.tileMap.biomeAt(Math.floor(c.x), Math.floor(c.y))].label}`,
        ],
      },
    });
  }

  private emitTileSelection(x: number, y: number): void {
    const biome = this.tileMap.biomeAt(x, y);
    const def = BIOMES[biome];
    // count creatures on or very near this tile
    let near = 0;
    for (const c of this.creatures) {
      if (!c.dead && Math.floor(c.x) === x && Math.floor(c.y) === y) near++;
    }
    bus.emit({
      type: 'selection',
      target: {
        kind: 'tile',
        title: `${def.label} (${x},${y})`,
        lines: [
          `Walkable: ${def.walkable ? 'yes' : 'no'}`,
          `Fertility: ${(def.fertility * 100).toFixed(0)}%`,
          `Creatures here: ${near}`,
          def.nebula ? 'Nebula-aligned terrain' : '',
        ].filter(Boolean),
      },
    });
  }

  /** Re-emit selection each tick so HP/age etc update live. */
  private refreshSelection(): void {
    if (this.selectedCreatureId !== null) {
      const c = this.creatures.find(
        (x) => x.id === this.selectedCreatureId && !x.dead,
      );
      if (c) this.emitCreatureSelection(c);
      else {
        this.selectedCreatureId = null;
        bus.emit({ type: 'selection', target: null });
      }
    } else if (this.selectedTile) {
      const [x, y] = this.selectedTile;
      this.emitTileSelection(x, y);
    }
  }

  /** Re-skin a tile image after a biome change. */
  private refreshTile(x: number, y: number): void {
    const i = y * WORLD_W + x;
    const img = this.tiles[i];
    if (!img) return;
    img.setTexture(`tile-${this.tileMap.biomeAt(x, y)}`);
  }

  /** Render minimap image data → HUD. */
  private updateMinimap(): void {
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
    // overlay creature dots — sentient=gold, beast=white, nebula=magenta
    for (const c of this.creatures) {
      if (c.dead) continue;
      const x = Math.floor(c.x);
      const y = Math.floor(c.y);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      if (c.def.nebula) {
        img.data[i] = 255;
        img.data[i + 1] = 122;
        img.data[i + 2] = 209;
      } else if (c.def.sentient) {
        img.data[i] = 246;
        img.data[i + 1] = 196;
        img.data[i + 2] = 83;
      } else {
        img.data[i] = 235;
        img.data[i + 1] = 235;
        img.data[i + 2] = 235;
      }
      img.data[i + 3] = 255;
    }
    bus.emit({ type: 'minimap', imageData: img });
  }
}

function summarizeSpecies(arr: SpeciesId[]): string {
  // humans -> "humans", one mixed -> "creatures"
  const set = new Set(arr);
  if (set.size === 1) {
    const only = arr[0]!;
    return only + (arr.length > 1 ? 's' : '');
  }
  return 'creatures';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// mild "compile-time" sanity check that all biomes have textures via import
void BIOME_ORDER;
void SPECIES;
