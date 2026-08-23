# Local Model Service

This service indexes retrieved GitHub text in an in-memory vector store and answers questions with Ollama.

## Setup

```bash
cd model
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python index.py
```

Set `APP_ENV=dev` for action, success, and failure logs. Set `APP_ENV=prod` to log warnings and failures only. The service reads model settings from `.env` or the process environment.

The model loads `.env` relative to `index.py`, so it can be started from either the repository root or the `model` folder. `MODEL_TIMEOUT_SECONDS` defaults to 180 seconds and bounds embedding, retrieval, and generation waits. The local API binds to `127.0.0.1` by default; use `MODEL_HOST` only when a wider network binding is intentional.

The response rules in `instructions.md` are loaded into the model's system prompt for every chat request. Keep that file focused on response behavior and guard-rails; retrieved documents are treated as untrusted context.

The API runs at `http://localhost:8000` by default:

- `GET /health`
- `POST /ingest`
- `POST /chat`
