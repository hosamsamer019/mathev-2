import { db } from './packages/database/src/index.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './services/auth-service/.env' });

async function run() {
  console.log('Testing AI Rate Limiter...\n');

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

    console.log('Simulating 12 rapid requests to /api/ai/solve (Limit is 10/min)...');
    let blockedCount = 0;
    
    for (let i = 1; i <= 12; i++) {
      const res = await fetch('http://localhost:4003/api/ai/solve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ problem: `Test problem ${i}` })
      });
      
      if (res.status === 429) {
        console.log(`Request ${i}: BLOCKED (429 Rate Limit Exceeded)`);
        blockedCount++;
      } else {
        console.log(`Request ${i}: Status ${res.status}`);
      }
    }

    console.log(`\nTest Result: ${blockedCount} requests were blocked by the rate limiter.`);
    if (blockedCount >= 2) {
      console.log('✅ Rate limiting is working correctly!');
    } else {
      console.log('❌ Rate limiting failed to block excess requests.');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

run();
