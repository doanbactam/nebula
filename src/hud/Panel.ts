/**
 * Base collapsible HUD panel. Panels can be individually collapsed
 * and hidden (`H`), and will remember their collapsed state in the
 * class list. Drag-by-header not yet wired — positions are fixed by
 * CSS. We keep all state in the DOM for simplicity.
 */

export interface PanelOpts {
  id: string;
  title: string;
  /** Extra classes placed on the root element. */
  rootClass?: string;
  /** Optional starting collapsed state. */
  collapsed?: boolean;
  /** Render body innerHTML. */
  renderBody: () => string;
  /** After mount — wire listeners on the body. */
  bindBody?: (body: HTMLElement) => void;
}

export class Panel {
  readonly root: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly collapseBtn: HTMLButtonElement;
  private readonly opts: PanelOpts;

  constructor(opts: PanelOpts) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.id = opts.id;
    this.root.className = `hud-panel ${opts.rootClass ?? ''}`.trim();
    if (opts.collapsed) this.root.classList.add('collapsed');

    const head = document.createElement('div');
    head.className = 'panel-head';
    head.innerHTML = `
      <div class="title"><span class="dot"></span>${opts.title}</div>
      <div class="actions">
        <button class="pbtn collapse" title="Collapse (click title)">–</button>
        <button class="pbtn close" title="Hide panel">×</button>
      </div>`;
    this.collapseBtn = head.querySelector<HTMLButtonElement>('.collapse')!;
    const closeBtn = head.querySelector<HTMLButtonElement>('.close')!;

    this.body = document.createElement('div');
    this.body.className = 'panel-body';
    this.body.innerHTML = opts.renderBody();

    this.root.appendChild(head);
    this.root.appendChild(this.body);

    head.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.actions')) return;
      this.toggleCollapsed();
    });
    this.collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapsed();
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setHidden(true);
    });

    opts.bindBody?.(this.body);
  }

  toggleCollapsed(): void {
    this.root.classList.toggle('collapsed');
    this.collapseBtn.textContent = this.root.classList.contains('collapsed')
      ? '+'
      : '–';
  }

  setHidden(hidden: boolean): void {
    this.root.style.display = hidden ? 'none' : '';
  }

  replaceBody(): void {
    this.body.innerHTML = this.opts.renderBody();
    this.opts.bindBody?.(this.body);
  }
}
