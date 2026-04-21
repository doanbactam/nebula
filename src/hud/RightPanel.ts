import { Panel } from './Panel.ts';
import { bus, type SelectionInfo } from '../game/events.ts';

interface FeedItem {
  t: number;
  text: string;
  level: 'info' | 'good' | 'bad' | 'meta';
}

interface QuestItem {
  id: string;
  title: string;
  desc: string;
  status: 'locked' | 'active' | 'progress' | 'done';
}

const CHAPTERS: QuestItem[] = [
  {
    id: 'awakening',
    title: 'Ch.1 · Awakening',
    desc: 'Spawn your first civilization. Keep 12 sentient followers alive.',
    status: 'active',
  },
  {
    id: 'first-faith',
    title: 'Ch.2 · First Faith',
    desc: 'Reach 200 Faith to be formally named on the Nebula ladder.',
    status: 'locked',
  },
  {
    id: 'tower',
    title: 'Ch.3 · Tower of Trial',
    desc: 'Survive a natural Nebula rift and keep your worshippers alive.',
    status: 'locked',
  },
  {
    id: 'rival',
    title: 'Ch.4 · Rival Pantheon',
    desc: 'An invader god encroaches your map. Repel them.',
    status: 'locked',
  },
  {
    id: 'convergence',
    title: 'Ch.5 · Nebula Convergence',
    desc: 'Ascend a civilization to the Nebula Awakening era.',
    status: 'locked',
  },
];

export function createRightPanel(): Panel {
  let tab: 'quest' | 'inspector' | 'events' | 'ranking' = 'quest';
  let selection: SelectionInfo | null = null;
  let bodyEl: HTMLElement | null = null;
  const feed: FeedItem[] = [];

  const tabs = `
    <div class="tabs">
      <button class="tab" data-tab="quest">Quest</button>
      <button class="tab" data-tab="inspector">Inspector</button>
      <button class="tab" data-tab="events">Events</button>
      <button class="tab" data-tab="ranking">Rank</button>
    </div>
    <div class="tab-panel" data-tab="quest"></div>
    <div class="tab-panel" data-tab="inspector"></div>
    <div class="tab-panel" data-tab="events"></div>
    <div class="tab-panel" data-tab="ranking"></div>
  `;

  const panel = new Panel({
    id: 'right-panel',
    title: 'Pantheon Log',
    renderBody: () => tabs,
    bindBody: bind,
  });

  function renderQuest(): string {
    return CHAPTERS.map(
      (q) => `
        <div class="quest-item ${q.status === 'active' || q.status === 'progress' ? 'active' : ''}">
          <div class="q-title">${q.title}</div>
          <div class="q-desc">${q.desc}</div>
        </div>`,
    ).join('');
  }

  function renderInspector(): string {
    if (!selection) {
      return `<p>Nothing selected. Pick the <b>Inspect</b> tool (1) and click any tile or creature.</p>`;
    }
    return `
      <h4>${selection.title}</h4>
      ${selection.lines.map((l) => `<p>${l}</p>`).join('')}
    `;
  }

  function renderEvents(): string {
    if (!feed.length) return `<p>No events yet. The world is still young.</p>`;
    return feed
      .slice(-60)
      .reverse()
      .map(
        (f) => `
          <div class="event-item ${f.level === 'meta' ? 'meta' : ''}">
            <time>YR ${f.t}</time>
            ${f.text}
          </div>`,
      )
      .join('');
  }

  function renderRanking(): string {
    const me = [
      { name: 'Aether', score: 9820 },
      { name: 'Morvak', score: 7210 },
      { name: 'Lithe', score: 4420 },
      { name: 'YOU', score: -1 /* placeholder */ },
      { name: 'Orin', score: 780 },
    ];
    return `
      <h4>Nebula Leaderboard (server tick)</h4>
      ${me
        .map(
          (x) => `<p>${x.name === 'YOU' ? '<span style="color:var(--accent);">' : ''}${x.name}</span>: ${
            x.score === -1 ? '<span id="rank-me-score">0</span>' : x.score
          }</p>`,
        )
        .join('')}
      <p style="color:var(--text-dim);font-size:9px;margin-top:8px;">
        Score updates live as Faith and civilization maturity grow.
      </p>
    `;
  }

  function bind(body: HTMLElement): void {
    bodyEl = body;
    body.querySelectorAll<HTMLButtonElement>('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = btn.dataset.tab as typeof tab;
        refreshAll();
      });
    });
    refreshAll();
  }

  function refreshAll(): void {
    if (!bodyEl) return;
    const tabs = bodyEl.querySelectorAll<HTMLElement>('.tab');
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    const panels = bodyEl.querySelectorAll<HTMLElement>('.tab-panel');
    panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === tab));

    const get = (k: string): HTMLElement =>
      bodyEl!.querySelector<HTMLElement>(`.tab-panel[data-tab="${k}"]`)!;
    get('quest').innerHTML = renderQuest();
    get('inspector').innerHTML = renderInspector();
    get('events').innerHTML = renderEvents();
    get('ranking').innerHTML = renderRanking();
  }

  bus.on((ev) => {
    if (ev.type === 'selection') {
      selection = ev.target;
      if (tab !== 'inspector' && selection) {
        tab = 'inspector';
      }
      refreshAll();
    } else if (ev.type === 'feed') {
      feed.push({ t: 0, text: ev.text, level: ev.level ?? 'info' });
      if (feed.length > 200) feed.shift();
      if (tab === 'events') refreshAll();
    } else if (ev.type === 'state') {
      // stamp newest feed items with current year
      if (feed.length > 0) {
        const last = feed[feed.length - 1]!;
        if (last.t === 0) last.t = ev.year;
      }
      const me = bodyEl?.querySelector<HTMLElement>('#rank-me-score');
      if (me) me.textContent = ev.score.toLocaleString();
    } else if (ev.type === 'quest') {
      const q = CHAPTERS.find((c) => c.id === ev.id);
      if (q) {
        if (ev.status === 'completed') q.status = 'done';
        else if (ev.status === 'progress') q.status = 'progress';
        if (tab === 'quest') refreshAll();
      }
    }
  });

  return panel;
}
