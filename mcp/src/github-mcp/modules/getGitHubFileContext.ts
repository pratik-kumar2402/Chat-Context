import * as z from 'zod/v4';
import { getGithubClient } from '../common/github-oauth.js';

const githubFileContentSchema = z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    encoding: z.literal('base64'),
    content: z.string()
});

export type GithubFileContext = {
    name: string;
    path: string;
    repositoryFullName: string;
    content: string;
};

export async function getGitHubFileContext(repositoryFullName: string, filePath: string): Promise<GithubFileContext> {
    const [owner, repository] = repositoryFullName.split('/');
    if (!owner || !repository || repositoryFullName.split('/').length !== 2) {
        throw new Error('repositoryFullName must use the owner/repository format.');
    }

    const response = await getGithubClient().rest.repos.getContent({
        owner,
        repo: repository,
        path: filePath
    });

    if (Array.isArray(response.data)) {
        throw new Error(`The selected path is not a file: ${filePath}.`);
    }

    const file = githubFileContentSchema.parse(response.data);
    return {
        name: file.name,
        path: file.path,
        repositoryFullName,
        content: Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')
    };
}
