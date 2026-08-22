import * as z from 'zod/v4';
import { getGithubClient } from '../common/github-oauth.js';

const githubRepositorySchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    html_url: z.string().url()
});

const githubRepositoriesSchema = z.array(githubRepositorySchema);

export type GithubRepository = z.infer<typeof githubRepositorySchema>;

export async function listAllGitHubRepositories(): Promise<GithubRepository[]> {
    const githubClient = getGithubClient();
    const response = await githubClient.paginate(
        githubClient.rest.repos.listForAuthenticatedUser,
        { per_page: 100, sort: 'updated' }
    );

    return githubRepositoriesSchema.parse(response);
}
