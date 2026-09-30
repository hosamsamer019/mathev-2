const fs = require('fs');

const envFiles = [
  '.env',
  'services/user-service/.env',
  'services/course-service/.env',
  'services/auth-service/.env',
  'services/analytics-service/.env',
  'packages/database/.env'
];

const localDbUrl = 'postgresql://postgres:password@localhost:5432/math_platform';

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/DATABASE_URL=".*"/g, `DATABASE_URL="${localDbUrl}"`);
    content = content.replace(/DIRECT_URL=".*"/g, `DIRECT_URL="${localDbUrl}"`);
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
