import { SPECIES, type SpeciesId } from './species.ts';
import type { TileMap } from '../world/TileMap.ts';
import { BIOMES } from '../world/Biomes.ts';
import { TILE_SIZE } from '../config.ts';

let NEXT_ID = 1;

export class Creature {
  readonly id = NEXT_ID++;
  hp: number;
  age = 0;
  hunger = 0;
  /** Tile-space position (float). */
  x: number;
  y: number;
  /** Target tile. */
  tx: number;
  ty: number;
  faith = 0.5;
  dead = false;
  /** Assigned once a kingdom forms around them. */
  kingdomId: number | null = null;
  readonly species: SpeciesId;

  constructor(species: SpeciesId, x: number, y: number) {
    this.species = species;
    const def = SPECIES[species];
    this.hp = def.hp;
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;
  }

  get def() {
    return SPECIES[this.species];
  }

  /** Called every sim-tick. Returns list of offspring (may be empty). */
  tick(map: TileMap, neighbors: Creature[]): Creature[] {
    if (this.dead) return [];
    this.age++;
    this.hunger += 1;

    const def = this.def;

    // Wander / pursue
    if (
      this.tx === Math.floor(this.x) &&
      this.ty === Math.floor(this.y)
    ) {
      const ang = Math.random() * Math.PI * 2;
      const d = 1 + Math.floor(Math.random() * 3);
      this.tx = Math.max(0, Math.min(map.w - 1, Math.floor(this.x + Math.cos(ang) * d)));
      this.ty = Math.max(0, Math.min(map.h - 1, Math.floor(this.y + Math.sin(ang) * d)));
    }

    // Step toward target (respect walkable biomes).
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const step = Math.min(def.speed, dist);
      const nx = this.x + (dx / dist) * step;
      const ny = this.y + (dy / dist) * step;
      const ntile = map.biomeAt(Math.floor(nx), Math.floor(ny));
      if (BIOMES[ntile].walkable) {
        this.x = nx;
        this.y = ny;
      } else {
        // retarget
        this.tx = Math.floor(this.x);
        this.ty = Math.floor(this.y);
      }
    }

    // Feed from fertility of current tile (only non-predators).
    const bi = map.biomeAt(Math.floor(this.x), Math.floor(this.y));
    const fert = BIOMES[bi].fertility;
    if (this.species !== 'wolf' && this.species !== 'dragon') {
      this.hunger = Math.max(0, this.hunger - fert * 2.5);
    }

    // Predators eat sheep/humans nearby
    if (this.species === 'wolf' || this.species === 'dragon') {
      for (const other of neighbors) {
        if (other === this || other.dead) continue;
        if (
          (this.species === 'wolf' &&
            (other.species === 'sheep' ||
              other.species === 'human' ||
              other.species === 'elf')) ||
          (this.species === 'dragon' && other.species !== 'dragon')
        ) {
          if (Math.hypot(other.x - this.x, other.y - this.y) < 1.2) {
            other.hp -= def.atk;
            if (other.hp <= 0) {
              other.dead = true;
              this.hunger = Math.max(0, this.hunger - 6);
            }
          }
        }
      }
    }

    // Starve / age-out
    if (this.hunger > 30) this.hp -= 1;
    if (this.age > 180 + Math.random() * 60) this.hp -= 1;
    if (this.hp <= 0) {
      this.dead = true;
      return [];
    }

    // Reproduce (sparse)
    const offspring: Creature[] = [];
    if (
      this.age > 30 &&
      this.age < 140 &&
      this.hunger < 10 &&
      Math.random() < 0.004 * (0.5 + fert)
    ) {
      offspring.push(new Creature(this.species, this.x, this.y));
    }

    return offspring;
  }

  /** Pixel-space position for Phaser. */
  pixelX(): number {
    return this.x * TILE_SIZE + TILE_SIZE / 2;
  }
  pixelY(): number {
    return this.y * TILE_SIZE + TILE_SIZE / 2;
  }
}
