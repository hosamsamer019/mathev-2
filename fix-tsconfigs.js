const fs = require('fs');
const services = ['ai-service', 'analytics-service', 'auth-service', 'course-service', 'user-service'];
services.forEach(svc => {
  const path = `services/${svc}/tsconfig.json`;
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  if (!config.compilerOptions) config.compilerOptions = {};
  
  config.compilerOptions.paths = {
    "@shared/utils": ["../../packages/shared/src/index.ts"],
    "@smartmath/database": ["../../packages/database/src/index.ts"]
  };
  
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
});
console.log('Done updating tsconfigs');
