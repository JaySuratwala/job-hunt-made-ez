// import Phaser from 'phaser';
// import { useStore } from '../store';

// export class JobOpsScene extends Phaser.Scene {
//   private employees: Map<string, Phaser.GameObjects.Sprite> = new Map();
//   private characterKeys = ['adam', 'ash', 'lucy', 'nancy'];

//   constructor() {
//     super('JobOpsScene');
//   }

// preload() {
//     this.load.tilemapTiledJSON('office-map', 'assets/map/map.json');
//     this.load.image('Modern_Office_Black_Shadow', 'assets/tileset/Modern_Office_Black_Shadow.png');
//     this.load.image('Generic', 'assets/tileset/Generic.png');
//     this.load.image('Basement', 'assets/tileset/Basement.png');
//     this.load.image('Classroom_and_library', 'assets/tileset/Classroom_and_library.png');
//     this.load.image('FloorAndGround', 'assets/map/FloorAndGround.png');

//     // Load Furniture & Items
//     this.load.image('computer', 'assets/items/computer.png');
//     this.load.image('chair', 'assets/items/chair.png');
//     this.load.image('vendingmachine', 'assets/items/vendingmachine.png');
//     this.load.image('whiteboard', 'assets/items/whiteboard.png');

//     this.characterKeys.forEach(key => {
//       this.load.spritesheet(key, `assets/character/${key}.png`, {
//         frameWidth: 32,
//         frameHeight: 48,
//       });
//     });
//   }

//   create() {
//     const map = this.make.tilemap({ key: 'office-map' });
//     const tilesetImages = [
//       map.addTilesetImage('Modern_Office_Black_Shadow', 'Modern_Office_Black_Shadow'),
//       map.addTilesetImage('Generic', 'Generic'),
//       map.addTilesetImage('Basement', 'Basement'),
//       map.addTilesetImage('Classroom_and_library', 'Classroom_and_library'),
//       map.addTilesetImage('FloorAndGround', 'FloorAndGround')
//     ].filter(Boolean) as Phaser.Tilemaps.Tileset[];

//     map.layers.forEach((layer) => {
//       map.createLayer(layer.name, tilesetImages, 0, 0);
//     });

//     // --- PLACE PROPS / FURNITURE ---
//     // // Operations Room Computers & Desks
//     // this.add.image(1223, 560, 'computer');
//     const pc1 = this.add.image(1060, 630, 'computer');
//     pc1.setScale(0.70);
//     // pc1.setAngle(90);
//     const pc2 = this.add.image(831,690, 'computer');
//     pc2.setScale(0.55);
//     pc2.setAngle(270);
//     const cubicleLeft = this.add.rectangle(920, 630, 10, 80, 0x45475a); // Catppuccin Surface1 color
//     cubicleLeft.setAngle(0);
//     cubicleLeft.setScale(0.70);
//     const cubicleRight = this.add.rectangle(1160, 630, 10, 80, 0x45475a);
//     cubicleRight.setAngle(0);
//     cubicleRight.setScale(0.70);

//     // Individual dividers between the 3 agents
//     const divider1 = this.add.rectangle(1060, 630, 5, 60, 0x313244);
//     divider1.setScale(0.70);
//     divider1.setAngle(0);
//     const divider2 = this.add.rectangle(960, 630, 5, 60, 0x313244);
//     divider2.setScale(0.70);
//     divider2.setAngle(0);
//     // const pc3 = this.add.image(1010, 740, 'computer');
//     // pc3.setAngle(90);

//     // Break Room Vending Machine & Fridge area
//     const pic0= this.add.image(573, 175, 'vendingmachine');
//     pic0.setAngle(90);
//     // Discussion Room Whiteboards / Tables
//     // this.add.image(430, 470, 'whiteboard');
//     this.add.image(220, 650, 'whiteboard');
//     // -------------------------------

