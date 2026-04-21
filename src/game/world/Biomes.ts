/** Biome registry. Each biome maps to a generated 32x32 sprite frame. */

export type BiomeId =
  | 'deep-ocean'
  | 'ocean'
  | 'beach'
  | 'grass'
  | 'forest'
  | 'jungle'
  | 'savanna'
  | 'desert'
  | 'tundra'
  | 'snow'
  | 'mountain'
  | 'lava'
  | 'nebula-rift';

export interface BiomeDef {
  id: BiomeId;
  label: string;
  /** Base pixel-art palette: up to 4 colors used procedurally. */
  palette: [string, string, string, string];
  /** Is it walkable by creatures? */
  walkable: boolean;
  /** Fertility (0..1) — used for population growth. */
  fertility: number;
  /** Is this a "god-created" (nebula) biome? */
  nebula?: boolean;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  'deep-ocean': {
    id: 'deep-ocean',
    label: 'Deep Ocean',
    palette: ['#0a1a4a', '#132a6e', '#1a3590', '#2247b5'],
    walkable: false,
    fertility: 0,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    palette: ['#1a3590', '#2247b5', '#2c5ac9', '#3e74de'],
    walkable: false,
    fertility: 0,
  },
  beach: {
    id: 'beach',
    label: 'Beach',
    palette: ['#d9c47a', '#e6d28c', '#f0df9e', '#fbeab0'],
    walkable: true,
    fertility: 0.1,
  },
  grass: {
    id: 'grass',
    label: 'Grassland',
    palette: ['#2f6b2a', '#3f8a36', '#4fa942', '#62c251'],
    walkable: true,
    fertility: 0.9,
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    palette: ['#153818', '#1e4a21', '#2b6a2e', '#388b3b'],
    walkable: true,
    fertility: 0.7,
  },
  jungle: {
    id: 'jungle',
    label: 'Jungle',
    palette: ['#0f3a1a', '#155024', '#1f6c33', '#2a8f43'],
    walkable: true,
    fertility: 0.8,
  },
  savanna: {
    id: 'savanna',
    label: 'Savanna',
    palette: ['#7a7a2b', '#968a38', '#b9a441', '#d4b654'],
    walkable: true,
    fertility: 0.5,
  },
  desert: {
    id: 'desert',
    label: 'Desert',
    palette: ['#b28a3e', '#c89a4c', '#dbad60', '#eec179'],
    walkable: true,
    fertility: 0.15,
  },
  tundra: {
    id: 'tundra',
    label: 'Tundra',
    palette: ['#5a6a72', '#7c8a92', '#9babb3', '#bfcdd4'],
    walkable: true,
    fertility: 0.2,
  },
  snow: {
    id: 'snow',
    label: 'Snow',
    palette: ['#b6c5d0', '#d2dce5', '#e6edf2', '#f5f8fb'],
    walkable: true,
    fertility: 0.1,
  },
  mountain: {
    id: 'mountain',
    label: 'Mountain',
    palette: ['#4a4552', '#605963', '#79717d', '#958d98'],
    walkable: false,
    fertility: 0,
  },
  lava: {
    id: 'lava',
    label: 'Lava',
    palette: ['#3a0a08', '#8a1a10', '#d43814', '#f5861d'],
    walkable: false,
    fertility: 0,
  },
  'nebula-rift': {
    id: 'nebula-rift',
    label: 'Nebula Rift',
    palette: ['#1a0a3a', '#4b1b82', '#8a3cb8', '#d26fe8'],
    walkable: true,
    fertility: 0.4,
    nebula: true,
  },
};

export const BIOME_ORDER: BiomeId[] = [
  'deep-ocean',
  'ocean',
  'beach',
  'grass',
  'forest',
  'jungle',
  'savanna',
  'desert',
  'tundra',
  'snow',
  'mountain',
  'lava',
  'nebula-rift',
];
