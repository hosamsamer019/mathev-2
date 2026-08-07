import pino from 'pino';

// Prepare integration for Sentry or Datadog by configuring Pino to parse errors correctly
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Use pretty print in development, JSON in production
  transport: process.env.NODE_ENV !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  }
});

export const logger = {
  info: (message: string, meta?: any) => meta ? pinoLogger.info(meta, message) : pinoLogger.info(message),
  warn: (message: string, meta?: any) => meta ? pinoLogger.warn(meta, message) : pinoLogger.warn(message),
  error: (message: string, meta?: any) => meta ? pinoLogger.error(meta, message) : pinoLogger.error(message),
  // Direct access to pino instance if needed for advanced usage
  pino: pinoLogger
};
