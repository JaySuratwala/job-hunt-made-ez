import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type EmployeeState =
  | 'Idle'
  | 'Available'
  | 'Working'
  | 'Researching'
  | 'Analysing'
  | 'Writing'
  | 'Reviewing'
  | 'Waiting'
  | 'Waiting for CEO approval'
  | 'Completed'
  | 'Failed'
  | 'Paused'

export interface Employee {
  id: string
  name: string
  role: string
  department: string
  executive: string
  state: EmployeeState
  currentTask: string | null
  progress: number
  latestUpdate: string
  color: string
  position: [number, number]
  idlePosition: [number, number]
  deskPosition: [number, number]
  spriteKey: string
  gender?: 'female' | 'male'
}

export interface ActivityEvent {
  id: string
  actor: string
  recipient: string
  text: string
  time: string
}

export type TaskStatus = 'Pending' | 'Ready' | 'Working' | 'Completed' | 'Blocked' | 'Failed' | 'Skipped'

export interface JobTask {
  id: string
  title: string
  description: string
  employeeId: string
  executive: string
  workflowId?: string
  agentKey?: string
  currentAction?: string | null
  status: TaskStatus
  progress: number
  dependencies: string[]
  output: string | null
  error: string | null
  createdAt: string
  updatedAt: string
  events: ActivityEvent[]
}

export interface JobWorkflow {
  id: string
  kind: string
  query: string
  status: string
  currentAction: string
  taskIds: string[]
  warnings: string[]
  attempt?: number
  parentWorkflowId?: string
  createdAt: string
  updatedAt: string
}

