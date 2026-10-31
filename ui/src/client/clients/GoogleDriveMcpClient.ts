import { BaseMcpClient } from './BaseMcpClient'

export type GoogleDriveFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  webViewLink?: string
}

export type GoogleDriveFileContext = {
  id: string
  name: string
  mimeType: string
  content: string
}

export class GoogleDriveMcpClient extends BaseMcpClient {
  constructor(endpoint = 'http://localhost:3000/github-mcp') {
    super('context-chat-google-drive', endpoint)
  }

  async getAuthorizationUrl() {
    const result = await this.callTool('google_drive_authenticate')
    return this.parseTextResult<{ authorizationUrl: string }>(result.content).authorizationUrl
  }

  async completeAuthentication(code: string, state: string) {
    await this.callTool('google_drive_callback', { code, state })
  }

  async isConnected() {
    const result = await this.callTool('google_drive_status')
    return this.parseTextResult<{ connected: boolean }>(result.content).connected
  }

  async disconnect() {
    await this.callTool('google_drive_disconnect')
  }

  async listFiles() {
    const result = await this.callTool('list_google_drive_files')
    return this.parseTextResult<GoogleDriveFile[]>(result.content)
  }

  async getFileContext(fileId: string) {
    const result = await this.callTool('get_google_drive_file_context', { fileId })
    return this.parseTextResult<GoogleDriveFileContext>(result.content)
  }

  async ingestFileContext(fileName: string, content: string) {
    const result = await this.callTool('ingest_google_drive_file_context', { fileName, content })
    return this.parseTextResult<{ status: string; chunks: number; filePath: string }>(result.content)
  }

  private parseTextResult<T>(content: unknown): T {
    if (!Array.isArray(content)) {
      throw new Error('The MCP server returned an invalid response.')
    }

    const textContent = content.find(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string',
    )

    if (!textContent) {
      throw new Error('The MCP server returned no text data.')
    }

    return JSON.parse(textContent.text) as T
  }
}
