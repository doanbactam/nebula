import * as Phaser from 'phaser';
import { BIOMES, type BiomeId, BIOME_ORDER } from '../world/Biomes.ts';
import { SPECIES, type SpeciesId, SPAWNABLE } from '../entities/species.ts';
import { TILE_SIZE } from '../config.ts';

/**
 * All sprites are procedurally generated 32x32 pixel-art and injected
 * into Phaser's texture cache. This keeps the repo self-contained and
 * guarantees we can ship a PR without binary assets — the style is
 * lower-res-retro on purpose to match "WorldBox"/Nebula pixel vibe.
 */

type Ctx = CanvasRenderingContext2D;

/** Deterministic PRNG so textures are stable between runs. */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w = TILE_SIZE, h = TILE_SIZE): {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
} {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function fillRect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function paintBiome(biome: BiomeId): HTMLCanvasElement {
  const def = BIOMES[biome];
  const { canvas, ctx } = makeCanvas();
  const rng = mulberry32(
    biome.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 1) >>> 0,
  );
  const [c0, c1, c2, c3] = def.palette;

  // base
  fillRect(ctx, 0, 0, TILE_SIZE, TILE_SIZE, c1);

  // speckles of c0/c2/c3
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const r = rng();
      if (r < 0.12) fillRect(ctx, x, y, 1, 1, c2);
      else if (r < 0.22) fillRect(ctx, x, y, 1, 1, c0);
      else if (r < 0.24) fillRect(ctx, x, y, 1, 1, c3);
    }
  }

  // biome-specific decor
  if (biome === 'forest' || biome === 'jungle') {
    drawTree(ctx, 8, 14, c0, c3);
    drawTree(ctx, 20, 20, c0, c3);
    if (biome === 'jungle') drawTree(ctx, 14, 6, c0, c3);
  } else if (biome === 'mountain') {
    // triangle peaks
    const [d0, d1, d2] = [c0, c2, c3];
    ctx.fillStyle = d0;
    ctx.beginPath();
    ctx.moveTo(4, 28);
    ctx.lineTo(14, 8);
    ctx.lineTo(24, 28);
    ctx.closePath();
    ctx.fill();
    fillRect(ctx, 14, 8, 2, 6, d1);
    fillRect(ctx, 13, 9, 1, 3, d2);
  } else if (biome === 'desert') {
    // dune curves
    ctx.fillStyle = c0;
    for (let x = 0; x < TILE_SIZE; x++) {
      const y = Math.floor(22 + 3 * Math.sin((x / TILE_SIZE) * Math.PI * 2));
      fillRect(ctx, x, y, 1, 2, c0);
    }
  } else if (biome === 'beach') {
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      fillRect(ctx, x, y, 2, 1, c0);
    }
  } else if (biome === 'ocean' || biome === 'deep-ocean') {
    // horizontal wavelets
    ctx.fillStyle = c3;
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 28);
      const y = Math.floor(rng() * 30) + 1;
      fillRect(ctx, x, y, 3, 1, c3);
    }
  } else if (biome === 'lava') {
    // cracks
    ctx.fillStyle = c3;
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      fillRect(ctx, x, y, 1, 1, c3);
    }
  } else if (biome === 'nebula-rift') {
    // stars
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      fillRect(ctx, x, y, 1, 1, '#ffffff');
    }
    ctx.fillStyle = c3;
    fillRect(ctx, 10, 12, 2, 2, c3);
    fillRect(ctx, 20, 20, 2, 2, c3);
  } else if (biome === 'snow') {
    // extra speckles
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      fillRect(ctx, x, y, 1, 1, '#ffffff');
    }
  }

  // subtle edge highlight
  fillRect(ctx, 0, 0, TILE_SIZE, 1, c2);
  fillRect(ctx, 0, 0, 1, TILE_SIZE, c2);

  return canvas;
}

function drawTree(ctx: Ctx, cx: number, cy: number, trunk: string, leaf: string): void {
  fillRect(ctx, cx - 1, cy - 1, 2, 4, trunk);
  fillRect(ctx, cx - 3, cy - 6, 6, 4, leaf);
  fillRect(ctx, cx - 2, cy - 8, 4, 2, leaf);
}

