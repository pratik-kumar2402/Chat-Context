import { logger } from '../../common/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const modelBaseUrl = process.env.MODEL_BASE_URL ?? 'http://localhost:8000';
const modelTimeoutSeconds = Number(process.env.MODEL_TIMEOUT_SECONDS ?? '180');
if (!Number.isFinite(modelTimeoutSeconds) || modelTimeoutSeconds <= 0) {
    throw new Error('MODEL_TIMEOUT_SECONDS must be a positive number.');
}
const modelTimeoutMs = modelTimeoutSeconds * 1_000;

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
        let result: unknown;
        try {
            result = await response.json();
        } catch (error) {
            throw new Error(`Model service returned an invalid response (HTTP ${response.status}).`, { cause: error });
        }
        if (typeof result !== 'object' || result === null || Array.isArray(result)) {
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
        const reportedError = controller.signal.aborted
            ? new Error(`Model service request exceeded the ${modelTimeoutSeconds}-second timeout.`, { cause: error })
            : error;
        logger.error('Model request failed', reportedError);
        throw reportedError;
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
