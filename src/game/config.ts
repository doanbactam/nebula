/** World + rendering constants. */
export const TILE_SIZE = 32;
export const WORLD_W = 80; // tiles
export const WORLD_H = 50; // tiles

export const TICK_MS = 250; // base simulation tick at 1x
export const SPEED_MULTS = [0, 1, 2, 4] as const; // 0 = paused

export const MAX_MANA = 100;
export const FAITH_PER_TICK_PER_WORSHIPPER = 0.04;
export const MANA_REGEN_PER_TICK = 0.6;

/** Cost of each god power in mana. */
export const POWER_COST: Record<string, number> = {
  'fire': 8,
  'meteor': 20,
  'quake': 15,
  'flood': 18,
  'bless': 6,
  'curse': 6,
  'nebula-portal': 40,
};

/** Eras ladder — civ progress. */
export const ERAS = [
  'Stone',
  'Bronze',
  'Iron',
  'Arcane',
  'Nebula Awakening',
] as const;
export type Era = (typeof ERAS)[number];
