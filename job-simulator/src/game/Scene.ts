import Phaser from 'phaser'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import Player from '../characters/Players'
import NPC from '../characters/NPC'
import { useStore } from '../store'
import { isTextInputFocused } from './keyboard'

interface OfficeLayout {
  rooms: Record<string, unknown>
  chairs: Array<{
    id: string
    x: number
    y: number
    properties?: Phaser.Types.Tilemaps.TiledObject['properties']
  }>
  computers: Array<{ id: string; x: number; y: number }>
}

export const OFFICE_LAYOUT: OfficeLayout = {
  rooms: {},
  chairs: [],
  computers: []
}

export default class JobOpsScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private myPlayer!: Player
  private chatOnlyMode = false

  constructor() {
    super('JobOpsScene')
  }

  preload() {
    this.load.tilemapTiledJSON('tilemap', 'assets/map/map.json')

    const tileConfig = { frameWidth: 32, frameHeight: 32 }
    this.load.spritesheet('tiles_wall', 'assets/map/FloorAndGround.png', tileConfig)
    this.load.spritesheet('office', 'assets/tileset/Modern_Office_Black_Shadow.png', tileConfig)
    this.load.spritesheet('generic', 'assets/tileset/Generic.png', tileConfig)
    this.load.spritesheet('basement', 'assets/tileset/Basement.png', tileConfig)

    this.load.spritesheet('chairs', 'assets/items/chair.png', { frameWidth: 32, frameHeight: 64 })
    this.load.spritesheet('computers', 'assets/items/computer.png', { frameWidth: 32, frameHeight: 64 })
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', { frameWidth: 32, frameHeight: 64 })

    this.load.atlas('adam', 'assets/character/adam.png', 'assets/character/adam.json')
    this.load.atlas('lucy', 'assets/character/lucy.png', 'assets/character/lucy.json')
  }

  create() {
    this.map = this.make.tilemap({ key: 'tilemap' })
    
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')
    const groundLayer = this.map.createLayer('Ground', FloorAndGround!)
    if (groundLayer) groundLayer.setCollisionByProperty({ collides: true })

    // --- AUTO-BUILD OFFICE REGISTRY ---
    this.buildOfficeRegistry()
this.input.once('pointerdown', () => {
      if ('context' in this.sound && this.sound.context.state === 'suspended') {
        this.sound.context.resume()
      }
    })
// --- REGISTER CHARACTER ANIMATIONS SAFELY ---
    const directions = ['left', 'right', 'up', 'down']
    const runFrameStarts: Record<string, number> = {
      right: 1,
      up: 7,
      down: 13,
      left: 19,
    }
    directions.forEach((dir) => {
      // Sitting Animations
      const sitKey = `adam_sit_${dir}`
      if (!this.anims.exists(sitKey)) {
        // Try upper case first, fallback to lower case frame name
        const frameName = this.textures.getFrame('adam', `Adam_sit_${dir}.png`) 
          ? `Adam_sit_${dir}.png` 
          : `adam_sit_${dir}.png`

        this.anims.create({
          key: sitKey,
          frames: [{ key: 'adam', frame: frameName }],
          frameRate: 1,
          repeat: -1,
        })
      }

      // Idle Animations
      const idleKey = `adam_idle_${dir}`
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: 'adam', frame: `Adam_idle_anim_${runFrameStarts[dir]}.png` }],
          frameRate: 1,
          repeat: -1,
        })
      }

      // Running Animations
      const runKey = `adam_run_${dir}`
      if (!this.anims.exists(runKey)) {
        this.anims.create({
          key: runKey,
          frames: this.anims.generateFrameNames('adam', {
            prefix: 'Adam_run_',
            start: runFrameStarts[dir],
            end: runFrameStarts[dir] + 5,
            zeroPad: 0,
            suffix: '.png',
          }),
          frameRate: 10,
          repeat: -1,
        })
      }

      const lucyRunKey = `lucy_run_${dir}`
      if (!this.anims.exists(lucyRunKey)) {
        this.anims.create({
          key: lucyRunKey,
          frames: this.anims.generateFrameNames('lucy', {
            prefix: 'Lucy_run_',
            start: runFrameStarts[dir],
            end: runFrameStarts[dir] + 5,
            zeroPad: 0,
            suffix: '.png',
          }),
          frameRate: 10,
          repeat: -1,
        })
      }
    })
    // --- EXPORT TO JSON ON PRESSING 'P' ---
    this.input.keyboard!.on('keydown-P', () => {
      if (isTextInputFocused()) return
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(OFFICE_LAYOUT, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", "office_layout.json")
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      console.log("Office layout exported successfully!")
    })

    // --- FURNITURE MAPPING ---
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    if (chairLayer) {
      chairLayer.objects.forEach((chairObj) => {
        const item = this.addObjectFromTiled(chairs, chairObj, 'chairs', 'chair') as Chair
        if (item && chairObj.properties && chairObj.properties.length > 0) {
          item.itemDirection = chairObj.properties[0].value
        }
      })
    }

    const computers = this.physics.add.staticGroup({ classType: Computer })
    const computerLayer = this.map.getObjectLayer('Computer')
    if (computerLayer) {
      computerLayer.objects.forEach((obj) => {
        const item = this.addObjectFromTiled(computers, obj, 'computers', 'computer') as Computer
        if (item) item.setDepth(item.y + item.height * 0.27)
      })
    }

    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    if (whiteboardLayer) {
      whiteboardLayer.objects.forEach((obj) => {
        this.addObjectFromTiled(whiteboards, obj, 'whiteboards', 'whiteboard')
      })
    }

    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    const vendingMachineLayer = this.map.getObjectLayer('VendingMachine')
    if (vendingMachineLayer) {
      vendingMachineLayer.objects.forEach((obj) => {
        this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
      })
    }

    // --- STRUCTURAL GROUPS ---
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround')
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow')
    const objectsOnCollide = this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow')
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic')
    const genericObjectsOnCollide = this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic')
    const basement = this.addGroupFromTiled('Basement', 'basement', 'Basement')

    // --- SPAWN THE CEO (YOU) NEAR THE OFFICE CHAIR ---
    this.myPlayer = new Player(this, 0, 0, 'adam')
    let nearestChair: Chair | null = null
    let currentSatChair: Chair | null = null
    this.myPlayer.setPosition(850, 200)

    const yashviChair = chairs.get(1040, 192, 'chairs', 8) as Chair
    yashviChair.itemDirection = 'left'
    yashviChair.isOccupied = true
    yashviChair.setDepth(yashviChair.y)
    OFFICE_LAYOUT.chairs.push({ id: 'yashvi-chair', x: yashviChair.x, y: yashviChair.y })

    const opChairs = (chairs.getChildren() as Chair[])
      .filter((chair) => chair.x > 900 && chair.y > 350)
      .sort((left, right) => left.y - right.y || left.x - right.x)
    const discussionChairs = (chairs.getChildren() as Chair[])
      .filter((chair) => chair.x < 600 && chair.y >= 580 && chair.y <= 700)
      .sort((left, right) => left.y - right.y || left.x - right.x)

    const officeEmployees = useStore.getState().employees
      .filter((employee) => employee.id !== 'ceo')
      .sort((left, right) => Number(right.id.startsWith('exec-')) - Number(left.id.startsWith('exec-')))
    const employeeHoverDetails = new Map<string, Phaser.GameObjects.Text>()
    const employeeNpcs = new Map<string, { npc: NPC; direction: string; spriteKey: string }>()
    const dialogueBubbles = new Map<string, Phaser.GameObjects.Container>()
    const shortLabels: Record<string, string> = {
      'cjo-1': 'Discovery',
      'chro-1': 'Resume',
      'cmo-1': 'Content',
    }
    let operationsSeatIndex = 0
    let discussionSeatIndex = 0

    officeEmployees.forEach((employee) => {
      const chair = employee.id === 'exec-cjo'
        ? yashviChair
        : employee.id.startsWith('exec-')
          ? discussionChairs[discussionSeatIndex++]
          : opChairs[operationsSeatIndex++]
      const location = chair
        ? { x: chair.x, y: chair.y - 5, direction: chair.itemDirection || 'up' }
        : { x: employee.position[0], y: employee.position[1], direction: 'down' }
      if (chair) chair.isOccupied = true

      const npc = new NPC(
        this,
        location.x,
        location.y,
        employee.spriteKey,
        employee.name,
        location.direction,
        shortLabels[employee.id] ?? employee.name,
        employee.spriteKey === 'lucy' ? 'Lucy' : 'Adam',
      )
      employeeNpcs.set(employee.id, { npc, direction: location.direction, spriteKey: employee.spriteKey })
      npc.setInteractive({ useHandCursor: true })
      npc.on('pointerdown', () => useStore.getState().selectEmployee(employee.id))
      const details = this.add.text(location.x + 25, location.y - 45, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#cdd6f4',
        backgroundColor: '#11111bee',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 220 },
      }).setOrigin(0.5, 1).setDepth(7000).setVisible(false)
      employeeHoverDetails.set(employee.id, details)
      npc.on('pointerover', () => {
        npc.setTint(0x89b4fa)
        const currentEmployee = useStore.getState().employees.find((candidate) => candidate.id === employee.id)
        details.setText(currentEmployee
          ? `${currentEmployee.state}\n${currentEmployee.currentTask || currentEmployee.latestUpdate}`
          : employee.latestUpdate)
        details.setVisible(true)
      })
      npc.on('pointerout', () => {
        npc.clearTint()
        details.setVisible(false)
      })

      if (employee.id.startsWith('exec-')) {
        const background = this.add.graphics()
          .fillStyle(0x11111b, 0.96)
          .fillRoundedRect(-17, -12, 34, 24, 5)
          .lineStyle(1, 0x89b4fa, 1)
          .strokeRoundedRect(-17, -12, 34, 24, 5)
          .fillTriangle(-4, 11, 4, 11, 0, 17)
        const dots = this.add.text(0, 0, '...', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#cdd6f4',
        }).setOrigin(0.5)
        const bubble = this.add.container(location.x + 26, location.y - 48, [background, dots])
          .setDepth(7100)
          .setVisible(false)
        dialogueBubbles.set(employee.id, bubble)
      }
    })

    const updateEmployeeIndicators = (employees = useStore.getState().employees) => {
      if (!this.sys.isActive()) return
      employees.forEach((employee) => {
        const details = employeeHoverDetails.get(employee.id)
        if (details) {
          details.setText(`${employee.state}\n${employee.currentTask || employee.latestUpdate}`)
        }
        const character = employeeNpcs.get(employee.id)
        if (!character || !character.npc.active || !character.npc.anims) return
        if (employee.state === 'Working') {
          character.npc.anims.play(`${character.spriteKey}_run_${character.direction}`, true)
        } else {
          character.npc.anims.stop()
          const framePrefix = character.spriteKey === 'lucy' ? 'Lucy' : 'Adam'
          character.npc.setFrame(`${framePrefix}_sit_${character.direction}.png`)
        }
      })
      const communicatingExecutive = useStore.getState().communicatingExecutive
      employees.forEach((employee) => {
        const bubble = dialogueBubbles.get(employee.id)
        if (bubble) bubble.setVisible(employee.executive === communicatingExecutive)
      })
    }
    updateEmployeeIndicators()
    const unsubscribeEmployeeUpdates = useStore.subscribe((state) => updateEmployeeIndicators(state.employees))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribeEmployeeUpdates)

