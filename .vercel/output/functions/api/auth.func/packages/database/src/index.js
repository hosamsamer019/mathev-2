import { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
const prismaClientSingleton = () => {
    return new PrismaClient();
};
export const db = globalThis.prismaGlobal ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = db;
//# sourceMappingURL=index.js.map