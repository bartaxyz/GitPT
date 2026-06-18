import type { RateLimitOptions } from "./rateLimiter.js";
import { byApiKeyOrIp } from "./rateLimiter.js";

export interface RateLimitConfig {
  global: RateLimitOptions;
  perRoute: Record<string, Partial<RateLimitOptions>>;
}

const DEFAULTS: RateLimitOptions = {
  capacity: 100,
  refillRate: 10,
  keyOf: byApiKeyOrIp,
};

export const defaultConfig: RateLimitConfig = {
  global: DEFAULTS,
  perRoute: {
    "/auth/login": { capacity: 5, refillRate: 1 },
    "/search": { capacity: 30, refillRate: 5 },
  },
};

export const resolveOptions = (
  config: RateLimitConfig,
  path: string
): RateLimitOptions => {
  const override = config.perRoute[path];
  if (!override) {
    return config.global;
  }
  return { ...config.global, ...override };
};

export const isConfigured = (config: RateLimitConfig, path: string): boolean =>
  path in config.perRoute;
