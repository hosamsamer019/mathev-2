import { db } from './packages/database/src/index.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './services/auth-service/.env' });

async function run() {
  console.log('Testing Pagination endpoints...\n');

  try {
    const user = await db.user.create({
      data: {
        email: `test_admin_${Date.now()}@test.com`,
        password: 'pw',
        name: 'Test Admin',
        role: 'ADMIN'
      }
    });
    
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'fallback',
      { expiresIn: '1d' }
    );

    console.log('--- Testing GET /api/users/users?page=1&limit=2 ---');
    const usersRes = await fetch('http://localhost:4002/api/users/users?page=1&limit=2', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersText = await usersRes.text();
    try {
      const usersData = JSON.parse(usersText);
      console.log('Status:', usersRes.status);
      console.log('Meta:', usersData.meta);
      console.log('Data length:', usersData.data?.length);
    } catch (e) {
      console.log('Status:', usersRes.status);
      console.log('Response (not JSON):', usersText.substring(0, 100));
    }

    console.log('\n--- Testing GET /api/courses?page=1&limit=2 ---');
    const coursesRes = await fetch('http://localhost:4004/api/courses?page=1&limit=2', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const coursesData = await coursesRes.json();
    console.log('Status:', coursesRes.status);
    console.log('Meta:', coursesData.meta);
    console.log('Data length:', coursesData.data?.length);

    console.log('\nPagination Test Completed.');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

run();
