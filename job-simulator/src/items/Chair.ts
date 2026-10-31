import { ItemType } from '../../types/Items'
import Item from './Item'
import Player from '../characters/Players'

export default class Chair extends Item {
  itemDirection?: string
  isOccupied = false

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.itemType = ItemType.CHAIR
    
    // Lock the origin so the chair base aligns perfectly with the desk tile
    this.setOrigin(0.5, 0.75)
    // Adjust physics body for the chair
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.setSize(24, 24)
      body.setOffset(4, 32)
    }
    
    this.setImmovable(true)
  }

  onOverlapDialog() {
    if (!this.isOccupied) {
      this.setDialogBox('Press E to sit')
    }
  }

  interact(player: Player) {
    if (this.isOccupied) return
    this.isOccupied = true
    player.setPosition(this.x, this.y)
    player.sit(this.itemDirection || 'down')
  }
}