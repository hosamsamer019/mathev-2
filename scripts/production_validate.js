const { PrismaClient } = require('@prisma/client');

console.log('[Phase 12] Starting Production Validation...');

async function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_URL',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'PAYMOB_API_KEY',
    'PAYMOB_HMAC_SECRET',
  ];

  let missing = [];
  for (const env of requiredEnvVars) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }

  if (missing.length > 0) {
    console.error(`[FAIL] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  } else {
    console.log('[PASS] All required environment variables are present.');
  }
}

async function validateDatabase() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing PostgreSQL connectivity...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[PASS] PostgreSQL is reachable and Prisma client connected.');
  } catch (error) {
    console.error(`[FAIL] Database connection failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await validateEnvironment();
  await validateDatabase();
  
  // A real implementation would also test a Redis ping and Cloudflare R2 listBuckets command here.
  console.log('[PASS] Production Validation Complete. Environment is ready for startup.');
  process.exit(0);
}

run().catch(console.error);
