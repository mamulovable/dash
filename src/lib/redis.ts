import { Redis } from "@upstash/redis";

// Create Redis client (lazy initialization)
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
      throw new Error("Missing Upstash Redis environment variables");
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  return redis;
}

// Cache key generation
export function generateCacheKey(
  sourceId: string,
  prompt: string,
  fingerprint: string
): string {
  const normalized = prompt
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?]/g, "")
    .trim();

  // Simple hash function
  const hash = normalized
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(36);

  return `query:${sourceId}:${fingerprint}:${hash}`;
}

// Cache operations
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get<T>(key);
    return cached;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}









