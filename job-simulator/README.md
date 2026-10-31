# Job Ops — Job-Hunt Office Simulator

Job Ops is a browser-based job-hunting command centre with a Phaser office scene and a Catppuccin Mocha-styled React sidebar. Its local API persists candidate profile data, conversation messages, research workflows, agent tasks/events, jobs/evidence, approvals, search history, and user-reported application history in SQLite.

The office client follows the original SkyOffice Phaser/React approach, including its item-interaction dialog pattern. SkyOffice's Colyseus server is for multiplayer rooms, so Job Ops uses a small local HTTP API for job-hunt data instead.

## Run locally

Use Node.js 22.13 or newer (the API uses the built-in `node:sqlite` module). Install once with `npm install`. Start the frontend and local API in separate terminals:

```sh
npm run server
```

```sh
npm run dev
```

The app runs at the local URL printed by Vite. Vite proxies `/api` requests to the API at `127.0.0.1:4174`. Build the frontend with `npm run build`; run backend API tests with `npm run test:server`.

After restarting your computer, start both `npm run server` and `npm run dev` in separate terminals. The local API and SQLite database are required for saved profile, jobs, workflows, and chat history. Ollama must also be running for local AI chat; Brave credentials are needed only for live job search. The optional Crawl4AI sidecar is only needed for JavaScript-rendered job pages.

Chat history is stored in the local SQLite database at `server/data/job-ops.sqlite`, separate from browser local storage. The UI restores saved messages when it reconnects to the API, and assistant requests receive the recent conversation plus the saved candidate profile. Up to 500 messages are retained, and at most 19 recent messages plus candidate context are sent to the model per request. Use the in-app reset action to clear conversation memory along with tasks, research runs, and approvals. Keep the API bound to loopback; the database is local and is not encrypted.

## Product capabilities

- Move the CEO character with arrow keys or WASD, stand from the starting chair with **E**, and pan/zoom the office with the mouse.
- Click an office employee to inspect backend-sourced task state, current action, latest update, and task events. An employee's working animation only plays while an assigned API task is `Working`.
- Use the sidebar panels to switch between executive chat, the team directory, task board, sample jobs, and CEO approvals.
- Select CJO in Command and enter a job-search request to launch a persisted workflow when AI and web search are configured. Enter **“demo jobs”** to create the clearly labelled local demo workflow instead.
- Live research uses a bounded seven-stage dependency graph: request planning, discovery, permitted crawling, extraction, independent verification, deterministic qualification, and transparent ranking. Tasks share a workflow ID and structured inputs/results rather than conversation history.
- Workflow progress, stage events, search queries, errors, sources, task states, and results are stored in SQLite. An interrupted `Running` workflow is marked `Failed` when the API restarts; failed or warning-bearing runs can be retried up to three attempts, with prior runs retained.
- Results pass a separate verifier call. Title/employer need source-matching quotes; other non-null fields are kept only when the verifier returns a matching source quote. Missing publication date, application URL, eligibility data, and candidate fit remain explicitly unknown. Review results in Approvals before acting.
- Deterministic qualification compares exact required skills against saved verified candidate skills and records supporting profile evidence where present. Ranking uses explicit role/location preferences and verified skill overlap; no numeric fit score or eligibility decision is fabricated.
- Application-history endpoints record only user-reported statuses. They never submit an application.
- Ask CMO to draft a LinkedIn post to see the approval/setup gate. No post is generated or published without source material and configured integrations.
- Brave LLM Context is the default search mode: it returns query-grounded excerpts and source metadata so the app does not need to fetch pages that block its crawler. These are excerpt-backed leads, not independent verification of the original page; the UI labels them as partial and requires human review. Set `BRAVE_SEARCH_MODE=web` to use the classic search-results endpoint and page crawler instead. In either mode, source page age is not treated as a job publication date; a previous-24-hour request only keeps records with an explicitly supported publication timestamp. Search results and fetched content are cached for bounded periods. The optional local Crawl4AI sidecar is used for JavaScript pages in classic web mode, is contacted only over loopback, and revalidates the final public HTTPS URL.
- Search results are leads, not confirmed vacancies. The UI links each record to its source and displays evidence quotes. Always check that a vacancy is still open, verify all requirements on the employer's page, and review unknowns before acting.
- The shared AI adapter supports local Ollama (`/api/chat`) and OpenAI-compatible chat-completions endpoints. Agents use role-specific prompts and structured outputs; Ollama model replacement is configured with `AI_MODEL`. Ollama requests disable optional model reasoning (`think: false`) so internal reasoning does not consume the bounded JSON response budget; extracted facts still require source evidence and a separate verification pass.

## Demo-mode limitations