// --- CHAIR INTERACTION OVERLAP & TOGGLE ---
    const interactionText = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#11111bcc',
      padding: { x: 4, y: 2 },
    }).setDepth(6000).setVisible(false)

    this.physics.add.overlap(this.myPlayer, chairs, (_player, chairObj) => {
      const chair = chairObj as Chair
      if (!chair.isOccupied && !this.myPlayer.isSitting) {
        nearestChair = chair
        interactionText.setText('Press E to sit')
        interactionText.setPosition(chair.x - 30, chair.y - 40)
        interactionText.setVisible(true)
      }
    })

    this.input.keyboard!.on('keydown-E', () => {
      if (isTextInputFocused()) return
      // Stand up if already seated
      if (this.myPlayer.isSitting && currentSatChair) {
        currentSatChair.isOccupied = false
        this.myPlayer.unsit()
        currentSatChair = null
        interactionText.setVisible(false)
        return
      }

      // Sit down if near a chair
      if (nearestChair && !this.myPlayer.isSitting) {
        currentSatChair = nearestChair
        currentSatChair.isOccupied = true
        this.myPlayer.setPosition(currentSatChair.x, currentSatChair.y - 10)
        this.myPlayer.sit(currentSatChair.itemDirection || 'down')
        
        nearestChair = null
        interactionText.setText('Press E to stand up')
        interactionText.setPosition(currentSatChair.x - 35, currentSatChair.y - 40)
        interactionText.setVisible(true)
      }
    })
    // --- PHYSICS COLLISIONS ---
    if (groundLayer) this.physics.add.collider(this.myPlayer, groundLayer)
    this.physics.add.collider(this.myPlayer, chairs)
    this.physics.add.collider(this.myPlayer, computers)
    this.physics.add.collider(this.myPlayer, whiteboards)
    this.physics.add.collider(this.myPlayer, vendingMachines)
    if (objectsOnCollide) this.physics.add.collider(this.myPlayer, objectsOnCollide)
    if (genericObjectsOnCollide) this.physics.add.collider(this.myPlayer, genericObjectsOnCollide)
    if (basement) this.physics.add.collider(this.myPlayer, basement)

    // --- ROOM LABELS ---
    const addLabel = (x: number, y: number, text: string) => {
      const label = this.add.text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#cdd6f4',
        backgroundColor: '#11111bcc',
        padding: { x: 6, y: 4 },
      })
      label.setOrigin(0.5)
      label.setDepth(5000)
    }

    addLabel(310, 230, 'Break Room')
    addLabel(1070, 390, 'Operations')
    addLabel(230, 575, 'Discussions')
    addLabel(850, 150, 'Office')

    // --- CAMERA SETUP ---
    const camera = this.cameras.main
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    camera.setZoom(0.75) 
    camera.centerOn(this.myPlayer.x, this.myPlayer.y)

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || useStore.getState().chatOnlyMode) return
      camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom
      camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom
    })

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (useStore.getState().chatOnlyMode) return
      let newZoom = camera.zoom - deltaY * 0.001
      newZoom = Phaser.Math.Clamp(newZoom, 0.4, 2.5)
      camera.setZoom(newZoom)
    })
  }

  private buildOfficeRegistry() {
    const chairLayer = this.map.getObjectLayer('Chair')
    if (chairLayer) {
      chairLayer.objects.forEach((obj, index) => {
        OFFICE_LAYOUT.chairs.push({
          id: obj.name || `chair_${index}`,
          x: obj.x! + (obj.width || 32) * 0.5,
          y: obj.y! - (obj.height || 32) * 0.5,
          properties: obj.properties
        })
      })
    }

    const computerLayer = this.map.getObjectLayer('Computer')
    if (computerLayer) {
      computerLayer.objects.forEach((obj, index) => {
        OFFICE_LAYOUT.computers.push({
          id: obj.name || `computer_${index}`,
          x: obj.x! + (obj.width || 32) * 0.5,
          y: obj.y! - (obj.height || 32) * 0.5
        })
      })
    }
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const actualX = object.x! + object.width! * 0.5
    const actualY = object.y! - object.height! * 0.5
    const tileset = this.map.getTileset(tilesetName)
    const firstGid = tileset ? tileset.firstgid : 0
    
    const obj = group.get(actualX, actualY, key, object.gid! - firstGid)
    if (obj) obj.setDepth(actualY)
    
    return obj
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string
  ) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    if (!objectLayer) return null
    
    const tileset = this.map.getTileset(tilesetName)
    const firstGid = tileset ? tileset.firstgid : 0

    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      const obj = group.get(actualX, actualY, key, object.gid! - firstGid)
      if (obj) obj.setDepth(actualY)
    })

    return group
  }

  // Office States: 'BREAK_ROOM' | 'DISCUSSIONS' | 'ARCHIVES'
  public setOfficeState(state: 'BREAK_ROOM' | 'DISCUSSIONS' | 'ARCHIVES') {
    const discoveryAgent = this.children.getAll().find(
      (child) => child instanceof NPC && child.name === 'Job Discovery Agent'
    )
    const atsAnalyst = this.children.getAll().find(
      (child) => child instanceof NPC && child.name === 'ATS Optimisation Analyst'
    )

    if (state === 'BREAK_ROOM') {
      if (discoveryAgent instanceof NPC) discoveryAgent.setPosition(250, 200)
      if (atsAnalyst instanceof NPC) atsAnalyst.setPosition(330, 200)
      console.log("Team is relaxing in the Break Room ☕")
    } 
    else if (state === 'DISCUSSIONS') {
      if (discoveryAgent instanceof NPC) discoveryAgent.setPosition(480, 525)
      if (atsAnalyst instanceof NPC) atsAnalyst.setPosition(540, 525)
      console.log("Team collaborating in Discussions room 🤝")
    } 
    else if (state === 'ARCHIVES') {
      if (discoveryAgent instanceof NPC) discoveryAgent.setPosition(720, 100)
      if (atsAnalyst instanceof NPC) atsAnalyst.setVisible(false)
      console.log("Private strategy session in Archives 🗄️")
    }
  }

  update() {
    if (this.myPlayer) {
      const { chatOnlyMode, playerName } = useStore.getState()
      this.myPlayer.setDisplayName(playerName)
      if (this.chatOnlyMode !== chatOnlyMode) {
        this.chatOnlyMode = chatOnlyMode
        const camera = this.cameras.main
        if (chatOnlyMode) {
          camera.setZoom(this.getOverviewZoom(camera))
          camera.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2)
        } else {
          camera.setZoom(0.75)
          camera.centerOn(this.myPlayer.x, this.myPlayer.y)
        }
      }
      if (chatOnlyMode) {
        const camera = this.cameras.main
        camera.setZoom(this.getOverviewZoom(camera))
        camera.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2)
      }
      this.myPlayer.update()
    }
  }

  private getOverviewZoom(camera: Phaser.Cameras.Scene2D.Camera) {
    return Math.min(
      camera.width / this.map.widthInPixels,
      camera.height / this.map.heightInPixels,
    ) * 0.9
  }
}