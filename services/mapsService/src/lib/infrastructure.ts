import { createLogger } from '@rumbo/shared';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/index.js';

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
