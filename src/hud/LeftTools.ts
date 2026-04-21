import { Panel } from './Panel.ts';
import { TOOL_GROUPS, type ToolGroup } from '../game/tools/tools.ts';
import { state } from '../game/state.ts';
import { bus } from '../game/events.ts';

export function createLeftTools(): Panel {
  let expanded: ToolGroup | null = null;

  const renderSub = (group: ToolGroup): string => {
    const def = TOOL_GROUPS.find((g) => g.id === group)!;
    return `
      <div class="tool-sub">
        ${def.options
          .map(
            (o) => `
              <button class="sub-btn ${
                state.tool.group === group && state.tool.sub === o.sub
                  ? 'active'
                  : ''
              }" data-group="${group}" data-sub="${o.sub}" title="${o.hint ?? ''}">
                ${o.label}
              </button>`,
          )
          .join('')}
      </div>`;
  };

  const render = (): string => {
    return TOOL_GROUPS.map((g) => {
      const active = state.tool.group === g.id;
      return `
        <div class="tool-group" data-group="${g.id}">
          <button class="tool-btn ${active ? 'active' : ''}" data-group="${g.id}">
            ${g.icon}<span class="kbd">${g.hotkey}</span>
          </button>
          <div class="label">${g.label}</div>
          ${expanded === g.id ? renderSub(g.id) : ''}
        </div>`;
    }).join('');
  };

  const panel = new Panel({
    id: 'left-tools',
    title: 'Tools',
    renderBody: render,
    bindBody: bind,
  });

  function bind(body: HTMLElement): void {
    // `panel` may still be in the TDZ during the very first construction
    // (bindBody is called from the Panel ctor, before `const panel = ...`
    // resolves). Defer the class toggle until after construction.
    queueMicrotask(() => {
      panel.root.classList.toggle('expanded', expanded !== null);
    });

    body.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.group as ToolGroup;
        const def = TOOL_GROUPS.find((x) => x.id === g)!;
        if (def.options.length > 1) {
          expanded = expanded === g ? null : g;
        } else {
          // single-option group: apply immediately
          state.tool = { group: g, sub: def.options[0]!.sub };
          expanded = null;
          bus.emit({
            type: 'tool-changed',
            tool: g,
            sub: def.options[0]!.sub,
          });
        }
        panel.replaceBody();
      });
    });

    body.querySelectorAll<HTMLButtonElement>('.sub-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.group as ToolGroup;
        const sub = btn.dataset.sub!;
        state.tool = { group: g, sub };
        bus.emit({ type: 'tool-changed', tool: g, sub });
        panel.replaceBody();
      });
    });
  }

  // Hotkey selection
  window.addEventListener('keydown', (e) => {
    const g = TOOL_GROUPS.find((x) => x.hotkey === e.key);
    if (!g) return;
    if (g.options.length > 1) {
      expanded = g.id;
    } else {
      state.tool = { group: g.id, sub: g.options[0]!.sub };
      bus.emit({
        type: 'tool-changed',
        tool: g.id,
        sub: g.options[0]!.sub,
      });
      expanded = null;
    }
    panel.replaceBody();
  });

  return panel;
}
