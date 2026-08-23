import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { handleGithubCallback } from './modules/github-callback.js';
import { disconnectGithub } from './modules/github-disconnect.js';
import { getGithubAuthorizationUrl } from './modules/github-authenticate.js';
import { getGithubProfile } from './modules/github-profile.js';
import { listAllGitHubRepositories } from './modules/listAllGitHubRepositories.js';
import { listAllowedGitHubFiles } from './modules/listAllowedGitHubFiles.js';
import { getGitHubFileContext } from './modules/getGitHubFileContext.js';
import { ingestGitHubFileContext } from './modules/ingestGitHubFileContext.js';
import { askLocalModel } from './modules/askLocalModel.js';

export const createGithubMcpServer = async () => {
    const server = new McpServer({ name: 'mcp-server', version: '1.0.0' });

    server.registerTool(
        'greet',
        {
            description: 'Greet someone by name',
            inputSchema: z.object({
                name: z.string()
            })
        },
        async ({ name }) => ({
            content: [{ type: 'text', text: `Hello, ${name}!` }]
        })
    );

    server.registerTool(
        'github_authenticate',
        { description: 'Create a GitHub OAuth authorization URL.', inputSchema: z.object({}) },
        async () => {
            try {
                return { content: [{ type: 'text', text: `Open this URL to connect GitHub: ${getGithubAuthorizationUrl()}` }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to create GitHub authorization URL.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'github_callback',
        {
            description: 'Complete the GitHub OAuth callback using the code and state returned by GitHub.',
            inputSchema: z.object({ code: z.string(), state: z.string() })
        },
        async ({ code, state }) => {
            try {
                return { content: [{ type: 'text', text: await handleGithubCallback({ code, state }) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'GitHub OAuth callback failed.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'github_profile',
        { description: 'Get the authenticated GitHub user profile.', inputSchema: z.object({}) },
        async () => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await getGithubProfile(), null, 2) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to load the GitHub profile.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'github_disconnect',
        { description: 'Clear the current server-side GitHub access token.', inputSchema: z.object({}) },
        async () => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(disconnectGithub()) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to disconnect GitHub.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'list_all_github_repositories',
        { description: 'List all repositories accessible to the authenticated GitHub user.', inputSchema: z.object({}) },
        async () => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await listAllGitHubRepositories(), null, 2) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to list GitHub repositories.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'list_allowed_github_files',
        {
            description: 'List Markdown and text files in an accessible GitHub repository.',
            inputSchema: z.object({ repositoryFullName: z.string() })
        },
        async ({ repositoryFullName }) => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await listAllowedGitHubFiles(repositoryFullName), null, 2) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to list allowed GitHub files.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'get_github_file_context',
        {
            description: 'Read the text content of a file in an accessible GitHub repository.',
            inputSchema: z.object({ repositoryFullName: z.string(), filePath: z.string() })
        },
        async ({ repositoryFullName, filePath }) => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await getGitHubFileContext(repositoryFullName, filePath)) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to retrieve the GitHub file.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'ingest_github_file_context',
        {
            description: 'Chunk and index GitHub file context in the local vector store.',
            inputSchema: z.object({ repositoryFullName: z.string(), filePath: z.string(), content: z.string() })
        },
        async ({ repositoryFullName, filePath, content }) => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await ingestGitHubFileContext(repositoryFullName, filePath, content)) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to ingest GitHub file context.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    server.registerTool(
        'ask_local_model',
        {
            description: 'Retrieve relevant indexed context and ask the local model to answer a query.',
            inputSchema: z.object({ query: z.string() })
        },
        async ({ query }) => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await askLocalModel(query)) }] };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to get a response from the local model.';
                return { isError: true, content: [{ type: 'text', text: message }] };
            }
        }
    );

    return server;
}