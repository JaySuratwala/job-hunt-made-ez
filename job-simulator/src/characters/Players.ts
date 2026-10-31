import Phaser from 'phaser'
import { PlayerBehavior } from '../../types/PlayerBehaviour'
import { isTextInputFocused } from '../game/keyboard'
import { useStore } from '../store'

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
  public playerBehavior: PlayerBehavior = PlayerBehavior.IDLE
  private playerTexture: string
  private facingDirection = 'down'
  private nameTag: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture)
    this.playerTexture = texture

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.setSize(16, 24)
      body.setOffset(8, 16)
    }
    this.nameTag = scene.add.text(x, y - 28, useStore.getState().playerName, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#cdd6f4',
      backgroundColor: '#11111bcc',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(6000)
    this.anims.play(`${this.playerTexture}_idle_${this.facingDirection}`)

    const keyboard = scene.input.keyboard!
    this.cursors = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }, false) as Phaser.Types.Input.Keyboard.CursorKeys
    this.wasd = keyboard.addKeys('W,A,S,D', false) as Record<string, Phaser.Input.Keyboard.Key>
  }

  sit(dir: string) {
    this.isSitting = true
    this.playerBehavior = PlayerBehavior.SITTING
    
    const shift = sittingShiftData[dir as keyof typeof sittingShiftData]
    if (shift) {
      this.x += shift[0]
      this.y += shift[1]
      this.setDepth(this.depth + shift[2])
    }

    const animKey = `${this.playerTexture}_sit_${dir}`
    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true)
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) body.enable = false
  }

  unsit() {
    this.isSitting = false
    this.playerBehavior = PlayerBehavior.IDLE
    
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) body.enable = true

    const animKey = `${this.playerTexture}_idle_${this.facingDirection}`
    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true)
    }
  }

  setDisplayName(name: string) {
    this.nameTag.setText(name)
  }

  update() {
    this.nameTag.setPosition(this.x, this.y - 28)
    this.nameTag.setDepth(this.depth + 1)

    if (useStore.getState().chatOnlyMode || isTextInputFocused()) {
      this.setVelocity(0, 0)
      if (!this.isSitting) this.anims.play(`${this.playerTexture}_idle_${this.facingDirection}`, true)
      return
    }

    // If sitting, freeze velocity and depth sort cleanly
    if (this.isSitting) {
      this.setVelocity(0, 0)
      this.setDepth(this.y + 100)
      return
    }

    const speed = 200
    let vx = 0
    let vy = 0
    let direction = this.facingDirection

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx -= speed
      direction = 'left'
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx += speed
      direction = 'right'
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy -= speed
      direction = 'up'
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy += speed
      direction = 'down'
    }

    if (vx !== 0 || vy !== 0) this.facingDirection = direction
    this.setVelocity(vx, vy)
    if (vx !== 0 && vy !== 0) this.setVelocity(vx * Math.SQRT1_2, vy * Math.SQRT1_2)

    if (vx !== 0 || vy !== 0) {
      this.anims.play(`${this.playerTexture}_run_${direction}`, true)
    } else {
      this.anims.play(`${this.playerTexture}_idle_${direction}`, true)
    }

    this.setDepth(this.y)
  }
}