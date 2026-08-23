import { logger } from '../../common/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const modelBaseUrl = process.env.MODEL_BASE_URL ?? 'http://localhost:8000';
const modelTimeoutMs = Number(process.env.MODEL_TIMEOUT_SECONDS ?? '180') * 1_000;

async function callModel(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), modelTimeoutMs);

    try {
        logger.info('Model request started', { path });
        const response = await fetch(`${modelBaseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        const result: unknown = await response.json();
        if (typeof result !== 'object' || result === null) {
            throw new Error(`Model request failed with status ${response.status}.`);
        }
        if ('error' in result && typeof result.error === 'string') {
            throw new Error(result.error);
        }
        if (!response.ok) {
            throw new Error(`Model request failed with status ${response.status}.`);
        }
        logger.info('Model request succeeded', { path, status: response.status });
        return result as Record<string, unknown>;
    } catch (error) {
        logger.error('Model request failed', error);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export function ingestFileContext(repositoryFullName: string, filePath: string, content: string) {
    return callModel('/ingest', { repositoryFullName, filePath, content });
}

export function askModel(query: string) {
    return callModel('/chat', { query });
}
