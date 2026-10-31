import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createJobOpsServer } from './app.mjs'
import { openJobOpsDatabase } from './database.mjs'
import { createLLMProvider } from './llm.mjs'
import { createJobResearchService, htmlToText } from './research.mjs'

const withServer = async (run, options = {}) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'job-ops-api-'))
  const server = await createJobOpsServer({
    dataDirectory,
    aiProvider: createLLMProvider({ provider: 'openai-compatible', baseUrl: '', apiKey: '', model: '' }),
    searchProvider: { configured: false },
    ...options,
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await run({ baseUrl, dataDirectory })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await rm(dataDirectory, { recursive: true, force: true })
  }
}

const jsonRequest = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return { response, body: await response.json() }
}

test('health and seeded job records clearly identify local demo mode', async () => {
  await withServer(async ({ baseUrl }) => {
    const health = await jsonRequest(baseUrl, '/api/health')
    assert.equal(health.body.mode, 'local-demo')

    const jobs = await jsonRequest(baseUrl, '/api/jobs')
    assert.equal(jobs.response.status, 200)
    assert.equal(jobs.body.data.length, 3)
    assert.ok(jobs.body.data.every((job) => job.source === 'DEMO DATA — not a live vacancy'))
    assert.ok(jobs.body.data.every((job) => job.publishedAt === null && job.discoveredAt === null))
  })
})

test('profile updates are validated', async () => {
  await withServer(async ({ baseUrl }) => {
    const profile = {
      targetRoles: ['SOC Analyst Tier 1'],
      locations: ['Ireland', 'Remote'],
      workAuthorisation: null,
      salaryExpectation: null,
      sponsorshipRequired: null,
    }
    const update = await jsonRequest(baseUrl, '/api/profile', { method: 'PUT', body: profile })
    assert.equal(update.response.status, 200)
    assert.deepEqual(update.body.data, profile)

    const invalid = await jsonRequest(baseUrl, '/api/profile', {
      method: 'PUT',
      body: { ...profile, targetRoles: 'SOC Analyst Tier 1' },
    })
    assert.equal(invalid.response.status, 400)
  })
})

test('assistant uses persisted conversation and candidate context across requests', async () => {
  const completedRequests = []
  const aiProvider = {
    configured: true,
    provider: 'ollama',
    async complete(request) {
      completedRequests.push(request)
      return `Reply ${completedRequests.length}`
    },
  }
  await withServer(async ({ baseUrl }) => {
    const savedUserMessage = await jsonRequest(baseUrl, '/api/conversation/messages', {
      method: 'POST',
      body: {
        role: 'user',
        sender: 'Candidate',
        text: 'I prefer remote SOC Analyst jobs. Please remember my preference.',
        executive: 'CJO',
      },
    })
    assert.equal(savedUserMessage.response.status, 201)

    const firstReply = await jsonRequest(baseUrl, '/api/assistant/message', {
      method: 'POST',
      body: {
        executive: 'CJO',
        message: 'I prefer remote SOC Analyst jobs. Please remember my preference.',
        conversationMessageId: savedUserMessage.body.data.id,
      },
    })
    assert.equal(firstReply.response.status, 200)
    assert.ok(completedRequests[0].messages.some((message) =>
      message.content.includes('remote SOC Analyst jobs'),
    ))
    assert.ok(completedRequests[0].messages.some((message) =>
      message.content.includes('targetRoles'),
    ))

    const secondUserMessage = await jsonRequest(baseUrl, '/api/conversation/messages', {
      method: 'POST',
      body: {
        role: 'user',
        sender: 'Candidate',
        text: 'What kind of roles did I say I wanted?',
        executive: 'CJO',
      },
    })
    const secondReply = await jsonRequest(baseUrl, '/api/assistant/message', {
      method: 'POST',
      body: {
        executive: 'CJO',
        message: secondUserMessage.body.data.text,
        conversationMessageId: secondUserMessage.body.data.id,
      },
    })
    assert.equal(secondReply.response.status, 200)
    assert.ok(completedRequests[1].messages.some((message) =>
      message.content.includes('Please remember my preference.'),
    ), JSON.stringify(completedRequests[1].messages))

    const history = await jsonRequest(baseUrl, '/api/conversation/messages')
    assert.equal(history.body.data.length, 4)
    assert.equal(history.body.data.at(-1).role, 'assistant')
  }, { aiProvider })
})

