import Phaser from 'phaser'

export default class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: string, name: string) {
    super(scene, x, y, texture, frame)

    scene.add.existing(this)
    scene.physics.add.existing(this, true) // Static body so you bump into them

    // Add a floating name tag above the NPC
    const nameTag = scene.add.text(x, y - 24, name, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#cdd6f4',
      backgroundColor: '#11111bcc',
      padding: { x: 4, y: 2 },
    })
    nameTag.setOrigin(0.5)
    nameTag.setDepth(5000)

    this.setDepth(y)
  }
}