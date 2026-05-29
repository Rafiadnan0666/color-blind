import { PrismaClient } from '@prisma/client';

/** @type {PrismaClient} */
const prisma = /** @type {{ __prisma?: PrismaClient }} */ (globalThis).__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  /** @type {{ __prisma?: PrismaClient }} */ (globalThis).__prisma = prisma;
}

export default prisma;
