import Phaser from 'phaser'
import { PlayerBehavior } from '../../types/PlayerBehaviour'

/**
 * shifting distance for sitting animation
 * format: direction: [xShift, yShift, depthShift]
 */
export const sittingShiftData = {
  up: [0, 3, -10],
  down: [0, 3, 1],
  left: [0, -8, 10],
  right: [0, -8, 10],
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd: Record<string, Phaser.Input.Keyboard.Key>
  public isSitting = false
  public playerBehavior = PlayerBehavior.IDLE
  private playerTexture: string

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture)
    this.playerTexture = texture

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Set a smaller collision box so you can fit between desks
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(16, 24)
    body.setOffset(8, 16)

    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
  }

  sit(dir: string) {
    this.isSitting = true
    this.playerBehavior = PlayerBehavior.SITTING
    
    // Apply the shifting data for precise cushion alignment
    const shift = sittingShiftData[dir as keyof typeof sittingShiftData]
    if (shift) {
      this.x += shift[0]
      this.y += shift[1]
      this.setDepth(this.depth + shift[2])
    }

    // Play the correct sitting animation frame
    this.anims.play(`${this.playerTexture}_sit_${dir}`, true)

    // Disable movement physics while seated
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = false
    }
  }

  unsit() {
    this.isSitting = false
    this.playerBehavior = PlayerBehavior.IDLE
    
    // Re-enable physics body
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.enable = true
    }

    this.anims.play(`${this.playerTexture}_idle_down`, true)
  }

  update() {
    if (this.isSitting) {
      if (
        this.cursors.left.isDown || this.wasd.A.isDown ||
        this.cursors.right.isDown || this.wasd.D.isDown ||
        this.cursors.up.isDown || this.wasd.W.isDown ||
        this.cursors.down.isDown || this.wasd.S.isDown
      ) {
        // When pressing movement keys while seated, stand up
        this.unsit()
      } else {
        // Force depth so they render correctly over the chair cushion while sitting
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