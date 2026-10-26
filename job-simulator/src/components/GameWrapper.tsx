import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { JobOpsScene } from '../game/Scene';

export const GameWrapper = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current || phaserGame.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: '100%',
      height: '100%',
      pixelArt: true, // Crucial: Keeps the 2D pixel art from blurring
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [JobOpsScene]
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
    };
  }, []);

  return <div ref={gameRef} className="w-full h-full" />;
};