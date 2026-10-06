const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'packages', 'database', 'prisma', 'schema.prisma');
const migrationsDir = path.join(__dirname, '..', 'packages', 'database', 'prisma', 'migrations');
const initDir = path.join(migrationsDir, '0_init');

if (!fs.existsSync(initDir)) {
  fs.mkdirSync(initDir, { recursive: true });
}

// Generate clean SQL from Prisma CLI directly
const sql = execSync(`npx.cmd prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`, {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

// Clean any null characters or BOM
const cleanedSql = sql.replace(/\0/g, '').replace(/^\uFEFF/, '');
fs.writeFileSync(path.join(initDir, 'migration.sql'), cleanedSql, { encoding: 'utf8' });

console.log('Successfully generated 0_init/migration.sql (' + cleanedSql.length + ' chars, clean UTF-8).');
