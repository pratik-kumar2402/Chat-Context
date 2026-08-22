import {
    githubOAuthConfig,
    githubQuerySchema,
    githubTokenResponseSchema,
    pendingGithubStates,
    requireGithubCredentials,
    setGithubAccessToken
} from '../common/github-oauth.js';

export async function handleGithubCallback(query: unknown): Promise<string> {
    const parsedQuery = githubQuerySchema.parse(query);
    if (!parsedQuery.code || !parsedQuery.state || !pendingGithubStates.delete(parsedQuery.state)) {
        throw new Error('Invalid or expired GitHub OAuth callback.');
    }

    const { clientId, clientSecret } = requireGithubCredentials();
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: parsedQuery.code,
            redirect_uri: githubOAuthConfig.callbackUrl
        })
    });

    const tokenResult = githubTokenResponseSchema.parse(await response.json());
    if (!response.ok || !tokenResult.access_token) {
        throw new Error(tokenResult.error_description ?? tokenResult.error ?? 'GitHub token exchange failed.');
    }

    setGithubAccessToken(tokenResult.access_token);
    return 'GitHub connected successfully. You can now use the github_profile tool.';
}
