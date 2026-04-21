import { bus } from '../game/events.ts';

/** Bottom-left event ticker: floating toasts driven by bus 'toast' events. */
export function createTicker(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = 'ticker';

  bus.on((ev) => {
    if (ev.type !== 'toast') return;
    const node = document.createElement('div');
    node.className = `toast ${ev.level ?? ''}`;
    node.textContent = ev.text;
    root.appendChild(node);
    setTimeout(() => node.classList.add('fade'), 1800);
    setTimeout(() => node.remove(), 2400);
  });

  return root;
}
