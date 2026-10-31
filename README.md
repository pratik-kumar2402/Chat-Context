# Context Chat

Context Chat has three application services and uses Ollama for local model inference:

- `ui`: React/Vite frontend at `http://localhost:5173`
- `mcp`: GitHub MCP server at `http://localhost:3000/github-mcp`
- `model`: local retrieval and Ollama model API at `http://localhost:8000`

## Startup

### Run services locally

Start Ollama first and make sure the models in `model/.env` are installed. Then use separate terminals:

```bash
cd model
copy .env.example .env
.venv\Scripts\activate
python app.py
```

```bash
cd mcp
npm install
copy .env.example .env
npm start
```

```bash
cd ui
npm install
copy .env.example .env
npm run dev
```

### Run with Docker Compose

Create each service's environment file from its example before starting Compose:

```powershell
Copy-Item mcp\.env.example mcp\.env
Copy-Item model\.env.example model\.env
Copy-Item ui\.env.example ui\.env
```

Add your GitHub OAuth credentials to `mcp\.env` if you want to connect GitHub. Google OAuth credentials are optional and only needed for Google Drive. Start the stack with:

```powershell
docker compose up --build
```

The UI is available at `http://localhost:5173`; Compose starts Ollama and downloads the configured models when needed.

The UI depends on the MCP service, and the MCP model tools depend on the model service. The model service calls Ollama at `OLLAMA_BASE_URL` for embeddings and generation. The model uses bounded asynchronous waits for embeddings, retrieval, and generation. Set `MODEL_TIMEOUT_SECONDS` consistently in `model/.env` and `mcp/.env` when changing the default 180-second limit.

Set `APP_ENV=dev` for routine service logs and `APP_ENV=prod` for warnings and errors only. The UI uses the equivalent `VITE_APP_ENV` setting.

Errors from UI actions are shown in the workspace or chat and logged in the browser console. Unhandled browser errors and rejected promises are logged there as a fallback. MCP tool and HTTP failures are logged by the MCP service; model request failures include server-side exception details in logs, while production HTTP responses use generic 500 messages.

## Workflow

GitHub and Google Drive use OAuth redirects back to the UI. Google Drive is optional: configure its OAuth client with `http://localhost:5173/callback/google` and enable the Google Drive API to use that source. It requests read-only access and supports Google Docs plus uploaded Markdown/text files. Local source lets you select `.md` / `.txt` files from the browser and index them directly without GitHub or Drive. After choosing a source, retrieve context; chat is temporarily disabled while the selected content is indexed.

Model answers are rendered as Markdown in the chat. The model loads response guard-rails from `model/instructions.md` and uses only retrieved context when answering.

The root `.gitignore` contains shared rules for Node, Python, environment, log, build, and editor artifacts.
