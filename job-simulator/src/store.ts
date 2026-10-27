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
  position: [number, number]; 
  idlePosition: [number, number]; 
  deskPosition: [number, number]; 
  spriteKey: string;
}

interface AppState {
  mission: string;
  employees: Employee[];
  selectedEmployee: Employee | null;
  messages: { sender: string; text: string; time: string }[];
  selectEmployee: (emp: Employee | null) => void;
  addMessage: (sender: string, text: string) => void;
  updateEmployeeState: (id: string, state: EmployeeState, task: string, update: string) => void;
}

export const useStore = create<AppState>((set) => ({
  mission: 'Secure L1 SOC Analyst / Junior Security Analyst in Ireland',
 employees: [
    {
      id: 'ceo', name: 'Jay Suratwala', role: 'Chief Executive Officer', department: 'Executive', executive: 'CEO',
      state: 'Idle', currentTask: 'Monitoring C-Suite Operations', progress: 100,
      latestUpdate: 'Reviewing overall hiring strategy from the Discussion Room.',
      color: '#f38ba8', 
      position: [280, 625], // Centered nicely in the Discussion room
      idlePosition: [280, 625],
      deskPosition: [280, 625],
      spriteKey: 'adam'
    },
    {
      id: 'cjo-1', name: 'Job Discovery Agent', role: 'Vacancy Finder', department: 'Job Intelligence', executive: 'CJO',
      state: 'Idle', currentTask: 'Awaiting orders', progress: 0,
      latestUpdate: 'Ready to scan Irish job boards.',
      color: '#89b4fa', 
      position: [240, 220], 
      idlePosition: [240, 220],
      deskPosition: [960, 340], // Clean desk in Operations
      spriteKey: 'ash'
    },
    {
      id: 'chro-1', name: 'ATS Optimisation', role: 'ATS Reviewer', department: 'HR', executive: 'CHRO',
      state: 'Idle', currentTask: 'Awaiting target Job Description', progress: 0,
      latestUpdate: 'Ready to compare skills.',
      color: '#a6e3a1', 
      position: [290, 220], 
      idlePosition: [290, 220],
      deskPosition: [1040, 340], // Clean desk in Operations
      spriteKey: 'lucy'
    },
    {
      id: 'cmo-1', name: 'LinkedIn Writer', role: 'Content Creator', department: 'Marketing', executive: 'CMO',
      state: 'Idle', currentTask: 'Awaiting topics', progress: 0,
      latestUpdate: 'Ready to draft content.',
      color: '#cba6f7', 
      position: [340, 220], 
      idlePosition: [340, 220],
      deskPosition: [1120, 340], // Clean desk in Operations
      spriteKey: 'nancy'
    }
  ],
  selectedEmployee: null,
  messages: [
    { sender: 'System', text: 'Office initialized. Target: Ireland SOC roles.', time: new Date().toLocaleTimeString() }
  ],
  selectEmployee: (emp) => set({ selectedEmployee: emp }),
  addMessage: (sender, text) => set((state) => ({ 
    messages: [...state.messages, { sender, text, time: new Date().toLocaleTimeString() }] 
  })),
  updateEmployeeState: (id, newState, task, update) => set((state) => ({
    employees: state.employees.map(emp => 
      emp.id === id ? { ...emp, state: newState, currentTask: task, latestUpdate: update } : emp
    )
  }))
}));