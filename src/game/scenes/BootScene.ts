import * as Phaser from 'phaser';
import { generateAllTextures } from '../sprites/generate.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    generateAllTextures(this);
    this.scene.start('WorldScene');
  }
}
