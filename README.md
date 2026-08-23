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

GitHub uses an OAuth redirect back to the UI. The page reload after clicking Connect is expected; after the callback succeeds, the button changes to `Disconnect from GitHub`. Repository and file selectors remain disabled until GitHub is connected. Retrieve temporarily disables chat while the selected file is fetched and indexed.

Model answers are rendered as Markdown in the chat. The model loads response guard-rails from `model/instructions.md` and uses only retrieved context when answering.

The root `.gitignore` contains shared rules for Node, Python, environment, log, build, and editor artifacts.
