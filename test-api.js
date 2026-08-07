const https = require('https');

async function test() {
  const loginData = JSON.stringify({
    email: 'test_student_migration@example.com',
    password: 'password123',
    role: 'ONLINE_STUDENT'
  });

  const loginReq = https.request('https://mathev-2.vercel.app/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const token = JSON.parse(data).token;
      
      const courseReq = https.request('https://mathev-2.vercel.app/api/courses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (cRes) => {
        let cData = '';
        cRes.on('data', chunk => cData += chunk);
        cRes.on('end', () => console.log('Response:', cData));
      });
      courseReq.end();
    });
  });

  loginReq.write(loginData);
  loginReq.end();
}

test();
