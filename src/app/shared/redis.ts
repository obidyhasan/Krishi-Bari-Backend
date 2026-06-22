import Redis from "ioredis";
import config from "../config";

let redis: Redis | null = null;

export const getRedis = (): Redis | null => {
  if (redis) return redis;
  if (!config.redis_url) return null;

  try {
    redis = new Redis(config.redis_url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    redis.on("error", () => {
      // Prevent unhandled Redis connection errors from crashing request flow.
    });
    return redis;
  } catch {
    redis = null;
    return null;
  }
};
