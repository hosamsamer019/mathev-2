import client from 'prom-client';
import express, { Request, Response } from 'express';
import { logger } from './logger.js';

// Setup default metrics (memory, event loop lag, etc.)
client.collectDefaultMetrics({
  prefix: 'alsaden_',
});

export const requestCounter = new client.Counter({
  name: 'alsaden_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const responseLatency = new client.Histogram({
  name: 'alsaden_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

/**
 * Express middleware to track metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: Function) => {
  const end = responseLatency.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    // Don't track the metrics route itself to avoid spam
    if (route === '/metrics') return;

    requestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
    
    end({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
  });
  next();
};

/**
 * Setup a protected /metrics endpoint. 
 * Ensure this route is NOT exposed via Nginx public proxy rules.
 */
export const setupMetricsEndpoint = (app: express.Application) => {
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    } catch (ex) {
      logger.error('Error generating metrics', ex);
      res.status(500).end(ex);
    }
  });
};
