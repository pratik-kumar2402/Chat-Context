import { BaseMcpClient } from './BaseMcpClient'

export const DEFAULT_GITHUB_MCP_URL = 'http://localhost:3000/github-mcp'

export type GithubRepository = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
}

export type GithubAllowedFile = {
  name: string
  path: string
  sha: string
  html_url: string
  type: 'file'
}

export type GithubFileContext = {
  name: string
  path: string
  repositoryFullName: string
  content: string
}

export class GithubMcpClient extends BaseMcpClient {
  constructor(endpoint = DEFAULT_GITHUB_MCP_URL) {
    super('context-chat-github', endpoint)
  }

  async listRepositories() {
    const result = await this.callTool('list_all_github_repositories')
    return this.parseTextResult<GithubRepository[]>(result.content)
  }

  async getProfile() {
    const result = await this.callTool('github_profile', {}, { logToolErrors: false })
    return this.parseTextResult<{ login: string }>(result.content)
  }

  async disconnect() {
    const result = await this.callTool('github_disconnect')
    return this.parseTextResult<string>(result.content)
  }

  async listAllowedFiles(repositoryFullName: string) {
    const result = await this.callTool('list_allowed_github_files', { repositoryFullName })
    return this.parseTextResult<GithubAllowedFile[]>(result.content)
  }

  async getFileContext(repositoryFullName: string, filePath: string) {
    const result = await this.callTool('get_github_file_context', { repositoryFullName, filePath })
    return this.parseTextResult<GithubFileContext>(result.content)
  }

  async ingestFileContext(repositoryFullName: string, filePath: string, content: string) {
    const result = await this.callTool('ingest_github_file_context', { repositoryFullName, filePath, content })
    return this.parseTextResult<{ status: string; chunks: number; filePath: string }>(result.content)
  }

  async askLocalModel(query: string) {
    const result = await this.callTool('ask_local_model', { query })
    return this.parseTextResult<{ answer: string; sources: unknown[] }>(result.content)
  }

  private parseTextResult<T>(content: unknown): T {
    if (!Array.isArray(content)) {
      throw new Error('The MCP server returned an invalid response.')
    }

    const textContent = content.find(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' && item !== null && 'type' in item && item.type === 'text' && 'text' in item && typeof item.text === 'string',
    )

    if (!textContent) {
      throw new Error('The MCP server returned no text data.')
    }

    return JSON.parse(textContent.text) as T
  }
}
