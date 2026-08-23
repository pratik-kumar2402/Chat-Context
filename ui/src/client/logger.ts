const isDevelopment = (import.meta.env.VITE_APP_ENV ?? 'dev').toLowerCase() !== 'prod'

// Keep routine browser logs for development while retaining warnings and errors in production.
export const logger = {
  info(message: string, details?: Record<string, unknown>) {
    if (isDevelopment) console.info(`[UI] ${message}`, details ?? '')
  },
  warn(message: string, details?: Record<string, unknown>) {
    console.warn(`[UI] ${message}`, details ?? '')
  },
  error(message: string, error?: unknown) {
    console.error(`[UI] ${message}`, error ?? '')
  },
}
