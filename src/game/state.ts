import {
  MAX_MANA,
  ERAS,
  type Era,
  TECH_TREE,
  RIVAL_NAME,
  type TechEffect,
} from './config.ts';

/** Current selected tool id (e.g. 'biome:grass', 'spawn:human', 'power:fire'). */
export interface ToolSelection {
  group: 'terrain' | 'biome' | 'spawn' | 'power' | 'disaster' | 'nebula' | 'inspect';
  sub: string;
}

/** Buff accumulators applied by unlocked tech nodes. Multipliers start
 *  at 1 (neutral), additive bonuses start at 0. */
export interface Buffs {
  fertilityMult: number;
  manaRegenAdd: number;
  faithPerWorshipperMult: number;
  hungerDecayMult: number;
  defenseAdd: number;
}

export interface TechProgress {
  /** 0..cost — how much research done. */
  progress: number;
  /** true once research completes and effect is applied. */
  done: boolean;
}

/** Rival god runtime state — mirrors player stats so we can compete. */
export interface RivalGod {
  awakened: boolean;
  name: string;
  score: number;
  /** Ticks since last attack. */
  sinceAttack: number;
  /** How long player has been ahead by QUEST_RIVAL_MARGIN points. */
  aheadTicks: number;
  /** Banished once Ch.4 completes. */
  banished: boolean;
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

  /** Running total — used by Ch.3 Rift quest. */
  portalsOpened = 0;

  /** Tech progress keyed by tech id. */
  tech: Record<string, TechProgress> = Object.fromEntries(
    TECH_TREE.map((t) => [t.id, { progress: 0, done: false }]),
  );

  /** Flat buff accumulators (applied by sim). */
  buffs: Buffs = {
    fertilityMult: 1,
    manaRegenAdd: 0,
    faithPerWorshipperMult: 1,
    hungerDecayMult: 1,
    defenseAdd: 0,
  };

  /** Rival god (awakens after Ch.2). */
  rival: RivalGod = {
    awakened: false,
    name: RIVAL_NAME,
    score: 0,
    sinceAttack: 0,
    aheadTicks: 0,
    banished: false,
  };

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

  /** Apply a tech effect to buffs when research completes. */
  applyTechEffect(e: TechEffect): void {
    switch (e.kind) {
      case 'fertility':
        this.buffs.fertilityMult *= e.mult;
        break;
      case 'manaRegen':
        this.buffs.manaRegenAdd += e.add;
        break;
      case 'faithPerWorshipper':
        this.buffs.faithPerWorshipperMult *= e.mult;
        break;
      case 'hungerDecay':
        this.buffs.hungerDecayMult *= e.mult;
        break;
      case 'defense':
        this.buffs.defenseAdd += e.add;
        break;
    }
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
