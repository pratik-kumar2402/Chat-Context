import { GithubMcpClient, DEFAULT_GITHUB_MCP_URL } from './clients/GithubMcpClient'
import { GoogleDriveMcpClient } from './clients/GoogleDriveMcpClient'

export type McpClientType = 'github' | 'google-drive'

export function createMcpClient(): GithubMcpClient
export function createMcpClient(type: 'github', endpoint?: string): GithubMcpClient
export function createMcpClient(type: 'google-drive', endpoint?: string): GoogleDriveMcpClient
export function createMcpClient(type?: McpClientType, endpoint?: string) {
	if (type === 'google-drive') return new GoogleDriveMcpClient(endpoint)
	return new GithubMcpClient(endpoint)
}

export async function createGithubMcpClient(endpoint = DEFAULT_GITHUB_MCP_URL) {
	const mcpClient = new GithubMcpClient(endpoint)
	await mcpClient.connect()
	return mcpClient
}

export async function createGoogleDriveMcpClient(endpoint = DEFAULT_GITHUB_MCP_URL) {
	const mcpClient = new GoogleDriveMcpClient(endpoint)
	await mcpClient.connect()
	return mcpClient
}

export { GithubMcpClient, GoogleDriveMcpClient }