/**
 * Minimal typed event bus used for Phaser ⇄ HUD communication.
 * The HUD is DOM-based and sits outside the Phaser scene graph so we
 * pass messages through this bus instead of coupling the two.
 */

export type GameEvent =
  | { type: 'state'; faith: number; mana: number; year: number; era: string; rank: string; score: number }
  | { type: 'tool-changed'; tool: string; sub?: string }
  | { type: 'speed-changed'; mult: number }
  | { type: 'selection'; target: SelectionInfo | null }
  | { type: 'toast'; text: string; level?: 'info' | 'good' | 'bad' | 'meta' }
  | { type: 'quest'; id: string; status: 'started' | 'progress' | 'completed'; text: string }
  | { type: 'feed'; text: string; level?: 'info' | 'good' | 'bad' | 'meta' }
  | { type: 'minimap'; imageData: ImageData };

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
