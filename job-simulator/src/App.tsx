import { useState } from 'react'
import { Menu } from 'lucide-react'
import { GameWrapper } from './components/GameWrapper'
import { Sidebar } from './components/Sidebar'
import { useStore } from './store'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const chatOnlyMode = useStore((state) => state.chatOnlyMode)
  const setChatOnlyMode = useStore((state) => state.setChatOnlyMode)

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#1e1e2e] font-sans">
      <div className={chatOnlyMode
        ? 'absolute left-3 top-3 z-30 h-[150px] w-[210px] overflow-hidden rounded border border-[#45475a] bg-[#11111b] shadow-xl'
        : 'relative h-full flex-1 overflow-hidden'}
      >
        <GameWrapper />
        {chatOnlyMode ? (
          <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#11111b]/80 px-1.5 py-0.5 font-mono text-[9px] text-[#cdd6f4]">
            MINI MAP · MOVEMENT PAUSED
          </span>
        ) : (
          <>
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <h1 className="text-4xl font-black text-[#cdd6f4] opacity-50 drop-shadow-md">Job Ops</h1>
            </div>
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Reopen Command Centre"
                title="Reopen Command Centre"
                className="absolute right-4 top-4 z-20 rounded border border-[#45475a] bg-[#11111b]/90 p-2 text-[#cdd6f4] shadow-lg hover:bg-[#313244]"
              >
                <Menu size={20} />
              </button>
            )}
          </>
        )}
      </div>

      {chatOnlyMode ? (
        <div className="absolute inset-0 z-10 pl-[230px]">
          <Sidebar
            chatOnlyMode
            onToggleChatOnlyMode={() => setChatOnlyMode(false)}
            onCollapse={() => {
              setChatOnlyMode(false)
              setSidebarCollapsed(true)
            }}
          />
        </div>
      ) : (
        !sidebarCollapsed && (
          <div className="z-20 h-full w-[420px] flex-shrink-0 overflow-y-auto bg-[#11111b] shadow-2xl">
            <Sidebar
              chatOnlyMode={false}
              onToggleChatOnlyMode={() => setChatOnlyMode(true)}
              onCollapse={() => setSidebarCollapsed(true)}
            />
          </div>
        )
      )}
    </div>
  )
}

export default App
