import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabaseAndRLS() {
  console.log('--- SEC-012: PostgreSQL / Supabase RLS Verification ---');
  try {
    const dbInfo = await prisma.$queryRaw<any[]>`
      SELECT current_database() as db, current_user as "user", session_user as "sessionUser", version() as version;
    `;
    console.log('Database Connection Info:', {
      database: dbInfo[0]?.db,
      currentUser: dbInfo[0]?.user,
      sessionUser: dbInfo[0]?.sessionUser,
      version: dbInfo[0]?.version?.split(' ')[0] + ' ' + dbInfo[0]?.version?.split(' ')[1]
    });

    // Check all tables in public schema and their RLS status
    const tables = await prisma.$queryRaw<any[]>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log('\nPublic Schema Tables & RLS Status:');
    let rlsEnabledCount = 0;
    tables.forEach(t => {
      if (t.rowsecurity) rlsEnabledCount++;
      console.log(`- ${t.tablename}: RLS ${t.rowsecurity ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
    });
    console.log(`\nSummary: ${rlsEnabledCount} of ${tables.length} tables have RLS enabled.`);

    // Check existing RLS policies
    const policies = await prisma.$queryRaw<any[]>`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    console.log(`\nActive PostgreSQL Policies (${policies.length} found):`);
    policies.forEach(p => {
      console.log(`- Table ${p.tablename}: Policy "${p.policyname}" [${p.cmd}] (Roles: ${p.roles})`);
    });

    // Check DB Roles and Grants
    const roles = await prisma.$queryRaw<any[]>`
      SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
      FROM pg_roles
      WHERE rolname IN ('postgres', 'authenticated', 'anon', 'service_role')
      ORDER BY rolname;
    `;
    console.log(`\nDatabase Security Roles:`);
    roles.forEach(r => {
      console.log(`- Role ${r.rolname}: superuser=${r.rolsuper}, bypassrls=${r.rolbypassrls}, canlogin=${r.rolcanlogin}`);
    });

    console.log('\n✅ SEC-012 PostgreSQL Metadata Inspection Complete.');
  } catch (error: any) {
    console.error('❌ Error verifying database RLS metadata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseAndRLS();
