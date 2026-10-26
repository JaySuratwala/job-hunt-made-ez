import { create } from 'zustand';

export type EmployeeState = 'Idle' | 'Working' | 'Researching' | 'Waiting' | 'Completed';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  executive: string;
  state: EmployeeState;
  currentTask: string | null;
  progress: number;
  latestUpdate: string;
  color: string;
  position: [number, number]; // 2D map pixel coordinates (x, y)
}

interface AppState {
  mission: string;
  employees: Employee[];
  selectedEmployee: Employee | null;
  messages: { sender: string; text: string; time: string }[];
  selectEmployee: (emp: Employee | null) => void;
  addMessage: (sender: string, text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  mission: 'Secure L1 SOC Analyst / Junior Security Analyst in Ireland',
  employees: [
    {
      id: 'cjo-1', name: 'Job Discovery Agent', role: 'Vacancy Finder', department: 'Job Intelligence', executive: 'CJO',
      state: 'Working', currentTask: 'Scraping Irish job boards for SOC roles', progress: 45,
      latestUpdate: 'Found 12 candidate listings in the last 24h. Filtering duplicates...',
      color: '#89b4fa', // Catppuccin Sapphire
      position: [320, 240] 
    },
    {
      id: 'cjo-2', name: 'Resume Intelligence Analyst', role: 'Profile Extraction', department: 'Job Intelligence', executive: 'CJO',
      state: 'Completed', currentTask: 'Extract master resume', progress: 100,
      latestUpdate: 'Parsed TryHackMe SOC Simulator labs and master degree details.',
      color: '#89b4fa', // Catppuccin Sapphire
      position: [320, 304] 
    },
    {
      id: 'chro-1', name: 'ATS Optimisation Agent', role: 'ATS Reviewer', department: 'HR', executive: 'CHRO',
      state: 'Waiting', currentTask: 'Awaiting target Job Description', progress: 0,
      latestUpdate: 'Ready to compare SIEM/EDR skills against JD.',
      color: '#a6e3a1', // Catppuccin Green
      position: [448, 240] 
    },
    {
      id: 'cmo-1', name: 'LinkedIn Writer', role: 'Content Creator', department: 'Marketing', executive: 'CMO',
      state: 'Researching', currentTask: 'Drafting post on Incident Triage', progress: 60,
      latestUpdate: 'Structuring post around recent malware sandboxing lab.',
      color: '#cba6f7', // Catppuccin Mauve
      position: [448, 304] 
    }
  ],
  selectedEmployee: null,
  messages: [
    { sender: 'System', text: 'Office initialized. Target: Ireland SOC roles.', time: new Date().toLocaleTimeString() },
    { sender: 'CJO', text: 'Good morning CEO. The Job Discovery agent is currently scanning for roles posted in the last 24 hours.', time: new Date().toLocaleTimeString() }
  ],
  selectEmployee: (emp) => set({ selectedEmployee: emp }),
  addMessage: (sender, text) => set((state) => ({ 
    messages: [...state.messages, { sender, text, time: new Date().toLocaleTimeString() }] 
  }))
}));