// Netlify Serverless Function: api-ai
// Uses ES Modules

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.path.endsWith('/solve')) {
    try {
      const { problem } = JSON.parse(event.body || '{}');
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          solution: `Mock AI solution for: ${problem}`,
          steps: ['Step 1: Analyze', 'Step 2: Solve']
        })
      };
    } catch (e) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'Bad request' }) };
    }
  }

  return {
    statusCode: 404,
    headers: CORS,
    body: JSON.stringify({ message: 'AI API route not found' })
  };
};
