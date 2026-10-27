import Item from './Item'

export default class Chair extends Item {
  itemDirection = 'down'

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.itemType = 'chair'
    this.setImmovable(true)
    
    // Anchor the chair so its base sits on the tile coordinate
    this.setOrigin(0.5, 0.75)
  }
}