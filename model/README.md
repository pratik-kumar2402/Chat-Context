# Local Model Service

This service indexes retrieved GitHub, Google Drive, and local-file text in an in-memory vector store and answers questions with Ollama.

The vector store is not persisted: indexed documents are lost whenever the model service restarts.

## Setup

```bash
cd model
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Set `APP_ENV=dev` for action, success, and failure logs. Set `APP_ENV=prod` to log warnings and failures only. The service reads model settings from `.env` or the process environment.

Invalid request bodies return a 400 response. Unexpected ingestion and chat failures are logged with server-side tracebacks; production responses use generic error messages.

The model loads `.env` relative to `app.py`, so it can be started from either the repository root or the `model` folder. `MODEL_TIMEOUT_SECONDS` defaults to 180 seconds and bounds embedding, retrieval, and generation waits. The local API binds to `127.0.0.1` by default; Docker Compose overrides this so the MCP container can reach the API.

The response rules in `instructions.md` are loaded into the model's system prompt for every chat request. Keep that file focused on response behavior and guard-rails; retrieved documents are treated as untrusted context.

When running locally, the API binds to `127.0.0.1` and runs at `http://localhost:8000` by default. Docker Compose binds to `0.0.0.0` inside its container and points Ollama requests at the Compose service name `ollama`:

- `GET /health`
- `POST /ingest`
- `POST /chat`
