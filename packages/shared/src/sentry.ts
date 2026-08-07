import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export const initSentry = (serviceName: string) => {
  if (!process.env.SENTRY_DSN) {
    logger.info(`[Sentry] DSN not provided. Sentry disabled for ${serviceName}.`);
    return false;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      serverName: serviceName,
      // We recommend adjusting this value in production, or using tracesSampler
      // for finer control
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Optionally enable profiling if installed: @sentry/profiling-node
      // profilesSampleRate: 0.1,
    });
    logger.info(`[Sentry] Initialized for ${serviceName}`);
    return true;
  } catch (error) {
    logger.error(`[Sentry] Initialization failed for ${serviceName}`, error);
    return false;
  }
};

/**
 * Utility to safely attach user context without exposing PII (Personally Identifiable Information).
 */
export const setSentryUserContext = (userId: string, role: string) => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser({ id: userId, role });
};

/**
 * Export core Sentry instance for route handlers
 */
export { Sentry };
