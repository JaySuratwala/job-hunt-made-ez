import Item from './Item'

export default class Chair extends Item {
  itemDirection?: string

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    // Adjust physics body for chairs
    this.setImmovable(true)
  }
}