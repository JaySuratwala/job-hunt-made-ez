import Phaser from 'phaser'
import type { ItemType } from '../../types/Items'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  itemType: ItemType | '' = ''
  private dialogBox?: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    scene.add.existing(this)
    scene.physics.add.existing(this, true)

    // Align with Tiled's bottom-left object origin coordinate system
    this.setOrigin(0, 1)
  }

  setDialogBox(text: string) {
    this.clearDialogBox()

    const label = this.scene.add.text(this.x, this.y - this.height - 4, text, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#11111b',
      padding: { x: 4, y: 2 },
    })
    const bounds = label.getBounds()
    const background = this.scene.add.graphics()
      .fillStyle(0xcdd6f4, 1)
      .fillRoundedRect(bounds.x - 2, bounds.y - 1, bounds.width + 4, bounds.height + 2, 3)
      .lineStyle(1, 0x45475a, 1)
      .strokeRoundedRect(bounds.x - 2, bounds.y - 1, bounds.width + 4, bounds.height + 2, 3)

    this.dialogBox = this.scene.add.container(0, 0, [background, label]).setDepth(10000)
  }

  clearDialogBox() {
    this.dialogBox?.destroy(true)
    this.dialogBox = undefined
  }
}