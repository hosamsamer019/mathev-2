export const logger = {
  info: (message: string, meta?: any) => log('INFO', message, meta),
  warn: (message: string, meta?: any) => log('WARN', message, meta),
  error: (message: string, meta?: any) => log('ERROR', message, meta),
};

function log(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  // Stringify the payload. If production, this keeps logs clean and readable for cloud watch/datadog.
  console.log(JSON.stringify({ timestamp, level, message, ...meta }));
}
