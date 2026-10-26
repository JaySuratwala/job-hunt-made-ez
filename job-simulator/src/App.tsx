import React from 'react';
import { GameWrapper } from './components/GameWrapper';
import { Sidebar } from './components/Sidebar';

function App() {
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#1e1e2e] font-sans">
      
      {/* Game Layer (Bottom) */}
      <div className="flex-1 relative">
        <GameWrapper />
        
        {/* UI Overlay (Top) */}
        <div className="absolute top-4 left-4 pointer-events-none z-10">
          <h1 className="text-4xl font-black text-[#cdd6f4] opacity-50 drop-shadow-md">
            Job Ops
          </h1>
        </div>
      </div>
      
      {/* Command Centre Sidebar */}
      <div className="z-20 shadow-2xl">
        <Sidebar />
      </div>

    </div>
  );
}

export default App;