import httpStatus from "http-status";
import ApiError from "../errors/ApiError";
import { getRedis } from "../shared/redis";

export const redisGuards = {
  async isLocked(lockKey: string) {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const ttl = await redis.pttl(lockKey);
      return ttl > 0;
    } catch {
      return false;
    }
  },

  async assertNotLocked(lockKey: string, message: string) {
    const locked = await this.isLocked(lockKey);
    if (locked) throw new ApiError(httpStatus.TOO_MANY_REQUESTS, message);
  },

  async incrementWithinWindow(counterKey: string, windowMs: number) {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const multi = redis.multi();
      multi.incr(counterKey);
      multi.pexpire(counterKey, windowMs, "NX");
      const res = await multi.exec();
      const count = Number(res?.[0]?.[1] ?? 0);
      return count;
    } catch {
      return null;
    }
  },

  async lockFor(lockKey: string, lockMs: number) {
    const redis = getRedis();
    if (!redis) return false;
    try {
      await redis.set(lockKey, "1", "PX", lockMs);
      return true;
    } catch {
      return false;
    }
  },

  async del(keys: string | string[]) {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const arr = Array.isArray(keys) ? keys : [keys];
      if (arr.length === 0) return true;
      await redis.del(...arr);
      return true;
    } catch {
      return false;
    }
  },

  async setOnce(key: string, ttlMs: number) {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const res = await redis.set(key, "1", "PX", ttlMs, "NX");
      return res === "OK";
    } catch {
      return null;
    }
  },
};

