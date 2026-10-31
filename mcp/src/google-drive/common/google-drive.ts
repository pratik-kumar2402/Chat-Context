import { randomBytes } from 'node:crypto';
import * as z from 'zod/v4';
import dotenv from 'dotenv';

dotenv.config();

const homepageUrl = process.env.GITHUB_HOMEPAGE_URL ?? 'http://localhost:5173';
const googleDriveScope = 'https://www.googleapis.com/auth/drive.readonly';
const oauthStateLifetimeMs = 10 * 60 * 1_000;

export const googleDriveOAuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? `${homepageUrl}/callback/google`
};

const pendingStates = new Map<string, number>();
let accessToken: string | undefined;
let refreshToken: string | undefined;
let accessTokenExpiresAt = 0;

const tokenResponseSchema = z.object({
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    error: z.string().optional(),
    error_description: z.string().optional()
});

const driveFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    modifiedTime: z.string().optional(),
    webViewLink: z.string().optional()
});

const driveFilesResponseSchema = z.object({
    files: z.array(driveFileSchema),
    nextPageToken: z.string().optional()
});

export type GoogleDriveFile = z.infer<typeof driveFileSchema>;

export type GoogleDriveFileContext = {
    id: string;
    name: string;
    mimeType: string;
    content: string;
};

function requireGoogleCredentials(): { clientId: string; clientSecret: string } {
    if (!googleDriveOAuthConfig.clientId || !googleDriveOAuthConfig.clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured.');
    }

    return {
        clientId: googleDriveOAuthConfig.clientId,
        clientSecret: googleDriveOAuthConfig.clientSecret
    };
}

export function getGoogleDriveAuthorizationUrl(): string {
    const { clientId } = requireGoogleCredentials();
    const now = Date.now();
    for (const [state, expiresAt] of pendingStates) {
        if (expiresAt <= now) pendingStates.delete(state);
    }

    const state = randomBytes(24).toString('hex');
    pendingStates.set(state, now + oauthStateLifetimeMs);
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: googleDriveOAuthConfig.callbackUrl,
        response_type: 'code',
        scope: googleDriveScope,
        access_type: 'offline',
        prompt: 'consent',
        state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleDriveCallback(input: unknown): Promise<string> {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(input);
    const expiresAt = pendingStates.get(state);
    pendingStates.delete(state);
    if (!expiresAt || expiresAt <= Date.now()) {
        throw new Error('Invalid or expired Google OAuth callback.');
    }

    const { clientId, clientSecret } = requireGoogleCredentials();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: googleDriveOAuthConfig.callbackUrl,
            grant_type: 'authorization_code'
        })
    });
    const result = tokenResponseSchema.parse(await response.json());
    if (!response.ok || !result.access_token) {
        throw new Error(result.error_description ?? result.error ?? 'Google OAuth token exchange failed.');
    }

    accessToken = result.access_token;
    refreshToken = result.refresh_token ?? refreshToken;
    accessTokenExpiresAt = Date.now() + (result.expires_in ?? 3600) * 1_000;
    return 'Google Drive connected successfully.';
}

export function isGoogleDriveConnected(): boolean {
    return Boolean(accessToken || refreshToken);
}

export function disconnectGoogleDrive(): { disconnected: boolean } {
    accessToken = undefined;
    refreshToken = undefined;
    accessTokenExpiresAt = 0;
    return { disconnected: true };
}

async function getValidAccessToken(): Promise<string> {
    if (accessToken && accessTokenExpiresAt > Date.now() + 60_000) {
        return accessToken;
    }

    if (!refreshToken) {
        throw new Error('Google Drive is not connected. Connect your Google account first.');
    }

    const { clientId, clientSecret } = requireGoogleCredentials();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });
    const result = tokenResponseSchema.parse(await response.json());
    if (!response.ok || !result.access_token) {
        accessToken = undefined;
        refreshToken = undefined;
        accessTokenExpiresAt = 0;
        throw new Error(result.error_description ?? result.error ?? 'Google Drive access expired. Reconnect your account.');
    }

    accessToken = result.access_token;
    accessTokenExpiresAt = Date.now() + (result.expires_in ?? 3600) * 1_000;
    return accessToken;
}

async function driveRequest(url: URL): Promise<Response> {
    const token = await getValidAccessToken();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        throw new Error(`Google Drive request failed with status ${response.status}.`);
    }

    return response;
}

export async function listGoogleDriveFiles(): Promise<GoogleDriveFile[]> {
    const allowedMimeTypes = [
        'application/vnd.google-apps.document',
        'text/markdown',
        'text/plain'
    ];
    const query = `trashed = false and (${allowedMimeTypes.map((mimeType) => `mimeType = '${mimeType}'`).join(' or ')})`;
    const files: GoogleDriveFile[] = [];
    let pageToken: string | undefined;

    do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.search = new URLSearchParams({
            q: query,
            pageSize: '1000',
            orderBy: 'name',
            fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)',
            ...(pageToken ? { pageToken } : {})
        }).toString();
        const page = driveFilesResponseSchema.parse(await (await driveRequest(url)).json());
        files.push(...page.files);
        pageToken = page.nextPageToken;
    } while (pageToken);

    return files.filter((file) =>
        file.mimeType === 'application/vnd.google-apps.document' ||
        (['text/markdown', 'text/plain'].includes(file.mimeType) && /\.(md|txt)$/i.test(file.name))
    );
}

export async function getGoogleDriveFileContext(fileId: string): Promise<GoogleDriveFileContext> {
    if (!fileId.trim()) throw new Error('A Google Drive file ID is required.');

    const metadataUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
    metadataUrl.searchParams.set('fields', 'id,name,mimeType');
    const file = driveFileSchema.parse(await (await driveRequest(metadataUrl)).json());
    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
    const isUploadedText = ['text/markdown', 'text/plain'].includes(file.mimeType) && /\.(md|txt)$/i.test(file.name);
    if (!isGoogleDoc && !isUploadedText) {
        throw new Error('Only Google Docs and uploaded Markdown or text files can be retrieved.');
    }

    const contentUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`);
    if (isGoogleDoc) {
        contentUrl.pathname += '/export';
        contentUrl.searchParams.set('mimeType', 'text/plain');
    } else {
        contentUrl.searchParams.set('alt', 'media');
    }

    const content = await (await driveRequest(contentUrl)).text();
    return { id: file.id, name: file.name, mimeType: file.mimeType, content };
}
