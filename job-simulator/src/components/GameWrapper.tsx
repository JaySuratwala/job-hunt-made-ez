import { useEffect, useRef } from 'react';
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
        const width = Math.max(1, gameRef.current.clientWidth)
        const height = Math.max(1, gameRef.current.clientHeight)
        phaserGame.current.scale.resize(width, height)
        phaserGame.current.canvas.style.width = `${width}px`
        phaserGame.current.canvas.style.height = `${height}px`
        phaserGame.current.canvas.style.marginLeft = '0'
        phaserGame.current.canvas.style.marginTop = '0'
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(gameRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      phaserGame.current?.destroy(true);
      phaserGame.current = null;
    };
  }, []);

  return <div ref={gameRef} className="w-full h-full relative overflow-hidden" />;
};