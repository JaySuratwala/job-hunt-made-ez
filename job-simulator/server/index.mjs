import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJobOpsServer } from './app.mjs'

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMainModule) {
  const port = Number(process.env.JOB_OPS_PORT || 4174)
  const host = process.env.JOB_OPS_HOST || '127.0.0.1'
  const dataDirectory = resolve(process.env.JOB_OPS_DATA_DIR || 'server/data')
  const server = await createJobOpsServer({ dataDirectory })

  server.listen(port, host, () => {
    const address = server.address()
    console.log(`Job Ops local API listening at http://${host}:${address.port}`)
    console.log(`Local data directory: ${dataDirectory}`)
    const aiConfigured = process.env.AI_PROVIDER === 'ollama'
      ? Boolean(process.env.AI_MODEL)
      : Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL)
    console.log(`AI configured: ${aiConfigured ? 'yes' : 'no'}; Brave Search configured: ${process.env.BRAVE_SEARCH_API_KEY ? 'yes' : 'no'}`)
    console.log('Live job results are unverified leads and require human review.')
  })

  const shutdown = () => server.close((error) => {
    if (error) {
      console.error('Could not shut down the Job Ops API cleanly:', error)
      process.exitCode = 1
    }
  })
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
