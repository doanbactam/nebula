import { createTopBar } from './TopBar.ts';
import { createLeftTools } from './LeftTools.ts';
import { createRightPanel } from './RightPanel.ts';
import { createBottomBar } from './BottomBar.ts';
import { createMinimap } from './Minimap.ts';
import { createTicker } from './Ticker.ts';

/**
 * Mount every HUD panel on the given root. Returns a dispose fn.
 * Wires global keys:
 *   H   — hide/show all panels (global HUD toggle)
 *   ?   — open help modal
 *   ESC — close help modal
 */
export function mountHUD(root: HTMLElement): () => void {
  const panels = [
    createTopBar(),
    createLeftTools(),
    createRightPanel(),
    createBottomBar(),
    createMinimap(),
  ];
  for (const p of panels) root.appendChild(p.root);
  root.appendChild(createTicker());

  // Help modal
  const helpBtn = document.createElement('button');
  helpBtn.id = 'help-btn';
  helpBtn.textContent = '?';
  helpBtn.title = 'Help (? key)';
  root.appendChild(helpBtn);

  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.innerHTML = `
    <div class="inner">
      <h2>NEBULA · CONTROLS</h2>
      <div class="kbd-list">
        <code>1–7</code><span>Select tool group</span>
        <code>Click</code><span>Apply tool / spawn / paint</span>
        <code>Space</code><span>Pause / resume</span>
        <code>W A S D</code><span>Pan camera</span>
        <code>Wheel · + –</code><span>Zoom in / out</span>
        <code>H</code><span>Hide / show HUD</span>
        <code>?</code><span>Open this help</span>
        <code>ESC</code><span>Close help</span>
      </div>
      <div style="color:var(--text-dim);font-size:9px;margin-top:14px;line-height:1.6;">
        Tip: each panel has <b>–</b> to collapse and <b>×</b> to hide.
        Hidden panels return when you press <b>H</b> twice (show-all).
      </div>
      <button class="close">OK</button>
    </div>`;
  root.appendChild(modal);

  const hint = document.createElement('div');
  hint.className = 'hint-bar';
  hint.innerHTML = `<code>H</code> hide HUD · <code>?</code> help · <code>Space</code> pause`;
  root.appendChild(hint);

  const openHelp = (): void => modal.classList.add('open');
  const closeHelp = (): void => modal.classList.remove('open');
  helpBtn.addEventListener('click', openHelp);
  modal.querySelector<HTMLButtonElement>('button.close')!.addEventListener('click', closeHelp);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeHelp();
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'h' || e.key === 'H') {
      // toggle global hide; if any panel has display:none, bring them back too.
      const hidden = root.classList.toggle('hidden');
      if (!hidden) {
        for (const p of panels) p.setHidden(false);
      }
    } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      openHelp();
    } else if (e.key === 'Escape') {
      closeHelp();
    }
  };
  window.addEventListener('keydown', onKey);

  return () => {
    window.removeEventListener('keydown', onKey);
  };
}
