/**
 * Minimal typed event bus used for Phaser ⇄ HUD communication.
 * The HUD is DOM-based and sits outside the Phaser scene graph so we
 * pass messages through this bus instead of coupling the two.
 */

export interface TechSnapshot {
  id: string;
  label: string;
  era: string;
  desc: string;
  progress: number;
  cost: number;
  done: boolean;
  active: boolean;
}

export interface RivalSnapshot {
  awakened: boolean;
  banished: boolean;
  name: string;
  score: number;
  playerScore: number;
  margin: number;
  /** Ticks player has been ahead by the required margin. */
  aheadTicks: number;
  /** Ticks needed to banish. */
  aheadTicksTarget: number;
  /** Countdown until next attack (ticks). */
  nextAttackIn: number;
}

export type GameEvent =
  | {
      type: 'state';
      faith: number;
      mana: number;
      year: number;
      era: string;
      rank: string;
      score: number;
      population: number;
      worshippers: number;
      season: string;
    }
  | { type: 'tool-changed'; tool: string; sub?: string }
  | { type: 'speed-changed'; mult: number }
  | { type: 'selection'; target: SelectionInfo | null }
  | { type: 'toast'; text: string; level?: 'info' | 'good' | 'bad' | 'meta' }
  | {
      type: 'quest';
      id: string;
      status: 'started' | 'progress' | 'completed';
      text: string;
      progress?: number;
      target?: number;
    }
  | { type: 'feed'; text: string; level?: 'info' | 'good' | 'bad' | 'meta' }
  | { type: 'minimap'; imageData: ImageData }
  | {
      type: 'camera';
      /** Normalized viewport rect in 0..1 space over the minimap. */
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | { type: 'tech'; nodes: TechSnapshot[] }
  | { type: 'rival'; snapshot: RivalSnapshot };

export interface SelectionInfo {
  kind: 'tile' | 'creature' | 'kingdom';
  title: string;
  lines: string[];
}

type Listener = (ev: GameEvent) => void;

class Bus {
  private readonly listeners = new Set<Listener>();

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(ev: GameEvent): void {
    for (const l of this.listeners) l(ev);
  }
}

export const bus = new Bus();
