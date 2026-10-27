import Phaser from 'phaser'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  itemType = ''

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    scene.add.existing(this)
    scene.physics.add.existing(this, true)

    // Align with Tiled's bottom-left object origin coordinate system
    this.setOrigin(0, 1)
  }
}