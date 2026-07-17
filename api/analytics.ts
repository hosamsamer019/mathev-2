import app from '../services/analytics-service/src/index';

export default function handler(req: any, res: any) {
  const expressApp = (app as any).default || app;
  return expressApp(req, res);
}
