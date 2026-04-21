import { Panel } from './Panel.ts';
import { bus } from '../game/events.ts';
import { WORLD_W, WORLD_H } from '../game/config.ts';

export function createMinimap(): Panel {
  const panel = new Panel({
    id: 'minimap',
    title: 'Map',
    renderBody: () => `<canvas width="${WORLD_W}" height="${WORLD_H}"></canvas>`,
    bindBody: () => {},
  });

  const canvas = panel.body.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  bus.on((ev) => {
    if (ev.type === 'minimap') {
      ctx.putImageData(ev.imageData, 0, 0);
    }
  });

  return panel;
}
