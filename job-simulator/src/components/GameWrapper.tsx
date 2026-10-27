import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import JobOpsScene from '../game/Scene';

export const GameWrapper = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current || phaserGame.current) return;

    const width = gameRef.current.clientWidth;
    const height = gameRef.current.clientHeight;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: width,
      height: height,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [JobOpsScene]
    };

    phaserGame.current = new Phaser.Game(config);

    const handleResize = () => {
      if (phaserGame.current && gameRef.current) {
        phaserGame.current.scale.resize(
          gameRef.current.clientWidth,
          gameRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
    };
  }, []);

  return <div ref={gameRef} className="w-full h-full relative overflow-hidden" />;
};