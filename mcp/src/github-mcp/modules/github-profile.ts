import * as z from 'zod/v4';
import { getGithubClient } from '../common/github-oauth.js';

export async function getGithubProfile(): Promise<Record<string, unknown>> {
    const response = await getGithubClient().rest.users.getAuthenticated();
    return z.record(z.string(), z.unknown()).parse(response.data);
}