test('resume intelligence only persists quote-supported facts from local Ollama', async () => {
  const resumeText = 'Junior analyst with 1 year of experience. Monitored SIEM alerts and documented incidents.'
  const aiProvider = {
    configured: true,
    provider: 'ollama',
    async complete({ executive, messages }) {
      assert.equal(executive, 'Resume Intelligence Agent')
      assert.match(messages[0].content, /untrusted data/)
      return JSON.stringify({
        skills: [
          { name: 'SIEM', quote: 'Monitored SIEM alerts' },
          { name: 'Kubernetes', quote: 'Managed Kubernetes clusters' },
        ],
        experienceYears: { value: 1, quote: '1 year of experience' },
      })
    },
  }
  await withServer(async ({ baseUrl }) => {
    const result = await jsonRequest(baseUrl, '/api/profile/analyze-resume', {
      method: 'POST',
      body: { resumeText },
    })
    assert.equal(result.response.status, 200)
    assert.deepEqual(result.body.data.skills.map((skill) => skill.name), ['SIEM'])
    assert.equal(result.body.data.experienceYears, 1)
    assert.equal(result.body.data.rawResumeRetained, false)
    const profile = await jsonRequest(baseUrl, '/api/profile')
    assert.deepEqual(profile.body.data.verifiedSkills, ['SIEM'])
    assert.equal(profile.body.data.resumeEvidence[0], 'Monitored SIEM alerts')
    const tasks = await jsonRequest(baseUrl, '/api/tasks')
    assert.equal(tasks.body.data[0].agentKey, 'resume-intelligence')
    assert.equal(tasks.body.data[0].status, 'Completed')
  }, { aiProvider })
})

test('profile data survives an API server restart', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'job-ops-api-persist-'))
  const profile = {
    targetRoles: ['Junior SOC Analyst'],
    locations: ['Ireland'],
    workAuthorisation: null,
    salaryExpectation: null,
    sponsorshipRequired: null,
  }
  let server = await createJobOpsServer({ dataDirectory })

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const firstAddress = server.address()
    const firstBaseUrl = `http://127.0.0.1:${firstAddress.port}`
    const update = await jsonRequest(firstBaseUrl, '/api/profile', { method: 'PUT', body: profile })
    assert.equal(update.response.status, 200)
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))

    server = await createJobOpsServer({ dataDirectory })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const secondAddress = server.address()
    const secondBaseUrl = `http://127.0.0.1:${secondAddress.port}`
    const restored = await jsonRequest(secondBaseUrl, '/api/profile')
    assert.deepEqual(restored.body.data, profile)
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
    await rm(dataDirectory, { recursive: true, force: true })
  }
})

test('an interrupted workflow is marked failed when the API restarts', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'job-ops-interrupted-'))
  const initialData = {
    profile: { targetRoles: [], locations: [], verifiedSkills: [], resumeEvidence: [] },
    jobs: [],
    tasks: [],
    approvals: [],
    workflows: [],
    applications: [],
  }
  const storage = await openJobOpsDatabase({ dataDirectory, initialData })
  const timestamp = new Date().toISOString()
  const workflow = {
    id: 'interrupted-run',
    kind: 'job-research',
    query: 'Find junior SOC jobs',
    status: 'Running',
    currentAction: 'Fetching sources.',
    taskIds: ['interrupted-task'],
    searchQueries: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  storage.save({
    ...storage.read(),
    workflows: [workflow],
    tasks: [{
      id: 'interrupted-task',
      workflowId: workflow.id,
      employeeId: 'cjo-1',
      status: 'Working',
      progress: 50,
      events: [],
      updatedAt: timestamp,
    }],
  })
  storage.close()

  const server = await createJobOpsServer({ dataDirectory })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const response = await jsonRequest(`http://127.0.0.1:${address.port}`, '/api/workflows/interrupted-run')
    assert.equal(response.body.data.status, 'Failed')
    assert.match(response.body.data.error, /API restarted/)
    assert.equal(response.body.data.tasks[0].status, 'Failed')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await rm(dataDirectory, { recursive: true, force: true })
  }
})

