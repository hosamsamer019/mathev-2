import axios from 'axios';
import http from 'http';
import jwt from 'jsonwebtoken';

const AI_URL = 'http://localhost:4003/api/ai';
const JWT_SECRET = '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';
const token = jwt.sign({ userId: 'test-user', role: 'TEACHER' }, JWT_SECRET, { expiresIn: '1h' });

const authHeaders = { Authorization: `Bearer ${token}` };

async function testMathSolver() {
  console.log('\n--- 1. Math Solver ---');
  try {
    const res = await axios.post(`${AI_URL}/solve`, { problem: 'ما هو حاصل ضرب 3 في 4؟', level: 'high_school' }, { headers: authHeaders });
    console.log('Math Solver Backend Response:');
    console.log(JSON.stringify(res.data, null, 2));
    
    // UI mapping test
    const { solution: explanation } = res.data;
    const uiState = {
      answer: 'تم الحل (انظر التفاصيل)',
      steps: [
        {
          step: 1,
          title: 'خطوات الحل والشرح التفصيلي',
          content: explanation || 'لم يتم العثور على حل.',
        }
      ]
    };
    console.log('\nSimulated UI State:');
    console.log(JSON.stringify(uiState, null, 2));
  } catch (error: any) {
    console.error('Math Solver Error:', error.response?.data || error.message);
  }
}

async function testChatbot() {
  console.log('\n--- 2 & 3. Chatbot (Student-Center & Student-Online SSE Logic) ---');
  try {
    // 1. Create Session
    const sessionRes = await axios.post(`${AI_URL}/sessions`, {}, { headers: authHeaders });
    const sessionId = sessionRes.data.id;
    console.log('Created Session:', sessionId);

    // 2. Fetch using native HTTP to simulate browser fetch/SSE
    return new Promise((resolve) => {
      const req = http.request(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      }, (res) => {
        console.log(`SSE Response Status: ${res.statusCode}`);
        res.on('data', (chunk) => {
          const text = chunk.toString();
          if (text.includes('data: {"content"')) {
            console.log('SSE Chunk Received:', text.trim());
          }
        });
        res.on('end', () => {
          console.log('SSE Stream Finished.');
          resolve(null);
        });
      });
      req.write(JSON.stringify({ sessionId, message: 'مرحباً، هل يمكنك شرح الجاذبية؟' }));
      req.end();
    });
  } catch (error: any) {
    console.error('Chatbot Error:', error.message);
  }
}

async function testQuestionGeneration() {
  console.log('\n--- 4. Question Generation ---');
  try {
    const res = await axios.post(`${AI_URL}/generate-questions`, {
      topic: 'الجمع والطرح',
      difficulty: 'متوسط',
      count: 2
    }, { headers: authHeaders });
    console.log('Generated Questions (UI mapped to res.data.questions):');
    console.log(JSON.stringify(res.data.questions, null, 2));
  } catch (error: any) {
    console.error('Question Generation Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await testMathSolver();
  await testChatbot();
  await testQuestionGeneration();
}

runTests();