The sample job records and their fit percentages are illustrative test data, not live vacancies or candidate-fit results. The local API persists its profile, task, approval, and job data in SQLite at `server/data/job-ops.sqlite` by default (ignored by Git). On first startup, an existing `job-ops.json` in the same data directory is migrated once; the JSON file is not modified or deleted. It binds to loopback by default and has no authentication; do not expose it to a network or use it for sensitive data. Set `JOB_OPS_DATA_DIR` to choose another storage directory.

The project does not submit applications, modify documents, publish content, or access restricted job-board pages. Search and crawling are subject to provider terms and source-site access rules. Search queries may include details you enter; use local Ollama to keep model inference on your computer, but note enabled web search sends queries to Brave.

## Local API contracts

| Route | Contract |
|---|---|
| `GET/PUT /api/profile` | Read/update candidate preferences and explicitly verified facts. |
| `GET/POST /api/conversation/messages` | Load saved chat history or append a message to the local conversation memory. |
| `POST /api/profile/analyze-resume` | Local Ollama only; accepts a 40–4500 character excerpt, persists exact-quote-supported skills only, and does not retain the raw excerpt. |
| `POST /api/workflows/research` | `{ "query": "..." }` starts a persisted run and returns `202` with the run ID. |
| `GET /api/workflows` and `GET /api/workflows/:id` | Read run state, bounded search queries, structured result, and linked task events. |
| `POST /api/workflows/:id/retry` | Creates a new linked attempt for a failed or warning-bearing run; maximum three attempts. |
| `GET /api/jobs`, `GET/POST /api/approvals` | Read source-backed job records and create/read human review requests. |
| `GET/POST /api/applications`, `PATCH /api/applications/:id` | Track user-reported application status only; `externalActionTaken` stays false. |

The UI uses the workflow API for live research. The older `POST /api/research/jobs` endpoint remains a synchronous compatibility endpoint.

### Local Ollama and live search setup

Install Ollama separately and download a model that fits your hardware. Start Ollama, then create a local environment file from the safe template:

```powershell
Copy-Item .env.example .env
notepad .env
npm run server
```

Put your actual Brave key only in your local `.env`, replacing the placeholder. `.env` and other `.env.*` files are ignored by Git; `.env.example` contains placeholders only and is safe to commit. Do not paste credentials into source code, chat, or a file before checking that it is ignored. The API server loads `.env` at startup, so restart it after changing credentials. The included `BRAVE_SEARCH_MODE=llm-context` uses Brave's `/res/v1/llm/context` endpoint, with Ireland/English search, balanced relevance, and the `pd` freshness filter for previous-24-hour requests. Brave freshness describes indexed page age, not necessarily the vacancy's publication date. Change the mode to `web` if the account does not include LLM Context access. Ollama defaults to `http://127.0.0.1:11434`; set `AI_BASE_URL` only if Ollama listens elsewhere. For an OpenAI-compatible model provider, set `AI_PROVIDER=openai-compatible`, `AI_BASE_URL` (HTTPS), `AI_API_KEY`, and `AI_MODEL` instead. Never commit real keys or expose them through `VITE_` variables. Provider errors are reported instead of being presented as successful results.

### Optional JavaScript-rendered crawling

The default crawler supports public server-rendered HTML. To enable the local Crawl4AI sidecar, create a separate Python environment using a Python version supported by Crawl4AI:

```powershell
py -m venv .venv-crawl4ai
.\.venv-crawl4ai\Scripts\Activate.ps1
python -m pip install -r server\crawl4ai\requirements.txt
crawl4ai-setup
python -m uvicorn app:app --app-dir server\crawl4ai --host 127.0.0.1 --port 8000
```

In the API terminal, set `$env:CRAWL4AI_URL = "http://127.0.0.1:8000"` before `npm run server`. The sidecar only binds to loopback, accepts public HTTPS URLs, rechecks every browser request, limits resources, and blocks cross-host subresources. If it is unavailable or rejects a page, the workflow reports the failure rather than treating it as a successful extraction.

### Measuring the requested Qwen models

The initial labeled search-plan dataset is `server/evaluation/job-plan-cases.json`. With the three models installed and Ollama running, execute:

```powershell
npm run benchmark:models
```

The harness compares JSON/schema completion, exact field accuracy, precision, recall, F1, failures, and elapsed time. Set `BENCHMARK_MODELS` to comma-separated installed model tags to override the defaults, and `OLLAMA_URL` to change the local runtime endpoint. A model is reported as the winner only if it completes the entire dataset. This small plan-extraction dataset is not a full vacancy extraction benchmark; expand and manually label representative source-page cases before treating a winner as a production-quality accuracy result. No model winner is claimed until this command has actually been run.

The exact acceptance test—five new entry-level SOC Analyst roles in Ireland published in the previous 24 hours—cannot be claimed complete unless Brave and Ollama are configured, an adequately populated candidate profile is supplied, current sources are accessible, and each publication date is independently supported. The UI keeps results unverified when those conditions are not met.

The local API binds to loopback by default and has no authentication. Do not expose it to a network or use it for sensitive data.
