import { TokenBucket } from "./tokenBucket.js";
import type { Store } from "./store.js";

export interface RateLimitOptions {
  capacity: number;
  refillRate: number;
  keyOf: (request: RateLimitRequest) => string;
}

export interface RateLimitRequest {
  ip: string;
  apiKey?: string;
  path: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly options: RateLimitOptions;
  private readonly store: Store<TokenBucket>;

  constructor(store: Store<TokenBucket>, options: RateLimitOptions) {
    if (options.capacity <= 0) {
      throw new Error("capacity must be a positive number");
    }
    if (options.refillRate <= 0) {
      throw new Error("refillRate must be a positive number");
    }
    this.store = store;
    this.options = options;
  }

  async check(request: RateLimitRequest, now = Date.now()): Promise<RateLimitResult> {
    const key = this.options.keyOf(request);
    const bucket =
      (await this.store.get(key)) ??
      new TokenBucket(this.options.capacity, this.options.refillRate);

    bucket.refill(now);
    const allowed = bucket.tryRemove(1);
    await this.store.set(key, bucket);

    return {
      allowed,
      remaining: Math.floor(bucket.available),
      retryAfterMs: allowed ? 0 : bucket.timeUntil(1, now),
    };
  }

  async reset(request: RateLimitRequest): Promise<void> {
    await this.store.delete(this.options.keyOf(request));
  }
}

export const byApiKeyOrIp = (request: RateLimitRequest): string =>
  request.apiKey ?? request.ip;
