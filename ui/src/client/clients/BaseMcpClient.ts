import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { logger } from '../logger'

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
      logger.info('MCP connection started')
      await this.client.connect(this.transport)
      this.connected = true
      logger.info('MCP connection succeeded')
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

  async callTool(name: string, args: Record<string, unknown> = {}, options: { logToolErrors?: boolean } = {}) {
    await this.ensureConnected()
    // Keep tool logs source-neutral and avoid exposing request arguments such as file contents.
    logger.info('MCP tool call started', { name })
    let result
    try {
      result = await this.client.callTool({ name, arguments: args })
    } catch (error) {
      logger.error('MCP tool call failed', error)
      throw error
    }

    if (result.isError) {
      if (options.logToolErrors !== false) {
        logger.error('MCP tool returned an error', result.content)
      }
      throw new Error(this.getToolError(result.content))
    }

    logger.info('MCP tool call succeeded', { name })
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
