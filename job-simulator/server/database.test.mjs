import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { openJobOpsDatabase } from './database.mjs'

const temporaryDirectories = []

after(async () => {
  await Promise.all(temporaryDirectories.map((dataDirectory) =>
    rm(dataDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  ))
})

const initialData = {
  profile: { targetRoles: [], locations: [], verifiedSkills: [], resumeEvidence: [] },
  jobs: [],
  tasks: [],
  approvals: [],
}

const withDirectory = async (run) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'job-ops-database-'))
  temporaryDirectories.push(dataDirectory)
  await run(dataDirectory)
}

test('SQLite storage persists changes across close and reopen and rolls back failed writes', async () => {
  await withDirectory(async (dataDirectory) => {
    const database = await openJobOpsDatabase({ dataDirectory, initialData })
    const firstJob = {
      id: 'first',
      title: 'SOC Analyst',
      employer: 'Example Security',
      sourceUrl: 'https://careers.example.com/soc',
    }
    const workflow = {
      id: 'run-1',
      status: 'CompletedWithWarnings',
      query: 'SOC Analyst Ireland',
      searchQueries: ['SOC Analyst Ireland'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const application = {
      id: 'application-1',
      jobId: firstJob.id,
      status: 'Saved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [],
    }
    const conversationMessage = {
      id: 'chat-1',
      role: 'user',
      sender: 'Candidate',
      text: 'Find junior SOC roles in Ireland.',
      executive: 'CJO',
      time: new Date().toISOString(),
    }

    database.save({
      ...database.read(),
      jobs: [firstJob],
      workflows: [workflow],
      applications: [application],
      conversationMessages: [conversationMessage],
    })
    assert.throws(() => database.save({
      ...database.read(),
      jobs: [
        firstJob,
        { ...firstJob, id: 'duplicate', title: null, sourceUrl: 'https://careers.example.com/invalid' },
      ],
    }))
    assert.deepEqual(database.read().jobs, [firstJob])
    assert.deepEqual(database.read().workflows, [workflow])
    assert.deepEqual(database.read().applications, [application])
    assert.deepEqual(database.read().conversationMessages, [conversationMessage])
    assert.deepEqual(database.read().workflows, [workflow])
    database.close()

    const reopened = await openJobOpsDatabase({ dataDirectory, initialData })
    assert.deepEqual(reopened.read().jobs, [firstJob])
    assert.deepEqual(reopened.read().workflows, [workflow])
    assert.deepEqual(reopened.read().applications, [application])
    assert.deepEqual(reopened.read().conversationMessages, [conversationMessage])
    reopened.save({ ...reopened.read(), workflows: [] })
    assert.deepEqual(reopened.read().applications, [application])
    reopened.close()
  })
})

test('SQLite storage migrates legacy JSON and preserves default profile fields', async () => {
  await withDirectory(async (dataDirectory) => {
    await writeFile(join(dataDirectory, 'job-ops.json'), JSON.stringify({
      profile: { targetRoles: ['SOC Analyst'], locations: ['Ireland'] },
      jobs: [{ id: 'legacy-job', title: 'SOC Analyst', employer: 'Legacy Co' }],
      tasks: [],
      approvals: [],
    }))

    const database = await openJobOpsDatabase({ dataDirectory, initialData })
    const migrated = database.read()
    assert.equal(migrated.profile.targetRoles[0], 'SOC Analyst')
    assert.deepEqual(migrated.profile.verifiedSkills, [])
    assert.deepEqual(migrated.profile.resumeEvidence, [])
    assert.equal(migrated.jobs[0].id, 'legacy-job')
    database.close()
  })
})
