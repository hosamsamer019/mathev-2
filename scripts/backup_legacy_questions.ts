import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const dir = path.join(process.cwd(), 'scripts', 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const backupFile = path.join(dir, 'legacy_questions_backup.json');

  const questions = await prisma.question.findMany({
    orderBy: { createdAt: 'asc' }
  });

  if (questions.length !== 44) {
    console.error(`❌ Backup expected exactly 44 records, but found ${questions.length}. Backup aborted.`);
    process.exit(1);
  }

  fs.writeFileSync(backupFile, JSON.stringify(questions, null, 2));

  console.log(`✅ Backup successfully created at: ${backupFile}`);
  console.log(`- Total Records: ${questions.length}`);
  console.log(`- First ID: ${questions[0].id}`);
  console.log(`- Last ID: ${questions[questions.length - 1].id}`);
  
  // Calculate simple checksum based on ids and timestamps for integrity
  const checksum = require('crypto').createHash('sha256').update(JSON.stringify(questions)).digest('hex');
  console.log(`- Integrity Checksum (SHA256): ${checksum}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
