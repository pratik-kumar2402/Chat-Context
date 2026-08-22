# MCP Server

This folder contains the backend MCP server for Context Chat. It exposes GitHub tools over Streamable HTTP and keeps GitHub OAuth credentials and access tokens on the server.

## Requirements

- Node.js
- A GitHub OAuth App
- GitHub OAuth credentials in `mcp/.env`

## Configuration

Copy `.env.example` to `.env` and set:

```dotenv
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_HOMEPAGE_URL=http://localhost:5173
GITHUB_CALLBACK_URL=http://localhost:5173/callback
GITHUB_OAUTH_SCOPE=read:user user:email repo
```

Register the callback URL exactly in the GitHub OAuth App settings.

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

## MCP Tools

- `greet`: Test the MCP connection.
- `github_authenticate`: Create the GitHub OAuth authorization URL.
- `github_callback`: Exchange the OAuth code and state for an access token.
- `github_profile`: Read the authenticated GitHub profile.
- `github_disconnect`: Clear the server-side access token.
- `list_all_github_repositories`: List every accessible repository using Octokit pagination.
- `list_allowed_github_files`: Recursively list `.md` and `.txt` files in a repository.
- `get_github_file_context`: Retrieve decoded text content for a selected repository file.

GitHub REST access is implemented with Octokit. OAuth token exchange uses GitHub's OAuth endpoint directly.

## Adding MCP Servers

MCP server factories are registered in `src/index.ts` through the `mcpDefinitions` array. Each registered server is available at `http://localhost:3000/{name}`.
