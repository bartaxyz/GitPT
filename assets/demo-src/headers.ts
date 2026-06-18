import type { RateLimitResult } from "./rateLimiter.js";

interface HeaderSink {
  setHeader(name: string, value: string): void;
}

export const setRateLimitHeaders = (res: HeaderSink, result: RateLimitResult): void => {
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
  }
};

export const describeResult = (result: RateLimitResult): string =>
  result.allowed
    ? `allowed (${result.remaining} remaining)`
    : `rejected (retry in ${Math.ceil(result.retryAfterMs / 1000)}s)`;
