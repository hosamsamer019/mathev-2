// Netlify Serverless Function: api-courses
// Uses ES Modules

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const mockCourses = [
  {
    id: 'c1',
    title: 'احتراف الجبر - الصف الثالث الثانوي',
    instructor: 'أ. محمد إبراهيم',
    thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400',
    students: 1250,
    rating: 4.9,
    lessons: 24,
    price: 250
  },
  {
    id: 'c2',
    title: 'أساسيات التفاضل والتكامل',
    instructor: 'أ. سارة حسن',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400',
    students: 850,
    rating: 4.8,
    lessons: 18,
    price: 200
  }
];

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // Get all courses
  if (event.path === '/api/courses' || event.path === '/api/courses/') {
    return { statusCode: 200, headers: CORS, body: JSON.stringify(mockCourses) };
  }

  // Fallback
  return {
    statusCode: 404,
    headers: CORS,
    body: JSON.stringify({ message: 'Course API route not found' })
  };
};
