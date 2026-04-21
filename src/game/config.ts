/** World + rendering constants. */
export const TILE_SIZE = 32;
export const WORLD_W = 80; // tiles
export const WORLD_H = 50; // tiles

export const TICK_MS = 250; // base simulation tick at 1x
export const SPEED_MULTS = [0, 1, 2, 4] as const; // 0 = paused

export const MAX_MANA = 100;
export const FAITH_PER_TICK_PER_WORSHIPPER = 0.04;
export const MANA_REGEN_PER_TICK = 0.6;

/** Base hunger growth per tick before biome fertility is subtracted. */
export const HUNGER_GAIN_PER_TICK = 0.42;
/** Threshold above which hunger starts damaging HP. */
export const STARVE_THRESHOLD = 42;

/**
 * Every N sim-ticks the world spawns a passive food creature (sheep) on
 * a random grass tile that has no predator nearby. Keeps civilizations
 * self-sustaining when the user idles at fast speeds.
 */
export const PASSIVE_FOOD_INTERVAL = 80;
/** Max concurrent sheep the passive spawner will maintain world-wide. */
export const PASSIVE_FOOD_CAP = 40;

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
/** Quest #3 target: Nebula portals opened. */
export const QUEST_PORTAL_TARGET = 1;
/** Quest #4 target: your score must exceed rival by this margin. */
export const QUEST_RIVAL_MARGIN = 500;

/**
 * Civ tech tree. Each node is locked to a specific era — it starts
 * researching passively the moment you enter that era. Progress fills
 * as a function of sentient worshippers + faith and when full, applies
 * a permanent buff.
 */
export interface TechNode {
  id: string;
  label: string;
  era: Era;
  /** Effort needed (arbitrary units, compared to accumulated research). */
  cost: number;
  /** Short description shown in the Tech tab. */
  desc: string;
  /** Buff applied when research completes. */
  effect: TechEffect;
}
export type TechEffect =
  | { kind: 'fertility'; mult: number }
  | { kind: 'manaRegen'; add: number }
  | { kind: 'faithPerWorshipper'; mult: number }
  | { kind: 'hungerDecay'; mult: number }
  | { kind: 'defense'; add: number };

export const TECH_TREE: TechNode[] = [
  {
    id: 'fire',
    label: 'Fire Mastery',
    era: 'Stone',
    cost: 120,
    desc: 'Tribes share fire. Hunger grows slower.',
    effect: { kind: 'hungerDecay', mult: 0.75 },
  },
  {
    id: 'agri',
    label: 'Agriculture',
    era: 'Bronze',
    cost: 320,
    desc: 'Fertile tiles feed more hungry mouths.',
    effect: { kind: 'fertility', mult: 1.55 },
  },
  {
    id: 'metal',
    label: 'Metallurgy',
    era: 'Iron',
    cost: 700,
    desc: 'Sentient races gain a +2 defense pool vs disasters.',
    effect: { kind: 'defense', add: 2 },
  },
  {
    id: 'runes',
    label: 'Arcane Runes',
    era: 'Arcane',
    cost: 1400,
    desc: 'Mana regen +0.4/tick, faith flows faster.',
    effect: { kind: 'manaRegen', add: 0.4 },
  },
  {
    id: 'ascend',
    label: 'Nebula Ascension',
    era: 'Nebula Awakening',
    cost: 3000,
    desc: 'Worshippers generate 50% more faith. End-game.',
    effect: { kind: 'faithPerWorshipper', mult: 1.5 },
  },
];

/** After this quest completes, the rival god awakens. */
export const RIVAL_AWAKEN_QUEST = 'first-faith';
/** Rival god name. */
export const RIVAL_NAME = 'Morvak';
/** Ticks between rival god attacks. */
export const RIVAL_TICK_INTERVAL = 120; // ~30 in-game years
/** Passive score gain per tick for the rival god. */
export const RIVAL_SCORE_PER_TICK = 0.6;
