import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

export abstract class BaseMcpClient {
  protected readonly client: Client
  protected readonly transport: StreamableHTTPClientTransport
  private connected = false

  protected constructor(clientName: string, endpoint: string) {
    this.client = new Client({ name: clientName, version: '1.0.0' })
    this.transport = new StreamableHTTPClientTransport(new URL(endpoint))
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect(this.transport)
      this.connected = true
    }

    return {
      server: this.client.getServerVersion(),
      capabilities: this.client.getServerCapabilities(),
      instructions: this.client.getInstructions(),
    }
  }

  async listTools() {
    await this.ensureConnected()
    const result = await this.client.listTools()
    return result.tools
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    await this.ensureConnected()
    const result = await this.client.callTool({ name, arguments: args })

    if (result.isError) {
      throw new Error(this.getToolError(result.content))
    }

    return result
  }

  async close() {
    if (!this.connected) return

    await this.transport.terminateSession()
    await this.client.close()
    this.connected = false
  }

  private async ensureConnected() {
    if (!this.connected) {
      await this.connect()
    }
  }

  private getToolError(content: unknown): string {
    if (!Array.isArray(content)) return 'MCP tool call failed.'

    const textContent = content.find(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string',
    )

    return textContent?.text ?? 'MCP tool call failed.'
  }
}
