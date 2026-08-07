import { logger } from './logger';

export function validateEnv() {
  // Map Vercel Supabase integration variables to standard Prisma variables
  if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }
  if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
  }

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
