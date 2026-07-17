// Netlify Serverless Function: api-analytics
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

  // Analytics mock
  if (event.path.includes('/dashboard')) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        totalStudents: 120,
        activeCourses: 5,
        averageScore: 85
      })
    };
  }

  return {
    statusCode: 404,
    headers: CORS,
    body: JSON.stringify({ message: 'Analytics API route not found' })
  };
};