//     // Room Labels (Using your clean custom coordinates)
//     const addLabel = (x: number, y: number, text: string) => {
//       const label = this.add.text(x, y, text, {
//         fontFamily: 'monospace',
//         fontSize: '25px',
//         color: '#cdd6f4', // Catppuccin text
//         backgroundColor: '#11111b99', // Semi-transparent dark background
//         padding: { x: 2, y: 2 },
//       });
//       label.setOrigin(0.5);
//     };

//     addLabel(333, 155, '☕ Break Room (Idle)');
//     addLabel(1085, 303, '💻 Operations (Working)');
//     addLabel(510, 525, '🤝Discussions');
//     addLabel(720, 60, '🗄️ Archives');

//     const camera = this.cameras.main;
//     camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
//     camera.setZoom(0.8); 
//     camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

//     this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
//       if (!pointer.isDown) return;
//       camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
//       camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
//     });

//     this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
//       let newZoom = camera.zoom - (deltaY * 0.001);
//       newZoom = Phaser.Math.Clamp(newZoom, 0.4, 2.5);
//       camera.setZoom(newZoom);
//     });

//     this.characterKeys.forEach(key => {
//       this.anims.create({
//         key: `${key}-idle`,
//         frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
//         frameRate: 8,
//         repeat: -1
//       });
//       this.anims.create({
//         key: `${key}-working`,
//         frames: this.anims.generateFrameNumbers(key, { start: 6, end: 11 }),
//         frameRate: 10,
//         repeat: -1
//       });
//     });

//     const state = useStore.getState();
    
//     state.employees.forEach(emp => {
//       const sprite = this.add.sprite(emp.position[0], emp.position[1], emp.spriteKey);
      
//       const animKey = (emp.state === 'Working' || emp.state === 'Researching') ? 'working' : 'idle';
//       sprite.play(`${emp.spriteKey}-${animKey}`);
      
//       // Store current logical position to prevent duplicate tweens
//       sprite.setData('targetX', emp.position[0]);
//       sprite.setData('targetY', emp.position[1]);
      
//       sprite.setInteractive({ cursor: 'pointer' });
//       sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
//         pointer.event.stopPropagation();
//         useStore.getState().selectEmployee(emp);
//       });
      
//       this.employees.set(emp.id, sprite);
//     });

//     this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
//       if (gameObjects.length === 0) {
//         useStore.getState().selectEmployee(null);
//       }
//     });

//     // ZUSTAND SUBSCRIBER - Handles Tweening and Animation Changes
//     useStore.subscribe((newState) => {
//       this.employees.forEach((sprite, id) => {
//         if (newState.selectedEmployee?.id === id) {
//           sprite.setTint(0xb4befe); 
//         } else {
//           sprite.clearTint(); 
//         }

//         const currentEmp = newState.employees.find(e => e.id === id);
//         if (currentEmp) {
//           const isWorking = currentEmp.state === 'Working' || currentEmp.state === 'Researching';
//           const targetPos = isWorking ? currentEmp.deskPosition : currentEmp.idlePosition;
          
//           // If the sprite is not currently headed to the target location, move it
//           if (sprite.getData('targetX') !== targetPos[0] || sprite.getData('targetY') !== targetPos[1]) {
//             sprite.setData('targetX', targetPos[0]);
//             sprite.setData('targetY', targetPos[1]);
            
//             // Flip sprite depending on walk direction (optional polish)
//             sprite.setFlipX(targetPos[0] < sprite.x);

//             this.tweens.add({
//               targets: sprite,
//               x: targetPos[0],
//               y: targetPos[1],
//               duration: 2000, // 2 seconds to walk to desk
//               onStart: () => {
//                  // Play idle (walking) animation while moving
//                  sprite.play(`${currentEmp.spriteKey}-idle`);
//               },
//               onComplete: () => {
//                  // Play appropriate animation once arrived
//                  const finalAnim = isWorking ? 'working' : 'idle';
//                  sprite.play(`${currentEmp.spriteKey}-${finalAnim}`);
//                  sprite.setFlipX(false); // Reset orientation at desk
//               }
//             });
//           }
//         }
//       });
//     });
//   }

