import { GithubMcpClient, DEFAULT_GITHUB_MCP_URL } from './clients/GithubMcpClient'

export type McpClientType = 'github'

const clientFactories: Record<McpClientType, (endpoint?: string) => GithubMcpClient> = {
	github: (endpoint) => new GithubMcpClient(endpoint),
}

export function createMcpClient(type: McpClientType = 'github', endpoint?: string) {
	return clientFactories[type](endpoint)
}

export async function createGithubMcpClient(endpoint = DEFAULT_GITHUB_MCP_URL) {
	const mcpClient = createMcpClient('github', endpoint)
	await mcpClient.connect()
	return mcpClient
}

export { GithubMcpClient }