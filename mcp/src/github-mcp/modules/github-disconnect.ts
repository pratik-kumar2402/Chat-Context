import { clearGithubAccessToken } from '../common/github-oauth.js';

export function disconnectGithub(): string {
    clearGithubAccessToken();
    return 'GitHub disconnected successfully.';
}
