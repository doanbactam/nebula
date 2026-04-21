import * as Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene.ts';
import { WorldScene } from './game/scenes/WorldScene.ts';
import { mountHUD } from './hud/HUD.ts';

const gameRoot = document.getElementById('game-root');
const hudRoot = document.getElementById('hud-root');
const splash = document.getElementById('splash');
if (!gameRoot || !hudRoot) throw new Error('missing root containers');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: gameRoot,
  backgroundColor: '#030417',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [BootScene, WorldScene],
};

new Phaser.Game(config);
mountHUD(hudRoot);

// Hide splash once the world scene has rendered at least one frame.
setTimeout(() => splash?.classList.add('hidden'), 600);
