import { createClient } from 'redis';
import { logger } from './logger.js';

let redisClient: ReturnType<typeof createClient> | null = null;

export const initRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not found. Redis cache and JTI blocklist will be disabled (fallback to stateless JWT).');
    return null;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis connected successfully.'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis. Continuing without Redis.', error);
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => redisClient;

/**
 * JTI Blocklist Strategy:
 * When a user logs out, we take their refresh token's JTI and add it to Redis with an expiration 
 * matching the token's remaining TTL.
 */
const memoryResetStore = new Map<string, { email: string; expiresAt: number }>();
const memoryBlocklist = new Map<string, number>();

export const blocklistToken = async (jti: string, expiresInSecs: number) => {
  if (redisClient) {
    try {
      await redisClient.setEx(`blocklist:jti:${jti}`, expiresInSecs, 'true');
      return;
    } catch (err) {
      logger.error('Redis blocklist error:', err);
    }
  }
  memoryBlocklist.set(jti, Date.now() + expiresInSecs * 1000);
};

export const isTokenBlocklisted = async (jti: string): Promise<boolean> => {
  if (redisClient) {
    try {
      const exists = await redisClient.get(`blocklist:jti:${jti}`);
      return exists === 'true';
    } catch (err) {
      logger.error('Redis blocklist check error:', err);
    }
  }
  const expiry = memoryBlocklist.get(jti);
  if (expiry && expiry > Date.now()) {
    return true;
  }
  return false;
};

export const setPasswordResetToken = async (tokenHash: string, email: string, ttlSeconds: number = 3600) => {
  if (redisClient) {
    try {
      await redisClient.setEx(`reset:${tokenHash}`, ttlSeconds, email);
      return;
    } catch (err) {
      logger.error('Redis setPasswordResetToken error:', err);
    }
  }
  memoryResetStore.set(tokenHash, { email, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const getPasswordResetEmail = async (tokenHash: string): Promise<string | null> => {
  if (redisClient) {
    try {
      const email = await redisClient.get(`reset:${tokenHash}`);
      if (email) return email;
    } catch (err) {
      logger.error('Redis getPasswordResetEmail error:', err);
    }
  }
  const mem = memoryResetStore.get(tokenHash);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.email;
  }
  return null;
};

export const deletePasswordResetToken = async (tokenHash: string) => {
  if (redisClient) {
    try {
      await redisClient.del(`reset:${tokenHash}`);
    } catch (err) {
      logger.error('Redis deletePasswordResetToken error:', err);
    }
  }
  memoryResetStore.delete(tokenHash);
};

