import * as z from 'zod/v4';
import { getGithubClient } from '../common/github-oauth.js';
import type { Octokit } from 'octokit';

const githubFileSchema = z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    html_url: z.string().url(),
    type: z.literal('file')
});

const githubContentsSchema = z.array(z.union([
    githubFileSchema,
    z.object({
        name: z.string(),
        path: z.string(),
        sha: z.string(),
        type: z.literal('dir')
    })
]));

export type GithubAllowedFile = z.infer<typeof githubFileSchema>;

async function listRepositoryContents(githubClient: Octokit, owner: string, repository: string, path: string): Promise<z.infer<typeof githubContentsSchema>> {
    const response = await githubClient.rest.repos.getContent({ owner, repo: repository, path });
    return githubContentsSchema.parse(response.data);
}

export async function listAllowedGitHubFiles(repositoryFullName: string): Promise<GithubAllowedFile[]> {
    const [owner, repository] = repositoryFullName.split('/');
    if (!owner || !repository || repositoryFullName.split('/').length !== 2) {
        throw new Error('repositoryFullName must use the owner/repository format.');
    }

    const files: GithubAllowedFile[] = [];
    const directories = [''];
    const githubClient = getGithubClient();

    while (directories.length > 0) {
        const path = directories.pop() ?? '';
        const contents = await listRepositoryContents(githubClient, owner, repository, path);

        for (const item of contents) {
            if (item.type === 'dir') {
                directories.push(item.path);
            } else if (/\.(md|txt)$/i.test(item.name)) {
                files.push(item);
            }
        }
    }

    return files.sort((left, right) => left.path.localeCompare(right.path));
}
