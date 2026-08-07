import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// Map Vercel/Supabase variables to standard ones for Prisma if they exist
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}
if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
  process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
}

const prismaClientSingleton = () => {
  let url = process.env.DATABASE_URL;
  if (url && process.env.NODE_ENV === 'production') {
    url = url.includes('?') ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
  }
  return new PrismaClient({
    datasources: {
      db: { url }
    }
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();
globalThis.prismaGlobal = db;
