const isDevelopment = (process.env.APP_ENV ?? 'dev').toLowerCase() !== 'prod';

// Development logs show the normal flow; production keeps routine noise out of logs.
export const logger = {
    info(message: string, details?: Record<string, unknown>) {
        if (isDevelopment) console.info(`[MCP] ${message}`, details ?? '');
    },
    warn(message: string, details?: Record<string, unknown>) {
        console.warn(`[MCP] ${message}`, details ?? '');
    },
    error(message: string, error?: unknown) {
        console.error(`[MCP] ${message}`, error ?? '');
    }
};
