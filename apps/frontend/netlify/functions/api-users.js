// Netlify Serverless Function: api-users
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

  // Mock Profile Route
  if (event.path.endsWith('/profile')) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        message: 'Profile retrieved successfully',
        user: { id: 'mock-id', name: 'Mock User', role: 'teacher' }
      })
    };
  }

  return {
    statusCode: 404,
    headers: CORS,
    body: JSON.stringify({ message: 'User API route not found' })
  };
};
