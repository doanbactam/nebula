import { MAX_MANA, ERAS, type Era } from './config.ts';

/** Current selected tool id (e.g. 'biome:grass', 'spawn:human', 'power:fire'). */
export interface ToolSelection {
  group: 'terrain' | 'biome' | 'spawn' | 'power' | 'disaster' | 'nebula' | 'inspect';
  sub: string;
}

export class GameState {
  /** God / meta. */
  godName = 'Srtt';
  rank = 'Unranked';
  score = 0;
  faith = 50;
  mana = MAX_MANA;
  year = 0;
  era: Era = ERAS[0];

  /** Simulation. */
  speedMult = 1;
  paused = false;

  /** Currently selected tool. */
  tool: ToolSelection = { group: 'inspect', sub: 'select' };

  setSpeed(mult: number): void {
    this.speedMult = mult;
    this.paused = mult === 0;
  }

  spendMana(amount: number): boolean {
    if (this.mana < amount) return false;
    this.mana -= amount;
    return true;
  }

  addFaith(delta: number): void {
    this.faith = Math.max(0, this.faith + delta);
  }

  regenMana(delta: number): void {
    this.mana = Math.min(MAX_MANA, this.mana + delta);
  }

  /** Recompute rank based on current score. */
  updateRank(): void {
    const s = this.score;
    if (s < 100) this.rank = 'Bronze V';
    else if (s < 400) this.rank = 'Silver III';
    else if (s < 1200) this.rank = 'Gold II';
    else if (s < 4000) this.rank = 'Platinum I';
    else if (s < 12000) this.rank = 'Diamond';
    else this.rank = 'Nebula';
  }
}

export const state = new GameState();
