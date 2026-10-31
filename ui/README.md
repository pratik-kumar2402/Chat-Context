# Context Chat UI

This folder contains the React and TypeScript frontend for Context Chat. It connects to the MCP server over Streamable HTTP and provides GitHub and Google Drive source workflows.

## Run

Start the MCP server first, then run the UI:

```bash
cd mcp
npm start
```

```bash
cd ui
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173` and connects to:

```text
http://localhost:3000/github-mcp
```

Copy `.env.example` to `.env` before starting the UI. `VITE_APP_ENV=dev` logs actions, successes, and failures in the browser console. Use `VITE_APP_ENV=prod` to log warnings and failures only.

## GitHub Workflow

1. Select GitHub as the source.
2. Click **Connect**.
3. Complete the GitHub OAuth flow.
4. The UI sends the callback `code` and `state` to the `github_callback` MCP tool.
5. The page refreshes after OAuth and the button changes to **Disconnect from GitHub**.
6. Open the repository selector to load accessible repositories.
7. Select a repository to load its `.md` and `.txt` files.
8. Select a file and click **Retrieve** to fetch and index its context. Chat is disabled until retrieval completes.
9. Ask a question. Model responses are displayed as Markdown.

Repository and file selectors are disabled while GitHub is disconnected. The initial connection check may log that no active connection was found; this is expected for a signed-out user.

GitHub OAuth credentials remain in the MCP server. The UI only communicates with registered MCP tools.

## Google Drive Workflow

1. Select Google Drive as the source and click **Connect to Google Drive**.
2. Complete Google OAuth consent. Configure the OAuth client with the callback URL `http://localhost:5173/callback/google` (or the matching URL for your deployment), and enable the Google Drive API.
3. Select a Google Doc or uploaded `.md`/`.txt` file, then click **Retrieve** to index its text for chat.

The integration requests read-only Drive access. Google Docs are exported as plain text; uploaded Markdown and text files are read as-is. PDFs and other Drive file types are not supported.

## Local Files

Select **Local**, choose one or more `.md` / `.txt` files from the file picker, and click **Retrieve**. The browser reads each selected file and sends its contents to the MCP/model services running for this application; files are not uploaded to GitHub or Google Drive. The MCP ingestion tool accepts only `.md` and `.txt` filenames. Selected contents are added to the same in-memory vector store as GitHub and Google Drive context, so they are cleared when the model service restarts.

## Client Architecture

```text
src/client/
  Client.ts
  clients/
    BaseMcpClient.ts
    GithubMcpClient.ts
    GoogleDriveMcpClient.ts
```

`BaseMcpClient` contains shared MCP connection, discovery, tool invocation, error handling, and cleanup behavior. `GithubMcpClient` and `GoogleDriveMcpClient` provide source-specific helper methods. `Client.ts` provides the client factory.

## Scripts

- `npm run dev`: Start Vite development mode.
- `npm run build`: Type-check and create a production build.
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the production build.
