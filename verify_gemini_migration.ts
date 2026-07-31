import axios from 'axios';

async function run() {
  console.log('--- STARTING GEMINI MIGRATION VERIFICATION ---');

  // Register Teacher to get a token
  let tRes;
  try {
    tRes = await axios.post('http://localhost:4001/api/auth/register', { 
      name: 'Gemini Tester', 
      email: `gemtester_${Date.now()}@edu.com`, 
      password: 'password123', 
      role: 'TEACHER' 
    });
  } catch (e) {
    console.error('Failed to register user', e.response?.data);
    return;
  }
  const t = { config: { headers: { Authorization: `Bearer ${tRes.data.token}` } } };

  // 1. Math Solver
  console.log('\n--- 1. Math Solver Call ---');
  try {
    const solveRes = await axios.post('http://localhost:4003/api/ai/solve', {
      problem: 'إذا كان ثمن 3 تفاحات هو 15 جنيهًا، فما هو ثمن 7 تفاحات؟',
      level: 'مبتدئ'
    }, t.config);
    
    // UI Mapping Test
    const { solution: explanation } = solveRes.data;
    const mappedUI = {
      answer: 'تم الحل (انظر التفاصيل)',
      steps: [
        {
          step: 1,
          title: 'خطوات الحل والشرح التفصيلي',
          content: explanation || 'لم يتم العثور على حل.',
        }
      ]
    };
    console.log('UI Rendered State:');
    console.log(JSON.stringify(mappedUI, null, 2));
  } catch (e: any) {
    console.error('Solver failed:', e.response?.data || e.message);
  }

  // 2. Chat
  console.log('\n--- 2. Chat Call ---');
  try {
    const sessionRes = await axios.post('http://localhost:4003/api/ai/sessions', {}, t.config);
    const sessionId = sessionRes.data.id;
    console.log(`Created Session: ${sessionId}`);

    console.log('Sending message to chat...');
    const chatRes = await axios.post('http://localhost:4003/api/ai/chat', {
      sessionId,
      message: 'مرحباً، هل يمكنك مساعدتي في فهم ما هو العدد الأولي؟'
    }, {
      ...t.config,
      responseType: 'stream'
    });
    
    let chatOutput = '';
    chatRes.data.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      const lines = str.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        if (line === 'data: [DONE]') {
          console.log('\n[Stream Finished]');
        } else {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.content) {
              process.stdout.write(data.content);
              chatOutput += data.content;
            } else if (data.error) {
              console.error('Chat Error inside stream:', data.error);
            }
          } catch (e) { }
        }
      }
    });

    await new Promise((resolve) => chatRes.data.on('end', resolve));

  } catch (e) {
    console.error('Chat failed:', e.response?.data || e.message);
  }

  // 3. Question Generation
  console.log('\n\n--- 3. Generation Call ---');
  try {
    const genRes = await axios.post('http://localhost:4003/api/ai/generate-questions', {
      topic: 'الكسور',
      difficulty: 'متوسط',
      count: 2
    }, t.config);
    console.log('Generated questions:', JSON.stringify(genRes.data.questions, null, 2));
    console.log('Tokens used:', genRes.data.tokensUsed);
  } catch (e) {
    console.error('Generation failed:', e.response?.data || e.message);
  }

  // 4. Rate Limiting Test
  console.log('\n--- 4. Rate Limiting Test ---');
  console.log('Sending rapid requests to hit rate limit (Max 10 per minute across AI endpoints)...');
  
  let requests = 3; // We already sent 3 requests (solve, session doesn't count but chat does, generate does)
  let rateLimited = false;
  try {
    for (let i = 0; i < 9; i++) {
      requests++;
      await axios.post('http://localhost:4003/api/ai/solve', {
        problem: '1+1', level: 'سهل'
      }, t.config);
    }
    console.log('ERROR: Did not hit rate limit!');
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log(`Successfully hit rate limit (429) on request #${requests}`);
      rateLimited = true;
    } else {
      console.error('Unexpected error during rate limiting test:', error.message);
    }
  }

  console.log('\n--- VERIFICATION FINISHED ---');
}

run();
