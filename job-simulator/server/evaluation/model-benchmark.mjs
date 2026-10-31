import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('./', import.meta.url)
const dataset = JSON.parse(await readFile(new URL('job-plan-cases.json', root), 'utf8'))
const endpoint = new URL(process.env.OLLAMA_URL || 'http://127.0.0.1:11434')
endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/api/chat`
const models = (process.env.BENCHMARK_MODELS || 'qwen3.5:2b,qwen3.5:4b,qwen3:4b')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)

const normalize = (value) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
const parsePlan = (content) => {
  try {
    const parsed = JSON.parse(content)
    if (
      !parsed ||
      !Array.isArray(parsed.jobTitles) ||
      !Array.isArray(parsed.locations) ||
      !Array.isArray(parsed.keywords) ||
      [...parsed.jobTitles, ...parsed.locations, ...parsed.keywords].some((item) => typeof item !== 'string')
    ) return null
    return parsed
  } catch {
    return null
  }
}

const requestPlan = async (model, request) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: { temperature: 0, num_predict: 400 },
      messages: [
        {
          role: 'system',
          content: 'Extract only explicit job-search constraints. Return JSON with exactly jobTitles, locations, and keywords, each an array of short strings. Keep role/location/keywords separate; do not invent facts.',
        },
        { role: 'user', content: request },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  })
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`)
  const payload = await response.json()
  if (typeof payload?.message?.content !== 'string') throw new Error('Ollama returned no message content.')
  return payload.message.content
}

const scoreArray = (actual, expected) => {
  const output = new Set(actual.map(normalize))
  const target = new Set(expected.map(normalize))
  const truePositives = [...output].filter((item) => target.has(item)).length
  return {
    exact: output.size === target.size && truePositives === target.size,
    truePositives,
    predicted: output.size,
    expected: target.size,
  }
}

const results = []
for (const model of models) {
  const startedAt = Date.now()
  const scores = []
  const failures = []
  for (const testCase of dataset) {
    try {
      const raw = await requestPlan(model, testCase.request)
      const parsed = parsePlan(raw)
      if (!parsed) {
        failures.push({ caseId: testCase.id, error: 'Invalid plan JSON or schema.' })
        continue
      }
      scores.push({
        jobTitles: scoreArray(parsed.jobTitles, testCase.expected.jobTitles),
        locations: scoreArray(parsed.locations, testCase.expected.locations),
        keywords: scoreArray(parsed.keywords, testCase.expected.keywords),
      })
    } catch (error) {
      failures.push({ caseId: testCase.id, error: error.message })
    }
  }
  const aggregate = Object.values(scores.flatMap((score) => Object.values(score)))
    .reduce((total, item) => ({
      truePositives: total.truePositives + item.truePositives,
      predicted: total.predicted + item.predicted,
      expected: total.expected + item.expected,
      exactFields: total.exactFields + Number(item.exact),
      fieldCount: total.fieldCount + 1,
    }), { truePositives: 0, predicted: 0, expected: 0, exactFields: 0, fieldCount: 0 })
  const expectedTotal = dataset.reduce((total, testCase) =>
    total + testCase.expected.jobTitles.length + testCase.expected.locations.length + testCase.expected.keywords.length, 0)
  results.push({
    model,
    datasetCases: dataset.length,
    completedCases: scores.length,
    invalidOrFailedCases: failures.length,
    exactFieldAccuracy: aggregate.fieldCount ? aggregate.exactFields / (dataset.length * 3) : 0,
    precision: aggregate.predicted ? aggregate.truePositives / aggregate.predicted : 0,
    recall: expectedTotal ? aggregate.truePositives / expectedTotal : 0,
    f1: aggregate.predicted + expectedTotal
      ? (2 * aggregate.truePositives) / (aggregate.predicted + expectedTotal)
      : 0,
    elapsedMs: Date.now() - startedAt,
    failures,
  })
}

const comparable = results.filter((result) =>
  result.completedCases === dataset.length && result.invalidOrFailedCases === 0,
).sort((left, right) =>
  right.exactFieldAccuracy - left.exactFieldAccuracy ||
  right.f1 - left.f1 ||
  left.elapsedMs - right.elapsedMs,
)

console.log(JSON.stringify({
  evaluatedAt: new Date().toISOString(),
  ollamaUrl: endpoint.origin,
  dataset: fileURLToPath(new URL('job-plan-cases.json', root)),
  results,
  winner: comparable[0]?.model ?? null,
  note: 'This measures search-plan extraction only. It is not a full job extraction/verification benchmark or proof of vacancy accuracy.',
}, null, 2))
