import { randomBytes } from 'node:crypto';
import { githubOAuthConfig, pendingGithubStates, requireGithubCredentials } from '../common/github-oauth.js';

export function getGithubAuthorizationUrl(): string {
    const { clientId } = requireGithubCredentials();
    const state = randomBytes(24).toString('hex');
    pendingGithubStates.add(state);

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: githubOAuthConfig.callbackUrl,
        scope: githubOAuthConfig.scope,
        state
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
