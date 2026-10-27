import Phaser from 'phaser'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  itemType = ''

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    scene.add.existing(this)
    scene.physics.add.existing(this, true)

    // Default origin for Tiled bottom-left alignment
    this.setOrigin(0.5, 1)
  }
}