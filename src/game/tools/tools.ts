import type { BiomeId } from '../world/Biomes.ts';
import type { SpeciesId } from '../entities/species.ts';

/** Tool catalogue surfaced in the HUD. Icons are plain unicode symbols
 *  so we don't depend on an icon font; the actual pixel-art tiles /
 *  creatures use procedurally generated sprites. */

export type ToolGroup =
  | 'inspect'
  | 'terrain'
  | 'biome'
  | 'spawn'
  | 'power'
  | 'disaster'
  | 'nebula';

export interface ToolOption {
  sub: string;
  label: string;
  icon?: string;
  /** Hint text for inspector when hovering. */
  hint?: string;
}

export interface ToolGroupDef {
  id: ToolGroup;
  label: string;
  icon: string;
  hotkey: string;
  options: ToolOption[];
}

export const TOOL_GROUPS: ToolGroupDef[] = [
  {
    id: 'inspect',
    label: 'Inspect',
    icon: '🔍',
    hotkey: '1',
    options: [{ sub: 'select', label: 'Select', hint: 'Click tile or creature' }],
  },
  {
    id: 'terrain',
    label: 'Terrain',
    icon: '⛰',
    hotkey: '2',
    options: [
      { sub: 'raise', label: 'Raise', hint: 'Raise height' },
      { sub: 'lower', label: 'Lower', hint: 'Lower height' },
    ],
  },
  {
    id: 'biome',
    label: 'Biome',
    icon: '🌿',
    hotkey: '3',
    options: [
      { sub: 'grass', label: 'Grass' },
      { sub: 'forest', label: 'Forest' },
      { sub: 'jungle', label: 'Jungle' },
      { sub: 'desert', label: 'Desert' },
      { sub: 'snow', label: 'Snow' },
      { sub: 'ocean', label: 'Ocean' },
    ] as { sub: BiomeId; label: string }[],
  },
  {
    id: 'spawn',
    label: 'Spawn',
    icon: '🐺',
    hotkey: '4',
    options: [
      { sub: 'human', label: 'Human' },
      { sub: 'orc', label: 'Orc' },
      { sub: 'dwarf', label: 'Dwarf' },
      { sub: 'elf', label: 'Elf' },
      { sub: 'sheep', label: 'Sheep' },
      { sub: 'wolf', label: 'Wolf' },
      { sub: 'dragon', label: 'Dragon' },
    ] as { sub: SpeciesId; label: string }[],
  },
  {
    id: 'power',
    label: 'Power',
    icon: '✨',
    hotkey: '5',
    options: [
      { sub: 'bless', label: 'Bless', hint: 'Buff faith (6 mana)' },
      { sub: 'curse', label: 'Curse', hint: 'Debuff (6 mana)' },
    ],
  },
  {
    id: 'disaster',
    label: 'Disaster',
    icon: '🔥',
    hotkey: '6',
    options: [
      { sub: 'fire', label: 'Fire', hint: '8 mana' },
      { sub: 'quake', label: 'Quake', hint: '15 mana' },
      { sub: 'meteor', label: 'Meteor', hint: '20 mana' },
      { sub: 'flood', label: 'Flood', hint: '18 mana' },
    ],
  },
  {
    id: 'nebula',
    label: 'Nebula',
    icon: '🪐',
    hotkey: '7',
    options: [
      { sub: 'rift', label: 'Rift', hint: 'Paint Nebula biome' },
      { sub: 'lizardfolk', label: 'Lizardfolk', hint: 'Summon a Nebula race' },
      { sub: 'portal', label: 'Portal', hint: 'Open Mystic Battleground (40 mana)' },
    ],
  },
];

export function groupDef(g: ToolGroup): ToolGroupDef {
  return TOOL_GROUPS.find((x) => x.id === g)!;
}
