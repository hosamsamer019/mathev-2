import { logger } from './logger';

export function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(`[FATAL] ${errorMsg}`);
    
    // In Vercel serverless, process.exit(1) crashes the worker abruptly and hides errors.
    if (process.env.VERCEL) {
      throw new Error(errorMsg);
    } else {
      process.exit(1);
    }
  }
}
