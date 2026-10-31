import { DatabaseSync } from 'node:sqlite'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const serialize = (value) => JSON.stringify(value)
const deserialize = (value) => JSON.parse(value)
const uniqueJobs = (jobs = []) => {
  const ids = new Set()
  const sourceUrls = new Set()
  return jobs.filter((job) => {
    if (!job?.id || ids.has(job.id) || (job.sourceUrl && sourceUrls.has(job.sourceUrl))) return false
    ids.add(job.id)
    if (job.sourceUrl) sourceUrls.add(job.sourceUrl)
    return true
  })
}

const transaction = (db, callback) => (...args) => {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = callback(...args)
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const createSchema = (db) => {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id TEXT PRIMARY KEY,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      employer TEXT NOT NULL,
      source_url TEXT,
      published_at TEXT,
      discovered_at TEXT,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_url_unique
      ON jobs(source_url) WHERE source_url IS NOT NULL;
    CREATE TABLE IF NOT EXISTS job_evidence (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      field TEXT NOT NULL,
      quote TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS job_evidence_job_id ON job_evidence(job_id);
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      query TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      agent_key TEXT,
      employee_id TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS agent_tasks_status ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS agent_tasks_workflow_id ON agent_tasks(workflow_id);
    CREATE TABLE IF NOT EXISTS agent_events (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      task_id TEXT,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS agent_events_workflow_id ON agent_events(workflow_id);
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      query TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS application_history (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL CHECK (json_valid(payload))
    ) STRICT;
  `)
}

const readRows = (db, table) => db.prepare(`SELECT payload FROM ${table}`).all().map(({ payload }) => deserialize(payload))

export const openJobOpsDatabase = async ({ dataDirectory, initialData }) => {
  const db = new DatabaseSync(join(dataDirectory, 'job-ops.sqlite'))
  createSchema(db)
  const migration = db.prepare("SELECT value FROM schema_metadata WHERE key = 'legacy_json_migrated'").get()

  if (!migration) {
    let legacyData = null
    try {
      legacyData = JSON.parse(await readFile(join(dataDirectory, 'job-ops.json'), 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        db.close()
        throw new Error(`Could not read legacy job-hunt data for migration: ${error.message}`)
      }
    }

    const seed = legacyData
      ? {
          ...initialData,
          ...legacyData,
          profile: { ...initialData.profile, ...legacyData.profile },
          jobs: Array.isArray(legacyData.jobs) ? legacyData.jobs : initialData.jobs,
          tasks: Array.isArray(legacyData.tasks) ? legacyData.tasks : [],
          approvals: Array.isArray(legacyData.approvals) ? legacyData.approvals : [],
          workflows: Array.isArray(legacyData.workflows) ? legacyData.workflows : [],
          applications: Array.isArray(legacyData.applications) ? legacyData.applications : [],
        }
      : initialData
    const save = transaction(db, (data) => {
      const replace = (table) => db.exec(`DELETE FROM ${table}`)
      replace('candidate_profiles')
      replace('conversation_messages')
      replace('jobs')
      replace('job_evidence')
      replace('workflow_runs')
      replace('agent_tasks')
      replace('agent_events')
      replace('approvals')
      replace('search_history')
      replace('application_history')
      db.prepare('INSERT INTO candidate_profiles (id, updated_at, payload) VALUES (?, ?, ?)')
        .run('default', new Date().toISOString(), serialize(data.profile))
      const insertJob = db.prepare(`
        INSERT INTO jobs (id, title, employer, source_url, published_at, discovered_at, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const insertEvidence = db.prepare(`
        INSERT INTO job_evidence (id, job_id, field, quote, payload) VALUES (?, ?, ?, ?, ?)
      `)
      for (const job of uniqueJobs(data.jobs)) {
        insertJob.run(job.id, job.title, job.employer, job.sourceUrl ?? null, job.publishedAt ?? null, job.discoveredAt ?? null, serialize(job))
        for (const [index, item] of (job.evidence ?? []).entries()) {
          insertEvidence.run(`${job.id}:${index}`, job.id, item.field, item.quote, serialize(item))
        }
      }
      const insertTask = db.prepare(`
        INSERT INTO agent_tasks (id, workflow_id, agent_key, employee_id, status, updated_at, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const insertEvent = db.prepare(`
        INSERT INTO agent_events (id, workflow_id, task_id, created_at, payload) VALUES (?, ?, ?, ?, ?)
      `)
      for (const task of data.tasks ?? []) {
        insertTask.run(task.id, task.workflowId ?? null, task.agentKey ?? null, task.employeeId, task.status, task.updatedAt, serialize(task))
        for (const event of task.events ?? []) {
          insertEvent.run(event.id, task.workflowId ?? null, task.id, event.time, serialize(event))
        }
      }
      const insertApproval = db.prepare('INSERT INTO approvals (id, status, created_at, payload) VALUES (?, ?, ?, ?)')
      for (const approval of data.approvals ?? []) {
        insertApproval.run(approval.id, approval.status, approval.createdAt, serialize(approval))
      }
      const insertWorkflow = db.prepare(`
        INSERT INTO workflow_runs (id, status, query, created_at, updated_at, payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const insertSearch = db.prepare(`
        INSERT INTO search_history (id, workflow_id, query, created_at, payload)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const workflow of data.workflows ?? []) {
        insertWorkflow.run(workflow.id, workflow.status, workflow.query, workflow.createdAt, workflow.updatedAt, serialize(workflow))
        for (const [index, query] of (workflow.searchQueries ?? []).entries()) {
          insertSearch.run(`${workflow.id}:${index}`, workflow.id, query, workflow.updatedAt, serialize({ query }))
        }
      }
      const insertApplication = db.prepare(`
        INSERT INTO application_history (id, job_id, status, created_at, updated_at, payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const application of data.applications ?? []) {
        insertApplication.run(application.id, application.jobId, application.status, application.createdAt, application.updatedAt, serialize(application))
      }
      db.prepare("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('legacy_json_migrated', '1')").run()
    })
    save(seed)
  }

  const read = () => ({
    profile: db.prepare("SELECT payload FROM candidate_profiles WHERE id = 'default'").get()
      ? deserialize(db.prepare("SELECT payload FROM candidate_profiles WHERE id = 'default'").get().payload)
      : initialData.profile,
    conversationMessages: readRows(db, 'conversation_messages'),
    jobs: readRows(db, 'jobs'),
    tasks: readRows(db, 'agent_tasks').map((task) => ({ ...task, events: Array.isArray(task.events) ? task.events : [] })),
    approvals: readRows(db, 'approvals'),
    workflows: readRows(db, 'workflow_runs'),
    applications: readRows(db, 'application_history'),
  })

  const save = transaction(db, (data) => {
    db.exec(`
      DELETE FROM candidate_profiles;
      DELETE FROM conversation_messages;
      DELETE FROM jobs;
      DELETE FROM job_evidence;
      DELETE FROM workflow_runs;
      DELETE FROM agent_tasks;
      DELETE FROM agent_events;
      DELETE FROM approvals;
      DELETE FROM search_history;
      DELETE FROM application_history;
    `)
    db.prepare('INSERT INTO candidate_profiles (id, updated_at, payload) VALUES (?, ?, ?)')
      .run('default', new Date().toISOString(), serialize(data.profile))
    const insertConversationMessage = db.prepare(`
      INSERT INTO conversation_messages (id, role, created_at, payload) VALUES (?, ?, ?, ?)
    `)
    for (const message of data.conversationMessages ?? []) {
      insertConversationMessage.run(message.id, message.role, message.time, serialize(message))
    }
    const insertJob = db.prepare(`
      INSERT INTO jobs (id, title, employer, source_url, published_at, discovered_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const insertEvidence = db.prepare(`
      INSERT INTO job_evidence (id, job_id, field, quote, payload) VALUES (?, ?, ?, ?, ?)
    `)
    for (const job of uniqueJobs(data.jobs)) {
      insertJob.run(job.id, job.title, job.employer, job.sourceUrl ?? null, job.publishedAt ?? null, job.discoveredAt ?? null, serialize(job))
      for (const [index, item] of (job.evidence ?? []).entries()) {
        insertEvidence.run(`${job.id}:${index}`, job.id, item.field, item.quote, serialize(item))
      }
    }
    const insertTask = db.prepare(`
      INSERT INTO agent_tasks (id, workflow_id, agent_key, employee_id, status, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const insertEvent = db.prepare(`
      INSERT INTO agent_events (id, workflow_id, task_id, created_at, payload) VALUES (?, ?, ?, ?, ?)
    `)
    for (const task of data.tasks ?? []) {
      insertTask.run(task.id, task.workflowId ?? null, task.agentKey ?? null, task.employeeId, task.status, task.updatedAt, serialize(task))
      for (const event of task.events ?? []) {
        insertEvent.run(event.id, task.workflowId ?? null, task.id, event.time, serialize(event))
      }
    }
    const insertApproval = db.prepare('INSERT INTO approvals (id, status, created_at, payload) VALUES (?, ?, ?, ?)')
    for (const approval of data.approvals ?? []) {
      insertApproval.run(approval.id, approval.status, approval.createdAt, serialize(approval))
    }
    const insertWorkflow = db.prepare(`
      INSERT INTO workflow_runs (id, status, query, created_at, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const insertSearch = db.prepare(`
      INSERT INTO search_history (id, workflow_id, query, created_at, payload)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const workflow of data.workflows ?? []) {
      insertWorkflow.run(workflow.id, workflow.status, workflow.query, workflow.createdAt, workflow.updatedAt, serialize(workflow))
      for (const [index, query] of (workflow.searchQueries ?? []).entries()) {
        insertSearch.run(`${workflow.id}:${index}`, workflow.id, query, workflow.updatedAt, serialize({ query }))
      }
    }
    const insertApplication = db.prepare(`
      INSERT INTO application_history (id, job_id, status, created_at, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const application of data.applications ?? []) {
      insertApplication.run(application.id, application.jobId, application.status, application.createdAt, application.updatedAt, serialize(application))
    }
    db.prepare("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('legacy_json_migrated', '1')").run()
  })

  return {
    read,
    save,
    close: () => db.close(),
    databasePath: join(dataDirectory, 'job-ops.sqlite'),
  }
}