test('application history is persisted as user-reported state without submitting applications', async () => {
  await withServer(async ({ baseUrl }) => {
    const saved = await jsonRequest(baseUrl, '/api/applications', {
      method: 'POST',
      body: { jobId: 'demo-soc-1', notes: 'Review source before applying.' },
    })
    assert.equal(saved.response.status, 201)
    assert.equal(saved.body.data.status, 'Saved')
    assert.equal(saved.body.data.externalActionTaken, false)

    const updated = await jsonRequest(baseUrl, `/api/applications/${saved.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'Applied by user' },
    })
    assert.equal(updated.body.data.status, 'Applied by user')
    assert.equal(updated.body.data.events.length, 2)

    const list = await jsonRequest(baseUrl, '/api/applications')
    assert.equal(list.body.data[0].id, saved.body.data.id)
    assert.equal(list.body.data[0].externalActionTaken, false)
  })
})

test('tasks enforce dependencies before completion and approvals can be decided once', async () => {
  await withServer(async ({ baseUrl }) => {
    const makeTask = (title, dependencies = []) => jsonRequest(baseUrl, '/api/tasks', {
      method: 'POST',
      body: { title, description: `${title} task`, employeeId: 'cjo-1', executive: 'CJO', dependencies },
    })
    const first = await makeTask('Discover')
    assert.equal(first.response.status, 201)
    const second = await makeTask('Qualify', [first.body.data.id])
    assert.equal(second.body.data.status, 'Blocked')

    const premature = await jsonRequest(baseUrl, `/api/tasks/${second.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'Completed', output: 'Should not complete.' },
    })
    assert.equal(premature.response.status, 409)

    const completed = await jsonRequest(baseUrl, `/api/tasks/${first.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'Completed', output: 'Demo step complete.' },
    })
    assert.equal(completed.response.status, 200)
    const refreshedTasks = await jsonRequest(baseUrl, '/api/tasks')
    assert.equal(refreshedTasks.body.data.find((task) => task.id === second.body.data.id).status, 'Ready')

    const approval = await jsonRequest(baseUrl, '/api/approvals', {
      method: 'POST',
      body: { title: 'Review sample shortlist', description: 'Demo only.', kind: 'demo-shortlist' },
    })
    assert.equal(approval.response.status, 201)
    const decision = await jsonRequest(baseUrl, `/api/approvals/${approval.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'Approved' },
    })
    assert.equal(decision.body.data.status, 'Approved')

    const duplicateDecision = await jsonRequest(baseUrl, `/api/approvals/${approval.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'Rejected' },
    })
    assert.equal(duplicateDecision.response.status, 409)
  })
})

test('demo workflows and task execution use persisted server IDs and enforce dependencies', async () => {
  await withServer(async ({ baseUrl }) => {
    const created = await jsonRequest(baseUrl, '/api/workflows/demo-job-search', { method: 'POST' })
    assert.equal(created.response.status, 201)
    assert.equal(created.body.data.length, 3)
    const [discover, qualify, rank] = created.body.data
    assert.equal(qualify.dependencies[0], discover.id)
    assert.equal(rank.dependencies[0], qualify.id)

    const premature = await jsonRequest(baseUrl, `/api/tasks/${qualify.id}/run`, { method: 'POST' })
    assert.equal(premature.response.status, 409)

    const firstRun = await jsonRequest(baseUrl, `/api/tasks/${discover.id}/run`, { method: 'POST' })
    assert.equal(firstRun.response.status, 200)
    assert.equal(firstRun.body.data.status, 'Completed')
    assert.ok(firstRun.body.data.events.length >= 2)

    const refreshed = await jsonRequest(baseUrl, '/api/tasks')
    assert.equal(refreshed.body.data.find((task) => task.id === qualify.id).status, 'Ready')
    await jsonRequest(baseUrl, `/api/tasks/${qualify.id}/run`, { method: 'POST' })
    const finalRun = await jsonRequest(baseUrl, `/api/tasks/${rank.id}/run`, { method: 'POST' })
    assert.equal(finalRun.body.data.status, 'Completed')

    const approvals = await jsonRequest(baseUrl, '/api/approvals')
    assert.equal(approvals.body.data.length, 1)
    assert.equal(approvals.body.data[0].kind, 'demo-shortlist')
  })
})

test('assistant reports missing configuration and calls a configured provider', async () => {
  await withServer(async ({ baseUrl }) => {
    const health = await jsonRequest(baseUrl, '/api/health')
    assert.equal(health.body.ai.configured, false)
    const unavailable = await jsonRequest(baseUrl, '/api/assistant/message', {
      method: 'POST',
      body: { executive: 'CJO', message: 'Help me plan.' },
    })
    assert.equal(unavailable.response.status, 503)
    assert.match(unavailable.body.error, /AI is not configured/)
  })

  const aiProvider = {
    configured: true,
    async complete({ executive, messages }) {
      assert.equal(executive, 'CHRO')
      assert.match(messages.at(-1).content, /Review this resume\./)
      return 'Please provide the resume text to review.'
    },
  }
  await withServer(async ({ baseUrl }) => {
    const result = await jsonRequest(baseUrl, '/api/assistant/message', {
      method: 'POST',
      body: { executive: 'CHRO', message: 'Review this resume.' },
    })
    assert.equal(result.response.status, 200)
    assert.equal(result.body.data.content, 'Please provide the resume text to review.')
  }, { aiProvider })
})

test('job research API persists only the evidence-backed records returned by the pipeline', async () => {
  const jobResearch = {
    configured: true,
    async research(query) {
      assert.equal(query, 'SOC Analyst in Dublin')
      return {
        plan: { jobTitles: ['SOC Analyst'], locations: ['Dublin'], keywords: [] },
        queries: ['SOC Analyst Dublin'],
        sourcesReviewed: 1,
        sources: [{ title: 'Role', url: 'https://careers.example.com/role', status: 'reviewed' }],
        jobs: [{
          title: 'SOC Analyst',
          employer: 'Example Security',
          location: 'Dublin',
          salary: null,
          employmentType: null,
          reason: 'Extracted from source text; verify details directly before applying.',
          fit: null,
          source: 'WEB RESEARCH — verify before applying',
          sourceUrl: 'https://careers.example.com/role',
          evidence: [
            { field: 'title', quote: 'SOC Analyst' },
            { field: 'employer', quote: 'Example Security' },
          ],
          publishedAt: null,
          discoveredAt: '2026-10-30T00:00:00.000Z',
        }],
        warnings: [],
        requiresHumanReview: true,
      }
    },
  }
  await withServer(async ({ baseUrl }) => {
    const result = await jsonRequest(baseUrl, '/api/research/jobs', {
      method: 'POST',
      body: { query: 'SOC Analyst in Dublin' },
    })
    assert.equal(result.response.status, 200)
    assert.equal(result.body.data.requiresHumanReview, true)
    assert.match(result.body.data.jobs[0].id, /^[0-9a-f-]{36}$/)
    const repeated = await jsonRequest(baseUrl, '/api/research/jobs', {
      method: 'POST',
      body: { query: 'SOC Analyst in Dublin' },
    })
    assert.equal(repeated.body.data.jobs.length, 0)
    const saved = await jsonRequest(baseUrl, '/api/jobs')
    assert.equal(saved.body.data.filter((job) => job.sourceUrl === 'https://careers.example.com/role').length, 1)
    assert.equal(saved.body.data[0].sourceUrl, 'https://careers.example.com/role')
  }, { jobResearch })
})

test('live research creates persistent agent tasks and exposes actual workflow progress', async () => {
const jobResearch = {
  configured: true,
  async research(query, { onProgress }) {
    assert.equal(query, 'Five new entry-level SOC analyst vacancies in Ireland')
    for (const stage of ['planning', 'discovery', 'crawling', 'extraction', 'verification']) {
      await onProgress({ stage, message: `${stage} in progress.` })
    }
    return {
      plan: { jobTitles: ['SOC Analyst'], locations: ['Ireland'], keywords: ['entry-level'] },
      queries: ['SOC Analyst Ireland entry-level'],
      sourcesReviewed: 1,
      sources: [{ title: 'Source', url: 'https://careers.example.com/role', status: 'reviewed' }],
      jobs: [],
      warnings: ['The only source was not independently verified.'],
      requiresHumanReview: true,
    }
  },
}
await withServer(async ({ baseUrl }) => {
  const started = await jsonRequest(baseUrl, '/api/workflows/research', {
    method: 'POST',
    body: { query: 'Five new entry-level SOC analyst vacancies in Ireland' },
  })
  assert.equal(started.response.status, 202)
  assert.equal(started.body.data.status, 'Running')

  let completed
  for (let attempt = 0; attempt < 30; attempt += 1) {
    completed = await jsonRequest(baseUrl, `/api/workflows/${started.body.data.id}`)
    if (completed.body.data.status !== 'Running') break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  assert.equal(completed.body.data.status, 'CompletedWithWarnings')
  assert.equal(completed.body.data.searchQueries[0], 'SOC Analyst Ireland entry-level')
  assert.equal(completed.body.data.tasks.length, 7)
  assert.ok(completed.body.data.tasks.every((task) => task.status === 'Completed'))
  assert.match(completed.body.data.tasks.at(-1).output, /Numeric fit scores and eligibility decisions were not generated/)
  assert.deepEqual(completed.body.data.tasks[1].dependencies, [completed.body.data.tasks[0].id])
  const manualRun = await jsonRequest(baseUrl, `/api/tasks/${completed.body.data.tasks[0].id}/run`, { method: 'POST' })
  assert.equal(manualRun.response.status, 409)
  const retry = await jsonRequest(baseUrl, `/api/workflows/${started.body.data.id}/retry`, { method: 'POST' })
  assert.equal(retry.response.status, 202)
  assert.equal(retry.body.data.parentWorkflowId, started.body.data.id)
  assert.equal(retry.body.data.attempt, 2)
  let retried
  for (let attempt = 0; attempt < 30; attempt += 1) {
    retried = await jsonRequest(baseUrl, `/api/workflows/${retry.body.data.id}`)
    if (retried.body.data.status !== 'Running') break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  assert.equal(retried.body.data.status, 'CompletedWithWarnings')
  const approvals = await jsonRequest(baseUrl, '/api/approvals')
  assert.equal(approvals.body.data[0].kind, 'research-results')
  const listed = await jsonRequest(baseUrl, '/api/workflows')
  assert.equal(listed.body.data[0].id, retry.body.data.id)
  assert.equal(listed.body.data[1].id, started.body.data.id)
}, { jobResearch })
})

test('research shortlist is limited to five and exposes transparent preference ranking without fit scores', async () => {
  const jobResearch = {
    configured: true,
    async research() {
      return {
        plan: { jobTitles: ['Security Analyst'], locations: ['Ireland'], keywords: [] },
        queries: ['Security Analyst Ireland'],
        sourcesReviewed: 6,
        sources: [],
        jobs: Array.from({ length: 6 }, (_, index) => ({
          title: index === 4 ? 'Junior Security Analyst' : `Security Analyst ${index}`,
          employer: `Employer ${index}`,
          location: 'Ireland',
          fit: null,
          requiredSkills: [],
          sourceUrl: `https://careers.example.com/role/${index}`,
          source: 'WEB RESEARCH — verify before applying',
          evidence: [],
          discoveredAt: new Date().toISOString(),
        })),
        warnings: [],
        requiresHumanReview: true,
      }
    },
  }
  await withServer(async ({ baseUrl }) => {
    const started = await jsonRequest(baseUrl, '/api/workflows/research', {
      method: 'POST',
      body: { query: 'Find junior security analyst roles in Ireland' },
    })
    let completed
    for (let attempt = 0; attempt < 30; attempt += 1) {
      completed = await jsonRequest(baseUrl, `/api/workflows/${started.body.data.id}`)
      if (completed.body.data.status !== 'Running') break
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    assert.equal(completed.body.data.status, 'Completed')
    assert.equal(completed.body.data.result.jobs.length, 5)
    assert.equal(completed.body.data.result.jobs[0].title, 'Junior Security Analyst')
    assert.ok(completed.body.data.result.jobs.every((job) => job.fit === null))
    assert.match(completed.body.data.result.jobs[0].rankingExplanation, /role\/location preference overlap/)
  }, { jobResearch })
})

  test('a requested 24-hour window excludes vacancies without a verified publication timestamp', async () => {
    const jobResearch = {
      configured: true,
      async research() {
        return {
          plan: { jobTitles: ['SOC Analyst'], locations: ['Ireland'], keywords: [] },
          queries: ['SOC Analyst Ireland'],
          sourcesReviewed: 1,
          sources: [],
          jobs: [
            {
              title: 'Recent Junior SOC Analyst',
              employer: 'Example Security',
              location: 'Ireland',
              publicationDate: '2 hours ago',
              publishedAt: '2 hours ago',
              discoveredAt: new Date().toISOString(),
              fit: null,
              sourceUrl: 'https://careers.example.com/recent-role',
              source: 'WEB RESEARCH — verify before applying',
              evidence: [],
            },
            {
              title: 'Old Junior SOC Analyst',
              employer: 'Example Security',
              location: 'Ireland',
              publicationDate: null,
              publishedAt: null,
              fit: null,
              sourceUrl: 'https://careers.example.com/unknown-date',
              source: 'WEB RESEARCH — verify before applying',
              evidence: [],
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        }
      },
    }
    await withServer(async ({ baseUrl }) => {
      const started = await jsonRequest(baseUrl, '/api/workflows/research', {
        method: 'POST',
        body: { query: 'Find five SOC Analyst jobs published in the previous 24 hours in Ireland' },
      })
      let completed
      for (let attempt = 0; attempt < 30; attempt += 1) {
        completed = await jsonRequest(baseUrl, `/api/workflows/${started.body.data.id}`)
        if (completed.body.data.status !== 'Running') break
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      assert.equal(completed.body.data.status, 'CompletedWithWarnings')
      assert.equal(completed.body.data.result.jobs.length, 1)
      assert.equal(completed.body.data.result.jobs[0].title, 'Recent Junior SOC Analyst')
      assert.match(completed.body.data.warnings[0], /publication timestamp could not confirm/)
    }, { jobResearch })
  })

  test('live research reports missing configuration instead of returning demo results', async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await jsonRequest(baseUrl, '/api/research/jobs', {
      method: 'POST',
      body: { query: 'Find junior SOC roles in Ireland' },
    })
    assert.equal(response.response.status, 503)
    assert.match(response.body.error, /AI is not configured/)
  })
})

