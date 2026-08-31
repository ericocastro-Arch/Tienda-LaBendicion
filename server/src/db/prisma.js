import { loadEnv } from '../config/load-env.js';

// Load the root .env before instantiating the client so DATABASE_URL is set
// regardless of whether the module is imported before env.js in the graph.
loadEnv();

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
