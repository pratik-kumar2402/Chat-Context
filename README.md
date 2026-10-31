# Context Chat

Context Chat has three services:

- `ui`: React/Vite frontend at `http://localhost:5173`
- `mcp`: GitHub MCP server at `http://localhost:3000/github-mcp`
- `model`: local retrieval and Ollama model API at `http://localhost:8000`

## Startup

Start Ollama first and make sure the models in `model/.env` are installed. Then use separate terminals:

```bash
cd model
copy .env.example .env
.venv\Scripts\activate
python index.py
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

The UI depends on the MCP service, and the MCP model tools depend on the model service. The model uses bounded asynchronous waits for embeddings, retrieval, and generation. Set `MODEL_TIMEOUT_SECONDS` consistently in `model/.env` and `mcp/.env` when changing the default 180-second limit.

Set `APP_ENV=dev` for routine service logs and `APP_ENV=prod` for warnings and errors only. The UI uses the equivalent `VITE_APP_ENV` setting.

## Workflow

GitHub and Google Drive use OAuth redirects back to the UI. Configure the Google OAuth client with `http://localhost:5173/callback/google` and enable the Google Drive API. Google Drive requests read-only access and supports Google Docs plus uploaded Markdown/text files. Local source lets you select `.md` / `.txt` files from the browser and index them directly without GitHub or Drive. After choosing a source, retrieve context; chat is temporarily disabled while the selected content is indexed.

Model answers are rendered as Markdown in the chat. The model loads response guard-rails from `model/instructions.md` and uses only retrieved context when answering.

The root `.gitignore` contains shared rules for Node, Python, environment, log, build, and editor artifacts.
