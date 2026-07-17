// Netlify Serverless Function: auth-login
// Uses only Node.js built-ins (crypto) + jsonwebtoken — zero extra deps
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_math_token_2026';

// Demo accounts — password is '123456' stored as plain text for this serverless function
// In production connect to a real database
const ACCOUNTS = [
  { id: 'admin-001',   email: 'admin@edu.com',   role: 'admin',          name: 'المدير العام',        password: '123456' },
  { id: 'teacher-001', email: 'teacher@edu.com',  role: 'teacher',        name: 'أ. محمد إبراهيم',    password: '123456' },
  { id: 'student-001', email: 'student@edu.com',  role: 'student_online', name: 'أحمد محمد',          password: '123456' },
  { id: 'center-001',  email: 'center@edu.com',   role: 'student_center', name: 'سارة علي',           password: '123456' },
  { id: 'parent-001',  email: 'parent@edu.com',   role: 'parent',         name: 'ولي أمر',            password: '123456' },
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const { email, password, role } = JSON.parse(event.body || '{}');

    if (!email || !password || !role) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ message: 'البريد الإلكتروني وكلمة المرور والدور مطلوبة' }),
      };
    }

    const account = ACCOUNTS.find(a => a.email === email && a.role === role);

    if (!account || account.password !== password) {
      return {
        statusCode: 401,
        headers: CORS,
        body: JSON.stringify({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }),
      };
    }

    const token = jwt.sign(
      { userId: account.id, email: account.email, role: account.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        token,
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          isActive: true,
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ message: 'خطأ في الخادم', detail: err.message }),
    };
  }
};
