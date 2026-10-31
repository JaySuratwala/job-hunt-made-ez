export const PlayerBehavior = {
  IDLE: 'idle',
  SITTING: 'sitting',
} as const

export type PlayerBehavior = (typeof PlayerBehavior)[keyof typeof PlayerBehavior]