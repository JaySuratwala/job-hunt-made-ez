import Phaser from 'phaser'

export default class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    sitDirection: string = 'up'
  ) {
    super(scene, x, y, texture)

    scene.add.existing(this)
    scene.physics.add.existing(this, true) // Static body so they don't move

    // Set the correct sitting frame based on direction
    this.setFrame(`Adam_sit_${sitDirection}.png`)

    // Align depth so they render cleanly over the chair/desk
    this.setDepth(y + 5)

    // Add floating name tag above the NPC
    const nameTag = scene.add.text(x, y - 28, name, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cdd6f4',
      backgroundColor: '#11111bcc',
      padding: { x: 4, y: 2 },
    })
    nameTag.setOrigin(0.5)
    nameTag.setDepth(5000)
  }
}