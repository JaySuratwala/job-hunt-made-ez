import Phaser from 'phaser'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import Player from '../characters/Players'
import NPC from '../characters/NPC'

export const OFFICE_LAYOUT: Record<string, any> = {
  rooms: {},
  chairs: [],
  computers: []
}

export default class JobOpsScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private myPlayer!: Player

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
    this.load.atlas('emma', 'assets/character/emma.png', 'assets/character/emma.json')
  }

  create() {
    this.map = this.make.tilemap({ key: 'tilemap' })
    
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')
    const groundLayer = this.map.createLayer('Ground', FloorAndGround!)
    if (groundLayer) groundLayer.setCollisionByProperty({ collides: true })

    // --- AUTO-BUILD OFFICE REGISTRY ---
    this.buildOfficeRegistry()

    // --- EXPORT TO JSON ON PRESSING 'P' ---
    this.input.keyboard!.on('keydown-P', () => {
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
    const walls = this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)
    const objects = this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    const objectsOnCollide = this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    const genericObjects = this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    const genericObjectsOnCollide = this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)
    const basement = this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    // --- SPAWN THE CEO (IN ARCHIVES) ---
    this.myPlayer = new Player(this, 0, 0, 'adam')
    const archiveChair = chairs.getChildren().find((c: any) => c.x > 900 && c.y < 300) as Chair
    if (archiveChair) {
      this.myPlayer.setPosition(archiveChair.x, archiveChair.y)
      this.myPlayer.sit('left')
    }

    // --- SPAWN NPCS ---
    new NPC(this, 1100, 360, 'adam', 'Adam_idle_anim_1.png', 'Alex (SOC Lead)')
    new NPC(this, 1190, 480, 'adam', 'Adam_idle_anim_1.png', 'Sarah (Analyst)')
    new NPC(this, 510, 600, 'adam', 'Adam_idle_anim_1.png', 'Mentor')

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

    addLabel(290, 165, '☕ Break Room')
    addLabel(1150, 300, '💻 Operations')
    addLabel(510, 525, '🤝 Discussions')
    addLabel(720, 60, '🗄️ Archives')

    // --- CAMERA SETUP ---
    const camera = this.cameras.main
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    camera.setZoom(0.75) 
    camera.centerOn(this.map.widthInPixels / 3, this.map.heightInPixels / 3)

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return
      camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom
      camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom
    })

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
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
    tilesetName: string,
    _collidable: boolean
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

  update(_t: number, _dt: number) {
    if (this.myPlayer) {
      this.myPlayer.update()
    }
  }
}