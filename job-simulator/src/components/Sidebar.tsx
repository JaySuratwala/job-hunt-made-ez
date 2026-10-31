import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity,
  AlertCircle,
  Briefcase,
  Check,
  ClipboardList,
  MessageSquare,
  PanelRightClose,
  Pencil,
  Play,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useStore, type ChatMessage, type DemoJob } from '../store'

type Panel = 'Command' | 'Profile' | 'Team' | 'Tasks' | 'Jobs' | 'Approvals'
type CandidateProfile = {
  targetRoles: string[]
  locations: string[]
  verifiedSkills: string[]
  experienceYears: number | null
  resumeEvidence: string[]
  workAuthorisation: string | number | boolean | null
  salaryExpectation: string | number | boolean | null
  sponsorshipRequired: string | number | boolean | null
  [key: string]: unknown
}

type ResearchWorkflow = {
  id: string
  status: string
  error?: string
  result?: { jobs: DemoJob[]; sourcesReviewed: number; warnings: string[] }
}

const panels: { name: Panel; icon: typeof Activity }[] = [
  { name: 'Command', icon: Activity },
  { name: 'Profile', icon: UserRound },
  { name: 'Team', icon: Users },
  { name: 'Tasks', icon: ClipboardList },
  { name: 'Jobs', icon: Briefcase },
  { name: 'Approvals', icon: ShieldCheck },
]

const initialCandidateProfile: CandidateProfile = {
  targetRoles: ['SOC Analyst Tier 1', 'Junior Security Analyst'],
  locations: ['Ireland'],
  verifiedSkills: [],
  experienceYears: null,
  resumeEvidence: [],
  workAuthorisation: null,
  salaryExpectation: null,
  sponsorshipRequired: null,
}

const isCandidateProfile = (value: unknown): value is CandidateProfile =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'targetRoles' in value &&
  Array.isArray(value.targetRoles) &&
  value.targetRoles.every((item: unknown) => typeof item === 'string') &&
  'locations' in value &&
  Array.isArray(value.locations) &&
  value.locations.every((item: unknown) => typeof item === 'string') &&
  (!('verifiedSkills' in value) ||
    (Array.isArray(value.verifiedSkills) && value.verifiedSkills.every((item: unknown) => typeof item === 'string'))) &&
  (!('resumeEvidence' in value) ||
    (Array.isArray(value.resumeEvidence) && value.resumeEvidence.every((item: unknown) => typeof item === 'string'))) &&
  (!('experienceYears' in value) ||
    value.experienceYears === null ||
    (typeof value.experienceYears === 'number' && Number.isFinite(value.experienceYears) && value.experienceYears >= 0))

const parseListField = (value: string) =>
  value.split(',').map((item) => item.trim()).filter(Boolean)

const missionFromProfile = (profile: CandidateProfile) => {
  const roles = profile.targetRoles.join(' / ')
  const locations = profile.locations.join(', ')
  if (roles && locations) return `Find ${roles} opportunities in ${locations}`
  if (roles) return `Find ${roles} opportunities`
  if (locations) return `Find suitable job opportunities in ${locations}`
  return 'Set target roles and locations in Candidate Profile'
}

const statusColor = (status: string) => {
  if (status === 'Completed' || status === 'Approved') return 'text-[#a6e3a1]'
  if (status === 'Failed' || status === 'Rejected') return 'text-[#f38ba8]'
  if (status === 'Blocked' || status === 'Pending' || status === 'Waiting for CEO approval' || status === 'CompletedWithWarnings') return 'text-[#f9e2af]'
  if (status === 'Skipped') return 'text-[#6c7086]'
  return 'text-[#89b4fa]'
}

