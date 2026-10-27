import Phaser from 'phaser'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd: Record<string, Phaser.Input.Keyboard.Key>
  public isSitting = false

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Set a smaller collision box so you can fit between desks
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(16, 24)
    body.setOffset(8, 16)

    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
  }

  sit(direction: string) {
    this.isSitting = true
    this.setVelocity(0, 0)
    this.setFrame(`Adam_sit_${direction}.png`) 
  }

  update() {
    if (this.isSitting) {
      if (
        this.cursors.left.isDown || this.wasd.A.isDown ||
        this.cursors.right.isDown || this.wasd.D.isDown ||
        this.cursors.up.isDown || this.wasd.W.isDown ||
        this.cursors.down.isDown || this.wasd.S.isDown
      ) {
        this.isSitting = false
      } else {
        // FIX: Force depth massive enough to always render over the chair cushion
        this.setDepth(this.y + 100)
        return 
      }
    }

    const speed = 200
    let vx = 0
    let vy = 0

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= speed
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += speed

    this.setVelocity(vx, vy)

    if (!this.isSitting) {
        this.setFrame('Adam_idle_anim_1.png')
    }

    this.setDepth(this.y) 
  }
}