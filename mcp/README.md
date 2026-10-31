# MCP Server

This folder contains the backend MCP server for Context Chat. It exposes GitHub and Google Drive tools over Streamable HTTP and keeps OAuth credentials and access tokens on the server.

## Requirements

- Node.js
- A GitHub OAuth App
- GitHub OAuth credentials in `mcp/.env` to connect GitHub
- Optional Google OAuth credentials and the Google Drive API to connect Google Drive

## Configuration

Copy `.env.example` to `.env` and set:

```dotenv
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_HOMEPAGE_URL=http://localhost:5173
GITHUB_CALLBACK_URL=http://localhost:5173/callback
GITHUB_OAUTH_SCOPE=read:user user:email repo
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5173/callback/google
APP_ENV=dev
```

Register the GitHub callback URL exactly in the GitHub OAuth app settings. To enable Google Drive, also set the Google credentials, register its callback URL exactly, enable the Google Drive API, configure the OAuth consent screen, and add your account as a test user if the app is in testing. Google access uses the read-only `drive.readonly` scope; tokens are kept in MCP server memory.

## Run

```bash
cd mcp
npm install
npm start
```

The server listens at `http://localhost:3000`. The GitHub MCP endpoint is:

```text
http://localhost:3000/github-mcp
```

The endpoint supports Streamable HTTP `GET`, `POST`, and `DELETE` requests. CORS uses `GITHUB_HOMEPAGE_URL` as the allowed UI origin.

`APP_ENV=dev` logs actions, successes, and failures. Use `APP_ENV=prod` to log warnings and failures only. The server never logs OAuth tokens or model/file contents.

Tool failures are logged by the MCP service and returned to the caller as MCP tool errors. Unhandled HTTP failures are logged with method and path; 5xx responses do not include internal exception details.

The MCP server forwards model requests to `MODEL_BASE_URL` and uses `MODEL_TIMEOUT_SECONDS` for its request deadline. For local runs, set `MODEL_BASE_URL=http://localhost:8000`; Docker Compose overrides it to use the `model` service name. Keep the timeout aligned with the model service configuration; the default is 180 seconds.

## MCP Tools

- `greet`: Test the MCP connection.
- `github_authenticate`: Create the GitHub OAuth authorization URL.
- `github_callback`: Exchange the OAuth code and state for an access token.
- `github_profile`: Read the authenticated GitHub profile.
- `github_disconnect`: Clear the server-side access token.
- `list_all_github_repositories`: List every accessible repository using Octokit pagination.
- `list_allowed_github_files`: Recursively list `.md` and `.txt` files in a repository.
- `get_github_file_context`: Retrieve decoded text content for a selected repository file.
- `ingest_github_file_context`: Send selected file context to the model vector store.
- `ingest_local_file_context`: Index a user-selected local Markdown or text file.
- `ask_local_model`: Retrieve relevant context and ask the local model a question.
- `google_drive_authenticate`: Create a read-only Google OAuth authorization URL.
- `google_drive_callback`: Exchange the Google OAuth code and state for tokens.
- `google_drive_status`: Check Google Drive connection status.
- `google_drive_disconnect`: Clear the server-side Google Drive tokens.
- `list_google_drive_files`: List Google Docs and uploaded Markdown/text files.
- `get_google_drive_file_context`: Export/read a selected Drive file as text.
- `ingest_google_drive_file_context`: Send selected Drive content to the model vector store.

GitHub REST access is implemented with Octokit. OAuth token exchange uses GitHub's OAuth endpoint directly.

Google Drive tools use the Google Drive REST API and request only the read-only `drive.readonly` scope. They list and retrieve Google Docs and uploaded Markdown/text files; PDFs and other file types are not supported.

## Adding MCP Servers

MCP server factories are registered in `src/index.ts` through the `mcpDefinitions` array. Each registered server is available at `http://localhost:3000/{name}`.