//   update() {}
// }
import Phaser from 'phaser'
import Chair from '../items/Chair'
// import Computer from '../items/Computer'
// import Whiteboard from '../items/Whiteboard'
// import VendingMachine from '../items/VendingMachine'
import { useStore } from '../store'

export default class JobOpsScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private employees: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private characterKeys = ['adam', 'ash', 'lucy', 'nancy']
//   private computerMap = new Map<string, Computer>()
//   private whiteboardMap = new Map<string, Whiteboard>()

  constructor() {
    super('JobOpsScene')
  }

  preload() {
    // 1. Load Map JSON
    this.load.tilemapTiledJSON('office-map', 'assets/map/map.json')

    // 2. Load Tilesets
    this.load.image('tiles_wall', 'assets/map/FloorAndGround.png')
    this.load.spritesheet('office', 'assets/tileset/Modern_Office_Black_Shadow.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('generic', 'assets/tileset/Generic.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('basement', 'assets/tileset/Basement.png', { frameWidth: 32, frameHeight: 32 })

    // 3. Load Item Sprite Sheets (Matching SkyOffice item dimensions)
    this.load.spritesheet('chairs', 'assets/items/chair.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('computers', 'assets/items/computer.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', { frameWidth: 32, frameHeight: 32 })

    // 4. Load Character Sprite Sheets
    this.characterKeys.forEach((key) => {
      this.load.spritesheet(key, `assets/character/${key}.png`, {
        frameWidth: 32,
        frameHeight: 48,
      })
    })
  }

  create() {
    // --- MAP INITIALIZATION ---
    this.map = this.make.tilemap({ key: 'office-map' })
    const floorAndGroundTileset = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')

    if (floorAndGroundTileset) {
      const groundLayer = this.map.createLayer('Ground', floorAndGroundTileset)
      if (groundLayer) {
        groundLayer.setCollisionByProperty({ collides: true })
      }
    }

    // --- RENDER MAP OBJECT GROUPS FROM TILED ---
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround')
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow')
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow')
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic')
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic')
    this.addGroupFromTiled('Basement', 'basement', 'Basement')

    // --- IMPORT INTERACTIVE ITEMS VIA CLASSES ---
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    if (chairLayer) {
      chairLayer.objects.forEach((chairObj) => {
        const item = this.addObjectFromTiled(chairs, chairObj, 'chairs', 'Modern_Office_Black_Shadow') as Chair
        if (item && chairObj.properties && chairObj.properties[0]) {
          item.itemDirection = chairObj.properties[0].value
        }
      })
    }

    // const computers = this.physics.add.staticGroup({ classType: Computer })
    // const computerLayer = this.map.getObjectLayer('Computer')
    // if (computerLayer) {
    //   computerLayer.objects.forEach((obj, i) => {
    //     const item = this.addObjectFromTiled(computers, obj, 'computers', 'Modern_Office_Black_Shadow') as Computer
    //     if (item) {
    //       item.setDepth(item.y + item.height * 0.27)
    //       const id = `${i}`
    //       item.id = id
    //       this.computerMap.set(id, item)
    //     }
    //   })
    // }

    // const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    // const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    // if (whiteboardLayer) {
    //   whiteboardLayer.objects.forEach((obj, i) => {
    //     const item = this.addObjectFromTiled(whiteboards, obj, 'whiteboards', 'Generic') as Whiteboard
    //     if (item) {
    //       const id = `${i}`
    //       item.id = id
    //       this.whiteboardMap.set(id, item)
    //     }
    //   })
    // }

    // const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    // const vendingMachineLayer = this.map.getObjectLayer('VendingMachine')
    // if (vendingMachineLayer) {
    //   vendingMachineLayer.objects.forEach((obj) => {
    //     this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'Generic')
    //   })
    // }

    // --- ROOM LABELS ---
    const addLabel = (x: number, y: number, text: string) => {
      const label = this.add.text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '25px',
        color: '#cdd6f4',
        backgroundColor: '#11111b99',
        padding: { x: 4, y: 4 },
      })
      label.setOrigin(0.5)
      label.setDepth(3000)
    }

    addLabel(280, 140, '☕ Break Room')
    addLabel(760, 270, '💻 General Office / Operations')
    addLabel(240, 400, '🤝 Conference & Discussions')
    addLabel(500, 40, '🗄️ Archives')

    // --- CAMERA SETUP ---
    const camera = this.cameras.main
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    camera.setZoom(0.9)
    camera.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2)

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

    // --- CREATE CHARACTER ANIMATIONS IN-PLACE ---
    this.characterKeys.forEach((key) => {
      this.anims.create({
        key: `${key}-idle`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `${key}-working`,
        frames: this.anims.generateFrameNumbers(key, { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1,
      })
    })

    // --- SPAWN STORE EMPLOYEES & CEO ---
    this.spawnEmployees()

    // --- ZUSTAND STATE & MOVEMENT SYNC ---
    this.setupZustandSync()
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const tileset = this.map.getTileset(tilesetName)
    if (!tileset || object.gid === undefined) return null

    const actualX = object.x! + object.width! * 0.5
    const actualY = object.y! - object.height! * 0.5
    const obj = group
      .get(actualX, actualY, key, object.gid - tileset.firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(objectLayerName: string, key: string, tilesetName: string) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    if (!objectLayer) return

    const tileset = this.map.getTileset(tilesetName)
    if (!tileset) return

    objectLayer.objects.forEach((object) => {
      if (object.x === undefined || object.y === undefined || object.gid === undefined) return
      const actualX = object.x + object.width! * 0.5
      const actualY = object.y - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid - tileset.firstgid)
        .setDepth(actualY)
    })
  }

  private spawnEmployees() {
    const state = useStore.getState()

    state.employees.forEach((emp) => {
      const sprite = this.add.sprite(emp.position[0], emp.position[1], emp.spriteKey)
      const animKey = emp.state === 'Working' || emp.state === 'Researching' ? 'working' : 'idle'
      sprite.play(`${emp.spriteKey}-${animKey}`)
      sprite.setDepth(emp.position[1])

      sprite.setData('targetX', emp.position[0])
      sprite.setData('targetY', emp.position[1])

      sprite.setInteractive({ cursor: 'pointer' })
      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation()
        useStore.getState().selectEmployee(emp)
      })

      this.employees.set(emp.id, sprite)
    })

    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (gameObjects.length === 0) {
        useStore.getState().selectEmployee(null)
      }
    })
  }

  private setupZustandSync() {
    useStore.subscribe((newState) => {
      this.employees.forEach((sprite, id) => {
        if (newState.selectedEmployee?.id === id) {
          sprite.setTint(0xb4befe)
        } else {
          sprite.clearTint()
        }

        const currentEmp = newState.employees.find((e) => e.id === id)
        if (currentEmp) {
          const isWorking = currentEmp.state === 'Working' || currentEmp.state === 'Researching'
          const targetPos = isWorking ? currentEmp.deskPosition : currentEmp.idlePosition

          if (sprite.getData('targetX') !== targetPos[0] || sprite.getData('targetY') !== targetPos[1]) {
            sprite.setData('targetX', targetPos[0])
            sprite.setData('targetY', targetPos[1])

            sprite.setFlipX(targetPos[0] < sprite.x)

            this.tweens.add({
              targets: sprite,
              x: targetPos[0],
              y: targetPos[1],
              duration: 2000,
              onStart: () => {
                sprite.play(`${currentEmp.spriteKey}-idle`)
              },
              onUpdate: () => {
                sprite.setDepth(sprite.y)
              },
              onComplete: () => {
                const finalAnim = isWorking ? 'working' : 'idle'
                sprite.play(`${currentEmp.spriteKey}-${finalAnim}`)
                sprite.setFlipX(false)
              },
            })
          }
        }
      })
    })
  }

  update(_t: number, _dt: number) {}
}