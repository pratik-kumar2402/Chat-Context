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
import {
    disconnectGoogleDrive,
    getGoogleDriveAuthorizationUrl,
    getGoogleDriveFileContext,
    handleGoogleDriveCallback,
    isGoogleDriveConnected,
    listGoogleDriveFiles
} from '../google-drive/common/google-drive.js';
import { ingestFileContext } from './common/model-client.js';
import { logger } from '../common/logger.js';

function toolFailure(action: string, error: unknown, fallback: string) {
    logger.error(`${action} failed`, error);
    return {
        isError: true as const,
        content: [{ type: 'text' as const, text: error instanceof Error ? error.message : fallback }]
    };
}

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
                return toolFailure('GitHub authorization URL creation', error, 'Unable to create GitHub authorization URL.');
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
                return toolFailure('GitHub OAuth callback', error, 'GitHub OAuth callback failed.');
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
                return toolFailure('GitHub profile lookup', error, 'Unable to load the GitHub profile.');
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
                return toolFailure('GitHub disconnect', error, 'Unable to disconnect GitHub.');
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
                return toolFailure('GitHub repository listing', error, 'Unable to list GitHub repositories.');
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
                return toolFailure('GitHub file listing', error, 'Unable to list allowed GitHub files.');
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
                return toolFailure('GitHub file retrieval', error, 'Unable to retrieve the GitHub file.');
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
                return toolFailure('GitHub file ingestion', error, 'Unable to ingest GitHub file context.');
            }
        }
    );

    server.registerTool(
        'ingest_local_file_context',
        {
            description: 'Chunk and index a user-selected local Markdown or text file in the local vector store.',
            inputSchema: z.object({ fileName: z.string().min(1), content: z.string().min(1) })
        },
        async ({ fileName, content }) => {
            try {
                if (!/\.(md|txt)$/i.test(fileName)) {
                    throw new Error('Only .md and .txt local files can be indexed.');
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(await ingestFileContext('Local files', fileName, content))
                    }]
                };
            } catch (error) {
                return toolFailure('Local file ingestion', error, 'Unable to ingest local file context.');
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
                return toolFailure('Local model request', error, 'Unable to get a response from the local model.');
            }
        }
    );

    server.registerTool(
        'google_drive_authenticate',
        { description: 'Create a read-only Google Drive OAuth authorization URL.', inputSchema: z.object({}) },
        async () => {
            try {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ authorizationUrl: getGoogleDriveAuthorizationUrl() })
                    }]
                };
            } catch (error) {
                return toolFailure('Google authorization URL creation', error, 'Unable to create Google authorization URL.');
            }
        }
    );

    server.registerTool(
        'google_drive_callback',
        {
            description: 'Complete Google Drive OAuth using the code and state returned by Google.',
            inputSchema: z.object({ code: z.string(), state: z.string() })
        },
        async ({ code, state }) => {
            try {
                return { content: [{ type: 'text', text: await handleGoogleDriveCallback({ code, state }) }] };
            } catch (error) {
                return toolFailure('Google OAuth callback', error, 'Google OAuth callback failed.');
            }
        }
    );

    server.registerTool(
        'google_drive_status',
        { description: 'Check whether Google Drive is connected.', inputSchema: z.object({}) },
        async () => ({
            content: [{ type: 'text', text: JSON.stringify({ connected: isGoogleDriveConnected() }) }]
        })
    );

    server.registerTool(
        'google_drive_disconnect',
        { description: 'Clear the server-side Google Drive access tokens.', inputSchema: z.object({}) },
        async () => ({
            content: [{ type: 'text', text: JSON.stringify(disconnectGoogleDrive()) }]
        })
    );

    server.registerTool(
        'list_google_drive_files',
        {
            description: 'List Google Docs and uploaded Markdown or text files available in Google Drive.',
            inputSchema: z.object({})
        },
        async () => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await listGoogleDriveFiles()) }] };
            } catch (error) {
                return toolFailure('Google Drive file listing', error, 'Unable to list Google Drive files.');
            }
        }
    );

    server.registerTool(
        'get_google_drive_file_context',
        {
            description: 'Read a Google Doc or uploaded Markdown/text file from Google Drive.',
            inputSchema: z.object({ fileId: z.string() })
        },
        async ({ fileId }) => {
            try {
                return { content: [{ type: 'text', text: JSON.stringify(await getGoogleDriveFileContext(fileId)) }] };
            } catch (error) {
                return toolFailure('Google Drive file retrieval', error, 'Unable to retrieve the Google Drive file.');
            }
        }
    );

    server.registerTool(
        'ingest_google_drive_file_context',
        {
            description: 'Chunk and index Google Drive file context in the local vector store.',
            inputSchema: z.object({ fileName: z.string(), content: z.string() })
        },
        async ({ fileName, content }) => {
            try {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(await ingestFileContext('Google Drive', fileName, content))
                    }]
                };
            } catch (error) {
                return toolFailure('Google Drive file ingestion', error, 'Unable to ingest Google Drive file context.');
            }
        }
    );

    return server;
}