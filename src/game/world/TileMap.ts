import { WORLD_W, WORLD_H } from '../config.ts';
import { fbm } from './Noise.ts';
import type { BiomeId } from './Biomes.ts';

/** Grid-backed world data. Phaser Tilemap renders using these indices. */
export class TileMap {
  readonly w = WORLD_W;
  readonly h = WORLD_H;

  /** Biome per tile. */
  readonly biome: BiomeId[] = new Array(WORLD_W * WORLD_H).fill('ocean');
  /** Height value 0..1. */
  readonly height: number[] = new Array(WORLD_W * WORLD_H).fill(0);
  /** Temperature 0..1 (0=cold, 1=hot). */
  readonly temp: number[] = new Array(WORLD_W * WORLD_H).fill(0);
  /** Moisture 0..1. */
  readonly moist: number[] = new Array(WORLD_W * WORLD_H).fill(0);

  /** Listeners notified whenever a tile is repainted. */
  private readonly listeners = new Set<(x: number, y: number) => void>();

  index(x: number, y: number): number {
    return y * this.w + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  generate(seed: number): void {
    const w = this.w;
    const h = this.h;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(cx, cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // base fbm heightmap, dampened toward borders so we get a continent
        const n = fbm(x * 0.07, y * 0.07, seed, 5, 2.05, 0.55);
        const r = Math.hypot(x - cx, y - cy) / maxR;
        const continent = Math.max(0, 1 - r * 1.15);
        const hh = Math.max(0, Math.min(1, n * 0.65 + continent * 0.45));

        // temperature: cold at poles, hot at equator + noise
        const lat = Math.abs(y - cy) / cy; // 0=equator,1=pole
        const t = Math.max(
          0,
          Math.min(
            1,
            (1 - lat) * 0.85 + 0.15 * fbm(x * 0.09, y * 0.09, seed + 777, 3),
          ),
        );

        // moisture
        const m = fbm(x * 0.11, y * 0.11, seed + 1337, 4, 2.1, 0.5);

        const i = this.index(x, y);
        this.height[i] = hh;
        this.temp[i] = t;
        this.moist[i] = m;
        this.biome[i] = TileMap.classify(hh, t, m);
      }
    }
  }

  /** Pure classification from (height, temp, moisture). */
  static classify(hh: number, t: number, m: number): BiomeId {
    if (hh < 0.3) return 'deep-ocean';
    if (hh < 0.42) return 'ocean';
    if (hh < 0.46) return 'beach';
    if (hh > 0.82) return 'mountain';
    if (hh > 0.78 && t > 0.7 && m < 0.4) return 'lava';

    if (t < 0.25) return hh > 0.7 ? 'snow' : 'tundra';
    if (t < 0.45) return 'grass';
    if (t < 0.75) {
      if (m > 0.65) return 'forest';
      if (m < 0.35) return 'savanna';
      return 'grass';
    }
    // hot
    if (m > 0.65) return 'jungle';
    return 'desert';
  }

  setBiome(x: number, y: number, biome: BiomeId): void {
    if (!this.inBounds(x, y)) return;
    this.biome[this.index(x, y)] = biome;
    for (const l of this.listeners) l(x, y);
  }

  paintBrush(x: number, y: number, radius: number, biome: BiomeId): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        this.setBiome(x + dx, y + dy, biome);
      }
    }
  }

  onChange(fn: (x: number, y: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Sample the nearest kingdom/biome name for inspector display. */
  biomeAt(x: number, y: number): BiomeId {
    if (!this.inBounds(x, y)) return 'ocean';
    return this.biome[this.index(x, y)]!;
  }
}