test('provider adapter validates configuration and extracts OpenAI-compatible text', async () => {
  const missing = createLLMProvider({ baseUrl: '', apiKey: '', model: '' })
  await assert.rejects(
    missing.complete({ executive: 'CJO', messages: [{ role: 'user', content: 'Plan.' }] }),
    { status: 503 },
  )

  let requestUrl
  let requestBody
  const provider = createLLMProvider({
    baseUrl: 'https://provider.example/v1',
    apiKey: 'test-key',
    model: 'test-model',
  }, async (url, options) => {
    requestUrl = url.toString()
    requestBody = JSON.parse(options.body)
    return new Response(JSON.stringify({ choices: [{ message: { content: 'A careful plan.' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  const result = await provider.complete({
    executive: 'CJO',
    messages: [{ role: 'user', content: 'Plan.' }],
  })
  assert.equal(requestUrl, 'https://provider.example/v1/chat/completions')
  assert.equal(requestBody.model, 'test-model')
  assert.equal(requestBody.messages[0].role, 'system')
  assert.equal(result, 'A careful plan.')
})

test('invalid API routes return a JSON 404 response', async () => {
  await withServer(async ({ baseUrl }) => {
    const result = await jsonRequest(baseUrl, '/api/not-a-route')
    assert.equal(result.response.status, 404)
    assert.equal(typeof result.body.error, 'string')
  })
})
