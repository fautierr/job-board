export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(`[INFO] ${message}`, meta ?? '');
  },
  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error ?? '');
  },
};
