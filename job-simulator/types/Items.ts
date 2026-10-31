export const ItemType = {
  CHAIR: 'chair',
  COMPUTER: 'computer',
  WHITEBOARD: 'whiteboard',
  VENDINGMACHINE: 'vendingmachine',
} as const

export type ItemType = (typeof ItemType)[keyof typeof ItemType]