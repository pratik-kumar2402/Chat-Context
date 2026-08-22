import * as z from 'zod/v4';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';

dotenv.config();

export const githubQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string().optional()
});

export const githubTokenResponseSchema = z.object({
    access_token: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional()
});

export const githubOAuthConfig = {
    homepageUrl: process.env.GITHUB_HOMEPAGE_URL ?? 'http://localhost:5173',
    callbackUrl: process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:5317/callback',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: process.env.GITHUB_OAUTH_SCOPE ?? 'read:user user:email repo'
};

export const pendingGithubStates = new Set<string>();
let githubAccessToken: string | undefined;

export function requireGithubCredentials(): { clientId: string; clientSecret: string } {
    if (!githubOAuthConfig.clientId || !githubOAuthConfig.clientSecret) {
        throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured.');
    }

    return {
        clientId: githubOAuthConfig.clientId,
        clientSecret: githubOAuthConfig.clientSecret
    };
}

export function setGithubAccessToken(token: string): void {
    githubAccessToken = token;
}

export function getGithubAccessToken(): string {
    if (!githubAccessToken) {
        throw new Error('GitHub is not connected. Start the OAuth flow first.');
    }

    return githubAccessToken;
}

export function clearGithubAccessToken(): void {
    githubAccessToken = undefined;
}

export function getGithubClient(): Octokit {
    return new Octokit({ auth: getGithubAccessToken() });
}