export interface Approval {
  id: string
  title: string
  description: string
  kind: 'demo-shortlist' | 'linkedin-draft' | 'research-results'
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

export interface DemoJob {
  id: string
  title: string
  employer: string
  location: string
  fit: number | null
  reason: string
  source: string
  publishedAt?: string | null
  discoveredAt?: string | null
  sourceUrl?: string | null
  applicationUrl?: string | null
  sourceTitle?: string | null
  salary?: string | null
  employmentType?: string | null
  description?: string | null
  requiredSkills?: string[]
  preferredSkills?: string[]
  experienceRequirements?: string | null
  publicationDate?: string | null
  evidenceCoverage?: number
  extractionConfidence?: { score: number; method: string }
  verificationStatus?: string
  verificationEvidence?: { field: string; quote: string }[]
  matchedPreferences?: string[]
  rankingExplanation?: string
  matchingRequirements?: string[]
  supportingResumeEvidence?: { skill: string; quote: string }[]
  missingRequirements?: string[]
  eligibilityConcerns?: string[]
  evidence?: { field: string; quote: string }[]
}

export interface ChatMessage {
  id: string
  sender: string
  text: string
  time: string
}

interface AppState {
  mission: string
  playerName: string
  chatOnlyMode: boolean
  employees: Employee[]
  selectedEmployeeId: string | null
  selectedExecutive: string
  communicatingExecutive: string | null
  messages: ChatMessage[]
  tasks: JobTask[]
  workflows: JobWorkflow[]
  approvals: Approval[]
  demoJobs: DemoJob[]
  setMission: (mission: string) => void
  setPlayerName: (name: string) => void
  setChatOnlyMode: (enabled: boolean) => void
  setDemoJobs: (jobs: DemoJob[]) => void
  replaceMessages: (messages: ChatMessage[]) => void
  syncServerData: () => Promise<void>
  addMessage: (sender: string, text: string) => void
  selectEmployee: (employeeId: string | null) => void
  selectExecutive: (executive: string) => void
  setCommunicatingExecutive: (executive: string | null) => void
  createDemoJobWorkflow: () => Promise<void>
  runTask: (taskId: string) => Promise<void>
  retryWorkflow: (workflowId: string) => Promise<void>
  createLinkedInApproval: () => Promise<void>
  decideApproval: (approvalId: string, decision: 'Approved' | 'Rejected') => Promise<void>
  resetDemoData: () => Promise<void>
}

const initialEmployees: Employee[] = [
  {
    id: 'ceo',
    name: 'Jay Suratwala',
    role: 'Chief Executive Officer',
    department: 'Executive',
    executive: 'CEO',
    state: 'Idle',
    currentTask: 'Monitoring the job-hunt command centre',
    progress: 100,
    latestUpdate: 'Reviewing current priorities.',
    color: '#f38ba8',
    position: [280, 625],
    idlePosition: [280, 625],
    deskPosition: [280, 625],
    spriteKey: 'adam',
  },
  {
    id: 'cjo-1',
    name: 'Job Discovery Agent',
    role: 'Vacancy Discovery',
    department: 'Job Intelligence',
    executive: 'CJO',
    state: 'Available',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Ready to run a clearly labelled demo workflow.',
    color: '#89b4fa',
    position: [960, 340],
    idlePosition: [240, 220],
    deskPosition: [960, 340],
    spriteKey: 'adam',
  },
  {
    id: 'chro-1',
    name: 'ATS Optimisation Analyst',
    role: 'Resume and ATS Review',
    department: 'People & Applications',
    executive: 'CHRO',
    state: 'Available',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Ready to review a supplied job description and resume.',
    color: '#a6e3a1',
    position: [1040, 340],
    idlePosition: [290, 220],
    deskPosition: [1040, 340],
    spriteKey: 'adam',
  },
  {
    id: 'cmo-1',
    name: 'LinkedIn Writer',
    role: 'Content Creator',
    department: 'Marketing',
    executive: 'CMO',
    state: 'Available',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Ready to prepare a draft from information you provide.',
    color: '#cba6f7',
    position: [1120, 340],
    idlePosition: [340, 220],
    deskPosition: [1120, 340],
    spriteKey: 'adam',
  },
  {
    id: 'exec-cjo',
    name: 'Yashvi Jain',
    role: 'Chief Job Officer',
    department: 'Executive',
    executive: 'CJO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing job discovery and research priorities.',
    color: '#89b4fa',
    position: [1040, 192],
    idlePosition: [1040, 192],
    deskPosition: [1040, 192],
    spriteKey: 'lucy',
    gender: 'female',
  },
  {
    id: 'exec-chro',
    name: 'CHRO',
    role: 'Chief Human Resources Officer',
    department: 'Executive',
    executive: 'CHRO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing candidate and resume intelligence.',
    color: '#a6e3a1',
    position: [336, 608],
    idlePosition: [336, 608],
    deskPosition: [336, 608],
    spriteKey: 'adam',
  },
  {
    id: 'exec-cmo',
    name: 'CMO',
    role: 'Chief Marketing Officer',
    department: 'Executive',
    executive: 'CMO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing candidate communications and content.',
    color: '#cba6f7',
    position: [400, 608],
    idlePosition: [400, 608],
    deskPosition: [400, 608],
    spriteKey: 'adam',
  },
  {
    id: 'exec-clo',
    name: 'CLO',
    role: 'Chief Legal Officer',
    department: 'Executive',
    executive: 'CLO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing compliance and application safeguards.',
    color: '#f9e2af',
    position: [464, 608],
    idlePosition: [464, 608],
    deskPosition: [464, 608],
    spriteKey: 'adam',
  },
  {
    id: 'exec-cto',
    name: 'CTO',
    role: 'Chief Technology Officer',
    department: 'Executive',
    executive: 'CTO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing AI, search, and platform operations.',
    color: '#74c7ec',
    position: [272, 672],
    idlePosition: [272, 672],
    deskPosition: [272, 672],
    spriteKey: 'adam',
  },
  {
    id: 'exec-cfo',
    name: 'CFO',
    role: 'Chief Financial Officer',
    department: 'Executive',
    executive: 'CFO',
    state: 'Idle',
    currentTask: null,
    progress: 0,
    latestUpdate: 'Overseeing budget and resource priorities.',
    color: '#fab387',
    position: [528, 672],
    idlePosition: [528, 672],
    deskPosition: [528, 672],
    spriteKey: 'adam',
  },
]

const initialJobs: DemoJob[] = [
  {
    id: 'demo-soc-1',
    title: 'Junior SOC Analyst',
    employer: 'Sample Security Services',
    location: 'Dublin, Ireland',
    fit: 82,
    reason: 'Demo record for testing the shortlist workflow; no candidate resume or live listing was checked.',
    source: 'DEMO DATA — not a live vacancy',
  },
  {
    id: 'demo-soc-2',
    title: 'Graduate Security Operations Analyst',
    employer: 'Example Cloud Defence',
    location: 'Cork, Ireland',
    fit: 74,
    reason: 'Demo record for testing the ranking workflow; requirements and availability are illustrative.',
    source: 'DEMO DATA — not a live vacancy',
  },
  {
    id: 'demo-soc-3',
    title: 'Security Monitoring Analyst (Tier 1)',
    employer: 'Demo Managed Security',
    location: 'Hybrid — Ireland',
    fit: 68,
    reason: 'Demo record only; work authorisation and role details have not been verified.',
    source: 'DEMO DATA — not a live vacancy',
  },
]

const now = () => new Date().toISOString()
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requestApiData = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `The local API request failed (${response.status}).`
    throw new Error(message)
  }
  if (!isRecord(payload) || !('data' in payload)) throw new Error('The local API returned an invalid response.')
  return payload.data
}

