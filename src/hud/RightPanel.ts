import { Panel } from './Panel.ts';
import {
  bus,
  type SelectionInfo,
  type TechSnapshot,
  type RivalSnapshot,
} from '../game/events.ts';

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
  progress?: number;
  target?: number;
}

const CHAPTERS: QuestItem[] = [
  {
    id: 'awakening',
    title: 'Ch.1 · Awakening',
    desc: 'Spawn your first civilization. Keep 12 sentient followers alive.',
    status: 'active',
    progress: 0,
    target: 12,
  },
  {
    id: 'first-faith',
    title: 'Ch.2 · First Faith',
    desc: 'Reach 200 Faith to be formally named on the Nebula ladder.',
    status: 'locked',
    progress: 0,
    target: 200,
  },
  {
    id: 'portal',
    title: 'Ch.3 · Nebula Rift',
    desc: 'Open a Mystic Battleground portal in the Arcane era.',
    status: 'locked',
    progress: 0,
    target: 1,
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
  let tab: 'quest' | 'inspector' | 'events' | 'tech' | 'ranking' = 'quest';
  let selection: SelectionInfo | null = null;
  let bodyEl: HTMLElement | null = null;
  const feed: FeedItem[] = [];
  let techNodes: TechSnapshot[] = [];
  let rival: RivalSnapshot | null = null;
  let playerScore = 0;

  const tabs = `
    <div class="tabs">
      <button class="tab" data-tab="quest">Quest</button>
      <button class="tab" data-tab="inspector">Inspector</button>
      <button class="tab" data-tab="events">Events</button>
      <button class="tab" data-tab="tech">Tech</button>
      <button class="tab" data-tab="ranking">Rank</button>
    </div>
    <div class="tab-panel" data-tab="quest"></div>
    <div class="tab-panel" data-tab="inspector"></div>
    <div class="tab-panel" data-tab="events"></div>
    <div class="tab-panel" data-tab="tech"></div>
    <div class="tab-panel" data-tab="ranking"></div>
  `;

  const panel = new Panel({
    id: 'right-panel',
    title: 'Pantheon Log',
    renderBody: () => tabs,
    bindBody: bind,
  });

  function renderQuest(): string {
    return CHAPTERS.map((q) => {
      const activeCls =
        q.status === 'done'
          ? 'done'
          : q.status === 'active' || q.status === 'progress'
          ? 'active'
          : '';
      const badge =
        q.status === 'done'
          ? '<span class="q-badge done">✓ done</span>'
          : q.status === 'progress' || q.status === 'active'
          ? '<span class="q-badge active">in progress</span>'
          : '<span class="q-badge">locked</span>';
      let bar = '';
      if (q.target && (q.status === 'active' || q.status === 'progress' || q.status === 'done')) {
        const pct = Math.min(100, Math.round(((q.progress ?? 0) / q.target) * 100));
        bar = `
          <div class="q-bar"><span style="width:${pct}%"></span></div>
          <div class="q-prog">${q.progress ?? 0} / ${q.target}</div>`;
      }
      return `
        <div class="quest-item ${activeCls}">
          <div class="q-head">
            <div class="q-title">${q.title}</div>
            ${badge}
          </div>
          <div class="q-desc">${q.desc}</div>
          ${bar}
        </div>`;
    }).join('');
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

  function renderTech(): string {
    if (!techNodes.length) {
      return `<p>Research begins as soon as your civilization takes shape.</p>`;
    }
    return techNodes
      .map((n) => {
        const pct = Math.min(100, Math.round((n.progress / n.cost) * 100));
        const cls = n.done ? 'done' : n.active ? 'active' : 'locked';
        const badge = n.done
          ? '<span class="q-badge done">✓ done</span>'
          : n.active
          ? '<span class="q-badge active">researching</span>'
          : '<span class="q-badge">locked</span>';
        return `
          <div class="quest-item ${cls}">
            <div class="q-head">
              <div class="q-title">${n.label} <span style="color:var(--text-dim);">· ${n.era}</span></div>
              ${badge}
            </div>
            <div class="q-desc">${n.desc}</div>
            <div class="q-bar"><span style="width:${pct}%"></span></div>
            <div class="q-prog">${Math.floor(n.progress)} / ${n.cost}</div>
          </div>`;
      })
      .join('');
  }

  function renderRanking(): string {
    const you = {
      name: 'YOU',
      score: playerScore,
    };
    const baseline = [
      { name: 'Aether', score: 9820 },
      { name: 'Lithe', score: 4420 },
      { name: 'Orin', score: 780 },
    ];
    const entries = [...baseline, you];
    if (rival?.awakened && !rival.banished) {
      entries.push({ name: rival.name + ' (rival)', score: rival.score });
    } else if (rival?.banished) {
      entries.push({ name: rival.name + ' (banished)', score: rival.score });
    }
    entries.sort((a, b) => b.score - a.score);

    const rows = entries
      .map((x, i) => {
        const isYou = x.name === 'YOU';
        const isRival =
          rival && (x.name.startsWith(rival.name));
        const style = isYou
          ? 'color:var(--accent);'
          : isRival
          ? 'color:var(--bad);'
          : '';
        return `<p style="${style}">#${i + 1} ${x.name}: ${x.score.toLocaleString()}</p>`;
      })
      .join('');

    const rivalBlock =
      rival?.awakened && !rival.banished
        ? `<div class="rival-card">
            <div class="q-title" style="color:var(--bad);">${rival.name}</div>
            <div class="q-desc">Rival god encroaches. Outscore them by ${rival.margin}.</div>
            <div class="q-bar"><span style="width:${Math.min(
              100,
              Math.round(
                (rival.aheadTicks / Math.max(1, rival.aheadTicksTarget)) * 100,
              ),
            )}%; background:linear-gradient(90deg,var(--bad),var(--gold));"></span></div>
            <div class="q-prog">${rival.aheadTicks} / ${rival.aheadTicksTarget} yrs ahead · next strike in ${rival.nextAttackIn}t</div>
          </div>`
        : rival?.banished
        ? `<div class="rival-card">
            <div class="q-title" style="color:var(--good);">${rival.name} banished</div>
            <div class="q-desc">The rival pantheon has receded. Nebula Convergence beckons.</div>
          </div>`
        : '';

    return `
      <h4>Nebula Leaderboard (server tick)</h4>
      ${rivalBlock}
      ${rows}
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
    get('tech').innerHTML = renderTech();
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
      playerScore = ev.score;
      // stamp newest feed items with current year
      if (feed.length > 0) {
        const last = feed[feed.length - 1]!;
        if (last.t === 0) last.t = ev.year;
      }
      if (tab === 'ranking') refreshAll();
    } else if (ev.type === 'tech') {
      techNodes = ev.nodes;
      if (tab === 'tech') refreshAll();
    } else if (ev.type === 'rival') {
      rival = ev.snapshot;
      if (tab === 'ranking' || tab === 'quest') refreshAll();
    } else if (ev.type === 'quest') {
      const q = CHAPTERS.find((c) => c.id === ev.id);
      if (q) {
        if (ev.status === 'completed') q.status = 'done';
        else if (ev.status === 'started') q.status = 'active';
        else if (ev.status === 'progress')
          q.status = q.status === 'done' ? 'done' : 'progress';
        if (typeof ev.progress === 'number') q.progress = ev.progress;
        if (typeof ev.target === 'number') q.target = ev.target;
        // auto-unlock next chapter when current is done
        if (ev.status === 'completed') {
          const i = CHAPTERS.findIndex((c) => c.id === ev.id);
          const next = CHAPTERS[i + 1];
          if (next && next.status === 'locked') next.status = 'active';
        }
        if (tab === 'quest') refreshAll();
      }
    }
  });

  return panel;
}
