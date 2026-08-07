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
export const blocklistToken = async (jti: string, expiresInSecs: number) => {
  if (!redisClient) return;
  try {
    await redisClient.setEx(`blocklist:jti:${jti}`, expiresInSecs, 'true');
  } catch (err) {
    logger.error('Redis blocklist error:', err);
  }
};

export const isTokenBlocklisted = async (jti: string): Promise<boolean> => {
  if (!redisClient) return false;
  try {
    const exists = await redisClient.get(`blocklist:jti:${jti}`);
    return exists === 'true';
  } catch (err) {
    logger.error('Redis blocklist check error:', err);
    return false; // Fail open (or closed, depending on security posture)
  }
};
