# Context Chat UI

This folder contains the React and TypeScript frontend for Context Chat. It connects to the MCP server over Streamable HTTP and provides a GitHub source workflow.

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

## GitHub Workflow

1. Select GitHub as the source.
2. Click **Connect**.
3. Complete the GitHub OAuth flow.
4. The UI sends the callback `code` and `state` to the `github_callback` MCP tool.
5. Open the repository selector to load accessible repositories.
6. Select a repository to load its `.md` and `.txt` files.
7. Select a file and click **Retrieve** to fetch and log its decoded context in the browser console.

GitHub OAuth credentials remain in the MCP server. The UI only communicates with registered MCP tools.

## Client Architecture

```text
src/client/
  Client.ts
  clients/
    BaseMcpClient.ts
    GithubMcpClient.ts
```

`BaseMcpClient` contains shared MCP connection, discovery, tool invocation, error handling, and cleanup behavior. `GithubMcpClient` supplies the GitHub MCP endpoint and GitHub-specific helper methods. `Client.ts` provides the client factory for adding more MCP client types later.

## Scripts

- `npm run dev`: Start Vite development mode.
- `npm run build`: Type-check and create a production build.
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the production build.