function paintCreature(sp: SpeciesId): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const d = SPECIES[sp];
  const [outline, body, accent, hair] = d.palette;

  switch (sp) {
    case 'sheep': {
      fillRect(ctx, 10, 20, 12, 6, body);
      fillRect(ctx, 8, 18, 4, 4, accent);
      fillRect(ctx, 10, 26, 2, 2, outline);
      fillRect(ctx, 20, 26, 2, 2, outline);
      fillRect(ctx, 9, 19, 1, 1, outline);
      break;
    }
    case 'wolf': {
      fillRect(ctx, 8, 18, 16, 6, body);
      fillRect(ctx, 22, 16, 4, 4, body);
      fillRect(ctx, 24, 15, 2, 2, accent);
      fillRect(ctx, 23, 17, 1, 1, outline);
      fillRect(ctx, 8, 24, 2, 4, outline);
      fillRect(ctx, 12, 24, 2, 4, outline);
      fillRect(ctx, 18, 24, 2, 4, outline);
      fillRect(ctx, 22, 24, 2, 4, outline);
      break;
    }
    case 'dragon': {
      fillRect(ctx, 6, 20, 20, 6, body);
      fillRect(ctx, 24, 16, 6, 6, body);
      fillRect(ctx, 27, 17, 2, 2, accent);
      fillRect(ctx, 2, 16, 4, 8, accent);
      fillRect(ctx, 10, 14, 6, 4, accent); // wing
      fillRect(ctx, 16, 14, 6, 4, accent);
      fillRect(ctx, 8, 26, 3, 4, outline);
      fillRect(ctx, 18, 26, 3, 4, outline);
      fillRect(ctx, 4, 22, 2, 2, hair);
      break;
    }
    default: {
      // humanoid template
      // head
      fillRect(ctx, 12, 8, 8, 8, accent);
      fillRect(ctx, 12, 8, 8, 2, hair); // hair
      fillRect(ctx, 14, 12, 1, 1, outline);
      fillRect(ctx, 17, 12, 1, 1, outline);
      // body
      fillRect(ctx, 11, 16, 10, 8, body);
      // legs
      fillRect(ctx, 12, 24, 3, 6, outline);
      fillRect(ctx, 17, 24, 3, 6, outline);
      // arms
      fillRect(ctx, 9, 17, 2, 6, body);
      fillRect(ctx, 21, 17, 2, 6, body);
      // species tints
      if (sp === 'orc') {
        fillRect(ctx, 18, 10, 2, 2, hair); // tusk
      }
      if (sp === 'dwarf') {
        fillRect(ctx, 11, 14, 10, 4, hair); // beard
      }
      if (sp === 'elf') {
        fillRect(ctx, 10, 10, 2, 4, accent); // ear
        fillRect(ctx, 20, 10, 2, 4, accent);
      }
      if (sp === 'lizardfolk') {
        fillRect(ctx, 12, 6, 8, 2, accent); // crest
        fillRect(ctx, 13, 4, 2, 2, hair);
        fillRect(ctx, 17, 4, 2, 2, hair);
        // tail
        fillRect(ctx, 20, 22, 6, 2, body);
        fillRect(ctx, 24, 24, 4, 2, body);
      }
      break;
    }
  }
  return canvas;
}

/** Register all generated textures on the given scene. */
export function generateAllTextures(scene: Phaser.Scene): void {
  for (const id of BIOME_ORDER) {
    const key = `tile-${id}`;
    if (scene.textures.exists(key)) continue;
    const canvas = paintBiome(id);
    scene.textures.addCanvas(key, canvas);
  }
  for (const id of SPAWNABLE) {
    const key = `cre-${id}`;
    if (scene.textures.exists(key)) continue;
    const canvas = paintCreature(id);
    scene.textures.addCanvas(key, canvas);
  }

  // A simple cursor/marker sprite.
  if (!scene.textures.exists('marker')) {
    const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    scene.textures.addCanvas('marker', canvas);
  }

  // Fire/meteor/flood overlay icons (8x8, scaled).
  if (!scene.textures.exists('fx-fire')) {
    const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
    const rng = mulberry32(42);
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      ctx.fillStyle = rng() < 0.5 ? '#ff6a1f' : '#ffd23a';
      ctx.fillRect(x, y, 2, 2);
    }
    scene.textures.addCanvas('fx-fire', canvas);
  }
  if (!scene.textures.exists('fx-portal')) {
    const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#4b1b82';
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d26fe8';
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 3, 0, Math.PI * 2);
    ctx.fill();
    scene.textures.addCanvas('fx-portal', canvas);
  }
}
