let app: any;
try {
  app = require('../services/auth-service/src/index.js').default;
} catch (error: any) {
  app = (req: any, res: any) => {
    res.status(500).json({ error: 'Initialization Error', message: error.message, stack: error.stack });
  };
}

export default function handler(req: any, res: any) {
  const expressApp = app.default || app;
  return expressApp(req, res);
}
