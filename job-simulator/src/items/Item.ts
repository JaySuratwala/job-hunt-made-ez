import Phaser from 'phaser'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  id?: string
  itemType?: string

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.setTint()
  }

  onOverlapDialog() {
    // Base overlap dialog hook
  }

  clearDialogBox() {
    // Base clear dialog hook
  }
}