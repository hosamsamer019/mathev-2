// Import dynamically in handler to catch initialization errors on Vercel

export default async function handler(req: any, res: any) {
  try {
    const module = await import('../services/course-service/src/index.js');
    const expressApp = module.default || (module as any).app;
    return expressApp(req, res);
  } catch (error: any) {
    res.status(500).json({
      error: 'Vercel Serverless Function Initialization Failed',
      message: error.message,
      stack: error.stack
    });
  }
}