const isTaskList = (value: unknown): value is JobTask[] =>
  Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    typeof item.employeeId === 'string' &&
    typeof item.executive === 'string' &&
    ['Pending', 'Ready', 'Working', 'Completed', 'Blocked', 'Failed', 'Skipped'].includes(String(item.status)) &&
    typeof item.progress === 'number' &&
    Array.isArray(item.dependencies) && item.dependencies.every((id) => typeof id === 'string') &&
    (item.output === null || typeof item.output === 'string') &&
    (item.error === null || typeof item.error === 'string') &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    Array.isArray(item.events) && item.events.every((event) =>
      isRecord(event) &&
      typeof event.id === 'string' &&
      typeof event.actor === 'string' &&
      typeof event.recipient === 'string' &&
      typeof event.text === 'string' &&
      typeof event.time === 'string',
    ),
  )

const isApprovalList = (value: unknown): value is Approval[] =>
  Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    ['demo-shortlist', 'linkedin-draft', 'research-results'].includes(String(item.kind)) &&
    ['Pending', 'Approved', 'Rejected'].includes(String(item.status)) &&
    typeof item.createdAt === 'string',
  )

const isWorkflowList = (value: unknown): value is JobWorkflow[] =>
  Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.kind === 'string' &&
    typeof item.query === 'string' &&
    typeof item.status === 'string' &&
    typeof item.currentAction === 'string' &&
    Array.isArray(item.taskIds) && item.taskIds.every((id) => typeof id === 'string') &&
    Array.isArray(item.warnings) && item.warnings.every((warning) => typeof warning === 'string') &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string',
  )

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    sender: 'System',
    text: 'Office initialized. No live job search or external publishing is configured. Assistant availability is shown in the command centre.',
    time: now(),
  },
]

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      mission: 'Secure L1 SOC Analyst / Junior Security Analyst in Ireland',
      playerName: 'Jay Suratwala',
      chatOnlyMode: false,
      employees: initialEmployees,
      selectedEmployeeId: null,
      selectedExecutive: 'CJO',
      communicatingExecutive: null,
      messages: initialMessages,
      tasks: [],
      workflows: [],
      approvals: [],
      demoJobs: initialJobs,
      setMission: (mission) => set({ mission }),
      setPlayerName: (name) => {
        const playerName = name.trim().slice(0, 40) || 'Jay Suratwala'
        set((state) => ({
          playerName,
          employees: state.employees.map((employee) =>
            employee.id === 'ceo' ? { ...employee, name: playerName } : employee,
          ),
        }))
      },
      setChatOnlyMode: (chatOnlyMode) => set({ chatOnlyMode }),
      setDemoJobs: (demoJobs) => set({ demoJobs }),
      replaceMessages: (messages) => set({ messages: messages.slice(-200) }),
      syncServerData: async () => {
        const [serverTasks, serverApprovals, serverWorkflows] = await Promise.all([
          requestApiData('/api/tasks'),
          requestApiData('/api/approvals'),
          requestApiData('/api/workflows'),
        ])
        if (!isTaskList(serverTasks) || !isApprovalList(serverApprovals) || !isWorkflowList(serverWorkflows)) {
          throw new Error('The local API returned invalid task, workflow, or approval data.')
        }
        set((state) => ({
          tasks: serverTasks,
          workflows: serverWorkflows,
          approvals: serverApprovals,
          employees: state.employees.map((employee) => {
            if (employee.id === 'ceo') return employee
            const assignedTasks = serverTasks
              .filter((task) => task.employeeId === employee.id)
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            const runningTask = assignedTasks.find((task) => task.status === 'Working')
            const latestTask = assignedTasks[0]
            if (runningTask) {
              return {
                ...employee,
                state: 'Working',
                currentTask: runningTask.currentAction || runningTask.title,
                progress: runningTask.progress,
                latestUpdate: runningTask.events[runningTask.events.length - 1]?.text ?? 'Backend task is running.',
              }
            }
            if (!latestTask) return employee
            return {
              ...employee,
              state: latestTask.status === 'Failed'
                ? 'Failed'
                : latestTask.status === 'Completed'
                  ? 'Completed'
                  : latestTask.status === 'Blocked' || latestTask.status === 'Pending'
                    ? 'Waiting'
                    : 'Available',
              currentTask: null,
              progress: latestTask.status === 'Completed' ? 100 : 0,
              latestUpdate: latestTask.error || latestTask.output || latestTask.currentAction || 'No backend task is running.',
            }
          }),
        }))
      },
      addMessage: (sender, text) =>
        set((state) => ({
          messages: [...state.messages, { id: makeId(), sender, text, time: now() }].slice(-200),
        })),
      selectEmployee: (employeeId) => set({ selectedEmployeeId: employeeId }),
      selectExecutive: (executive) => set({ selectedExecutive: executive }),
      setCommunicatingExecutive: (executive) => set({ communicatingExecutive: executive }),
      createDemoJobWorkflow: async () => {
        const { tasks, addMessage } = get()
        if (tasks.some((task) =>
          ['Discover demo job listings', 'Qualify demo listings', 'Rank demo shortlist'].includes(task.title) &&
          task.status !== 'Completed' &&
          task.status !== 'Failed',
        )) {
          addMessage('CJO', 'A demo job workflow is already in progress. Complete or reset it before starting another.')
          return
        }
        try {
          await requestApiData('/api/workflows/demo-job-search', { method: 'POST' })
          await get().syncServerData()
          addMessage('CJO', 'I created a three-step demo workflow. It uses seeded examples only and will not search external sites.')
        } catch (error) {
          addMessage('System', `Could not create the workflow: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
      runTask: async (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId)
        if (!task) return
        try {
          await requestApiData(`/api/tasks/${encodeURIComponent(taskId)}/run`, { method: 'POST' })
          await get().syncServerData()
          const updatedTask = get().tasks.find((candidate) => candidate.id === taskId)
          if (updatedTask?.output) get().addMessage(task.executive, `${task.title}: ${updatedTask.output}`)
        } catch (error) {
          try {
            await get().syncServerData()
          } catch (syncError) {
            get().addMessage('System', `Could not refresh task status: ${syncError instanceof Error ? syncError.message : 'unknown API error'}`)
          }
          get().addMessage('System', `Could not run “${task.title}”: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
      retryWorkflow: async (workflowId) => {
        try {
          await requestApiData(`/api/workflows/${encodeURIComponent(workflowId)}/retry`, { method: 'POST' })
          await get().syncServerData()
          get().addMessage('CJO', 'A new persisted workflow attempt was created. Previous run history remains available.')
        } catch (error) {
          get().addMessage('System', `Could not retry the workflow: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
      createLinkedInApproval: async () => {
        const state = get()
        if (state.approvals.some((approval) => approval.kind === 'linkedin-draft' && approval.status === 'Pending')) {
          state.addMessage('CMO', 'There is already a LinkedIn draft awaiting your review.')
          return
        }
        try {
          await requestApiData('/api/approvals', {
            method: 'POST',
            body: JSON.stringify({
              title: 'Review LinkedIn draft workflow',
              description: 'No draft was generated. This records a setup/approval decision only and will not publish anything.',
              kind: 'linkedin-draft',
            }),
          })
          await get().syncServerData()
          set((current) => ({
            employees: current.employees.map((employee) =>
              employee.id === 'cmo-1'
                ? { ...employee, state: 'Waiting for CEO approval', currentTask: 'Waiting for source material and AI setup', latestUpdate: 'No content has been drafted or published.' }
                : employee,
            ),
          }))
          get().addMessage('CMO', 'I cannot draft or publish a factual post until you provide source material and an AI/publishing integration is configured. I added a setup/approval item instead.')
        } catch (error) {
          get().addMessage('System', `Could not create the approval: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
      decideApproval: async (approvalId, decision) => {
        const approval = get().approvals.find((candidate) => candidate.id === approvalId)
        if (!approval || approval.status !== 'Pending') return
        try {
          await requestApiData(`/api/approvals/${encodeURIComponent(approvalId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: decision }),
          })
          await get().syncServerData()
          const result = decision === 'Approved'
            ? approval.kind === 'demo-shortlist'
              ? 'Demo shortlist approved for local testing only. No application was submitted.'
              : approval.kind === 'research-results'
                ? 'Research results approved for local review only. No application was submitted.'
                : 'Setup request approved. No LinkedIn draft was created or published.'
            : 'Request rejected. No external action was taken.'
          set((state) => ({
            employees: approval.kind === 'linkedin-draft'
              ? state.employees.map((employee) =>
                  employee.id === 'cmo-1'
                    ? { ...employee, state: decision === 'Approved' ? 'Available' : 'Idle', currentTask: null, latestUpdate: result }
                    : employee,
                )
              : state.employees,
          }))
          get().addMessage('System', result)
        } catch (error) {
          get().addMessage('System', `Could not record approval decision: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
      resetDemoData: async () => {
        try {
          await requestApiData('/api/demo/reset', { method: 'POST' })
          set({
          employees: initialEmployees,
          selectedEmployeeId: null,
          communicatingExecutive: null,
          tasks: [],
          workflows: [],
          approvals: [],
          demoJobs: initialJobs,
          messages: initialMessages,
          })
        } catch (error) {
          get().addMessage('System', `Could not reset server data: ${error instanceof Error ? error.message : 'unknown API error'}`)
        }
      },
    }),
    {
      name: 'job-simulator-phase1',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {}
        const savedEmployees = Array.isArray(persisted.employees) ? persisted.employees : currentState.employees
        const playerName = typeof persisted.playerName === 'string' && persisted.playerName.trim()
          ? persisted.playerName.trim().slice(0, 40)
          : currentState.playerName
        const employees = savedEmployees.map((employee) =>
          isRecord(employee)
            ? employee.id === 'exec-cjo'
              ? { ...employee, name: 'Yashvi Jain', spriteKey: 'lucy', gender: 'female' }
              : employee.id === 'ceo'
                ? { ...employee, name: playerName }
                : employee
            : employee,
        )
        const existingIds = new Set(
          employees.flatMap((employee) =>
            isRecord(employee) && typeof employee.id === 'string' ? [employee.id] : [],
          ),
        )

        return {
          ...currentState,
          ...persisted,
          playerName,
          chatOnlyMode: false,
          employees: [
            ...employees,
            ...initialEmployees.filter((employee) => employee.id.startsWith('exec-') && !existingIds.has(employee.id)),
          ],
        }
      },
      partialize: (state) => ({
        mission: state.mission,
        playerName: state.playerName,
        employees: state.employees,
        selectedEmployeeId: state.selectedEmployeeId,
        selectedExecutive: state.selectedExecutive,
        messages: state.messages,
        tasks: state.tasks,
        workflows: state.workflows,
        approvals: state.approvals,
        demoJobs: state.demoJobs,
      }),
    },
  ),
)
