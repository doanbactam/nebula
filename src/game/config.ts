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

/**
 * Score thresholds to unlock each era (index matches ERAS).
 * A civ must also have enough sustained sentient worshippers.
 */
export const ERA_SCORE: Record<Era, number> = {
  Stone: 0,
  Bronze: 150,
  Iron: 800,
  Arcane: 2500,
  'Nebula Awakening': 8000,
};
export const ERA_WORSHIPPERS: Record<Era, number> = {
  Stone: 0,
  Bronze: 6,
  Iron: 18,
  Arcane: 40,
  'Nebula Awakening': 80,
};

/** Brush radius per tool group. */
export const BRUSH_RADIUS: Record<string, number> = {
  biome: 2,
  terrain: 1,
  spawn: 0,
  power: 0,
  disaster: 0,
  nebula: 0,
  inspect: 0,
};

/** Camera pan lerp factor (0..1); higher = snappier. */
export const CAMERA_LERP = 0.18;
/** Base pan speed in pixels per frame at zoom=1. */
export const CAMERA_PAN_SPEED = 10;

/** Quest #1 target: sentient worshippers alive. */
export const QUEST_AWAKENING_TARGET = 12;
/** Quest #2 target: faith value. */
export const QUEST_FAITH_TARGET = 200;