const isDemoJobList = (value: unknown): value is DemoJob[] =>
  Array.isArray(value) && value.every((job) =>
    typeof job === 'object' &&
    job !== null &&
    'id' in job && typeof job.id === 'string' &&
    'title' in job && typeof job.title === 'string' &&
    'employer' in job && typeof job.employer === 'string' &&
    'location' in job && typeof job.location === 'string' &&
    'fit' in job && (typeof job.fit === 'number' || job.fit === null) &&
    'reason' in job && typeof job.reason === 'string' &&
    'source' in job && typeof job.source === 'string' &&
    (!('sourceUrl' in job) || job.sourceUrl === null || typeof job.sourceUrl === 'string') &&
    (!('applicationUrl' in job) || job.applicationUrl === null || typeof job.applicationUrl === 'string') &&
    (!('sourceTitle' in job) || job.sourceTitle === null || typeof job.sourceTitle === 'string') &&
    (!('description' in job) || job.description === null || typeof job.description === 'string') &&
    (!('requiredSkills' in job) || (Array.isArray(job.requiredSkills) && job.requiredSkills.every((item: unknown) => typeof item === 'string'))) &&
    (!('preferredSkills' in job) || (Array.isArray(job.preferredSkills) && job.preferredSkills.every((item: unknown) => typeof item === 'string'))) &&
    (!('experienceRequirements' in job) || job.experienceRequirements === null || typeof job.experienceRequirements === 'string') &&
    (!('publicationDate' in job) || job.publicationDate === null || typeof job.publicationDate === 'string') &&
    (!('evidenceCoverage' in job) || (typeof job.evidenceCoverage === 'number' && job.evidenceCoverage >= 0 && job.evidenceCoverage <= 100)) &&
    (!('extractionConfidence' in job) || (
      typeof job.extractionConfidence === 'object' &&
      job.extractionConfidence !== null &&
      'score' in job.extractionConfidence &&
      typeof job.extractionConfidence.score === 'number' &&
      job.extractionConfidence.score >= 0 &&
      job.extractionConfidence.score <= 1 &&
      'method' in job.extractionConfidence &&
      typeof job.extractionConfidence.method === 'string'
    )) &&
    (!('verificationStatus' in job) || ['verified', 'partially_verified'].includes(String(job.verificationStatus))) &&
    (!('rankingExplanation' in job) || typeof job.rankingExplanation === 'string') &&
    (!('eligibilityConcerns' in job) || (Array.isArray(job.eligibilityConcerns) && job.eligibilityConcerns.every((item: unknown) => typeof item === 'string'))) &&
    (!('evidence' in job) || (
      Array.isArray(job.evidence) &&
      job.evidence.every((item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        'field' in item && typeof item.field === 'string' &&
        'quote' in item && typeof item.quote === 'string',
      )
    )),
  )

const isJobResearchResult = (value: unknown): value is {
  jobs: DemoJob[]
  sourcesReviewed: number
  warnings: string[]
} =>
  typeof value === 'object' &&
  value !== null &&
  'jobs' in value &&
  isDemoJobList(value.jobs) &&
  'sourcesReviewed' in value &&
  typeof value.sourcesReviewed === 'number' &&
  'warnings' in value &&
  Array.isArray(value.warnings) &&
  value.warnings.every((warning: unknown) => typeof warning === 'string')

const isChatMessage = (value: unknown): value is ChatMessage =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value && typeof value.id === 'string' &&
  'sender' in value && typeof value.sender === 'string' &&
  'text' in value && typeof value.text === 'string' &&
  'time' in value && typeof value.time === 'string'

const isChatMessageList = (value: unknown): value is ChatMessage[] =>
  Array.isArray(value) && value.every(isChatMessage)

const isResearchWorkflow = (value: unknown): value is ResearchWorkflow =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value && typeof value.id === 'string' &&
  'status' in value && typeof value.status === 'string'

const safeSourceHref = (value: string | null | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

interface SidebarProps {
  chatOnlyMode: boolean
  onToggleChatOnlyMode: () => void
  onCollapse: () => void
}

export const Sidebar = ({ chatOnlyMode, onToggleChatOnlyMode, onCollapse }: SidebarProps) => {
  const {
    mission,
    setMission,
    playerName,
    employees,
    selectedEmployeeId,
    selectedExecutive,
    messages,
    tasks,
    workflows,
    approvals,
    demoJobs,
    setDemoJobs,
    addMessage,
    selectEmployee,
    selectExecutive,
    setCommunicatingExecutive,
    createDemoJobWorkflow,
    runTask,
    retryWorkflow,
    createLinkedInApproval,
    decideApproval,
    resetDemoData,
    setPlayerName,
    replaceMessages,
    syncServerData,
  } = useStore()
  const [input, setInput] = useState('')
  const commandContentRef = useRef<HTMLElement>(null)
  const [nameDraft, setNameDraft] = useState(playerName)
  const [editingName, setEditingName] = useState(false)
  const [panel, setPanel] = useState<Panel>('Command')
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking')
  const [apiError, setApiError] = useState<string | null>(null)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [searchConfigured, setSearchConfigured] = useState(false)
  const [researchConfigured, setResearchConfigured] = useState(false)
  const [researchQuery, setResearchQuery] = useState(mission)
  const [researching, setResearching] = useState(false)
  const [profileDraft, setProfileDraft] = useState<CandidateProfile>(initialCandidateProfile)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId)
  const activeTasks = tasks.filter((task) => task.status === 'Ready' || task.status === 'Blocked').length
  const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending').length
  const hasRunningTasks = tasks.some((task) => task.status === 'Working')
  const activePanel = chatOnlyMode ? 'Command' : panel

  useEffect(() => {
    if (activePanel !== 'Command') return
    const commandContent = commandContentRef.current
    if (commandContent) {
      commandContent.scrollTo({ top: commandContent.scrollHeight, behavior: 'smooth' })
    }
  }, [activePanel, messages])

  useEffect(() => {
    const controller = new AbortController()
    const loadApiData = async () => {
      try {
        const healthResponse = await fetch('/api/health', { signal: controller.signal })
        if (!healthResponse.ok) throw new Error(`Health check failed (${healthResponse.status}).`)
        const health: unknown = await healthResponse.json()
        if (
          typeof health !== 'object' ||
          health === null ||
          !('status' in health) ||
          health.status !== 'ok' ||
          !('mode' in health) ||
          health.mode !== 'local-demo' ||
          !('ai' in health) ||
          typeof health.ai !== 'object' ||
          health.ai === null ||
          !('configured' in health.ai) ||
          typeof health.ai.configured !== 'boolean' ||
          !('integrations' in health) ||
          typeof health.integrations !== 'object' ||
          health.integrations === null ||
          !('webSearch' in health.integrations) ||
          typeof health.integrations.webSearch !== 'boolean' ||
          !('research' in health) ||
          typeof health.research !== 'object' ||
          health.research === null ||
          !('configured' in health.research) ||
          typeof health.research.configured !== 'boolean'
        ) {
          throw new Error('The local API returned an unexpected health response.')
        }

        const jobsResponse = await fetch('/api/jobs', { signal: controller.signal })
        if (!jobsResponse.ok) throw new Error(`Could not load sample jobs (${jobsResponse.status}).`)
        const jobsPayload: unknown = await jobsResponse.json()
        if (typeof jobsPayload !== 'object' || jobsPayload === null || !('data' in jobsPayload) || !isDemoJobList(jobsPayload.data)) {
          throw new Error('The local API returned invalid job records.')
        }

        const profileResponse = await fetch('/api/profile', { signal: controller.signal })
        if (!profileResponse.ok) throw new Error(`Could not load candidate profile (${profileResponse.status}).`)
        const profilePayload: unknown = await profileResponse.json()
        if (
          typeof profilePayload !== 'object' ||
          profilePayload === null ||
          !('data' in profilePayload) ||
          !isCandidateProfile(profilePayload.data)
        ) {
          throw new Error('The local API returned an invalid candidate profile.')
        }

        const conversationResponse = await fetch('/api/conversation/messages', { signal: controller.signal })
        if (!conversationResponse.ok) throw new Error(`Could not load saved chat memory (${conversationResponse.status}).`)
        const conversationPayload: unknown = await conversationResponse.json()
        if (
          typeof conversationPayload !== 'object' ||
          conversationPayload === null ||
          !('data' in conversationPayload) ||
          !isChatMessageList(conversationPayload.data)
        ) {
          throw new Error('The local API returned invalid saved chat memory.')
        }

        if (!controller.signal.aborted) {
          const loadedProfile = {
            ...initialCandidateProfile,
            ...profilePayload.data,
            verifiedSkills: profilePayload.data.verifiedSkills ?? [],
            resumeEvidence: profilePayload.data.resumeEvidence ?? [],
            experienceYears: profilePayload.data.experienceYears ?? null,
          }
          setProfileDraft(loadedProfile)
          setProfileLoaded(true)
          setMission(missionFromProfile(loadedProfile))
          setResearchQuery(missionFromProfile(loadedProfile))
          const knownMessages = new Map(
            useStore.getState().messages.map((message) => [message.id, message]),
          )
          conversationPayload.data.forEach((message) => knownMessages.set(message.id, message))
          replaceMessages([...knownMessages.values()].sort((left, right) => left.time.localeCompare(right.time)))
          setDemoJobs(jobsPayload.data)
          setAiConfigured(health.ai.configured)
          setSearchConfigured(health.integrations.webSearch)
          setResearchConfigured(health.research.configured)
          await syncServerData()
          setApiError(null)
          setApiStatus('connected')
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setApiError(error instanceof Error ? error.message : 'The local API could not be reached.')
        setApiStatus('offline')
      }
    }

    void loadApiData()
    return () => controller.abort()
  }, [replaceMessages, setDemoJobs, setMission, syncServerData])

  useEffect(() => {
    if (apiStatus !== 'connected') return
    let timer: ReturnType<typeof setTimeout>
    let active = true
    const poll = async () => {
      try {
        await syncServerData()
      } catch (error) {
        if (active) setApiError(error instanceof Error ? error.message : 'Could not refresh backend task state.')
      }
      if (active) {
        const currentlyRunning = useStore.getState().tasks.some((task) => task.status === 'Working')
        timer = setTimeout(poll, currentlyRunning ? 900 : 5000)
      }
    }
    timer = setTimeout(poll, hasRunningTasks ? 900 : 5000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [apiStatus, hasRunningTasks, syncServerData])

  const researchJobs = async (query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || researching) return
    setResearching(true)
    try {
      const response = await fetch('/api/workflows/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery }),
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `Job research failed (${response.status}).`
        throw new Error(errorMessage)
      }
      if (typeof payload !== 'object' || payload === null || !('data' in payload) ||
        !isResearchWorkflow(payload.data)) {
        throw new Error('The workflow service returned an invalid response.')
      }
      const workflowId = payload.data.id
      addMessage('CJO', `Research workflow ${workflowId.slice(0, 8)} started. Backend task status will drive employee activity; inaccessible sources and unsupported fields will remain unverified.`)
      let workflow: ResearchWorkflow = payload.data
      do {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        const statusResponse = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`)
        const statusPayload: unknown = await statusResponse.json()
        if (!statusResponse.ok || typeof statusPayload !== 'object' || statusPayload === null ||
          !('data' in statusPayload) || !isResearchWorkflow(statusPayload.data)) {
          throw new Error('Could not read the persisted research workflow status.')
        }
        workflow = statusPayload.data
      } while (!['Completed', 'CompletedWithWarnings', 'Failed'].includes(workflow.status))
      if (workflow.status === 'Failed') {
        throw new Error(workflow.error ?? 'The research workflow failed without a reported result.')
      }
      if (!workflow.result || !isJobResearchResult(workflow.result)) {
        throw new Error('The workflow finished without a valid research result.')
      }
      const researchResult = workflow.result
      const contextOnlyLeads = researchResult.jobs.filter((job) =>
        job.source?.startsWith('BRAVE LLM CONTEXT'),
      ).length
      if (researchResult.jobs.length) {
        setDemoJobs([
          ...researchResult.jobs,
          ...demoJobs.filter((existing) =>
            !researchResult.jobs.some((found) => found.sourceUrl && found.sourceUrl === existing.sourceUrl),
          ),
        ])
      }
      addMessage(
        'CJO',
        `Research checked ${researchResult.sourcesReviewed} original source page(s) and returned ${researchResult.jobs.length} evidence-backed lead(s); ${contextOnlyLeads} use Brave excerpts without original-page verification. Review all records and unknowns before acting.${researchResult.warnings.length ? ` Review notes: ${researchResult.warnings.slice(0, 3).join(' | ')}` : ''}`,
      )
      setPanel('Jobs')
    } catch (error) {
      addMessage('System', error instanceof Error ? error.message : 'Job research failed.')
    } finally {
      setResearching(false)
    }
  }

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setInput('')
    let conversationMessageId: string | undefined
    try {
      const savedMessageResponse = await fetch('/api/conversation/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          sender: playerName,
          text,
          executive: selectedExecutive,
        }),
      })
      const savedMessagePayload: unknown = await savedMessageResponse.json()
      if (!savedMessageResponse.ok) {
        const message = typeof savedMessagePayload === 'object' &&
          savedMessagePayload !== null &&
          'error' in savedMessagePayload &&
          typeof savedMessagePayload.error === 'string'
          ? savedMessagePayload.error
          : `Chat memory save failed (${savedMessageResponse.status}).`
        throw new Error(message)
      }
      if (
        typeof savedMessagePayload !== 'object' ||
        savedMessagePayload === null ||
        !('data' in savedMessagePayload) ||
        !isChatMessage(savedMessagePayload.data)
      ) {
        throw new Error('The local API returned an invalid saved chat message.')
      }
      conversationMessageId = savedMessagePayload.data.id
      replaceMessages([...useStore.getState().messages, savedMessagePayload.data])
    } catch (error) {
      addMessage(playerName, text)
      addMessage('System', `This message is saved only in this browser; local chat memory could not be updated: ${error instanceof Error ? error.message : 'unknown API error'}`)
    }
    const command = text.toLowerCase()
    setCommunicatingExecutive(selectedExecutive)

    try {
      if (selectedExecutive === 'CJO' && /\b(job|jobs|soc|vacanc|search|find)\b/.test(command)) {
        if (/\bdemo\b/.test(command)) await createDemoJobWorkflow()
        else await researchJobs(text)
      } else if (selectedExecutive === 'CMO' && /\b(linkedin|post|content|draft)\b/.test(command)) {
        await createLinkedInApproval()
      } else {
        try {
          const response = await fetch('/api/assistant/message', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ executive: selectedExecutive, message: text, conversationMessageId }),
          })
          const payload: unknown = await response.json()
          if (!response.ok) {
            const errorMessage =
              typeof payload === 'object' &&
              payload !== null &&
              'error' in payload &&
              typeof payload.error === 'string'
                ? payload.error
                : `Assistant request failed (${response.status}).`
            throw new Error(errorMessage)
          }
          if (
            typeof payload !== 'object' ||
            payload === null ||
            !('data' in payload) ||
            typeof payload.data !== 'object' ||
            payload.data === null ||
            !('content' in payload.data) ||
            typeof payload.data.content !== 'string'
          ) {
            throw new Error('The AI service returned an invalid response.')
          }
          if ('assistantMessage' in payload.data && isChatMessage(payload.data.assistantMessage)) {
            replaceMessages([...useStore.getState().messages, payload.data.assistantMessage])
          } else {
            addMessage(selectedExecutive, payload.data.content)
          }
        } catch (error) {
          addMessage('System', error instanceof Error ? error.message : 'The AI request failed.')
        }
      }
    } finally {
      setCommunicatingExecutive(null)
    }

  }

  const handleReset = () => {
    if (window.confirm('Reset tasks, research runs, approvals, messages, and employee status? Saved jobs and application history will remain.')) {
      resetDemoData()
      setPanel('Command')
    }
  }

  const handleSaveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPlayerName(nameDraft)
    setEditingName(false)
  }

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updatedProfile: CandidateProfile = {
      ...profileDraft,
      targetRoles: profileDraft.targetRoles,
      locations: profileDraft.locations,
      verifiedSkills: profileDraft.verifiedSkills,
      resumeEvidence: profileDraft.resumeEvidence,
      experienceYears: profileDraft.experienceYears,
    }
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `Profile save failed (${response.status}).`
        throw new Error(errorMessage)
      }
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('data' in payload) ||
        !isCandidateProfile(payload.data)
      ) {
        throw new Error('The local API returned an invalid saved profile.')
      }
      const savedProfile = { ...initialCandidateProfile, ...payload.data }
      setProfileDraft(savedProfile)
      setMission(missionFromProfile(savedProfile))
      setResearchQuery(missionFromProfile(savedProfile))
      setProfileSaved(true)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save candidate profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const updateProfileDraft = <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => {
    setProfileDraft((current) => ({ ...current, [field]: value }))
    setProfileSaved(false)
  }

  return (
    <aside className="flex h-screen w-full flex-col overflow-hidden bg-[#181825] font-mono text-[#cdd6f4]">
      <header className="border-b border-[#313244] bg-[#11111b] p-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onCollapse} aria-label="Collapse Command Centre" title="Collapse Command Centre" className="rounded p-1 text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4]">
              <PanelRightClose size={16} />
            </button>
            <h1 className="truncate text-xl font-bold text-[#89b4fa]">Command Centre{chatOnlyMode ? ' · Chat mode' : ''}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onToggleChatOnlyMode} aria-pressed={chatOnlyMode} className="flex items-center gap-1 rounded border border-[#45475a] px-2 py-1 text-[10px] text-[#cdd6f4] hover:bg-[#313244]">
              <MessageSquare size={12} /> {chatOnlyMode ? 'Exit chat mode' : 'Chat mode'}
            </button>
            <span className="rounded border border-[#f9e2af]/40 bg-[#f9e2af]/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-[#f9e2af]">
              {researchConfigured ? 'LIVE SEARCH READY' : 'DEMO MODE'}
            </span>
          </div>
        </div>
        <div className={`mt-2 text-[10px] ${apiStatus === 'connected' ? 'text-[#a6e3a1]' : apiStatus === 'offline' ? 'text-[#f9e2af]' : 'text-[#a6adc8]'}`}>
          {apiStatus === 'connected' ? `Local API connected · AI ${aiConfigured ? 'configured' : 'not configured'}` : apiStatus === 'offline' ? 'API offline · server tasks unavailable' : 'Checking local job-hunt API…'}
          {apiError && <span className="ml-1 text-[#a6adc8]">({apiError})</span>}
        </div>
        <div className="mt-2 flex items-center gap-2 rounded border border-[#313244] bg-[#1e1e2e] p-2 text-xs">
          <Activity size={14} className="shrink-0 text-[#89b4fa]" />
          <span className="font-semibold text-[#a6adc8]">MISSION:</span>
          <span className="truncate">{mission}</span>
        </div>
        <div className="mt-2 flex gap-2 text-[11px]">
          <span className="rounded bg-[#1e1e2e] px-2 py-1 text-[#a6adc8]">
            {activeTasks} ready / blocked tasks
          </span>
          <span className="rounded bg-[#1e1e2e] px-2 py-1 text-[#a6adc8]">
            {pendingApprovals} approvals
          </span>
        </div>
        <form onSubmit={handleSaveName} className="mt-2 flex items-center gap-2">
          {editingName ? (
            <>
              <label htmlFor="player-name" className="shrink-0 text-[10px] text-[#a6adc8]">Player name</label>
              <input
                id="player-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={40}
                autoFocus
                className="min-w-0 flex-1 rounded border border-[#45475a] bg-[#1e1e2e] px-2 py-1 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
              />
              <button type="submit" aria-label="Save player name" className="rounded p-1 text-[#a6e3a1] hover:bg-[#313244]"><Save size={14} /></button>
              <button type="button" onClick={() => { setNameDraft(playerName); setEditingName(false) }} aria-label="Cancel name edit" className="rounded p-1 text-[#a6adc8] hover:bg-[#313244]"><X size={14} /></button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#a6adc8]">Playing as <span className="text-[#cdd6f4]">{playerName}</span></span>
              <button type="button" onClick={() => { setNameDraft(playerName); setEditingName(true) }} aria-label="Edit player name" className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4]"><Pencil size={12} /> Rename</button>
            </>
          )}
        </form>
      </header>

      {!chatOnlyMode && <nav aria-label="Command centre panels" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#313244] bg-[#11111b] p-2">
        {panels.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setPanel(name)}
            aria-pressed={activePanel === name}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-2 py-2 text-[11px] transition-colors ${
              activePanel === name ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#a6adc8] hover:bg-[#1e1e2e]'
            }`}
          >
            <Icon size={13} />
            {name}
            {name === 'Approvals' && pendingApprovals > 0 && (
              <span className="rounded-full bg-[#f9e2af] px-1.5 text-[#11111b]">{pendingApprovals}</span>
            )}
          </button>
        ))}
      </nav>}

      {selectedEmployee && !chatOnlyMode && (
        <section className="border-b border-[#313244] bg-[#313244]/50 p-3" aria-label="Selected employee details">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Briefcase size={15} /> {selectedEmployee.name}
            </h2>
            <button type="button" onClick={() => selectEmployee(null)} aria-label="Close employee details" className="rounded p-1 text-[#a6adc8] hover:bg-[#45475a]">
              <X size={14} />
            </button>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-[#a6adc8]">
            <span>{selectedEmployee.role} · {selectedEmployee.department}</span>
            <span className={statusColor(selectedEmployee.state)}>{selectedEmployee.state}</span>
          </div>
          <p className="mt-2 rounded border border-[#313244] bg-[#1e1e2e] p-2 text-xs">
            {selectedEmployee.currentTask ?? 'No task assigned'}
          </p>
          <p className="mt-1 text-[11px] text-[#a6adc8]">{selectedEmployee.latestUpdate}</p>
          {tasks.filter((task) => task.employeeId === selectedEmployee.id).slice(-1).map((task) => (
            <div key={task.id} className="mt-2 border-t border-[#45475a] pt-2">
              <div className="text-[10px] uppercase tracking-wide text-[#a6adc8]">Activity feed · {task.executive} → {selectedEmployee.name}</div>
              {task.events.slice(-3).map((event) => (
                <p key={event.id} className="mt-1 text-[11px] text-[#cdd6f4]">
                  <span className="text-[#89b4fa]">{event.actor} → {event.recipient}:</span> {event.text}
                </p>
              ))}
            </div>
          ))}
        </section>
      )}

      <main ref={commandContentRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {activePanel === 'Command' && (
          <section aria-label="Executive conversation">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="executive" className="text-xs text-[#a6adc8]">Message executive</label>
              <select
                id="executive"
                value={selectedExecutive}
                onChange={(event) => selectExecutive(event.target.value)}
                className="rounded border border-[#45475a] bg-[#1e1e2e] px-2 py-1 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
              >
                {['CJO', 'CMO', 'CHRO', 'CLO', 'CTO', 'CFO'].map((executive) => (
                  <option key={executive} value={executive}>{executive}</option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex flex-col ${message.sender === 'CEO' || message.sender === playerName ? 'items-end' : 'items-start'}`}>
                  <span className="mb-1 text-[10px] text-[#a6adc8]">{message.sender} · {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className={`max-w-[95%] rounded-lg p-3 text-sm ${
                    message.sender === 'CEO' || message.sender === playerName
                      ? 'bg-[#89b4fa] text-[#11111b]'
                      : 'border border-[#45475a] bg-[#313244] text-[#cdd6f4]'
                  }`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePanel === 'Profile' && (
          <section aria-label="Candidate profile">
            <div className="mb-3">
              <h2 className="text-sm font-bold">Candidate Profile</h2>
              <p className="mt-1 text-[11px] text-[#a6adc8]">
                Update your preferences and evidence. Saving updates the mission shown across the Command Centre.
              </p>
            </div>
            {!profileLoaded ? (
              <p className="rounded border border-[#313244] bg-[#1e1e2e] p-3 text-xs text-[#a6adc8]">
                Candidate profile loads from the local API when it is connected.
              </p>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-3">
                <label className="block text-xs text-[#a6adc8]">
                  Target roles <span className="text-[10px]">(comma-separated)</span>
                  <textarea
                    value={profileDraft.targetRoles.join(', ')}
                    onChange={(event) => updateProfileDraft('targetRoles', parseListField(event.target.value))}
                    rows={2}
                    className="mt-1 w-full rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
                  />
                </label>
                <label className="block text-xs text-[#a6adc8]">
                  Preferred locations <span className="text-[10px]">(comma-separated)</span>
                  <input
                    value={profileDraft.locations.join(', ')}
                    onChange={(event) => updateProfileDraft('locations', parseListField(event.target.value))}
                    className="mt-1 w-full rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
                  />
                </label>
                <label className="block text-xs text-[#a6adc8]">
                  Verified skills <span className="text-[10px]">(comma-separated)</span>
                  <textarea
                    value={profileDraft.verifiedSkills.join(', ')}
                    onChange={(event) => updateProfileDraft('verifiedSkills', parseListField(event.target.value))}
                    rows={2}
                    className="mt-1 w-full rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
                  />
                </label>
                <label className="block text-xs text-[#a6adc8]">
                  Resume / portfolio evidence <span className="text-[10px]">(one item per line)</span>
                  <textarea
                    value={profileDraft.resumeEvidence.join('\n')}
                    onChange={(event) => updateProfileDraft('resumeEvidence', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                    rows={4}
                    className="mt-1 w-full rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
                  />
                </label>
                <label className="block text-xs text-[#a6adc8]">
                  Years of experience
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={profileDraft.experienceYears ?? ''}
                    onChange={(event) => updateProfileDraft('experienceYears', event.target.value ? Number(event.target.value) : null)}
                    className="mt-1 w-full rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-xs text-[#cdd6f4] focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
                  />
                </label>
                <div className="rounded border border-[#313244] bg-[#1e1e2e] p-2 text-xs">
                  <span className="text-[10px] uppercase tracking-wide text-[#a6adc8]">Mission preview</span>
                  <p className="mt-1 text-[#cdd6f4]">{missionFromProfile(profileDraft)}</p>
                </div>
                {profileError && <p role="alert" className="text-xs text-[#f38ba8]">{profileError}</p>}
                {profileSaved && <p role="status" className="text-xs text-[#a6e3a1]">Candidate profile and mission saved.</p>}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 rounded bg-[#89b4fa] px-3 py-2 text-xs font-semibold text-[#11111b] hover:bg-[#b4befe] disabled:cursor-wait disabled:opacity-60"
                >
                  <Save size={14} /> {profileSaving ? 'Saving profile…' : 'Save profile'}
                </button>
              </form>
            )}
          </section>
        )}

        {activePanel === 'Team' && (
          <section aria-label="Team directory" className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Team directory</h2>
              <span className="text-[10px] text-[#a6adc8]">Select a person to inspect activity</span>
            </div>
            {employees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => selectEmployee(employee.id)}
                className="w-full rounded border border-[#313244] bg-[#1e1e2e] p-3 text-left hover:border-[#89b4fa]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{employee.name}</span>
                  <span className={`text-[10px] ${statusColor(employee.state)}`}>{employee.state}</span>
                </span>
                <span className="mt-1 block text-[11px] text-[#a6adc8]">{employee.role} · {employee.executive}</span>
                <span className="mt-2 block text-xs text-[#cdd6f4]">{employee.currentTask ?? 'Available for work'}</span>
                <span className="mt-1 block text-[10px] text-[#a6adc8]">{employee.latestUpdate}</span>
              </button>
            ))}
          </section>
        )}

        {activePanel === 'Tasks' && (
          <section aria-label="Task board">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Task board</h2>
              <span className="text-[10px] text-[#a6adc8]">Dependencies block out-of-order steps</span>
            </div>
            {tasks.length === 0 && <p className="rounded border border-[#313244] bg-[#1e1e2e] p-3 text-xs text-[#a6adc8]">No tasks yet. Ask CJO to find jobs to create a demo workflow.</p>}
            {workflows.length > 0 && (
              <div className="mb-3 space-y-2">
                <h3 className="text-xs font-semibold text-[#a6adc8]">Research runs</h3>
                {workflows.slice(0, 5).map((workflow) => (
                  <article key={workflow.id} className="rounded border border-[#313244] bg-[#1e1e2e] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold">{workflow.query}</p>
                      <span className={`shrink-0 text-[10px] ${statusColor(workflow.status)}`}>{workflow.status}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#a6adc8]">{workflow.currentAction}</p>
                    {workflow.warnings.length > 0 && (
                      <p className="mt-1 text-[10px] text-[#f9e2af]">{workflow.warnings.length} review note(s) recorded.</p>
                    )}
                    {['Failed', 'CompletedWithWarnings'].includes(workflow.status) && (workflow.attempt ?? 1) < 3 && (
                      <button type="button" onClick={() => void retryWorkflow(workflow.id)} className="mt-2 rounded bg-[#313244] px-2 py-1 text-[10px] text-[#cdd6f4] hover:bg-[#45475a]">
                        Retry as new run · attempt {(workflow.attempt ?? 1) + 1}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {tasks.map((task) => {
                const employee = employees.find((candidate) => candidate.id === task.employeeId)
                const canRun = !task.workflowId &&
                  (task.status === 'Ready' || task.status === 'Blocked' || task.status === 'Failed') &&
                  task.dependencies.every((dependencyId) => tasks.some((dependency) => dependency.id === dependencyId && dependency.status === 'Completed'))
                return (
                  <article key={task.id} className="rounded border border-[#313244] bg-[#1e1e2e] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-semibold">{task.title}</h3>
                      <span className={`shrink-0 text-[10px] ${statusColor(task.status)}`}>{task.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#a6adc8]">{task.description}</p>
                    <p className="mt-2 text-[10px] text-[#89b4fa]">Assigned to {employee?.name ?? task.employeeId} · {task.executive}</p>
                    {task.currentAction && task.status === 'Working' && (
                      <p className="mt-1 text-[10px] text-[#a6e3a1]">{task.currentAction} · {task.progress}%</p>
                    )}
                    {task.dependencies.length > 0 && (
                      <p className="mt-1 text-[10px] text-[#a6adc8]">Depends on {task.dependencies.map((id) => tasks.find((item) => item.id === id)?.title ?? id).join(', ')}</p>
                    )}
                    {task.output && <p className="mt-2 rounded bg-[#11111b] p-2 text-[11px]">{task.output}</p>}
                    {task.error && <p className="mt-2 flex items-center gap-1 text-[11px] text-[#f38ba8]"><AlertCircle size={12} />{task.error}</p>}
                    {canRun && (
                      <button type="button" onClick={() => runTask(task.id)} className="mt-3 flex items-center gap-1 rounded bg-[#89b4fa] px-2 py-1.5 text-[11px] font-semibold text-[#11111b] hover:bg-[#b4befe]">
                        <Play size={12} /> {task.status === 'Failed' ? 'Retry task' : 'Run task'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {activePanel === 'Jobs' && (
          <section aria-label="Job shortlist">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Job intelligence</h2>
              <span className="text-[10px] text-[#f9e2af]">{researchConfigured ? 'Evidence-first research' : 'Research not configured'}</span>
            </div>
            <p className="mb-3 rounded border border-[#f9e2af]/30 bg-[#f9e2af]/5 p-2 text-[11px] text-[#f9e2af]">
              Titles and employers receive a separate evidence check. Other fields, publication dates, vacancy status, eligibility, and candidate fit remain unverified until reviewed against the source.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void researchJobs(researchQuery)
              }}
              className="mb-3 space-y-2 rounded border border-[#313244] bg-[#1e1e2e] p-3"
            >
              <label htmlFor="job-research-query" className="block text-[11px] text-[#a6adc8]">Search needs (CJO extracts role and location variations)</label>
              <textarea
                id="job-research-query"
                value={researchQuery}
                onChange={(event) => setResearchQuery(event.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full resize-y rounded border border-[#45475a] bg-[#181825] p-2 text-xs text-[#cdd6f4] focus:border-[#89b4fa] focus:outline-none"
              />
              <button type="submit" disabled={researching || !researchConfigured} className="flex w-full items-center justify-center gap-2 rounded bg-[#89b4fa] px-3 py-2 text-xs font-semibold text-[#11111b] hover:bg-[#b4befe] disabled:cursor-not-allowed disabled:opacity-50">
                <Search size={14} /> {researching ? 'Searching sources and checking evidence…' : 'Research live jobs'}
              </button>
              {!aiConfigured && <p className="text-[10px] text-[#f9e2af]">Configure Ollama or another supported AI provider to extract a search plan and cite evidence.</p>}
              {!searchConfigured && <p className="text-[10px] text-[#f9e2af]">Configure BRAVE_SEARCH_API_KEY to enable public web search.</p>}
            </form>
            <button type="button" onClick={createDemoJobWorkflow} className="mb-3 flex w-full items-center justify-center gap-2 rounded bg-[#89b4fa] px-3 py-2 text-xs font-semibold text-[#11111b] hover:bg-[#b4befe]">
              <Search size={14} /> Create demo workflow
            </button>
            <div className="space-y-2">
              {demoJobs.map((job) => {
                const sourceHref = safeSourceHref(job.sourceUrl)
                return (
                <article key={job.id} className="rounded border border-[#313244] bg-[#1e1e2e] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold">{job.title}</h3>
                    <span className="shrink-0 rounded bg-[#313244] px-1.5 py-0.5 text-[10px] text-[#cdd6f4]">{job.fit === null ? 'Fit unverified' : `Sample fit ${job.fit}%`}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#a6adc8]">{job.employer} · {job.location}</p>
                  {job.source.startsWith('WEB RESEARCH') && (
                    <p className="mt-1 text-[10px] text-[#f9e2af]">
                      {job.verificationStatus === 'verified'
                        ? 'All populated extracted fields passed quote checks'
                        : job.verificationStatus === 'partially_verified'
                          ? 'Title/employer checked; unsupported fields omitted'
                          : 'No independent field check'}
                      {' · '}vacancy status unverified
                      {' · '}salary: {job.salary ?? 'not stated'}
                      {' · '}type: {job.employmentType ?? 'not stated'}
                      {' · '}published: {job.publicationDate ?? 'not verified'}
                    </p>
                  )}
                  {job.source.startsWith('WEB RESEARCH') && !job.applicationUrl && (
                    <p className="mt-1 text-[10px] text-[#a6adc8]">Application URL: not separately verified; open the source page to confirm.</p>
                  )}
                  {job.description && <p className="mt-2 text-[11px] text-[#cdd6f4]">{job.description}</p>}
                  {(job.requiredSkills?.length || job.preferredSkills?.length) ? (
                    <p className="mt-1 text-[10px] text-[#a6adc8]">
                      Required: {job.requiredSkills?.join(', ') || 'not stated'}
                      {' · '}Preferred: {job.preferredSkills?.join(', ') || 'not stated'}
                    </p>
                  ) : null}
                  {job.experienceRequirements && <p className="mt-1 text-[10px] text-[#a6adc8]">Experience: {job.experienceRequirements}</p>}
                  {job.rankingExplanation && <p className="mt-1 text-[10px] text-[#89b4fa]">{job.rankingExplanation}</p>}
                  {job.matchingRequirements && job.matchingRequirements.length > 0 && (
                    <p className="mt-1 text-[10px] text-[#a6e3a1]">Matches saved verified skills: {job.matchingRequirements.join(', ')}</p>
                  )}
                  {job.missingRequirements && job.missingRequirements.length > 0 && (
                    <p className="mt-1 text-[10px] text-[#f9e2af]">Not found in saved skills: {job.missingRequirements.join(', ')}</p>
                  )}
                  {job.eligibilityConcerns && job.eligibilityConcerns.length > 0 && (
                    <p className="mt-1 text-[10px] text-[#f9e2af]">Eligibility unknown: {job.eligibilityConcerns.join(' ')}</p>
                  )}
                  {typeof job.evidenceCoverage === 'number' && <p className="mt-1 text-[10px] text-[#a6adc8]">Evidence coverage: {job.evidenceCoverage}% · not an accuracy score</p>}
                  {job.extractionConfidence && <p className="mt-1 text-[10px] text-[#a6adc8]">Extracted-field quote support: {Math.round(job.extractionConfidence.score * 100)}% · not an accuracy probability</p>}
                  {job.discoveredAt && <p className="mt-1 text-[10px] text-[#6c7086]">Discovered: {new Date(job.discoveredAt).toLocaleString()}</p>}
                  <p className="mt-2 text-[11px]">{job.reason}</p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#f9e2af]">{job.source}</p>
                  {sourceHref && (
                    <a href={sourceHref} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[10px] text-[#89b4fa] underline">
                      Source: {job.sourceTitle ?? job.sourceUrl}
                    </a>
                  )}
                  {Array.isArray(job.evidence) && job.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-[#313244] pt-2 text-[10px] text-[#a6adc8]">
                      {job.evidence.map((item, index) => (
                        <li key={`${job.id}-${index}`}><span className="text-[#89b4fa]">{item.field}:</span> “{item.quote}”</li>
                      ))}
                    </ul>
                  )}
                </article>
                )
              })}
            </div>
          </section>
        )}

        {activePanel === 'Approvals' && (
          <section aria-label="Approval requests">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">CEO approvals</h2>
              <span className="text-[10px] text-[#a6adc8]">{pendingApprovals} pending</span>
            </div>
            {approvals.length === 0 && <p className="rounded border border-[#313244] bg-[#1e1e2e] p-3 text-xs text-[#a6adc8]">No approval requests. Research results and local demo actions appear here for review.</p>}
            <div className="space-y-3">
              {approvals.map((approval) => (
                <article key={approval.id} className="rounded border border-[#313244] bg-[#1e1e2e] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold">{approval.title}</h3>
                    <span className={`text-[10px] ${statusColor(approval.status)}`}>{approval.status}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#a6adc8]">{approval.description}</p>
                  {approval.status === 'Pending' && (
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => decideApproval(approval.id, 'Approved')} className="flex items-center gap-1 rounded bg-[#a6e3a1] px-2 py-1.5 text-[11px] font-semibold text-[#11111b] hover:bg-[#94e2a5]">
                        <Check size={12} /> Approve
                      </button>
                      <button type="button" onClick={() => decideApproval(approval.id, 'Rejected')} className="flex items-center gap-1 rounded bg-[#f38ba8] px-2 py-1.5 text-[11px] font-semibold text-[#11111b] hover:bg-[#eba0ac]">
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {activePanel === 'Command' ? (
        <footer className="shrink-0 border-t border-[#313244] bg-[#11111b] p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Message ${selectedExecutive} (e.g. "find jobs")`}
              aria-label={`Message ${selectedExecutive}`}
              className="min-w-0 flex-1 rounded border border-[#45475a] bg-[#1e1e2e] p-2 text-sm text-[#cdd6f4] placeholder-[#a6adc8] focus:border-[#89b4fa] focus:outline-none"
            />
            <button type="submit" aria-label="Send message" className="rounded bg-[#89b4fa] p-2 text-[#11111b] transition-colors hover:bg-[#b4befe]">
              <Send size={18} />
            </button>
          </form>
          <p className="mt-2 text-[10px] text-[#a6adc8]">{aiConfigured ? 'Messages go to the configured AI provider for text assistance; it cannot search or take external actions.' : 'AI is not configured. Set server AI settings to enable assistant replies; demo workflow remains local.'}</p>
        </footer>
      ) : (
        <footer className="flex shrink-0 items-center justify-between border-t border-[#313244] bg-[#11111b] px-4 py-3">
          <span className="text-[10px] text-[#a6adc8]">Tasks and approvals are saved by the local API.</span>
          <button type="button" onClick={handleReset} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4]">
            <RotateCcw size={12} /> Reset
          </button>
        </footer>
      )}
    </aside>
  )
}
