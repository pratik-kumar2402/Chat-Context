import { ingestFileContext } from '../common/model-client.js';

export async function ingestGitHubFileContext(repositoryFullName: string, filePath: string, content: string): Promise<Record<string, unknown>> {
    return ingestFileContext(repositoryFullName, filePath, content);
}
