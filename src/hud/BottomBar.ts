import { Panel } from './Panel.ts';
import { SPEED_MULTS } from '../game/config.ts';
import { state } from '../game/state.ts';
import { bus } from '../game/events.ts';

const LABELS = ['⏸', '▶', '▶▶', '▶▶▶'];

export function createBottomBar(): Panel {
  const panel = new Panel({
    id: 'bottom-bar',
    title: 'Time',
    renderBody: () => `
      <div class="time-ctrl">
        ${SPEED_MULTS.map(
          (m, i) => `
            <button class="time-btn ${i === 1 ? 'active' : ''}"
                    data-mult="${m}" title="Speed ${m}×">
              ${LABELS[i]}
            </button>`,
        ).join('')}
      </div>
      <div class="hint-year" style="color:var(--text-dim);font-size:9px;letter-spacing:1px;">
        YR <span id="time-year">0</span>
      </div>`,
    bindBody: bind,
  });

  function bind(body: HTMLElement): void {
    body.querySelectorAll<HTMLButtonElement>('.time-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mult = Number(btn.dataset.mult);
        state.setSpeed(mult);
        body.querySelectorAll('.time-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        bus.emit({ type: 'speed-changed', mult });
      });
    });
  }

  bus.on((ev) => {
    if (ev.type === 'state') {
      const el = panel.body.querySelector<HTMLElement>('#time-year');
      if (el) el.textContent = ev.year.toString();
    }
  });

  // Spacebar toggles pause.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      const next = state.speedMult === 0 ? 1 : 0;
      state.setSpeed(next);
      const btns = panel.body.querySelectorAll<HTMLButtonElement>('.time-btn');
      btns.forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.mult) === next);
      });
    }
  });

  return panel;
}
