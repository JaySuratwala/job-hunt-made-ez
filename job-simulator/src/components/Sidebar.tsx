import React, { useState } from 'react';
import { useStore } from '../store';
import { Send, Briefcase, Activity } from 'lucide-react';

export const Sidebar = () => {
  const { mission, messages, selectedEmployee, addMessage } = useStore();
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addMessage('CEO', input);
    setTimeout(() => {
      addMessage('CJO', 'Command acknowledged. Initiating workflows.');
    }, 1500);
    setInput('');
  };

  return (
    <div className="w-96 bg-[#181825] border-l border-[#313244] flex flex-col h-screen text-[#cdd6f4]">
      <div className="p-4 border-b border-[#313244] bg-[#11111b]">
        <h1 className="text-xl font-bold text-[#89b4fa]">Command Centre</h1>
        <div className="mt-2 text-xs flex items-center gap-2 bg-[#1e1e2e] p-2 rounded border border-[#313244]">
          <Activity size={14} className="text-[#89b4fa]" />
          <span className="font-semibold text-[#a6adc8]">MISSION:</span> 
          <span className="truncate">{mission}</span>
        </div>
      </div>

      {selectedEmployee && (
        <div className="p-4 border-b border-[#313244] bg-[#313244]/50">
          <h2 className="font-bold text-[#cdd6f4] flex items-center gap-2">
            <Briefcase size={16} /> {selectedEmployee.name}
          </h2>
          <div className="text-xs text-[#a6adc8] mt-1">Status: {selectedEmployee.state}</div>
          <div className="text-sm bg-[#1e1e2e] p-2 rounded mt-2 border border-[#313244] text-[#cdd6f4]">{selectedEmployee.currentTask}</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'CEO' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-[#a6adc8] mb-1">{msg.sender}</span>
            <div className={`p-3 rounded-lg text-sm max-w-[85%] ${msg.sender === 'CEO' ? 'bg-[#89b4fa] text-[#11111b]' : 'bg-[#313244] text-[#cdd6f4] border border-[#45475a]'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[#313244] bg-[#11111b]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Direct the C-Suite..."
            className="flex-1 bg-[#1e1e2e] border border-[#45475a] rounded p-2 text-sm text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] placeholder-[#a6adc8]"
          />
          <button type="submit" className="bg-[#89b4fa] p-2 rounded text-[#11111b] hover:bg-[#b4befe] transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};