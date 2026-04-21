import { Panel } from './Panel.ts';
import { bus } from '../game/events.ts';
import { WORLD_W, WORLD_H } from '../game/config.ts';

export function createMinimap(): Panel {
  const panel = new Panel({
    id: 'minimap',
    title: 'Map',
    renderBody: () =>
      `<div class="mini-wrap">
         <canvas class="mini-world" width="${WORLD_W}" height="${WORLD_H}"></canvas>
         <canvas class="mini-overlay" width="${WORLD_W}" height="${WORLD_H}"></canvas>
       </div>`,
    bindBody: () => {},
  });

  const world = panel.body.querySelector<HTMLCanvasElement>('canvas.mini-world')!;
  const overlay = panel.body.querySelector<HTMLCanvasElement>('canvas.mini-overlay')!;
  const wCtx = world.getContext('2d')!;
  const oCtx = overlay.getContext('2d')!;
  wCtx.imageSmoothingEnabled = false;
  oCtx.imageSmoothingEnabled = false;

  let cam = { x: 0, y: 0, w: 1, h: 1 };

  const drawOverlay = (): void => {
    oCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    const x = cam.x * WORLD_W;
    const y = cam.y * WORLD_H;
    const w = Math.max(1, cam.w * WORLD_W);
    const h = Math.max(1, cam.h * WORLD_H);
    // Gold fill first, then a thicker stroke on top for clear visibility
    // even at small minimap scales.
    oCtx.fillStyle = 'rgba(246,196,83,0.22)';
    oCtx.fillRect(x, y, w, h);
    oCtx.strokeStyle = 'rgba(246,196,83,1.0)';
    oCtx.lineWidth = 2;
    oCtx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
  };

  bus.on((ev) => {
    if (ev.type === 'minimap') {
      wCtx.putImageData(ev.imageData, 0, 0);
    } else if (ev.type === 'camera') {
      cam = { x: ev.x, y: ev.y, w: ev.w, h: ev.h };
      drawOverlay();
    }
  });

  return panel;
}
