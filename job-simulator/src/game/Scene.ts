import Phaser from 'phaser'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'

export default class JobOpsScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap

  constructor() {
    super('JobOpsScene')
  }

  preload() {
    this.load.tilemapTiledJSON('office-map', 'assets/map/map.json')

    this.load.image('FloorAndGround', 'assets/map/FloorAndGround.png')
    this.load.image('Modern_Office_Black_Shadow', 'assets/tileset/Modern_Office_Black_Shadow.png')
    this.load.image('Generic', 'assets/tileset/Generic.png')
    this.load.image('Basement', 'assets/tileset/Basement.png')
    this.load.image('Classroom_and_library', 'assets/tileset/Classroom_and_library.png')

    this.load.spritesheet('chairs', 'assets/items/chair.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('computers', 'assets/items/computer.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', { frameWidth: 32, frameHeight: 32 })
  }

  create() {
    this.map = this.make.tilemap({ key: 'office-map' })

    const floorTileset = this.map.addTilesetImage('FloorAndGround', 'FloorAndGround')
    const officeTileset = this.map.addTilesetImage('Modern_Office_Black_Shadow', 'Modern_Office_Black_Shadow')
    const genericTileset = this.map.addTilesetImage('Generic', 'Generic')
    const basementTileset = this.map.addTilesetImage('Basement', 'Basement')
    const libraryTileset = this.map.addTilesetImage('Classroom_and_library', 'Classroom_and_library')

    const tilesetImages = [
      floorTileset,
      officeTileset,
      genericTileset,
      basementTileset,
      libraryTileset,
    ].filter(Boolean) as Phaser.Tilemaps.Tileset[]

    this.map.layers.forEach((layer) => {
      this.map.createLayer(layer.name, tilesetImages, 0, 0)
    })

    // --- ACCURATE TILED OBJECT PARSING ---
const loadObjectLayer = (
      group: Phaser.Physics.Arcade.StaticGroup,
      layerName: string,
      textureKey: string
    ) => {
      const layer = this.map.getObjectLayer(layerName)
      if (!layer) return

      layer.objects.forEach((object) => {
        if (object.x === undefined || object.y === undefined || object.gid === undefined) return

        const tileset = this.map.tilesets.find(
          (ts) => object.gid >= ts.firstgid && object.gid < ts.firstgid + ts.total
        )
        if (!tileset) return

        const frameIndex = object.gid - tileset.firstgid

        // In Tiled, object.y represents the bottom-left coordinate.
        // Instantiating directly at (object.x, object.y) with an origin of (0, 1) 
        // ensures the graphic sits right on the tile grid without splitting frames.
        const item = group.get(object.x, object.y, textureKey, frameIndex)
        
        if (item) {
          item.setOrigin(0, 1)
          item.setDepth(object.y)
        }
      })
    }

    if (officeTileset) {
      const chairs = this.physics.add.staticGroup({ classType: Chair })
      loadObjectLayer(chairs, 'Chair', 'chairs', officeTileset)

      const computers = this.physics.add.staticGroup({ classType: Computer })
      loadObjectLayer(computers, 'Computer', 'computers', officeTileset)
    }

    if (genericTileset) {
      const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
      loadObjectLayer(whiteboards, 'Whiteboard', 'whiteboards', genericTileset)

      const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
      loadObjectLayer(vendingMachines, 'VendingMachine', 'vendingmachines', genericTileset)
    }

    // --- ROOM LABELS ---
    const addLabel = (x: number, y: number, text: string) => {
      const label = this.add.text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '20px',
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
    camera.setZoom(0.8)
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

  update(_t: number, _dt: number) {}
}