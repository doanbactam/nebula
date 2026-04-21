import { Panel } from './Panel.ts';
import { state } from '../game/state.ts';
import { MAX_MANA } from '../game/config.ts';
import { bus } from '../game/events.ts';

export function createTopBar(): Panel {
  const panel = new Panel({
    id: 'top-bar',
    title: 'Pantheon',
    renderBody: () => `
      <div class="god-id">
        <div class="sigil"></div>
        <div>
          <div class="name" id="god-name"></div>
          <div class="rank" id="god-rank"></div>
        </div>
      </div>
      <div class="stat faith">
        <span>FAITH</span>
        <span class="val" id="stat-faith">0</span>
      </div>
      <div class="stat mana">
        <span>MANA</span>
        <div class="bar"><span id="stat-mana-bar" style="width:100%"></span></div>
      </div>
      <div class="stat era">
        <span>ERA</span>
        <span class="val" id="stat-era">Stone</span>
      </div>
      <div class="stat year">
        <span>YEAR · SEASON</span>
        <span class="val" id="stat-year">0 · Spring</span>
      </div>
      <div class="stat pop">
        <span>POP · WORSHIP</span>
        <span class="val" id="stat-pop">0 · 0</span>
      </div>
      <div class="stat score">
        <span>SCORE</span>
        <span class="val" id="stat-score">0</span>
      </div>`,
  });

  const $name = panel.body.querySelector<HTMLElement>('#god-name')!;
  const $rank = panel.body.querySelector<HTMLElement>('#god-rank')!;
  const $faith = panel.body.querySelector<HTMLElement>('#stat-faith')!;
  const $mana = panel.body.querySelector<HTMLElement>('#stat-mana-bar')!;
  const $era = panel.body.querySelector<HTMLElement>('#stat-era')!;
  const $year = panel.body.querySelector<HTMLElement>('#stat-year')!;
  const $pop = panel.body.querySelector<HTMLElement>('#stat-pop')!;
  const $score = panel.body.querySelector<HTMLElement>('#stat-score')!;

  let lastPop = 0;
  let lastWorship = 0;
  let lastSeason = 'Spring';

  const refresh = (): void => {
    $name.textContent = `God ${state.godName}`;
    $rank.textContent = state.rank;
    $faith.textContent = Math.floor(state.faith).toLocaleString();
    $mana.style.width = `${(state.mana / MAX_MANA) * 100}%`;
    $era.textContent = state.era;
    $year.textContent = `${state.year} · ${lastSeason}`;
    $pop.textContent = `${lastPop} · ${lastWorship}`;
    $score.textContent = state.score.toLocaleString();
  };

  refresh();
  bus.on((ev) => {
    if (ev.type === 'state') {
      lastPop = ev.population;
      lastWorship = ev.worshippers;
      lastSeason = ev.season;
      refresh();
    }
  });
  return panel;
}
