/** Creature species registry. Each one gets a procedural 32x32 sprite. */

export type SpeciesId =
  | 'human'
  | 'orc'
  | 'dwarf'
  | 'elf'
  | 'lizardfolk'
  | 'sheep'
  | 'wolf'
  | 'dragon';

export interface SpeciesDef {
  id: SpeciesId;
  label: string;
  /** Approx. base HP. */
  hp: number;
  /** Attack power used in skirmishes. */
  atk: number;
  /** Speed (tiles per tick). */
  speed: number;
  /** Does it worship the god if left alone? */
  faithful: boolean;
  /** Primary & secondary palette colors. */
  palette: [string, string, string, string];
  /** Is this a "sentient" race that forms kingdoms? */
  sentient: boolean;
  /** Nebula-aligned creatures (from the novel theme). */
  nebula?: boolean;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  human: {
    id: 'human',
    label: 'Human',
    hp: 10,
    atk: 3,
    speed: 0.5,
    faithful: true,
    palette: ['#2a1a0a', '#c78a56', '#5c7db9', '#ffd9ab'],
    sentient: true,
  },
  orc: {
    id: 'orc',
    label: 'Orc',
    hp: 14,
    atk: 5,
    speed: 0.45,
    faithful: false,
    palette: ['#1a2a1a', '#5e8048', '#a45a2a', '#c9d06a'],
    sentient: true,
  },
  dwarf: {
    id: 'dwarf',
    label: 'Dwarf',
    hp: 12,
    atk: 4,
    speed: 0.35,
    faithful: true,
    palette: ['#1a1a1a', '#8a5a3a', '#a6a6a6', '#f0c070'],
    sentient: true,
  },
  elf: {
    id: 'elf',
    label: 'Elf',
    hp: 9,
    atk: 3,
    speed: 0.6,
    faithful: true,
    palette: ['#0a1a0a', '#c9e0b0', '#5ab87a', '#ffe49c'],
    sentient: true,
  },
  lizardfolk: {
    id: 'lizardfolk',
    label: 'Lizardfolk',
    hp: 16,
    atk: 6,
    speed: 0.5,
    faithful: true,
    palette: ['#0a1a20', '#2ba97e', '#7ad8b1', '#f7c04d'],
    sentient: true,
    nebula: true,
  },
  sheep: {
    id: 'sheep',
    label: 'Sheep',
    hp: 4,
    atk: 0,
    speed: 0.35,
    faithful: false,
    palette: ['#202020', '#e8e8e8', '#b0b0b0', '#f5f5f5'],
    sentient: false,
  },
  wolf: {
    id: 'wolf',
    label: 'Wolf',
    hp: 8,
    atk: 4,
    speed: 0.75,
    faithful: false,
    palette: ['#101010', '#555', '#888', '#cfcfcf'],
    sentient: false,
  },
  dragon: {
    id: 'dragon',
    label: 'Dragon',
    hp: 120,
    atk: 40,
    speed: 0.9,
    faithful: false,
    palette: ['#3a0a0a', '#a11a1a', '#e04a2a', '#f5c040'],
    sentient: false,
  },
};

export const SPAWNABLE: SpeciesId[] = [
  'human',
  'orc',
  'dwarf',
  'elf',
  'lizardfolk',
  'sheep',
  'wolf',
  'dragon',
];
