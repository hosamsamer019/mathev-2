const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'packages', 'database', 'prisma', 'migrations');

const initSqlPath = path.join(migrationsDir, '0_init', 'migration.sql');
let sql = fs.readFileSync(initSqlPath, 'utf8');
if (sql.charCodeAt(0) === 0xFEFF) {
  sql = sql.slice(1);
}
fs.writeFileSync(initSqlPath, sql, 'utf8');

// Remove obsolete intermediate duplicate migrations
const removeLegacy = path.join(migrationsDir, '20260814203400_remove_legacy_question');
const addProfile = path.join(migrationsDir, '20260814223000_add_academic_profile');
if (fs.existsSync(removeLegacy)) fs.rmSync(removeLegacy, { recursive: true, force: true });
if (fs.existsSync(addProfile)) fs.rmSync(addProfile, { recursive: true, force: true });

// Clean RLS migration
const rlsFile = path.join(migrationsDir, '20261001_enable_rls', 'migration.sql');
if (fs.existsSync(rlsFile)) {
  let rlsSql = fs.readFileSync(rlsFile, 'utf8');
  if (rlsSql.charCodeAt(0) === 0xFEFF) rlsSql = rlsSql.slice(1);
  fs.writeFileSync(rlsFile, rlsSql, 'utf8');
}
console.log('Clean migrations prepared successfully.');
